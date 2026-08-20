"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const updaterAPI = {
    checkForUpdates: () => electron_1.ipcRenderer.invoke('updater:check'),
    downloadUpdate: () => electron_1.ipcRenderer.invoke('updater:download'),
    quitAndInstall: () => electron_1.ipcRenderer.invoke('updater:install'),
    getStatus: () => electron_1.ipcRenderer.invoke('updater:getStatus'),
    onStatusChange: (callback) => {
        const subscription = (_, data) => callback(data);
        electron_1.ipcRenderer.on('updater:status', subscription);
        return () => {
            electron_1.ipcRenderer.removeListener('updater:status', subscription);
        };
    },
};
const desktopAPI = {
    openFolder: (folderPath) => electron_1.ipcRenderer.invoke('open-folder', folderPath),
    selectFolder: () => electron_1.ipcRenderer.invoke('dialog:selectFolder'),
    getAppVersion: () => electron_1.ipcRenderer.invoke('app:getVersion'),
    openExternal: (url) => electron_1.ipcRenderer.invoke('shell:openExternal', url),
    openLogsFolder: () => electron_1.ipcRenderer.invoke('app:openLogs'),
    updater: updaterAPI,
};
const electronAPI = {
    isElectron: true,
    ...desktopAPI,
};
// Expose both desktopAPI and electronAPI for maximum compatibility
electron_1.contextBridge.exposeInMainWorld('desktopAPI', desktopAPI);
electron_1.contextBridge.exposeInMainWorld('electronAPI', electronAPI);
