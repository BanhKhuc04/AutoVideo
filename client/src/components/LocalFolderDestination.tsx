import React, { useState, useEffect } from 'react';
import { Folder, FolderOpen, HelpCircle, X } from 'lucide-react';
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
  const [isElectron, setIsElectron] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI?.isElectron) {
      setIsElectron(true);
    }
  }, []);

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
        setFeedbackMsg('Đã mở thư mục trong File Explorer');
      } else {
        await openLocalFolderApi(outputFolder || undefined);
        setFeedbackMsg('Đã mở thư mục trong File Explorer');
      }
      setTimeout(() => setFeedbackMsg(''), 3000);
    } catch (err: any) {
      setFeedbackMsg(err.message || 'Không thể mở thư mục.');
      setTimeout(() => setFeedbackMsg(''), 3000);
    } finally {
      setIsOpenFolderLoading(false);
    }
  };

  return (
    <div className="apple-card p-4 mb-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div className="d-flex align-items-center gap-2">
          <span className="fw-semibold text-white" style={{ fontSize: '0.92rem' }}>
            Nơi lưu
          </span>
          <span
            className="text-secondary"
            title="Nếu chọn thư mục đang được Google Drive Desktop đồng bộ, video sẽ tự động xuất hiện trên Google Drive."
            style={{ cursor: 'help' }}
          >
            <HelpCircle size={14} style={{ color: 'var(--text-tertiary)' }} />
          </span>
        </div>

        <div className="d-flex align-items-center gap-2">
          {isElectron && (
            <button
              type="button"
              className="apple-btn-secondary"
              style={{ padding: '5px 12px', fontSize: '0.8rem' }}
              onClick={handleSelectFolderDialog}
              disabled={disabled}
              title="Chọn thư mục lưu trên Windows"
            >
              <Folder size={14} strokeWidth={1.8} />
              <span>Chọn thư mục</span>
            </button>
          )}

          <button
            type="button"
            className="apple-btn-secondary"
            style={{ padding: '5px 12px', fontSize: '0.8rem' }}
            onClick={handleOpenFolder}
            disabled={isOpenFolderLoading}
            title="Mở thư mục trên máy tính"
          >
            <FolderOpen size={14} strokeWidth={1.8} />
            <span>Mở</span>
          </button>
        </div>
      </div>

      {/* Path Display / Input */}
      <div className="position-relative d-flex align-items-center">
        <input
          type="text"
          className="apple-input font-monospace"
          style={{ fontSize: '0.86rem', paddingRight: outputFolder ? '40px' : '14px' }}
          placeholder="Chưa chọn thư mục (Mặc định: data/output)"
          value={outputFolder}
          onChange={(e) => onChangeFolder(e.target.value)}
          disabled={disabled}
        />

        {outputFolder && !disabled && (
          <button
            className="position-absolute apple-btn-icon"
            style={{ right: '8px' }}
            type="button"
            onClick={() => onChangeFolder('')}
            title="Đặt lại về mặc định"
          >
            <X size={15} strokeWidth={2} />
          </button>
        )}
      </div>

      {feedbackMsg && (
        <div className="small font-monospace mt-2" style={{ color: 'var(--color-success)', fontSize: '0.78rem' }}>
          {feedbackMsg}
        </div>
      )}
    </div>
  );
};
