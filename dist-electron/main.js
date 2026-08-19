"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
let mainWindow = null;
let serverInstance = null;
const isDev = !electron_1.app.isPackaged && process.env.NODE_ENV !== 'production';
// Ensure single instance of the application
const gotTheLock = electron_1.app.requestSingleInstanceLock();
if (!gotTheLock) {
    electron_1.app.quit();
}
else {
    electron_1.app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized())
                mainWindow.restore();
            mainWindow.focus();
        }
    });
}
/**
 * Start the Express backend server
 */
async function initBackendServer() {
    try {
        let serverModule;
        if (electron_1.app.isPackaged) {
            // In production packaged app
            const serverDistPath = path_1.default.join(__dirname, '../server/dist/index.js');
            serverModule = require(serverDistPath);
        }
        else {
            // In development
            const serverDistPath = path_1.default.join(__dirname, '../server/dist/index.js');
            try {
                serverModule = require(serverDistPath);
            }
            catch {
                serverModule = require('../server/src/index');
            }
        }
        if (serverModule && typeof serverModule.startServer === 'function') {
            serverInstance = await serverModule.startServer(5000);
            console.log('Backend server started successfully on port 5000');
        }
    }
    catch (err) {
        console.warn('Backend server startup note (might already be running):', err.message);
    }
}
/**
 * Create the main Electron window
 */
function createMainWindow() {
    const iconPath = path_1.default.join(__dirname, '../assets/icon.png');
    mainWindow = new electron_1.BrowserWindow({
        width: 1280,
        height: 860,
        minWidth: 1024,
        minHeight: 700,
        title: 'YouTube Clip Studio Pro',
        icon: iconPath,
        backgroundColor: '#121212',
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: true,
        },
        show: false, // Show when ready to prevent white flash
    });
    // Remove default menu for clean, modern look
    electron_1.Menu.setApplicationMenu(null);
    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
    });
    // Handle external links (open in user's default browser)
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http:') || url.startsWith('https:')) {
            electron_1.shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });
    // Load URL
    if (isDev && process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    }
    else {
        mainWindow.loadURL('http://localhost:5000');
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
// Register IPC handlers
function registerIpcHandlers() {
    // Native folder picker
    electron_1.ipcMain.handle('dialog:selectFolder', async () => {
        if (!mainWindow)
            return null;
        const result = await electron_1.dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory', 'createDirectory'],
            title: 'Chọn thư mục lưu trữ video (Google Drive / Ổ đĩa)',
        });
        if (result.canceled || result.filePaths.length === 0)
            return null;
        return result.filePaths[0];
    });
    // App version
    electron_1.ipcMain.handle('app:getVersion', () => electron_1.app.getVersion());
    // Open folder in File Explorer
    electron_1.ipcMain.handle('shell:openFolder', async (_, folderPath) => {
        if (folderPath) {
            await electron_1.shell.openPath(folderPath);
            return true;
        }
        return false;
    });
    // Open external URL in browser
    electron_1.ipcMain.handle('shell:openExternal', async (_, url) => {
        if (url) {
            await electron_1.shell.openExternal(url);
        }
    });
}
// App lifecycle
electron_1.app.whenReady().then(async () => {
    registerIpcHandlers();
    await initBackendServer();
    createMainWindow();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('before-quit', () => {
    if (serverInstance && typeof serverInstance.close === 'function') {
        serverInstance.close();
    }
});
