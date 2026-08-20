import { app, BrowserWindow, ipcMain, dialog, shell, Menu, session, net } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';

const CHROME_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

app.userAgentFallback = CHROME_USER_AGENT;
app.disableHardwareAcceleration();

let mainWindow: BrowserWindow | null = null;
let serverInstance: any = null;
let logFilePath = '';
let logsDirPath = '';

const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

if (app.isPackaged) {
  process.env.NODE_ENV = 'production';
}

// 1. Initialize Portable Directories & Production Logging
function initLogging(): void {
  try {
    if (app.isPackaged) {
      const exeDir = path.dirname(process.execPath);
      const portableDataDir = path.join(exeDir, 'data');
      if (!fs.existsSync(portableDataDir)) {
        fs.mkdirSync(portableDataDir, { recursive: true });
      }
      app.setPath('userData', portableDataDir);

      logsDirPath = path.join(exeDir, 'logs');
      if (!fs.existsSync(logsDirPath)) {
        fs.mkdirSync(logsDirPath, { recursive: true });
      }
      logFilePath = path.join(logsDirPath, 'app.log');
    } else {
      logsDirPath = path.resolve(__dirname, '../logs');
      if (!fs.existsSync(logsDirPath)) {
        fs.mkdirSync(logsDirPath, { recursive: true });
      }
      logFilePath = path.join(logsDirPath, 'app.log');
    }
  } catch (err: any) {
    const appDataDir = path.join(app.getPath('appData'), 'YouTubeClipStudio');
    app.setPath('userData', appDataDir);
    logsDirPath = path.join(appDataDir, 'logs');
    if (!fs.existsSync(logsDirPath)) {
      fs.mkdirSync(logsDirPath, { recursive: true });
    }
    logFilePath = path.join(logsDirPath, 'app.log');
  }
}

initLogging();

export function writeLog(message: string, level = 'INFO'): void {
  const logLine = `[${new Date().toISOString()}] [${level}] ${message}\n`;
  console.log(`[${level}] ${message}`);
  if (logFilePath) {
    try {
      fs.appendFileSync(logFilePath, logLine, 'utf8');
    } catch {}
  }
}

// Log initial application environment details
writeLog('================================================================');
writeLog(`🚀 YouTube Clip Studio Pro Starting...`);
writeLog(`   Electron Version : ${process.versions.electron}`);
writeLog(`   Chrome Version   : ${process.versions.chrome}`);
writeLog(`   Node.js Version  : ${process.versions.node}`);
writeLog(`   Platform / Arch  : ${process.platform} (${process.arch})`);
writeLog(`   isPackaged       : ${app.isPackaged}`);
writeLog(`   process.execPath : ${process.execPath}`);
writeLog(`   process.cwd()    : ${process.cwd()}`);
writeLog(`   resourcesPath    : ${(process as any).resourcesPath || 'N/A'}`);
writeLog(`   userData Path    : ${app.getPath('userData')}`);
writeLog(`   logs Path        : ${logFilePath}`);
writeLog('================================================================');

// Catch global process exceptions
process.on('uncaughtException', (err) => {
  writeLog(`[UncaughtException] ${err.message}\n${err.stack || ''}`, 'ERROR');
});

process.on('unhandledRejection', (reason: any) => {
  writeLog(`[UnhandledRejection] ${reason?.message || String(reason)}`, 'ERROR');
});

// Ensure single instance of the application
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  writeLog('Another instance is already running. Quitting.');
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

/**
 * Start the Express backend server
 */
async function initBackendServer(): Promise<boolean> {
  try {
    writeLog('Initializing backend Express server module...');
    let serverModule: any;

    if (app.isPackaged) {
      const serverDistPath = path.join(__dirname, '../server/dist/index.js');
      writeLog(`Requiring packaged server module from: ${serverDistPath}`);
      serverModule = require(serverDistPath);
    } else {
      const serverDistPath = path.join(__dirname, '../server/dist/index.js');
      try {
        serverModule = require(serverDistPath);
      } catch {
        serverModule = require('../server/src/index');
      }
    }

    if (serverModule && typeof serverModule.startServer === 'function') {
      serverInstance = await serverModule.startServer(5000);
      writeLog('Backend server startServer() invoked successfully on port 5000');
      return true;
    } else {
      writeLog('serverModule.startServer is not a function!', 'ERROR');
      return false;
    }
  } catch (err: any) {
    writeLog(`Backend server initialization error: ${err.message}\n${err.stack || ''}`, 'ERROR');
    return false;
  }
}

/**
 * Verify backend health before frontend starts using it
 * Polls GET http://localhost:5000/api/health
 */
function waitForBackendHealth(url = 'http://localhost:5000/api/health', maxRetries = 30, intervalMs = 300): Promise<boolean> {
  return new Promise((resolve) => {
    let attempts = 0;
    const check = () => {
      attempts++;
      const request = net.request({ method: 'GET', url });
      request.on('response', (response) => {
        if (response.statusCode >= 200 && response.statusCode < 400) {
          writeLog(`Backend health check PASSED on attempt ${attempts} (Status: ${response.statusCode})`);
          resolve(true);
        } else {
          retry();
        }
      });
      request.on('error', (err) => {
        retry(err);
      });
      request.end();
    };

    const retry = (lastErr?: any) => {
      if (attempts >= maxRetries) {
        writeLog(`Backend health check TIMEOUT after ${attempts} attempts (${lastErr?.message || 'No response'})`, 'WARN');
        resolve(false);
      } else {
        setTimeout(check, intervalMs);
      }
    };

    check();
  });
}

/**
 * Renders a styled diagnostic error screen in Vietnamese if startup fails
 */
function renderStartupErrorScreen(diagnostics: {
  backendHealthy: boolean;
  ffmpegFound: boolean;
  ytDlpFound: boolean;
  clientDistFound: boolean;
  errorMessage?: string;
}): void {
  if (!mainWindow) return;

  const errorHtml = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <title>Lỗi Khởi Động - YouTube Clip Studio Pro</title>
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
async function createMainWindow(): Promise<void> {
  const iconPath = path.join(__dirname, '../assets/icon.png');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: 'YouTube Clip Studio Pro',
    icon: iconPath,
    backgroundColor: '#121212',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
    show: true,
  });

  mainWindow.webContents.setUserAgent(CHROME_USER_AGENT);
  Menu.setApplicationMenu(null);

  // Handle external links (open in user's default browser)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
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
  await initBackendServer();

  // Load URL
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    writeLog(`Development mode: Loading Vite dev server at ${process.env.VITE_DEV_SERVER_URL}`);
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    // Production mode: verify backend health first
    writeLog('Production mode: Waiting for backend health check on http://localhost:5000/api/health...');
    const backendHealthy = await waitForBackendHealth('http://localhost:5000/api/health', 35, 300);

    if (backendHealthy) {
      writeLog('Backend is healthy! Loading http://localhost:5000 into BrowserWindow...');
      mainWindow.loadURL('http://localhost:5000').catch((err) => {
        writeLog(`Failed to loadURL http://localhost:5000: ${err.message}`, 'ERROR');
        fallbackToLocalIndexOrError(backendHealthy);
      });
    } else {
      writeLog('Backend failed health check. Displaying diagnostic error screen.', 'ERROR');
      fallbackToLocalIndexOrError(false);
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function fallbackToLocalIndexOrError(backendHealthy: boolean): void {
  const localIndexPath = path.join(__dirname, '../client/dist/index.html');
  const clientDistFound = fs.existsSync(localIndexPath);

  // Check binaries
  const binDir = (process as any).resourcesPath
    ? path.join((process as any).resourcesPath, 'bin')
    : path.resolve(__dirname, '../server/bin');

  const ffmpegFound = fs.existsSync(path.join(binDir, 'ffmpeg.exe')) || fs.existsSync(path.join(binDir, 'ffmpeg'));
  const ytDlpFound = fs.existsSync(path.join(binDir, 'yt-dlp.exe')) || fs.existsSync(path.join(binDir, 'yt-dlp'));

  if (backendHealthy && clientDistFound) {
    writeLog(`Loading local client index directly from ${localIndexPath}`);
    mainWindow?.loadFile(localIndexPath);
  } else {
    renderStartupErrorScreen({
      backendHealthy,
      ffmpegFound,
      ytDlpFound,
      clientDistFound,
      errorMessage: !backendHealthy ? 'Không thể kết nối đến máy chủ Express nội bộ (Port 5000).' : undefined,
    });
  }
}

// Register IPC handlers
function registerIpcHandlers(): void {
  // Native folder picker
  ipcMain.handle('dialog:selectFolder', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Chọn thư mục lưu trữ video (Google Drive / Ổ đĩa)',
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  // App version
  ipcMain.handle('app:getVersion', () => app.getVersion());

  // Open folder in File Explorer
  ipcMain.handle('shell:openFolder', async (_, folderPath: string) => {
    if (folderPath && fs.existsSync(folderPath)) {
      await shell.openPath(folderPath);
      return true;
    }
    return false;
  });

  // Open external URL in browser
  ipcMain.handle('shell:openExternal', async (_, url: string) => {
    if (url) {
      await shell.openExternal(url);
    }
  });

  // Open logs folder
  ipcMain.handle('app:openLogs', async () => {
    if (logsDirPath && fs.existsSync(logsDirPath)) {
      await shell.openPath(logsDirPath);
      return true;
    }
    return false;
  });
}

// App lifecycle
app.whenReady().then(async () => {
  registerIpcHandlers();
  await createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverInstance && typeof serverInstance.close === 'function') {
    serverInstance.close();
  }
});
