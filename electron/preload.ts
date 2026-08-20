import { contextBridge, ipcRenderer } from 'electron';

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

export interface DesktopAPI {
  openFolder: (folderPath: string) => Promise<boolean>;
  selectFolder: () => Promise<string | null>;
  getAppVersion: () => Promise<string>;
  openExternal: (url: string) => Promise<void>;
  openLogsFolder?: () => Promise<boolean>;
  updater?: UpdaterAPI;
}

export interface ElectronAPI extends DesktopAPI {
  isElectron: boolean;
}

const updaterAPI: UpdaterAPI = {
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  downloadUpdate: () => ipcRenderer.invoke('updater:download'),
  quitAndInstall: () => ipcRenderer.invoke('updater:install'),
  getStatus: () => ipcRenderer.invoke('updater:getStatus'),
  onStatusChange: (callback: (info: UpdateInfo) => void) => {
    const subscription = (_: any, data: UpdateInfo) => callback(data);
    ipcRenderer.on('updater:status', subscription);
    return () => {
      ipcRenderer.removeListener('updater:status', subscription);
    };
  },
};

const desktopAPI: DesktopAPI = {
  openFolder: (folderPath: string) => ipcRenderer.invoke('open-folder', folderPath),
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  openLogsFolder: () => ipcRenderer.invoke('app:openLogs'),
  updater: updaterAPI,
};

const electronAPI: ElectronAPI = {
  isElectron: true,
  ...desktopAPI,
};

// Expose both desktopAPI and electronAPI for maximum compatibility
contextBridge.exposeInMainWorld('desktopAPI', desktopAPI);
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
