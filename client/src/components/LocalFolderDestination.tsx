import React, { useState, useEffect } from 'react';
import { Folder, FolderOpen } from 'lucide';
import { ExternalLink, HelpCircle, AlertCircle } from 'lucide-react';
import { openLocalFolderApi } from '../services/api';
import { MorphIconWrapper } from './glass/MorphIconWrapper';

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
  const [isFolderOpened, setIsFolderOpened] = useState<boolean>(false);
  const [isDesktop, setIsDesktop] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      (window.desktopAPI?.openFolder || window.electronAPI?.isElectron)
    ) {
      setIsDesktop(true);
    }
  }, []);

  const handleSelectFolderDialog = async () => {
    setErrorMessage(null);
    try {
      if (window.desktopAPI?.selectFolder) {
        const selected = await window.desktopAPI.selectFolder();
        if (selected) onChangeFolder(selected);
      } else if (window.electronAPI?.selectFolder) {
        const selected = await window.electronAPI.selectFolder();
        if (selected) onChangeFolder(selected);
      }
    } catch (err: any) {
      console.error('Failed to select folder:', err);
    }
  };

  const handleOpenFolder = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setErrorMessage(null);
    setIsOpenFolderLoading(true);
    setIsFolderOpened(true);

    try {
      if (window.desktopAPI?.openFolder && outputFolder) {
        await window.desktopAPI.openFolder(outputFolder);
      } else if (window.electronAPI?.openFolder && outputFolder) {
        await window.electronAPI.openFolder(outputFolder);
      } else {
        await openLocalFolderApi(outputFolder || undefined);
      }
      setTimeout(() => setIsFolderOpened(false), 2000);
    } catch (err: any) {
      setIsFolderOpened(false);
      setErrorMessage(err.message || 'Không tìm thấy thư mục lưu. Vui lòng chọn lại.');
    } finally {
      setIsOpenFolderLoading(false);
    }
  };

  const folderName = outputFolder
    ? outputFolder.split(/[\\/]/).filter(Boolean).pop() || 'Thư mục đã chọn'
    : 'Thư mục mặc định';

  return (
    <div className="section">
      <div className="section-title" style={{ fontSize: '13px' }}>Nơi lưu</div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          background: 'var(--bg-elevated)',
          border: errorMessage ? '1px solid var(--danger)' : '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)',
          cursor: isDesktop ? 'pointer' : 'default',
          gap: '12px',
        }}
        onClick={isDesktop ? handleSelectFolderDialog : undefined}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', flex: 1, minWidth: 0 }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(245, 158, 11, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <MorphIconWrapper
              icon={isFolderOpened ? FolderOpen : Folder}
              spring="smooth"
              size={15}
              color="#F59E0B"
            />
          </div>

          <div style={{ overflow: 'hidden', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                {folderName}
              </span>
              <span
                className="tooltip-trigger"
                data-tooltip="Nếu thư mục này đang được Google Drive Desktop đồng bộ, video cũng sẽ tự động được tải lên Drive."
                onClick={(e) => e.stopPropagation()}
              >
                <HelpCircle size={12} style={{ color: 'var(--text-muted)' }} />
              </span>
            </div>
            <div
              className="text-mono truncate"
              style={{ fontSize: '11px', color: 'var(--text-muted)' }}
              title={outputFolder || 'data/output'}
            >
              {outputFolder || 'data/output (Mặc định)'}
            </div>
          </div>
        </div>

        <div
          style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {isDesktop && (
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleSelectFolderDialog}
              disabled={disabled}
              title="Chọn thư mục"
            >
              Chọn
            </button>
          )}

          <button
            type="button"
            className="btn btn-sm"
            onClick={handleOpenFolder}
            disabled={isOpenFolderLoading}
            title="Mở trong File Explorer"
          >
            <ExternalLink size={11} />
            <span>Mở</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '4px',
            fontSize: '11px',
            color: 'var(--danger)',
          }}
        >
          <AlertCircle size={12} />
          <span>{errorMessage}</span>
          <button
            type="button"
            className="btn btn-sm"
            style={{ padding: '1px 6px', fontSize: '10px', marginLeft: 'auto' }}
            onClick={handleSelectFolderDialog}
          >
            Chọn lại
          </button>
        </div>
      )}
    </div>
  );
};
