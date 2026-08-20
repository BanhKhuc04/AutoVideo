import axios from 'axios';
import {
  ProcessVideoPayload,
  ProcessVideoResponse,
  VideoMetadata,
  RecordedClip,
} from '../types';

/**
 * Determine API Base URL dynamically:
 * - If user configured a custom backend URL in Settings, use it.
 * - If running on localhost, use '' (Vite proxy) or 'http://localhost:5000'.
 * - If running on Vercel / Cloud, use 'http://localhost:5000' (local backend) or custom URL.
 */
export function getApiBaseUrl(): string {
  const customUrl = localStorage.getItem('custom_backend_url');
  if (customUrl && customUrl.trim()) {
    return customUrl.trim().replace(/\/+$/, '');
  }

  // If running on localhost / 127.0.0.1, use relative path so Vite proxy forwards to backend
  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ) {
    return '';
  }

  // Default fallback when deployed on Vercel: connect to user's local server or remote backend
  return 'http://localhost:5000';
}

const apiClient = axios.create({
  timeout: 15 * 60 * 1000, // 15 mins for large videos
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach dynamic baseURL to all requests
apiClient.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();
  return config;
});

/**
 * Process video: download, cut segments, package ZIP (Option A)
 */
export async function processVideoApi(payload: ProcessVideoPayload): Promise<ProcessVideoResponse> {
  try {
    const response = await apiClient.post<ProcessVideoResponse>('/api/process-video', payload);
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.data) {
      const errData = error.response.data;
      const err: any = new Error(errData.error || 'Failed to process video');
      err.suggestBrowserCapture = errData.suggestBrowserCapture || false;
      throw err;
    }
    throw new Error(
      error.message || 'Không thể kết nối đến Backend Server (http://localhost:5000). Vui lòng đảm bảo backend đang chạy trên máy tính của bạn.'
    );
  }
}

/**
 * Process browser-recorded clips (Option B)
 */
export async function processBrowserClipsApi(
  videoTitle: string,
  recordedClips: RecordedClip[],
  outputFolder?: string
): Promise<ProcessVideoResponse> {
  try {
    const formData = new FormData();
    formData.append('videoTitle', videoTitle);
    if (outputFolder) formData.append('outputFolder', outputFolder);

    const metadata = recordedClips.map((c, idx) => ({
      index: idx + 1,
      name: c.name,
      start: c.start,
      end: c.end,
      durationSeconds: c.durationSeconds,
    }));
    formData.append('metadata', JSON.stringify(metadata));

    for (let i = 0; i < recordedClips.length; i++) {
      const clip = recordedClips[i];
      const filename = `${clip.name || `clip_${i + 1}`}.webm`;
      formData.append('clips', clip.blob, filename);
    }

    const response = await apiClient.post<ProcessVideoResponse>('/api/process-browser-clips', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (error: any) {
    if (error.response && error.response.data && error.response.data.error) {
      throw new Error(error.response.data.error);
    }
    throw new Error(error.message || 'Lỗi xử lý các đoạn video ghi hình.');
  }
}

/**
 * Fetch YouTube video info (title, duration, thumbnail)
 */
export async function getVideoInfoApi(url: string): Promise<VideoMetadata> {
  try {
    const response = await apiClient.get<{ success: boolean; metadata: VideoMetadata }>('/api/video-info', {
      params: { url },
      timeout: 15000,
    });
    return response.data.metadata;
  } catch (error: any) {
    if (error.response && error.response.data && error.response.data.error) {
      throw new Error(error.response.data.error);
    }
    throw new Error(error.message || 'Không thể lấy thông tin video YouTube');
  }
}

/**
 * Open local folder in Windows File Explorer
 */
export async function openLocalFolderApi(folderPath?: string): Promise<{ success: boolean; folderPath?: string }> {
  try {
    const response = await apiClient.post<{ success: boolean; folderPath?: string }>('/api/open-folder', {
      folderPath,
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.message || 'Không thể mở thư mục trên máy tính');
  }
}

/**
 * Construct direct download URL for job ZIP
 */
export function getDownloadUrl(jobId: string): string {
  const base = getApiBaseUrl();
  return `${base}/api/download/${jobId}`;
}

/**
 * Construct clip stream URL
 */
export function getClipStreamUrl(jobId: string, filename: string): string {
  const base = getApiBaseUrl();
  return `${base}/api/stream/${jobId}/${encodeURIComponent(filename)}`;
}

/**
 * Construct direct MP4 clip download URL
 */
export function getClipDownloadUrl(jobId: string, filename: string): string {
  const base = getApiBaseUrl();
  return `${base}/api/download-clip/${jobId}/${encodeURIComponent(filename)}`;
}

/**
 * Construct low-res preview stream URL for HTML5 player
 */
export function getPreviewVideoUrl(videoUrl: string): string {
  const base = getApiBaseUrl();
  return `${base}/api/preview-video?url=${encodeURIComponent(videoUrl)}`;
}

