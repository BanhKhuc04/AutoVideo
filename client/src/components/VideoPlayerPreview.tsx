import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, Minimize2 } from 'lucide';
import { Plus, ExternalLink, AlertCircle } from 'lucide-react';
import { Segment, VideoMetadata } from '../types';
import { timeStringToSeconds, secondsToTimeString } from '../utils/timeValidator';
import { getPreviewVideoUrl } from '../services/api';
import { GlassPanel } from './glass/GlassPanel';
import { GlassButton } from './glass/GlassButton';
import { MorphIconWrapper } from './glass/MorphIconWrapper';

interface VideoPlayerPreviewProps {
  videoUrl: string;
  metadata: VideoMetadata | null;
  segments: Segment[];
  onAddMarkerAtTime?: (timeSec: number) => void;
  onSetSegmentTime?: (type: 'start' | 'end', timeSec: number) => void;
}

export const VideoPlayerPreview: React.FC<VideoPlayerPreviewProps> = ({
  videoUrl,
  metadata,
  segments,
  onAddMarkerAtTime,
  onSetSegmentTime,
}) => {
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0);
  const [hoverTimeSec, setHoverTimeSec] = useState<number | null>(null);
  const [hoverPosPercent, setHoverPosPercent] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [controlsVisible, setControlsVisible] = useState<boolean>(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const idleTimerRef = useRef<any>(null);

  const extractVideoId = (url: string): string | null => {
    if (!url) return null;
    const match = url.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/
    );
    return match ? match[1] : null;
  };

  const videoId = extractVideoId(videoUrl);
  const totalDuration = metadata?.duration || 0;

  // Auto-hide controls when cursor is idle
  const handleMouseMove = () => {
    setControlsVisible(true);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      if (isPlaying) {
        setControlsVisible(false);
      }
    }, 2800);
  };

  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [isPlaying]);

  const togglePlay = () => {
    if (!videoElementRef.current) return;
    if (videoElementRef.current.paused) {
      videoElementRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      videoElementRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoElementRef.current) return;
    videoElementRef.current.muted = !videoElementRef.current.muted;
    setIsMuted(videoElementRef.current.muted);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleVideoTimeUpdate = () => {
    if (videoElementRef.current && !isDragging) {
      setCurrentTimeSec(Math.round(videoElementRef.current.currentTime));
    }
  };

  // Timeline interactions
  const handleTimelineInteraction = (clientX: number) => {
    if (!timelineRef.current || totalDuration <= 0) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, clickX / rect.width));
    const targetSec = Math.round(fraction * totalDuration);

    setCurrentTimeSec(targetSec);
    if (videoElementRef.current) {
      videoElementRef.current.currentTime = targetSec;
    }
  };

  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleTimelineInteraction(e.clientX);

    const onMouseMove = (moveEvent: MouseEvent) => {
      handleTimelineInteraction(moveEvent.clientX);
    };

    const onMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleTimelineHover = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || totalDuration <= 0) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const hoverX = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, hoverX / rect.width));
    setHoverTimeSec(Math.round(fraction * totalDuration));
    setHoverPosPercent(fraction * 100);
  };

  const handleOpenExternal = () => {
    const fullUrl = videoUrl.startsWith('http') ? videoUrl : `https://www.youtube.com/watch?v=${videoId}`;
    if ((window as any).electronAPI?.openExternal) {
      (window as any).electronAPI.openExternal(fullUrl);
    } else {
      window.open(fullUrl, '_blank');
    }
  };

  if (!videoId && !videoUrl) return null;

  const thumbnailSrc =
    metadata?.thumbnail ||
    (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '');

  // Calculate segment markers for timeline
  const clipMarkers = segments.map((seg, idx) => {
    const startSec = timeStringToSeconds(seg.start) || 0;
    const endSec = timeStringToSeconds(seg.end) || 0;
    const duration = Math.max(0, endSec - startSec);
    const leftPercent = totalDuration > 0 ? (startSec / totalDuration) * 100 : 0;
    const widthPercent =
      totalDuration > 0 ? Math.min(100 - leftPercent, (duration / totalDuration) * 100) : 0;

    return {
      id: seg.id,
      index: idx + 1,
      name: seg.name || `Đoạn ${idx + 1}`,
      startSec,
      endSec,
      duration,
      leftPercent: Math.max(0, Math.min(100, leftPercent)),
      widthPercent: Math.max(0.5, Math.min(100, widthPercent)),
    };
  });

  return (
    <GlassPanel className="p-4 mb-4">
      {/* Video Hero Canvas */}
      <div
        ref={containerRef}
        className="position-relative rounded-3 overflow-hidden bg-black shadow-lg mb-3"
        style={{
          aspectRatio: '16/9',
          border: '1px solid var(--glass-border)',
          cursor: isPlaying && !controlsVisible ? 'none' : 'default',
        }}
        onMouseMove={handleMouseMove}
      >
        {previewError ? (
          <div className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center p-4 text-center z-2" style={{ background: 'var(--bg-glass-base)' }}>
            <AlertCircle size={28} className="text-warning mb-2" />
            <p className="mb-3" style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: '380px' }}>
              {previewError}
            </p>
            <GlassButton size="sm" onClick={handleOpenExternal}>
              <ExternalLink size={13} />
              <span>Mở trên YouTube</span>
            </GlassButton>
          </div>
        ) : (
          <video
            ref={videoElementRef}
            src={getPreviewVideoUrl(videoUrl)}
            poster={thumbnailSrc}
            playsInline
            preload="metadata"
            className="w-100 h-100 object-fit-contain"
            onTimeUpdate={handleVideoTimeUpdate}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onError={() => {
              setPreviewError('Không thể tải bản xem trước HTML5. Bạn vẫn có thể chọn mốc thời gian để cắt.');
            }}
            onClick={togglePlay}
          />
        )}

        {/* QuickTime Floating Glass Overlay Controls */}
        <div
          className="position-absolute bottom-0 start-0 end-0 p-3 d-flex align-items-center justify-content-center"
          style={{
            opacity: controlsVisible ? 1 : 0,
            transition: 'opacity 260ms var(--ease-spring)',
            pointerEvents: controlsVisible ? 'auto' : 'none',
            background: 'linear-gradient(to top, rgba(0, 0, 0, 0.65) 0%, transparent 100%)',
          }}
        >
          <div
            className="liquid-glass-floating d-flex align-items-center justify-content-between px-3.5 py-1.5 gap-3 shadow-lg"
            style={{ minWidth: '320px', maxWidth: '440px' }}
          >
            {/* Play/Pause Button with MorphIcon */}
            <button
              type="button"
              className="glass-btn-icon"
              onClick={togglePlay}
              title={isPlaying ? 'Tạm dừng (Space)' : 'Phát (Space)'}
            >
              <MorphIconWrapper
                icon={isPlaying ? Pause : Play}
                spring="snappy"
                size={18}
                color="#ffffff"
              />
            </button>

            {/* Time Stamp */}
            <div className="font-monospace text-white fw-medium" style={{ fontSize: '0.8rem', letterSpacing: '0.02em' }}>
              <span>{secondsToTimeString(currentTimeSec)}</span>
              <span className="opacity-40 mx-1.5">/</span>
              <span className="text-secondary">{secondsToTimeString(totalDuration)}</span>
            </div>

            {/* Right Controls: Volume & Fullscreen with MorphIcons */}
            <div className="d-flex align-items-center gap-1">
              <button
                type="button"
                className="glass-btn-icon"
                onClick={toggleMute}
                title={isMuted ? 'Bật âm thanh' : 'Tắt tiếng'}
              >
                <MorphIconWrapper
                  icon={isMuted ? VolumeX : Volume2}
                  spring="smooth"
                  size={17}
                  color="var(--text-secondary)"
                />
              </button>

              <button
                type="button"
                className="glass-btn-icon"
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
              >
                <MorphIconWrapper
                  icon={isFullscreen ? Minimize2 : Maximize2}
                  spring="smooth"
                  size={16}
                  color="var(--text-secondary)"
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Media-Editor Timeline Section */}
      <div className="px-1 mb-3">
        {/* Timeline Track */}
        <div
          ref={timelineRef}
          className="position-relative rounded-pill"
          style={{
            height: '32px',
            background: 'rgba(14, 16, 22, 0.8)',
            border: '1px solid var(--glass-border)',
            boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.4)',
            cursor: 'pointer',
            userSelect: 'none',
          }}
          onMouseDown={handleTimelineMouseDown}
          onMouseMove={handleTimelineHover}
          onMouseLeave={() => setHoverTimeSec(null)}
        >
          {/* Selected Clip Regions */}
          {clipMarkers.map((m) => (
            <div
              key={m.id}
              className="position-absolute top-0 bottom-0 rounded-pill d-flex align-items-center justify-content-center"
              style={{
                left: `${m.leftPercent}%`,
                width: `${m.widthPercent}%`,
                backgroundColor: 'rgba(10, 132, 255, 0.45)',
                border: '1px solid rgba(10, 132, 255, 0.8)',
                boxShadow: '0 0 12px rgba(10, 132, 255, 0.25)',
                zIndex: 2,
                transition: isDragging ? 'none' : 'left 200ms ease, width 200ms ease',
                minWidth: '6px',
              }}
              title={`${m.name}: ${secondsToTimeString(m.startSec)} → ${secondsToTimeString(m.endSec)} (${m.duration}s)`}
            >
              {m.widthPercent > 12 && (
                <span className="font-monospace text-white px-1 text-truncate" style={{ fontSize: '0.66rem', fontWeight: 600 }}>
                  {m.name}
                </span>
              )}
            </div>
          ))}

          {/* Glowing Playhead Scrubber */}
          {totalDuration > 0 && (
            <div
              className="position-absolute top-0 bottom-0"
              style={{
                left: `${(currentTimeSec / totalDuration) * 100}%`,
                width: '2px',
                background: '#ffffff',
                boxShadow: '0 0 10px #ffffff, 0 0 20px rgba(10, 132, 255, 0.8)',
                zIndex: 4,
                pointerEvents: 'none',
                transform: 'translateX(-50%)',
              }}
            >
              <div
                className="position-absolute rounded-circle shadow"
                style={{
                  width: '10px',
                  height: '10px',
                  background: '#ffffff',
                  top: '-4px',
                  left: '-4px',
                  border: '2px solid #0A84FF',
                }}
              />
            </div>
          )}

          {/* Hover Time Pill */}
          {hoverTimeSec !== null && totalDuration > 0 && (
            <div
              className="position-absolute font-monospace fw-semibold shadow-lg rounded-pill px-2 py-0.5 text-white"
              style={{
                left: `${hoverPosPercent}%`,
                top: '-26px',
                transform: 'translateX(-50%)',
                background: 'rgba(20, 22, 28, 0.92)',
                border: '1px solid var(--glass-border-hover)',
                backdropFilter: 'blur(12px)',
                fontSize: '0.7rem',
                pointerEvents: 'none',
                zIndex: 5,
              }}
            >
              {secondsToTimeString(hoverTimeSec)}
            </div>
          )}
        </div>

        {/* Time Scale & Short-cut Buttons */}
        <div className="d-flex align-items-center justify-content-between font-monospace text-tertiary mt-2" style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
          <span>00:00:00</span>
          <div className="d-flex align-items-center gap-1.5">
            <GlassButton
              size="sm"
              onClick={() => onSetSegmentTime?.('start', currentTimeSec)}
              title="Đặt mốc Bắt đầu (Phím tắt: I)"
            >
              <span>Mốc bắt đầu [I]:</span>
              <strong className="text-white ms-1">{secondsToTimeString(currentTimeSec)}</strong>
            </GlassButton>

            <GlassButton
              size="sm"
              onClick={() => onSetSegmentTime?.('end', currentTimeSec)}
              title="Đặt mốc Kết thúc (Phím tắt: O)"
            >
              <span>Mốc kết thúc [O]:</span>
              <strong className="text-white ms-1">{secondsToTimeString(currentTimeSec)}</strong>
            </GlassButton>

            <GlassButton
              size="sm"
              variant="primary"
              onClick={() => onAddMarkerAtTime?.(currentTimeSec)}
              title="Tạo đoạn 30s tại vị trí hiện tại"
            >
              <Plus size={13} strokeWidth={2.2} />
              <span>+30s</span>
            </GlassButton>
          </div>
          <span>{secondsToTimeString(totalDuration)}</span>
        </div>
      </div>
    </GlassPanel>
  );
};
