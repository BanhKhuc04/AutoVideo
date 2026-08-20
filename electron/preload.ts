import { contextBridge, ipcRenderer } from 'electron';

export interface DesktopAPI {
  openFolder: (folderPath: string) => Promise<boolean>;
  selectFolder: () => Promise<string | null>;
  getAppVersion: () => Promise<string>;
  openExternal: (url: string) => Promise<void>;
  openLogsFolder?: () => Promise<boolean>;
}

export interface ElectronAPI extends DesktopAPI {
  isElectron: boolean;
}

const desktopAPI: DesktopAPI = {
  openFolder: (folderPath: string) => ipcRenderer.invoke('open-folder', folderPath),
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  openLogsFolder: () => ipcRenderer.invoke('app:openLogs'),
};

const electronAPI: ElectronAPI = {
  isElectron: true,
  ...desktopAPI,
};

// Expose both desktopAPI and electronAPI for maximum compatibility
contextBridge.exposeInMainWorld('desktopAPI', desktopAPI);
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
