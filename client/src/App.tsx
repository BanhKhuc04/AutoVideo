import React, { useState, useEffect } from 'react';
import { Play, Radio, ShieldAlert, Heart } from 'lucide-react';
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
import { validateSegment, isValidYoutubeUrl, secondsToTimeString, timeStringToSeconds } from './utils/timeValidator';
import {
  processVideoApi,
  processBrowserClipsApi,
  getVideoInfoApi,
} from './services/api';

export const App: React.FC = () => {
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState<boolean>(false);

  // Local Output Folder
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

  // Multiple Clip Manager state
  const [segments, setSegments] = useState<Segment[]>([
    {
      id: 'seg-1',
      name: 'Khoảnh khắc mở đầu',
      start: '00:00:05',
      end: '00:00:30',
    },
    {
      id: 'seg-2',
      name: 'Đoạn cao trào',
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
        name: `Đoạn ${clipIndex.toString().padStart(2, '0')}`,
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
        name: `Đoạn ${clipIndex.toString().padStart(2, '0')}`,
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
            name: 'Khoảnh khắc chọn lọc',
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

  // Process Video Action (Option A: Direct Download & Cut)
  const handleProcessVideo = async () => {
    setErrorMessage('');
    setSuggestBrowserCapture(false);

    // 1. Validate Video URL
    if (!videoUrl.trim()) {
      setErrorMessage('Vui lòng dán liên kết video YouTube.');
      setStep('error');
      return;
    }

    if (!isValidYoutubeUrl(videoUrl)) {
      setErrorMessage('Định dạng liên kết YouTube chưa đúng. Vui lòng kiểm tra lại.');
      setStep('error');
      return;
    }

    // 2. Validate all Segments
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

  // Total duration of all segments
  const totalSegmentsDurationSec = segments.reduce((sum, seg) => {
    const start = timeStringToSeconds(seg.start) || 0;
    const end = timeStringToSeconds(seg.end) || 0;
    return sum + Math.max(0, end - start);
  }, 0);

  return (
    <div className="min-vh-100 pb-5" style={{ backgroundColor: 'var(--bg-app)' }}>
      <Header
        onOpenTutorial={() => setShowTutorialModal(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
      />

      <main className="container pt-3" style={{ maxWidth: '980px' }}>
        {/* Completed State: Clip Previews & Direct Local Storage */}
        {step === 'completed' && result && (
          <DownloadResult
            result={result}
            outputFolder={outputFolder}
            onReset={handleReset}
          />
        )}

        {/* Browser Recording Mode Suggestion Banner */}
        {suggestBrowserCapture && (
          <div
            className="apple-card p-4 mb-4 animate-fade-in"
            style={{
              background: 'rgba(255, 159, 10, 0.08)',
              border: '1px solid rgba(255, 159, 10, 0.3)',
            }}
          >
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
              <div className="d-flex align-items-start gap-3">
                <ShieldAlert size={24} style={{ color: '#FF9F0A', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div className="fw-semibold text-white mb-1" style={{ fontSize: '0.92rem' }}>
                    YouTube Hạn Chế Tải Trực Tiếp Video Này
                  </div>
                  <p className="mb-0" style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                    Bạn có thể chuyển sang chế độ <strong>Ghi hình trực tiếp từ tab trình duyệt</strong> để lấy các đoạn video HD sắc nét.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="apple-btn-primary"
                style={{ background: '#FF9F0A', color: '#000000', padding: '8px 16px', fontSize: '0.84rem' }}
                onClick={() => {
                  setSuggestBrowserCapture(false);
                  setStep('idle');
                  setProcessingMode('browser_record');
                }}
              >
                <Radio size={15} />
                <span>Chuyển sang Ghi hình tab</span>
              </button>
            </div>
          </div>
        )}

        {/* Main Workspace (Visible when not in completed state) */}
        {step !== 'completed' && (
          <>
            {/* 1. YouTube URL Input */}
            <VideoUrlInput
              url={videoUrl}
              onChange={setVideoUrl}
              disabled={isProcessing}
              metadata={videoMetadata}
              isLoadingMetadata={isLoadingMetadata}
            />

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

            {/* 4. Local Output Folder */}
            <LocalFolderDestination
              outputFolder={outputFolder}
              onChangeFolder={handleChangeOutputFolder}
              disabled={isProcessing}
            />

            {/* 5. Processing Mode Selector */}
            <div className="apple-card p-4 mb-4">
              <div className="fw-semibold text-white mb-3" style={{ fontSize: '0.92rem' }}>
                Chế độ xử lý
              </div>

              <div className="row g-3 mb-4">
                {/* Mode 1: Best Quality (Direct Download) */}
                <div className="col-12 col-md-6">
                  <div
                    className={`apple-segment-card h-100 ${processingMode === 'download' ? 'active' : ''}`}
                    onClick={() => setProcessingMode('download')}
                  >
                    <div className="d-flex align-items-center gap-2 mb-1.5">
                      <div
                        style={{
                          width: '14px',
                          height: '14px',
                          borderRadius: '50%',
                          border: processingMode === 'download' ? '4.5px solid var(--accent-apple)' : '1.5px solid var(--border-medium)',
                          background: processingMode === 'download' ? '#ffffff' : 'transparent',
                        }}
                      ></div>
                      <span className="fw-semibold text-white" style={{ fontSize: '0.88rem' }}>
                        Chất lượng tốt nhất
                      </span>
                    </div>
                    <div className="small ps-4" style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      Tải và cắt video trực tiếp ở 720p HD sắc nét.
                    </div>
                  </div>
                </div>

                {/* Mode 2: Browser Recording Fallback */}
                <div className="col-12 col-md-6">
                  <div
                    className={`apple-segment-card h-100 ${processingMode === 'browser_record' ? 'active' : ''}`}
                    onClick={() => setProcessingMode('browser_record')}
                  >
                    <div className="d-flex align-items-center gap-2 mb-1.5">
                      <div
                        style={{
                          width: '14px',
                          height: '14px',
                          borderRadius: '50%',
                          border: processingMode === 'browser_record' ? '4.5px solid #FF453A' : '1.5px solid var(--border-medium)',
                          background: processingMode === 'browser_record' ? '#ffffff' : 'transparent',
                        }}
                      ></div>
                      <span className="fw-semibold text-white" style={{ fontSize: '0.88rem' }}>
                        Ghi từ trình duyệt
                      </span>
                    </div>
                    <div className="small ps-4" style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      Dùng khi YouTube không cho phép tải trực tiếp.
                    </div>
                  </div>
                </div>
              </div>

              {/* Mode Specific Actions */}
              {processingMode === 'download' ? (
                <div className="d-flex flex-column align-items-center pt-2">
                  <button
                    type="button"
                    className="apple-btn-primary w-100 justify-content-center"
                    style={{ padding: '14px 28px', fontSize: '1.02rem', borderRadius: '12px' }}
                    onClick={handleProcessVideo}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        <span>Đang xử lý video...</span>
                      </>
                    ) : (
                      <>
                        <Play size={18} fill="#ffffff" strokeWidth={0} />
                        <span>Xuất {segments.length} đoạn video</span>
                      </>
                    )}
                  </button>

                  <div className="small mt-2" style={{ color: 'var(--text-tertiary)', fontSize: '0.78rem' }}>
                    {segments.length} đoạn &bull; {totalSegmentsDurationSec} giây &bull; {selectedResolution} MP4
                  </div>
                </div>
              ) : (
                <BrowserTabRecorder
                  videoUrl={videoUrl}
                  videoTitle={videoMetadata?.title || 'YouTube_Clips'}
                  segments={segments}
                  onFinishRecording={handleFinishBrowserRecording}
                  onCancel={() => setProcessingMode('download')}
                />
              )}
            </div>

            {/* Processing Status Panel (placed below the CTA) */}
            <ProcessStatus step={step} errorMessage={errorMessage} />
          </>
        )}

        {/* Footer */}
        <footer className="text-center mt-5 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <div className="mb-1" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            <strong className="text-white">YouTube Clip Studio</strong> &bull; Công cụ cắt video YouTube chuyên nghiệp
          </div>
          <div className="mb-2" style={{ fontSize: '0.76rem', color: 'var(--text-tertiary)' }}>
            Phát triển bởi <strong className="text-white">vanhkhuc.dev</strong> &bull; Kết nối qua{' '}
            <a
              href="https://www.facebook.com/vanhkhuc2005"
              target="_blank"
              rel="noopener noreferrer"
              className="text-decoration-none"
              style={{ color: 'var(--accent-apple)' }}
            >
              Facebook (vanhkhuc2005)
            </a>
          </div>
          <div className="d-flex align-items-center justify-content-center gap-1" style={{ fontSize: '0.82rem', color: '#FF453A' }}>
            <Heart size={14} fill="#FF453A" />
            <span>Gửi cho em bé iu Trang Vũ &lt;3</span>
          </div>
        </footer>
      </main>

      {/* Onboarding Tutorial Modal */}
      <OnboardingTutorialModal
        isOpen={showTutorialModal}
        onClose={() => setShowTutorialModal(false)}
      />

      {/* Settings Modal */}
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
