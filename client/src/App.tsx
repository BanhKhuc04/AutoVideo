import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { VideoUrlInput } from './components/VideoUrlInput';
import { VideoPlayerPreview } from './components/VideoPlayerPreview';
import { SegmentList } from './components/SegmentList';
import { LocalFolderDestination } from './components/LocalFolderDestination';
import { ProcessStatus } from './components/ProcessStatus';
import { DownloadResult } from './components/DownloadResult';
import { BrowserTabRecorder } from './components/BrowserTabRecorder';
import { OnboardingTutorialModal } from './components/OnboardingTutorialModal';
import { SettingsModal } from './components/SettingsModal';
import {
  Segment,
  ProcessingStep,
  ProcessingMode,
  ProcessVideoResponse,
  VideoMetadata,
  RecordedClip,
} from './types';
import { validateSegment, isValidYoutubeUrl, secondsToTimeString } from './utils/timeValidator';
import {
  processVideoApi,
  processBrowserClipsApi,
  getVideoInfoApi,
} from './services/api';

export const App: React.FC = () => {
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState<boolean>(false);

  // Local Output Folder (e.g. Google Drive Desktop sync folder or local path)
  const [outputFolder, setOutputFolder] = useState<string>(() => {
    return localStorage.getItem('default_output_folder') || '';
  });

  // Processing Mode: 'download' | 'browser_record'
  const [processingMode, setProcessingMode] = useState<ProcessingMode>('download');
  const [suggestBrowserCapture, setSuggestBrowserCapture] = useState<boolean>(false);

  // Video Settings
  const [selectedResolution, setSelectedResolution] = useState<'720p' | '1080p'>('720p');

  // Modals state
  const [showTutorialModal, setShowTutorialModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  // Multiple Clip Manager state with simplified naming
  const [segments, setSegments] = useState<Segment[]>([
    {
      id: 'seg-1',
      name: 'khoảnh khắc mở đầu',
      start: '00:00:05',
      end: '00:00:30',
    },
    {
      id: 'seg-2',
      name: 'đoạn cao trào',
      start: '00:00:35',
      end: '00:01:05',
    },
  ]);

  const [step, setStep] = useState<ProcessingStep>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [result, setResult] = useState<ProcessVideoResponse | null>(null);

  const isProcessing = step === 'downloading' || step === 'processing' || step === 'zipping';

  // Check first-time user tutorial on mount
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('has_seen_tutorial');
    if (!hasSeenTutorial) {
      setShowTutorialModal(true);
    }
  }, []);

  const handleChangeOutputFolder = (folder: string) => {
    setOutputFolder(folder);
    if (folder.trim()) {
      localStorage.setItem('default_output_folder', folder.trim());
    } else {
      localStorage.removeItem('default_output_folder');
    }
  };

  // Automatically fetch video metadata when a valid YouTube URL is entered
  useEffect(() => {
    if (!videoUrl.trim() || !isValidYoutubeUrl(videoUrl)) {
      setVideoMetadata(null);
      return;
    }

    let isMounted = true;
    const fetchInfo = async () => {
      setIsLoadingMetadata(true);
      try {
        const meta = await getVideoInfoApi(videoUrl.trim());
        if (isMounted) {
          setVideoMetadata(meta);
          // Validate existing segments against total duration
          if (meta?.duration && meta.duration > 0) {
            setSegments((prev) =>
              prev.map((seg) => {
                const err = validateSegment(seg.start, seg.end, meta.duration);
                return { ...seg, error: err || undefined };
              })
            );
          }
        }
      } catch {
        if (isMounted) setVideoMetadata(null);
      } finally {
        if (isMounted) setIsLoadingMetadata(false);
      }
    };

    const debounceTimer = setTimeout(fetchInfo, 600);
    return () => {
      isMounted = false;
      clearTimeout(debounceTimer);
    };
  }, [videoUrl]);

  // Add a new clip
  const handleAddSegment = () => {
    const newId = `seg-${Date.now()}`;
    const clipIndex = segments.length + 1;
    const lastSeg = segments[segments.length - 1];

    setSegments([
      ...segments,
      {
        id: newId,
        name: `doan_${clipIndex.toString().padStart(3, '0')}`,
        start: lastSeg?.end || '',
        end: '',
      },
    ]);
  };

  // Add marker starting at specific timestamp from timeline
  const handleAddMarkerAtTime = (timeSec: number) => {
    const maxDur = videoMetadata?.duration || 0;
    const endSec = maxDur > 0 ? Math.min(timeSec + 30, maxDur) : timeSec + 30;
    const startStr = secondsToTimeString(timeSec);
    const endStr = secondsToTimeString(endSec);
    const newId = `seg-${Date.now()}`;
    const clipIndex = segments.length + 1;

    setSegments((prev) => [
      ...prev,
      {
        id: newId,
        name: `doan_${clipIndex.toString().padStart(3, '0')}`,
        start: startStr,
        end: endStr,
      },
    ]);
  };

  // Set start or end timestamp of active/last segment to playhead time
  const handleSetSegmentTime = (type: 'start' | 'end', timeSec: number) => {
    const timeStr = secondsToTimeString(timeSec);
    const maxDur = videoMetadata?.duration;
    setSegments((prev) => {
      if (prev.length === 0) {
        return [
          {
            id: `seg-${Date.now()}`,
            name: 'khoảnh khắc chọn lọc',
            start: type === 'start' ? timeStr : '00:00:00',
            end: type === 'end' ? timeStr : '',
          },
        ];
      }
      const updated = [...prev];
      const targetIndex = updated.length - 1;
      const updatedSeg = {
        ...updated[targetIndex],
        [type]: timeStr,
      };
      const err = validateSegment(updatedSeg.start, updatedSeg.end, maxDur);
      updated[targetIndex] = {
        ...updatedSeg,
        error: err || undefined,
      };
      return updated;
    });
  };

  // Update segment field with instant validation
  const handleUpdateSegment = (
    id: string,
    field: 'name' | 'start' | 'end',
    value: string
  ) => {
    const maxDur = videoMetadata?.duration;
    setSegments((prev) =>
      prev.map((seg) => {
        if (seg.id !== id) return seg;
        const updated = { ...seg, [field]: value };
        if (field === 'start' || field === 'end') {
          const err = validateSegment(
            field === 'start' ? value : seg.start,
            field === 'end' ? value : seg.end,
            maxDur
          );
          updated.error = err || undefined;
        } else {
          updated.error = undefined;
        }
        return updated;
      })
    );
  };

  // Delete segment
  const handleDeleteSegment = (id: string) => {
    if (segments.length <= 1) return;
    setSegments((prev) => prev.filter((s) => s.id !== id));
  };

  // Reorder: Move Up
  const handleMoveUp = (id: string) => {
    const index = segments.findIndex((s) => s.id === id);
    if (index <= 0) return;
    const newSegments = [...segments];
    const temp = newSegments[index - 1];
    newSegments[index - 1] = newSegments[index];
    newSegments[index] = temp;
    setSegments(newSegments);
  };

  // Reorder: Move Down
  const handleMoveDown = (id: string) => {
    const index = segments.findIndex((s) => s.id === id);
    if (index < 0 || index >= segments.length - 1) return;
    const newSegments = [...segments];
    const temp = newSegments[index + 1];
    newSegments[index + 1] = newSegments[index];
    newSegments[index] = temp;
    setSegments(newSegments);
  };

  // Reset workflow
  const handleReset = () => {
    setStep('idle');
    setErrorMessage('');
    setSuggestBrowserCapture(false);
    setResult(null);
  };

  // Process Video Action (Option A: Download via yt-dlp + FFmpeg)
  const handleProcessVideo = async () => {
    setErrorMessage('');
    setSuggestBrowserCapture(false);

    // 1. Validate Video URL
    if (!videoUrl.trim()) {
      setErrorMessage('Vui lòng dán đường dẫn video YouTube bạn muốn cắt.');
      setStep('error');
      return;
    }

    if (!isValidYoutubeUrl(videoUrl)) {
      setErrorMessage('Định dạng liên kết YouTube chưa đúng. Vui lòng kiểm tra lại.');
      setStep('error');
      return;
    }

    // 2. Validate all Segments (including against video total duration)
    let hasSegmentError = false;
    const maxDur = videoMetadata?.duration;
    const validatedSegments = segments.map((seg) => {
      const error = validateSegment(seg.start, seg.end, maxDur);
      if (error) {
        hasSegmentError = true;
        return { ...seg, error };
      }
      return { ...seg, error: undefined };
    });

    setSegments(validatedSegments);

    if (hasSegmentError) {
      setErrorMessage('Vui lòng kiểm tra và sửa lại các mốc thời gian bị lỗi.');
      setStep('error');
      return;
    }

    // 3. Initiate processing pipeline
    setResult(null);
    setStep('downloading');

    const timer1 = setTimeout(() => {
      setStep((curr) => (curr === 'downloading' ? 'processing' : curr));
    }, 4500);

    const timer2 = setTimeout(() => {
      setStep((curr) => (curr === 'processing' ? 'zipping' : curr));
    }, 12000);

    try {
      const response = await processVideoApi({
        videoUrl: videoUrl.trim(),
        segments: segments.map((s) => ({
          id: s.id,
          name: s.name?.trim(),
          start: s.start.trim(),
          end: s.end.trim(),
        })),
        outputFolder: outputFolder.trim() || undefined,
      });

      clearTimeout(timer1);
      clearTimeout(timer2);

      setStep('completed');
      setResult(response);
    } catch (err: any) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setStep('error');
      setErrorMessage(
        err.message || 'Không thể xử lý video. Vui lòng kiểm tra lại liên kết hoặc chuyển sang chế độ Ghi hình tab.'
      );
      if (err.suggestBrowserCapture) {
        setSuggestBrowserCapture(true);
      }
    }
  };

  // Handle completion from Browser Tab Recording (Option B)
  const handleFinishBrowserRecording = async (recordedClips: RecordedClip[]) => {
    setErrorMessage('');
    setStep('zipping');

    try {
      const title = videoMetadata?.title || 'YouTube_Recorded_Clips';
      const response = await processBrowserClipsApi(title, recordedClips, outputFolder.trim() || undefined);

      setStep('completed');
      setResult(response);
    } catch (err: any) {
      setStep('error');
      setErrorMessage(err.message || 'Không thể xử lý các đoạn video ghi hình.');
    }
  };

  return (
    <div className="min-vh-100 bg-dark text-light pb-5">
      <Header
        onOpenTutorial={() => setShowTutorialModal(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
      />

      <main className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-lg-10 col-xl-9">
            {/* Completed State: Clip Previews & 2 Export Options (MP4 or ZIP) */}
            {step === 'completed' && result && (
              <DownloadResult
                result={result}
                outputFolder={outputFolder}
                onReset={handleReset}
              />
            )}

            {/* Error Message & Auto Browser Recording Suggestion */}
            {suggestBrowserCapture && (
              <div className="card border-warning mb-4 bg-warning-subtle text-dark shadow">
                <div className="card-body p-4 d-flex align-items-center justify-content-between flex-wrap gap-3">
                  <div className="d-flex align-items-start gap-3">
                    <i className="bi bi-shield-exclamation fs-1 text-warning flex-shrink-0"></i>
                    <div>
                      <h5 className="fw-bold mb-1">YouTube Hạn Chế Tải Trực Tiếp Video Này</h5>
                      <p className="mb-0 small">
                        Video này bị YouTube bảo vệ quyền tải về trực tiếp. Đừng lo, bạn có thể chuyển sang chế độ <strong>Ghi hình trực tiếp từ tab trình duyệt</strong> để lấy các đoạn video HD sắc nét!
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-dark btn-lg fw-bold d-flex align-items-center gap-2 shadow"
                    onClick={() => {
                      setSuggestBrowserCapture(false);
                      setStep('idle');
                      setProcessingMode('browser_record');
                    }}
                  >
                    <i className="bi bi-record-circle text-danger"></i>
                    <span>Chuyển sang Phòng Thu Ghi Hình Tab &rarr;</span>
                  </button>
                </div>
              </div>
            )}

            {/* Input Form & Preview (visible when not completed) */}
            {step !== 'completed' && (
              <>
                {/* 1. YouTube URL Input */}
                <VideoUrlInput
                  url={videoUrl}
                  onChange={setVideoUrl}
                  disabled={isProcessing}
                />

                {isLoadingMetadata && (
                  <div className="text-center py-2 text-secondary small">
                    <span className="spinner-border spinner-border-sm me-2 text-primary" role="status"></span>
                    Đang tải thông tin video và mốc thời gian từ YouTube...
                  </div>
                )}

                {/* 2. Video Preview Player & Interactive Timeline */}
                {videoUrl && isValidYoutubeUrl(videoUrl) && (
                  <VideoPlayerPreview
                    videoUrl={videoUrl}
                    metadata={videoMetadata}
                    segments={segments}
                    onAddMarkerAtTime={handleAddMarkerAtTime}
                    onSetSegmentTime={handleSetSegmentTime}
                  />
                )}

                {/* 3. Multiple Clip Manager */}
                <SegmentList
                  segments={segments}
                  disabled={isProcessing}
                  onAddSegment={handleAddSegment}
                  onUpdateSegment={handleUpdateSegment}
                  onDeleteSegment={handleDeleteSegment}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                />

                {/* 4. Local Output Folder (Google Drive Desktop Sync) */}
                <LocalFolderDestination
                  outputFolder={outputFolder}
                  onChangeFolder={handleChangeOutputFolder}
                  disabled={isProcessing}
                />

                {/* 5. Processing Method Selector */}
                <div className="card shadow-sm border-0 bg-dark-subtle mb-4">
                  <div className="card-header bg-body-tertiary border-secondary-subtle py-3 px-4">
                    <h6 className="mb-0 fw-bold d-flex align-items-center gap-2 text-white">
                      <i className="bi bi-cpu-fill text-primary"></i>
                      <span>Chọn Phương Thức Xử Lý Video</span>
                    </h6>
                  </div>

                  <div className="card-body p-4">
                    <div className="row g-3 mb-4">
                      {/* Option A: Download Original Quality */}
                      <div className="col-12 col-md-6">
                        <div
                          className={`p-3 rounded-3 border h-100 cursor-pointer transition-all ${
                            processingMode === 'download'
                              ? 'bg-primary-subtle border-primary text-primary shadow-sm'
                              : 'bg-body-tertiary border-secondary-subtle text-secondary'
                          }`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setProcessingMode('download')}
                        >
                          <div className="form-check d-flex align-items-center gap-2 mb-2">
                            <input
                              className="form-check-input"
                              type="radio"
                              name="processingMode"
                              id="modeDownload"
                              checked={processingMode === 'download'}
                              onChange={() => setProcessingMode('download')}
                            />
                            <label className="form-check-label fw-bold text-white fs-6" htmlFor="modeDownload">
                              Lựa chọn 1: Tải Video Gốc (720p HD MP4)
                            </label>
                          </div>
                          <p className="small mb-0 opacity-75">
                            Tự động tải và cắt bằng <strong>yt-dlp &amp; FFmpeg</strong>. Xuất video MP4 H.264 / AAC 192k sắc nét.
                          </p>
                        </div>
                      </div>

                      {/* Option B: Browser Tab Recording */}
                      <div className="col-12 col-md-6">
                        <div
                          className={`p-3 rounded-3 border h-100 cursor-pointer transition-all ${
                            processingMode === 'browser_record'
                              ? 'bg-danger-subtle border-danger text-danger shadow-sm'
                              : 'bg-body-tertiary border-secondary-subtle text-secondary'
                          }`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setProcessingMode('browser_record')}
                        >
                          <div className="form-check d-flex align-items-center gap-2 mb-2">
                            <input
                              className="form-check-input"
                              type="radio"
                              name="processingMode"
                              id="modeBrowser"
                              checked={processingMode === 'browser_record'}
                              onChange={() => setProcessingMode('browser_record')}
                            />
                            <label className="form-check-label fw-bold text-white fs-6" htmlFor="modeBrowser">
                              Lựa chọn 2: Ghi Hình Tab (5 Mbps HD)
                            </label>
                          </div>
                          <p className="small mb-0 opacity-75">
                            Ghi lại trực tiếp hình ảnh và âm thanh từ tab trình duyệt ở <strong>5 Mbps HD</strong>. Chống chặn 100% khi video bị hạn chế.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Mode Specific Action Views */}
                    {processingMode === 'download' ? (
                      <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 pt-2 border-top border-secondary-subtle">
                        <div>
                          <h6 className="fw-bold mb-1 text-white">Bạn đã sẵn sàng cắt video?</h6>
                          <p className="text-secondary small mb-0">
                            {segments.length} đoạn sẽ được trích xuất ở chuẩn 720p và lưu vào thư mục máy tính.
                          </p>
                        </div>

                        <button
                          type="button"
                          className="btn btn-danger btn-lg px-4 py-2 fw-bold d-flex align-items-center gap-2 shadow"
                          onClick={handleProcessVideo}
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <>
                              <span
                                className="spinner-border spinner-border-sm"
                                role="status"
                                aria-hidden="true"
                              ></span>
                              <span>Đang Tải &amp; Cắt Video 720p...</span>
                            </>
                          ) : (
                            <>
                              <i className="bi bi-play-circle-fill fs-5"></i>
                              <span>Bắt Đầu Xử Lý Video</span>
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      /* Option B: Browser Tab Recorder component */
                      <BrowserTabRecorder
                        videoUrl={videoUrl}
                        videoTitle={videoMetadata?.title || 'YouTube_Clips'}
                        segments={segments}
                        onFinishRecording={handleFinishBrowserRecording}
                        onCancel={() => setProcessingMode('download')}
                      />
                    )}
                  </div>
                </div>

                {/* Processing Status View placed below the action section */}
                <ProcessStatus step={step} errorMessage={errorMessage} />
              </>
            )}

            {/* Footer with Author Copyright & Links */}
            <footer className="text-center text-secondary small mt-5 pt-4 border-top border-secondary-subtle">
              <div className="mb-2">
                <strong className="text-white">YouTube Clip Studio Pro</strong> &bull; Công cụ cắt video YouTube chuyên nghiệp cho Content Creator
              </div>
              <p className="mb-2 text-secondary">
                Sản phẩm được phát triển bởi{' '}
                <strong className="text-info">vanhkhuc.dev</strong> &bull; Kết nối qua{' '}
                <a
                  href="https://www.facebook.com/vanhkhuc2005"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary text-decoration-none fw-semibold"
                >
                  <i className="bi bi-facebook me-1"></i>Facebook (vanhkhuc2005)
                </a>
              </p>
              <p className="mb-0 text-danger fw-semibold" style={{ fontSize: '0.85rem' }}>
                <i className="bi bi-heart-fill text-danger me-1"></i> Gửi cho em bé iu Trang Vũ &lt;3
              </p>
            </footer>
          </div>
        </div>
      </main>

      {/* Onboarding Tutorial Modal (4 Steps) */}
      <OnboardingTutorialModal
        isOpen={showTutorialModal}
        onClose={() => setShowTutorialModal(false)}
      />

      {/* Settings Modal (Google Drive Sync, Quality, Binaries Status) */}
      <SettingsModal
        isOpen={showSettingsModal}
        outputFolder={outputFolder}
        selectedResolution={selectedResolution}
        onChangeFolder={handleChangeOutputFolder}
        onChangeResolution={setSelectedResolution}
        onOpenTutorial={() => {
          setShowSettingsModal(false);
          setShowTutorialModal(true);
        }}
        onClose={() => setShowSettingsModal(false)}
      />
    </div>
  );
};
