import React from 'react';
import { Clipboard, X, ExternalLink, Loader2 } from 'lucide-react';
import { isValidYoutubeUrl, secondsToTimeString } from '../utils/timeValidator';
import { VideoMetadata } from '../types';
import { GlassPanel } from './glass/GlassPanel';
import { GlassButton } from './glass/GlassButton';
import { GlassInput } from './glass/GlassInput';

interface VideoUrlInputProps {
  url: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  metadata?: VideoMetadata | null;
  isLoadingMetadata?: boolean;
}

const YouTubeIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#FF3B30">
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
    <GlassPanel className="p-3 mb-3.5">
      {/* Compact Input Row */}
      <div className="position-relative d-flex align-items-center">
        <div
          className="position-absolute d-flex align-items-center justify-content-center"
          style={{ left: '12px', pointerEvents: 'none', zIndex: 2 }}
        >
          <YouTubeIcon size={18} />
        </div>

        <GlassInput
          id="youtube-url"
          type="url"
          style={{ paddingLeft: '38px', paddingRight: url ? '80px' : '65px' }}
          placeholder="Dán liên kết YouTube (https://www.youtube.com/watch?v=...)"
          value={url}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          isInvalid={isInvalid}
        />

        <div className="position-absolute d-flex align-items-center gap-1" style={{ right: '6px', zIndex: 2 }}>
          {url && !disabled && (
            <GlassButton
              variant="icon"
              onClick={() => onChange('')}
              title="Xóa liên kết"
            >
              <X size={14} strokeWidth={2} />
            </GlassButton>
          )}

          {!disabled && (
            <GlassButton
              size="sm"
              onClick={handlePasteClipboard}
              title="Dán từ bộ nhớ tạm"
            >
              <Clipboard size={13} />
              <span>Dán</span>
            </GlassButton>
          )}
        </div>
      </div>

      {isInvalid && (
        <div className="small mt-2 px-1 text-danger" style={{ fontSize: '0.78rem' }}>
          Định dạng liên kết chưa hợp lệ. Vui lòng dán liên kết video YouTube.
        </div>
      )}

      {/* Loading indicator */}
      {isLoadingMetadata && (
        <div className="d-flex align-items-center gap-2 mt-2 px-2" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          <Loader2 size={13} className="animate-spin" style={{ color: 'var(--accent-blue)', animation: 'spin 1s linear infinite' }} />
          <span>Đang nhận diện video...</span>
        </div>
      )}

      {/* Compact Media Row once loaded */}
      {metadata && !isLoadingMetadata && (
        <div
          className="d-flex align-items-center justify-content-between p-2 mt-2.5 rounded-3 animate-fade-in"
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--glass-border-subtle)',
          }}
        >
          <div className="d-flex align-items-center gap-2.5 overflow-hidden">
            {metadata.thumbnail && (
              <img
                src={metadata.thumbnail}
                alt={metadata.title}
                className="rounded-2 object-fit-cover shadow-sm flex-shrink-0"
                style={{ width: '64px', height: '36px' }}
              />
            )}
            <div className="overflow-hidden">
              <div
                className="fw-medium text-white text-truncate"
                style={{ fontSize: '0.84rem' }}
                title={metadata.title}
              >
                {metadata.title}
              </div>
              <div className="d-flex align-items-center gap-2" style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                {metadata.uploader && <span className="text-truncate" style={{ maxWidth: '180px' }}>{metadata.uploader}</span>}
                {metadata.duration > 0 && (
                  <>
                    <span>&bull;</span>
                    <span className="font-monospace text-warning">
                      {secondsToTimeString(metadata.duration)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <GlassButton
            size="sm"
            onClick={handleOpenExternal}
            title="Mở trên YouTube"
            className="flex-shrink-0 ms-2"
          >
            <ExternalLink size={13} />
            <span className="d-none d-sm-inline">Mở</span>
          </GlassButton>
        </div>
      )}
    </GlassPanel>
  );
};
