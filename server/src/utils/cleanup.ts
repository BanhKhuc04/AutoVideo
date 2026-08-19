import fs from 'fs';
import path from 'path';
import { logger } from './logger';

/**
 * Removes a directory and all of its contents recursively
 */
export async function removeDirectory(dirPath: string): Promise<void> {
  try {
    if (fs.existsSync(dirPath)) {
      await fs.promises.rm(dirPath, { recursive: true, force: true });
      logger.debug(`Successfully removed directory: ${dirPath}`);
    }
  } catch (error) {
    logger.warn(`Failed to remove directory: ${dirPath}`, error);
  }
}

/**
 * Ensures that a directory exists, creating it if necessary
 */
export function ensureDirSync(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Cleans up temporary files older than a given age in milliseconds (default: 2 hours)
 */
export async function cleanupOldFiles(dirPath: string, maxAgeMs: number = 2 * 60 * 60 * 1000): Promise<void> {
  try {
    if (!fs.existsSync(dirPath)) return;

    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const now = Date.now();

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      try {
        const stats = await fs.promises.stat(fullPath);
        if (now - stats.mtimeMs > maxAgeMs) {
          if (entry.isDirectory()) {
            await fs.promises.rm(fullPath, { recursive: true, force: true });
          } else {
            await fs.promises.unlink(fullPath);
          }
          logger.info(`Cleaned up expired temp item: ${entry.name}`);
        }
      } catch {
        // Ignore stat errors for deleted files
      }
    }
  } catch (error) {
    logger.warn(`Error during old files cleanup in ${dirPath}:`, error);
  }
}
