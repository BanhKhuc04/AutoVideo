"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const desktopAPI = {
    openFolder: (folderPath) => electron_1.ipcRenderer.invoke('open-folder', folderPath),
    selectFolder: () => electron_1.ipcRenderer.invoke('dialog:selectFolder'),
    getAppVersion: () => electron_1.ipcRenderer.invoke('app:getVersion'),
    openExternal: (url) => electron_1.ipcRenderer.invoke('shell:openExternal', url),
    openLogsFolder: () => electron_1.ipcRenderer.invoke('app:openLogs'),
};
const electronAPI = {
    isElectron: true,
    ...desktopAPI,
};
// Expose both desktopAPI and electronAPI for maximum compatibility
electron_1.contextBridge.exposeInMainWorld('desktopAPI', desktopAPI);
electron_1.contextBridge.exposeInMainWorld('electronAPI', electronAPI);
