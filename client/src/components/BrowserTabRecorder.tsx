import React, { useState, useRef, useEffect } from 'react';
import { Radio, ArrowLeft, StopCircle, CheckCircle2, Film, Download, AlertCircle, Info } from 'lucide-react';
import { Segment, RecordedClip } from '../types';
import { timeStringToSeconds } from '../utils/timeValidator';

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
    <div className="apple-card p-4 mb-4">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-3 pb-3 flex-wrap gap-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="d-flex align-items-center gap-2">
          <Radio size={18} color="#FF453A" />
          <div>
            <div className="fw-semibold text-white" style={{ fontSize: '0.92rem' }}>
              Phòng thu ghi hình tab trình duyệt
            </div>
            {videoTitle && <div className="small" style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>{videoTitle}</div>}
          </div>
        </div>
        <button
          type="button"
          className="apple-btn-secondary"
          style={{ padding: '5px 12px', fontSize: '0.8rem' }}
          onClick={onCancel}
          disabled={isRecording}
        >
          <ArrowLeft size={14} />
          <span>Quay lại</span>
        </button>
      </div>

      {/* Guide Banner */}
      <div className="p-3 mb-3 apple-card-inner d-flex align-items-center gap-2.5" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
        <Info size={18} style={{ color: 'var(--accent-apple)', flexShrink: 0 }} />
        <div>
          Chọn <strong>Tab trình duyệt này</strong> và tích chọn <strong>"Chia sẻ âm thanh của thẻ" (Also share tab audio)</strong>. Hệ thống sẽ tự động ghi hình ở chuẩn HD và dừng khi hết mốc giờ.
        </div>
      </div>

      {errorMessage && (
        <div className="d-flex align-items-center gap-2 p-2.5 px-3 mb-3 rounded-2" style={{ background: 'rgba(255, 69, 58, 0.1)', color: 'var(--color-danger)', fontSize: '0.8rem' }}>
          <AlertCircle size={15} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Clip Selector Tabs */}
      <div className="mb-3">
        <div className="text-secondary small mb-2" style={{ fontSize: '0.76rem' }}>
          Chọn đoạn để ghi ({recordedCount}/{segments.length} đoạn đã hoàn thành):
        </div>
        <div className="d-flex gap-2 overflow-x-auto pb-2">
          {segments.map((seg, idx) => {
            const isSelected = idx === activeClipIndex;
            const isRecorded = !!recordedClips[seg.id];
            return (
              <button
                key={seg.id}
                type="button"
                className={isSelected ? 'apple-btn-primary' : 'apple-btn-secondary'}
                style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '8px' }}
                onClick={() => !isRecording && setActiveClipIndex(idx)}
                disabled={isRecording}
              >
                {isRecorded ? (
                  <CheckCircle2 size={13} style={{ color: 'var(--color-success)' }} />
                ) : (
                  <Film size={13} />
                )}
                <span>{seg.name || `Đoạn ${idx + 1}`}</span>
                <span className="font-monospace opacity-75" style={{ fontSize: '0.72rem' }}>
                  {seg.start} - {seg.end}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Workspace */}
      <div className="apple-card-inner p-3.5 mb-3">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <div className="d-flex align-items-center gap-2">
            <span className="apple-pill-accent" style={{ fontSize: '0.72rem' }}>
              Đang chọn
            </span>
            <span className="fw-semibold text-white" style={{ fontSize: '0.88rem' }}>
              {currentSegment.name || `Đoạn #${activeClipIndex + 1}`}
            </span>
          </div>
          <div className="font-monospace small" style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
            {currentSegment.start} &rarr; {currentSegment.end} ({targetDuration} giây)
          </div>
        </div>

        {/* Live Indicator */}
        {isRecording && (
          <div className="p-3 mb-3 rounded-2" style={{ background: 'rgba(255, 69, 58, 0.08)', border: '1px solid rgba(255, 69, 58, 0.3)' }}>
            <div className="d-flex align-items-center justify-content-between mb-2">
              <div className="d-flex align-items-center gap-2" style={{ color: 'var(--color-danger)', fontSize: '0.82rem' }}>
                <Radio size={14} className="animate-pulse" />
                <strong className="font-monospace">
                  ĐANG GHI HÌNH: {elapsedSeconds}s / {targetDuration}s
                </strong>
              </div>
              <span className="font-monospace small" style={{ color: 'var(--text-tertiary)', fontSize: '0.74rem' }}>
                Còn lại: {Math.max(0, targetDuration - elapsedSeconds)}s
              </span>
            </div>
            <div className="rounded-pill overflow-hidden" style={{ height: '5px', background: 'var(--bg-surface-3)' }}>
              <div
                className="h-100 rounded-pill"
                style={{
                  width: `${progressPercent}%`,
                  background: 'var(--color-danger)',
                  transition: 'width 300ms ease',
                }}
              ></div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="d-flex flex-wrap gap-2">
          {!isRecording ? (
            <button
              type="button"
              className="apple-btn-primary flex-grow-1"
              style={{ background: '#FF453A', padding: '10px 18px', fontSize: '0.88rem' }}
              onClick={startCapture}
            >
              <Radio size={16} />
              <span>
                {recordedClips[currentSegment.id] ? 'Ghi hình lại đoạn này' : 'Bắt đầu ghi hình'}
              </span>
            </button>
          ) : (
            <button
              type="button"
              className="apple-btn-secondary flex-grow-1"
              style={{ background: '#FFD60A', color: '#000000', padding: '10px 18px', fontSize: '0.88rem' }}
              onClick={stopCapture}
            >
              <StopCircle size={16} />
              <span>Dừng ghi hình</span>
            </button>
          )}

          {activeClipIndex < segments.length - 1 && !isRecording && (
            <button
              type="button"
              className="apple-btn-secondary"
              onClick={() => setActiveClipIndex((prev) => prev + 1)}
            >
              <span>Đoạn tiếp theo &rarr;</span>
            </button>
          )}
        </div>
      </div>

      {/* Captured Clips Preview List */}
      {recordedCount > 0 && (
        <div className="mb-3">
          <div className="text-secondary small mb-2" style={{ fontSize: '0.76rem' }}>
            Các đoạn đã ghi ({recordedCount}/{segments.length}):
          </div>

          <div className="row g-2">
            {Object.values(recordedClips).map((clip) => (
              <div key={clip.id} className="col-12 col-md-6">
                <div className="apple-card-inner p-2.5">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="font-monospace text-white small">{clip.name}.webm</span>
                    <span className="apple-pill font-monospace" style={{ fontSize: '0.7rem' }}>
                      {clip.durationSeconds}s
                    </span>
                  </div>
                  <div className="ratio ratio-16x9 rounded-2 overflow-hidden mb-2 bg-black">
                    <video controls src={clip.previewUrl} className="w-100 h-100"></video>
                  </div>
                  <a
                    href={clip.previewUrl}
                    download={`${clip.name}.webm`}
                    className="apple-btn-secondary w-100 justify-content-center"
                    style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                  >
                    <Download size={13} />
                    <span>Lưu đoạn này</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Export Action */}
      <div className="d-flex justify-content-between align-items-center pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <div className="small" style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
          {recordedCount === 0
            ? 'Hãy ghi ít nhất 1 đoạn để xuất video.'
            : `Đã sẵn sàng ${recordedCount}/${segments.length} đoạn.`}
        </div>

        <button
          type="button"
          className="apple-btn-primary"
          onClick={handlePackageAndExport}
          disabled={recordedCount === 0 || isRecording}
        >
          <CheckCircle2 size={16} />
          <span>Xuất các đoạn đã ghi</span>
        </button>
      </div>
    </div>
  );
};
