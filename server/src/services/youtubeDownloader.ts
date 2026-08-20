import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn, execFile } from 'child_process';
import axios from 'axios';
import { config } from '../config';
import { ensureDirSync } from '../utils/cleanup';
import { logger } from '../utils/logger';

// Find static ffmpeg path from ffmpeg-static package
let ffmpegStaticPath: string | null = null;
try {
  ffmpegStaticPath = require('ffmpeg-static');
} catch (e) {
  // fallback
}

export interface VideoMetadata {
  id: string;
  title: string;
  duration: number; // in seconds
  thumbnail?: string;
  uploader?: string;
}

/**
 * Normalizes YouTube URLs by removing unwanted tracking & timestamp parameters
 */
export function normalizeYoutubeUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return rawUrl;

  const trimmed = rawUrl.trim();

  // Handle youtu.be/ID
  const youtuBeMatch = trimmed.match(/^https?:\/\/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (youtuBeMatch) {
    return `https://www.youtube.com/watch?v=${youtuBeMatch[1]}`;
  }

  // Handle youtube.com/shorts/ID
  const shortsMatch = trimmed.match(/^https?:\/\/(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch) {
    return `https://www.youtube.com/watch?v=${shortsMatch[1]}`;
  }

  // Handle youtube.com/embed/ID or /v/ID
  const embedMatch = trimmed.match(/^https?:\/\/(?:www\.)?youtube\.com\/(?:embed|v)\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) {
    return `https://www.youtube.com/watch?v=${embedMatch[1]}`;
  }

  // Handle standard watch?v=ID
  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) {
    return `https://www.youtube.com/watch?v=${watchMatch[1]}`;
  }

  return trimmed;
}

export class YoutubeDownloader {
  private binaryPath: string = '';
  private isBinaryReady: boolean = false;
  private binaryInitPromise: Promise<string> | null = null;

  constructor() {
    ensureDirSync(config.binDir);
  }

  /**
   * Resolves or downloads the yt-dlp binary
   */
  public async ensureBinary(): Promise<string> {
    if (this.isBinaryReady && this.binaryPath) {
      return this.binaryPath;
    }

    if (this.binaryInitPromise) {
      return this.binaryInitPromise;
    }

    this.binaryInitPromise = this.initBinary();
    this.binaryPath = await this.binaryInitPromise;
    this.isBinaryReady = true;
    return this.binaryPath;
  }

  private async initBinary(): Promise<string> {
    // 1. Check resolved yt-dlp path from config
    if (config.ytDlpPath && fs.existsSync(config.ytDlpPath)) {
      logger.info(`Using yt-dlp binary at: ${config.ytDlpPath}`);
      return config.ytDlpPath;
    }

    // 2. Check local bin directory
    const isWindows = os.platform() === 'win32';
    const binaryFilename = isWindows ? 'yt-dlp.exe' : 'yt-dlp';
    const localBinPath = path.join(config.binDir, binaryFilename);

    if (fs.existsSync(localBinPath)) {
      logger.info(`Using yt-dlp from bin directory: ${localBinPath}`);
      return localBinPath;
    }

    // 3. Check system PATH
    const systemFound = await this.checkSystemBinary(binaryFilename);
    if (systemFound) {
      logger.info(`Using system PATH yt-dlp`);
      return binaryFilename;
    }

    // 4. If not found, automatically download from GitHub releases
    logger.info(`yt-dlp binary not found. Downloading latest official release into ${localBinPath}...`);
    await this.downloadYtDlpBinary(localBinPath);
    logger.info(`yt-dlp binary downloaded successfully: ${localBinPath}`);
    return localBinPath;
  }

  private async checkSystemBinary(cmd: string): Promise<boolean> {
    return new Promise((resolve) => {
      execFile(cmd, ['--version'], (error) => {
        resolve(!error);
      });
    });
  }

  /**
   * Downloads official yt-dlp executable from GitHub
   */
  private async downloadYtDlpBinary(destinationPath: string): Promise<void> {
    const isWindows = os.platform() === 'win32';
    const isMac = os.platform() === 'darwin';

    let downloadUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';
    if (isWindows) {
      downloadUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
    } else if (isMac) {
      downloadUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos';
    }

    ensureDirSync(path.dirname(destinationPath));

    const response = await axios({
      method: 'GET',
      url: downloadUrl,
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) YouTubeBatchVideoCutter/2.0',
      },
    });

    const writer = fs.createWriteStream(destinationPath);
    response.data.pipe(writer);

    await new Promise<void>((resolve, reject) => {
      writer.on('finish', () => resolve());
      writer.on('error', reject);
    });

    // Make executable on Unix/Mac
    if (!isWindows) {
      fs.chmodSync(destinationPath, 0o755);
    }
  }

  /**
   * Helper to get ffmpeg location argument
   */
  private getFfmpegLocation(): string {
    if (config.ffmpegPath && fs.existsSync(config.ffmpegPath)) {
      return fs.statSync(config.ffmpegPath).isDirectory() ? config.ffmpegPath : path.dirname(config.ffmpegPath);
    }
    const binFfmpeg = path.join(config.binDir, os.platform() === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
    if (fs.existsSync(binFfmpeg)) {
      return config.binDir;
    }
    return config.binDir;
  }

  /**
   * Builds anti-blocking & cookie parameters for yt-dlp
   */
  private getAntiBlockingArgs(useCookies: boolean = true): string[] {
    const args: string[] = [
      '--user-agent',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      '--extractor-args',
      'youtube:player_client=android,web,web_creator',
      '--geo-bypass',
      '--no-check-certificates',
    ];

    // Browser cookies support
    if (useCookies) {
      if (config.browser) {
        args.push('--cookies-from-browser', config.browser);
      } else if (config.cookiesFile && fs.existsSync(config.cookiesFile)) {
        args.push('--cookies', config.cookiesFile);
      }
    }

    return args;
  }

  /**
   * Fetches metadata of the YouTube video without downloading
   */
  public async getVideoMetadata(videoUrl: string): Promise<VideoMetadata> {
    const bin = await this.ensureBinary();
    const cleanUrl = normalizeYoutubeUrl(videoUrl);

    try {
      return await this.execMetadata(bin, cleanUrl, true);
    } catch (err: any) {
      // If failed due to DPAPI/cookie decryption error, retry without cookies
      if (err.message && (err.message.includes('DPAPI') || err.message.includes('decrypt') || err.message.includes('cookie'))) {
        logger.warn('Cookie decryption failed, retrying metadata extraction without browser cookies...');
        return await this.execMetadata(bin, cleanUrl, false);
      }
      throw err;
    }
  }

  private async execMetadata(bin: string, cleanUrl: string, useCookies: boolean): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      const ffmpegLoc = this.getFfmpegLocation();
      const args = [
        '--dump-json',
        '--no-playlist',
        '--no-warnings',
        '--ffmpeg-location',
        ffmpegLoc,
        ...this.getAntiBlockingArgs(useCookies),
        cleanUrl,
      ];

      execFile(bin, args, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) {
          logger.error(`yt-dlp metadata error for ${cleanUrl}:`, stderr || error.message);
          const is403 = (stderr || error.message).includes('403') || (stderr || error.message).includes('Forbidden');
          const customErr: any = new Error(`Failed to extract video info: ${stderr || error.message}`);
          customErr.suggestBrowserCapture = is403;
          return reject(customErr);
        }

        try {
          const info = JSON.parse(stdout);
          resolve({
            id: info.id || '',
            title: info.title || 'YouTube Video',
            duration: info.duration || 0,
            thumbnail: info.thumbnail || (info.thumbnails && info.thumbnails[0]?.url),
            uploader: info.uploader || '',
          });
        } catch (err: any) {
          reject(new Error(`Failed to parse video metadata: ${err.message}`));
        }
      });
    });
  }

  /**
   * Downloads the video to a specific folder
   * Returns the file path of the downloaded MP4 video
   */
  public async downloadVideo(
    videoUrl: string,
    outputDirectory: string,
    quality: '720p' | '1080p' = '720p',
    onProgress?: (percent: number, message: string) => void
  ): Promise<{ filePath: string; title: string }> {
    const bin = await this.ensureBinary();
    ensureDirSync(outputDirectory);

    const cleanUrl = normalizeYoutubeUrl(videoUrl);

    try {
      return await this.execDownload(bin, cleanUrl, outputDirectory, quality, true, onProgress);
    } catch (err: any) {
      // If failed due to DPAPI/cookie decryption error, retry without cookies
      if (err.message && (err.message.includes('DPAPI') || err.message.includes('decrypt') || err.message.includes('cookie'))) {
        logger.warn('Cookie decryption failed, retrying video download without browser cookies...');
        return await this.execDownload(bin, cleanUrl, outputDirectory, quality, false, onProgress);
      }
      throw err;
    }
  }

  private async execDownload(
    bin: string,
    cleanUrl: string,
    outputDirectory: string,
    quality: '720p' | '1080p',
    useCookies: boolean,
    onProgress?: (percent: number, message: string) => void
  ): Promise<{ filePath: string; title: string }> {
    const outputTemplate = path.join(outputDirectory, 'source.%(ext)s');
    const ffmpegLoc = this.getFfmpegLocation();
    const heightLimit = quality === '1080p' ? 1080 : 720;
    // Prefer H.264/AAC for fast stream copy (-c copy) without re-encoding
    const formatFilter = `bestvideo[height<=${heightLimit}][vcodec^=avc1]+bestaudio[acodec^=mp4a]/bestvideo[height<=${heightLimit}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=${heightLimit}]+bestaudio/best[height<=${heightLimit}][ext=mp4]/best[height<=${heightLimit}]/best`;

    const args = [
      '--no-playlist',
      '--no-warnings',
      '--newline',
      ...this.getAntiBlockingArgs(useCookies),
      '-f',
      formatFilter,
      '--merge-output-format',
      'mp4',
      '--ffmpeg-location',
      ffmpegLoc,
      '-o',
      outputTemplate,
    ];

    args.push(cleanUrl);

    logger.info(`Starting video download (${quality}): ${cleanUrl} (ffmpeg: ${ffmpegLoc}, Cookies: ${useCookies ? 'yes' : 'no'})`);
    if (onProgress) onProgress(5, `Bắt đầu tải video (${quality})...`);

    return new Promise((resolve, reject) => {
      const child = spawn(bin, args);

      let stdoutData = '';
      let stderrData = '';

      child.stdout.on('data', (data) => {
        const text = data.toString();
        stdoutData += text;

        if (onProgress) {
          const match = text.match(/\[download\]\s+(\d+\.?\d*)%/);
          if (match) {
            const pct = parseFloat(match[1]);
            onProgress(Math.min(95, Math.max(5, Math.round(pct))), `Đang tải video: ${pct.toFixed(1)}%`);
          }
        }
      });

      child.stderr.on('data', (data) => {
        const text = data.toString();
        stderrData += text;
      });

      child.on('close', async (code) => {
        if (code !== 0) {
          const combinedErr = `${stderrData}\n${stdoutData}`;
          logger.error(`yt-dlp process exited with code ${code}. Error: ${combinedErr}`);

          const is403OrBlocked =
            combinedErr.includes('403') ||
            combinedErr.includes('Forbidden') ||
            combinedErr.includes('Sign in to confirm') ||
            combinedErr.includes('bot') ||
            combinedErr.includes('Private video');

          let userFriendlyMsg = `Download failed (exit code ${code}): ${stderrData || stdoutData}`;
          if (is403OrBlocked) {
            userFriendlyMsg = `YouTube chặn tải trực tiếp (HTTP 403 / Bot Detection). Vui lòng chuyển sang chế độ Ghi hình tab.`;
          } else if (combinedErr.includes('No space left on device') || combinedErr.includes('Errno 28') || combinedErr.includes('ENOSPC')) {
            userFriendlyMsg = `Ổ đĩa của máy tính đã đầy (Hết dung lượng bộ nhớ). Vui lòng dọn dẹp bớt ổ đĩa để tải và xử lý video.`;
          }

          const customErr: any = new Error(userFriendlyMsg);
          customErr.suggestBrowserCapture = is403OrBlocked;
          customErr.is403 = is403OrBlocked;

          return reject(customErr);
        }

        // Find the resulting video file in the output directory
        const files = await fs.promises.readdir(outputDirectory);
        const sourceFile = files.find((f) => f.startsWith('source.') && !f.endsWith('.part') && !f.endsWith('.ytdl'));

        if (!sourceFile) {
          return reject(new Error('Downloaded video file could not be found.'));
        }

        const fullPath = path.join(outputDirectory, sourceFile);
        logger.info(`Download completed: ${fullPath}`);

        // Try getting video title from metadata
        let title = 'YouTube Video';
        try {
          const meta = await this.getVideoMetadata(cleanUrl);
          if (meta.title) title = meta.title;
        } catch {}

        resolve({ filePath: fullPath, title });
      });

      child.on('error', (err) => {
        logger.error('yt-dlp spawn error:', err);
        reject(err);
      });
    });
  }

  /**
   * Downloads a lightweight low-res preview video (360p / fast) for local HTML5 video playback
   */
  public async downloadPreviewVideo(videoUrl: string): Promise<string> {
    const bin = await this.ensureBinary();
    const cleanUrl = normalizeYoutubeUrl(videoUrl);
    const idMatch = cleanUrl.match(/[?&]v=([a-zA-Z0-9_-]{11})/) || cleanUrl.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    const videoId = idMatch ? idMatch[1] : 'preview';
    const previewDir = path.join(config.tempDir, 'previews');
    ensureDirSync(previewDir);
    const previewPath = path.join(previewDir, `${videoId}.mp4`);

    if (fs.existsSync(previewPath) && fs.statSync(previewPath).size > 10000) {
      return previewPath;
    }

    const args = [
      '-f', 'worst[ext=mp4]/18/worst',
      '--no-playlist',
      '--no-warnings',
      '-o', previewPath,
      ...this.getAntiBlockingArgs(false),
      cleanUrl,
    ];

    return new Promise((resolve, reject) => {
      logger.info(`Downloading lightweight preview for ${videoId} to ${previewPath}...`);
      execFile(bin, args, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) {
          logger.error('Failed to download preview video:', stderr || error.message);
          return reject(new Error(`Không thể tải bản xem trước: ${stderr || error.message}`));
        }
        logger.info(`Preview video ready: ${previewPath}`);
        resolve(previewPath);
      });
    });
  }
}

export const youtubeDownloader = new YoutubeDownloader();

