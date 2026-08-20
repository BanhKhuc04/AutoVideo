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
 * Validates a segment start and end string, optionally checking against total video duration
 */
export function validateSegment(start: string, end: string, maxDurationSec?: number): string | null {
  if (!start.trim() && !end.trim()) {
    return 'Vui lòng nhập mốc bắt đầu và kết thúc';
  }
  if (!start.trim()) {
    return 'Vui lòng nhập mốc thời gian bắt đầu';
  }
  if (!end.trim()) {
    return 'Vui lòng nhập mốc thời gian kết thúc';
  }

  const startSec = timeStringToSeconds(start);
  const endSec = timeStringToSeconds(end);

  if (startSec === null) {
    return 'Mốc bắt đầu không hợp lệ (ví dụ: 00:01:30 hoặc 01:30)';
  }
  if (endSec === null) {
    return 'Mốc kết thúc không hợp lệ (ví dụ: 00:02:45 hoặc 02:45)';
  }
  if (startSec < 0) {
    return 'Mốc bắt đầu không được nhỏ hơn 0';
  }
  if (endSec <= startSec) {
    return `Mốc kết thúc (${end}) phải lớn hơn mốc bắt đầu (${start})`;
  }

  // Validate against video duration if available
  if (maxDurationSec && maxDurationSec > 0) {
    const maxTimeFormatted = secondsToTimeString(maxDurationSec);
    if (startSec >= maxDurationSec) {
      return `Mốc bắt đầu (${start}) vượt quá thời lượng video (${maxTimeFormatted})`;
    }
    if (endSec > maxDurationSec) {
      return `Mốc kết thúc (${end}) vượt quá thời lượng video (${maxTimeFormatted})`;
    }
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
