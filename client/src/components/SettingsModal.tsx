import React, { useState, useEffect } from 'react';
import { openLocalFolderApi, getApiBaseUrl } from '../services/api';

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
  const [isOpenFolderLoading, setIsOpenFolderLoading] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string>('');
  const [backendUrl, setBackendUrl] = useState<string>('');
  const [isElectron, setIsElectron] = useState<boolean>(false);
  const [appVersion, setAppVersion] = useState<string>('v1.0.0');

  useEffect(() => {
    if (isOpen) {
      setBackendUrl(localStorage.getItem('custom_backend_url') || getApiBaseUrl() || 'http://localhost:5000');
      if (typeof window !== 'undefined' && window.electronAPI?.isElectron) {
        setIsElectron(true);
        window.electronAPI.getAppVersion().then((v) => {
          if (v) setAppVersion(`v${v}`);
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
          setFeedbackMsg(`Đã chọn: ${selected}`);
          setTimeout(() => setFeedbackMsg(''), 3000);
        }
      } catch (err: any) {
        console.error('Failed to select folder:', err);
      }
    }
  };

  const handleOpenFolder = async () => {
    setIsOpenFolderLoading(true);
    setFeedbackMsg('');
    try {
      if (window.electronAPI?.openFolder && outputFolder) {
        await window.electronAPI.openFolder(outputFolder);
        setFeedbackMsg('Đã mở thư mục trong File Explorer!');
      } else {
        await openLocalFolderApi(outputFolder || undefined);
        setFeedbackMsg('Đã mở thư mục trong File Explorer!');
      }
      setTimeout(() => setFeedbackMsg(''), 3000);
    } catch (err: any) {
      setFeedbackMsg(err.message || 'Không thể mở thư mục.');
      setTimeout(() => setFeedbackMsg(''), 3000);
    } finally {
      setIsOpenFolderLoading(false);
    }
  };

  const handleSaveBackendUrl = (url: string) => {
    setBackendUrl(url);
    if (url.trim()) {
      localStorage.setItem('custom_backend_url', url.trim());
    } else {
      localStorage.removeItem('custom_backend_url');
    }
  };

  return (
    <div
      className="modal show d-block"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1060 }}
      tabIndex={-1}
      role="dialog"
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content bg-dark text-light border-secondary shadow-lg">
          {/* Header */}
          <div className="modal-header border-secondary-subtle py-3 px-4">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-gear-wide-connected text-primary fs-4"></i>
              <h5 className="modal-title fw-bold mb-0 text-white">Cài Đặt Hệ Thống</h5>
            </div>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onClose}
              aria-label="Đóng"
            ></button>
          </div>

          {/* Body */}
          <div className="modal-body p-4">
            {/* Section 1: Thư mục lưu trữ trên máy tính */}
            <div className="mb-4 p-3 bg-body-tertiary rounded-3 border border-secondary-subtle">
              <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-2">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-folder2-open text-warning fs-5"></i>
                  <h6 className="fw-bold mb-0 text-white">Thư Mục Lưu Trữ Mặc Định Trên Máy Tính</h6>
                </div>

                <button
                  type="button"
                  className="btn btn-outline-info btn-sm d-flex align-items-center gap-1 py-0 px-2"
                  onClick={handleOpenFolder}
                  disabled={isOpenFolderLoading}
                >
                  {isOpenFolderLoading ? (
                    <span className="spinner-border spinner-border-sm" role="status"></span>
                  ) : (
                    <i className="bi bi-box-arrow-up-right"></i>
                  )}
                  <span>Mở thư mục trên máy tính</span>
                </button>
              </div>

              <p className="text-secondary small mb-3">
                Nhập hoặc chọn đường dẫn thư mục <strong>Google Drive Desktop</strong> hoặc thư mục bất kỳ trên máy tính để tự động lưu video sau khi cắt.
              </p>

              <div className="input-group mb-2">
                <span className="input-group-text bg-dark border-secondary-subtle">
                  <i className="bi bi-hdd-fill text-warning"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-secondary-subtle bg-dark text-light font-monospace"
                  placeholder="Ví dụ: C:\Users\Admin\Google Drive\Video Assets hoặc D:\YouTube_Clips"
                  value={outputFolder}
                  onChange={(e) => onChangeFolder(e.target.value)}
                />
                {isElectron && (
                  <button
                    type="button"
                    className="btn btn-warning fw-semibold d-flex align-items-center gap-1"
                    onClick={handleSelectFolderDialog}
                    title="Mở cửa sổ chọn thư mục của Windows"
                  >
                    <i className="bi bi-folder-plus"></i>
                    <span>Duyệt thư mục</span>
                  </button>
                )}
                {outputFolder && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => onChangeFolder('')}
                    title="Xóa về mặc định"
                  >
                    <i className="bi bi-x-lg"></i>
                  </button>
                )}
              </div>

              {feedbackMsg && (
                <div className="alert alert-success py-1 px-2 mb-0 small font-monospace">
                  {feedbackMsg}
                </div>
              )}
            </div>

            {/* Section 2: Thông tin ứng dụng Desktop & Backend */}
            {isElectron ? (
              <div className="mb-4 p-3 bg-body-tertiary rounded-3 border border-secondary-subtle">
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-laptop-fill text-success fs-5"></i>
                    <div>
                      <h6 className="fw-bold mb-0 text-white">Chế Độ Desktop Native (Windows)</h6>
                      <small className="text-secondary">Tự động khởi chạy Backend Node.js, FFmpeg và yt-dlp ngầm.</small>
                    </div>
                  </div>
                  <span className="badge bg-success-subtle text-success border border-success px-3 py-2 fw-bold">
                    {appVersion} &bull; Sẵn sàng
                  </span>
                </div>
              </div>
            ) : (
              <div className="mb-4 p-3 bg-body-tertiary rounded-3 border border-secondary-subtle">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <i className="bi bi-hdd-network text-info fs-5"></i>
                  <h6 className="fw-bold mb-0 text-white">Địa Chỉ Backend Server Xử Lý Video</h6>
                </div>
                <p className="text-secondary small mb-2">
                  Khi sử dụng giao diện trên web Vercel, ứng dụng sẽ gửi yêu cầu cắt video về máy tính của bạn (mặc định <code>http://localhost:5000</code>).
                </p>
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-dark border-secondary-subtle font-monospace text-secondary">
                    URL:
                  </span>
                  <input
                    type="text"
                    className="form-control border-secondary-subtle bg-dark text-light font-monospace"
                    placeholder="http://localhost:5000"
                    value={backendUrl}
                    onChange={(e) => handleSaveBackendUrl(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => handleSaveBackendUrl('http://localhost:5000')}
                    title="Đặt lại về mặc định"
                  >
                    Mặc định (localhost:5000)
                  </button>
                </div>
              </div>
            )}

            {/* Section 3: Chất lượng video */}
            <div className="mb-4 p-3 bg-body-tertiary rounded-3 border border-secondary-subtle">
              <div className="d-flex align-items-center gap-2 mb-3">
                <i className="bi bi-camera-video-fill text-primary fs-5"></i>
                <h6 className="fw-bold mb-0 text-white">Chất Lượng Video Xuất Ra</h6>
              </div>

              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <div
                    className={`p-3 rounded border cursor-pointer h-100 ${
                      selectedResolution === '720p'
                        ? 'bg-primary-subtle border-primary text-primary'
                        : 'bg-dark border-secondary-subtle text-secondary'
                    }`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onChangeResolution('720p')}
                  >
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="resSelect"
                        id="res720"
                        checked={selectedResolution === '720p'}
                        onChange={() => onChangeResolution('720p')}
                      />
                      <label className="form-check-label fw-bold text-white" htmlFor="res720">
                        720p HD (1280x720) &bull; Khuyên dùng
                      </label>
                    </div>
                    <small className="d-block mt-1 text-secondary">
                      Tối ưu tốc độ xử lý nhanh, chuẩn H.264 / AAC 192k sắc nét.
                    </small>
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <div
                    className={`p-3 rounded border cursor-pointer h-100 ${
                      selectedResolution === '1080p'
                        ? 'bg-primary-subtle border-primary text-primary'
                        : 'bg-dark border-secondary-subtle text-secondary'
                    }`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onChangeResolution('1080p')}
                  >
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="resSelect"
                        id="res1080"
                        checked={selectedResolution === '1080p'}
                        onChange={() => onChangeResolution('1080p')}
                      />
                      <label className="form-check-label fw-bold text-white" htmlFor="res1080">
                        1080p Full HD (1920x1080)
                      </label>
                    </div>
                    <small className="d-block mt-1 text-secondary">
                      Độ phân giải cao nếu video nguồn trên YouTube hỗ trợ Full HD.
                    </small>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Xem lại hướng dẫn */}
            <div className="mb-4 p-3 bg-body-tertiary rounded-3 border border-secondary-subtle d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div>
                <h6 className="fw-bold mb-1 text-white">
                  <i className="bi bi-mortarboard-fill text-warning me-2"></i>
                  Hướng Dẫn Sử Dụng Nhanh
                </h6>
                <p className="text-secondary small mb-0">
                  Xem lại 4 bước thao tác cơ bản để lấy cảnh và xuất video.
                </p>
              </div>

              <button
                type="button"
                className="btn btn-outline-warning btn-sm d-flex align-items-center gap-1"
                onClick={() => {
                  onClose();
                  onOpenTutorial();
                }}
              >
                <i className="bi bi-play-circle-fill"></i>
                <span>Xem lại hướng dẫn</span>
              </button>
            </div>

            {/* Section 5: Bản quyền tác giả */}
            <div className="p-3 bg-dark rounded-3 border border-secondary-subtle text-center">
              <p className="mb-1 small text-secondary">
                Sản phẩm được phát triển bởi{' '}
                <strong className="text-white">vanhkhuc.dev</strong>
              </p>
              <p className="mb-0 small text-secondary">
                Kết nối &amp; Hỗ trợ: &nbsp;
                <a
                  href="https://www.facebook.com/vanhkhuc2005"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-outline-primary py-0 px-2 d-inline-flex align-items-center gap-1"
                >
                  <i className="bi bi-facebook text-primary"></i>
                  <span>Facebook (vanhkhuc2005)</span>
                </a>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer border-secondary-subtle py-3 px-4">
            <button type="button" className="btn btn-primary px-4 fw-bold shadow" onClick={onClose}>
              Đóng Cài Đặt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
