import React from 'react';
import { Film, HelpCircle, Settings, Command } from 'lucide-react';
import { GlassSegmentedControl } from './glass/GlassSegmentedControl';
import { GlassButton } from './glass/GlassButton';

interface HeaderProps {
  selectedResolution: '720p' | '1080p';
  onChangeResolution: (res: '720p' | '1080p') => void;
  onOpenTutorial?: () => void;
  onOpenSettings?: () => void;
  onOpenCommandPalette?: () => void;
  contextualStatus?: string;
}

export const Header: React.FC<HeaderProps> = ({
  selectedResolution,
  onChangeResolution,
  onOpenTutorial,
  onOpenSettings,
  onOpenCommandPalette,
  contextualStatus,
}) => {
  return (
    <header
      className="sticky-top py-2.5 px-4 mb-4 border-bottom"
      style={{
        background: 'rgba(12, 14, 18, 0.72)',
        backdropFilter: 'blur(32px) saturate(180%)',
        WebkitBackdropFilter: 'blur(32px) saturate(180%)',
        borderColor: 'var(--glass-border)',
        zIndex: 1020,
      }}
    >
      <div className="container-fluid d-flex align-items-center justify-content-between" style={{ maxWidth: '1440px' }}>
        {/* Left: App Brand */}
        <div className="d-flex align-items-center gap-2.5">
          <div
            className="d-flex align-items-center justify-content-center shadow-sm"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '9px',
              background: 'linear-gradient(135deg, #FF3B30 0%, #E02828 100%)',
              color: '#ffffff',
              boxShadow: '0 2px 10px rgba(255, 59, 48, 0.35)',
            }}
          >
            <Film size={17} strokeWidth={2.2} />
          </div>
          <span className="fw-semibold text-white" style={{ fontSize: '0.94rem', letterSpacing: '-0.01em' }}>
            YouTube Clip Studio
          </span>
        </div>

        {/* Center: Contextual Status or Quick Search trigger */}
        <div className="d-none d-md-flex align-items-center gap-2">
          {contextualStatus ? (
            <span className="text-secondary small font-monospace px-3 py-1 rounded-pill" style={{ background: 'rgba(255,255,255,0.05)', fontSize: '0.78rem' }}>
              {contextualStatus}
            </span>
          ) : (
            onOpenCommandPalette && (
              <button
                type="button"
                className="glass-btn"
                style={{ padding: '4px 14px', fontSize: '0.78rem', borderRadius: 'var(--radius-pill)', color: 'var(--text-tertiary)' }}
                onClick={onOpenCommandPalette}
                title="Mở bảng lệnh nhanh (Ctrl + K)"
              >
                <Command size={13} />
                <span>Tìm kiếm lệnh...</span>
                <kbd style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: '3px', fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Ctrl K</kbd>
              </button>
            )
          )}
        </div>

        {/* Right: Quality Selector & Utility Actions */}
        <div className="d-flex align-items-center gap-2">
          {/* Quality Segmented Control */}
          <GlassSegmentedControl<'720p' | '1080p'>
            size="sm"
            value={selectedResolution}
            onChange={onChangeResolution}
            options={[
              { value: '720p', label: '720p' },
              { value: '1080p', label: '1080p' },
            ]}
          />

          {onOpenTutorial && (
            <GlassButton
              variant="icon"
              onClick={onOpenTutorial}
              title="Hướng dẫn sử dụng nhanh"
            >
              <HelpCircle size={16} strokeWidth={1.8} />
            </GlassButton>
          )}

          {onOpenSettings && (
            <GlassButton
              variant="icon"
              onClick={onOpenSettings}
              title="Cài đặt ứng dụng (Ctrl + ,)"
            >
              <Settings size={16} strokeWidth={1.8} />
            </GlassButton>
          )}
        </div>
      </div>
    </header>
  );
};
