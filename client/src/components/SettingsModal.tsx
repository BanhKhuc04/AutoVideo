import React, { useState, useEffect } from 'react';
import { Settings, X, Folder, HelpCircle, Sparkles } from 'lucide-react';
import { GlassButton } from './glass/GlassButton';
import { GlassInput } from './glass/GlassInput';
import { GlassSegmentedControl } from './glass/GlassSegmentedControl';

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
  const [activeTab, setActiveTab] = useState<'general' | 'behavior' | 'appearance' | 'about'>('general');
  const [isElectron, setIsElectron] = useState<boolean>(false);
  const [appVersion, setAppVersion] = useState<string>('1.0.0');

  // Behavior settings
  const [autoOpenFolder, setAutoOpenFolder] = useState<boolean>(() => {
    return localStorage.getItem('setting_auto_open_folder') !== 'false';
  });
  const [rememberLastUrl, setRememberLastUrl] = useState<boolean>(() => {
    return localStorage.getItem('setting_remember_last_url') === 'true';
  });
  const [autoCheckUpdates, setAutoCheckUpdates] = useState<boolean>(() => {
    return localStorage.getItem('setting_auto_check_updates') !== 'false';
  });

  // Appearance settings
  const [themeMode, setThemeMode] = useState<'dark' | 'system'>('dark');
  const [motionMode, setMotionMode] = useState<'full' | 'reduced'>('full');

  useEffect(() => {
    if (isOpen && typeof window !== 'undefined' && window.electronAPI?.isElectron) {
      setIsElectron(true);
      window.electronAPI.getAppVersion().then((v) => {
        if (v) setAppVersion(v);
      }).catch(() => {});
    }
  }, [isOpen]);

  const handleToggleAutoOpen = (val: boolean) => {
    setAutoOpenFolder(val);
    localStorage.setItem('setting_auto_open_folder', val ? 'true' : 'false');
  };

  const handleToggleRememberUrl = (val: boolean) => {
    setRememberLastUrl(val);
    localStorage.setItem('setting_remember_last_url', val ? 'true' : 'false');
  };

  const handleToggleCheckUpdates = (val: boolean) => {
    setAutoCheckUpdates(val);
    localStorage.setItem('setting_auto_check_updates', val ? 'true' : 'false');
  };

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

  if (!isOpen) return null;

  return (
    <div
      className="modal show d-block glass-modal-backdrop"
      style={{ zIndex: 1060 }}
      tabIndex={-1}
      role="dialog"
      onClick={onClose}
    >
      <div
        className="modal-dialog modal-dialog-centered"
        style={{ maxWidth: '580px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="glass-modal-sheet text-light animate-sheet-in">
          {/* macOS Sheet Header & Tabs */}
          <div className="p-3.5 pb-2 border-bottom" style={{ borderColor: 'var(--glass-border)' }}>
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div className="d-flex align-items-center gap-2">
                <Settings size={17} style={{ color: 'var(--accent-blue)' }} />
                <h5 className="fw-semibold mb-0 text-white" style={{ fontSize: '0.96rem' }}>
                  Cài đặt
                </h5>
              </div>
              <GlassButton variant="icon" onClick={onClose} aria-label="Đóng">
                <X size={15} strokeWidth={2} />
              </GlassButton>
            </div>

            {/* macOS Segmented Preference Tabs */}
            <div className="d-flex justify-content-center">
              <GlassSegmentedControl<'general' | 'behavior' | 'appearance' | 'about'>
                size="sm"
                value={activeTab}
                onChange={setActiveTab}
                options={[
                  { value: 'general', label: 'Chung' },
                  { value: 'behavior', label: 'Hành vi' },
                  { value: 'appearance', label: 'Giao diện' },
                  { value: 'about', label: 'Thông tin' },
                ]}
              />
            </div>
          </div>

          {/* Body */}
          <div className="p-4" style={{ minHeight: '260px' }}>
            {/* 1. GENERAL TAB */}
            {activeTab === 'general' && (
              <div className="d-flex flex-column gap-3.5 animate-fade-in">
                <div>
                  <div className="text-secondary small fw-medium mb-1.5" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Video
                  </div>
                  <div className="liquid-glass-card p-3 d-flex align-items-center justify-content-between">
                    <div>
                      <div className="fw-medium text-white" style={{ fontSize: '0.84rem' }}>
                        Chất lượng mặc định
                      </div>
                      <div className="small" style={{ color: 'var(--text-tertiary)', fontSize: '0.74rem' }}>
                        Độ phân giải khi tải và cắt video
                      </div>
                    </div>

                    <GlassSegmentedControl<'720p' | '1080p'>
                      size="sm"
                      value={selectedResolution}
                      onChange={onChangeResolution}
                      options={[
                        { value: '720p', label: '720p HD' },
                        { value: '1080p', label: '1080p FHD' },
                      ]}
                    />
                  </div>
                </div>

                <div>
                  <div className="text-secondary small fw-medium mb-1.5" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Lưu trữ
                  </div>
                  <div className="liquid-glass-card p-3 d-flex flex-column gap-2">
                    <div className="d-flex align-items-center justify-content-between">
                      <div className="fw-medium text-white" style={{ fontSize: '0.84rem' }}>
                        Thư mục mặc định
                      </div>
                      {isElectron && (
                        <GlassButton size="sm" onClick={handleSelectFolderDialog}>
                          <Folder size={13} />
                          <span>Chọn</span>
                        </GlassButton>
                      )}
                    </div>

                    <GlassInput
                      className="font-monospace"
                      style={{ fontSize: '0.78rem', padding: '6px 10px' }}
                      placeholder="Mặc định: data/output"
                      value={outputFolder}
                      onChange={(e) => onChangeFolder(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 2. BEHAVIOR TAB */}
            {activeTab === 'behavior' && (
              <div className="d-flex flex-column gap-2.5 animate-fade-in">
                <label className="liquid-glass-card p-3 d-flex align-items-center justify-content-between cursor-pointer user-select-none">
                  <div>
                    <div className="fw-medium text-white" style={{ fontSize: '0.84rem' }}>
                      Tự động mở thư mục sau khi hoàn tất
                    </div>
                    <div className="small" style={{ color: 'var(--text-tertiary)', fontSize: '0.74rem' }}>
                      Mở Windows Explorer ngay khi cắt xong video
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={autoOpenFolder}
                    onChange={(e) => handleToggleAutoOpen(e.target.checked)}
                    style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                  />
                </label>

                <label className="liquid-glass-card p-3 d-flex align-items-center justify-content-between cursor-pointer user-select-none">
                  <div>
                    <div className="fw-medium text-white" style={{ fontSize: '0.84rem' }}>
                      Ghi nhớ link video gần nhất
                    </div>
                    <div className="small" style={{ color: 'var(--text-tertiary)', fontSize: '0.74rem' }}>
                      Tự động nạp lại liên kết khi mở ứng dụng
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={rememberLastUrl}
                    onChange={(e) => handleToggleRememberUrl(e.target.checked)}
                    style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                  />
                </label>

                <label className="liquid-glass-card p-3 d-flex align-items-center justify-content-between cursor-pointer user-select-none">
                  <div>
                    <div className="fw-medium text-white" style={{ fontSize: '0.84rem' }}>
                      Tự động kiểm tra bản cập nhật yt-dlp
                    </div>
                    <div className="small" style={{ color: 'var(--text-tertiary)', fontSize: '0.74rem' }}>
                      Đảm bảo luôn tải được các video YouTube mới nhất
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={autoCheckUpdates}
                    onChange={(e) => handleToggleCheckUpdates(e.target.checked)}
                    style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                  />
                </label>
              </div>
            )}

            {/* 3. APPEARANCE TAB */}
            {activeTab === 'appearance' && (
              <div className="d-flex flex-column gap-3.5 animate-fade-in">
                <div>
                  <div className="text-secondary small fw-medium mb-1.5" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Chủ đề
                  </div>
                  <div className="liquid-glass-card p-3 d-flex align-items-center justify-content-between">
                    <div>
                      <div className="fw-medium text-white" style={{ fontSize: '0.84rem' }}>
                        Giao diện Liquid Glass
                      </div>
                      <div className="small" style={{ color: 'var(--text-tertiary)', fontSize: '0.74rem' }}>
                        Tối ưu độ tương phản và kính mờ
                      </div>
                    </div>
                    <GlassSegmentedControl<'dark' | 'system'>
                      size="sm"
                      value={themeMode}
                      onChange={setThemeMode}
                      options={[
                        { value: 'dark', label: 'Dark Glass' },
                        { value: 'system', label: 'System' },
                      ]}
                    />
                  </div>
                </div>

                <div>
                  <div className="text-secondary small fw-medium mb-1.5" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Chuyển động (Motion)
                  </div>
                  <div className="liquid-glass-card p-3 d-flex align-items-center justify-content-between">
                    <div>
                      <div className="fw-medium text-white" style={{ fontSize: '0.84rem' }}>
                        Hiệu ứng Morphicons &amp; Spring
                      </div>
                      <div className="small" style={{ color: 'var(--text-tertiary)', fontSize: '0.74rem' }}>
                        Tự động điều chỉnh theo cài đặt hệ điều hành
                      </div>
                    </div>
                    <GlassSegmentedControl<'full' | 'reduced'>
                      size="sm"
                      value={motionMode}
                      onChange={setMotionMode}
                      options={[
                        { value: 'full', label: 'Full Spring' },
                        { value: 'reduced', label: 'Reduced' },
                      ]}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 4. ABOUT TAB */}
            {activeTab === 'about' && (
              <div className="d-flex flex-column align-items-center text-center py-3 animate-fade-in">
                <div
                  className="d-flex align-items-center justify-content-center mb-3 shadow"
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #FF3B30 0%, #E02828 100%)',
                    color: '#ffffff',
                    boxShadow: '0 8px 24px rgba(255, 59, 48, 0.35)',
                  }}
                >
                  <Sparkles size={28} />
                </div>

                <h4 className="fw-semibold text-white mb-1" style={{ fontSize: '1.1rem' }}>
                  YouTube Clip Studio
                </h4>
                <div className="font-monospace text-secondary mb-3" style={{ fontSize: '0.78rem' }}>
                  Phiên bản {appVersion} (macOS 26 Liquid Glass Edition)
                </div>

                <p className="text-secondary small mb-4" style={{ maxWidth: '380px', lineHeight: '1.5', fontSize: '0.8rem' }}>
                  Công cụ cắt video YouTube chuyên nghiệp, chuẩn H.264 / AAC MP4, hỗ trợ lưu trữ trực tiếp và tự động đồng bộ Google Drive Desktop.
                </p>

                <div className="d-flex gap-2">
                  <GlassButton size="sm" onClick={onOpenTutorial}>
                    <HelpCircle size={14} />
                    <span>Xem hướng dẫn</span>
                  </GlassButton>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="d-flex align-items-center justify-content-end p-3 border-top" style={{ borderColor: 'var(--glass-border)' }}>
            <GlassButton variant="primary" onClick={onClose} style={{ padding: '6px 20px' }}>
              <span>Xong</span>
            </GlassButton>
          </div>
        </div>
      </div>
    </div>
  );
};
