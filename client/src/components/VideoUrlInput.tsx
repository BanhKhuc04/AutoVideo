import React from 'react';
import { Clipboard, X, ExternalLink, Loader2, HelpCircle } from 'lucide-react';
import { isValidYoutubeUrl, secondsToTimeString } from '../utils/timeValidator';
import { VideoMetadata } from '../types';

interface VideoUrlInputProps {
  url: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  metadata?: VideoMetadata | null;
  isLoadingMetadata?: boolean;
}

export const YouTubeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

export const VideoUrlInput: React.FC<VideoUrlInputProps> = ({
  url,
  onChange,
  disabled,
  metadata,
  isLoadingMetadata,
}) => {
  const isInvalid = url.trim().length > 0 && !isValidYoutubeUrl(url);

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        onChange(text.trim());
      }
    } catch {}
  };

  const handleOpenExternal = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!url) return;
    if ((window as any).electronAPI?.openExternal) {
      (window as any).electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="apple-card p-4 mb-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div className="d-flex align-items-center gap-2">
          <span className="fw-semibold text-white" style={{ fontSize: '0.92rem' }}>
            Video nguồn
          </span>
          <span
            className="text-secondary"
            title="Dán liên kết video YouTube thông thường, link rút gọn youtu.be hoặc YouTube Shorts"
            style={{ cursor: 'help' }}
          >
            <HelpCircle size={14} style={{ color: 'var(--text-tertiary)' }} />
          </span>
        </div>

        {!disabled && (
          <button
            type="button"
            className="apple-btn-secondary"
            style={{ padding: '5px 10px', fontSize: '0.78rem' }}
            onClick={handlePasteClipboard}
            title="Dán từ bộ nhớ tạm"
          >
            <Clipboard size={14} strokeWidth={1.8} />
            <span>Dán</span>
          </button>
        )}
      </div>

      {/* Input Group */}
      <div className="position-relative d-flex align-items-center mb-2">
        <div
          className="position-absolute d-flex align-items-center justify-content-center"
          style={{ left: '12px', color: '#FF3B30', pointerEvents: 'none' }}
        >
          <YouTubeIcon size={18} />
        </div>

        <input
          id="youtube-url"
          type="url"
          className={`apple-input ${isInvalid ? 'is-invalid' : ''}`}
          style={{ paddingLeft: '38px', paddingRight: url ? '40px' : '14px' }}
          placeholder="Dán liên kết YouTube (https://www.youtube.com/watch?v=...)"
          value={url}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          autoFocus
        />

        {url && !disabled && (
          <button
            className="position-absolute apple-btn-icon"
            style={{ right: '8px' }}
            type="button"
            onClick={() => onChange('')}
            title="Xóa liên kết"
          >
            <X size={16} strokeWidth={2} />
          </button>
        )}
      </div>

      {isInvalid && (
        <div className="small mt-2" style={{ color: 'var(--color-danger)', fontSize: '0.8rem' }}>
          Định dạng liên kết chưa hợp lệ. Vui lòng dán đúng đường dẫn video YouTube.
        </div>
      )}

      {/* Loading state indicator */}
      {isLoadingMetadata && (
        <div className="d-flex align-items-center gap-2 mt-3 p-2 px-3 apple-card-inner" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          <Loader2 size={15} className="animate-spin text-primary" style={{ animation: 'spin 1s linear infinite' }} />
          <span>Đang nhận diện video và thời lượng từ YouTube...</span>
        </div>
      )}

      {/* Video Info Card after fetching */}
      {metadata && !isLoadingMetadata && (
        <div className="d-flex align-items-center justify-content-between p-3 mt-3 apple-card-inner flex-wrap gap-3 animate-fade-in">
          <div className="d-flex align-items-center gap-3">
            {metadata.thumbnail && (
              <img
                src={metadata.thumbnail}
                alt={metadata.title}
                className="rounded-2 object-fit-cover shadow-sm"
                style={{ width: '84px', height: '48px', border: '1px solid var(--border-subtle)' }}
              />
            )}
            <div>
              <div
                className="fw-medium text-white text-truncate"
                style={{ maxWidth: '460px', fontSize: '0.88rem' }}
                title={metadata.title}
              >
                {metadata.title}
              </div>
              <div className="d-flex align-items-center gap-2 mt-1" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {metadata.uploader && <span>{metadata.uploader}</span>}
                {metadata.duration > 0 && (
                  <>
                    <span>&bull;</span>
                    <span className="font-monospace text-warning fw-semibold">
                      {secondsToTimeString(metadata.duration)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="apple-btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            onClick={handleOpenExternal}
            title="Mở video trên YouTube"
          >
            <ExternalLink size={14} strokeWidth={1.8} />
            <span>Mở YouTube</span>
          </button>
        </div>
      )}
    </div>
  );
};
