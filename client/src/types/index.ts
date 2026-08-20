export interface Segment {
  id: string;
  name?: string;
  start: string;
  end: string;
  error?: string;
  color?: string;
}

export interface ProcessVideoPayload {
  videoUrl: string;
  segments: {
    id?: string;
    name?: string;
    start: string;
    end: string;
  }[];
  outputFolder?: string;
  quality?: '720p' | '1080p';
}

export interface ProcessClipResult {
  index?: number;
  name?: string;
  filename: string;
  streamUrl: string;
  durationSeconds: number;
  sizeBytes: number;
}

export interface ProcessVideoResponse {
  success: boolean;
  jobId: string;
  videoTitle: string;
  totalSegments: number;
  downloadUrl: string;
  zipFilename: string;
  zipSizeBytes?: number;
  localSavedPath?: string;
  clips: ProcessClipResult[];
  error?: string;
  suggestBrowserCapture?: boolean;
}

export type ProcessingStep =
  | 'idle'
  | 'downloading'
  | 'processing'
  | 'zipping'
  | 'completed'
  | 'error';

export type ProcessingMode = 'download' | 'browser_record';

export interface RecordedClip {
  id: string;
  name: string;
  start: string;
  end: string;
  durationSeconds: number;
  blob: Blob;
  previewUrl: string;
  timestamp: number;
}

export interface VideoMetadata {
  id: string;
  title: string;
  duration: number; // in seconds
  thumbnail?: string;
  uploader?: string;
}

export interface ElectronBridgeAPI {
  isElectron: boolean;
  getAppVersion: () => Promise<string>;
  selectFolder: () => Promise<string | null>;
  openFolder: (folderPath: string) => Promise<boolean>;
  openExternal: (url: string) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI?: ElectronBridgeAPI;
  }
}
