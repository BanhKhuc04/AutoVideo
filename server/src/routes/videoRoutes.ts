import { Router } from 'express';
import multer from 'multer';
import { videoController } from '../controllers/videoController';

const router = Router();

// Configure memory storage for uploaded browser clips
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB per clip limit
});

// ================= Video & Local Folder Routes =================
// Quick video metadata inspection
router.get('/video-info', (req, res) => videoController.getVideoInfo(req, res));

// Process video via yt-dlp + FFmpeg (Option A)
router.post('/process-video', (req, res, next) => videoController.processVideo(req, res, next));

// Process browser-recorded clips (Option B)
router.post('/process-browser-clips', upload.array('clips', 50), (req, res) =>
  videoController.processBrowserClips(req, res)
);

// Stream cut clip for browser preview (HTTP 206 Partial Content)
router.get('/stream/:jobId/:filename', (req, res) => videoController.streamClip(req, res));

// Direct download single MP4 clip (no zip required)
router.get('/download-clip/:jobId/:filename', (req, res) => videoController.downloadClip(req, res));

// Download result ZIP
router.get('/download/:jobId', (req, res, next) => videoController.downloadZip(req, res, next));

// Open output folder in Windows File Explorer
router.post('/open-folder', (req, res) => videoController.openFolder(req, res));

// Server health check
router.get('/health', (req, res) => videoController.getHealth(req, res));

export default router;
