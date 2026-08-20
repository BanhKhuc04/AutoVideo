"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const CHROME_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
// Set global Chrome user agent so YouTube treats Electron as regular Chrome
electron_1.app.userAgentFallback = CHROME_USER_AGENT;
// Disable hardware acceleration to prevent black screen on certain Windows GPUs/drivers
electron_1.app.disableHardwareAcceleration();
let mainWindow = null;
let serverInstance = null;
const isDev = !electron_1.app.isPackaged && process.env.NODE_ENV !== 'production';
if (electron_1.app.isPackaged) {
    process.env.NODE_ENV = 'production';
}
// Portable Data Directory
let logFilePath = '';
if (electron_1.app.isPackaged) {
    try {
        const exeDir = path_1.default.dirname(process.execPath);
        const portableDataDir = path_1.default.join(exeDir, 'data');
        if (!fs_1.default.existsSync(portableDataDir)) {
            fs_1.default.mkdirSync(portableDataDir, { recursive: true });
        }
        electron_1.app.setPath('userData', portableDataDir);
        const logsDir = path_1.default.join(exeDir, 'logs');
        if (!fs_1.default.existsSync(logsDir)) {
            fs_1.default.mkdirSync(logsDir, { recursive: true });
        }
        logFilePath = path_1.default.join(logsDir, 'app.log');
    }
    catch (err) {
        // Fallback to standard userData
        const appDataDir = path_1.default.join(electron_1.app.getPath('appData'), 'YouTubeClipStudio');
        electron_1.app.setPath('userData', appDataDir);
    }
}
function writeLog(message) {
    const logLine = `[${new Date().toISOString()}] ${message}\n`;
    console.log(message);
    if (logFilePath) {
        try {
            fs_1.default.appendFileSync(logFilePath, logLine);
        }
        catch { }
    }
}
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
        writeLog('Starting backend Express server...');
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
            writeLog('Backend server started successfully on port 5000');
        }
    }
    catch (err) {
        writeLog(`Backend server startup warning: ${err.message}`);
    }
}
/**
 * Helper to check if local server is responsive
 */
function waitForServer(url, maxRetries = 20, interval = 200) {
    return new Promise((resolve) => {
        let retries = 0;
        const check = () => {
            const request = electron_1.net.request({ method: 'GET', url });
            request.on('response', (response) => {
                if (response.statusCode >= 200 && response.statusCode < 400) {
                    resolve(true);
                }
                else {
                    retry();
                }
            });
            request.on('error', () => {
                retry();
            });
            request.end();
        };
        const retry = () => {
            retries++;
            if (retries >= maxRetries) {
                resolve(false);
            }
            else {
                setTimeout(check, interval);
            }
        };
        check();
    });
}
/**
 * Create the main Electron window
 */
async function createMainWindow() {
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
            webSecurity: false,
        },
        show: false, // Show when ready to prevent white flash
    });
    mainWindow.webContents.setUserAgent(CHROME_USER_AGENT);
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
        // Wait for the local Express server on port 5000 to be fully ready
        writeLog('Waiting for http://localhost:5000 to respond...');
        const isServerReady = await waitForServer('http://localhost:5000', 25, 200);
        writeLog(`Server readiness: ${isServerReady}`);
        if (isServerReady) {
            mainWindow.loadURL('http://localhost:5000');
        }
        else {
            // Direct local file fallback if server failed to bind
            const localIndexPath = path_1.default.join(__dirname, '../client/dist/index.html');
            if (fs_1.default.existsSync(localIndexPath)) {
                mainWindow.loadFile(localIndexPath);
            }
            else {
                mainWindow.loadURL('http://localhost:5000');
            }
        }
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
    electron_1.session.defaultSession.setUserAgent(CHROME_USER_AGENT);
    registerIpcHandlers();
    await initBackendServer();
    await createMainWindow();
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
