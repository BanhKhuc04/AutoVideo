import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
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
}

export class VideoCutter {
  private ffmpegPath: string = '';

  constructor() {
    this.ffmpegPath = this.resolveFfmpegPath();
  }

  private resolveFfmpegPath(): string {
    if (config.ffmpegPath && fs.existsSync(config.ffmpegPath)) {
      return config.ffmpegPath;
    }

    // Check config.binDir (bundled in Electron resources or server/bin)
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

    return 'ffmpeg'; // fallback to PATH
  }

  /**
   * Cuts a single segment from the source video using FFmpeg with high-quality 720p H.264 / AAC settings
   */
  public async cutSegment(
    sourceVideoPath: string,
    segment: ParsedSegment,
    outputDirectory: string
  ): Promise<CutResult> {
    ensureDirSync(outputDirectory);
    const outputPath = path.join(outputDirectory, segment.outputFilename);

    const ffmpegBin = this.resolveFfmpegPath();

    /**
     * Professional 720p H.264 / AAC FFmpeg pipeline:
     * -ss before -i: fast seek to keyframe
     * -i sourceVideoPath
     * -t durationSeconds
     * -vf scale & pad: standardizes to 1280x720 HD without distortion
     * -c:v libx264 -crf 18 -preset medium: pristine visual quality
     * -pix_fmt yuv420p: universal browser/mobile playback compatibility
     * -c:a aac -b:a 192k: high-fidelity 192kbps AAC stereo audio
     * -avoid_negative_ts make_zero: exact audio/video sync
     */
    const args = [
      '-y', // Overwrite output if exists
      '-ss',
      segment.startSeconds.toString(),
      '-i',
      sourceVideoPath,
      '-t',
      segment.durationSeconds.toString(),
      '-vf',
      'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1',
      '-c:v',
      'libx264',
      '-crf',
      '18',
      '-preset',
      'medium',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-avoid_negative_ts',
      'make_zero',
      outputPath,
    ];

    logger.info(`Cutting 720p segment #${segment.index}: [${segment.startStr} -> ${segment.endStr}] -> ${segment.outputFilename}`);

    return new Promise((resolve, reject) => {
      const child = spawn(ffmpegBin, args);

      let stderrData = '';

      child.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      child.on('close', async (code) => {
        if (code !== 0) {
          logger.error(`FFmpeg error cutting segment #${segment.index}:`, stderrData);
          return reject(new Error(`FFmpeg failed on segment #${segment.index} with code ${code}: ${stderrData}`));
        }

        if (!fs.existsSync(outputPath)) {
          return reject(new Error(`Cut output file ${segment.outputFilename} was not generated.`));
        }

        const stats = await fs.promises.stat(outputPath);

        logger.info(`Successfully cut 720p clip ${segment.outputFilename} (${stats.size} bytes)`);

        resolve({
          segmentIndex: segment.index,
          filename: segment.outputFilename,
          filePath: outputPath,
          durationSeconds: segment.durationSeconds,
          sizeBytes: stats.size,
        });
      });

      child.on('error', (err) => {
        logger.error(`FFmpeg spawn error for segment #${segment.index}:`, err);
        reject(err);
      });
    });
  }

  /**
   * Cuts multiple segments sequentially
   */
  public async cutAllSegments(
    sourceVideoPath: string,
    segments: ParsedSegment[],
    outputDirectory: string,
    onProgress?: (current: number, total: number) => void
  ): Promise<CutResult[]> {
    const results: CutResult[] = [];

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (onProgress) {
        onProgress(i + 1, segments.length);
      }

      const result = await this.cutSegment(sourceVideoPath, seg, outputDirectory);
      results.push(result);
    }

    return results;
  }
}

export const videoCutter = new VideoCutter();
