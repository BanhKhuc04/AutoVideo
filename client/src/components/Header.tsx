import React from 'react';
import { Film, HelpCircle, Settings, Undo, Redo } from 'lucide-react';
import { GlassSegmentedControl } from './glass/GlassSegmentedControl';

interface HeaderProps {
  selectedResolution: '720p' | '1080p';
  onChangeResolution: (res: '720p' | '1080p') => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onOpenTutorial?: () => void;
  onOpenSettings?: () => void;
  contextualStatus?: string;
}

export const Header: React.FC<HeaderProps> = ({
  selectedResolution,
  onChangeResolution,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onOpenTutorial,
  onOpenSettings,
  contextualStatus,
}) => {
  return (
    <header className="app-header">
      {/* Left: App Brand */}
      <div className="app-brand">
        <div className="app-brand-icon">
          <Film size={15} strokeWidth={2.2} />
        </div>
        <span className="app-brand-title">YouTube Clip Studio</span>
      </div>

      {/* Center: Contextual Status */}
      {contextualStatus && (
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }} className="font-monospace">
          {contextualStatus}
        </div>
      )}

      {/* Right: Quality, Undo/Redo + Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Undo / Redo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginRight: '4px' }}>
          <button
            type="button"
            className="btn-icon"
            onClick={onUndo}
            disabled={!canUndo}
            title="Hoàn tác (Ctrl + Z)"
          >
            <Undo size={14} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="btn-icon"
            onClick={onRedo}
            disabled={!canRedo}
            title="Làm lại (Ctrl + Shift + Z)"
          >
            <Redo size={14} strokeWidth={2} />
          </button>
        </div>

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
