import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, Minimize2 } from 'lucide';
import { Plus, AlertCircle, ExternalLink, Scissors, CheckSquare, Square } from 'lucide-react';
import { Segment, VideoMetadata, CutMode } from '../types';
import { timeStringToSeconds, secondsToTimeString } from '../utils/timeValidator';
import { getPreviewVideoUrl } from '../services/api';
import { MorphIconWrapper } from './glass/MorphIconWrapper';
import { GlassButton } from './glass/GlassButton';
import { GlassSegmentedControl } from './glass/GlassSegmentedControl';

interface VideoPlayerPreviewProps {
  videoUrl: string;
  metadata: VideoMetadata | null;
  segments: Segment[];
  cutMode: CutMode;
  onChangeCutMode: (mode: CutMode) => void;
  activeSegmentId?: string;
  onSelectSegment?: (id: string) => void;
  onToggleSegmentSelect?: (id: string) => void;
  onAddMarkerAtTime?: (timeSec: number) => void;
  onSetSegmentTime?: (type: 'start' | 'end', timeSec: number) => void;
  onSplitAtTime?: (timeSec: number) => void;
  externalSeekTime?: number | null;
}

export const VideoPlayerPreview: React.FC<VideoPlayerPreviewProps> = ({
  videoUrl,
  metadata,
  segments,
  cutMode,
  onChangeCutMode,
  activeSegmentId,
  onSelectSegment,
  onToggleSegmentSelect,
  onAddMarkerAtTime,
  onSetSegmentTime,
  onSplitAtTime,
  externalSeekTime,
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

  // Quick feedback toast
  const [feedbackText, setFeedbackText] = useState<string | null>(null);
  const feedbackTimerRef = useRef<any>(null);

  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const idleTimerRef = useRef<any>(null);

  const activeSegment = segments.find((s) => s.id === activeSegmentId) || segments[0];

  const extractVideoId = (url: string): string | null => {
    if (!url) return null;
    const match = url.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/
    );
    return match ? match[1] : null;
  };

  const videoId = extractVideoId(videoUrl);
  const totalDuration = metadata?.duration || 0;

  const showFeedback = (text: string) => {
    setFeedbackText(text);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => {
      setFeedbackText(null);
    }, 2500);
  };

  // External seek trigger
  useEffect(() => {
    if (externalSeekTime !== undefined && externalSeekTime !== null) {
      seekTo(externalSeekTime);
    }
  }, [externalSeekTime]);

  // Handle keyboard events (Space, I, O, S, Left/Right)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Space: Play / Pause
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        togglePlay();
      }
      // Arrow keys
      else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const delta = e.shiftKey ? 5 : 1;
        seekTo(Math.max(0, currentTimeSec - delta));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const delta = e.shiftKey ? 5 : 1;
        seekTo(Math.min(totalDuration, currentTimeSec + delta));
      }
      // Precision Mode: I (Start), O (End)
      else if (cutMode === 'precision' && (e.key === 'i' || e.key === 'I')) {
        e.preventDefault();
        handleSetStart(currentTimeSec);
      } else if (cutMode === 'precision' && (e.key === 'o' || e.key === 'O')) {
        e.preventDefault();
        handleSetEnd(currentTimeSec);
      }
      // Quick Cut Mode: S (Split)
      else if (cutMode === 'quick' && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleTriggerSplit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTimeSec, totalDuration, cutMode, activeSegment, onSetSegmentTime, onSplitAtTime]);

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
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
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

  const seekTo = (sec: number) => {
    const clamped = Math.max(0, Math.min(totalDuration || 99999, sec));
    setCurrentTimeSec(clamped);
    if (videoElementRef.current) {
      videoElementRef.current.currentTime = clamped;
    }
  };

  const handleVideoTimeUpdate = () => {
    if (videoElementRef.current && !isDragging) {
      const now = videoElementRef.current.currentTime;
      setCurrentTimeSec(Math.round(now));
    }
  };

  const handleSetStart = (sec: number) => {
    onSetSegmentTime?.('start', sec);
    showFeedback(`✓ Đã đặt mốc Bắt đầu: ${secondsToTimeString(sec)}`);
  };

  const handleSetEnd = (sec: number) => {
    onSetSegmentTime?.('end', sec);
    showFeedback(`✓ Đã đặt mốc Kết thúc: ${secondsToTimeString(sec)}`);
  };

  const handleTriggerSplit = () => {
    if (onSplitAtTime) {
      onSplitAtTime(currentTimeSec);
      showFeedback(`✂ Đã chia video tại ${secondsToTimeString(currentTimeSec)}`);
    }
  };

  // Timeline dragging & clicking
  const handleTimelineInteraction = (clientX: number) => {
    if (!timelineRef.current || totalDuration <= 0) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, clickX / rect.width));
    const targetSec = Math.round(fraction * totalDuration);

    seekTo(targetSec);
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

  // Calculate segment markers for timeline display
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
      name: seg.name || `Đoạn ${(idx + 1).toString().padStart(2, '0')}`,
      startSec,
      endSec,
      duration,
      selected: seg.selected !== false,
      leftPercent: Math.max(0, Math.min(100, leftPercent)),
      widthPercent: Math.max(0.6, Math.min(100, widthPercent)),
    };
  });

  return (
    <div className="liquid-glass-panel p-4 mb-4">
      {/* Top Header: Mode Switcher [ Cắt chính xác | Cắt nhanh ] */}
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <div
            className="d-flex align-items-center justify-content-center rounded-2"
            style={{
              width: '28px',
              height: '28px',
              background: cutMode === 'quick' ? 'rgba(255, 159, 10, 0.15)' : 'rgba(10, 132, 255, 0.15)',
              border: `1px solid ${cutMode === 'quick' ? 'rgba(255, 159, 10, 0.3)' : 'rgba(10, 132, 255, 0.3)'}`,
              color: cutMode === 'quick' ? '#FF9F0A' : '#0A84FF',
            }}
          >
            <Scissors size={15} />
          </div>
          <span className="fw-semibold text-white" style={{ fontSize: '0.92rem' }}>
            {cutMode === 'quick' ? 'Chế độ Cắt nhanh (Quick Cut)' : 'Chế độ Cắt chính xác (Precision)'}
          </span>
        </div>

        {/* Segmented Mode Switcher */}
        <GlassSegmentedControl<CutMode>
          size="sm"
          value={cutMode}
          onChange={onChangeCutMode}
          options={[
            { value: 'precision', label: 'Cắt chính xác' },
            { value: 'quick', label: 'Cắt nhanh' },
          ]}
        />
      </div>

      {/* Hero Video Canvas */}
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
              setPreviewError('Không thể tải bản xem trước HTML5. Bạn vẫn có thể chia đoạn và cắt bình thường.');
            }}
            onClick={togglePlay}
          />
        )}

        {/* Feedback Toast Overlay */}
        {feedbackText && (
          <div
            className="position-absolute top-0 start-50 translate-middle-x mt-3 px-3 py-1.5 rounded-pill shadow-lg animate-fade-in"
            style={{
              background: 'rgba(10, 132, 255, 0.9)',
              color: '#ffffff',
              fontSize: '0.8rem',
              fontWeight: 500,
              zIndex: 10,
              backdropFilter: 'blur(12px)',
            }}
          >
            {feedbackText}
          </div>
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
      <div className="px-1 mb-2">
        {/* Quick Cut Mode: LARGE Prominent Timeline */}
        {cutMode === 'quick' ? (
          <div className="mb-3 animate-fade-in">
            <div
              ref={timelineRef}
              className="position-relative rounded-3"
              style={{
                height: '56px',
                background: 'rgba(12, 14, 18, 0.9)',
                border: '1px solid var(--glass-border)',
                boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.5)',
                cursor: 'pointer',
                userSelect: 'none',
                overflow: 'hidden',
              }}
              onMouseDown={handleTimelineMouseDown}
              onMouseMove={handleTimelineHover}
              onMouseLeave={() => setHoverTimeSec(null)}
            >
              {/* Segment blocks along the entire timeline */}
              {clipMarkers.map((m) => (
                <div
                  key={m.id}
                  className="position-absolute top-0 bottom-0 d-flex flex-column justify-content-between p-1.5 transition-all"
                  style={{
                    left: `${m.leftPercent}%`,
                    width: `${m.widthPercent}%`,
                    backgroundColor: m.selected ? 'rgba(10, 132, 255, 0.45)' : 'rgba(255, 255, 255, 0.04)',
                    borderRight: '2px solid rgba(255, 255, 255, 0.4)',
                    boxShadow: m.selected ? 'inset 0 0 16px rgba(10, 132, 255, 0.35)' : 'none',
                    opacity: m.selected ? 1 : 0.4,
                    zIndex: 2,
                    cursor: 'pointer',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSegmentSelect?.(m.id);
                  }}
                  title={`Click để chọn/bỏ chọn: ${m.name} (${secondsToTimeString(m.startSec)} → ${secondsToTimeString(m.endSec)})`}
                >
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-1">
                      {m.selected ? (
                        <CheckSquare size={11} color="#ffffff" strokeWidth={2.2} />
                      ) : (
                        <Square size={11} color="var(--text-tertiary)" strokeWidth={1.8} />
                      )}
                      <span className="font-monospace text-white fw-bold text-truncate" style={{ fontSize: '0.68rem' }}>
                        {m.name}
                      </span>
                    </div>
                    {m.widthPercent > 10 && (
                      <span className="font-monospace text-white small opacity-90" style={{ fontSize: '0.62rem' }}>
                        {m.duration}s
                      </span>
                    )}
                  </div>

                  {m.widthPercent > 14 && (
                    <div className="font-monospace text-secondary text-truncate" style={{ fontSize: '0.6rem' }}>
                      {secondsToTimeString(m.startSec)} - {secondsToTimeString(m.endSec)}
                    </div>
                  )}
                </div>
              ))}

              {/* Glowing Playhead Scrubber */}
              {totalDuration > 0 && (
                <div
                  className="position-absolute top-0 bottom-0"
                  style={{
                    left: `${(currentTimeSec / totalDuration) * 100}%`,
                    width: '3px',
                    background: '#ffffff',
                    boxShadow: '0 0 12px #ffffff, 0 0 24px rgba(10, 132, 255, 0.9)',
                    zIndex: 5,
                    pointerEvents: 'none',
                    transform: 'translateX(-50%)',
                  }}
                >
                  <div
                    className="position-absolute rounded-circle shadow"
                    style={{
                      width: '12px',
                      height: '12px',
                      background: '#ffffff',
                      top: '-4px',
                      left: '-4.5px',
                      border: '2.5px solid #0A84FF',
                    }}
                  />
                  <div
                    className="position-absolute rounded-circle shadow"
                    style={{
                      width: '12px',
                      height: '12px',
                      background: '#ffffff',
                      bottom: '-4px',
                      left: '-4.5px',
                      border: '2.5px solid #0A84FF',
                    }}
                  />
                </div>
              )}

              {/* Hover Time Pill */}
              {hoverTimeSec !== null && totalDuration > 0 && (
                <div
                  className="position-absolute font-monospace fw-semibold shadow-lg rounded-pill px-2.5 py-0.5 text-white"
                  style={{
                    left: `${hoverPosPercent}%`,
                    top: '-28px',
                    transform: 'translateX(-50%)',
                    background: 'rgba(20, 22, 28, 0.95)',
                    border: '1px solid var(--glass-border-hover)',
                    backdropFilter: 'blur(12px)',
                    fontSize: '0.72rem',
                    pointerEvents: 'none',
                    zIndex: 6,
                  }}
                >
                  {secondsToTimeString(hoverTimeSec)}
                </div>
              )}
            </div>

            {/* Quick Cut Big Split Action Button */}
            <div className="d-flex align-items-center justify-content-between mt-2.5">
              <span className="font-monospace text-tertiary small" style={{ fontSize: '0.74rem' }}>
                00:00:00
              </span>

              <GlassButton
                variant="primary"
                size="md"
                className="px-4 py-2"
                style={{ background: 'linear-gradient(180deg, #FF9F0A 0%, #E08900 100%)', borderColor: 'rgba(255, 255, 255, 0.25)' }}
                onClick={handleTriggerSplit}
                title="Chia video tại mốc hiện tại (Phím tắt: S)"
              >
                <Scissors size={15} strokeWidth={2.4} />
                <span className="fw-semibold">Chia đoạn tại {secondsToTimeString(currentTimeSec)} (Phím S)</span>
              </GlassButton>

              <span className="font-monospace text-tertiary small" style={{ fontSize: '0.74rem' }}>
                {secondsToTimeString(totalDuration)}
              </span>
            </div>
          </div>
        ) : (
          /* Precision Mode Timeline */
          <div className="animate-fade-in">
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
              {clipMarkers.map((m) => {
                const isCurrentActive = activeSegment?.id === m.id;
                return (
                  <div
                    key={m.id}
                    className="position-absolute top-0 bottom-0 rounded-pill d-flex align-items-center justify-content-center transition-all"
                    style={{
                      left: `${m.leftPercent}%`,
                      width: `${m.widthPercent}%`,
                      backgroundColor: isCurrentActive ? 'rgba(10, 132, 255, 0.65)' : 'rgba(10, 132, 255, 0.35)',
                      border: `1px solid ${isCurrentActive ? '#64D2FF' : 'rgba(10, 132, 255, 0.8)'}`,
                      boxShadow: isCurrentActive ? '0 0 16px rgba(10, 132, 255, 0.5)' : 'none',
                      zIndex: 2,
                      minWidth: '6px',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectSegment?.(m.id);
                    }}
                    title={`${m.name}: ${secondsToTimeString(m.startSec)} → ${secondsToTimeString(m.endSec)} (${m.duration}s)`}
                  >
                    {m.widthPercent > 12 && (
                      <span className="font-monospace text-white px-1 text-truncate" style={{ fontSize: '0.66rem', fontWeight: 600 }}>
                        {m.name}
                      </span>
                    )}
                  </div>
                );
              })}

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

            {/* Time Scale & Quick Precision Buttons */}
            <div className="d-flex align-items-center justify-content-between font-monospace text-tertiary mt-2" style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
              <span>00:00:00</span>
              <div className="d-flex align-items-center gap-1.5">
                <GlassButton
                  size="sm"
                  onClick={() => handleSetStart(currentTimeSec)}
                  title="Đặt mốc Bắt đầu (Phím tắt: I)"
                >
                  <span>Bắt đầu [I]:</span>
                  <strong className="text-white ms-1">{secondsToTimeString(currentTimeSec)}</strong>
                </GlassButton>

                <GlassButton
                  size="sm"
                  onClick={() => handleSetEnd(currentTimeSec)}
                  title="Đặt mốc Kết thúc (Phím tắt: O)"
                >
                  <span>Kết thúc [O]:</span>
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
        )}
      </div>
    </div>
  );
};
