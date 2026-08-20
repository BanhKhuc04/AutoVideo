import React, { useState, useRef, useEffect } from 'react';
import { Radio, ArrowLeft, StopCircle, CheckCircle2, Film, Download, AlertCircle, Info } from 'lucide-react';
import { Segment, RecordedClip } from '../types';
import { timeStringToSeconds } from '../utils/timeValidator';
import { GlassPanel } from './glass/GlassPanel';
import { GlassButton } from './glass/GlassButton';
import { GlassPill } from './glass/GlassPill';
import { GlassProgress } from './glass/GlassProgress';

interface BrowserTabRecorderProps {
  videoUrl: string;
  videoTitle: string;
  segments: Segment[];
  onFinishRecording: (clips: RecordedClip[]) => void;
  onCancel: () => void;
}

export const BrowserTabRecorder: React.FC<BrowserTabRecorderProps> = ({
  videoTitle,
  segments,
  onFinishRecording,
  onCancel,
}) => {
  const [activeClipIndex, setActiveClipIndex] = useState<number>(0);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [recordedClips, setRecordedClips] = useState<Record<string, RecordedClip>>({});
  const [errorMessage, setErrorMessage] = useState<string>('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<any>(null);

  const currentSegment = segments[activeClipIndex] || segments[0];

  const startSec = timeStringToSeconds(currentSegment?.start) || 0;
  const endSec = timeStringToSeconds(currentSegment?.end) || 0;
  const targetDuration = Math.max(1, endSec - startSec);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const startCapture = async () => {
    setErrorMessage('');
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'browser',
          frameRate: { ideal: 30, max: 60 },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true,
      });

      streamRef.current = stream;

      stream.getVideoTracks()[0].onended = () => {
        stopCapture();
      };

      let mimeType = 'video/webm; codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm; codecs=vp8';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 5000000,
        audioBitsPerSecond: 192000,
      });

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const finalBlob = new Blob(chunksRef.current, { type: mimeType });
        const previewUrl = URL.createObjectURL(finalBlob);

        const clipNumber = (activeClipIndex + 1).toString().padStart(2, '0');
        const newClip: RecordedClip = {
          id: currentSegment.id,
          name: currentSegment.name || `doan_${clipNumber}`,
          start: currentSegment.start,
          end: currentSegment.end,
          durationSeconds: elapsedSeconds || targetDuration,
          blob: finalBlob,
          previewUrl,
          timestamp: Date.now(),
        };

        setRecordedClips((prev) => ({
          ...prev,
          [currentSegment.id]: newClip,
        }));

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }

        setIsRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
      };

      recorder.start(500);
      setIsRecording(true);
      setElapsedSeconds(0);

      let seconds = 0;
      timerRef.current = setInterval(() => {
        seconds += 1;
        setElapsedSeconds(seconds);

        if (seconds >= targetDuration + 1) {
          stopCapture();
        }
      }, 1000);
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        setErrorMessage(err.message || 'Không thể bắt đầu ghi tab trình duyệt.');
      }
      setIsRecording(false);
    }
  };

  const stopCapture = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handlePackageAndExport = () => {
    const recordedList = Object.values(recordedClips);
    if (recordedList.length === 0) {
      setErrorMessage('Vui lòng ghi ít nhất 1 đoạn video trước khi xuất file.');
      return;
    }
    onFinishRecording(recordedList);
  };

  const recordedCount = Object.keys(recordedClips).length;
  const progressPercent = targetDuration > 0 ? Math.min(100, (elapsedSeconds / targetDuration) * 100) : 0;

  return (
    <GlassPanel className="p-3.5 mb-3.5">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-3 pb-2.5 border-bottom" style={{ borderColor: 'var(--glass-border-subtle)' }}>
        <div className="d-flex align-items-center gap-2">
          <Radio size={16} color="#FF453A" />
          <div>
            <div className="fw-semibold text-white" style={{ fontSize: '0.88rem' }}>
              Phòng thu ghi hình tab trình duyệt
            </div>
            {videoTitle && <div className="small text-truncate" style={{ color: 'var(--text-tertiary)', fontSize: '0.72rem', maxWidth: '300px' }}>{videoTitle}</div>}
          </div>
        </div>
        <GlassButton
          size="sm"
          onClick={onCancel}
          disabled={isRecording}
        >
          <ArrowLeft size={13} />
          <span>Quay lại</span>
        </GlassButton>
      </div>

      {/* Guide Banner */}
      <div className="p-2.5 mb-3 rounded-3 d-flex align-items-center gap-2" style={{ background: 'rgba(10, 132, 255, 0.08)', border: '1px solid rgba(10, 132, 255, 0.2)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
        <Info size={16} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
        <div>
          Chọn <strong>Tab này</strong> và bật <strong>"Chia sẻ âm thanh của thẻ"</strong>. Công cụ sẽ tự động ghi hình và dừng khi hết mốc giờ.
        </div>
      </div>

      {errorMessage && (
        <div className="d-flex align-items-center gap-2 p-2 px-3 mb-3 rounded-2" style={{ background: 'rgba(255, 69, 58, 0.1)', color: 'var(--color-danger)', fontSize: '0.78rem' }}>
          <AlertCircle size={14} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Clip Selector Tabs */}
      <div className="mb-3">
        <div className="text-secondary small mb-2" style={{ fontSize: '0.74rem' }}>
          Chọn đoạn ({recordedCount}/{segments.length} đoạn hoàn thành):
        </div>
        <div className="d-flex gap-1.5 overflow-x-auto pb-1.5">
          {segments.map((seg, idx) => {
            const isSelected = idx === activeClipIndex;
            const isRecorded = !!recordedClips[seg.id];
            return (
              <button
                key={seg.id}
                type="button"
                className={`glass-btn ${isSelected ? 'glass-btn-primary' : ''}`}
                style={{ padding: '4px 10px', fontSize: '0.76rem', borderRadius: 'var(--radius-pill)' }}
                onClick={() => !isRecording && setActiveClipIndex(idx)}
                disabled={isRecording}
              >
                {isRecorded ? (
                  <CheckCircle2 size={12} style={{ color: 'var(--color-success)' }} />
                ) : (
                  <Film size={12} />
                )}
                <span>{seg.name || `Đoạn ${idx + 1}`}</span>
                <span className="font-monospace opacity-75" style={{ fontSize: '0.68rem' }}>
                  {seg.start} - {seg.end}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Workspace */}
      <div className="p-3 mb-3 rounded-3" style={{ background: 'rgba(18, 20, 26, 0.65)', border: '1px solid var(--glass-border-subtle)' }}>
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2.5">
          <div className="d-flex align-items-center gap-1.5">
            <GlassPill variant="accent">Đang chọn</GlassPill>
            <span className="fw-medium text-white" style={{ fontSize: '0.84rem' }}>
              {currentSegment.name || `Đoạn #${activeClipIndex + 1}`}
            </span>
          </div>
          <div className="font-monospace small text-secondary" style={{ fontSize: '0.74rem' }}>
            {currentSegment.start} &rarr; {currentSegment.end} ({targetDuration}s)
          </div>
        </div>

        {/* Live Indicator */}
        {isRecording && (
          <div className="p-2.5 mb-2.5 rounded-2" style={{ background: 'rgba(255, 69, 58, 0.08)', border: '1px solid rgba(255, 69, 58, 0.3)' }}>
            <div className="d-flex align-items-center justify-content-between mb-1.5">
              <div className="d-flex align-items-center gap-1.5" style={{ color: 'var(--color-danger)', fontSize: '0.78rem' }}>
                <Radio size={13} className="animate-pulse" />
                <strong className="font-monospace">
                  ĐANG GHI: {elapsedSeconds}s / {targetDuration}s
                </strong>
              </div>
              <span className="font-monospace small text-secondary" style={{ fontSize: '0.72rem' }}>
                Còn: {Math.max(0, targetDuration - elapsedSeconds)}s
              </span>
            </div>
            <GlassProgress percent={progressPercent} height={5} />
          </div>
        )}

        {/* Action Buttons */}
        <div className="d-flex flex-wrap gap-2">
          {!isRecording ? (
            <GlassButton
              variant="primary"
              className="flex-grow-1"
              style={{ background: '#FF453A' }}
              onClick={startCapture}
            >
              <Radio size={15} />
              <span>
                {recordedClips[currentSegment.id] ? 'Ghi lại đoạn này' : 'Bắt đầu ghi hình'}
              </span>
            </GlassButton>
          ) : (
            <GlassButton
              className="flex-grow-1"
              style={{ background: '#FFD60A', color: '#000000' }}
              onClick={stopCapture}
            >
              <StopCircle size={15} />
              <span>Dừng ghi hình</span>
            </GlassButton>
          )}

          {activeClipIndex < segments.length - 1 && !isRecording && (
            <GlassButton
              size="sm"
              onClick={() => setActiveClipIndex((prev) => prev + 1)}
            >
              <span>Tiếp &rarr;</span>
            </GlassButton>
          )}
        </div>
      </div>

      {/* Captured Clips Preview List */}
      {recordedCount > 0 && (
        <div className="mb-3">
          <div className="text-secondary small mb-1.5" style={{ fontSize: '0.74rem' }}>
            Đã ghi ({recordedCount}/{segments.length}):
          </div>

          <div className="row g-2">
            {Object.values(recordedClips).map((clip) => (
              <div key={clip.id} className="col-12 col-md-6">
                <div className="p-2.5 rounded-3" style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--glass-border-subtle)' }}>
                  <div className="d-flex align-items-center justify-content-between mb-1.5">
                    <span className="font-monospace text-white small">{clip.name}.webm</span>
                    <GlassPill variant="success">{clip.durationSeconds}s</GlassPill>
                  </div>
                  <div className="rounded-2 overflow-hidden mb-1.5 bg-black" style={{ aspectRatio: '16/9' }}>
                    <video controls src={clip.previewUrl} className="w-100 h-100"></video>
                  </div>
                  <a
                    href={clip.previewUrl}
                    download={`${clip.name}.webm`}
                    className="glass-btn w-100 justify-content-center text-decoration-none"
                    style={{ padding: '4px 8px', fontSize: '0.74rem' }}
                  >
                    <Download size={12} />
                    <span>Lưu đoạn này</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Export Action */}
      <div className="d-flex justify-content-between align-items-center pt-2.5 border-top" style={{ borderColor: 'var(--glass-border-subtle)' }}>
        <div className="small text-secondary" style={{ fontSize: '0.78rem' }}>
          {recordedCount === 0
            ? 'Ghi ít nhất 1 đoạn để xuất video.'
            : `Sẵn sàng ${recordedCount}/${segments.length} đoạn.`}
        </div>

        <GlassButton
          variant="primary"
          onClick={handlePackageAndExport}
          disabled={recordedCount === 0 || isRecording}
        >
          <CheckCircle2 size={15} />
          <span>Xuất các đoạn</span>
        </GlassButton>
      </div>
    </GlassPanel>
  );
};
