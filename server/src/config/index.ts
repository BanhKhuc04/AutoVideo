import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Load environment variables from .env file
dotenv.config();

const ROOT_DIR = path.resolve(__dirname, '../..');

/**
 * Resolves directory containing bundled binaries (yt-dlp, ffmpeg)
 * Checks Electron packaged resources, portable directory, local server/bin, and project bin
 */
function resolveBinDir(): string {
  if (process.env.BIN_DIR && fs.existsSync(process.env.BIN_DIR)) {
    return process.env.BIN_DIR;
  }

  // 1. Electron packaged app: process.resourcesPath/bin
  if ((process as any).resourcesPath) {
    const electronBin = path.join((process as any).resourcesPath, 'bin');
    if (fs.existsSync(electronBin)) return electronBin;
  }

  // 2. Portable unpacked directory next to exe: <exe_dir>/resources/bin
  try {
    if (process.execPath && !process.execPath.toLowerCase().includes('node')) {
      const exeDir = path.dirname(process.execPath);
      const portableBin = path.join(exeDir, 'resources', 'bin');
      if (fs.existsSync(portableBin)) return portableBin;
    }
  } catch {}

  // 3. Local server bin: server/bin
  const localServerBin = path.resolve(ROOT_DIR, './bin');
  if (fs.existsSync(localServerBin)) return localServerBin;

  // 4. Project root bin: ../server/bin or ./bin
  const projectRootBin = path.resolve(ROOT_DIR, '../server/bin');
  if (fs.existsSync(projectRootBin)) return projectRootBin;

  const rootBin = path.resolve(__dirname, '../../server/bin');
  if (fs.existsSync(rootBin)) return rootBin;

  return localServerBin;
}

/**
 * Resolves exact binary executable path for yt-dlp and ffmpeg
 */
function resolveBinary(binName: string): string {
  const isWindows = os.platform() === 'win32';
  const fullBinName = isWindows && !binName.endsWith('.exe') ? `${binName}.exe` : binName;

  // 1. Custom ENV override
  if (binName === 'ffmpeg' && process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }
  if (binName === 'yt-dlp' && process.env.YT_DLP_PATH && fs.existsSync(process.env.YT_DLP_PATH)) {
    return process.env.YT_DLP_PATH;
  }

  // 2. Electron packaged app: process.resourcesPath/bin/<binName>
  if ((process as any).resourcesPath) {
    const electronBin = path.join((process as any).resourcesPath, 'bin', fullBinName);
    if (fs.existsSync(electronBin)) return electronBin;
  }

  // 3. Portable directory next to exe: <exeDir>/resources/bin/<binName>
  try {
    if (process.execPath && !process.execPath.toLowerCase().includes('node')) {
      const exeDir = path.dirname(process.execPath);
      const portableBin = path.join(exeDir, 'resources', 'bin', fullBinName);
      if (fs.existsSync(portableBin)) return portableBin;
    }
  } catch {}

  // 4. Resolved binDir
  const binDir = resolveBinDir();
  const directBin = path.join(binDir, fullBinName);
  if (fs.existsSync(directBin)) return directBin;

  // 5. Local project server/bin
  const localServerBin = path.resolve(ROOT_DIR, './bin', fullBinName);
  if (fs.existsSync(localServerBin)) return localServerBin;

  const projectRootBin = path.resolve(ROOT_DIR, '../server/bin', fullBinName);
  if (fs.existsSync(projectRootBin)) return projectRootBin;

  const rootBin = path.resolve(__dirname, '../../server/bin', fullBinName);
  if (fs.existsSync(rootBin)) return rootBin;

  return directBin;
}

/**
 * Helper to resolve working storage directories (temp, output, clips, logs)
 */
function resolveStorageDir(customEnv: string | undefined, defaultFolder: string): string {
  if (customEnv) return path.resolve(customEnv);

  const isPackaged = Boolean((process as any).resourcesPath) || process.env.NODE_ENV === 'production';

  if (isPackaged) {
    // 1. Try portable data directory next to exe if writable
    try {
      if (process.execPath && !process.execPath.toLowerCase().includes('node')) {
        const exeDir = path.dirname(process.execPath);
        const targetDir = defaultFolder === 'logs'
          ? path.join(exeDir, 'logs')
          : path.join(exeDir, 'data', defaultFolder);
        return targetDir;
      }
    } catch {}

    // 2. Fallback to user's AppData
    const userData = process.env.APPDATA || os.homedir();
    return path.join(userData, 'YouTubeClipStudio', defaultFolder);
  }

  return path.resolve(ROOT_DIR, `./${defaultFolder}`);
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'production',

  // Resolved binary directory & executable paths
  binDir: resolveBinDir(),
  ffmpegPath: resolveBinary('ffmpeg'),
  ytDlpPath: resolveBinary('yt-dlp'),

  // Storage directories
  tempDir: resolveStorageDir(process.env.TEMP_DIR, 'temp'),
  outputDir: resolveStorageDir(process.env.OUTPUT_DIR, 'output'),
  clipsDir: resolveStorageDir(process.env.CLIPS_DIR, 'output/clips'),
  logsDir: resolveStorageDir(process.env.LOGS_DIR, 'logs'),

  // YouTube Download & Cookies Settings
  browser: process.env.BROWSER || '', // e.g. 'chrome', 'firefox', 'edge', 'brave', 'opera'
  cookiesFile: process.env.COOKIES_FILE || '',
};
