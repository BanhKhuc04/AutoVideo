import React from 'react';
import { Film, HelpCircle, Settings } from 'lucide-react';
import { GlassSegmentedControl } from './glass/GlassSegmentedControl';

interface HeaderProps {
  selectedResolution: '720p' | '1080p';
  onChangeResolution: (res: '720p' | '1080p') => void;
  onOpenTutorial?: () => void;
  onOpenSettings?: () => void;
  contextualStatus?: string;
}

export const Header: React.FC<HeaderProps> = ({
  selectedResolution,
  onChangeResolution,
  onOpenTutorial,
  onOpenSettings,
  contextualStatus,
}) => {
  return (
    <header className="app-header">
      {/* Left: App Brand */}
      <div className="header-left">
        <div className="app-icon">
          <Film size={15} strokeWidth={2.2} />
        </div>
        <span className="app-title">YouTube Clip Studio</span>
      </div>

      {/* Center: Contextual Status */}
      {contextualStatus && (
        <div className="header-center d-none d-md-flex">
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {contextualStatus}
          </span>
        </div>
      )}

      {/* Right: Quality + Actions */}
      <div className="header-right">
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
          <button
            type="button"
            className="btn-icon"
            onClick={onOpenTutorial}
            title="Hướng dẫn sử dụng"
          >
            <HelpCircle size={16} strokeWidth={1.8} />
          </button>
        )}

        {onOpenSettings && (
          <button
            type="button"
            className="btn-icon"
            onClick={onOpenSettings}
            title="Cài đặt (Ctrl + ,)"
          >
            <Settings size={16} strokeWidth={1.8} />
          </button>
        )}
      </div>
    </header>
  );
};
