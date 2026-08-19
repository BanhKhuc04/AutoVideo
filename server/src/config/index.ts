import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

const ROOT_DIR = path.resolve(__dirname, '../..');

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Custom binary paths if specified
  ytDlpPath: process.env.YT_DLP_PATH || '',
  ffmpegPath: process.env.FFMPEG_PATH || '',

  // Storage directories
  tempDir: path.resolve(ROOT_DIR, process.env.TEMP_DIR || './temp'),
  outputDir: path.resolve(ROOT_DIR, process.env.OUTPUT_DIR || './output'),
  clipsDir: path.resolve(ROOT_DIR, process.env.CLIPS_DIR || './output/clips'),
  binDir: path.resolve(ROOT_DIR, process.env.BIN_DIR || './bin'),

  // YouTube Download & Cookies Settings
  browser: process.env.BROWSER || '', // e.g. 'chrome', 'firefox', 'edge', 'brave', 'opera'
  cookiesFile: process.env.COOKIES_FILE || '',

  // Google Drive OAuth 2.0 Credentials
  googleDrive: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/drive/callback',
  },
};

