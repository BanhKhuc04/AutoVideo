import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { VideoUrlInput } from './components/VideoUrlInput';
import { VideoPlayerPreview } from './components/VideoPlayerPreview';
import { SegmentList } from './components/SegmentList';
import { LocalFolderDestination } from './components/LocalFolderDestination';
import { ProcessStatus } from './components/ProcessStatus';
import { DownloadResult } from './components/DownloadResult';
import { OnboardingTutorialModal } from './components/OnboardingTutorialModal';
import { SettingsModal } from './components/SettingsModal';
import { GlassPill } from './components/glass/GlassPill';
import { Download, Play, RotateCcw, Heart } from 'lucide-react';
import {
  Segment,
  ProcessingStep,
  ProcessVideoResponse,
  VideoMetadata,
  CutMode,
} from './types';
import { validateSegment, isValidYoutubeUrl, secondsToTimeString, timeStringToSeconds } from './utils/timeValidator';
import { processVideoApi, getVideoInfoApi } from './services/api';

const MAX_HISTORY = 60;

export const App: React.FC = () => {
  const [videoUrl, setVideoUrl] = useState<string>(() => {
    return localStorage.getItem('setting_remember_last_url') === 'true'
      ? localStorage.getItem('last_video_url') || ''
      : '';
  });
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState<boolean>(false);

  // Cut Mode: Precision vs Quick Cut
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

  // ============================================================
  // SEPARATE STATE & HISTORY FOR PRECISION & QUICK CUT MODES
  // ============================================================

  // 1. PRECISION MODE SEGMENTS & HISTORY
  const [precisionSegments, setPrecisionSegments] = useState<Segment[]>([
    {
      id: 'p-seg-1',
      name: 'Khoảnh khắc mở đầu',
      start: '00:00:05',
      end: '00:00:30',
    },
    {
      id: 'p-seg-2',
      name: 'Đoạn cao trào',
      start: '00:00:35',
      end: '00:01:05',
    },
  ]);
  const [activePrecisionId, setActivePrecisionId] = useState<string>('p-seg-1');
  const [precisionPast, setPrecisionPast] = useState<Segment[][]>([]);
  const [precisionFuture, setPrecisionFuture] = useState<Segment[][]>([]);

  // 2. QUICK CUT MODE SEGMENTS & HISTORY
  const [quickCutSegments, setQuickCutSegments] = useState<Segment[]>([]);
  const [activeQuickCutId, setActiveQuickCutId] = useState<string>('');
  const [quickCutPast, setQuickCutPast] = useState<Segment[][]>([]);
  const [quickCutFuture, setQuickCutFuture] = useState<Segment[][]>([]);

  // Toast Notification for Delete [Hoàn tác]
  const [toastMessage, setToastMessage] = useState<{ text: string; mode: CutMode } | null>(null);
  const toastTimerRef = useRef<any>(null);

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

  const showToast = (text: string, mode: CutMode) => {
    setToastMessage({ text, mode });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // ============================================================
  // LOAD NEW VIDEO URL -> AUTO FETCH & RESET HISTORY SESSION
  // ============================================================
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

          // CLEAR ALL HISTORY FOR NEW VIDEO SESSION (Requirement #17 & #52)
          setPrecisionPast([]);
          setPrecisionFuture([]);
          setQuickCutPast([]);
          setQuickCutFuture([]);

          const dur = meta?.duration || 0;
          const endStr = dur > 0 ? secondsToTimeString(Math.min(30, dur)) : '00:00:30';

          // Reset Precision Initial Segments
          const initPrecision: Segment[] = [
            {
              id: `p-seg-${Date.now()}-1`,
              name: 'Đoạn 01',
              start: '00:00:00',
              end: endStr,
            },
          ];
          setPrecisionSegments(initPrecision);
          setActivePrecisionId(initPrecision[0].id);

          // Reset Quick Cut Initial Segment (covers 0 to duration)
          const totalStr = dur > 0 ? secondsToTimeString(dur) : '00:01:00';
          const initQuickCut: Segment[] = [
            {
              id: `q-seg-${Date.now()}-1`,
              name: 'Đoạn 01',
              start: '00:00:00',
              end: totalStr,
            },
          ];
          setQuickCutSegments(initQuickCut);
          setActiveQuickCutId(initQuickCut[0].id);
        }
      } catch {
        if (isMounted) setVideoMetadata(null);
      } finally {
        if (isMounted) setIsLoadingMetadata(false);
      }
    };

    const debounceTimer = setTimeout(fetchInfo, 400);
    return () => {
      isMounted = false;
      clearTimeout(debounceTimer);
    };
  }, [videoUrl]);

  // Sync Quick Cut initial segment when duration becomes available if empty
  useEffect(() => {
    if (videoMetadata?.duration && quickCutSegments.length === 0) {
      const dur = videoMetadata.duration;
      const initial: Segment[] = [
        {
          id: `q-seg-${Date.now()}`,
          name: 'Đoạn 01',
          start: '00:00:00',
          end: secondsToTimeString(dur),
        },
      ];
      setQuickCutSegments(initial);
      setActiveQuickCutId(initial[0].id);
    }
  }, [videoMetadata, quickCutSegments.length]);

  // ============================================================
  // QUICK CUT ACTIONS & HISTORY (SPLIT, DELETE, UNDO, REDO)
  // ============================================================

  const handleQuickCutSplit = (timeSec: number) => {
    const totalDur = videoMetadata?.duration || 0;
    if (timeSec <= 0.1 || (totalDur > 0 && timeSec >= totalDur - 0.1)) return;

    // Snapshot to Past
    setQuickCutPast((prev) => [...prev.slice(-MAX_HISTORY), quickCutSegments]);
    setQuickCutFuture([]);

    if (quickCutSegments.length === 0) {
      const seg1: Segment = {
        id: `q-seg-${Date.now()}-1`,
        name: 'Đoạn 01',
        start: '00:00:00',
        end: secondsToTimeString(timeSec),
      };
      const seg2: Segment = {
        id: `q-seg-${Date.now()}-2`,
        name: 'Đoạn 02',
        start: secondsToTimeString(timeSec),
        end: secondsToTimeString(totalDur || timeSec + 60),
      };
      setQuickCutSegments([seg1, seg2]);
      setActiveQuickCutId(seg2.id);
      return;
    }

    // Locate the segment that contains timeSec
    const targetIdx = quickCutSegments.findIndex((seg) => {
      const s = timeStringToSeconds(seg.start) || 0;
      const e = timeStringToSeconds(seg.end) || totalDur || 99999;
      return timeSec > s + 0.1 && timeSec < e - 0.1;
    });

    if (targetIdx === -1) return;

    const target = quickCutSegments[targetIdx];
    const splitTimeStr = secondsToTimeString(timeSec);

    const partLeft: Segment = {
      ...target,
      id: `${target.id}-L`,
      end: splitTimeStr,
    };

    const partRight: Segment = {
      id: `q-seg-${Date.now()}`,
      name: `Đoạn ${(quickCutSegments.length + 1).toString().padStart(2, '0')}`,
      start: splitTimeStr,
      end: target.end,
    };

    const updated = [...quickCutSegments];
    updated.splice(targetIdx, 1, partLeft, partRight);

    // Re-index segment names cleanly
    const reindexed = updated.map((s, idx) => ({
      ...s,
      name: `Đoạn ${(idx + 1).toString().padStart(2, '0')}`,
    }));

    setQuickCutSegments(reindexed);
    setActiveQuickCutId(partRight.id);
  };

  const handleQuickCutDelete = (id: string) => {
    if (quickCutSegments.length <= 0) return;
    const target = quickCutSegments.find((s) => s.id === id);
    if (!target) return;

    // Snapshot to Past
    setQuickCutPast((prev) => [...prev.slice(-MAX_HISTORY), quickCutSegments]);
    setQuickCutFuture([]);

    const remaining = quickCutSegments.filter((s) => s.id !== id);
    setQuickCutSegments(remaining);

    if (remaining.length > 0) {
      setActiveQuickCutId(remaining[0].id);
    } else {
      setActiveQuickCutId('');
    }

    showToast(`Đã xóa ${target.name || 'đoạn video'}`, 'quick');
  };

  const handleUndoQuickCut = () => {
    if (quickCutPast.length === 0) return;
    const previous = quickCutPast[quickCutPast.length - 1];
    setQuickCutPast((prev) => prev.slice(0, prev.length - 1));
    setQuickCutFuture((prev) => [...prev, quickCutSegments]);
    setQuickCutSegments(previous);
    if (previous.length > 0) setActiveQuickCutId(previous[0].id);
    setToastMessage(null);
  };

  const handleRedoQuickCut = () => {
    if (quickCutFuture.length === 0) return;
    const next = quickCutFuture[quickCutFuture.length - 1];
    setQuickCutFuture((prev) => prev.slice(0, prev.length - 1));
    setQuickCutPast((prev) => [...prev, quickCutSegments]);
    setQuickCutSegments(next);
    if (next.length > 0) setActiveQuickCutId(next[0].id);
  };

  // ============================================================
  // PRECISION ACTIONS & HISTORY
  // ============================================================

  const handleSelectPrecisionSegment = (id: string) => {
    setActivePrecisionId(id);
    const seg = precisionSegments.find((s) => s.id === id);
    if (seg) {
      const s = timeStringToSeconds(seg.start);
      if (s !== null) {
        setSeekTimeTarget(s);
        setTimeout(() => setSeekTimeTarget(null), 100);
      }
    }
  };

  const handlePrecisionAddSegment = () => {
    setPrecisionPast((prev) => [...prev.slice(-MAX_HISTORY), precisionSegments]);
    setPrecisionFuture([]);

    const newId = `p-seg-${Date.now()}`;
    const clipIndex = precisionSegments.length + 1;
    const lastSeg = precisionSegments[precisionSegments.length - 1];

    const nextSeg: Segment = {
      id: newId,
      name: `Đoạn ${clipIndex.toString().padStart(2, '0')}`,
      start: lastSeg?.end || '00:00:00',
      end: '',
    };
    setPrecisionSegments([...precisionSegments, nextSeg]);
    setActivePrecisionId(newId);
  };

  const handlePrecisionAddMarkerAtTime = (timeSec: number) => {
    setPrecisionPast((prev) => [...prev.slice(-MAX_HISTORY), precisionSegments]);
    setPrecisionFuture([]);

    const maxDur = videoMetadata?.duration || 0;
    const endSec = maxDur > 0 ? Math.min(timeSec + 30, maxDur) : timeSec + 30;
    const newId = `p-seg-${Date.now()}`;
    const clipIndex = precisionSegments.length + 1;

    const nextSeg: Segment = {
      id: newId,
      name: `Đoạn ${clipIndex.toString().padStart(2, '0')}`,
      start: secondsToTimeString(timeSec),
      end: secondsToTimeString(endSec),
    };
    setPrecisionSegments([...precisionSegments, nextSeg]);
    setActivePrecisionId(newId);
  };

  const handlePrecisionSetSegmentTime = (type: 'start' | 'end', timeSec: number) => {
    setPrecisionPast((prev) => [...prev.slice(-MAX_HISTORY), precisionSegments]);
    setPrecisionFuture([]);

    const timeStr = secondsToTimeString(timeSec);
    const maxDur = videoMetadata?.duration;

    setPrecisionSegments((prev) =>
      prev.map((seg) => {
        if (seg.id !== activePrecisionId) return seg;
        const updated = { ...seg, [type]: timeStr };
        const err = validateSegment(updated.start, updated.end, maxDur);
        return { ...updated, error: err || undefined };
      })
    );
  };

  const handlePrecisionUpdateSegment = (
    id: string,
    field: 'name' | 'start' | 'end',
    value: string
  ) => {
    setPrecisionPast((prev) => [...prev.slice(-MAX_HISTORY), precisionSegments]);
    setPrecisionFuture([]);

    const maxDur = videoMetadata?.duration;
    setPrecisionSegments((prev) =>
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
        }
        return updated;
      })
    );
  };

  const handlePrecisionDeleteSegment = (id: string) => {
    if (precisionSegments.length <= 1) return;
    const target = precisionSegments.find((s) => s.id === id);

    setPrecisionPast((prev) => [...prev.slice(-MAX_HISTORY), precisionSegments]);
    setPrecisionFuture([]);

    const remaining = precisionSegments.filter((s) => s.id !== id);
    setPrecisionSegments(remaining);
    if (activePrecisionId === id && remaining.length > 0) {
      setActivePrecisionId(remaining[0].id);
    }

    showToast(`Đã xóa ${target?.name || 'đoạn'}`, 'precision');
  };

  const handlePrecisionMoveUp = (id: string) => {
    const idx = precisionSegments.findIndex((s) => s.id === id);
    if (idx <= 0) return;
    setPrecisionPast((prev) => [...prev.slice(-MAX_HISTORY), precisionSegments]);
    setPrecisionFuture([]);

    const updated = [...precisionSegments];
    const temp = updated[idx - 1];
    updated[idx - 1] = updated[idx];
    updated[idx] = temp;
    setPrecisionSegments(updated);
  };

  const handlePrecisionMoveDown = (id: string) => {
    const idx = precisionSegments.findIndex((s) => s.id === id);
    if (idx < 0 || idx >= precisionSegments.length - 1) return;
    setPrecisionPast((prev) => [...prev.slice(-MAX_HISTORY), precisionSegments]);
    setPrecisionFuture([]);

    const updated = [...precisionSegments];
    const temp = updated[idx + 1];
    updated[idx + 1] = updated[idx];
    updated[idx] = temp;
    setPrecisionSegments(updated);
  };

  const handleUndoPrecision = () => {
    if (precisionPast.length === 0) return;
    const previous = precisionPast[precisionPast.length - 1];
    setPrecisionPast((prev) => prev.slice(0, prev.length - 1));
    setPrecisionFuture((prev) => [...prev, precisionSegments]);
    setPrecisionSegments(previous);
    if (previous.length > 0) setActivePrecisionId(previous[0].id);
    setToastMessage(null);
  };

  const handleRedoPrecision = () => {
    if (precisionFuture.length === 0) return;
    const next = precisionFuture[precisionFuture.length - 1];
    setPrecisionFuture((prev) => prev.slice(0, prev.length - 1));
    setPrecisionPast((prev) => [...prev, precisionSegments]);
    setPrecisionSegments(next);
    if (next.length > 0) setActivePrecisionId(next[0].id);
  };

  // General Undo/Redo Dispatchers
  const handleUndo = () => {
    if (cutMode === 'quick') handleUndoQuickCut();
    else handleUndoPrecision();
  };

  const handleRedo = () => {
    if (cutMode === 'quick') handleRedoQuickCut();
    else handleRedoPrecision();
  };

  const canUndo = cutMode === 'quick' ? quickCutPast.length > 0 : precisionPast.length > 0;
  const canRedo = cutMode === 'quick' ? quickCutFuture.length > 0 : precisionFuture.length > 0;

  // Global Keyboard Shortcuts (Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y, Ctrl+Enter, Ctrl+,)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputFocused =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

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

      // Undo / Redo (Only when not focused on input)
      if (!isInputFocused && (e.ctrlKey || e.metaKey)) {
        if (e.key === 'z' || e.key === 'Z') {
          if (e.shiftKey) {
            e.preventDefault();
            handleRedo();
          } else {
            e.preventDefault();
            handleUndo();
          }
        } else if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [cutMode, precisionPast, precisionFuture, quickCutPast, quickCutFuture, isProcessing]);

  // ============================================================
  // EXPORT ACTION
  // ============================================================

  const currentSegmentsToExport = cutMode === 'quick' ? quickCutSegments : precisionSegments;

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

    // 2. Validate segments
    if (currentSegmentsToExport.length === 0) {
      setErrorMessage('Không còn đoạn nào trên timeline để xuất. Nhấn Ctrl + Z để khôi phục.');
      setStep('error');
      return;
    }

    let hasSegmentError = false;
    const maxDur = videoMetadata?.duration;
    const validated = currentSegmentsToExport.map((seg) => {
      const err = validateSegment(seg.start, seg.end, maxDur);
      if (err) {
        hasSegmentError = true;
        return { ...seg, error: err };
      }
      return { ...seg, error: undefined };
    });

    if (hasSegmentError) {
      if (cutMode === 'quick') setQuickCutSegments(validated);
      else setPrecisionSegments(validated);
      setErrorMessage('Vui lòng kiểm tra và sửa lại các mốc thời gian bị lỗi.');
      setStep('error');
      return;
    }

    // 3. Run export pipeline
    setResult(null);
    setStep('downloading');

    const timer1 = setTimeout(() => {
      setStep((curr) => (curr === 'downloading' ? 'processing' : curr));
    }, 4000);

    const timer2 = setTimeout(() => {
      setStep((curr) => (curr === 'processing' ? 'zipping' : curr));
    }, 11000);

    try {
      const response = await processVideoApi({
        videoUrl: videoUrl.trim(),
        segments: currentSegmentsToExport.map((s) => ({
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

  const handleReset = () => {
    setStep('idle');
    setErrorMessage('');
    setResult(null);
  };

  // Calculate total seconds of active mode
  const totalActiveSeconds = currentSegmentsToExport.reduce((sum, seg) => {
    const start = timeStringToSeconds(seg.start) || 0;
    const end = timeStringToSeconds(seg.end) || 0;
    return sum + Math.max(0, end - start);
  }, 0);

  return (
    <div className="app-wrapper">
      {/* Top Header */}
      <Header
        selectedResolution={selectedResolution}
        onChangeResolution={handleChangeResolution}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        onOpenTutorial={() => setShowTutorialModal(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
        contextualStatus={
          isProcessing
            ? 'Đang xử lý...'
            : step === 'completed'
            ? 'Hoàn tất'
            : videoMetadata
            ? `${currentSegmentsToExport.length} đoạn • ${totalActiveSeconds}s`
            : undefined
        }
      />

      {/* Main Workspace */}
      <main className="app-main">
        {/* Completed State */}
        {step === 'completed' && result ? (
          <div className="ui-card" style={{ maxWidth: '800px', margin: '20px auto' }}>
            <DownloadResult
              result={result}
              outputFolder={outputFolder}
              onReset={handleReset}
            />
          </div>
        ) : (
          <>
            {/* Top: Video Source URL Input */}
            <div className="ui-card" style={{ marginBottom: '16px' }}>
              <VideoUrlInput
                url={videoUrl}
                onChange={setVideoUrl}
                disabled={isProcessing}
                metadata={videoMetadata}
                isLoadingMetadata={isLoadingMetadata}
              />
            </div>

            {/* Video loaded: Render Precision or Quick Cut */}
            {videoUrl && isValidYoutubeUrl(videoUrl) && (
              <>
                {cutMode === 'precision' ? (
                  /* ============================================================
                     1. PRECISION MODE: RESTORED ORIGINAL 2-COLUMN DESKTOP LAYOUT
                     ============================================================ */
                  <div className="precision-grid animate-fade-in">
                    {/* Left Column: Video Preview + Timeline */}
                    <div className="precision-left">
                      <VideoPlayerPreview
                        videoUrl={videoUrl}
                        metadata={videoMetadata}
                        segments={precisionSegments}
                        cutMode="precision"
                        onChangeCutMode={handleChangeCutMode}
                        activeSegmentId={activePrecisionId}
                        onSelectSegment={handleSelectPrecisionSegment}
                        onAddMarkerAtTime={handlePrecisionAddMarkerAtTime}
                        onSetSegmentTime={handlePrecisionSetSegmentTime}
                        externalSeekTime={seekTimeTarget}
                      />

                      {/* Native Process Status */}
                      <ProcessStatus
                        step={step}
                        errorMessage={errorMessage}
                        totalSegments={precisionSegments.length}
                      />
                    </div>

                    {/* Right Column: Segment List + Output Folder + Export Card */}
                    <div className="precision-right">
                      {/* Segment Cards */}
                      <div className="ui-card" style={{ marginBottom: '16px' }}>
                        <SegmentList
                          segments={precisionSegments}
                          activeSegmentId={activePrecisionId}
                          onSelectSegment={handleSelectPrecisionSegment}
                          disabled={isProcessing}
                          onAddSegment={handlePrecisionAddSegment}
                          onUpdateSegment={handlePrecisionUpdateSegment}
                          onDeleteSegment={handlePrecisionDeleteSegment}
                          onMoveUp={handlePrecisionMoveUp}
                          onMoveDown={handlePrecisionMoveDown}
                        />
                      </div>

                      {/* Local Output Folder */}
                      <div className="ui-card" style={{ marginBottom: '16px' }}>
                        <LocalFolderDestination
                          outputFolder={outputFolder}
                          onChangeFolder={handleChangeOutputFolder}
                          disabled={isProcessing}
                        />
                      </div>

                      {/* Export Action Card */}
                      <div className="ui-card" style={{ padding: '20px' }}>
                        <button
                          type="button"
                          className="btn btn-primary btn-lg"
                          style={{ width: '100%', justifyContent: 'center' }}
                          onClick={handleProcessVideo}
                          disabled={isProcessing || precisionSegments.length === 0}
                        >
                          <Play size={16} fill="#ffffff" strokeWidth={0} />
                          <span>
                            {isProcessing
                              ? 'Đang xử lý video...'
                              : `Xuất ${precisionSegments.length} đoạn video`}
                          </span>
                        </button>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            marginTop: '10px',
                            fontSize: '12px',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          <span>{precisionSegments.length} đoạn</span>
                          <span>&bull;</span>
                          <span className="font-monospace">{totalActiveSeconds}s</span>
                          <span>&bull;</span>
                          <GlassPill variant="accent">{selectedResolution}</GlassPill>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ============================================================
                     2. QUICK CUT MODE: PURE 1-TIMELINE MINI VIDEO EDITOR
                     ============================================================ */
                  <div className="quickcut-container animate-fade-in">
                    <VideoPlayerPreview
                      videoUrl={videoUrl}
                      metadata={videoMetadata}
                      segments={quickCutSegments}
                      cutMode="quick"
                      onChangeCutMode={handleChangeCutMode}
                      activeSegmentId={activeQuickCutId}
                      onSelectSegment={setActiveQuickCutId}
                      onSplitAtTime={handleQuickCutSplit}
                      onDeleteActiveSegment={handleQuickCutDelete}
                      externalSeekTime={seekTimeTarget}
                    />

                    {/* Compact Quick Cut Footer Row: Output Folder + Quick Export */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 340px',
                        gap: '16px',
                        marginTop: '16px',
                        alignItems: 'stretch',
                      }}
                    >
                      <div className="ui-card" style={{ margin: 0 }}>
                        <LocalFolderDestination
                          outputFolder={outputFolder}
                          onChangeFolder={handleChangeOutputFolder}
                          disabled={isProcessing}
                        />
                      </div>

                      <div
                        className="ui-card"
                        style={{
                          margin: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          padding: '16px',
                        }}
                      >
                        <button
                          type="button"
                          className="btn btn-primary btn-lg"
                          style={{ width: '100%', justifyContent: 'center' }}
                          onClick={handleProcessVideo}
                          disabled={isProcessing || quickCutSegments.length === 0}
                        >
                          <Download size={16} />
                          <span>
                            {isProcessing
                              ? 'Đang xử lý...'
                              : quickCutSegments.length === 0
                              ? 'Không có đoạn nào'
                              : `Xuất ${quickCutSegments.length} đoạn video`}
                          </span>
                        </button>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            marginTop: '8px',
                            fontSize: '12px',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          <span>{quickCutSegments.length} đoạn</span>
                          <span>&bull;</span>
                          <span className="font-monospace">{totalActiveSeconds}s</span>
                          <span>&bull;</span>
                          <GlassPill variant="accent">{selectedResolution}</GlassPill>
                        </div>
                      </div>
                    </div>

                    {/* Native Progress Status in Quick Cut */}
                    <div style={{ marginTop: '16px' }}>
                      <ProcessStatus
                        step={step}
                        errorMessage={errorMessage}
                        totalSegments={quickCutSegments.length}
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Footer */}
            <footer
              style={{
                textAlign: 'center',
                marginTop: '40px',
                paddingTop: '20px',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                <strong style={{ color: 'var(--text-primary)' }}>YouTube Clip Studio</strong> &bull; Công cụ cắt video YouTube chuyên nghiệp
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
                Phát triển bởi <strong style={{ color: 'var(--text-primary)' }}>vanhkhuc.dev</strong> &bull; Kết nối qua{' '}
                <a
                  href="https://www.facebook.com/vanhkhuc2005"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--accent)', textDecoration: 'none' }}
                >
                  Facebook (vanhkhuc2005)
                </a>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  fontSize: '13px',
                  color: 'var(--color-danger)',
                }}
              >
                <Heart size={14} fill="var(--color-danger)" />
                <span>Gửi cho em bé iu Trang Vũ &lt;3</span>
              </div>
            </footer>
          </>
        )}
      </main>

      {/* Floating Delete Toast with Undo Button */}
      {toastMessage && (
        <div className="toast-notification">
          <span>{toastMessage.text}</span>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            style={{ padding: '3px 10px', fontSize: '11px' }}
            onClick={() => {
              if (toastMessage.mode === 'quick') handleUndoQuickCut();
              else handleUndoPrecision();
            }}
          >
            <RotateCcw size={11} />
            <span>Hoàn tác</span>
          </button>
        </div>
      )}

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
