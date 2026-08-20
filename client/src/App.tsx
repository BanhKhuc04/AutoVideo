import React, { useState, useEffect } from 'react';
import { Download, Play } from 'lucide';
import { Radio, ShieldAlert } from 'lucide-react';
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
import { CommandPalette } from './components/glass/CommandPalette';
import { GlassPanel } from './components/glass/GlassPanel';
import { GlassButton } from './components/glass/GlassButton';
import { GlassSegmentedControl } from './components/glass/GlassSegmentedControl';
import { GlassPill } from './components/glass/GlassPill';
import { MorphIconWrapper } from './components/glass/MorphIconWrapper';
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
  const [videoUrl, setVideoUrl] = useState<string>(() => {
    return localStorage.getItem('setting_remember_last_url') === 'true'
      ? localStorage.getItem('last_video_url') || ''
      : '';
  });
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState<boolean>(false);

  // Local Output Folder
  const [outputFolder, setOutputFolder] = useState<string>(() => {
    return localStorage.getItem('default_output_folder') || '';
  });

  // Processing Mode: 'download' | 'browser_record'
  const [processingMode, setProcessingMode] = useState<ProcessingMode>('download');
  const [suggestBrowserCapture, setSuggestBrowserCapture] = useState<boolean>(false);

  // Video Settings: 720p / 1080p
  const [selectedResolution, setSelectedResolution] = useState<'720p' | '1080p'>(() => {
    return (localStorage.getItem('default_resolution') as '720p' | '1080p') || '720p';
  });

  // Modals state
  const [showTutorialModal, setShowTutorialModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showCommandPalette, setShowCommandPalette] = useState<boolean>(false);

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

  const handleChangeResolution = (res: '720p' | '1080p') => {
    setSelectedResolution(res);
    localStorage.setItem('default_resolution', res);
  };

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

    if (localStorage.getItem('setting_remember_last_url') === 'true') {
      localStorage.setItem('last_video_url', videoUrl.trim());
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

    const debounceTimer = setTimeout(fetchInfo, 500);
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
        quality: selectedResolution,
      });

      clearTimeout(timer1);
      clearTimeout(timer2);

      setStep('completed');
      setResult(response);

      // Auto open folder if enabled in settings
      const autoOpen = localStorage.getItem('setting_auto_open_folder') !== 'false';
      if (autoOpen && (window as any).electronAPI?.openFolder) {
        const pathOpen = response.localSavedPath || outputFolder;
        if (pathOpen) (window as any).electronAPI.openFolder(pathOpen);
      }
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

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputFocused =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Command Palette: Ctrl + K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
        return;
      }

      // Settings: Ctrl + ,
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setShowSettingsModal(true);
        return;
      }

      // Export: Ctrl + Enter
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isProcessing) handleProcessVideo();
        return;
      }

      if (isInputFocused) return;
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isProcessing, videoUrl, segments, outputFolder, selectedResolution]);

  // Total duration of all segments
  const totalSegmentsDurationSec = segments.reduce((sum, seg) => {
    const start = timeStringToSeconds(seg.start) || 0;
    const end = timeStringToSeconds(seg.end) || 0;
    return sum + Math.max(0, end - start);
  }, 0);

  const hasValidClips = segments.length > 0 && videoUrl.trim().length > 0;

  return (
    <div className="min-vh-100 pb-5 position-relative" style={{ backgroundColor: 'var(--bg-deep)' }}>
      {/* macOS 26 Liquid Glass Toolbar */}
      <Header
        selectedResolution={selectedResolution}
        onChangeResolution={handleChangeResolution}
        onOpenTutorial={() => setShowTutorialModal(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenCommandPalette={() => setShowCommandPalette(true)}
        contextualStatus={
          isProcessing
            ? 'Đang xử lý...'
            : step === 'completed'
            ? 'Hoàn tất'
            : videoMetadata
            ? `${segments.length} đoạn • ${totalSegmentsDurationSec}s`
            : undefined
        }
      />

      {/* Main Adaptive Layout Container */}
      <main className="container-fluid px-3 px-lg-4" style={{ maxWidth: '1440px' }}>
        {/* Completed State: Clip Previews & Direct Local Storage */}
        {step === 'completed' && result && (
          <div className="animate-fade-in" style={{ maxWidth: '1080px', margin: '0 auto' }}>
            <DownloadResult
              result={result}
              outputFolder={outputFolder}
              onReset={handleReset}
            />
          </div>
        )}

        {/* Suggest Browser Capture Banner */}
        {suggestBrowserCapture && (
          <GlassPanel
            className="p-4 mb-4 animate-fade-in"
            style={{
              background: 'rgba(255, 159, 10, 0.08)',
              border: '1px solid rgba(255, 159, 10, 0.3)',
            }}
          >
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
              <div className="d-flex align-items-start gap-3">
                <ShieldAlert size={22} style={{ color: '#FF9F0A', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div className="fw-semibold text-white mb-1" style={{ fontSize: '0.9rem' }}>
                    YouTube Hạn Chế Tải Trực Tiếp Video Này
                  </div>
                  <p className="mb-0 text-secondary" style={{ fontSize: '0.8rem' }}>
                    Bạn có thể chuyển sang chế độ <strong>Ghi hình từ tab trình duyệt</strong> để lấy các đoạn video HD.
                  </p>
                </div>
              </div>

              <GlassButton
                variant="primary"
                style={{ background: '#FF9F0A', color: '#000000' }}
                onClick={() => {
                  setSuggestBrowserCapture(false);
                  setStep('idle');
                  setProcessingMode('browser_record');
                }}
              >
                <Radio size={14} />
                <span>Chuyển sang Ghi hình tab</span>
              </GlassButton>
            </div>
          </GlassPanel>
        )}

        {/* Active Workspace: Adaptive 2-Column Desktop Grid */}
        {step !== 'completed' && (
          <div className="row g-4">
            {/* LEFT COLUMN: Video Source + Hero Canvas + Timeline + Processing Status */}
            <div className="col-12 col-xl-7 col-xxl-7">
              {/* 1. Video Source Input */}
              <VideoUrlInput
                url={videoUrl}
                onChange={setVideoUrl}
                disabled={isProcessing}
                metadata={videoMetadata}
                isLoadingMetadata={isLoadingMetadata}
              />

              {/* 2. Video Preview Player & Media-Editor Timeline (Hero Canvas) */}
              {videoUrl && isValidYoutubeUrl(videoUrl) && (
                <VideoPlayerPreview
                  videoUrl={videoUrl}
                  metadata={videoMetadata}
                  segments={segments}
                  onAddMarkerAtTime={handleAddMarkerAtTime}
                  onSetSegmentTime={handleSetSegmentTime}
                />
              )}

              {/* 3. Processing Status Sheet */}
              <ProcessStatus
                step={step}
                errorMessage={errorMessage}
                totalSegments={segments.length}
              />
            </div>

            {/* RIGHT COLUMN: Clip Management + Output Destination + Processing Mode */}
            <div className="col-12 col-xl-5 col-xxl-5">
              {/* 4. Multiple Clip Manager */}
              <SegmentList
                segments={segments}
                disabled={isProcessing}
                onAddSegment={handleAddSegment}
                onUpdateSegment={handleUpdateSegment}
                onDeleteSegment={handleDeleteSegment}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
              />

              {/* 5. Local Output Folder */}
              <LocalFolderDestination
                outputFolder={outputFolder}
                onChangeFolder={handleChangeOutputFolder}
                disabled={isProcessing}
              />

              {/* 6. Processing Mode Selector */}
              <GlassPanel className="p-3.5 mb-4">
                <div className="d-flex align-items-center justify-content-between mb-2.5">
                  <span className="fw-semibold text-white" style={{ fontSize: '0.86rem' }}>
                    Chế độ xử lý
                  </span>
                  <GlassSegmentedControl<ProcessingMode>
                    size="sm"
                    value={processingMode}
                    onChange={setProcessingMode}
                    options={[
                      { value: 'download', label: 'Tải trực tiếp' },
                      { value: 'browser_record', label: 'Ghi trình duyệt' },
                    ]}
                  />
                </div>

                {processingMode === 'browser_record' && (
                  <BrowserTabRecorder
                    videoUrl={videoUrl}
                    videoTitle={videoMetadata?.title || 'YouTube_Clips'}
                    segments={segments}
                    onFinishRecording={handleFinishBrowserRecording}
                    onCancel={() => setProcessingMode('download')}
                  />
                )}
              </GlassPanel>
            </div>
          </div>
        )}
      </main>

      {/* Floating Sticky Bottom Export Action Bar */}
      {step !== 'completed' && hasValidClips && processingMode === 'download' && (
        <div
          className="position-fixed bottom-0 start-0 end-0 p-3 d-flex justify-content-center animate-fade-in"
          style={{ zIndex: 1010, pointerEvents: 'none' }}
        >
          <div
            className="liquid-glass-floating d-flex align-items-center justify-content-between px-4 py-2.5 gap-4 shadow-lg"
            style={{
              pointerEvents: 'auto',
              minWidth: '360px',
              maxWidth: '560px',
              width: '90%',
              background: 'rgba(22, 25, 33, 0.85)',
            }}
          >
            <div className="d-flex align-items-center gap-2 font-monospace" style={{ fontSize: '0.82rem' }}>
              <span className="fw-semibold text-white">{segments.length} đoạn</span>
              <span className="opacity-40">&bull;</span>
              <span className="text-secondary">{totalSegmentsDurationSec}s</span>
              <span className="opacity-40">&bull;</span>
              <GlassPill variant="accent" style={{ fontSize: '0.7rem' }}>
                {selectedResolution}
              </GlassPill>
            </div>

            <GlassButton
              variant="primary"
              size="md"
              onClick={handleProcessVideo}
              disabled={isProcessing}
              title="Xuất video (Ctrl + Enter)"
            >
              <MorphIconWrapper
                icon={isProcessing ? Download : Play}
                spring="snappy"
                size={15}
                color="#ffffff"
              />
              <span>{isProcessing ? 'Đang xử lý...' : 'Xuất video'}</span>
            </GlassButton>
          </div>
        </div>
      )}

      {/* Command Palette (Ctrl + K) */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onPasteUrl={async () => {
          try {
            const text = await navigator.clipboard.readText();
            if (text) setVideoUrl(text.trim());
          } catch {}
        }}
        onAddSegment={handleAddSegment}
        onSelectFolder={async () => {
          if ((window as any).electronAPI?.selectFolder) {
            const res = await (window as any).electronAPI.selectFolder();
            if (res) handleChangeOutputFolder(res);
          }
        }}
        onSelectResolution={handleChangeResolution}
        onExportVideo={handleProcessVideo}
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenTutorial={() => setShowTutorialModal(true)}
      />

      {/* Onboarding Tutorial Modal */}
      <OnboardingTutorialModal
        isOpen={showTutorialModal}
        onClose={() => setShowTutorialModal(false)}
      />

      {/* Settings Modal (macOS Preferences Sheet) */}
      <SettingsModal
        isOpen={showSettingsModal}
        outputFolder={outputFolder}
        selectedResolution={selectedResolution}
        onChangeFolder={handleChangeOutputFolder}
        onChangeResolution={handleChangeResolution}
        onOpenTutorial={() => {
          setShowSettingsModal(false);
          setShowTutorialModal(true);
        }}
        onClose={() => setShowSettingsModal(false)}
      />
    </div>
  );
};
