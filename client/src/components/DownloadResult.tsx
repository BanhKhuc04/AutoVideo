import React, { useState } from 'react';
import { Check, FolderOpen, RotateCcw, ArrowLeft, Zap, AlertCircle, FileVideo } from 'lucide-react';
import { ProcessVideoResponse } from '../types';
import { openLocalFolderApi } from '../services/api';

interface DownloadResultProps {
  result: ProcessVideoResponse;
  outputFolder?: string;
  onReset: () => void;
  onBackToEdit?: () => void;
}

export const DownloadResult: React.FC<DownloadResultProps> = ({
  result,
  outputFolder,
  onReset,
  onBackToEdit,
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
  const clips = result.clips || [];

  return (
    <div
      className="animate-fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '36px 28px',
        textAlign: 'center',
        gap: '20px',
        maxWidth: '680px',
        margin: '0 auto',
      }}
    >
      {/* 1. Large 68px Checkmark Icon */}
      <div
        style={{
          width: '68px',
          height: '68px',
          borderRadius: '50%',
          background: 'rgba(48, 209, 88, 0.15)',
          border: '2px solid rgba(48, 209, 88, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 24px rgba(48, 209, 88, 0.25)',
        }}
      >
        <Check size={36} strokeWidth={2.8} style={{ color: 'var(--color-success)' }} />
      </div>

      {/* 2. Title & Subtitle */}
      <div>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
          Đã xuất {result.totalSegments} video thành công
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
          Video của bạn đã được lưu thành công vào máy tính.
        </p>
      </div>

      {/* 3. Output Path Box */}
      {result.localSavedPath && (
        <div
          style={{
            width: '100%',
            background: 'var(--bg-card-inner)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            textAlign: 'left',
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>
            Thư mục lưu trữ:
          </div>
          <div
            className="font-monospace truncate"
            style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 500 }}
            title={result.localSavedPath}
          >
            {result.localSavedPath}
          </div>
        </div>
      )}

      {/* 4. List of Exported Files */}
      {clips.length > 0 && (
        <div
          style={{
            width: '100%',
            background: 'var(--bg-card-inner)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 14px',
            textAlign: 'left',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Danh sách file ({clips.length} video):
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
            {clips.map((clip) => (
              <div
                key={clip.filename}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', minWidth: 0 }}>
                  <FileVideo size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <span className="truncate" style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                    {clip.filename}
                  </span>
                </div>

                {clip.durationSeconds && (
                  <span className="font-monospace" style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>
                    {clip.durationSeconds}s
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Quality Notice & Timing Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {timing && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              background: 'var(--bg-card-inner)',
              border: '1px solid var(--border-subtle)',
              padding: '4px 12px',
              borderRadius: 'var(--radius-pill)',
            }}
          >
            <Zap size={13} color="#F59E0B" />
            <span>
              Hoàn tất trong <strong>{(timing.totalMs / 1000).toFixed(1)} giây</strong>
              {isFastCopy ? ' • Fast Copy ⚡' : ''}
            </span>
          </div>
        )}

        {result.qualityNotice && (
          <div
            style={{
              fontSize: '12px',
              color: 'var(--text-muted)',
              background: 'rgba(255, 255, 255, 0.04)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-pill)',
            }}
          >
            {result.qualityNotice}
          </div>
        )}
      </div>

      {openError && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--color-danger)',
            fontSize: '12px',
          }}
        >
          <AlertCircle size={14} />
          <span>{openError}</span>
        </div>
      )}

      {/* 6. Primary / Secondary / Tertiary Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {/* Primary Action: Open Folder */}
        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={handleOpenLocalFolder}
        >
          <FolderOpen size={16} />
          <span>Mở thư mục</span>
        </button>

        {/* Secondary Action: Process Another Video */}
        <button
          type="button"
          className="btn btn-lg"
          onClick={onReset}
        >
          <RotateCcw size={15} />
          <span>Làm video khác</span>
        </button>

        {/* Tertiary Action: Back to Editor */}
        {onBackToEdit && (
          <button
            type="button"
            className="btn btn-sm"
            onClick={onBackToEdit}
            title="Quay lại timeline chỉnh sửa tiếp"
          >
            <ArrowLeft size={13} />
            <span>Quay lại chỉnh sửa</span>
          </button>
        )}
      </div>
    </div>
  );
};
