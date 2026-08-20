import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { config } from '../config';
import { youtubeDownloader } from '../services/youtubeDownloader';
import { videoCutter } from '../services/videoCutter';
import { zipCreator } from '../services/zipCreator';
import { localStorageService } from '../services/storage/LocalStorageService';
import { validateAndParseSegments, sanitizeFilename } from '../utils/timeConverter';
import { removeDirectory, ensureDirSync } from '../utils/cleanup';
import { logger } from '../utils/logger';

// Request Validation Schema
const ProcessVideoSchema = z.object({
  videoUrl: z.string().min(1, 'Đường dẫn video YouTube là bắt buộc'),
  segments: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().optional(),
        start: z.string().min(1, 'Thời gian bắt đầu là bắt buộc'),
        end: z.string().min(1, 'Thời gian kết thúc là bắt buộc'),
      })
    )
    .min(1, 'Cần ít nhất một đoạn video'),
  outputFolder: z.string().optional(),
  quality: z.enum(['720p', '1080p']).optional(),
  createZip: z.boolean().optional(),
});

export class VideoController {
  /**
   * Process Video: Download, cut segments, preserve clips for preview, package ZIP, and save to local sync folder
   * POST /api/process-video
   */
  public async processVideo(req: Request, res: Response, next: NextFunction): Promise<void> {
    const jobId = uuidv4();
    const jobTempDir = path.join(config.tempDir, jobId);
    const clipsDir = path.join(jobTempDir, 'clips');

    try {
      // 1. Validate request body
      const parseResult = ProcessVideoSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: parseResult.error.errors.map((e) => e.message).join(', '),
        });
        return;
      }

      const { videoUrl, segments, outputFolder, quality = '720p', createZip = true } = parseResult.data;
      const jobStartTime = Date.now();

      logger.info(`[Job ${jobId}] Starting process for ${videoUrl} with ${segments.length} segments (${quality}, zip=${createZip})`);
      ensureDirSync(jobTempDir);
      ensureDirSync(clipsDir);

      // Step 1: Download video via yt-dlp (once for all segments)
      const downloadStartTime = Date.now();
      logger.info(`[Job ${jobId}] Step 1: Downloading video (${quality})...`);
      let sourceVideoPath = '';
      let videoTitle = 'YouTube Video';

      try {
        const downloadResult = await youtubeDownloader.downloadVideo(videoUrl, jobTempDir, quality);
        sourceVideoPath = downloadResult.filePath;
        videoTitle = downloadResult.title;
      } catch (dlErr: any) {
        logger.error(`[Job ${jobId}] Download failed:`, dlErr.message);
        await removeDirectory(jobTempDir);

        res.status(422).json({
          success: false,
          error: dlErr.message || 'Không thể tải video từ YouTube.',
          suggestBrowserCapture: dlErr.suggestBrowserCapture || false,
        });
        return;
      }
      const downloadMs = Date.now() - downloadStartTime;
      logger.info(`[Job ${jobId}] Download completed in ${(downloadMs / 1000).toFixed(2)}s`);

      // Step 2: Validate and generate automatic unique filenames (001, 002) with video title
      const parsedSegments = validateAndParseSegments(segments, videoTitle);

      // Check source stream properties for quality notice
      const streamInfo = await videoCutter.probeVideoInfo(sourceVideoPath);
      let qualityNotice: string | undefined;
      if (quality === '1080p' && streamInfo.height < 1080) {
        qualityNotice = `Video nguồn có chất lượng tối đa ${streamInfo.height}p. Đã xuất ở chất lượng gốc ${streamInfo.height}p (không upscale giả).`;
        logger.info(`[Job ${jobId}] ${qualityNotice}`);
      }

      // Step 3: Cut segments via Fast Path (-c copy) or hardware/software encode
      const cutStartTime = Date.now();
      logger.info(`[Job ${jobId}] Step 2: Cutting ${parsedSegments.length} segments with FFmpeg (${quality})...`);
      const cutResults = await videoCutter.cutAllSegments(sourceVideoPath, parsedSegments, clipsDir, quality);
      const cutMs = Date.now() - cutStartTime;

      // Step 4: Preserve cut clips for previewing and downloading
      await localStorageService.saveClips(jobId, clipsDir);

      // Step 5: Package clips into ZIP if enabled
      let zipMs = 0;
      let userFriendlyZipName = '';
      let zipResult: any = null;
      let uploadResult: any = null;

      if (createZip) {
        const zipStartTime = Date.now();
        logger.info(`[Job ${jobId}] Step 3: Packaging clips into ZIP...`);
        const rawZipPath = path.join(jobTempDir, 'result.zip');
        const clipFilePaths = cutResults.map((c) => c.filePath);
        zipResult = await zipCreator.createZipFromFiles(clipFilePaths, rawZipPath);

        const sanitizedTitle = sanitizeFilename(videoTitle) || 'video';
        userFriendlyZipName = `${sanitizedTitle}_clips.zip`;
        uploadResult = await localStorageService.saveZip(jobId, zipResult.zipFilePath, userFriendlyZipName);
        zipMs = Date.now() - zipStartTime;
      }

      // Step 6: If custom local output folder is specified (e.g. Google Drive Desktop sync folder), copy files there
      let localSavedPath: string | undefined;
      if (outputFolder && outputFolder.trim()) {
        try {
          const targetDir = path.resolve(outputFolder.trim());
          ensureDirSync(targetDir);

          for (const clip of cutResults) {
            const destClipPath = path.join(targetDir, clip.filename);
            await fs.promises.copyFile(clip.filePath, destClipPath);
          }

          if (createZip && zipResult) {
            const destZipPath = path.join(targetDir, userFriendlyZipName);
            await fs.promises.copyFile(zipResult.zipFilePath, destZipPath);
          }
          localSavedPath = targetDir;
          logger.info(`[Job ${jobId}] Automatically saved clips to local folder: ${targetDir} (zip=${createZip})`);
        } catch (copyErr: any) {
          logger.warn(`[Job ${jobId}] Could not copy to custom output folder:`, copyErr.message);
        }
      }

      // Cleanup temporary working directory
      await removeDirectory(jobTempDir);

      const totalMs = Date.now() - jobStartTime;

      // Summary timing breakdown log
      logger.info(`================================================================`);
      logger.info(`⚡ [PERFORMANCE REPORT - Job ${jobId}] Total Time: ${(totalMs / 1000).toFixed(2)}s`);
      logger.info(`   • Download (yt-dlp) : ${(downloadMs / 1000).toFixed(2)}s`);
      logger.info(`   • Cutting (${cutResults.length} clips) : ${(cutMs / 1000).toFixed(2)}s`);
      cutResults.forEach((c) => {
        logger.info(`     - Clip #${c.segmentIndex} [${c.strategy}]: ${(c.durationMs / 1000).toFixed(2)}s (${c.filename})`);
      });
      logger.info(`   • ZIP & Save       : ${(zipMs / 1000).toFixed(2)}s`);
      logger.info(`================================================================`);

      res.status(200).json({
        success: true,
        jobId,
        videoTitle,
        totalSegments: parsedSegments.length,
        downloadUrl: uploadResult?.downloadUrl || `/api/download-zip/${jobId}`,
        zipFilename: uploadResult?.filename || `${sanitizeFilename(videoTitle) || 'video'}_clips.zip`,
        zipSizeBytes: uploadResult?.sizeBytes || 0,
        localSavedPath,
        qualityNotice,
        timing: {
          downloadMs,
          cutMs,
          zipMs,
          totalMs,
          clipTimings: cutResults.map((c) => ({
            segmentIndex: c.segmentIndex,
            strategy: c.strategy,
            durationMs: c.durationMs,
          })),
        },
        clips: cutResults.map((c, idx) => ({
          index: c.segmentIndex,
          name: parsedSegments[idx]?.name || `Đoạn ${c.segmentIndex.toString().padStart(3, '0')}`,
          filename: c.filename,
          streamUrl: `/api/stream-clip/${jobId}/${encodeURIComponent(c.filename)}`,
          durationSeconds: c.durationSeconds,
          sizeBytes: c.sizeBytes,
        })),
      });
    } catch (error: any) {
      logger.error(`[Job ${jobId}] Process failed:`, error);
      await removeDirectory(jobTempDir);

      res.status(500).json({
        success: false,
        error: error.message || 'Đã xảy ra lỗi trong quá trình xử lý video.',
        suggestBrowserCapture: error.suggestBrowserCapture || false,
      });
    }
  }

  /**
   * Process Browser-Captured Clips: receives multipart files from frontend browser recording
   * POST /api/process-browser-clips
   */
  public async processBrowserClips(req: Request, res: Response): Promise<void> {
    const jobId = uuidv4();
    const jobClipsDir = path.join(config.clipsDir, jobId);
    const tempZipPath = path.join(config.tempDir, `${jobId}_browser.zip`);

    try {
      const files = req.files as Express.Multer.File[];
      const videoTitle = (req.body.videoTitle as string) || 'YouTube_Clips';
      const outputFolder = req.body.outputFolder as string | undefined;
      const clipMetadataStr = req.body.metadata as string;
      let clipMetadata: any[] = [];
      try {
        if (clipMetadataStr) clipMetadata = JSON.parse(clipMetadataStr);
      } catch {}

      if (!files || files.length === 0) {
        res.status(400).json({ success: false, error: 'Không có tệp video nào được tải lên.' });
        return;
      }

      ensureDirSync(jobClipsDir);

      const savedClipPaths: string[] = [];
      const clipResults = [];
      const sanitizedTitle = sanitizeFilename(videoTitle) || 'video';

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const meta = clipMetadata[i] || {};
        const clipNumber = (i + 1).toString().padStart(3, '0');
        const customName = meta.name ? sanitizeFilename(meta.name) : '';
        const finalFilename = customName
          ? `${sanitizedTitle}_${clipNumber}_${customName}.mp4`
          : `${sanitizedTitle}_${clipNumber}.mp4`;
        const destPath = path.join(jobClipsDir, finalFilename);

        await fs.promises.writeFile(destPath, file.buffer);
        savedClipPaths.push(destPath);

        clipResults.push({
          index: i + 1,
          name: meta.name || `Đoạn ${clipNumber}`,
          filename: finalFilename,
          streamUrl: `/api/stream/${jobId}/${finalFilename}`,
          durationSeconds: meta.durationSeconds || Math.round(file.size / (1024 * 100)),
          sizeBytes: file.size,
        });
      }

      // Create ZIP archive
      const zipResult = await zipCreator.createZipFromFiles(savedClipPaths, tempZipPath);
      const userFriendlyZipName = `${sanitizedTitle}_clips.zip`;
      const uploadResult = await localStorageService.saveZip(jobId, zipResult.zipFilePath, userFriendlyZipName);

      // Copy to local output folder if specified
      let localSavedPath: string | undefined;
      if (outputFolder && outputFolder.trim()) {
        try {
          const targetDir = path.resolve(outputFolder.trim());
          ensureDirSync(targetDir);
          for (const sp of savedClipPaths) {
            const dest = path.join(targetDir, path.basename(sp));
            await fs.promises.copyFile(sp, dest);
          }
          const destZip = path.join(targetDir, userFriendlyZipName);
          if (fs.existsSync(tempZipPath)) {
            await fs.promises.copyFile(tempZipPath, destZip);
          }
          localSavedPath = targetDir;
        } catch (err: any) {
          logger.warn('Could not copy browser clips to local folder:', err.message);
        }
      }

      // Clean temp zip
      if (fs.existsSync(tempZipPath)) {
        await fs.promises.unlink(tempZipPath).catch(() => {});
      }

      logger.info(`[Job ${jobId}] Browser clips processed successfully! (${files.length} clips)`);

      res.status(200).json({
        success: true,
        jobId,
        videoTitle,
        totalSegments: files.length,
        downloadUrl: uploadResult.downloadUrl,
        zipFilename: uploadResult.filename,
        zipSizeBytes: uploadResult.sizeBytes,
        localSavedPath,
        clips: clipResults,
      });
    } catch (error: any) {
      logger.error('Failed to process browser clips:', error);
      res.status(500).json({ success: false, error: error.message || 'Lỗi xử lý các đoạn ghi hình.' });
    }
  }

  /**
   * Quick Video Info / Metadata
   * GET /api/video-info?url=...
   */
  public async getVideoInfo(req: Request, res: Response): Promise<void> {
    try {
      const url = req.query.url as string;
      if (!url) {
        res.status(400).json({ success: false, error: 'Tham số url là bắt buộc' });
        return;
      }

      logger.info(`Fetching video info for: ${url}`);
      const metadata = await youtubeDownloader.getVideoMetadata(url);

      res.status(200).json({
        success: true,
        metadata,
      });
    } catch (error: any) {
      logger.error('Failed to get video info:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Không thể lấy thông tin video từ YouTube',
        suggestBrowserCapture: error.suggestBrowserCapture || false,
      });
    }
  }

  /**
   * Stream / generate lightweight preview video with HTTP 206 Range support for HTML5 video player
   * GET /api/preview-video?url=...
   */
  public async streamPreviewVideo(req: Request, res: Response): Promise<void> {
    try {
      const url = req.query.url as string;
      if (!url) {
        res.status(400).json({ success: false, error: 'Tham số url là bắt buộc' });
        return;
      }

      logger.info(`Fetching preview video for: ${url}`);
      const previewPath = await youtubeDownloader.downloadPreviewVideo(url);

      if (!fs.existsSync(previewPath)) {
        res.status(404).json({ success: false, error: 'Không tìm thấy tệp xem trước' });
        return;
      }

      const stat = await fs.promises.stat(previewPath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = end - start + 1;
        const fileStream = fs.createReadStream(previewPath, { start, end });

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': 'video/mp4',
        });
        fileStream.pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
          'Accept-Ranges': 'bytes',
        });
        fs.createReadStream(previewPath).pipe(res);
      }
    } catch (error: any) {
      logger.error('Failed to stream preview video:', error);
      res.status(500).json({ success: false, error: error.message || 'Lỗi phát xem trước video' });
    }
  }


  /**
   * Stream individual video clip with HTTP 206 Range support for previewing
   * GET /api/stream/:jobId/:filename
   */
  public async streamClip(req: Request, res: Response): Promise<void> {
    try {
      const jobId = (Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId) as string;
      const filename = (Array.isArray(req.params.filename) ? req.params.filename[0] : req.params.filename) as string;

      if (!jobId || !filename) {
        res.status(400).json({ success: false, error: 'Thiếu jobId hoặc filename' });
        return;
      }

      const clipPath = localStorageService.getClipPath(jobId, filename);
      if (!fs.existsSync(clipPath)) {
        res.status(404).json({ success: false, error: 'Không tìm thấy tệp video' });
        return;
      }

      const stat = await fs.promises.stat(clipPath);
      const fileSize = stat.size;
      const range = req.headers.range;
      const contentType = filename.endsWith('.webm') ? 'video/webm' : 'video/mp4';

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = end - start + 1;
        const fileStream = fs.createReadStream(clipPath, { start, end });

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': contentType,
        });
        fileStream.pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': contentType,
        });
        fs.createReadStream(clipPath).pipe(res);
      }
    } catch (error: any) {
      logger.error('Stream error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Direct MP4 file download with Content-Disposition attachment
   * GET /api/download-clip/:jobId/:filename
   */
  public async downloadClip(req: Request, res: Response): Promise<void> {
    try {
      const jobId = (Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId) as string;
      const filename = (Array.isArray(req.params.filename) ? req.params.filename[0] : req.params.filename) as string;

      if (!jobId || !filename) {
        res.status(400).json({ success: false, error: 'Thiếu jobId hoặc filename' });
        return;
      }

      const clipPath = localStorageService.getClipPath(jobId, filename);
      if (!fs.existsSync(clipPath)) {
        res.status(404).json({ success: false, error: 'Không tìm thấy tệp video để tải' });
        return;
      }

      const stat = await fs.promises.stat(clipPath);
      const contentType = filename.endsWith('.webm') ? 'video/webm' : 'video/mp4';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

      const fileStream = fs.createReadStream(clipPath);
      fileStream.pipe(res);
    } catch (error: any) {
      logger.error('Clip download error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Download generated ZIP file
   * GET /api/download/:jobId
   */
  public async downloadZip(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const jobId = (Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId) as string;
      if (!jobId) {
        res.status(400).json({ success: false, error: 'Job ID is required' });
        return;
      }

      const filePath = await localStorageService.getZipPath(jobId);
      if (!fs.existsSync(filePath)) {
        res.status(404).json({ success: false, error: 'Tệp ZIP không tồn tại hoặc đã hết hạn' });
        return;
      }

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="result_${jobId.slice(0, 8)}.zip"`);

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error: any) {
      logger.error('Download error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Open output folder in Windows File Explorer
   * POST /api/open-folder
   */
  public async openFolder(req: Request, res: Response): Promise<void> {
    try {
      const { folderPath } = req.body;
      const targetPath = folderPath && folderPath.trim() ? path.resolve(folderPath.trim()) : config.clipsDir;

      ensureDirSync(targetPath);

      // On Windows, open via explorer.exe
      const command = process.platform === 'win32' ? `explorer.exe "${targetPath}"` : `xdg-open "${targetPath}"`;
      exec(command, (err) => {
        if (err) {
          logger.warn('Could not open folder in explorer:', err.message);
        }
      });

      res.status(200).json({ success: true, folderPath: targetPath });
    } catch (error: any) {
      logger.error('Open folder error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Health and binary status check
   * GET /api/health
   */
  public async getHealth(req: Request, res: Response): Promise<void> {
    try {
      const ytDlpPath = await youtubeDownloader.ensureBinary();
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        ytDlpReady: !!ytDlpPath,
        ytDlpPath,
        browserCookiesConfigured: !!config.browser,
      });
    } catch (error: any) {
      res.status(200).json({
        status: 'degraded',
        timestamp: new Date().toISOString(),
        ytDlpReady: false,
        error: error.message,
      });
    }
  }
}

export const videoController = new VideoController();
