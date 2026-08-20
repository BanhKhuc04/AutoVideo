import axios from 'axios';
import {
  ProcessVideoPayload,
  ProcessVideoResponse,
  VideoMetadata,
} from '../types';

/**
 * Determine API Base URL dynamically
 */
export function getApiBaseUrl(): string {
  const customUrl = localStorage.getItem('custom_backend_url');
  if (customUrl && customUrl.trim()) {
    return customUrl.trim().replace(/\/+$/, '');
  }

  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ) {
    return '';
  }

  return 'http://localhost:5000';
}

const apiClient = axios.create({
  timeout: 15 * 60 * 1000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();
  return config;
});

/**
 * Process video: download, cut segments, save MP4s
 */
export async function processVideoApi(payload: ProcessVideoPayload): Promise<ProcessVideoResponse> {
  try {
    const response = await apiClient.post<ProcessVideoResponse>('/api/process-video', payload);
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.data) {
      const errData = error.response.data;
      throw new Error(errData.error || 'Không thể xử lý video.');
    }
    throw new Error(
      error.message || 'Không thể kết nối đến máy chủ. Vui lòng đảm bảo ứng dụng đang chạy.'
    );
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
    throw new Error(error.message || 'Không thể lấy thông tin video.');
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
    throw new Error(error.message || 'Không thể mở thư mục.');
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
