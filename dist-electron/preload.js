"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const electronAPI = {
    isElectron: true,
    getAppVersion: () => electron_1.ipcRenderer.invoke('app:getVersion'),
    selectFolder: () => electron_1.ipcRenderer.invoke('dialog:selectFolder'),
    openFolder: (folderPath) => electron_1.ipcRenderer.invoke('shell:openFolder', folderPath),
    openExternal: (url) => electron_1.ipcRenderer.invoke('shell:openExternal', url),
};
electron_1.contextBridge.exposeInMainWorld('electronAPI', electronAPI);
