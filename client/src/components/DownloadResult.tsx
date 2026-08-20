import React, { useState } from 'react';
import { Check } from 'lucide';
import { FolderOpen, RotateCcw, Download } from 'lucide-react';
import { ProcessVideoResponse, ProcessClipResult } from '../types';
import { formatBytes } from '../utils/timeValidator';
import { ClipPreviewPlayer } from './ClipPreviewPlayer';
import { getClipDownloadUrl, openLocalFolderApi } from '../services/api';
import { GlassPanel } from './glass/GlassPanel';
import { GlassButton } from './glass/GlassButton';
import { MorphIconWrapper } from './glass/MorphIconWrapper';

interface DownloadResultProps {
  result: ProcessVideoResponse;
  outputFolder?: string;
  onReset: () => void;
}

export const DownloadResult: React.FC<DownloadResultProps> = ({
  result,
  outputFolder,
  onReset,
}) => {
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);
  const [isOpenFolderLoading, setIsOpenFolderLoading] = useState<boolean>(false);

  const handleDownloadSingleMp4 = (clip: ProcessClipResult, index: number) => {
    setDownloadingIndex(index);
    const downloadUrl = getClipDownloadUrl(result.jobId, clip.filename);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = clip.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloadingIndex(null);
    }, 1200);
  };

  const handleOpenLocalFolder = async () => {
    setIsOpenFolderLoading(true);
    try {
      await openLocalFolderApi(result.localSavedPath || outputFolder || undefined);
    } catch {}
    finally {
      setIsOpenFolderLoading(false);
    }
  };

  return (
    <GlassPanel className="p-4 mb-4 animate-fade-in" variant="elevated">
      {/* Header Banner */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3 pb-3 border-bottom" style={{ borderColor: 'var(--glass-border)' }}>
        <div className="d-flex align-items-center gap-3">
          <div
            className="d-flex align-items-center justify-content-center"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'var(--color-success-translucent)',
              border: '1px solid rgba(48, 209, 88, 0.4)',
              color: 'var(--color-success)',
              boxShadow: '0 0 16px rgba(48, 209, 88, 0.3)',
            }}
          >
            <MorphIconWrapper
              icon={Check}
              spring="snappy"
              size={22}
              color="var(--color-success)"
            />
          </div>
          <div>
            <h2 className="h5 mb-0 fw-semibold text-white">
              Đã lưu {result.totalSegments} video MP4
            </h2>
            <p className="mb-0 font-monospace" style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
              {result.localSavedPath ? result.localSavedPath : 'Lưu trữ thành công vào thư mục máy tính'}
            </p>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <GlassButton
            variant="primary"
            onClick={handleOpenLocalFolder}
            disabled={isOpenFolderLoading}
          >
            <FolderOpen size={15} strokeWidth={2} />
            <span>Mở thư mục</span>
          </GlassButton>

          <GlassButton
            onClick={onReset}
          >
            <RotateCcw size={14} strokeWidth={1.8} />
            <span>Cắt video khác</span>
          </GlassButton>
        </div>
      </div>

      {/* Clip Preview Section */}
      <div className="mb-4">
        <ClipPreviewPlayer clips={result.clips} jobId={result.jobId} />
      </div>

      {/* Individual Clips List */}
      <div>
        <div className="fw-semibold text-white mb-2.5" style={{ fontSize: '0.86rem' }}>
          Danh sách tệp video ({result.clips.length})
        </div>

        <div className="row g-2">
          {result.clips.map((clip, index) => {
            const isCurrentDownloading = downloadingIndex === index;
            const clipNum = (index + 1).toString().padStart(2, '0');

            return (
              <div key={clip.filename} className="col-12 col-md-6">
                <div
                  className="p-2.5 px-3 rounded-3 d-flex align-items-center justify-content-between gap-3 h-100"
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--glass-border-subtle)',
                  }}
                >
                  <div className="d-flex align-items-center gap-2.5 overflow-hidden">
                    <span className="font-monospace fw-semibold" style={{ fontSize: '0.78rem', color: 'var(--accent-blue)' }}>
                      {clipNum}
                    </span>
                    <div className="overflow-hidden">
                      <div
                        className="fw-medium text-white text-truncate font-monospace"
                        style={{ fontSize: '0.8rem' }}
                        title={clip.filename}
                      >
                        {clip.filename}
                      </div>
                      <div className="font-monospace" style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                        {clip.durationSeconds}s &bull; {formatBytes(clip.sizeBytes)}
                      </div>
                    </div>
                  </div>

                  <GlassButton
                    size="sm"
                    onClick={() => handleDownloadSingleMp4(clip, index)}
                    disabled={isCurrentDownloading}
                    title="Tải lại file này"
                  >
                    <Download size={12} strokeWidth={1.8} />
                    <span>Lưu</span>
                  </GlassButton>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </GlassPanel>
  );
};
