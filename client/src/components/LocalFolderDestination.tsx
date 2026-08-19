import React, { useState } from 'react';
import { openLocalFolderApi } from '../services/api';

interface LocalFolderDestinationProps {
  outputFolder: string;
  onChangeFolder: (folder: string) => void;
  disabled?: boolean;
}

export const LocalFolderDestination: React.FC<LocalFolderDestinationProps> = ({
  outputFolder,
  onChangeFolder,
  disabled,
}) => {
  const [isOpenFolderLoading, setIsOpenFolderLoading] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string>('');

  const handleOpenFolder = async () => {
    setIsOpenFolderLoading(true);
    setFeedbackMsg('');
    try {
      await openLocalFolderApi(outputFolder || undefined);
      setFeedbackMsg('Đã mở thư mục trong File Explorer!');
      setTimeout(() => setFeedbackMsg(''), 3000);
    } catch (err: any) {
      setFeedbackMsg(err.message || 'Không thể mở thư mục.');
      setTimeout(() => setFeedbackMsg(''), 3000);
    } finally {
      setIsOpenFolderLoading(false);
    }
  };

  return (
    <div className="card shadow-sm border-0 mb-4 bg-dark-subtle">
      <div className="card-body p-4">
        <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-2">
          <label className="form-label fw-bold mb-0 d-flex align-items-center gap-2 text-white">
            <i className="bi bi-folder2-open text-warning fs-5"></i>
            <span>Thư Mục Lưu Trữ Trên Máy Tính (Google Drive Desktop Sync):</span>
          </label>

          <button
            type="button"
            className="btn btn-outline-info btn-sm d-flex align-items-center gap-1 py-0 px-2"
            onClick={handleOpenFolder}
            disabled={isOpenFolderLoading}
            title="Mở thư mục lưu trữ này trên File Explorer máy tính"
          >
            {isOpenFolderLoading ? (
              <span className="spinner-border spinner-border-sm" role="status"></span>
            ) : (
              <i className="bi bi-box-arrow-up-right"></i>
            )}
            <span>Mở thư mục trên máy tính</span>
          </button>
        </div>

        <div className="input-group input-group-lg">
          <span className="input-group-text bg-body-tertiary border-secondary-subtle">
            <i className="bi bi-hdd-fill text-warning"></i>
          </span>
          <input
            type="text"
            className="form-control border-secondary-subtle bg-dark text-light font-monospace"
            placeholder="Ví dụ: C:\Users\Admin\Google Drive\Video Assets hoặc D:\YouTube_Clips"
            value={outputFolder}
            onChange={(e) => onChangeFolder(e.target.value)}
            disabled={disabled}
          />
          {outputFolder && (
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => onChangeFolder('')}
              title="Đặt lại về thư mục mặc định của ứng dụng"
            >
              <i className="bi bi-x-lg"></i>
            </button>
          )}
        </div>

        {feedbackMsg && (
          <div className="alert alert-success py-1 px-3 mt-2 mb-0 small font-monospace">
            {feedbackMsg}
          </div>
        )}

        <div className="form-text text-secondary mt-2 small d-flex align-items-center gap-2">
          <i className="bi bi-lightbulb-fill text-warning flex-shrink-0"></i>
          <span>
            <strong>Đồng bộ tự động:</strong> Dán đường dẫn thư mục <strong>Google Drive Desktop</strong> của bạn vào đây (ví dụ: <code>C:\Users\...\Google Drive\Video Assets</code>), mọi video xuất ra sẽ tự động được lưu và đồng bộ lên đám mây mà không cần cấu hình phức tạp.
          </span>
        </div>
      </div>
    </div>
  );
};
