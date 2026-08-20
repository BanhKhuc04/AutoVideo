import React, { useState } from 'react';
import { CheckCircle2, FolderOpen, RotateCcw, Download } from 'lucide-react';
import { ProcessVideoResponse, ProcessClipResult } from '../types';
import { formatBytes } from '../utils/timeValidator';
import { ClipPreviewPlayer } from './ClipPreviewPlayer';
import { getClipDownloadUrl, openLocalFolderApi } from '../services/api';

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
    <div className="apple-card p-4 mb-4 animate-fade-in">
      {/* Header Banner */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3 pb-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="d-flex align-items-center gap-3">
          <div
            className="d-flex align-items-center justify-content-center"
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'rgba(48, 209, 88, 0.15)',
              color: 'var(--color-success)',
            }}
          >
            <CheckCircle2 size={26} strokeWidth={2.2} />
          </div>
          <div>
            <h2 className="h5 mb-0 fw-semibold text-white">
              Hoàn tất
            </h2>
            <p className="mb-0" style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
              {result.totalSegments} video MP4 đã được lưu thành công.
            </p>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="apple-btn-primary"
            onClick={handleOpenLocalFolder}
            disabled={isOpenFolderLoading}
          >
            <FolderOpen size={16} strokeWidth={2} />
            <span>Mở thư mục</span>
          </button>

          <button
            type="button"
            className="apple-btn-secondary"
            onClick={onReset}
          >
            <RotateCcw size={15} strokeWidth={1.8} />
            <span>Cắt video khác</span>
          </button>
        </div>
      </div>

      {/* Local Path Banner */}
      {result.localSavedPath && (
        <div className="d-flex align-items-center justify-content-between p-3 mb-4 apple-card-inner flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Vị trí lưu:
            </span>
            <code className="text-white font-monospace" style={{ fontSize: '0.8rem' }}>
              {result.localSavedPath}
            </code>
          </div>
        </div>
      )}

      {/* Clip Preview Section */}
      <div className="mb-4">
        <div className="fw-semibold text-white mb-2" style={{ fontSize: '0.88rem' }}>
          Xem trước các đoạn đã cắt
        </div>
        <ClipPreviewPlayer clips={result.clips} jobId={result.jobId} />
      </div>

      {/* Individual Clips List */}
      <div>
        <div className="fw-semibold text-white mb-3" style={{ fontSize: '0.88rem' }}>
          Danh sách tệp video ({result.clips.length})
        </div>

        <div className="row g-2.5">
          {result.clips.map((clip, index) => {
            const isCurrentDownloading = downloadingIndex === index;
            const clipNum = (index + 1).toString().padStart(2, '0');

            return (
              <div key={clip.filename} className="col-12 col-md-6">
                <div className="apple-card-inner p-3 d-flex align-items-center justify-content-between gap-3 h-100">
                  <div className="d-flex align-items-center gap-2.5 overflow-hidden">
                    <span className="font-monospace fw-semibold" style={{ fontSize: '0.8rem', color: 'var(--accent-apple)' }}>
                      {clipNum}
                    </span>
                    <div className="overflow-hidden">
                      <div
                        className="fw-medium text-white text-truncate font-monospace"
                        style={{ fontSize: '0.82rem' }}
                        title={clip.filename}
                      >
                        {clip.filename}
                      </div>
                      <div className="font-monospace" style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                        {clip.durationSeconds}s &bull; {formatBytes(clip.sizeBytes)}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="apple-btn-secondary flex-shrink-0"
                    style={{ padding: '5px 10px', fontSize: '0.76rem' }}
                    onClick={() => handleDownloadSingleMp4(clip, index)}
                    disabled={isCurrentDownloading}
                    title="Tải lại file này"
                  >
                    <Download size={13} strokeWidth={1.8} />
                    <span>Lưu</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
