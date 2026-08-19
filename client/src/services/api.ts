import axios from 'axios';
import {
  ProcessVideoPayload,
  ProcessVideoResponse,
  VideoMetadata,
  RecordedClip,
} from '../types';

const apiClient = axios.create({
  baseURL: '', // Vite proxy forwards /api to backend :5000
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15 * 60 * 1000, // 15 mins for large videos
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
    throw new Error(error.message || 'Failed to connect to backend server');
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
    throw new Error(error.message || 'Failed to process browser recorded clips');
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
    throw new Error(error.message || 'Failed to fetch video information');
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
  return `/api/download/${jobId}`;
}

/**
 * Construct clip stream URL
 */
export function getClipStreamUrl(jobId: string, filename: string): string {
  return `/api/stream/${jobId}/${filename}`;
}

/**
 * Construct direct MP4 clip download URL
 */
export function getClipDownloadUrl(jobId: string, filename: string): string {
  return `/api/download-clip/${jobId}/${encodeURIComponent(filename)}`;
}
