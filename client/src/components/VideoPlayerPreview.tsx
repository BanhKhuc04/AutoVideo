import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, Minimize2 } from 'lucide';
import { Scissors, AlertCircle, ExternalLink, Trash2, Plus } from 'lucide-react';
import { Segment, VideoMetadata, CutMode } from '../types';
import { timeStringToSeconds, secondsToTimeString } from '../utils/timeValidator';
import { getPreviewVideoUrl } from '../services/api';
import { MorphIconWrapper } from './glass/MorphIconWrapper';
import { GlassSegmentedControl } from './glass/GlassSegmentedControl';

interface VideoPlayerPreviewProps {
  videoUrl: string;
  metadata: VideoMetadata | null;
  segments: Segment[];
  cutMode: CutMode;
  onChangeCutMode: (mode: CutMode) => void;
  activeSegmentId?: string;
  onSelectSegment?: (id: string) => void;
  onAddMarkerAtTime?: (timeSec: number) => void;
  onSetSegmentTime?: (type: 'start' | 'end', timeSec: number) => void;
  onSplitAtTime?: (timeSec: number) => void;
  onDeleteActiveSegment?: (id: string) => void;
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
  onAddMarkerAtTime,
  onSetSegmentTime,
  onSplitAtTime,
  onDeleteActiveSegment,
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
    }, 2200);
  };

  // External seek trigger
  useEffect(() => {
    if (externalSeekTime !== undefined && externalSeekTime !== null) {
      seekTo(externalSeekTime);
    }
  }, [externalSeekTime]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      // Space: Play / Pause
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        togglePlay();
      }
      // Arrow keys: Seek
      else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const delta = e.shiftKey ? 5 : 1;
        seekTo(Math.max(0, currentTimeSec - delta));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const delta = e.shiftKey ? 5 : 1;
        seekTo(Math.min(totalDuration || 99999, currentTimeSec + delta));
      }
      // Precision Mode: I (Start), O (End)
      else if (cutMode === 'precision' && (e.key === 'i' || e.key === 'I')) {
        e.preventDefault();
        handleSetStart(currentTimeSec);
      } else if (cutMode === 'precision' && (e.key === 'o' || e.key === 'O')) {
        e.preventDefault();
        handleSetEnd(currentTimeSec);
      }
      // Quick Cut Mode: S (Split), Delete / Backspace (Delete Active Segment)
      else if (cutMode === 'quick') {
        if (e.key === 's' || e.key === 'S') {
          e.preventDefault();
          handleTriggerSplit();
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
          if (activeSegmentId && onDeleteActiveSegment) {
            e.preventDefault();
            onDeleteActiveSegment(activeSegmentId);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    currentTimeSec,
    totalDuration,
    cutMode,
    activeSegmentId,
    onSetSegmentTime,
    onSplitAtTime,
    onDeleteActiveSegment,
  ]);

  // Auto-hide controls when cursor is idle
  const handleMouseMove = () => {
    setControlsVisible(true);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      if (isPlaying) {
        setControlsVisible(false);
      }
    }, 2600);
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
      videoElementRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
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
      containerRef.current
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(() => {});
    } else {
      document
        .exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(() => {});
    }
  };

  const seekTo = (seconds: number) => {
    const validSec = Math.max(0, Math.min(totalDuration || seconds, seconds));
    setCurrentTimeSec(validSec);
    if (videoElementRef.current) {
      videoElementRef.current.currentTime = validSec;
    }
  };

  const handleVideoTimeUpdate = () => {
    if (!videoElementRef.current || isDragging) return;
    setCurrentTimeSec(videoElementRef.current.currentTime);
  };

  const getTimeFromMouseEvent = (e: React.MouseEvent | MouseEvent): number => {
    if (!timelineRef.current || !totalDuration) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const percent = clickX / rect.width;
    return percent * totalDuration;
  };

  const handleTimelineMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const newTime = getTimeFromMouseEvent(e);
    seekTo(newTime);

    const handleGlobalMouseMove = (moveEvent: MouseEvent) => {
      const draggedTime = getTimeFromMouseEvent(moveEvent);
      seekTo(draggedTime);
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
  };

  const handleTimelineHover = (e: React.MouseEvent) => {
    if (!timelineRef.current || !totalDuration) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const hoverX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const percent = (hoverX / rect.width) * 100;
    const hoverSec = (hoverX / rect.width) * totalDuration;
    setHoverPosPercent(percent);
    setHoverTimeSec(hoverSec);
  };

  const handleSetStart = (timeSec: number) => {
    if (onSetSegmentTime) {
      onSetSegmentTime('start', timeSec);
      showFeedback(`Đã đặt Bắt đầu: ${secondsToTimeString(timeSec)}`);
    }
  };

  const handleSetEnd = (timeSec: number) => {
    if (onSetSegmentTime) {
      onSetSegmentTime('end', timeSec);
      showFeedback(`Đã đặt Kết thúc: ${secondsToTimeString(timeSec)}`);
    }
  };

  const handleTriggerSplit = () => {
    if (onSplitAtTime) {
      onSplitAtTime(currentTimeSec);
      showFeedback(`Đã chia đoạn tại ${secondsToTimeString(currentTimeSec)}`);
    }
  };

  const handleOpenExternal = () => {
    if (!videoUrl) return;
    if ((window as any).electronAPI?.openExternal) {
      (window as any).electronAPI.openExternal(videoUrl);
    } else {
      window.open(videoUrl, '_blank');
    }
  };

  const playheadPercent =
    totalDuration > 0 ? Math.min(100, Math.max(0, (currentTimeSec / totalDuration) * 100)) : 0;

  // Active clip range in precision mode
  const activeStartSec = activeSegment ? timeStringToSeconds(activeSegment.start) || 0 : 0;
  const activeEndSec = activeSegment ? timeStringToSeconds(activeSegment.end) || totalDuration : totalDuration;
  const activeLeftPercent = totalDuration > 0 ? (activeStartSec / totalDuration) * 100 : 0;
  const activeWidthPercent = totalDuration > 0 ? Math.max(0.5, ((activeEndSec - activeStartSec) / totalDuration) * 100) : 0;

  // Convert segments into normalized spans for Quick Cut timeline
  const clipMarkers = segments.map((seg, idx) => {
    const s = timeStringToSeconds(seg.start) || 0;
    const e = timeStringToSeconds(seg.end) || totalDuration || s + 10;
    const left = totalDuration > 0 ? (s / totalDuration) * 100 : 0;
    const width = totalDuration > 0 ? Math.max(0.6, ((e - s) / totalDuration) * 100) : 100;
    const durSec = Math.max(0, Math.round(e - s));
    return {
      id: seg.id,
      index: idx + 1,
      name: seg.name || `Đoạn ${(idx + 1).toString().padStart(2, '0')}`,
      startSec: s,
      endSec: e,
      durSec,
      leftPercent: left,
      widthPercent: width,
      isActive: seg.id === activeSegmentId,
    };
  });

  const thumbnailSrc =
    metadata?.thumbnail ||
    (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : undefined);

  return (
    <div className="ui-card animate-fade-in" style={{ padding: '16px' }}>
      {/* Top Header: Mode Switcher */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '6px',
              background: cutMode === 'quick' ? 'rgba(255, 159, 10, 0.15)' : 'var(--accent-subtle)',
              border: `1px solid ${cutMode === 'quick' ? 'rgba(255, 159, 10, 0.3)' : 'var(--accent-border)'}`,
              color: cutMode === 'quick' ? '#FF9F0A' : 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Scissors size={14} />
          </div>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {cutMode === 'quick' ? 'Chế độ Cắt nhanh (Quick Cut)' : 'Chế độ Cắt chính xác (Precision)'}
          </span>
        </div>

        {/* Mode Switcher */}
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
        style={{
          position: 'relative',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          backgroundColor: '#000000',
          aspectRatio: '16/9',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
          marginBottom: '12px',
          cursor: isPlaying && !controlsVisible ? 'none' : 'default',
        }}
        onMouseMove={handleMouseMove}
      >
        {previewError ? (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              textAlign: 'center',
              background: '#121418',
              zIndex: 2,
            }}
          >
            <AlertCircle size={28} style={{ color: 'var(--color-warning)', marginBottom: '8px' }} />
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '360px', marginBottom: '12px' }}>
              {previewError}
            </p>
            <button type="button" className="btn btn-sm" onClick={handleOpenExternal}>
              <ExternalLink size={12} />
              <span>Mở trên YouTube</span>
            </button>
          </div>
        ) : (
          <video
            ref={videoElementRef}
            src={getPreviewVideoUrl(videoUrl)}
            poster={thumbnailSrc}
            playsInline
            preload="metadata"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            onTimeUpdate={handleVideoTimeUpdate}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onError={() => {
              setPreviewError('Không thể tải bản xem trước HTML5. Bạn vẫn có thể chia đoạn và cắt video bình thường.');
            }}
            onClick={togglePlay}
          />
        )}

        {/* Feedback Overlay */}
        {feedbackText && (
          <div
            className="animate-fade-in"
            style={{
              position: 'absolute',
              top: '12px',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '6px 14px',
              borderRadius: 'var(--radius-pill)',
              background: 'rgba(10, 132, 255, 0.92)',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 500,
              zIndex: 10,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(8px)',
            }}
          >
            {feedbackText}
          </div>
        )}

        {/* Floating Controls Bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: controlsVisible ? 1 : 0,
            transition: 'opacity 220ms ease',
            pointerEvents: controlsVisible ? 'auto' : 'none',
            background: 'linear-gradient(to top, rgba(0, 0, 0, 0.7) 0%, transparent 100%)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 14px',
              gap: '12px',
              borderRadius: 'var(--radius-pill)',
              background: 'rgba(20, 24, 32, 0.88)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
              minWidth: '300px',
              maxWidth: '420px',
            }}
          >
            {/* Play/Pause */}
            <button
              type="button"
              className="btn-icon"
              onClick={togglePlay}
              title={isPlaying ? 'Tạm dừng (Space)' : 'Phát (Space)'}
              style={{ color: '#ffffff' }}
            >
              <MorphIconWrapper
                icon={isPlaying ? Pause : Play}
                spring="snappy"
                size={16}
                color="#ffffff"
              />
            </button>

            {/* Time Stamp */}
            <div className="font-monospace" style={{ fontSize: '12px', fontWeight: 500, color: '#ffffff' }}>
              <span>{secondsToTimeString(currentTimeSec)}</span>
              <span style={{ color: 'var(--text-muted)', margin: '0 6px' }}>/</span>
              <span style={{ color: 'var(--text-secondary)' }}>{secondsToTimeString(totalDuration)}</span>
            </div>

            {/* Volume & Fullscreen */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                className="btn-icon"
                onClick={toggleMute}
                title={isMuted ? 'Bật âm thanh' : 'Tắt tiếng'}
              >
                <MorphIconWrapper
                  icon={isMuted ? VolumeX : Volume2}
                  spring="smooth"
                  size={15}
                  color="var(--text-secondary)"
                />
              </button>

              <button
                type="button"
                className="btn-icon"
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
              >
                <MorphIconWrapper
                  icon={isFullscreen ? Minimize2 : Maximize2}
                  spring="smooth"
                  size={15}
                  color="var(--text-secondary)"
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          TIMELINES SECTION
          ============================================================ */}

      {/* 1. QUICK CUT MODE: 1 LARGE INTERACTIVE TIMELINE (95px) */}
      {cutMode === 'quick' ? (
        <div className="animate-fade-in">
          {/* Quick Cut Timeline Track */}
          <div
            ref={timelineRef}
            className="quickcut-timeline-wrapper"
            onMouseDown={handleTimelineMouseDown}
            onMouseMove={handleTimelineHover}
            onMouseLeave={() => setHoverTimeSec(null)}
          >
            {/* Segment blocks */}
            {clipMarkers.map((m) => (
              <div
                key={m.id}
                className={`quickcut-segment-block ${m.isActive ? 'active' : ''}`}
                style={{
                  left: `${m.leftPercent}%`,
                  width: `${m.widthPercent}%`,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectSegment?.(m.id);
                }}
                title={`${m.name} (${secondsToTimeString(m.startSec)} → ${secondsToTimeString(m.endSec)}) • Click để chọn`}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span
                    className="font-monospace"
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: m.isActive ? '#ffffff' : 'var(--text-primary)',
                      textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                    }}
                  >
                    {m.index.toString().padStart(2, '0')}
                  </span>
                  {m.widthPercent > 12 && (
                    <span
                      className="font-monospace"
                      style={{
                        fontSize: '11px',
                        color: m.isActive ? 'rgba(255,255,255,0.9)' : 'var(--text-secondary)',
                      }}
                    >
                      {m.durSec}s
                    </span>
                  )}
                </div>

                {m.widthPercent > 18 && (
                  <div
                    className="font-monospace"
                    style={{
                      fontSize: '10px',
                      color: m.isActive ? 'rgba(255,255,255,0.8)' : 'var(--text-tertiary)',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {secondsToTimeString(m.startSec)} → {secondsToTimeString(m.endSec)}
                  </div>
                )}
              </div>
            ))}

            {/* Glowing Playhead */}
            <div
              className="quickcut-playhead"
              style={{ left: `${playheadPercent}%` }}
            >
              <div className="quickcut-playhead-handle-top" />
              <div className="quickcut-playhead-handle-bottom" />
            </div>

            {/* Hover Tooltip Pill */}
            {hoverTimeSec !== null && !isDragging && (
              <div
                style={{
                  position: 'absolute',
                  top: '6px',
                  left: `${hoverPosPercent}%`,
                  transform: 'translateX(-50%)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-pill)',
                  background: 'rgba(0, 0, 0, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  fontSize: '11px',
                  pointerEvents: 'none',
                  zIndex: 20,
                  whiteSpace: 'nowrap',
                }}
                className="font-monospace"
              >
                {secondsToTimeString(hoverTimeSec)}
              </div>
            )}
          </div>

          {/* Quick Cut Action Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '12px',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            {/* Primary Split Button */}
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: '10px 18px', fontSize: '13px', fontWeight: 600 }}
              onClick={handleTriggerSplit}
              title="Chia video tại mốc hiện tại (Phím tắt: S)"
            >
              <Scissors size={15} strokeWidth={2.2} />
              <span>Chia đoạn tại mốc {secondsToTimeString(currentTimeSec)} (Phím S)</span>
            </button>

            {/* Delete Active Segment */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => activeSegmentId && onDeleteActiveSegment?.(activeSegmentId)}
                disabled={!activeSegmentId || segments.length <= 1}
                title="Xóa đoạn đang chọn khỏi timeline (Phím Delete)"
                style={{ color: 'var(--color-danger)' }}
              >
                <Trash2 size={13} />
                <span>Xóa đoạn (Delete)</span>
              </button>

              <div className="font-monospace" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {segments.length} đoạn trên timeline
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* 2. PRECISION MODE: CLASSIC TIMELINE + I/O CONTROLS */
        <div className="animate-fade-in">
          {/* Classic Timeline Track */}
          <div
            ref={timelineRef}
            style={{
              position: 'relative',
              width: '100%',
              height: '34px',
              background: '#090a0d',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-pill)',
              boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.6)',
              cursor: 'pointer',
              userSelect: 'none',
              overflow: 'hidden',
              marginBottom: '12px',
            }}
            onMouseDown={handleTimelineMouseDown}
            onMouseMove={handleTimelineHover}
            onMouseLeave={() => setHoverTimeSec(null)}
          >
            {/* Range highlight of active segment */}
            {activeSegment && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: `${activeLeftPercent}%`,
                  width: `${activeWidthPercent}%`,
                  background: 'rgba(10, 132, 255, 0.35)',
                  borderLeft: '2px solid #0a84ff',
                  borderRight: '2px solid #0a84ff',
                  boxShadow: 'inset 0 0 12px rgba(10, 132, 255, 0.4)',
                  zIndex: 2,
                }}
              />
            )}

            {/* Playhead */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${playheadPercent}%`,
                width: '2px',
                background: '#ffffff',
                boxShadow: '0 0 6px #ffffff',
                zIndex: 5,
                transform: 'translateX(-50%)',
                pointerEvents: 'none',
              }}
            />

            {/* Hover Tooltip */}
            {hoverTimeSec !== null && !isDragging && (
              <div
                style={{
                  position: 'absolute',
                  top: '4px',
                  left: `${hoverPosPercent}%`,
                  transform: 'translateX(-50%)',
                  padding: '1px 6px',
                  borderRadius: 'var(--radius-pill)',
                  background: 'rgba(0, 0, 0, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  fontSize: '10px',
                  pointerEvents: 'none',
                  zIndex: 10,
                }}
                className="font-monospace"
              >
                {secondsToTimeString(hoverTimeSec)}
              </div>
            )}
          </div>

          {/* Precision Controls Row: [I], [O], [+30s] */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => handleSetStart(currentTimeSec)}
                title="Đặt mốc bắt đầu tại thời điểm hiện tại (Phím tắt: I)"
              >
                <span style={{ color: '#0a84ff', fontWeight: 600 }}>[I]</span>
                <span>Đặt Bắt đầu</span>
              </button>

              <button
                type="button"
                className="btn btn-sm"
                onClick={() => handleSetEnd(currentTimeSec)}
                title="Đặt mốc kết thúc tại thời điểm hiện tại (Phím tắt: O)"
              >
                <span style={{ color: '#ffd60a', fontWeight: 600 }}>[O]</span>
                <span>Đặt Kết thúc</span>
              </button>

              <button
                type="button"
                className="btn btn-sm"
                onClick={() => onAddMarkerAtTime?.(currentTimeSec)}
                title="Tạo đoạn mới 30 giây từ mốc hiện tại"
              >
                <Plus size={12} />
                <span>+30s đoạn mới</span>
              </button>
            </div>

            <div className="font-monospace" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Đang chọn: <strong style={{ color: 'var(--text-primary)' }}>{activeSegment?.name || 'Đoạn 01'}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
