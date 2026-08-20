import React from 'react';
import { Clipboard, X, ExternalLink, Loader2 } from 'lucide-react';
import { isValidYoutubeUrl, secondsToTimeString } from '../utils/timeValidator';
import { VideoMetadata } from '../types';

interface VideoUrlInputProps {
  url: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  metadata?: VideoMetadata | null;
  isLoadingMetadata?: boolean;
}

const YouTubeIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#FF0000">
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
      if (text) onChange(text.trim());
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
    <div className="section">
      <div className="section-title" style={{ fontSize: '13px' }}>Nguồn video</div>

      {/* Input Row */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <div
          style={{
            position: 'absolute',
            left: '12px',
            pointerEvents: 'none',
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <YouTubeIcon size={16} />
        </div>

        <input
          id="youtube-url"
          type="url"
          className={`input ${isInvalid ? 'input-error' : ''}`}
          style={{
            paddingLeft: '36px',
            paddingRight: url ? '80px' : '60px',
          }}
          placeholder="https://www.youtube.com/watch?v=..."
          value={url}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />

        <div
          style={{
            position: 'absolute',
            right: '4px',
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {url && !disabled && (
            <button
              type="button"
              className="btn-icon"
              onClick={() => onChange('')}
              title="Xóa"
            >
              <X size={14} strokeWidth={2} />
            </button>
          )}
          {!disabled && (
            <button
              type="button"
              className="btn btn-sm"
              onClick={handlePasteClipboard}
              title="Dán từ clipboard"
            >
              <Clipboard size={12} />
              <span>Dán</span>
            </button>
          )}
        </div>
      </div>

      {isInvalid && (
        <div style={{ fontSize: '12px', color: 'var(--danger)' }}>
          Định dạng liên kết chưa hợp lệ. Vui lòng dán liên kết video YouTube.
        </div>
      )}

      {/* Loading */}
      {isLoadingMetadata && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: 'var(--text-secondary)',
          }}
        >
          <Loader2
            size={13}
            style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }}
          />
          <span>Đang nhận diện video...</span>
        </div>
      )}

      {/* Metadata Row */}
      {metadata && !isLoadingMetadata && (
        <div
          className="animate-fade-in"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              overflow: 'hidden',
              flex: 1,
              minWidth: 0,
            }}
          >
            {metadata.thumbnail && (
              <img
                src={metadata.thumbnail}
                alt={metadata.title}
                style={{
                  width: '64px',
                  height: '40px',
                  borderRadius: '4px',
                  objectFit: 'cover',
                  flexShrink: 0,
                }}
              />
            )}
            <div style={{ overflow: 'hidden', minWidth: 0 }}>
              <div
                className="truncate"
                style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}
                title={metadata.title}
              >
                {metadata.title}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                }}
              >
                {metadata.uploader && (
                  <span className="truncate" style={{ maxWidth: '180px' }}>
                    {metadata.uploader}
                  </span>
                )}
                {metadata.duration > 0 && (
                  <>
                    <span style={{ color: 'var(--text-muted)' }}>·</span>
                    <span className="text-mono">
                      {secondsToTimeString(metadata.duration)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-sm"
            onClick={handleOpenExternal}
            title="Mở trên YouTube"
            style={{ flexShrink: 0, marginLeft: '8px' }}
          >
            <ExternalLink size={12} />
            <span>Mở YouTube</span>
          </button>
        </div>
      )}
    </div>
  );
};
