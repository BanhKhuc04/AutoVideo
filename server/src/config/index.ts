import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Load environment variables from .env file
dotenv.config();

const ROOT_DIR = path.resolve(__dirname, '../..');

// Helper to find bin directory in dev, server local, or packaged Electron resources
function resolveBinDir(): string {
  if (process.env.BIN_DIR && fs.existsSync(process.env.BIN_DIR)) {
    return process.env.BIN_DIR;
  }

  // 1. Electron packaged app: process.resourcesPath/bin
  if ((process as any).resourcesPath) {
    const electronBin = path.join((process as any).resourcesPath, 'bin');
    if (fs.existsSync(electronBin)) return electronBin;
  }

  // 2. Local server bin: server/bin
  const localServerBin = path.resolve(ROOT_DIR, './bin');
  if (fs.existsSync(localServerBin)) return localServerBin;

  // 3. Project root bin: ../server/bin or ./bin
  const projectRootBin = path.resolve(ROOT_DIR, '../server/bin');
  if (fs.existsSync(projectRootBin)) return projectRootBin;

  return localServerBin;
}

// Helper to resolve working storage directories
function resolveStorageDir(customEnv: string | undefined, defaultFolder: string): string {
  if (customEnv) return path.resolve(customEnv);

  // If running inside packaged Electron without custom path, store in user's AppData to avoid permission issues
  if ((process as any).resourcesPath && process.env.NODE_ENV === 'production') {
    const userData = process.env.APPDATA || os.homedir();
    return path.join(userData, 'YouTubeClipStudio', defaultFolder);
  }

  return path.resolve(ROOT_DIR, `./${defaultFolder}`);
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Custom binary paths if specified
  ytDlpPath: process.env.YT_DLP_PATH || '',
  ffmpegPath: process.env.FFMPEG_PATH || '',

  // Storage directories
  tempDir: resolveStorageDir(process.env.TEMP_DIR, 'temp'),
  outputDir: resolveStorageDir(process.env.OUTPUT_DIR, 'output'),
  clipsDir: resolveStorageDir(process.env.CLIPS_DIR, 'output/clips'),
  binDir: resolveBinDir(),

  // YouTube Download & Cookies Settings
  browser: process.env.BROWSER || '', // e.g. 'chrome', 'firefox', 'edge', 'brave', 'opera'
  cookiesFile: process.env.COOKIES_FILE || '',
};
