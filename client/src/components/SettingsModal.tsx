import React, { useState, useEffect } from 'react';
import { Settings, X, Folder, HelpCircle } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  outputFolder: string;
  onChangeFolder: (folder: string) => void;
  selectedResolution: '720p' | '1080p';
  onChangeResolution: (res: '720p' | '1080p') => void;
  onOpenTutorial: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  outputFolder,
  onChangeFolder,
  selectedResolution,
  onChangeResolution,
  onOpenTutorial,
  onClose,
}) => {
  const [isElectron, setIsElectron] = useState<boolean>(false);
  const [appVersion, setAppVersion] = useState<string>('1.0.0');

  useEffect(() => {
    if (isOpen) {
      if (typeof window !== 'undefined' && window.electronAPI?.isElectron) {
        setIsElectron(true);
        window.electronAPI.getAppVersion().then((v) => {
          if (v) setAppVersion(v);
        }).catch(() => {});
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectFolderDialog = async () => {
    if (window.electronAPI?.selectFolder) {
      try {
        const selected = await window.electronAPI.selectFolder();
        if (selected) {
          onChangeFolder(selected);
        }
      } catch (err: any) {
        console.error('Failed to select folder:', err);
      }
    }
  };

  return (
    <div
      className="modal show d-block apple-modal-backdrop"
      style={{ zIndex: 1060 }}
      tabIndex={-1}
      role="dialog"
      onClick={onClose}
    >
      <div
        className="modal-dialog modal-dialog-centered"
        style={{ maxWidth: '520px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="apple-modal-content p-4 text-light">
          {/* Header */}
          <div className="d-flex align-items-center justify-content-between mb-4 pb-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <div className="d-flex align-items-center gap-2">
              <Settings size={18} style={{ color: 'var(--accent-apple)' }} />
              <h5 className="modal-title fw-semibold mb-0 text-white" style={{ fontSize: '1rem' }}>
                Cài đặt
              </h5>
            </div>
            <button
              type="button"
              className="apple-btn-icon"
              onClick={onClose}
              aria-label="Đóng"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          {/* Body */}
          <div className="d-flex flex-column gap-4 mb-4">
            {/* Section 1: Video */}
            <div>
              <div className="text-secondary small fw-medium mb-2" style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Video
              </div>
              <div className="apple-card-inner p-3 d-flex align-items-center justify-content-between">
                <div>
                  <div className="fw-medium text-white" style={{ fontSize: '0.86rem' }}>
                    Chất lượng mặc định
                  </div>
                  <div className="small" style={{ color: 'var(--text-tertiary)', fontSize: '0.74rem' }}>
                    Chuẩn tối ưu cho YouTube &amp; Shorts
                  </div>
                </div>

                <div className="d-flex gap-1.5 bg-dark p-1 rounded-2" style={{ border: '1px solid var(--border-subtle)' }}>
                  <button
                    type="button"
                    className={`btn btn-sm py-1 px-2.5 font-monospace ${
                      selectedResolution === '720p' ? 'apple-btn-primary' : 'text-secondary'
                    }`}
                    style={{ fontSize: '0.78rem', borderRadius: '6px' }}
                    onClick={() => onChangeResolution('720p')}
                  >
                    720p HD
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm py-1 px-2.5 font-monospace ${
                      selectedResolution === '1080p' ? 'apple-btn-primary' : 'text-secondary'
                    }`}
                    style={{ fontSize: '0.78rem', borderRadius: '6px' }}
                    onClick={() => onChangeResolution('1080p')}
                  >
                    1080p FHD
                  </button>
                </div>
              </div>
            </div>

            {/* Section 2: Storage */}
            <div>
              <div className="text-secondary small fw-medium mb-2" style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Lưu trữ
              </div>
              <div className="apple-card-inner p-3 d-flex flex-column gap-2">
                <div className="d-flex align-items-center justify-content-between">
                  <div className="fw-medium text-white" style={{ fontSize: '0.86rem' }}>
                    Thư mục mặc định
                  </div>
                  {isElectron && (
                    <button
                      type="button"
                      className="apple-btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                      onClick={handleSelectFolderDialog}
                    >
                      <Folder size={13} />
                      <span>Chọn</span>
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  className="apple-input font-monospace"
                  style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                  placeholder="Mặc định: data/output"
                  value={outputFolder}
                  onChange={(e) => onChangeFolder(e.target.value)}
                />
              </div>
            </div>

            {/* Section 3: App info */}
            <div>
              <div className="text-secondary small fw-medium mb-2" style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Ứng dụng
              </div>
              <div className="apple-card-inner p-3 d-flex align-items-center justify-content-between">
                <div>
                  <div className="fw-medium text-white" style={{ fontSize: '0.86rem' }}>
                    Phiên bản
                  </div>
                  <div className="small" style={{ color: 'var(--text-tertiary)', fontSize: '0.74rem' }}>
                    YouTube Clip Studio Desktop
                  </div>
                </div>
                <span className="apple-pill font-monospace" style={{ fontSize: '0.76rem' }}>
                  v{appVersion}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="d-flex align-items-center justify-content-between pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <button
              type="button"
              className="apple-btn-secondary"
              style={{ fontSize: '0.82rem' }}
              onClick={onOpenTutorial}
            >
              <HelpCircle size={15} />
              <span>Xem hướng dẫn</span>
            </button>

            <button
              type="button"
              className="apple-btn-primary"
              style={{ fontSize: '0.82rem', padding: '7px 18px' }}
              onClick={onClose}
            >
              <span>Xong</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
