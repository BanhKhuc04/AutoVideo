import React, { useState, useEffect, useCallback } from 'react';
import { Settings, X, Folder, HelpCircle, Info, RefreshCw, Download, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import { GlassSegmentedControl } from './glass/GlassSegmentedControl';
import { UpdateInfo } from '../types';

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
  isProcessing?: boolean;
  onUpdateStatusChange?: (info: UpdateInfo) => void;
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
  isProcessing = false,
  onUpdateStatusChange,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'behavior' | 'updates' | 'about'>('general');
  const [isElectron, setIsElectron] = useState<boolean>(false);
  const [appVersion, setAppVersion] = useState<string>('1.0.0');

  // Behavior settings
  const [autoOpenFolder, setAutoOpenFolder] = useState<boolean>(() => {
    return localStorage.getItem('setting_auto_open_folder') !== 'false';
  });
  const [rememberLastUrl, setRememberLastUrl] = useState<boolean>(() => {
    return localStorage.getItem('setting_remember_last_url') === 'true';
  });
  const [autoCheckUpdate, setAutoCheckUpdate] = useState<boolean>(() => {
    return localStorage.getItem('setting_auto_check_update') !== 'false';
  });

  // Update state
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({ status: 'idle' });

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI?.isElectron) {
      setIsElectron(true);
      window.electronAPI.getAppVersion().then((v) => {
        if (v) setAppVersion(v);
      }).catch(() => {});

      // Subscribe to updater status changes
      if (window.electronAPI.updater?.onStatusChange) {
        const unsubscribe = window.electronAPI.updater.onStatusChange((info) => {
          setUpdateInfo(info);
          onUpdateStatusChange?.(info);
        });
        return () => {
          unsubscribe();
        };
      }
    }
  }, [onUpdateStatusChange]);

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

  const handleToggleAutoCheckUpdate = (val: boolean) => {
    setAutoCheckUpdate(val);
    localStorage.setItem('setting_auto_check_update', val ? 'true' : 'false');
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

  const handleCheckUpdateManual = async () => {
    setUpdateInfo({ status: 'checking' });
    if (window.electronAPI?.updater?.checkForUpdates) {
      try {
        await window.electronAPI.updater.checkForUpdates();
      } catch (err: any) {
        setUpdateInfo({ status: 'error', error: err.message || 'Lỗi kết nối máy chủ' });
      }
    } else {
      setTimeout(() => {
        setUpdateInfo({ status: 'not-available', version: appVersion });
      }, 1000);
    }
  };

  const handleDownloadUpdate = async () => {
    if (window.electronAPI?.updater?.downloadUpdate) {
      try {
        await window.electronAPI.updater.downloadUpdate();
      } catch (err: any) {
        setUpdateInfo({ status: 'error', error: err.message || 'Không thể tải bản cập nhật' });
      }
    }
  };

  const handleRestartAndInstall = async () => {
    if (isProcessing) return;
    if (window.electronAPI?.updater?.quitAndInstall) {
      await window.electronAPI.updater.quitAndInstall();
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
        style={{ width: '500px', maxWidth: '92vw' }}
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
            <GlassSegmentedControl<'general' | 'behavior' | 'updates' | 'about'>
              size="sm"
              value={activeTab}
              onChange={setActiveTab}
              options={[
                { value: 'general', label: 'Chung' },
                { value: 'behavior', label: 'Hành vi' },
                { value: 'updates', label: updateInfo.status === 'available' ? 'Cập nhật •' : 'Cập nhật' },
                { value: 'about', label: 'Ứng dụng' },
              ]}
            />
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', minHeight: '260px' }}>
          {/* 1. GENERAL */}
          {activeTab === 'general' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Quality */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                  Chất lượng Video
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: 'var(--bg-card-inner)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                      Độ phân giải xuất file
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      Mặc định cho các clip cắt được lưu
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

              {/* Default Output Folder */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                  Thư mục lưu trữ
                </div>
                <div
                  style={{
                    padding: '12px 14px',
                    background: 'var(--bg-card-inner)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Thư mục lưu mặc định
                  </div>
                  <div
                    className="font-monospace truncate"
                    style={{
                      fontSize: '11.5px',
                      color: outputFolder ? 'var(--text-secondary)' : 'var(--text-muted)',
                      marginBottom: '10px',
                    }}
                    title={outputFolder || 'Mặc định: Downloads/YouTubeClips'}
                  >
                    {outputFolder || 'Mặc định: Downloads/YouTubeClips'}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={handleSelectFolderDialog}
                    >
                      <Folder size={13} />
                      <span>{outputFolder ? 'Đổi thư mục...' : 'Chọn thư mục...'}</span>
                    </button>
                    {outputFolder && (
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => onChangeFolder('')}
                      >
                        Đặt lại mặc định
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* ZIP Packaging Toggle */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                  Đóng gói ZIP
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: 'var(--bg-card-inner)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                      Tạo file nén .ZIP kèm theo
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      Đóng gói toàn bộ các clip vào 1 file ZIP
                    </div>
                  </div>
                  <GlassSegmentedControl<'ON' | 'OFF'>
                    size="sm"
                    value={createZip ? 'ON' : 'OFF'}
                    onChange={(val) => onChangeCreateZip(val === 'ON')}
                    options={[
                      { value: 'ON', label: 'Bật' },
                      { value: 'OFF', label: 'Tắt' },
                    ]}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 2. BEHAVIOR */}
          {activeTab === 'behavior' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'var(--bg-card-inner)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                    Tự động mở thư mục sau khi xuất
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    Mở File Explorer ngay khi hoàn tất cắt video
                  </div>
                </div>
                <GlassSegmentedControl<'ON' | 'OFF'>
                  size="sm"
                  value={autoOpenFolder ? 'ON' : 'OFF'}
                  onChange={(val) => handleToggleAutoOpen(val === 'ON')}
                  options={[
                    { value: 'ON', label: 'Bật' },
                    { value: 'OFF', label: 'Tắt' },
                  ]}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'var(--bg-card-inner)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                    Ghi nhớ liên kết gần nhất
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    Tự động điền link YouTube khi mở lại app
                  </div>
                </div>
                <GlassSegmentedControl<'ON' | 'OFF'>
                  size="sm"
                  value={rememberLastUrl ? 'ON' : 'OFF'}
                  onChange={(val) => handleToggleRememberUrl(val === 'ON')}
                  options={[
                    { value: 'ON', label: 'Bật' },
                    { value: 'OFF', label: 'Tắt' },
                  ]}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'var(--bg-card-inner)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                    Tự động kiểm tra cập nhật
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    Tự động phát hiện phiên bản mới khi khởi động app
                  </div>
                </div>
                <GlassSegmentedControl<'ON' | 'OFF'>
                  size="sm"
                  value={autoCheckUpdate ? 'ON' : 'OFF'}
                  onChange={(val) => handleToggleAutoCheckUpdate(val === 'ON')}
                  options={[
                    { value: 'ON', label: 'Bật' },
                    { value: 'OFF', label: 'Tắt' },
                  ]}
                />
              </div>
            </div>
          )}

          {/* 3. UPDATES (Auto Update UI) */}
          {activeTab === 'updates' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Version Box */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  background: 'var(--bg-card-inner)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Phiên bản hiện tại
                  </div>
                  <div className="font-monospace" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                    v{appVersion}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={handleCheckUpdateManual}
                  disabled={updateInfo.status === 'checking' || updateInfo.status === 'downloading'}
                >
                  <RefreshCw size={13} className={updateInfo.status === 'checking' ? 'animate-spin' : ''} />
                  <span>{updateInfo.status === 'checking' ? 'Đang kiểm tra...' : 'Kiểm tra cập nhật'}</span>
                </button>
              </div>

              {/* Status Display */}
              {updateInfo.status === 'checking' && (
                <div
                  style={{
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(10, 132, 255, 0.1)',
                    border: '1px solid var(--accent-border)',
                    textAlign: 'center',
                    fontSize: '13px',
                    color: 'var(--accent)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Đang kiểm tra bản phát hành mới từ GitHub...</span>
                  </div>
                </div>
              )}

              {updateInfo.status === 'not-available' && (
                <div
                  style={{
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-success-subtle)',
                    border: '1px solid rgba(48, 209, 88, 0.3)',
                    textAlign: 'center',
                    fontSize: '13px',
                    color: 'var(--color-success)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 600 }}>
                    <CheckCircle size={16} />
                    <span>Bạn đang sử dụng phiên bản mới nhất (v{appVersion})</span>
                  </div>
                </div>
              )}

              {updateInfo.status === 'available' && (
                <div
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(10, 132, 255, 0.12)',
                    border: '1.5px solid var(--accent)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff', fontWeight: 600, fontSize: '14px' }}>
                    <Sparkles size={16} color="#FFD60A" />
                    <span>Phiên bản mới v{updateInfo.version} đã sẵn sàng!</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Bản cập nhật bao gồm các tối ưu hoá hiệu năng và sửa lỗi.
                  </div>
                  {updateInfo.releaseNotes && (
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-muted)',
                        background: 'rgba(0, 0, 0, 0.3)',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        maxHeight: '80px',
                        overflowY: 'auto',
                      }}
                    >
                      {updateInfo.releaseNotes}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={handleDownloadUpdate}
                    >
                      <Download size={13} />
                      <span>Tải bản cập nhật</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => setUpdateInfo({ status: 'idle' })}
                    >
                      Để sau
                    </button>
                  </div>
                </div>
              )}

              {updateInfo.status === 'downloading' && (
                <div
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-card-inner)',
                    border: '1px solid var(--border-medium)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                    <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Đang tải bản cập nhật...</span>
                    <span className="font-monospace" style={{ fontWeight: 700, color: 'var(--accent)' }}>
                      {updateInfo.percent || 0}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div
                    style={{
                      width: '100%',
                      height: '8px',
                      borderRadius: '4px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${updateInfo.percent || 0}%`,
                        height: '100%',
                        background: 'var(--accent)',
                        borderRadius: '4px',
                        transition: 'width 200ms ease',
                      }}
                    />
                  </div>

                  {updateInfo.transferred !== undefined && updateInfo.total !== undefined && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <span className="font-monospace">
                        {(updateInfo.transferred / 1024 / 1024).toFixed(1)} MB / {(updateInfo.total / 1024 / 1024).toFixed(1)} MB
                      </span>
                      {updateInfo.bytesPerSecond && (
                        <span className="font-monospace">
                          {(updateInfo.bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {updateInfo.status === 'downloaded' && (
                <div
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-success-subtle)',
                    border: '1.5px solid rgba(48, 209, 88, 0.4)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-success)', fontWeight: 600, fontSize: '14px' }}>
                    <CheckCircle size={16} />
                    <span>Phiên bản v{updateInfo.version || ''} đã tải xong!</span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    Bản cập nhật đã sẵn sàng và sẽ được cài đặt tự động khi khởi động lại ứng dụng.
                  </div>

                  {isProcessing ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        color: 'var(--color-warning)',
                        padding: '6px 10px',
                        background: 'rgba(255, 214, 10, 0.1)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      <AlertCircle size={14} style={{ flexShrink: 0 }} />
                      <span>Hãy đợi quá trình xuất video hoàn tất trước khi cập nhật.</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={handleRestartAndInstall}
                      >
                        <RefreshCw size={13} />
                        <span>Khởi động lại & cập nhật</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => setUpdateInfo({ status: 'idle' })}
                      >
                        Để sau
                      </button>
                    </div>
                  )}
                </div>
              )}

              {updateInfo.status === 'error' && (
                <div
                  style={{
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-danger-subtle)',
                    border: '1px solid rgba(255, 69, 58, 0.3)',
                    fontSize: '12.5px',
                    color: 'var(--color-danger)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                    <AlertCircle size={14} />
                    <span>Không thể kiểm tra hoặc tải bản cập nhật</span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    {updateInfo.error || 'Ứng dụng vẫn có thể tiếp tục sử dụng bình thường.'}
                  </div>
                  <div>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={handleCheckUpdateManual}
                    >
                      Thử lại
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. ABOUT */}
          {activeTab === 'about' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  padding: '14px',
                  background: 'var(--bg-card-inner)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                  YouTube Clip Studio
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Công cụ cắt video YouTube chuyên nghiệp • Bản v{appVersion}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  Được trang bị lõi FFmpeg và yt-dlp tối ưu hoá tốc độ cao (Fast Copy) trên Windows 64-bit.
                </div>
              </div>

              {/* Shortcuts Guide Button */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => {
                    onClose();
                    onOpenTutorial();
                  }}
                >
                  <HelpCircle size={13} />
                  <span>Xem hướng dẫn & phím tắt</span>
                </button>

                {isElectron && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => {
                      if (window.electronAPI?.openLogsFolder) {
                        window.electronAPI.openLogsFolder();
                      }
                    }}
                  >
                    <Info size={13} />
                    <span>Mở thư mục nhật ký (Logs)</span>
                  </button>
                )}
              </div>

              <div style={{ fontSize: '11.5px', color: 'var(--text-tertiary)', textAlign: 'center', marginTop: '10px' }}>
                Phát triển bởi <strong style={{ color: 'var(--text-secondary)' }}>vanhkhuc.dev</strong> &bull; 2026
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
