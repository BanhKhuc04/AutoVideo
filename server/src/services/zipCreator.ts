import fs from 'fs';
import path from 'path';
import * as archiverModule from 'archiver';
import { logger } from '../utils/logger';
import { ensureDirSync } from '../utils/cleanup';

export interface ZipResult {
  zipFilePath: string;
  totalFiles: number;
  totalSizeBytes: number;
}

function createZipArchive(options: any): any {
  const mod: any = archiverModule;
  if (typeof mod.ZipArchive === 'function') {
    return new mod.ZipArchive(options);
  }
  if (typeof mod.default === 'function') {
    return mod.default('zip', options);
  }
  if (typeof mod === 'function') {
    return mod('zip', options);
  }
  if (typeof mod.create === 'function') {
    return mod.create('zip', options);
  }
  throw new Error('Could not instantiate ZipArchive from archiver module');
}

export class ZipCreator {
  /**
   * Compresses given list of files into a ZIP archive
   * @param files List of absolute file paths to include
   * @param outputZipPath Destination path for .zip file
   */
  public async createZipFromFiles(files: string[], outputZipPath: string): Promise<ZipResult> {
    ensureDirSync(path.dirname(outputZipPath));

    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputZipPath);
      // level 0 or 1 for fast packing since MP4 is already compressed video
      const archive = createZipArchive({
        zlib: { level: 1 },
      });

      output.on('close', () => {
        const totalSize = archive.pointer();
        logger.info(`ZIP created: ${outputZipPath} (${totalSize} total bytes, ${files.length} files)`);
        resolve({
          zipFilePath: outputZipPath,
          totalFiles: files.length,
          totalSizeBytes: totalSize,
        });
      });

      archive.on('warning', (err: any) => {
        if (err.code === 'ENOENT') {
          logger.warn('Archiver warning:', err);
        } else {
          reject(err);
        }
      });

      archive.on('error', (err: any) => {
        logger.error('Archiver error:', err);
        reject(err);
      });

      archive.pipe(output);

      // Append each file to the root of the ZIP
      for (const filePath of files) {
        if (fs.existsSync(filePath)) {
          const filename = path.basename(filePath);
          archive.file(filePath, { name: filename });
        } else {
          logger.warn(`File does not exist for zipping: ${filePath}`);
        }
      }

      archive.finalize();
    });
  }
}

export const zipCreator = new ZipCreator();
