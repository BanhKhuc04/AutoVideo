import express from 'express';
import cors from 'cors';
import { config } from './config';
import videoRoutes from './routes/videoRoutes';
import { ensureDirSync, cleanupOldFiles } from './utils/cleanup';
import { youtubeDownloader } from './services/youtubeDownloader';
import { logger } from './utils/logger';

const app = express();

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

// Ensure required working directories exist
ensureDirSync(config.tempDir);
ensureDirSync(config.outputDir);
ensureDirSync(config.binDir);

// Mount API routes
app.use('/api', videoRoutes);

// Root route info
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

// Start server
app.listen(config.port, async () => {
  logger.info(`================================================`);
  logger.info(`🚀 YouTube Video Cutter Server running on port ${config.port}`);
  logger.info(`   Environment : ${config.nodeEnv}`);
  logger.info(`   Temp Dir    : ${config.tempDir}`);
  logger.info(`   Output Dir  : ${config.outputDir}`);
  logger.info(`================================================`);

  // Pre-check / initialize yt-dlp binary in background
  try {
    const binPath = await youtubeDownloader.ensureBinary();
    logger.info(`[Startup] yt-dlp is ready at: ${binPath}`);
  } catch (err: any) {
    logger.warn(`[Startup] yt-dlp binary auto-initialization will retry on first request: ${err.message}`);
  }
});
