import { app, BrowserWindow, ipcMain, dialog, shell, Menu, session, net } from 'electron';
import path from 'path';
import fs from 'fs';

const CHROME_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Set global Chrome user agent so YouTube treats Electron as regular Chrome
app.userAgentFallback = CHROME_USER_AGENT;

// Disable hardware acceleration to prevent black screen on certain Windows GPUs/drivers
app.disableHardwareAcceleration();

let mainWindow: BrowserWindow | null = null;
let serverInstance: any = null;

const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

if (app.isPackaged) {
  process.env.NODE_ENV = 'production';
}

// Portable Data Directory
let logFilePath = '';
if (app.isPackaged) {
  try {
    const exeDir = path.dirname(process.execPath);
    const portableDataDir = path.join(exeDir, 'data');
    if (!fs.existsSync(portableDataDir)) {
      fs.mkdirSync(portableDataDir, { recursive: true });
    }
    app.setPath('userData', portableDataDir);

    const logsDir = path.join(exeDir, 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    logFilePath = path.join(logsDir, 'app.log');
  } catch (err) {
    // Fallback to standard userData
    const appDataDir = path.join(app.getPath('appData'), 'YouTubeClipStudio');
    app.setPath('userData', appDataDir);
  }
}

function writeLog(message: string): void {
  const logLine = `[${new Date().toISOString()}] ${message}\n`;
  console.log(message);
  if (logFilePath) {
    try {
      fs.appendFileSync(logFilePath, logLine);
    } catch {}
  }
}

// Ensure single instance of the application
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
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
async function initBackendServer(): Promise<void> {
  try {
    writeLog('Starting backend Express server...');
    let serverModule: any;

    if (app.isPackaged) {
      // In production packaged app
      const serverDistPath = path.join(__dirname, '../server/dist/index.js');
      serverModule = require(serverDistPath);
    } else {
      // In development
      const serverDistPath = path.join(__dirname, '../server/dist/index.js');
      try {
        serverModule = require(serverDistPath);
      } catch {
        serverModule = require('../server/src/index');
      }
    }

    if (serverModule && typeof serverModule.startServer === 'function') {
      serverInstance = await serverModule.startServer(5000);
      writeLog('Backend server started successfully on port 5000');
    }
  } catch (err: any) {
    writeLog(`Backend server startup warning: ${err.message}`);
  }
}

/**
 * Helper to check if local server is responsive
 */
function waitForServer(url: string, maxRetries = 20, interval = 200): Promise<boolean> {
  return new Promise((resolve) => {
    let retries = 0;
    const check = () => {
      const request = net.request({ method: 'GET', url });
      request.on('response', (response) => {
        if (response.statusCode >= 200 && response.statusCode < 400) {
          resolve(true);
        } else {
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
      } else {
        setTimeout(check, interval);
      }
    };

    check();
  });
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
    show: false, // Show when ready to prevent white flash
  });

  mainWindow.webContents.setUserAgent(CHROME_USER_AGENT);

  // Remove default menu for clean, modern look
  Menu.setApplicationMenu(null);

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Handle external links (open in user's default browser)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Load URL
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    // Wait for the local Express server on port 5000 to be fully ready
    writeLog('Waiting for http://localhost:5000 to respond...');
    const isServerReady = await waitForServer('http://localhost:5000', 25, 200);
    writeLog(`Server readiness: ${isServerReady}`);

    if (isServerReady) {
      mainWindow.loadURL('http://localhost:5000');
    } else {
      // Direct local file fallback if server failed to bind
      const localIndexPath = path.join(__dirname, '../client/dist/index.html');
      if (fs.existsSync(localIndexPath)) {
        mainWindow.loadFile(localIndexPath);
      } else {
        mainWindow.loadURL('http://localhost:5000');
      }
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
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
    if (folderPath) {
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
}

// App lifecycle
app.whenReady().then(async () => {
  session.defaultSession.setUserAgent(CHROME_USER_AGENT);

  registerIpcHandlers();
  await initBackendServer();
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
