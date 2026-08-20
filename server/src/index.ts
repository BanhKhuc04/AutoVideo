import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import videoRoutes from './routes/videoRoutes';
import { ensureDirSync, cleanupOldFiles } from './utils/cleanup';
import { youtubeDownloader } from './services/youtubeDownloader';
import { logger } from './utils/logger';

export const app = express();

// Enable CORS for client requests
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Ensure required working directories exist safely
try {
  ensureDirSync(config.tempDir);
  ensureDirSync(config.outputDir);
  ensureDirSync(config.clipsDir);
  if (config.binDir && !config.binDir.includes('app.asar')) {
    ensureDirSync(config.binDir);
  }
} catch (err: any) {
  logger.warn(`Storage directory initialization notice: ${err.message}`);
}

// Mount API routes
app.use('/api', videoRoutes);

// Static client files (for Production / Electron desktop app)
const potentialClientPaths = [
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(__dirname, '../client/dist'),
  path.resolve(__dirname, './client/dist'),
  (process as any).resourcesPath ? path.join((process as any).resourcesPath, 'client/dist') : '',
  (process as any).resourcesPath ? path.join((process as any).resourcesPath, 'app.asar/client/dist') : '',
].filter(Boolean);

const clientDist = potentialClientPaths.find((p) => {
  try {
    return fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html'));
  } catch {
    return false;
  }
});

if (clientDist) {
  logger.info(`Serving static client from: ${clientDist}`);
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  // Root route info for API-only mode
  app.get('/', (req, res) => {
    res.json({
      name: 'YouTube Batch Video Cutter API',
      version: '1.0.0',
      status: 'online',
      endpoints: {
        processVideo: 'POST /api/process-video',
        download: 'GET /api/download/:jobId',
        health: 'GET /api/health',
      },
    });
  });
}

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

// Start periodic temp files cleanup (every 30 minutes, removing files older than 2 hours)
setInterval(() => {
  cleanupOldFiles(config.tempDir);
  cleanupOldFiles(config.outputDir);
}, 30 * 60 * 1000);

let serverInstance: any = null;

export function startServer(port: number = config.port): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      serverInstance = app.listen(port, async () => {
        logger.info(`================================================`);
        logger.info(`🚀 YouTube Video Cutter Server running on port ${port}`);
        logger.info(`   Environment : ${config.nodeEnv}`);
        logger.info(`   Temp Dir    : ${config.tempDir}`);
        logger.info(`   Output Dir  : ${config.outputDir}`);
        logger.info(`   Bin Dir     : ${config.binDir}`);
        logger.info(`================================================`);

        // Pre-check / initialize yt-dlp binary in background
        try {
          const binPath = await youtubeDownloader.ensureBinary();
          logger.info(`[Startup] yt-dlp is ready at: ${binPath}`);
        } catch (err: any) {
          logger.warn(`[Startup] yt-dlp binary auto-initialization will retry on first request: ${err.message}`);
        }

        resolve(serverInstance);
      });

      serverInstance.on('error', (err: any) => {
        logger.error('Server listen error:', err);
        // If port is in use, resolve anyway as it means server is already running
        if (err.code === 'EADDRINUSE') {
          logger.warn(`Port ${port} is already in use. Assuming server is already running.`);
          resolve(null);
        } else {
          reject(err);
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}

export function stopServer(): Promise<void> {
  return new Promise((resolve) => {
    if (serverInstance) {
      serverInstance.close(() => {
        logger.info('Server stopped gracefully.');
        resolve();
      });
    } else {
      resolve();
    }
  });
}

// Auto-start if executed directly (e.g. `npm run dev` in server)
if (require.main === module) {
  startServer(config.port).catch((err) => {
    logger.error('Failed to start server:', err);
  });
}
