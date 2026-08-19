import React from 'react';

interface HeaderProps {
  onOpenTutorial?: () => void;
  onOpenSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenTutorial,
  onOpenSettings,
}) => {
  return (
    <header className="py-3 border-bottom border-secondary-subtle mb-4 bg-dark-subtle shadow-sm">
      <div className="container">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          {/* Logo & Title */}
          <div className="d-flex align-items-center gap-3">
            <div
              className="bg-danger text-white rounded-3 p-2 d-flex align-items-center justify-content-center shadow"
              style={{ width: '46px', height: '46px' }}
            >
              <i className="bi bi-film fs-3"></i>
            </div>
            <div>
              <div className="d-flex align-items-center gap-2">
                <h1 className="h5 mb-0 fw-bold text-white">YouTube Clip Studio Pro</h1>
                <span className="badge bg-danger text-white font-monospace" style={{ fontSize: '0.65rem' }}>
                  Creator Edition
                </span>
              </div>
              <p className="text-secondary small mb-0">
                Cắt video YouTube hàng loạt &bull; Chuẩn 720p HD MP4 &bull; Tự động đồng bộ Google Drive Desktop
              </p>
            </div>
          </div>

          {/* Action Pills & Navigation */}
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-2 rounded-pill font-monospace">
              <i className="bi bi-badge-hd me-1"></i> 720p MP4 (H.264 / AAC)
            </span>

            {/* Tutorial Button */}
            {onOpenTutorial && (
              <button
                type="button"
                className="btn btn-outline-warning btn-sm d-flex align-items-center gap-1 px-3 py-1 rounded-pill"
                onClick={onOpenTutorial}
                title="Xem hướng dẫn sử dụng nhanh"
              >
                <i className="bi bi-mortarboard-fill"></i>
                <span>Hướng dẫn ❓</span>
              </button>
            )}

            {/* Settings Button */}
            {onOpenSettings && (
              <button
                type="button"
                className="btn btn-outline-light btn-sm d-flex align-items-center gap-1 px-3 py-1 rounded-pill"
                onClick={onOpenSettings}
                title="Mở bảng cài đặt ứng dụng"
              >
                <i className="bi bi-gear-fill"></i>
                <span>Cài đặt</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
