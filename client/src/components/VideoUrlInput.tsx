import React from 'react';
import { isValidYoutubeUrl } from '../utils/timeValidator';

interface VideoUrlInputProps {
  url: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}

export const VideoUrlInput: React.FC<VideoUrlInputProps> = ({ url, onChange, disabled }) => {
  const isInvalid = url.trim().length > 0 && !isValidYoutubeUrl(url);

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        onChange(text.trim());
      }
    } catch {}
  };

  return (
    <div className="card shadow-sm border-0 mb-4 bg-dark-subtle">
      <div className="card-body p-4">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <label htmlFor="youtube-url" className="form-label fw-bold mb-0 d-flex align-items-center gap-2 text-white">
            <i className="bi bi-youtube fs-5 text-danger"></i>
            <span>Đường dẫn video YouTube:</span>
          </label>

          {!disabled && (
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1 py-0 px-2"
              onClick={handlePasteClipboard}
              title="Dán nhanh đường link từ bộ nhớ tạm"
            >
              <i className="bi bi-clipboard"></i>
              <span>Dán link nhanh</span>
            </button>
          )}
        </div>

        <div className="input-group input-group-lg has-validation">
          <span className="input-group-text bg-body-tertiary border-secondary-subtle">
            <i className="bi bi-play-circle-fill text-danger"></i>
          </span>
          <input
            id="youtube-url"
            type="url"
            className={`form-control border-secondary-subtle bg-dark text-light ${isInvalid ? 'is-invalid' : ''}`}
            placeholder="Dán link YouTube tại đây (ví dụ: https://www.youtube.com/watch?v=...)"
            value={url}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            autoFocus
          />
          {url && !disabled && (
            <button
              className="btn btn-outline-secondary"
              type="button"
              onClick={() => onChange('')}
              title="Xóa đường dẫn"
            >
              <i className="bi bi-x-lg"></i>
            </button>
          )}
          {isInvalid && (
            <div className="invalid-feedback">
              Định dạng liên kết chưa hợp lệ. Vui lòng dán đúng đường link video YouTube (ví dụ: https://www.youtube.com/watch?v=... hoặc link Shorts).
            </div>
          )}
        </div>

        <div className="form-text text-secondary mt-2 small d-flex align-items-center gap-2">
          <i className="bi bi-info-circle text-info"></i>
          <span>Hỗ trợ tất cả định dạng: Video YouTube thông thường, link rút gọn (<code>youtu.be</code>) và video ngắn <strong>YouTube Shorts</strong>.</span>
        </div>
      </div>
    </div>
  );
};
