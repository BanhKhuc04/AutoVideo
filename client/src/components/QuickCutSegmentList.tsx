import React from 'react';
import { Scissors, CheckSquare, Square, Trash2, Undo, Redo, Play, CheckCircle2 } from 'lucide-react';
import { Segment } from '../types';
import { timeStringToSeconds } from '../utils/timeValidator';
import { GlassPanel } from './glass/GlassPanel';
import { GlassButton } from './glass/GlassButton';
import { GlassPill } from './glass/GlassPill';

interface QuickCutSegmentListProps {
  segments: Segment[];
  disabled?: boolean;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDeleteSplit: (id: string) => void;
  onSeekToSegment: (startSec: number) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export const QuickCutSegmentList: React.FC<QuickCutSegmentListProps> = ({
  segments,
  disabled,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onDeleteSplit,
  onSeekToSegment,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}) => {
  const selectedCount = segments.filter((s) => s.selected !== false).length;
  const isAllSelected = selectedCount === segments.length && segments.length > 0;

  // Calculate total selected duration
  const totalSelectedSeconds = segments.reduce((sum, seg) => {
    if (seg.selected === false) return sum;
    const startSec = timeStringToSeconds(seg.start) || 0;
    const endSec = timeStringToSeconds(seg.end) || 0;
    return sum + Math.max(0, endSec - startSec);
  }, 0);

  return (
    <GlassPanel className="p-3.5 mb-3.5">
      {/* Header Bar */}
      <div className="d-flex align-items-center justify-content-between mb-2.5 flex-wrap gap-2 pb-2 border-bottom" style={{ borderColor: 'var(--glass-border-subtle)' }}>
        <div className="d-flex align-items-center gap-2">
          <Scissors size={15} style={{ color: 'var(--accent-blue)' }} />
          <span className="fw-semibold text-white" style={{ fontSize: '0.88rem' }}>
            Danh sách đoạn cắt nhanh
          </span>
          <GlassPill variant={selectedCount > 0 ? 'accent' : 'default'} style={{ fontSize: '0.7rem' }}>
            {selectedCount}/{segments.length} đoạn ({totalSelectedSeconds}s)
          </GlassPill>
        </div>

        {/* Undo / Redo & Bulk selection buttons */}
        <div className="d-flex align-items-center gap-1">
          {onUndo && (
            <GlassButton
              size="sm"
              variant="icon"
              onClick={onUndo}
              disabled={!canUndo || disabled}
              title="Hoàn tác chia đoạn gần nhất (Ctrl + Z)"
            >
              <Undo size={13} strokeWidth={2} />
            </GlassButton>
          )}

          {onRedo && (
            <GlassButton
              size="sm"
              variant="icon"
              onClick={onRedo}
              disabled={!canRedo || disabled}
              title="Làm lại (Ctrl + Shift + Z)"
            >
              <Redo size={13} strokeWidth={2} />
            </GlassButton>
          )}

          <GlassButton
            size="sm"
            onClick={isAllSelected ? onDeselectAll : onSelectAll}
            disabled={disabled || segments.length === 0}
            title={isAllSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả đoạn'}
          >
            <CheckCircle2 size={12} />
            <span>{isAllSelected ? 'Bỏ chọn hết' : 'Chọn hết'}</span>
          </GlassButton>
        </div>
      </div>

      {/* Helper notice */}
      <div className="p-2 mb-2 rounded-2 d-flex align-items-center justify-content-between" style={{ background: 'rgba(255, 255, 255, 0.03)', fontSize: '0.74rem', color: 'var(--text-tertiary)' }}>
        <span>Nhấn <strong>S</strong> trên bàn phím để chia video ngay vị trí đang xem</span>
        <span className="d-none d-sm-inline">Click đoạn để chọn/bỏ chọn xuất</span>
      </div>

      {/* Segments checklist */}
      <div className="d-flex flex-column gap-1.5 overflow-y-auto" style={{ maxHeight: '420px' }}>
        {segments.map((seg, idx) => {
          const isSelected = seg.selected !== false;
          const clipNum = (idx + 1).toString().padStart(2, '0');
          const startSec = timeStringToSeconds(seg.start) || 0;
          const endSec = timeStringToSeconds(seg.end) || 0;
          const duration = Math.max(0, endSec - startSec);

          return (
            <div
              key={seg.id}
              className={`p-2.5 px-3 rounded-3 d-flex align-items-center justify-content-between gap-2.5 transition-all user-select-none cursor-pointer ${
                isSelected ? 'liquid-glass-card' : ''
              }`}
              style={{
                background: isSelected ? 'rgba(10, 132, 255, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                border: `1px solid ${isSelected ? 'rgba(10, 132, 255, 0.4)' : 'var(--glass-border-subtle)'}`,
                opacity: isSelected ? 1 : 0.45,
                cursor: 'pointer',
              }}
              onClick={() => onToggleSelect(seg.id)}
            >
              {/* Checkbox + Title */}
              <div className="d-flex align-items-center gap-2.5 overflow-hidden">
                <div
                  className="d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ color: isSelected ? 'var(--accent-blue)' : 'var(--text-tertiary)' }}
                >
                  {isSelected ? (
                    <CheckSquare size={17} strokeWidth={2.2} />
                  ) : (
                    <Square size={17} strokeWidth={1.8} />
                  )}
                </div>

                <span
                  className="font-monospace fw-semibold flex-shrink-0"
                  style={{ fontSize: '0.78rem', color: isSelected ? 'var(--accent-blue)' : 'var(--text-tertiary)' }}
                >
                  {clipNum}
                </span>

                <div className="overflow-hidden">
                  <div className="fw-medium text-white text-truncate" style={{ fontSize: '0.84rem' }}>
                    {seg.name || `Đoạn ${clipNum}`}
                  </div>
                  <div className="d-flex align-items-center gap-1.5 font-monospace" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    <span>{seg.start}</span>
                    <span>&rarr;</span>
                    <span>{seg.end}</span>
                  </div>
                </div>
              </div>

              {/* Right: Duration pill & Jump / Delete */}
              <div className="d-flex align-items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <GlassPill variant={isSelected ? 'accent' : 'default'} style={{ fontSize: '0.7rem', padding: '2px 7px' }}>
                  {duration}s
                </GlassPill>

                <button
                  type="button"
                  className="glass-btn-icon"
                  onClick={() => onSeekToSegment(startSec)}
                  title="Chuyển video đến đoạn này"
                >
                  <Play size={12} strokeWidth={2} />
                </button>

                {segments.length > 1 && !disabled && (
                  <button
                    type="button"
                    className="glass-btn-icon text-secondary"
                    onClick={() => onDeleteSplit(seg.id)}
                    title="Hợp nhất với đoạn sau / Xóa mốc chia này"
                  >
                    <Trash2 size={12} strokeWidth={1.8} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </GlassPanel>
  );
};
