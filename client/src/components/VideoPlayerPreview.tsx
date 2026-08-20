import React, { useState, useRef, useEffect } from 'react';
import { Play, ExternalLink, Plus, Clock, AlertCircle, Eye, Image } from 'lucide-react';
import { Segment, VideoMetadata } from '../types';
import { timeStringToSeconds, secondsToTimeString } from '../utils/timeValidator';
import { getPreviewVideoUrl } from '../services/api';

interface VideoPlayerPreviewProps {
  videoUrl: string;
  metadata: VideoMetadata | null;
  segments: Segment[];
  onAddMarkerAtTime?: (timeSec: number) => void;
  onSetSegmentTime?: (type: 'start' | 'end', timeSec: number) => void;
}

const MARKER_COLORS = [
  '#0A84FF', // Apple Blue
  '#30D158', // Apple Green
  '#FF9F0A', // Apple Orange
  '#BF5AF2', // Apple Purple
  '#64D2FF', // Apple Cyan
  '#FF375F', // Apple Pink
  '#FFD60A', // Apple Yellow
  '#5E5CE6', // Apple Indigo
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
  const [showHtml5Player, setShowHtml5Player] = useState<boolean>(false);
  const [isLoadingPreviewVideo, setIsLoadingPreviewVideo] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  const extractVideoId = (url: string): string | null => {
    if (!url) return null;
    const match = url.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/
    );
    return match ? match[1] : null;
  };

  const videoId = extractVideoId(videoUrl);
  const totalDuration = metadata?.duration || 0;

  useEffect(() => {
    setShowHtml5Player(false);
    setIsLoadingPreviewVideo(false);
    setPreviewError(null);
    setCurrentTimeSec(0);
  }, [videoUrl]);

  const handleOpenExternal = (e: React.MouseEvent) => {
    e.preventDefault();
    const fullUrl = videoUrl.startsWith('http') ? videoUrl : `https://www.youtube.com/watch?v=${videoId}`;
    if ((window as any).electronAPI?.openExternal) {
      (window as any).electronAPI.openExternal(fullUrl);
    } else {
      window.open(fullUrl, '_blank');
    }
  };

  const handleLoadHtml5Preview = () => {
    setShowHtml5Player(true);
    setIsLoadingPreviewVideo(true);
    setPreviewError(null);
  };

  const handleVideoTimeUpdate = () => {
    if (videoElementRef.current) {
      setCurrentTimeSec(Math.round(videoElementRef.current.currentTime));
    }
  };

  const handleVideoLoaded = () => {
    setIsLoadingPreviewVideo(false);
  };

  const handleVideoError = () => {
    setIsLoadingPreviewVideo(false);
    setPreviewError('Không thể tải bản xem trước cục bộ. Bạn vẫn có thể nhập mốc giờ để cắt video.');
  };

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

    if (videoElementRef.current && showHtml5Player) {
      videoElementRef.current.currentTime = targetSec;
    }
  };

  const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (totalDuration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const hoverX = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, hoverX / rect.width));
    setHoverTimeSec(Math.round(fraction * totalDuration));
  };

  if (!videoId && !videoUrl) return null;

  const thumbnailSrc =
    metadata?.thumbnail ||
    (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '');

  return (
    <div className="apple-card p-4 mb-4">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <span className="fw-semibold text-white" style={{ fontSize: '0.92rem' }}>
            Xem trước &amp; Mốc thời gian
          </span>
          {totalDuration > 0 && (
            <span className="apple-pill font-monospace" style={{ fontSize: '0.72rem' }}>
              <Clock size={12} />
              <span>{secondsToTimeString(totalDuration)}</span>
            </span>
          )}
        </div>

        <div className="d-flex align-items-center gap-2">
          {!showHtml5Player ? (
            <button
              type="button"
              className="apple-btn-secondary"
              style={{ padding: '5px 12px', fontSize: '0.78rem' }}
              onClick={handleLoadHtml5Preview}
              title="Phát xem trước video trong App"
            >
              <Eye size={14} strokeWidth={1.8} />
              <span>Xem trước trong App</span>
            </button>
          ) : (
            <button
              type="button"
              className="apple-btn-secondary"
              style={{ padding: '5px 12px', fontSize: '0.78rem' }}
              onClick={() => setShowHtml5Player(false)}
            >
              <Image size={14} strokeWidth={1.8} />
              <span>Hiện ảnh bìa</span>
            </button>
          )}

          <div className="apple-pill font-monospace" style={{ background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }}>
            Vị trí: <strong className="text-warning ms-1">{secondsToTimeString(currentTimeSec)}</strong>
          </div>
        </div>
      </div>

      {/* Video Display: Native HTML5 Player or Interactive Thumbnail */}
      <div
        className="ratio ratio-16x9 rounded-3 overflow-hidden mb-3 bg-black border position-relative"
        style={{ borderColor: 'var(--border-subtle)', maxHeight: '380px' }}
      >
        {showHtml5Player ? (
          <div className="w-100 h-100 position-absolute top-0 start-0 d-flex flex-column align-items-center justify-content-center bg-black">
            {isLoadingPreviewVideo && (
              <div className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center bg-black bg-opacity-75 z-3 text-white">
                <div className="spinner-border text-primary mb-2" role="status" style={{ width: '28px', height: '28px' }}></div>
                <small style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Đang tải video xem trước...</small>
              </div>
            )}
            {previewError ? (
              <div className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center p-4 text-center z-2" style={{ background: 'var(--bg-surface-1)' }}>
                <AlertCircle size={28} className="text-warning mb-2" />
                <p className="mb-3" style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: '380px' }}>
                  {previewError}
                </p>
                <button
                  type="button"
                  className="apple-btn-secondary"
                  onClick={handleOpenExternal}
                >
                  <ExternalLink size={14} />
                  <span>Mở video trên YouTube</span>
                </button>
              </div>
            ) : (
              <video
                ref={videoElementRef}
                src={getPreviewVideoUrl(videoUrl)}
                controls
                className="w-100 h-100 object-fit-contain"
                onTimeUpdate={handleVideoTimeUpdate}
                onLoadedData={handleVideoLoaded}
                onError={handleVideoError}
                autoPlay
              />
            )}
          </div>
        ) : (
          <div className="w-100 h-100 position-absolute top-0 start-0 d-flex align-items-center justify-content-center overflow-hidden">
            {thumbnailSrc ? (
              <img
                src={thumbnailSrc}
                alt={metadata?.title || 'YouTube Thumbnail'}
                className="w-100 h-100 object-fit-cover opacity-60"
              />
            ) : (
              <div className="w-100 h-100 d-flex align-items-center justify-content-center" style={{ background: 'var(--bg-surface-2)' }}>
                <Eye size={36} style={{ color: 'var(--text-tertiary)' }} />
              </div>
            )}
            <div className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center p-4 text-center" style={{ background: 'rgba(11, 12, 14, 0.45)' }}>
              <button
                type="button"
                className="apple-btn-primary rounded-circle p-0 mb-3 shadow-lg d-flex align-items-center justify-content-center"
                style={{ width: '56px', height: '56px', borderRadius: '50%' }}
                onClick={handleLoadHtml5Preview}
                title="Phát xem trước video trong App"
              >
                <Play size={24} fill="#ffffff" strokeWidth={0} className="ms-1" />
              </button>
              <div className="text-white fw-medium mb-1" style={{ fontSize: '0.88rem', maxWidth: '420px' }}>
                {metadata?.title || 'Video YouTube'}
              </div>
              <div className="small" style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                Nhấn để phát xem trước hoặc chọn mốc thời gian trên thanh thước bên dưới
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Visual Timeline Section */}
      <div className="apple-card-inner p-3 mb-3">
        {/* Timeline Bar Track */}
        <div
          className="position-relative rounded-3"
          style={{ height: '34px', background: 'var(--bg-surface-1)', border: '1px solid var(--border-subtle)', cursor: 'pointer', userSelect: 'none' }}
          onClick={handleTimelineClick}
          onMouseMove={handleTimelineMouseMove}
          onMouseLeave={() => setHoverTimeSec(null)}
        >
          {/* Visual Markers */}
          {markers.map((m) => (
            <div
              key={m.id}
              className="position-absolute top-0 bottom-0 rounded-2 d-flex align-items-center justify-content-center shadow-sm"
              style={{
                left: `${m.leftPercent}%`,
                width: `${m.widthPercent}%`,
                backgroundColor: m.color,
                opacity: 0.85,
                zIndex: 2,
                transition: 'left 0.2s, width 0.2s',
                minWidth: '6px',
              }}
              title={`${m.name}: ${m.startStr} - ${m.endStr} (${m.duration}s)`}
            >
              {m.widthPercent > 14 && (
                <span
                  className="badge text-white px-1 text-truncate font-monospace"
                  style={{ fontSize: '0.68rem', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                >
                  {m.name} ({m.duration}s)
                </span>
              )}
            </div>
          ))}

          {/* Current Playhead Scrubber Pin */}
          {totalDuration > 0 && (
            <div
              className="position-absolute top-0 bottom-0"
              style={{
                left: `${(currentTimeSec / totalDuration) * 100}%`,
                width: '2px',
                background: '#FFD60A',
                zIndex: 4,
                pointerEvents: 'none',
              }}
            >
              <div
                className="position-absolute font-monospace fw-semibold shadow"
                style={{
                  top: '-16px',
                  left: '-16px',
                  fontSize: '0.64rem',
                  whiteSpace: 'nowrap',
                  background: '#FFD60A',
                  color: '#000000',
                  borderRadius: '4px',
                  padding: '1px 4px',
                }}
              >
                {secondsToTimeString(currentTimeSec)}
              </div>
            </div>
          )}

          {/* Hover Indicator */}
          {hoverTimeSec !== null && totalDuration > 0 && (
            <div
              className="position-absolute top-0 bottom-0 opacity-40"
              style={{
                left: `${(hoverTimeSec / totalDuration) * 100}%`,
                width: '1px',
                background: '#ffffff',
                zIndex: 3,
                pointerEvents: 'none',
              }}
            ></div>
          )}
        </div>

        {/* Timeline Scale Ruler */}
        <div className="d-flex justify-content-between font-monospace mt-1 px-1" style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
          <span>00:00:00</span>
          {totalDuration > 0 && <span>{secondsToTimeString(totalDuration / 2)}</span>}
          <span>{secondsToTimeString(totalDuration)}</span>
        </div>

        {/* Quick Marker Action Buttons */}
        <div className="d-flex flex-wrap gap-2 mt-3 pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <button
            type="button"
            className="apple-btn-secondary"
            style={{ padding: '5px 10px', fontSize: '0.78rem' }}
            onClick={() => onSetSegmentTime?.('start', currentTimeSec)}
            title="Đặt mốc bắt đầu của đoạn cuối cùng bằng vị trí đang chọn"
          >
            <span>Đặt mốc bắt đầu:</span>
            <span className="font-monospace text-white fw-semibold">{secondsToTimeString(currentTimeSec)}</span>
          </button>

          <button
            type="button"
            className="apple-btn-secondary"
            style={{ padding: '5px 10px', fontSize: '0.78rem' }}
            onClick={() => onSetSegmentTime?.('end', currentTimeSec)}
            title="Đặt mốc kết thúc của đoạn cuối cùng bằng vị trí đang chọn"
          >
            <span>Đặt mốc kết thúc:</span>
            <span className="font-monospace text-white fw-semibold">{secondsToTimeString(currentTimeSec)}</span>
          </button>

          <button
            type="button"
            className="apple-btn-primary ms-auto"
            style={{ padding: '5px 12px', fontSize: '0.78rem' }}
            onClick={() => onAddMarkerAtTime?.(currentTimeSec)}
            title="Tạo đoạn 30 giây bắt đầu từ vị trí đang chọn"
          >
            <Plus size={14} strokeWidth={2} />
            <span>Thêm đoạn 30s tại đây</span>
          </button>
        </div>
      </div>

      {/* Legend of Active Markers */}
      <div className="d-flex flex-wrap gap-2 align-items-center">
        {markers.map((m) => (
          <span
            key={m.id}
            className="apple-pill font-monospace"
            style={{ fontSize: '0.72rem' }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: m.color,
                display: 'inline-block',
              }}
            ></span>
            <span className="text-white">{m.name}</span>
            <span style={{ color: 'var(--text-tertiary)' }}>
              ({m.startStr} &rarr; {m.endStr})
            </span>
          </span>
        ))}
      </div>
    </div>
  );
};
