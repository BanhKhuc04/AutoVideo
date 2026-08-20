import React, { useState } from 'react';
import { Segment, VideoMetadata } from '../types';
import { timeStringToSeconds, secondsToTimeString } from '../utils/timeValidator';

interface VideoPlayerPreviewProps {
  videoUrl: string;
  metadata: VideoMetadata | null;
  segments: Segment[];
  onAddMarkerAtTime?: (timeSec: number) => void;
  onSetSegmentTime?: (type: 'start' | 'end', timeSec: number) => void;
}

// Marker palette colors
const MARKER_COLORS = [
  '#0d6efd', // Blue
  '#198754', // Green
  '#ffc107', // Yellow
  '#0dcaf0', // Cyan
  '#d63384', // Pink
  '#fd7e14', // Orange
  '#6f42c1', // Purple
  '#20c997', // Teal
];

export const VideoPlayerPreview: React.FC<VideoPlayerPreviewProps> = ({
  videoUrl,
  metadata,
  segments,
  onAddMarkerAtTime,
  onSetSegmentTime,
}) => {
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0);
  const [hoverTimeSec, setHoverTimeSec] = useState<number | null>(null);

  // Extract YouTube Video ID from URL
  const extractVideoId = (url: string): string | null => {
    if (!url) return null;
    const match = url.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/
    );
    return match ? match[1] : null;
  };

  const videoId = extractVideoId(videoUrl);
  const totalDuration = metadata?.duration || 0;

  const handleOpenExternal = (e: React.MouseEvent) => {
    e.preventDefault();
    const fullUrl = `https://www.youtube.com/watch?v=${videoId}`;
    if ((window as any).electronAPI?.openExternal) {
      (window as any).electronAPI.openExternal(fullUrl);
    } else {
      window.open(fullUrl, '_blank');
    }
  };

  // Calculate marker positions
  const markers = segments.map((seg, idx) => {
    const startSec = timeStringToSeconds(seg.start) || 0;
    const endSec = timeStringToSeconds(seg.end) || 0;
    const duration = Math.max(0, endSec - startSec);
    const color = MARKER_COLORS[idx % MARKER_COLORS.length];

    const leftPercent = totalDuration > 0 ? (startSec / totalDuration) * 100 : 0;
    const widthPercent =
      totalDuration > 0
        ? Math.min(100 - leftPercent, (duration / totalDuration) * 100)
        : 0;

    return {
      index: idx + 1,
      id: seg.id,
      name: seg.name || `Đoạn ${idx + 1}`,
      startSec,
      endSec,
      startStr: seg.start,
      endStr: seg.end,
      duration,
      color,
      leftPercent: Math.max(0, Math.min(100, leftPercent)),
      widthPercent: Math.max(0.5, Math.min(100, widthPercent)),
    };
  });

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (totalDuration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, clickX / rect.width));
    const targetSec = Math.round(fraction * totalDuration);
    setCurrentTimeSec(targetSec);
  };

  const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (totalDuration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const hoverX = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, hoverX / rect.width));
    setHoverTimeSec(Math.round(fraction * totalDuration));
  };

  if (!videoId) return null;

  return (
    <div className="card shadow-sm border-0 mb-4 bg-dark-subtle overflow-hidden">
      <div className="card-header bg-body-tertiary border-secondary-subtle py-3 px-4 d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <i className="bi bi-display fs-5 text-danger"></i>
          <h5 className="mb-0 fw-bold text-white">Xem Trước Video &amp; Thanh Thời Gian (Timeline)</h5>
        </div>
        <div className="d-flex align-items-center gap-2">
          {metadata && (
            <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle font-monospace">
              <i className="bi bi-clock-history me-1"></i> {secondsToTimeString(totalDuration)}
            </span>
          )}
          <button
            type="button"
            className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1"
            onClick={handleOpenExternal}
            title="Mở video này trên trình duyệt Chrome/Edge để xem mốc thời gian"
          >
            <i className="bi bi-box-arrow-up-right"></i>
            <span>Mở trên YouTube</span>
          </button>
        </div>
      </div>

      <div className="card-body p-4">
        {/* Video Title & Uploader info */}
        {metadata && (
          <div className="mb-3 p-3 bg-body-tertiary rounded-3 border border-secondary-subtle d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div className="d-flex align-items-center gap-3">
              {metadata.thumbnail && (
                <img
                  src={metadata.thumbnail}
                  alt={metadata.title}
                  className="rounded object-fit-cover shadow-sm"
                  style={{ width: '80px', height: '48px' }}
                />
              )}
              <div>
                <h6 className="fw-bold text-white mb-1 text-truncate" style={{ maxWidth: '540px' }}>
                  {metadata.title}
                </h6>
                {metadata.uploader && (
                  <small className="text-secondary d-flex align-items-center gap-1">
                    <i className="bi bi-person-circle"></i> Kênh: {metadata.uploader} &bull; Tổng thời lượng: <strong className="text-warning">{secondsToTimeString(totalDuration)}</strong>
                  </small>
                )}
              </div>
            </div>
            <div className="text-secondary small font-monospace bg-dark px-3 py-2 rounded border border-secondary-subtle">
              Vị trí đang chọn: <strong className="text-warning fs-6">{secondsToTimeString(currentTimeSec)}</strong>
            </div>
          </div>
        )}

        {/* YouTube Video Player Embed */}
        <div
          className="ratio ratio-16x9 rounded-3 overflow-hidden shadow mb-3 bg-black position-relative"
          style={{ maxHeight: '420px' }}
        >
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=http://localhost:5000&rel=0`}
            title={metadata?.title || 'Trình phát video YouTube'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          ></iframe>
        </div>

        {/* Interactive Visual Timeline Section */}
        <div className="bg-body-tertiary p-3 rounded-3 border border-secondary-subtle mb-3">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <label className="form-label small fw-bold text-secondary mb-0 d-flex align-items-center gap-2">
              <i className="bi bi-soundwave text-primary"></i>
              <span>Thanh thước mốc thời gian ({markers.length} đoạn đã chọn)</span>
            </label>
            <span className="small text-secondary" style={{ fontSize: '0.75rem' }}>
              💡 Nhấp chuột vào thanh thước để tua nhanh đến giây bất kỳ
            </span>
          </div>

          {/* Timeline Bar Track */}
          <div
            className="position-relative bg-dark rounded border border-secondary-subtle"
            style={{ height: '38px', cursor: 'pointer', userSelect: 'none' }}
            onClick={handleTimelineClick}
            onMouseMove={handleTimelineMouseMove}
            onMouseLeave={() => setHoverTimeSec(null)}
          >
            {/* Visual Markers */}
            {markers.map((m) => (
              <div
                key={m.id}
                className="position-absolute top-0 bottom-0 rounded d-flex align-items-center justify-content-center shadow-sm"
                style={{
                  left: `${m.leftPercent}%`,
                  width: `${m.widthPercent}%`,
                  backgroundColor: m.color,
                  opacity: 0.85,
                  zIndex: 2,
                  transition: 'left 0.2s, width 0.2s',
                  minWidth: '8px',
                }}
                title={`${m.name}: ${m.startStr} - ${m.endStr} (${m.duration}s)`}
              >
                {m.widthPercent > 12 && (
                  <span
                    className="badge text-white px-1 text-truncate font-monospace"
                    style={{ fontSize: '0.7rem', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                  >
                    {m.name} ({m.duration}s)
                  </span>
                )}
              </div>
            ))}

            {/* Current Playhead Scrubber Pin */}
            {totalDuration > 0 && (
              <div
                className="position-absolute top-0 bottom-0 bg-warning"
                style={{
                  left: `${(currentTimeSec / totalDuration) * 100}%`,
                  width: '3px',
                  zIndex: 4,
                  pointerEvents: 'none',
                }}
              >
                <div
                  className="position-absolute bg-warning text-dark px-1 rounded-pill font-monospace fw-bold shadow"
                  style={{
                    top: '-18px',
                    left: '-18px',
                    fontSize: '0.65rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {secondsToTimeString(currentTimeSec)}
                </div>
              </div>
            )}

            {/* Hover Indicator */}
            {hoverTimeSec !== null && totalDuration > 0 && (
              <div
                className="position-absolute top-0 bottom-0 bg-light opacity-50"
                style={{
                  left: `${(hoverTimeSec / totalDuration) * 100}%`,
                  width: '1px',
                  zIndex: 3,
                  pointerEvents: 'none',
                }}
              ></div>
            )}
          </div>

          {/* Timeline Scale Ruler */}
          <div className="d-flex justify-content-between text-secondary small font-monospace mt-1" style={{ fontSize: '0.75rem' }}>
            <span>00:00:00</span>
            {totalDuration > 0 && <span>{secondsToTimeString(totalDuration / 2)}</span>}
            <span>{secondsToTimeString(totalDuration)}</span>
          </div>

          {/* Quick Marker Action Buttons */}
          <div className="d-flex flex-wrap gap-2 mt-3 pt-2 border-top border-secondary-subtle">
            <button
              type="button"
              className="btn btn-outline-success btn-sm d-flex align-items-center gap-1"
              onClick={() => onSetSegmentTime?.('start', currentTimeSec)}
              title="Đặt mốc bắt đầu của đoạn cuối cùng bằng vị trí đang xem"
            >
              <i className="bi bi-play-circle me-1"></i>
              <span>Đặt mốc bắt đầu:</span>
              <code className="text-success">{secondsToTimeString(currentTimeSec)}</code>
            </button>

            <button
              type="button"
              className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1"
              onClick={() => onSetSegmentTime?.('end', currentTimeSec)}
              title="Đặt mốc kết thúc của đoạn cuối cùng bằng vị trí đang xem"
            >
              <i className="bi bi-stop-circle me-1"></i>
              <span>Đặt mốc kết thúc:</span>
              <code className="text-danger">{secondsToTimeString(currentTimeSec)}</code>
            </button>

            <button
              type="button"
              className="btn btn-primary btn-sm d-flex align-items-center gap-1 ms-auto shadow-sm"
              onClick={() => onAddMarkerAtTime?.(currentTimeSec)}
              title="Tạo ngay một đoạn video 30 giây bắt đầu từ vị trí phát hiện tại"
            >
              <i className="bi bi-plus-circle-fill me-1"></i>
              <span>+ Thêm đoạn 30s tại đây</span>
            </button>
          </div>
        </div>

        {/* Legend of Active Markers */}
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <span className="small text-secondary fw-semibold">Các đoạn đang chọn:</span>
          {markers.map((m) => (
            <span
              key={m.id}
              className="badge d-flex align-items-center gap-1 text-white border shadow-sm"
              style={{ backgroundColor: m.color, borderColor: 'rgba(255,255,255,0.2)' }}
            >
              <i className="bi bi-bookmark-fill" style={{ fontSize: '0.65rem' }}></i>
              <span>{m.name}</span>:
              <span className="font-monospace">
                {m.startStr || '00:00:00'} &rarr; {m.endStr || '00:00:00'}
              </span>
              <span className="ms-1 opacity-75">({m.duration}s)</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
