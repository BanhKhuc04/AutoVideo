import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  isElectron: boolean;
  getAppVersion: () => Promise<string>;
  selectFolder: () => Promise<string | null>;
  openFolder: (folderPath: string) => Promise<boolean>;
  openExternal: (url: string) => Promise<void>;
}

const electronAPI: ElectronAPI = {
  isElectron: true,
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
  openFolder: (folderPath: string) => ipcRenderer.invoke('shell:openFolder', folderPath),
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
