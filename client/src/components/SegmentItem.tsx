import React from 'react';
import { ChevronUp, ChevronDown, Trash2, AlertCircle } from 'lucide-react';
import { Segment } from '../types';
import { timeStringToSeconds } from '../utils/timeValidator';

interface SegmentItemProps {
  segment: Segment;
  index: number;
  totalSegments: number;
  canDelete: boolean;
  disabled?: boolean;
  color?: string;
  onUpdate: (id: string, field: 'name' | 'start' | 'end', value: string) => void;
  onDelete: (id: string) => void;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
}

export const SegmentItem: React.FC<SegmentItemProps> = ({
  segment,
  index,
  totalSegments,
  canDelete,
  disabled,
  color,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}) => {
  const clipNum = (index + 1).toString().padStart(2, '0');
  const markerColor = color || '#0A84FF';

  // Tính thời lượng clip
  const startSec = timeStringToSeconds(segment.start);
  const endSec = timeStringToSeconds(segment.end);
  const duration =
    startSec !== null && endSec !== null && endSec > startSec ? endSec - startSec : null;

  return (
    <div
      className={`apple-card-inner p-3 mb-2.5 transition-all ${
        segment.error ? 'border-danger' : ''
      }`}
      style={{
        borderLeft: `4px solid ${markerColor}`,
        borderColor: segment.error ? 'var(--color-danger)' : undefined,
      }}
    >
      <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-2">
        {/* Index Number & Duration badge */}
        <div className="d-flex align-items-center gap-2">
          <span
            className="font-monospace fw-semibold"
            style={{ fontSize: '0.82rem', color: markerColor }}
          >
            {clipNum}
          </span>

          {duration !== null ? (
            <span className="apple-pill font-monospace" style={{ fontSize: '0.72rem', color: 'var(--text-primary)' }}>
              {duration} giây
            </span>
          ) : (
            <span className="apple-pill font-monospace" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              -- giây
            </span>
          )}
        </div>

        {/* Action Controls: Move Up, Move Down, Delete */}
        <div className="d-flex align-items-center gap-1">
          {onMoveUp && (
            <button
              type="button"
              className="apple-btn-icon"
              onClick={() => onMoveUp(segment.id)}
              disabled={disabled || index === 0}
              title="Di chuyển lên"
            >
              <ChevronUp size={15} strokeWidth={2} />
            </button>
          )}

          {onMoveDown && (
            <button
              type="button"
              className="apple-btn-icon"
              onClick={() => onMoveDown(segment.id)}
              disabled={disabled || index === totalSegments - 1}
              title="Di chuyển xuống"
            >
              <ChevronDown size={15} strokeWidth={2} />
            </button>
          )}

          {canDelete && !disabled && (
            <button
              type="button"
              className="apple-btn-icon btn-danger-hover ms-1"
              onClick={() => onDelete(segment.id)}
              title="Xóa đoạn này"
            >
              <Trash2 size={15} strokeWidth={1.8} />
            </button>
          )}
        </div>
      </div>

      {/* Inputs: Tên đoạn | Bắt đầu | Kết thúc */}
      <div className="row g-2 align-items-center">
        {/* Tên đoạn */}
        <div className="col-12 col-md-5">
          <div className="text-secondary small mb-1" style={{ fontSize: '0.74rem' }}>
            Tên đoạn
          </div>
          <input
            type="text"
            className="apple-input"
            style={{ padding: '7px 11px', fontSize: '0.86rem' }}
            placeholder={index === 0 ? 'Khoảnh khắc mở đầu' : index === 1 ? 'Đoạn cao trào' : `Đoạn ${clipNum}`}
            value={segment.name || ''}
            onChange={(e) => onUpdate(segment.id, 'name', e.target.value)}
            disabled={disabled}
          />
        </div>

        {/* Bắt đầu */}
        <div className="col-6 col-md-3.5 col-lg-3.5">
          <div className="text-secondary small mb-1" style={{ fontSize: '0.74rem' }}>
            Bắt đầu
          </div>
          <input
            type="text"
            className={`apple-input font-monospace ${segment.error && !segment.start ? 'is-invalid' : ''}`}
            style={{ padding: '7px 11px', fontSize: '0.86rem' }}
            placeholder="00:00:05"
            value={segment.start}
            onChange={(e) => onUpdate(segment.id, 'start', e.target.value)}
            disabled={disabled}
          />
        </div>

        {/* Kết thúc */}
        <div className="col-6 col-md-3.5 col-lg-3.5">
          <div className="text-secondary small mb-1" style={{ fontSize: '0.74rem' }}>
            Kết thúc
          </div>
          <input
            type="text"
            className={`apple-input font-monospace ${segment.error && !segment.end ? 'is-invalid' : ''}`}
            style={{ padding: '7px 11px', fontSize: '0.86rem' }}
            placeholder="00:00:30"
            value={segment.end}
            onChange={(e) => onUpdate(segment.id, 'end', e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Error message banner */}
      {segment.error && (
        <div
          className="d-flex align-items-center gap-2 mt-2 p-2 px-3 rounded-2"
          style={{
            background: 'rgba(255, 69, 58, 0.1)',
            border: '1px solid rgba(255, 69, 58, 0.25)',
            color: 'var(--color-danger)',
            fontSize: '0.78rem',
          }}
        >
          <AlertCircle size={14} className="flex-shrink-0" />
          <span>{segment.error}</span>
        </div>
      )}
    </div>
  );
};
