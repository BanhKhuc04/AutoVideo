import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { VideoUrlInput } from './components/VideoUrlInput';
import { VideoPlayerPreview } from './components/VideoPlayerPreview';
import { SegmentList } from './components/SegmentList';
import { QuickCutSegmentList } from './components/QuickCutSegmentList';
import { LocalFolderDestination } from './components/LocalFolderDestination';
import { ProcessStatus } from './components/ProcessStatus';
import { DownloadResult } from './components/DownloadResult';
import { OnboardingTutorialModal } from './components/OnboardingTutorialModal';
import { SettingsModal } from './components/SettingsModal';
import { GlassPill } from './components/glass/GlassPill';
import { Download } from 'lucide-react';
import {
  Segment,
  ProcessingStep,
  ProcessVideoResponse,
  VideoMetadata,
  CutMode,
} from './types';
import { validateSegment, isValidYoutubeUrl, secondsToTimeString, timeStringToSeconds } from './utils/timeValidator';
import { processVideoApi, getVideoInfoApi } from './services/api';

export const App: React.FC = () => {
  const [videoUrl, setVideoUrl] = useState<string>(() => {
    return localStorage.getItem('setting_remember_last_url') === 'true'
      ? localStorage.getItem('last_video_url') || ''
      : '';
  });
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState<boolean>(false);

  // Cut Mode: Precision (Cắt chính xác) vs Quick Cut (Cắt nhanh)
  const [cutMode, setCutMode] = useState<CutMode>(() => {
    return (localStorage.getItem('default_cut_mode') as CutMode) || 'precision';
  });

  // Local Output Folder
  const [outputFolder, setOutputFolder] = useState<string>(() => {
    return localStorage.getItem('default_output_folder') || '';
  });

  // Video Settings: 720p / 1080p
  const [selectedResolution, setSelectedResolution] = useState<'720p' | '1080p'>(() => {
    return (localStorage.getItem('default_resolution') as '720p' | '1080p') || '720p';
  });

  // ZIP packaging setting
  const [createZip, setCreateZip] = useState<boolean>(() => {
    return localStorage.getItem('setting_create_zip') !== 'false';
  });

  // Modals state
  const [showTutorialModal, setShowTutorialModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  // External seek state for jumping video playhead
  const [seekTimeTarget, setSeekTimeTarget] = useState<number | null>(null);

  // Multiple Clip Manager state
  const [segments, setSegments] = useState<Segment[]>([
    {
      id: 'seg-1',
      name: 'Khoảnh khắc mở đầu',
      start: '00:00:05',
      end: '00:00:30',
      selected: true,
    },
    {
      id: 'seg-2',
      name: 'Đoạn cao trào',
      start: '00:00:35',
      end: '00:01:05',
      selected: true,
    },
  ]);

  // Undo / Redo history for Quick Cut
  const [undoStack, setUndoStack] = useState<Segment[][]>([]);
  const [redoStack, setRedoStack] = useState<Segment[][]>([]);

  // Active clip currently selected for timeline editing in Precision mode
  const [activeSegmentId, setActiveSegmentId] = useState<string>('seg-1');

  const [step, setStep] = useState<ProcessingStep>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [result, setResult] = useState<ProcessVideoResponse | null>(null);

  const isProcessing = step === 'downloading' || step === 'processing' || step === 'zipping';

  // First-time tutorial
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('has_seen_tutorial');
    if (!hasSeenTutorial) {
      setShowTutorialModal(true);
    }
  }, []);

  const handleChangeCutMode = (newMode: CutMode) => {
    setCutMode(newMode);
    localStorage.setItem('default_cut_mode', newMode);
  };

  const handleChangeResolution = (res: '720p' | '1080p') => {
    setSelectedResolution(res);
    localStorage.setItem('default_resolution', res);
  };

  const handleChangeCreateZip = (val: boolean) => {
    setCreateZip(val);
    localStorage.setItem('setting_create_zip', val ? 'true' : 'false');
  };

  const handleChangeOutputFolder = (folder: string) => {
    setOutputFolder(folder);
    if (folder.trim()) {
      localStorage.setItem('default_output_folder', folder.trim());
    } else {
      localStorage.removeItem('default_output_folder');
    }
  };

  // Auto fetch metadata
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

  // Push history before mutating segments in Quick Cut
  const pushHistory = (current: Segment[]) => {
    setUndoStack((prev) => [...prev.slice(-20), current]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, prev.length - 1));
    setRedoStack((prev) => [...prev, segments]);
    setSegments(previous);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, prev.length - 1));
    setUndoStack((prev) => [...prev, segments]);
    setSegments(next);
  };

  // ==========================================
  // QUICK CUT SPLIT LOGIC (Key 'S')
  // ==========================================
  const handleSplitAtTime = (timeSec: number) => {
    const totalDur = videoMetadata?.duration || 0;
    if (timeSec <= 0 || (totalDur > 0 && timeSec >= totalDur)) return;

    pushHistory(segments);

    // If segments are empty, create initial partition
    if (segments.length === 0) {
      const seg1: Segment = {
        id: `seg-${Date.now()}-1`,
        name: 'Đoạn 01',
        start: '00:00:00',
        end: secondsToTimeString(timeSec),
        selected: true,
      };
      const seg2: Segment = {
        id: `seg-${Date.now()}-2`,
        name: 'Đoạn 02',
        start: secondsToTimeString(timeSec),
        end: secondsToTimeString(totalDur || timeSec + 60),
        selected: true,
      };
      setSegments([seg1, seg2]);
      return;
    }

    // Find the segment containing timeSec
    const targetIdx = segments.findIndex((seg) => {
      const s = timeStringToSeconds(seg.start) || 0;
      const e = timeStringToSeconds(seg.end) || totalDur || 99999;
      return timeSec > s && timeSec < e;
    });

    if (targetIdx === -1) {
      // If timeSec is after all segments
      const lastSeg = segments[segments.length - 1];
      const lastEnd = timeStringToSeconds(lastSeg.end) || 0;
      if (timeSec > lastEnd) {
        const newSeg: Segment = {
          id: `seg-${Date.now()}`,
          name: `Đoạn ${(segments.length + 1).toString().padStart(2, '0')}`,
          start: lastSeg.end,
          end: secondsToTimeString(timeSec),
          selected: true,
        };
        setSegments([...segments, newSeg]);
      }
      return;
    }

    const target = segments[targetIdx];
    const splitTimeStr = secondsToTimeString(timeSec);

    const part1: Segment = {
      ...target,
      id: `${target.id}-a`,
      end: splitTimeStr,
      selected: target.selected !== false,
    };

    const part2: Segment = {
      id: `seg-${Date.now()}`,
      name: `Đoạn ${(segments.length + 1).toString().padStart(2, '0')}`,
      start: splitTimeStr,
      end: target.end,
      selected: true,
    };

    const updated = [...segments];
    updated.splice(targetIdx, 1, part1, part2);

    // Re-index names cleanly
    const reindexed = updated.map((s, idx) => ({
      ...s,
      name: `Đoạn ${(idx + 1).toString().padStart(2, '0')}`,
    }));

    setSegments(reindexed);
  };

  // Quick Cut: Delete split / merge with adjacent segment
  const handleDeleteSplit = (id: string) => {
    if (segments.length <= 1) return;
    pushHistory(segments);

    const idx = segments.findIndex((s) => s.id === id);
    if (idx === -1) return;

    const updated = [...segments];
    if (idx < updated.length - 1) {
      // Merge with next
      updated[idx] = {
        ...updated[idx],
        end: updated[idx + 1].end,
      };
      updated.splice(idx + 1, 1);
    } else if (idx > 0) {
      // Merge with previous
      updated[idx - 1] = {
        ...updated[idx - 1],
        end: updated[idx].end,
      };
      updated.splice(idx, 1);
    }

    const reindexed = updated.map((s, i) => ({
      ...s,
      name: `Đoạn ${(i + 1).toString().padStart(2, '0')}`,
    }));

    setSegments(reindexed);
  };

  // Toggle selection of a segment (include/exclude from export)
  const handleToggleSelectSegment = (id: string) => {
    setSegments((prev) =>
      prev.map((s) => (s.id === id ? { ...s, selected: s.selected === false ? true : false } : s))
    );
  };

  const handleSelectAllSegments = () => {
    setSegments((prev) => prev.map((s) => ({ ...s, selected: true })));
  };

  const handleDeselectAllSegments = () => {
    setSegments((prev) => prev.map((s) => ({ ...s, selected: false })));
  };

  const handleSeekToSegment = (startSec: number) => {
    setSeekTimeTarget(startSec);
    setTimeout(() => setSeekTimeTarget(null), 100);
  };

  // ==========================================
  // PRECISION MODE ACTIONS
  // ==========================================
  const handleAddSegment = () => {
    const newId = `seg-${Date.now()}`;
    const clipIndex = segments.length + 1;
    const lastSeg = segments[segments.length - 1];

    setSegments([
      ...segments,
      {
        id: newId,
        name: `Đoạn ${clipIndex.toString().padStart(2, '0')}`,
        start: lastSeg?.end || '00:00:00',
        end: '',
        selected: true,
      },
    ]);
    setActiveSegmentId(newId);
  };

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
        selected: true,
      },
    ]);
    setActiveSegmentId(newId);
  };

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
            selected: true,
          },
        ];
      }
      return prev.map((seg) => {
        if (seg.id !== activeSegmentId) return seg;
        const updatedSeg = {
          ...seg,
          [type]: timeStr,
        };
        const err = validateSegment(updatedSeg.start, updatedSeg.end, maxDur);
        return {
          ...updatedSeg,
          error: err || undefined,
        };
      });
    });
  };

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

  const handleDeleteSegment = (id: string) => {
    if (segments.length <= 1) return;
    setSegments((prev) => prev.filter((s) => s.id !== id));
    if (activeSegmentId === id) {
      const remaining = segments.filter((s) => s.id !== id);
      if (remaining.length > 0) setActiveSegmentId(remaining[0].id);
    }
  };

  const handleMoveUp = (id: string) => {
    const index = segments.findIndex((s) => s.id === id);
    if (index <= 0) return;
    const newSegments = [...segments];
    const temp = newSegments[index - 1];
    newSegments[index - 1] = newSegments[index];
    newSegments[index] = temp;
    setSegments(newSegments);
  };

  const handleMoveDown = (id: string) => {
    const index = segments.findIndex((s) => s.id === id);
    if (index < 0 || index >= segments.length - 1) return;
    const newSegments = [...segments];
    const temp = newSegments[index + 1];
    newSegments[index + 1] = newSegments[index];
    newSegments[index] = temp;
    setSegments(newSegments);
  };

  const handleReset = () => {
    setStep('idle');
    setErrorMessage('');
    setResult(null);
  };

  // ==========================================
  // EXPORT ACTION (Filtered by selection)
  // ==========================================
  const handleProcessVideo = async () => {
    setErrorMessage('');

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

    // 2. Filter ONLY selected segments
    const selectedSegments = segments.filter((s) => s.selected !== false);
    if (selectedSegments.length === 0) {
      setErrorMessage('Vui lòng chọn ít nhất một đoạn video để xuất.');
      setStep('error');
      return;
    }

    // 3. Validate selected segments
    let hasSegmentError = false;
    const maxDur = videoMetadata?.duration;
    const validatedSegments = selectedSegments.map((seg) => {
      const error = validateSegment(seg.start, seg.end, maxDur);
      if (error) {
        hasSegmentError = true;
        return { ...seg, error };
      }
      return { ...seg, error: undefined };
    });

    if (hasSegmentError) {
      setSegments((prev) =>
        prev.map((s) => {
          const matched = validatedSegments.find((v) => v.id === s.id);
          return matched || s;
        })
      );
      setErrorMessage('Vui lòng kiểm tra và sửa lại các mốc thời gian bị lỗi.');
      setStep('error');
      return;
    }

    // 4. Run export pipeline
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
        segments: selectedSegments.map((s) => ({
          id: s.id,
          name: s.name?.trim(),
          start: s.start.trim(),
          end: s.end.trim(),
        })),
        outputFolder: outputFolder.trim() || undefined,
        quality: selectedResolution,
        createZip: createZip,
      });

      clearTimeout(timer1);
      clearTimeout(timer2);

      setStep('completed');
      setResult(response);

      // Auto open folder if enabled
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
        err.message || 'Không thể xử lý video. Vui lòng kiểm tra lại liên kết hoặc kết nối mạng.'
      );
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

      // Command Palette / Settings shortcuts
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

      // Undo / Redo in Quick Cut
      if (cutMode === 'quick' && !isInputFocused) {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
          if (e.shiftKey) {
            e.preventDefault();
            handleRedo();
          } else {
            e.preventDefault();
            handleUndo();
          }
          return;
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isProcessing, videoUrl, segments, outputFolder, selectedResolution, createZip, cutMode, undoStack, redoStack]);

  // Selected segments count & total seconds
  const selectedSegments = segments.filter((s) => s.selected !== false);
  const totalSelectedSeconds = selectedSegments.reduce((sum, seg) => {
    const start = timeStringToSeconds(seg.start) || 0;
    const end = timeStringToSeconds(seg.end) || 0;
    return sum + Math.max(0, end - start);
  }, 0);


  return (
    <div className="app-layout">
      {/* macOS Header Toolbar */}
      <Header
        selectedResolution={selectedResolution}
        onChangeResolution={handleChangeResolution}
        onOpenTutorial={() => setShowTutorialModal(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
        contextualStatus={
          isProcessing
            ? 'Đang xử lý...'
            : step === 'completed'
            ? 'Hoàn tất'
            : videoMetadata
            ? `${selectedSegments.length} đoạn được chọn • ${totalSelectedSeconds}s`
            : undefined
        }
      />

      {/* Main Workspace */}
      <main className="main-content">
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

        {/* Active Workspace */}
        {step !== 'completed' && (
          <div className="editor-grid">
            {/* LEFT COLUMN: Video Source + Hero Video Canvas & Timeline + Progress Status */}
            <div className="left-column">
              {/* 1. Video Source Input */}
              <VideoUrlInput
                url={videoUrl}
                onChange={setVideoUrl}
                disabled={isProcessing}
                metadata={videoMetadata}
                isLoadingMetadata={isLoadingMetadata}
              />

              {/* 2. Video Preview Player & Media-Editor Timeline */}
              {videoUrl && isValidYoutubeUrl(videoUrl) && (
                <VideoPlayerPreview
                  videoUrl={videoUrl}
                  metadata={videoMetadata}
                  segments={segments}
                  cutMode={cutMode}
                  onChangeCutMode={handleChangeCutMode}
                  activeSegmentId={activeSegmentId}
                  onSelectSegment={setActiveSegmentId}
                  onToggleSegmentSelect={handleToggleSelectSegment}
                  onAddMarkerAtTime={handleAddMarkerAtTime}
                  onSetSegmentTime={handleSetSegmentTime}
                  onSplitAtTime={handleSplitAtTime}
                  externalSeekTime={seekTimeTarget}
                />
              )}

              {/* 3. Dachshund Rive Processing Status */}
              <ProcessStatus
                step={step}
                errorMessage={errorMessage}
                totalSegments={selectedSegments.length}
              />
            </div>

            {/* RIGHT COLUMN: Mode-dependent Clip List + Output Destination */}
            <div className="right-column">
              {/* Clip Manager depending on Cut Mode */}
              {cutMode === 'quick' ? (
                <QuickCutSegmentList
                  segments={segments}
                  disabled={isProcessing}
                  onToggleSelect={handleToggleSelectSegment}
                  onSelectAll={handleSelectAllSegments}
                  onDeselectAll={handleDeselectAllSegments}
                  onDeleteSplit={handleDeleteSplit}
                  onSeekToSegment={handleSeekToSegment}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  canUndo={undoStack.length > 0}
                  canRedo={redoStack.length > 0}
                />
              ) : (
                <SegmentList
                  segments={segments}
                  activeSegmentId={activeSegmentId}
                  onSelectSegment={setActiveSegmentId}
                  disabled={isProcessing}
                  onAddSegment={handleAddSegment}
                  onUpdateSegment={handleUpdateSegment}
                  onDeleteSegment={handleDeleteSegment}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                />
              )}

              {/* Local Output Folder */}
              <LocalFolderDestination
                outputFolder={outputFolder}
                onChangeFolder={handleChangeOutputFolder}
                disabled={isProcessing}
              />
            </div>
          </div>
        )}
      </main>

      {/* Floating Sticky Bottom Export Action Bar */}
      {step !== 'completed' && videoUrl.trim().length > 0 && (
        <div className="action-bar-container">
          <div className="action-bar">
            <div className="action-bar-meta">
              <span className="action-bar-count">
                {selectedSegments.length} / {segments.length} đoạn được chọn
              </span>
              <span className="action-bar-dot">&bull;</span>
              <span className="action-bar-duration">{totalSelectedSeconds}s</span>
              <span className="action-bar-dot">&bull;</span>
              <GlassPill variant="accent">{selectedResolution}</GlassPill>
              {createZip && (
                <GlassPill variant="default" style={{ fontSize: '0.68rem' }}>
                  ZIP
                </GlassPill>
              )}
            </div>

            <button
              type="button"
              className="btn btn-primary btn-md"
              onClick={handleProcessVideo}
              disabled={isProcessing || selectedSegments.length === 0}
              title={
                selectedSegments.length === 0
                  ? 'Vui lòng chọn ít nhất 1 đoạn để xuất'
                  : 'Xuất các đoạn đã chọn (Ctrl + Enter)'
              }
            >
              <Download size={15} strokeWidth={2} />
              <span>
                {isProcessing
                  ? 'Đang xử lý...'
                  : selectedSegments.length === 0
                  ? 'Chưa chọn đoạn nào'
                  : `Xuất ${selectedSegments.length} đoạn video`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Onboarding Tutorial Modal */}
      <OnboardingTutorialModal
        isOpen={showTutorialModal}
        onClose={() => setShowTutorialModal(false)}
      />

      {/* Settings Modal (macOS Preferences Sheet with ZIP Toggle) */}
      <SettingsModal
        isOpen={showSettingsModal}
        outputFolder={outputFolder}
        selectedResolution={selectedResolution}
        onChangeFolder={handleChangeOutputFolder}
        onChangeResolution={handleChangeResolution}
        createZip={createZip}
        onChangeCreateZip={handleChangeCreateZip}
        onOpenTutorial={() => {
          setShowSettingsModal(false);
          setShowTutorialModal(true);
        }}
        onClose={() => setShowSettingsModal(false)}
      />
    </div>
  );
};
