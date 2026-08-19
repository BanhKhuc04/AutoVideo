/**
 * Converts a time string (HH:MM:SS, MM:SS, or seconds) into seconds
 */
export function timeStringToSeconds(timeStr: string): number | null {
  if (!timeStr || typeof timeStr !== 'string') return null;

  const trimmed = timeStr.trim();
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const s = parseFloat(trimmed);
    return isNaN(s) ? null : s;
  }

  const parts = trimmed.split(':').map((p) => parseFloat(p));
  if (parts.some((p) => isNaN(p) || p < 0)) {
    return null;
  }

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  } else if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  } else if (parts.length === 1) {
    return parts[0];
  }

  return null;
}

/**
 * Formats total seconds into HH:MM:SS string
 */
export function secondsToTimeString(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) return '00:00:00';
  const rounded = Math.floor(totalSeconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const seconds = rounded % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Validates a segment start and end string
 */
export function validateSegment(start: string, end: string): string | null {
  if (!start.trim() && !end.trim()) {
    return 'Start and end times are required';
  }
  if (!start.trim()) {
    return 'Start time is required';
  }
  if (!end.trim()) {
    return 'End time is required';
  }

  const startSec = timeStringToSeconds(start);
  const endSec = timeStringToSeconds(end);

  if (startSec === null) {
    return 'Invalid start time (use 00:04:34 or 04:34)';
  }
  if (endSec === null) {
    return 'Invalid end time (use 00:05:12 or 05:12)';
  }
  if (startSec < 0) {
    return 'Start time cannot be negative';
  }
  if (endSec <= startSec) {
    return `End time (${end}) must be greater than Start time (${start})`;
  }

  return null;
}

/**
 * Validates a YouTube URL
 */
export function isValidYoutubeUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const youtubeRegex =
    /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)[\w-]{11}(\S*)?$/;
  return youtubeRegex.test(url.trim());
}

/**
 * Format bytes to readable size
 */
export function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
