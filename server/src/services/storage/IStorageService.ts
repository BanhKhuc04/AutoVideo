import { Stream } from 'stream';

export interface StorageUploadResult {
  fileId: string;
  filename: string;
  downloadUrl: string;
  sizeBytes?: number;
}

export interface IStorageService {
  /**
   * Save or upload a processed ZIP file
   */
  saveZip(jobId: string, sourceFilePath: string, filename: string): Promise<StorageUploadResult>;

  /**
   * Get file stream or path for download
   */
  getZipPath(jobId: string): Promise<string>;

  /**
   * Check if a processed file exists
   */
  exists(jobId: string): Promise<boolean>;

  /**
   * Delete stored file
   */
  delete(jobId: string): Promise<void>;
}
