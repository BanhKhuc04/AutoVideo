import React from 'react';
import { Film, HelpCircle, Settings } from 'lucide-react';

interface HeaderProps {
  onOpenTutorial?: () => void;
  onOpenSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenTutorial,
  onOpenSettings,
}) => {
  return (
    <header className="py-4 border-bottom" style={{ borderColor: 'var(--border-subtle)', background: 'rgba(11, 12, 14, 0.8)', backdropFilter: 'blur(12px)' }}>
      <div className="container" style={{ maxWidth: '980px' }}>
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
          {/* Logo & Title */}
          <div className="d-flex align-items-center gap-3">
            <div
              className="d-flex align-items-center justify-content-center shadow-sm"
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #FF3B30 0%, #E02828 100%)',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(255, 59, 48, 0.3)',
              }}
            >
              <Film size={22} strokeWidth={2.2} />
            </div>
            <div>
              <div className="d-flex align-items-center gap-2">
                <h1 className="h6 mb-0 fw-semibold text-white" style={{ letterSpacing: '-0.01em', fontSize: '1.05rem' }}>
                  YouTube Clip Studio
                </h1>
                <span className="apple-pill font-monospace" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                  720p
                </span>
              </div>
              <p className="mb-0" style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                Cắt video nhanh, chính xác và lưu trực tiếp trên máy.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="d-flex align-items-center gap-2">
            {onOpenTutorial && (
              <button
                type="button"
                className="apple-btn-secondary"
                style={{ padding: '7px 12px', fontSize: '0.84rem' }}
                onClick={onOpenTutorial}
                title="Hướng dẫn sử dụng nhanh"
              >
                <HelpCircle size={16} strokeWidth={1.8} />
                <span>Hướng dẫn</span>
              </button>
            )}

            {onOpenSettings && (
              <button
                type="button"
                className="apple-btn-secondary"
                style={{ padding: '7px 12px', fontSize: '0.84rem' }}
                onClick={onOpenSettings}
                title="Cài đặt ứng dụng"
              >
                <Settings size={16} strokeWidth={1.8} />
                <span>Cài đặt</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
