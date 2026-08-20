import React, { useState, useEffect, useCallback } from 'react';
import { Settings, X, Folder, HelpCircle, Info } from 'lucide-react';
import { GlassSegmentedControl } from './glass/GlassSegmentedControl';

interface SettingsModalProps {
  isOpen: boolean;
  outputFolder: string;
  onChangeFolder: (folder: string) => void;
  selectedResolution: '720p' | '1080p';
  onChangeResolution: (res: '720p' | '1080p') => void;
  createZip: boolean;
  onChangeCreateZip: (createZip: boolean) => void;
  onOpenTutorial: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  outputFolder,
  onChangeFolder,
  selectedResolution,
  onChangeResolution,
  createZip,
  onChangeCreateZip,
  onOpenTutorial,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'behavior' | 'about'>('general');
  const [isElectron, setIsElectron] = useState<boolean>(false);
  const [appVersion, setAppVersion] = useState<string>('1.0.0');

  // Behavior settings
  const [autoOpenFolder, setAutoOpenFolder] = useState<boolean>(() => {
    return localStorage.getItem('setting_auto_open_folder') !== 'false';
  });
  const [rememberLastUrl, setRememberLastUrl] = useState<boolean>(() => {
    return localStorage.getItem('setting_remember_last_url') === 'true';
  });

  useEffect(() => {
    if (isOpen && typeof window !== 'undefined' && window.electronAPI?.isElectron) {
      setIsElectron(true);
      window.electronAPI.getAppVersion().then((v) => {
        if (v) setAppVersion(v);
      }).catch(() => {});
    }
  }, [isOpen]);

  // Keyboard handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  const handleToggleAutoOpen = (val: boolean) => {
    setAutoOpenFolder(val);
    localStorage.setItem('setting_auto_open_folder', val ? 'true' : 'false');
  };

  const handleToggleRememberUrl = (val: boolean) => {
    setRememberLastUrl(val);
    localStorage.setItem('setting_remember_last_url', val ? 'true' : 'false');
  };

  const handleSelectFolderDialog = async () => {
    if (window.electronAPI?.selectFolder) {
      try {
        const selected = await window.electronAPI.selectFolder();
        if (selected) onChangeFolder(selected);
      } catch (err: any) {
        console.error('Failed to select folder:', err);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="modal-sheet"
        style={{ width: '520px', maxWidth: '90vw' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header + Tabs */}
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border-default)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={16} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Cài đặt
              </span>
            </div>
            <button type="button" className="btn-icon" onClick={onClose} aria-label="Đóng">
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <GlassSegmentedControl<'general' | 'behavior' | 'about'>
              size="sm"
              value={activeTab}
              onChange={setActiveTab}
              options={[
                { value: 'general', label: 'Chung' },
                { value: 'behavior', label: 'Hành vi' },
                { value: 'about', label: 'Ứng dụng' },
              ]}
            />
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', minHeight: '240px' }}>
          {/* GENERAL */}
          {activeTab === 'general' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Quality */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                  Video
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                      Chất lượng mặc định
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Độ phân giải khi tải và cắt video
                    </div>
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
                </div>
              </div>

              {/* Storage */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                  Lưu trữ
                </div>
                <div
                  style={{
                    padding: '12px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                      Thư mục mặc định
                    </span>
                    {isElectron && (
                      <button type="button" className="btn btn-sm" onClick={handleSelectFolderDialog}>
                        <Folder size={12} />
                        <span>Chọn</span>
                      </button>
                    )}
                  </div>
                  <input
                    className="input text-mono"
                    style={{ fontSize: '12px', padding: '6px 10px' }}
                    placeholder="Mặc định: data/output"
                    value={outputFolder}
                    onChange={(e) => onChangeFolder(e.target.value)}
                  />
                </div>
              </div>

              {/* ZIP Packaging Setting */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                  Đóng gói xuất file
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                      Đóng gói video thành ZIP
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {createZip ? 'BẬT: Tạo 1 file ZIP nén chứa tất cả video' : 'TẮT: Xuất từng file MP4 riêng lẻ trực tiếp'}
                    </div>
                  </div>
                  <GlassSegmentedControl<'on' | 'off'>
                    size="sm"
                    value={createZip ? 'on' : 'off'}
                    onChange={(v) => onChangeCreateZip(v === 'on')}
                    options={[
                      { value: 'on', label: 'BẬT' },
                      { value: 'off', label: 'TẮT' },
                    ]}
                  />
                </div>
              </div>
            </div>
          )}

          {/* BEHAVIOR */}
          {activeTab === 'behavior' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {/* Auto Open Folder */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                    Mở thư mục sau khi xuất
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Mở File Explorer ngay khi hoàn tất
                  </div>
                </div>
                <input
                  type="checkbox"
                  className="toggle"
                  checked={autoOpenFolder}
                  onChange={(e) => handleToggleAutoOpen(e.target.checked)}
                />
              </label>

              {/* Remember URL */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                    Ghi nhớ video gần nhất
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Tự động nạp lại liên kết khi mở ứng dụng
                  </div>
                </div>
                <input
                  type="checkbox"
                  className="toggle"
                  checked={rememberLastUrl}
                  onChange={(e) => handleToggleRememberUrl(e.target.checked)}
                />
              </label>
            </div>
          )}

          {/* ABOUT */}
          {activeTab === 'about' && (
            <div
              className="animate-fade-in"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                padding: '16px 0',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                }}
              >
                <Info size={24} />
              </div>

              <div>
                <h4 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  YouTube Clip Studio
                </h4>
                <div className="text-mono" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Phiên bản {appVersion}
                </div>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '340px', lineHeight: 1.5 }}>
                Công cụ cắt video YouTube chuyên nghiệp. Hỗ trợ 720p/1080p, xuất MP4 trực tiếp vào máy tính.
              </p>

              {/* Developer Credit */}
              <div
                style={{
                  padding: '8px 16px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                }}
              >
                <div>Tác giả: <strong style={{ color: 'var(--text-primary)' }}>vanhkhuc.dev</strong></div>
                <div style={{ fontSize: '11px', marginTop: '2px', opacity: 0.8 }}>Love TrangVu &lt;3</div>
              </div>

              <button type="button" className="btn btn-sm" onClick={onOpenTutorial}>
                <HelpCircle size={13} />
                <span>Xem hướng dẫn</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '12px 16px',
            borderTop: '1px solid var(--border-default)',
          }}
        >
          <button type="button" className="btn btn-sm btn-primary" onClick={onClose}>
            Xong
          </button>
        </div>
      </div>
    </div>
  );
};
