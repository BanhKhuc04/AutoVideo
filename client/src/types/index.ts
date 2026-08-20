export interface Segment {
  id: string;
  name?: string;
  start: string;
  end: string;
  error?: string;
  selected?: boolean; // For Quick Cut & selective export (defaults to true)
}

export type CutMode = 'precision' | 'quick';

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
  createZip?: boolean;
}

export interface ProcessClipResult {
  index?: number;
  name?: string;
  filename: string;
  streamUrl: string;
  durationSeconds: number;
  sizeBytes: number;
}

export interface ProcessClipTiming {
  segmentIndex: number;
  strategy: string;
  durationMs: number;
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
  qualityNotice?: string;
  timing?: {
    downloadMs: number;
    cutMs: number;
    zipMs: number;
    totalMs: number;
    clipTimings: ProcessClipTiming[];
  };
  clips: ProcessClipResult[];
  error?: string;
}

export type ProcessingStep =
  | 'idle'
  | 'downloading'
  | 'processing'
  | 'zipping'
  | 'completed'
  | 'error';

export interface VideoMetadata {
  id: string;
  title: string;
  duration: number; // in seconds
  thumbnail?: string;
  uploader?: string;
}

export interface UpdateInfo {
  status: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  version?: string;
  currentVersion?: string;
  releaseNotes?: string;
  releaseDate?: string;
  percent?: number;
  transferred?: number;
  total?: number;
  bytesPerSecond?: number;
  error?: string;
}

export interface UpdaterAPI {
  checkForUpdates: () => Promise<{ success: boolean; message?: string }>;
  downloadUpdate: () => Promise<{ success: boolean; message?: string }>;
  quitAndInstall: () => Promise<void>;
  getStatus: () => Promise<UpdateInfo>;
  onStatusChange: (callback: (info: UpdateInfo) => void) => () => void;
}

export interface DesktopBridgeAPI {
  openFolder: (folderPath: string) => Promise<boolean>;
  selectFolder: () => Promise<string | null>;
  getAppVersion: () => Promise<string>;
  openExternal: (url: string) => Promise<void>;
  openLogsFolder?: () => Promise<boolean>;
  updater?: UpdaterAPI;
}

export interface ElectronBridgeAPI extends DesktopBridgeAPI {
  isElectron: boolean;
}

declare global {
  interface Window {
    desktopAPI?: DesktopBridgeAPI;
    electronAPI?: ElectronBridgeAPI;
  }
}
