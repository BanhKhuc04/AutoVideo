/**
 * Converts a time string (HH:MM:SS, MM:SS, or seconds) into total seconds.
 * Example:
 *  - "00:04:34" -> 274
 *  - "04:34" -> 274
 *  - "45" -> 45
 */
export function timeStringToSeconds(timeStr: string): number {
  if (!timeStr || typeof timeStr !== 'string') {
    throw new Error(`Invalid time string: ${timeStr}`);
  }

  const trimmed = timeStr.trim();

  // If it's pure digits or floating number
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return parseFloat(trimmed);
  }

  const parts = trimmed.split(':').map((p) => parseFloat(p));
  if (parts.some((p) => isNaN(p) || p < 0)) {
    throw new Error(`Invalid time format: "${timeStr}". Must be HH:MM:SS, MM:SS, or seconds.`);
  }

  if (parts.length === 3) {
    // HH:MM:SS
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  } else if (parts.length === 2) {
    // MM:SS
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  } else if (parts.length === 1) {
    return parts[0];
  } else {
    throw new Error(`Invalid time format: "${timeStr}". Too many colons.`);
  }
}

/**
 * Formats total seconds into HH:MM:SS format
 */
export function secondsToTimeString(totalSeconds: number): string {
  const rounded = Math.floor(totalSeconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const seconds = rounded % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export interface VideoSegment {
  id?: string;
  name?: string;
  start: string;
  end: string;
}

export interface ParsedSegment {
  index: number;
  id?: string;
  name: string;
  startStr: string;
  endStr: string;
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;
  outputFilename: string;
}

/**
 * Sanitizes a string for use in safe filenames
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[^\w\s-]/gi, '')
    .trim()
    .replace(/\s+/g, '_')
    .substring(0, 60);
}

/**
 * Validates and normalizes an array of segments with automatic 001, 002 naming
 */
export function validateAndParseSegments(
  segments: VideoSegment[],
  videoTitle?: string
): ParsedSegment[] {
  if (!Array.isArray(segments) || segments.length === 0) {
    throw new Error('Cần ít nhất một đoạn video để xử lý.');
  }

  const prefix = videoTitle ? sanitizeFilename(videoTitle) : '';
  const usedFilenames = new Set<string>();

  return segments.map((seg, idx) => {
    if (!seg.start || !seg.end) {
      throw new Error(`Đoạn #${idx + 1} phải có cả thời gian bắt đầu và kết thúc.`);
    }

    const startSeconds = timeStringToSeconds(seg.start);
    const endSeconds = timeStringToSeconds(seg.end);

    if (startSeconds < 0) {
      throw new Error(`Đoạn #${idx + 1}: Thời gian bắt đầu không được âm.`);
    }

    if (endSeconds <= startSeconds) {
      throw new Error(
        `Đoạn #${idx + 1}: Thời gian kết thúc (${seg.end} = ${endSeconds}s) phải lớn hơn thời gian bắt đầu (${seg.start} = ${startSeconds}s).`
      );
    }

    const durationSeconds = endSeconds - startSeconds;
    // 3-digit clip index: 001, 002, 003...
    const clipNumber = (idx + 1).toString().padStart(3, '0');
    const customName = seg.name ? sanitizeFilename(seg.name) : '';

    // Automatic naming format: [VideoTitle]_[001]_[customName].mp4 or [VideoTitle]_[001].mp4 or clip_001.mp4
    let baseName = '';
    if (prefix && customName) {
      baseName = `${prefix}_${clipNumber}_${customName}`;
    } else if (prefix) {
      baseName = `${prefix}_${clipNumber}`;
    } else if (customName) {
      baseName = `${clipNumber}_${customName}`;
    } else {
      baseName = `clip_${clipNumber}`;
    }

    let outputFilename = `${baseName}.mp4`;
    let version = 2;
    while (usedFilenames.has(outputFilename)) {
      outputFilename = `${baseName}_v${version}.mp4`;
      version++;
    }
    usedFilenames.add(outputFilename);

    return {
      index: idx + 1,
      id: seg.id,
      name: seg.name || `Đoạn ${clipNumber}`,
      startStr: seg.start.trim(),
      endStr: seg.end.trim(),
      startSeconds,
      endSeconds,
      durationSeconds,
      outputFilename,
    };
  });
}
