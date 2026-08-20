import fs from 'fs';
import path from 'path';
import { spawn, execFile } from 'child_process';
import { config } from '../config';
import { ParsedSegment } from '../utils/timeConverter';
import { logger } from '../utils/logger';
import { ensureDirSync } from '../utils/cleanup';

export interface CutResult {
  segmentIndex: number;
  filename: string;
  filePath: string;
  durationSeconds: number;
  sizeBytes: number;
  strategy: 'fast-copy' | 'hardware-encode' | 'software-encode';
  durationMs: number;
}

export interface VideoStreamInfo {
  videoCodec: string;
  audioCodec: string;
  width: number;
  height: number;
  duration: number;
  isMp4Compatible: boolean;
}

export class VideoCutter {
  private ffmpegPath: string = '';
  private detectedHwEncoder: string | null = null;
  private isHwEncoderTested: boolean = false;

  constructor() {
    this.ffmpegPath = this.resolveFfmpegPath();
  }

  private resolveFfmpegPath(): string {
    if (config.ffmpegPath && fs.existsSync(config.ffmpegPath)) {
      return config.ffmpegPath;
    }

    const binFfmpegWin = path.join(config.binDir, 'ffmpeg.exe');
    if (fs.existsSync(binFfmpegWin)) {
      return binFfmpegWin;
    }

    const binFfmpegUnix = path.join(config.binDir, 'ffmpeg');
    if (fs.existsSync(binFfmpegUnix)) {
      return binFfmpegUnix;
    }

    try {
      const staticFfmpeg = require('ffmpeg-static');
      if (staticFfmpeg && fs.existsSync(staticFfmpeg)) {
        return staticFfmpeg;
      }
    } catch {
      // ignore
    }

    return 'ffmpeg';
  }

  /**
   * Automatically detect functional Hardware Encoder (NVENC / QSV / AMF / MF)
   */
  public async getBestEncoder(): Promise<{ encoder: string; isHardware: boolean; extraArgs: string[] }> {
    if (!this.isHwEncoderTested) {
      this.detectedHwEncoder = await this.probeHardwareEncoders();
      this.isHwEncoderTested = true;
    }

    if (this.detectedHwEncoder === 'h264_nvenc') {
      return {
        encoder: 'h264_nvenc',
        isHardware: true,
        extraArgs: ['-preset', 'p4', '-cq', '20'],
      };
    }

    if (this.detectedHwEncoder === 'h264_qsv') {
      return {
        encoder: 'h264_qsv',
        isHardware: true,
        extraArgs: ['-preset', 'fast', '-global_quality', '20'],
      };
    }

    if (this.detectedHwEncoder === 'h264_amf') {
      return {
        encoder: 'h264_amf',
        isHardware: true,
        extraArgs: ['-quality', 'speed', '-rc', 'cqp', '-qp_i', '20', '-qp_p', '22'],
      };
    }

    if (this.detectedHwEncoder === 'h264_mf') {
      return {
        encoder: 'h264_mf',
        isHardware: true,
        extraArgs: ['-rate_control', 'cbr', '-b:v', '4000k'],
      };
    }

    // Default fast software encoder
    return {
      encoder: 'libx264',
      isHardware: false,
      extraArgs: ['-preset', 'veryfast', '-crf', '20'],
    };
  }

  private async probeHardwareEncoders(): Promise<string | null> {
    const candidates = ['h264_nvenc', 'h264_qsv', 'h264_amf', 'h264_mf'];
    const ffmpegBin = this.resolveFfmpegPath();

    for (const enc of candidates) {
      try {
        const works = await new Promise<boolean>((resolve) => {
          const testArgs = [
            '-y',
            '-f',
            'lavfi',
            '-i',
            'color=c=black:s=64x64:d=0.04',
            '-c:v',
            enc,
            '-f',
            'null',
            '-',
          ];
          execFile(ffmpegBin, testArgs, { timeout: 3000 }, (err) => {
            resolve(!err);
          });
        });

        if (works) {
          logger.info(`[GPU Hardware Acceleration] Detected and enabled functional encoder: ${enc}`);
          return enc;
        }
      } catch {
        // continue
      }
    }

    logger.info('[GPU Hardware Acceleration] No hardware encoder detected, using optimized CPU libx264 (veryfast)');
    return null;
  }

  /**
   * Inspect source video stream metadata using FFmpeg
   */
  public async probeVideoInfo(sourceVideoPath: string): Promise<VideoStreamInfo> {
    const ffmpegBin = this.resolveFfmpegPath();

    return new Promise((resolve) => {
      execFile(ffmpegBin, ['-i', sourceVideoPath], (err, stdout, stderr) => {
        const output = (stderr || '') + (stdout || '');

        // Extract video stream: "Video: h264 (High) ... 1920x1080"
        let videoCodec = 'unknown';
        let width = 1280;
        let height = 720;
        const videoMatch = output.match(/Video:\s*([a-zA-Z0-9_-]+)[^,]*,\s*[^,]*,\s*(\d+)x(\d+)/);
        if (videoMatch) {
          videoCodec = videoMatch[1].toLowerCase();
          width = parseInt(videoMatch[2], 10) || 1280;
          height = parseInt(videoMatch[3], 10) || 720;
        }

        // Extract audio stream: "Audio: aac ..."
        let audioCodec = 'unknown';
        const audioMatch = output.match(/Audio:\s*([a-zA-Z0-9_-]+)/);
        if (audioMatch) {
          audioCodec = audioMatch[1].toLowerCase();
        }

        // Extract duration: "Duration: 00:05:30.25"
        let duration = 0;
        const durMatch = output.match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
        if (durMatch) {
          duration = parseInt(durMatch[1], 10) * 3600 + parseInt(durMatch[2], 10) * 60 + parseFloat(durMatch[3]);
        }

        const isH264 = videoCodec.includes('h264') || videoCodec.includes('avc1');
        const isAac = audioCodec.includes('aac') || audioCodec.includes('mp4a');
        const isMp4Compatible = isH264 && (isAac || audioCodec === 'unknown');

        resolve({
          videoCodec,
          audioCodec,
          width,
          height,
          duration,
          isMp4Compatible,
        });
      });
    });
  }

  /**
   * Cuts a single segment with Fast Path (-c copy) or hardware/software re-encode fallback
   */
  public async cutSegment(
    sourceVideoPath: string,
    segment: ParsedSegment,
    outputDirectory: string,
    quality: '720p' | '1080p' = '720p',
    streamInfo?: VideoStreamInfo
  ): Promise<CutResult> {
    ensureDirSync(outputDirectory);
    const outputPath = path.join(outputDirectory, segment.outputFilename);
    const ffmpegBin = this.resolveFfmpegPath();
    const startTime = Date.now();

    // Probe source video info if not provided
    const info = streamInfo || (await this.probeVideoInfo(sourceVideoPath));
    const targetMaxH = quality === '1080p' ? 1080 : 720;

    // Check if Fast Path (-c copy) is applicable:
    // 1. Source is H.264/AAC MP4 compatible
    // 2. Source resolution height is <= targetMaxH (no downscale required)
    const canUseFastPath = info.isMp4Compatible && info.height <= targetMaxH;

    if (canUseFastPath) {
      try {
        const fastResult = await this.executeFastCopy(ffmpegBin, sourceVideoPath, segment, outputPath);
        const durationMs = Date.now() - startTime;
        logger.info(
          `[FAST PATH -c copy] Cut segment #${segment.index} in ${(durationMs / 1000).toFixed(2)}s: ${segment.outputFilename}`
        );
        return {
          segmentIndex: segment.index,
          filename: segment.outputFilename,
          filePath: outputPath,
          durationSeconds: segment.durationSeconds,
          sizeBytes: fastResult.sizeBytes,
          strategy: 'fast-copy',
          durationMs,
        };
      } catch (copyErr: any) {
        logger.warn(
          `[Fast Path fallback] Stream copy failed for segment #${segment.index}, falling back to encode:`,
          copyErr.message
        );
      }
    }

    // Re-encoding Path (Hardware accelerated if available, otherwise fast CPU)
    const encodeResult = await this.executeEncode(ffmpegBin, sourceVideoPath, segment, outputPath, quality, info);
    const durationMs = Date.now() - startTime;

    return {
      segmentIndex: segment.index,
      filename: segment.outputFilename,
      filePath: outputPath,
      durationSeconds: segment.durationSeconds,
      sizeBytes: encodeResult.sizeBytes,
      strategy: encodeResult.strategy,
      durationMs,
    };
  }

  /**
   * Fast Path: Stream Copy (-c copy) without re-encoding (0.05s - 0.3s execution)
   */
  private async executeFastCopy(
    ffmpegBin: string,
    sourceVideoPath: string,
    segment: ParsedSegment,
    outputPath: string
  ): Promise<{ sizeBytes: number }> {
    return new Promise((resolve, reject) => {
      // Seek before input for fast seek + clean container timestamp sync
      const args = [
        '-y',
        '-ss',
        segment.startSeconds.toString(),
        '-i',
        sourceVideoPath,
        '-t',
        segment.durationSeconds.toString(),
        '-c',
        'copy',
        '-avoid_negative_ts',
        'make_zero',
        '-movflags',
        '+faststart',
        outputPath,
      ];

      const child = spawn(ffmpegBin, args);
      let stderrData = '';

      child.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      child.on('close', async (code) => {
        if (code !== 0) {
          return reject(new Error(`Stream copy failed with code ${code}: ${stderrData}`));
        }

        if (!fs.existsSync(outputPath)) {
          return reject(new Error('Output file was not created'));
        }

        const stats = await fs.promises.stat(outputPath);
        if (stats.size < 1024) {
          // File suspiciously empty, fallback to re-encode
          return reject(new Error(`Stream copy output size too small (${stats.size} bytes)`));
        }

        resolve({ sizeBytes: stats.size });
      });

      child.on('error', reject);
    });
  }

  /**
   * Fallback Encode: GPU accelerated or optimized CPU encoding
   */
  private async executeEncode(
    ffmpegBin: string,
    sourceVideoPath: string,
    segment: ParsedSegment,
    outputPath: string,
    quality: '720p' | '1080p',
    info: VideoStreamInfo
  ): Promise<{ sizeBytes: number; strategy: 'hardware-encode' | 'software-encode' }> {
    const encoderInfo = await this.getBestEncoder();
    const is1080p = quality === '1080p';
    const targetW = is1080p ? 1920 : 1280;
    const targetH = is1080p ? 1080 : 720;

    // Scale filter: downscale if larger than target, but never upscale if source is smaller
    const scaleFilter = `scale='trunc(min(1,min(${targetW}/iw,${targetH}/ih))*iw/2)*2':'trunc(min(1,min(${targetW}/iw,${targetH}/ih))*ih/2)*2',setsar=1`;

    const args = [
      '-y',
      '-ss',
      segment.startSeconds.toString(),
      '-i',
      sourceVideoPath,
      '-t',
      segment.durationSeconds.toString(),
      '-vf',
      scaleFilter,
      '-c:v',
      encoderInfo.encoder,
      ...encoderInfo.extraArgs,
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-avoid_negative_ts',
      'make_zero',
      '-movflags',
      '+faststart',
      outputPath,
    ];

    logger.info(`[Re-encode Path] Using ${encoderInfo.encoder} for segment #${segment.index} (${quality})`);

    return new Promise((resolve, reject) => {
      const child = spawn(ffmpegBin, args);
      let stderrData = '';

      child.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      child.on('close', async (code) => {
        if (code !== 0) {
          logger.error(`FFmpeg re-encode error segment #${segment.index}:`, stderrData);
          return reject(new Error(`FFmpeg re-encode failed on segment #${segment.index} with code ${code}`));
        }

        if (!fs.existsSync(outputPath)) {
          return reject(new Error(`Output file ${segment.outputFilename} was not generated`));
        }

        const stats = await fs.promises.stat(outputPath);
        resolve({
          sizeBytes: stats.size,
          strategy: encoderInfo.isHardware ? 'hardware-encode' : 'software-encode',
        });
      });

      child.on('error', reject);
    });
  }

  /**
   * Cuts multiple segments sequentially with stream probing and performance tracking
   */
  public async cutAllSegments(
    sourceVideoPath: string,
    segments: ParsedSegment[],
    outputDirectory: string,
    quality: '720p' | '1080p' = '720p',
    onProgress?: (current: number, total: number, clipName: string) => void
  ): Promise<CutResult[]> {
    const results: CutResult[] = [];
    const streamInfo = await this.probeVideoInfo(sourceVideoPath);

    logger.info(
      `[Source Video Info] Codec: ${streamInfo.videoCodec}/${streamInfo.audioCodec}, Resolution: ${streamInfo.width}x${streamInfo.height}, MP4-compatible: ${streamInfo.isMp4Compatible}`
    );

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (onProgress) {
        onProgress(i + 1, segments.length, seg.outputFilename);
      }

      const result = await this.cutSegment(sourceVideoPath, seg, outputDirectory, quality, streamInfo);
      results.push(result);
    }

    return results;
  }
}

export const videoCutter = new VideoCutter();
