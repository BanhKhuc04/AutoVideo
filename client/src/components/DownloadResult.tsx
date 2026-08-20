import React, { useState } from 'react';
import { Check, FolderOpen, RotateCcw, Zap, AlertCircle } from 'lucide-react';
import { ProcessVideoResponse } from '../types';
import { openLocalFolderApi } from '../services/api';

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
  const [openError, setOpenError] = useState<string | null>(null);

  const handleOpenLocalFolder = async () => {
    setOpenError(null);
    const pathOpen = result.localSavedPath || outputFolder;

    if (!pathOpen) {
      setOpenError('Chưa xác định được đường dẫn thư mục.');
      return;
    }

    try {
      if (window.desktopAPI?.openFolder) {
        await window.desktopAPI.openFolder(pathOpen);
      } else if (window.electronAPI?.openFolder) {
        await window.electronAPI.openFolder(pathOpen);
      } else {
        await openLocalFolderApi(pathOpen);
      }
    } catch (err: any) {
      setOpenError(err.message || 'Không thể mở thư mục lưu.');
    }
  };

  const timing = result.timing;
  const isFastCopy = timing?.clipTimings?.some((t) => t.strategy === 'fast-copy');

  return (
    <div
      className="animate-fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
        gap: '16px',
        maxWidth: '560px',
        margin: '0 auto',
      }}
    >
      {/* Success Icon */}
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: 'var(--success-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Check size={24} style={{ color: 'var(--success)' }} />
      </div>

      {/* Title */}
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
          Đã xuất {result.totalSegments} video thành công
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
          Các video đã được lưu trực tiếp vào:
        </p>
        {result.localSavedPath && (
          <p
            className="text-mono"
            style={{
              fontSize: '12px',
              color: '#3B82F6',
              margin: '6px 0 0',
              wordBreak: 'break-all',
              background: 'var(--bg-elevated)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {result.localSavedPath}
          </p>
        )}
      </div>

      {/* Quality Notice (e.g. source 720p fallback) */}
      {result.qualityNotice && (
        <div
          style={{
            padding: '8px 12px',
            background: 'var(--accent-subtle)',
            border: '1px solid var(--accent-border)',
            borderRadius: 'var(--radius-md)',
            fontSize: '12px',
            color: 'var(--accent)',
          }}
        >
          {result.qualityNotice}
        </div>
      )}

      {/* Performance Badge */}
      {timing && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: 'var(--text-muted)',
            background: 'var(--bg-elevated)',
            padding: '4px 10px',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <Zap size={13} color="#F59E0B" />
          <span>
            Thời gian: <strong>{(timing.totalMs / 1000).toFixed(1)}s</strong> (Tải: {(timing.downloadMs / 1000).toFixed(1)}s • Cắt: {(timing.cutMs / 1000).toFixed(1)}s
            {isFastCopy ? ' • Fast Copy ⚡' : ''})
          </span>
        </div>
      )}

      {openError && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--danger)',
            fontSize: '12px',
          }}
        >
          <AlertCircle size={14} />
          <span>{openError}</span>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleOpenLocalFolder}
        >
          <FolderOpen size={15} />
          <span>Mở thư mục</span>
        </button>

        <button
          type="button"
          className="btn"
          onClick={onReset}
        >
          <RotateCcw size={14} />
          <span>Làm video khác</span>
        </button>
      </div>
    </div>
  );
};
