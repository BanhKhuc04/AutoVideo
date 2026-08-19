import fs from 'fs';
import path from 'path';
import { IStorageService, StorageUploadResult } from './IStorageService';
import { config } from '../../config';
import { ensureDirSync } from '../../utils/cleanup';
import { logger } from '../../utils/logger';

export class LocalStorageService implements IStorageService {
  private outputDir: string;
  private clipsDir: string;

  constructor(outputDir: string = config.outputDir, clipsDir: string = config.clipsDir) {
    this.outputDir = outputDir;
    this.clipsDir = clipsDir;
    ensureDirSync(this.outputDir);
    ensureDirSync(this.clipsDir);
  }

  async saveZip(jobId: string, sourceFilePath: string, filename: string): Promise<StorageUploadResult> {
    const targetPath = path.join(this.outputDir, `${jobId}.zip`);

    // If source and target are different, copy or move
    if (path.resolve(sourceFilePath) !== path.resolve(targetPath)) {
      await fs.promises.copyFile(sourceFilePath, targetPath);
    }

    const stats = await fs.promises.stat(targetPath);

    logger.info(`Saved result ZIP for job ${jobId} to ${targetPath} (${stats.size} bytes)`);

    return {
      fileId: jobId,
      filename,
      downloadUrl: `/api/download/${jobId}`,
      sizeBytes: stats.size,
    };
  }

  /**
   * Saves cut clips into persistent job directory for streaming & preview
   */
  async saveClips(jobId: string, sourceClipsDir: string): Promise<string[]> {
    const jobClipsDir = path.join(this.clipsDir, jobId);
    ensureDirSync(jobClipsDir);

    const files = await fs.promises.readdir(sourceClipsDir);
    const savedPaths: string[] = [];

    for (const file of files) {
      const srcFile = path.join(sourceClipsDir, file);
      const destFile = path.join(jobClipsDir, file);
      await fs.promises.copyFile(srcFile, destFile);
      savedPaths.push(destFile);
    }

    logger.info(`Preserved ${savedPaths.length} clips for job ${jobId} in ${jobClipsDir}`);
    return savedPaths;
  }

  getClipPath(jobId: string, filename: string): string {
    return path.join(this.clipsDir, jobId, filename);
  }

  async getAllClipPaths(jobId: string): Promise<string[]> {
    const jobClipsDir = path.join(this.clipsDir, jobId);
    if (!fs.existsSync(jobClipsDir)) return [];
    const files = await fs.promises.readdir(jobClipsDir);
    return files.map((f) => path.join(jobClipsDir, f));
  }

  async getZipPath(jobId: string): Promise<string> {
    const filePath = path.join(this.outputDir, `${jobId}.zip`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File for job ID ${jobId} not found.`);
    }
    return filePath;
  }

  async exists(jobId: string): Promise<boolean> {
    const filePath = path.join(this.outputDir, `${jobId}.zip`);
    return fs.existsSync(filePath);
  }

  async delete(jobId: string): Promise<void> {
    const filePath = path.join(this.outputDir, `${jobId}.zip`);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      logger.info(`Deleted stored ZIP for job ${jobId}`);
    }

    const jobClipsDir = path.join(this.clipsDir, jobId);
    if (fs.existsSync(jobClipsDir)) {
      await fs.promises.rm(jobClipsDir, { recursive: true, force: true });
    }
  }
}

// Default singleton export
export const localStorageService = new LocalStorageService();
