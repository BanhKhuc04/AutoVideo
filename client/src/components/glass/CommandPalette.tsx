import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Folder, Sparkles, Settings, HelpCircle, Play, X, Command } from 'lucide-react';

const YouTubeIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="#FF3B30">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

export interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onPasteUrl: () => void;
  onAddSegment: () => void;
  onSelectFolder: () => void;
  onSelectResolution: (res: '720p' | '1080p') => void;
  onExportVideo: () => void;
  onOpenSettings: () => void;
  onOpenTutorial: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onPasteUrl,
  onAddSegment,
  onSelectFolder,
  onSelectResolution,
  onExportVideo,
  onOpenSettings,
  onOpenTutorial,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: CommandItem[] = [
    {
      id: 'paste-url',
      title: 'Dán liên kết YouTube từ Clipboard',
      subtitle: 'Tự động nhận diện video và thời lượng',
      icon: <YouTubeIcon />,
      shortcut: 'Ctrl+V',
      action: () => {
        onPasteUrl();
        onClose();
      },
    },
    {
      id: 'add-clip',
      title: 'Thêm đoạn cắt mới',
      subtitle: 'Tạo thêm 1 đoạn trích xuất video',
      icon: <Plus size={16} color="#0A84FF" />,
      shortcut: '+',
      action: () => {
        onAddSegment();
        onClose();
      },
    },
    {
      id: 'select-folder',
      title: 'Chọn thư mục lưu trữ',
      subtitle: 'Mở cửa sổ chọn thư mục trên Windows',
      icon: <Folder size={16} color="#FF9F0A" />,
      action: () => {
        onSelectFolder();
        onClose();
      },
    },
    {
      id: 'res-720p',
      title: 'Đặt chất lượng: 720p HD',
      subtitle: 'Tốc độ nhanh, dung lượng nhẹ',
      icon: <Sparkles size={16} color="#64D2FF" />,
      action: () => {
        onSelectResolution('720p');
        onClose();
      },
    },
    {
      id: 'res-1080p',
      title: 'Đặt chất lượng: 1080p Full HD',
      subtitle: 'Độ nét cao nhất cho màn hình lớn',
      icon: <Sparkles size={16} color="#BF5AF2" />,
      action: () => {
        onSelectResolution('1080p');
        onClose();
      },
    },
    {
      id: 'export-video',
      title: 'Xuất video ngay',
      subtitle: 'Cắt và lưu các đoạn video vào máy tính',
      icon: <Play size={16} color="#30D158" />,
      shortcut: 'Ctrl+Enter',
      action: () => {
        onExportVideo();
        onClose();
      },
    },
    {
      id: 'open-settings',
      title: 'Mở Cài đặt hệ thống',
      subtitle: 'Tùy chỉnh chất lượng, thư mục và giao diện',
      icon: <Settings size={16} color="#EDEDED" />,
      shortcut: 'Ctrl+,',
      action: () => {
        onOpenSettings();
        onClose();
      },
    },
    {
      id: 'open-tutorial',
      title: 'Xem hướng dẫn sử dụng',
      subtitle: '4 bước thao tác nhanh cho người mới',
      icon: <HelpCircle size={16} color="#FFD60A" />,
      action: () => {
        onOpenTutorial();
        onClose();
      },
    },
  ];

  const filtered = commands.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase()) ||
    (c.subtitle && c.subtitle.toLowerCase().includes(query.toLowerCase()))
  );

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal show d-block glass-modal-backdrop"
      style={{ zIndex: 1080 }}
      tabIndex={-1}
      role="dialog"
      onClick={onClose}
    >
      <div
        className="modal-dialog modal-dialog-centered"
        style={{ maxWidth: '560px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="glass-modal-sheet p-3 text-light animate-sheet-in">
          {/* Search Input Bar */}
          <div className="d-flex align-items-center gap-2.5 px-3 py-2 border-bottom" style={{ borderColor: 'var(--glass-border)' }}>
            <Search size={18} style={{ color: 'var(--text-tertiary)' }} />
            <input
              ref={inputRef}
              type="text"
              className="bg-transparent border-0 text-white w-100 outline-none"
              style={{ fontSize: '0.94rem', outline: 'none' }}
              placeholder="Nhập lệnh hoặc tìm kiếm... (Ví dụ: dán link, xuất video, 1080p)"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
            />
            <button
              type="button"
              className="glass-btn-icon"
              onClick={onClose}
              aria-label="Đóng"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          {/* Results List */}
          <div className="py-2 overflow-y-auto" style={{ maxHeight: '340px' }}>
            {filtered.length === 0 ? (
              <div className="text-center py-4 text-secondary small">
                Không tìm thấy lệnh nào phù hợp.
              </div>
            ) : (
              filtered.map((cmd, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={cmd.id}
                    className="d-flex align-items-center justify-content-between px-3 py-2 rounded-2 cursor-pointer transition-all"
                    style={{
                      background: isSelected ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                      cursor: 'pointer',
                    }}
                    onClick={cmd.action}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <div className="d-flex align-items-center gap-2.5">
                      <div
                        className="d-flex align-items-center justify-content-center rounded-2"
                        style={{
                          width: '28px',
                          height: '28px',
                          background: 'rgba(255, 255, 255, 0.06)',
                          border: '1px solid var(--glass-border-subtle)',
                        }}
                      >
                        {cmd.icon}
                      </div>
                      <div>
                        <div className="fw-medium text-white" style={{ fontSize: '0.86rem' }}>
                          {cmd.title}
                        </div>
                        {cmd.subtitle && (
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                            {cmd.subtitle}
                          </div>
                        )}
                      </div>
                    </div>

                    {cmd.shortcut && (
                      <span className="font-monospace text-secondary small px-2 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.06)', fontSize: '0.72rem' }}>
                        {cmd.shortcut}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Helper */}
          <div className="d-flex align-items-center justify-content-between px-3 pt-2 border-top" style={{ borderColor: 'var(--glass-border)', fontSize: '0.74rem', color: 'var(--text-tertiary)' }}>
            <div className="d-flex align-items-center gap-1">
              <Command size={12} />
              <span>Phím tắt: <kbd style={{ background: 'rgba(255,255,255,0.08)', color: 'inherit', padding: '1px 4px', borderRadius: '3px' }}>↑</kbd> <kbd style={{ background: 'rgba(255,255,255,0.08)', color: 'inherit', padding: '1px 4px', borderRadius: '3px' }}>↓</kbd> để chọn, <kbd style={{ background: 'rgba(255,255,255,0.08)', color: 'inherit', padding: '1px 4px', borderRadius: '3px' }}>Enter</kbd> thực thi</span>
            </div>
            <span>Esc để đóng</span>
          </div>
        </div>
      </div>
    </div>
  );
};
