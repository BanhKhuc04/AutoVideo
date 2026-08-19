import React, { useState, useRef, useEffect } from 'react';
import { Segment, RecordedClip } from '../types';
import { timeStringToSeconds, formatBytes } from '../utils/timeValidator';

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

  // Tính thời lượng mong muốn của đoạn
  const startSec = timeStringToSeconds(currentSegment?.start) || 0;
  const endSec = timeStringToSeconds(currentSegment?.end) || 0;
  const targetDuration = Math.max(1, endSec - startSec);

  useEffect(() => {
    return () => {
      // Dọn dẹp tài nguyên khi unmount
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
      // Yêu cầu quyền ghi màn hình / tab kèm âm thanh
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'browser',
          frameRate: { ideal: 30, max: 60 },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true, // Yêu cầu người dùng chia sẻ âm thanh
      });

      streamRef.current = stream;

      // Xử lý khi người dùng bấm "Stop sharing" của trình duyệt
      stream.getVideoTracks()[0].onended = () => {
        stopCapture();
      };

      // Chọn codec tối ưu
      let mimeType = 'video/webm; codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm; codecs=vp8';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }

      // Khởi tạo MediaRecorder bitrate 5 Mbps video + 192 kbps audio
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

        const clipNumber = (activeClipIndex + 1).toString().padStart(3, '0');
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

        // Dừng tất cả stream tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }

        setIsRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
      };

      // Bắt đầu ghi với chunks 500ms
      recorder.start(500);
      setIsRecording(true);
      setElapsedSeconds(0);

      // Đếm giây và tự động dừng khi kết thúc
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
        setErrorMessage(err.message || 'Không thể bắt đầu ghi màn hình/tab trình duyệt.');
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
      setErrorMessage('Vui lòng ghi ít nhất 1 đoạn video trước khi đóng gói.');
      return;
    }
    onFinishRecording(recordedList);
  };

  const recordedCount = Object.keys(recordedClips).length;
  const progressPercent = targetDuration > 0 ? Math.min(100, (elapsedSeconds / targetDuration) * 100) : 0;

  return (
    <div className="card shadow-lg border-primary mb-4 bg-dark-subtle">
      <div className="card-header bg-primary text-white py-3 px-4 d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <i className="bi bi-record-circle-fill fs-5 text-danger"></i>
          <div>
            <h5 className="mb-0 fw-bold">Phòng Thu Ghi Hình Tab Trình Duyệt (Chất lượng cao 5 Mbps)</h5>
            {videoTitle && <small className="opacity-75">{videoTitle}</small>}
          </div>
        </div>
        <button
          type="button"
          className="btn btn-outline-light btn-sm"
          onClick={onCancel}
          disabled={isRecording}
        >
          <i className="bi bi-arrow-left me-1"></i> Quay lại bộ tải tự động
        </button>
      </div>

      <div className="card-body p-4">
        {/* Instructions banner */}
        <div className="alert alert-info py-2 px-3 mb-3 d-flex align-items-center gap-2 small">
          <i className="bi bi-info-circle-fill fs-5 flex-shrink-0 text-info"></i>
          <div>
            <strong>Hướng dẫn:</strong> Khi bạn bấm <em>Bắt đầu ghi hình</em>, hãy chọn <strong>Tab trình duyệt này</strong> và nhớ tích chọn <strong>"Chia sẻ âm thanh của thẻ" (Also share tab audio)</strong>. Bấm phát video, công cụ sẽ tự động ghi hình ở bitrate <strong>5 Mbps HD</strong> và tự động dừng khi hết thời gian!
          </div>
        </div>

        {errorMessage && (
          <div className="alert alert-danger py-2 px-3 mb-3 d-flex align-items-center justify-content-between small">
            <span>{errorMessage}</span>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={() => setErrorMessage('')}
            ></button>
          </div>
        )}

        {/* Clip Queue Selector */}
        <div className="mb-4">
          <label className="form-label small fw-bold text-secondary mb-2">
            Chọn đoạn để ghi hình (Đã ghi: {recordedCount}/{segments.length} đoạn):
          </label>
          <div className="d-flex gap-2 overflow-x-auto pb-2">
            {segments.map((seg, idx) => {
              const isSelected = idx === activeClipIndex;
              const isRecorded = !!recordedClips[seg.id];
              return (
                <button
                  key={seg.id}
                  type="button"
                  className={`btn btn-sm d-flex align-items-center gap-2 text-nowrap ${
                    isSelected
                      ? 'btn-primary shadow'
                      : isRecorded
                      ? 'btn-outline-success'
                      : 'btn-outline-secondary'
                  }`}
                  onClick={() => !isRecording && setActiveClipIndex(idx)}
                  disabled={isRecording}
                >
                  {isRecorded ? (
                    <i className="bi bi-check-circle-fill text-success"></i>
                  ) : (
                    <i className="bi bi-film"></i>
                  )}
                  <span>{seg.name || `Đoạn ${idx + 1}`}</span>
                  <span className="badge bg-dark font-monospace" style={{ fontSize: '0.7rem' }}>
                    {seg.start} - {seg.end}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Recording Workspace */}
        <div className="card bg-body-tertiary border-secondary-subtle mb-4">
          <div className="card-body p-4">
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
              <div>
                <span className="badge bg-primary me-2">Đoạn Đang Chọn</span>
                <h5 className="d-inline fw-bold text-white">
                  {currentSegment.name || `Đoạn #${activeClipIndex + 1}`}
                </h5>
              </div>
              <div className="text-secondary small font-monospace">
                Thời gian: <strong className="text-white">{currentSegment.start}</strong> &rarr;{' '}
                <strong className="text-white">{currentSegment.end}</strong> ({targetDuration} giây) &bull; Chất lượng: <strong className="text-info">5 Mbps HD</strong>
              </div>
            </div>

            {/* Live Recording Progress Indicator */}
            {isRecording && (
              <div className="p-3 mb-3 bg-dark rounded border border-danger">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div className="d-flex align-items-center gap-2 text-danger">
                    <span className="spinner-grow spinner-grow-sm" role="status"></span>
                    <strong className="font-monospace">
                      ĐANG GHI HÌNH TAB: {elapsedSeconds}s / {targetDuration}s
                    </strong>
                  </div>
                  <span className="small text-secondary font-monospace">
                    Tự động dừng sau: {Math.max(0, targetDuration - elapsedSeconds)}s
                  </span>
                </div>
                <div className="progress" style={{ height: '8px' }}>
                  <div
                    className="progress-bar bg-danger progress-bar-striped progress-bar-animated"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="d-flex flex-wrap gap-3">
              {!isRecording ? (
                <button
                  type="button"
                  className="btn btn-danger btn-lg flex-grow-1 d-flex align-items-center justify-content-center gap-2 shadow"
                  onClick={startCapture}
                >
                  <i className="bi bi-record-circle fs-4"></i>
                  <span className="fw-bold">
                    {recordedClips[currentSegment.id] ? 'Ghi hình lại đoạn này (5 Mbps HD)' : 'Bắt đầu ghi hình (Chia sẻ tab & âm thanh)'}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-warning btn-lg flex-grow-1 d-flex align-items-center justify-content-center gap-2 shadow fw-bold text-dark"
                  onClick={stopCapture}
                >
                  <i className="bi bi-stop-circle-fill fs-4"></i>
                  <span>Dừng ghi hình ngay</span>
                </button>
              )}

              {activeClipIndex < segments.length - 1 && !isRecording && (
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setActiveClipIndex((prev) => prev + 1)}
                >
                  Đoạn tiếp theo &rarr;
                </button>
              )}
            </div>
          </div>
        </div>

        {/* List of Captured Clips */}
        {recordedCount > 0 && (
          <div className="mb-4">
            <h6 className="fw-bold text-white mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-collection-play-fill text-success"></i>
              Danh sách các đoạn đã ghi ({recordedCount}/{segments.length}):
            </h6>

            <div className="row g-3">
              {Object.values(recordedClips).map((clip) => (
                <div key={clip.id} className="col-12 col-md-6">
                  <div className="card bg-body-tertiary border-secondary-subtle h-100">
                    <div className="card-body p-3">
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <span className="fw-bold text-white font-monospace">{clip.name}.webm</span>
                        <span className="badge bg-success-subtle text-success">
                          {clip.durationSeconds}s &bull; {formatBytes(clip.blob.size)}
                        </span>
                      </div>

                      <div className="ratio ratio-16x9 rounded overflow-hidden mb-2 bg-black">
                        <video controls src={clip.previewUrl} className="w-100 h-100"></video>
                      </div>

                      <a
                        href={clip.previewUrl}
                        download={`${clip.name}.webm`}
                        className="btn btn-outline-secondary btn-sm w-100 d-flex align-items-center justify-content-center gap-1"
                      >
                        <i className="bi bi-download"></i> Tải riêng đoạn này về máy
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Global Export Button */}
        <div className="d-flex justify-content-between align-items-center pt-3 border-top border-secondary-subtle">
          <div className="text-secondary small">
            {recordedCount === 0
              ? 'Hãy ghi ít nhất 1 đoạn để đóng gói.'
              : `Đã sẵn sàng ${recordedCount}/${segments.length} đoạn để đóng gói.`}
          </div>

          <button
            type="button"
            className="btn btn-success btn-lg px-4 d-flex align-items-center gap-2 shadow"
            onClick={handlePackageAndExport}
            disabled={recordedCount === 0 || isRecording}
          >
            <i className="bi bi-file-earmark-zip-fill fs-5"></i>
            <span>Đóng gói tất cả các đoạn đã ghi &rarr;</span>
          </button>
        </div>
      </div>
    </div>
  );
};
