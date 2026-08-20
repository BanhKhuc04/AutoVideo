import React, { useState, useEffect } from 'react';
import { Folder, FolderOpen } from 'lucide';
import { ExternalLink, HelpCircle } from 'lucide-react';
import { openLocalFolderApi } from '../services/api';
import { GlassPanel } from './glass/GlassPanel';
import { GlassButton } from './glass/GlassButton';
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
        }
      } catch (err: any) {
        console.error('Failed to select folder:', err);
      }
    }
  };

  const handleOpenFolder = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpenFolderLoading(true);
    setIsFolderOpened(true);
    try {
      if (window.electronAPI?.openFolder && outputFolder) {
        await window.electronAPI.openFolder(outputFolder);
      } else {
        await openLocalFolderApi(outputFolder || undefined);
      }
      setTimeout(() => setIsFolderOpened(false), 2000);
    } catch {
      setIsFolderOpened(false);
    } finally {
      setIsOpenFolderLoading(false);
    }
  };

  const folderName = outputFolder ? outputFolder.split(/[\\/]/).filter(Boolean).pop() || 'Thư mục đã chọn' : 'Thư mục mặc định';

  return (
    <GlassPanel
      className="p-3 mb-3.5 cursor-pointer user-select-none transition-all"
      style={{ cursor: isElectron ? 'pointer' : 'default' }}
      onClick={isElectron ? handleSelectFolderDialog : undefined}
    >
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2.5 overflow-hidden">
          <div
            className="d-flex align-items-center justify-content-center rounded-2"
            style={{
              width: '32px',
              height: '32px',
              background: 'rgba(255, 159, 10, 0.12)',
              border: '1px solid rgba(255, 159, 10, 0.25)',
              color: '#FF9F0A',
              flexShrink: 0,
            }}
          >
            <MorphIconWrapper
              icon={isFolderOpened ? FolderOpen : Folder}
              spring="smooth"
              size={17}
              color="#FF9F0A"
            />
          </div>

          <div className="overflow-hidden">
            <div className="d-flex align-items-center gap-1.5">
              <span className="fw-medium text-white" style={{ fontSize: '0.84rem' }}>
                {folderName}
              </span>
              <span
                className="text-secondary cursor-pointer"
                title="Tự động đồng bộ nếu chọn thư mục Google Drive Desktop"
                style={{ cursor: 'help' }}
                onClick={(e) => e.stopPropagation()}
              >
                <HelpCircle size={12} style={{ color: 'var(--text-tertiary)' }} />
              </span>
            </div>

            <div
              className="text-truncate font-monospace"
              style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)' }}
              title={outputFolder || 'data/output'}
            >
              {outputFolder || 'data/output (Mặc định trong thư mục ứng dụng)'}
            </div>
          </div>
        </div>

        <div className="d-flex align-items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {isElectron && (
            <GlassButton
              size="sm"
              onClick={handleSelectFolderDialog}
              disabled={disabled}
              title="Chọn thư mục lưu"
            >
              <span>Chọn</span>
            </GlassButton>
          )}

          <GlassButton
            size="sm"
            onClick={handleOpenFolder}
            disabled={isOpenFolderLoading}
            title="Mở thư mục trong File Explorer"
          >
            <ExternalLink size={12} />
            <span>Mở</span>
          </GlassButton>
        </div>
      </div>
    </GlassPanel>
  );
};
