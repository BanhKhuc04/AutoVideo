"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeLog = writeLog;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const electron_updater_1 = require("electron-updater");
const CHROME_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
electron_1.app.userAgentFallback = CHROME_USER_AGENT;
let mainWindow = null;
let serverInstance = null;
let logFilePath = '';
let logsDirPath = '';
let lastStartupError = '';
const isDev = !electron_1.app.isPackaged && process.env.NODE_ENV !== 'production';
if (electron_1.app.isPackaged) {
    process.env.NODE_ENV = 'production';
}
// 1. Initialize Portable / AppData Directories & Logging
function initLogging() {
    try {
        if (electron_1.app.isPackaged) {
            // In installed NSIS mode, use standard appData userData so updates don't wipe data
            const appDataDir = path_1.default.join(electron_1.app.getPath('appData'), 'YouTubeClipStudio');
            electron_1.app.setPath('userData', appDataDir);
            logsDirPath = path_1.default.join(appDataDir, 'logs');
            if (!fs_1.default.existsSync(logsDirPath)) {
                fs_1.default.mkdirSync(logsDirPath, { recursive: true });
            }
            logFilePath = path_1.default.join(logsDirPath, 'app.log');
        }
        else {
            logsDirPath = path_1.default.resolve(__dirname, '../logs');
            if (!fs_1.default.existsSync(logsDirPath)) {
                fs_1.default.mkdirSync(logsDirPath, { recursive: true });
            }
            logFilePath = path_1.default.join(logsDirPath, 'app.log');
        }
    }
    catch (err) {
        const fallbackDir = path_1.default.join(electron_1.app.getPath('temp'), 'YouTubeClipStudioLogs');
        if (!fs_1.default.existsSync(fallbackDir)) {
            fs_1.default.mkdirSync(fallbackDir, { recursive: true });
        }
        logsDirPath = fallbackDir;
        logFilePath = path_1.default.join(fallbackDir, 'app.log');
    }
}
initLogging();
function writeLog(message, level = 'INFO') {
    const logLine = `[${new Date().toISOString()}] [${level}] ${message}\n`;
    console.log(`[${level}] ${message}`);
    if (logFilePath) {
        try {
            fs_1.default.appendFileSync(logFilePath, logLine, 'utf8');
        }
        catch { }
    }
}
// Log initial application environment details
writeLog('================================================================');
writeLog(`🚀 YouTube Clip Studio Starting...`);
writeLog(`   App Version      : ${electron_1.app.getVersion()}`);
writeLog(`   Electron Version : ${process.versions.electron}`);
writeLog(`   Chrome Version   : ${process.versions.chrome}`);
writeLog(`   Node.js Version  : ${process.versions.node}`);
writeLog(`   Platform / Arch  : ${process.platform} (${process.arch})`);
writeLog(`   isPackaged       : ${electron_1.app.isPackaged}`);
writeLog(`   process.execPath : ${process.execPath}`);
writeLog(`   process.cwd()    : ${process.cwd()}`);
writeLog(`   resourcesPath    : ${process.resourcesPath || 'N/A'}`);
writeLog(`   userData Path    : ${electron_1.app.getPath('userData')}`);
writeLog(`   logs Path        : ${logFilePath}`);
writeLog('================================================================');
// Catch global process exceptions
process.on('uncaughtException', (err) => {
    writeLog(`[UncaughtException] ${err.message}\n${err.stack || ''}`, 'ERROR');
});
process.on('unhandledRejection', (reason) => {
    writeLog(`[UnhandledRejection] ${reason?.message || String(reason)}`, 'ERROR');
});
// Ensure single instance of the application
const gotTheLock = electron_1.app.requestSingleInstanceLock();
if (!gotTheLock) {
    writeLog('Another instance is already running. Quitting.');
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
// ============================================================
// 2. AUTO UPDATER CONFIGURATION (GitHub Releases)
// ============================================================
electron_updater_1.autoUpdater.autoDownload = false;
electron_updater_1.autoUpdater.autoInstallOnAppQuit = false;
electron_updater_1.autoUpdater.logger = {
    info: (msg) => writeLog(`[AutoUpdater] ${msg}`),
    warn: (msg) => writeLog(`[AutoUpdater] ${msg}`, 'WARN'),
    error: (msg) => writeLog(`[AutoUpdater] ${msg}`, 'ERROR'),
};
let currentUpdateInfo = {
    status: 'idle',
    currentVersion: electron_1.app.getVersion(),
};
function sendUpdateStatus(info) {
    currentUpdateInfo = { ...currentUpdateInfo, ...info, currentVersion: electron_1.app.getVersion() };
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('updater:status', currentUpdateInfo);
    }
}
electron_updater_1.autoUpdater.on('checking-for-update', () => {
    writeLog('[AutoUpdater] Checking for update...');
    sendUpdateStatus({ status: 'checking', error: undefined });
});
electron_updater_1.autoUpdater.on('update-available', (info) => {
    writeLog(`[AutoUpdater] Update available: version ${info.version}`);
    sendUpdateStatus({
        status: 'available',
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : '',
    });
});
electron_updater_1.autoUpdater.on('update-not-available', (info) => {
    writeLog(`[AutoUpdater] Update not available. Current version: ${info?.version || electron_1.app.getVersion()}`);
    sendUpdateStatus({
        status: 'not-available',
        version: info?.version || electron_1.app.getVersion(),
    });
});
electron_updater_1.autoUpdater.on('download-progress', (progressObj) => {
    sendUpdateStatus({
        status: 'downloading',
        percent: Math.round(progressObj.percent),
        transferred: progressObj.transferred,
        total: progressObj.total,
        bytesPerSecond: progressObj.bytesPerSecond,
    });
});
electron_updater_1.autoUpdater.on('update-downloaded', (info) => {
    writeLog(`[AutoUpdater] Update downloaded: version ${info.version}`);
    sendUpdateStatus({
        status: 'downloaded',
        version: info.version,
    });
});
electron_updater_1.autoUpdater.on('error', (err) => {
    writeLog(`[AutoUpdater Error] ${err?.message || String(err)}`, 'ERROR');
    sendUpdateStatus({
        status: 'error',
        error: err?.message || 'Không thể kiểm tra hoặc tải bản cập nhật.',
    });
});
/**
 * Start the Express backend server
 */
async function initBackendServer() {
    try {
        writeLog('Initializing backend Express server module...');
        let serverModule;
        if (electron_1.app.isPackaged) {
            const serverDistPath = path_1.default.join(__dirname, '../server/dist/index.js');
            writeLog(`Requiring packaged server module from: ${serverDistPath}`);
            serverModule = require(serverDistPath);
        }
        else {
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
            writeLog('Backend server startServer() invoked successfully on port 5000');
            return true;
        }
        else {
            lastStartupError = 'serverModule.startServer is not a function in server/dist/index.js';
            writeLog(lastStartupError, 'ERROR');
            return false;
        }
    }
    catch (err) {
        lastStartupError = `${err.message}\n${err.stack || ''}`;
        writeLog(`Backend server initialization error: ${lastStartupError}`, 'ERROR');
        return false;
    }
}
/**
 * Verify backend health before frontend starts using it
 */
function waitForBackendHealth(url = 'http://localhost:5000/api/health', maxRetries = 25, intervalMs = 200) {
    return new Promise((resolve) => {
        let attempts = 0;
        const check = () => {
            attempts++;
            const request = electron_1.net.request({ method: 'GET', url });
            request.on('response', (response) => {
                if (response.statusCode >= 200 && response.statusCode < 400) {
                    writeLog(`Backend health check PASSED on attempt ${attempts} (Status: ${response.statusCode})`);
                    resolve(true);
                }
                else {
                    retry();
                }
            });
            request.on('error', (err) => {
                retry(err);
            });
            request.end();
        };
        const retry = (lastErr) => {
            if (attempts >= maxRetries) {
                writeLog(`Backend health check TIMEOUT after ${attempts} attempts (${lastErr?.message || 'No response'})`, 'WARN');
                resolve(false);
            }
            else {
                setTimeout(check, intervalMs);
            }
        };
        check();
    });
}
/**
 * Renders a styled diagnostic error screen in Vietnamese if startup fails
 */
function renderStartupErrorScreen(diagnostics) {
    if (!mainWindow)
        return;
    const errorHtml = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <title>Lỗi Khởi Động - YouTube Clip Studio</title>
      <style>
        body {
          background-color: #121212;
          color: #e0e0e0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 80vh;
        }
        .error-card {
          background-color: #1e1e1e;
          border: 1px solid #ff4d4f;
          border-radius: 12px;
          padding: 32px;
          max-width: 650px;
          width: 100%;
          box-shadow: 0 8px 24px rgba(0,0,0,0.5);
        }
        h2 { color: #ff4d4f; margin-top: 0; display: flex; align-items: center; gap: 10px; }
        .diagnostic-item {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #2a2a2a;
          font-size: 14px;
        }
        .status-ok { color: #52c41a; font-weight: bold; }
        .status-fail { color: #ff4d4f; font-weight: bold; }
        .actions { margin-top: 24px; display: flex; gap: 12px; }
        button {
          background-color: #ff4d4f;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        }
        button.secondary {
          background-color: #333;
          color: #ccc;
        }
        button:hover { opacity: 0.9; }
        .log-path {
          margin-top: 16px;
          font-size: 12px;
          color: #888;
          word-break: break-all;
          background: #141414;
          padding: 8px 12px;
          border-radius: 4px;
        }
      </style>
    </head>
    <body>
      <div class="error-card">
        <h2>⚠️ Ứng dụng không thể khởi động</h2>
        <p>Đã xảy ra lỗi trong quá trình khởi tạo môi trường chạy ứng dụng. Dưới đây là thông tin chẩn đoán:</p>
        
        <div class="diagnostic-item">
          <span>Máy chủ nội bộ (Express Backend):</span>
          <span class="${diagnostics.backendHealthy ? 'status-ok' : 'status-fail'}">
            ${diagnostics.backendHealthy ? '✓ Đang hoạt động' : '✗ Không phản hồi (Port 5000)'}
          </span>
        </div>

        <div class="diagnostic-item">
          <span>Công cụ FFmpeg (ffmpeg.exe):</span>
          <span class="${diagnostics.ffmpegFound ? 'status-ok' : 'status-fail'}">
            ${diagnostics.ffmpegFound ? '✓ Đã sẵn sàng' : '✗ Không tìm thấy trong resources/bin'}
          </span>
        </div>

        <div class="diagnostic-item">
          <span>Công cụ YouTube Downloader (yt-dlp.exe):</span>
          <span class="${diagnostics.ytDlpFound ? 'status-ok' : 'status-fail'}">
            ${diagnostics.ytDlpFound ? '✓ Đã sẵn sàng' : '✗ Không tìm thấy trong resources/bin'}
          </span>
        </div>

        <div class="diagnostic-item">
          <span>Tệp giao diện người dùng (React UI):</span>
          <span class="${diagnostics.clientDistFound ? 'status-ok' : 'status-fail'}">
            ${diagnostics.clientDistFound ? '✓ Đã đóng gói' : '✗ Thiếu client/dist/index.html'}
          </span>
        </div>

        ${diagnostics.errorMessage ? `<p style="color: #ff7875; margin-top: 12px; font-size: 13px;">Chi tiết lỗi: ${diagnostics.errorMessage}</p>` : ''}

        <div class="actions">
          <button onclick="window.electronAPI.openLogsFolder()">📁 Mở Thư Mục Log</button>
          <button class="secondary" onclick="location.reload()">🔄 Thử Tải Lại</button>
        </div>

        <div class="log-path">
          Nhật ký lỗi chi tiết: ${logFilePath}
        </div>
      </div>
    </body>
    </html>
  `;
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
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
        title: 'YouTube Clip Studio',
        icon: iconPath,
        backgroundColor: '#0D0F12',
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false,
        },
        show: true,
    });
    mainWindow.webContents.setUserAgent(CHROME_USER_AGENT);
    electron_1.Menu.setApplicationMenu(null);
    // Handle external links (open in user's default browser)
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http:') || url.startsWith('https:')) {
            electron_1.shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });
    // Logging for renderer events
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        writeLog(`Renderer did-fail-load: ${errorCode} - ${errorDescription} (${validatedURL})`, 'WARN');
    });
    mainWindow.webContents.on('render-process-gone', (event, details) => {
        writeLog(`Renderer process gone: reason=${details.reason}, exitCode=${details.exitCode}`, 'ERROR');
    });
    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
        if (level >= 2) {
            writeLog(`[Renderer Console] ${message} (${sourceId}:${line})`, level === 3 ? 'ERROR' : 'WARN');
        }
    });
    // Start backend server
    const serverStarted = await initBackendServer();
    // Load URL
    if (isDev && process.env.VITE_DEV_SERVER_URL) {
        writeLog(`Development mode: Loading Vite dev server at ${process.env.VITE_DEV_SERVER_URL}`);
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    }
    else {
        // Production mode: verify backend health first
        if (!serverStarted) {
            writeLog('Backend server failed to start. Displaying diagnostic screen immediately.', 'ERROR');
            fallbackToLocalIndexOrError(false);
        }
        else {
            writeLog('Production mode: Waiting for backend health check on http://localhost:5000/api/health...');
            const backendHealthy = await waitForBackendHealth('http://localhost:5000/api/health', 25, 200);
            if (backendHealthy) {
                writeLog('Backend is healthy! Loading http://localhost:5000 into BrowserWindow...');
                mainWindow.loadURL('http://localhost:5000').catch((err) => {
                    writeLog(`Failed to loadURL http://localhost:5000: ${err.message}`, 'ERROR');
                    fallbackToLocalIndexOrError(backendHealthy);
                });
            }
            else {
                writeLog('Backend failed health check. Displaying diagnostic error screen.', 'ERROR');
                fallbackToLocalIndexOrError(false);
            }
        }
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
function fallbackToLocalIndexOrError(backendHealthy) {
    const localIndexPath = path_1.default.join(__dirname, '../client/dist/index.html');
    const clientDistFound = fs_1.default.existsSync(localIndexPath);
    // Check binaries
    const binDir = process.resourcesPath
        ? path_1.default.join(process.resourcesPath, 'bin')
        : path_1.default.resolve(__dirname, '../server/bin');
    const ffmpegFound = fs_1.default.existsSync(path_1.default.join(binDir, 'ffmpeg.exe')) || fs_1.default.existsSync(path_1.default.join(binDir, 'ffmpeg'));
    const ytDlpFound = fs_1.default.existsSync(path_1.default.join(binDir, 'yt-dlp.exe')) || fs_1.default.existsSync(path_1.default.join(binDir, 'yt-dlp'));
    if (backendHealthy && clientDistFound) {
        writeLog(`Loading local client index directly from ${localIndexPath}`);
        mainWindow?.loadFile(localIndexPath);
    }
    else {
        renderStartupErrorScreen({
            backendHealthy,
            ffmpegFound,
            ytDlpFound,
            clientDistFound,
            errorMessage: lastStartupError || (!backendHealthy ? 'Không thể kết nối đến máy chủ Express nội bộ (Port 5000).' : undefined),
        });
    }
}
// Register IPC handlers
function registerIpcHandlers() {
    // Native folder picker
    electron_1.ipcMain.handle('dialog:selectFolder', async () => {
        if (!mainWindow)
            return null;
        const result = await electron_1.dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory', 'createDirectory'],
            title: 'Chọn thư mục lưu trữ video',
        });
        if (result.canceled || result.filePaths.length === 0)
            return null;
        return result.filePaths[0];
    });
    // App version
    electron_1.ipcMain.handle('app:getVersion', () => electron_1.app.getVersion());
    // Native Open folder in File Explorer
    const handleOpenFolder = async (_, folderPath) => {
        if (!folderPath || !folderPath.trim()) {
            writeLog('open-folder called with empty path', 'WARN');
            throw new Error('Chưa chọn thư mục lưu.');
        }
        const cleanPath = folderPath.trim();
        const resolvedPath = path_1.default.resolve(cleanPath);
        if (!fs_1.default.existsSync(resolvedPath)) {
            try {
                fs_1.default.mkdirSync(resolvedPath, { recursive: true });
                writeLog(`Created missing output directory: ${resolvedPath}`);
            }
            catch (mkdirErr) {
                writeLog(`Failed to create directory ${resolvedPath}: ${mkdirErr.message}`, 'ERROR');
                throw new Error(`Không thể tạo thư mục lưu: ${resolvedPath}`);
            }
        }
        writeLog(`Opening folder in Explorer: ${resolvedPath}`);
        const result = await electron_1.shell.openPath(resolvedPath);
        if (result) {
            writeLog(`shell.openPath failed for ${resolvedPath}: ${result}`, 'ERROR');
            throw new Error(`Không thể mở thư mục: ${result}`);
        }
        return true;
    };
    electron_1.ipcMain.handle('open-folder', handleOpenFolder);
    electron_1.ipcMain.handle('shell:openFolder', handleOpenFolder);
    // Open external URL in browser
    electron_1.ipcMain.handle('shell:openExternal', async (_, url) => {
        if (url) {
            await electron_1.shell.openExternal(url);
        }
    });
    // Open logs folder
    electron_1.ipcMain.handle('app:openLogs', async () => {
        if (logsDirPath && fs_1.default.existsSync(logsDirPath)) {
            const result = await electron_1.shell.openPath(logsDirPath);
            return !result;
        }
        return false;
    });
    // ============================================================
    // AUTO UPDATER IPC HANDLERS
    // ============================================================
    electron_1.ipcMain.handle('updater:check', async () => {
        writeLog('IPC updater:check received');
        if (!electron_1.app.isPackaged) {
            writeLog('[AutoUpdater] In dev mode, skipping actual GitHub Releases check');
            sendUpdateStatus({
                status: 'not-available',
                version: electron_1.app.getVersion(),
                message: 'Chế độ phát triển (Dev mode) không kiểm tra update thật.',
            });
            return { success: true, isDev: true };
        }
        try {
            const result = await electron_updater_1.autoUpdater.checkForUpdates();
            return { success: true, updateInfo: result?.updateInfo };
        }
        catch (err) {
            writeLog(`[AutoUpdater check error] ${err.message}`, 'ERROR');
            sendUpdateStatus({ status: 'error', error: err.message });
            return { success: false, message: err.message };
        }
    });
    electron_1.ipcMain.handle('updater:download', async () => {
        writeLog('IPC updater:download received');
        try {
            await electron_updater_1.autoUpdater.downloadUpdate();
            return { success: true };
        }
        catch (err) {
            writeLog(`[AutoUpdater download error] ${err.message}`, 'ERROR');
            sendUpdateStatus({ status: 'error', error: err.message });
            return { success: false, message: err.message };
        }
    });
    electron_1.ipcMain.handle('updater:install', () => {
        writeLog('IPC updater:install received. Quitting and installing update...');
        electron_updater_1.autoUpdater.quitAndInstall(false, true);
    });
    electron_1.ipcMain.handle('updater:getStatus', () => {
        return currentUpdateInfo;
    });
}
// App lifecycle
electron_1.app.whenReady().then(async () => {
    registerIpcHandlers();
    await createMainWindow();
    // Delayed startup check for updates in packaged app
    if (electron_1.app.isPackaged) {
        setTimeout(() => {
            writeLog('[AutoUpdater] Running delayed startup update check...');
            electron_updater_1.autoUpdater.checkForUpdates().catch((err) => {
                writeLog(`[AutoUpdater startup check error] ${err.message}`, 'WARN');
            });
        }, 4500);
    }
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
