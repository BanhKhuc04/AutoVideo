import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide';
import { ArrowUp, ArrowDown, Trash2, AlertCircle, Clock } from 'lucide-react';
import { Segment } from '../types';
import { timeStringToSeconds } from '../utils/timeValidator';
import { MorphIconWrapper } from './glass/MorphIconWrapper';
import { GlassInput } from './glass/GlassInput';
import { GlassPill } from './glass/GlassPill';

interface SegmentItemProps {
  segment: Segment;
  index: number;
  totalSegments: number;
  canDelete: boolean;
  disabled?: boolean;
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
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(index === 0);
  const clipNum = (index + 1).toString().padStart(2, '0');

  const startSec = timeStringToSeconds(segment.start);
  const endSec = timeStringToSeconds(segment.end);
  const duration =
    startSec !== null && endSec !== null && endSec > startSec ? endSec - startSec : null;

  return (
    <div
      className={`liquid-glass-card mb-2 transition-all ${
        segment.error ? 'border-danger' : ''
      }`}
      style={{
        borderColor: segment.error ? 'var(--color-danger)' : undefined,
        borderRadius: 'var(--radius-md)',
      }}
    >
      {/* Collapsed Header Row */}
      <div
        className="d-flex align-items-center justify-content-between p-2.5 px-3 cursor-pointer user-select-none"
        style={{ cursor: 'pointer' }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="d-flex align-items-center gap-2.5 overflow-hidden">
          <span
            className="font-monospace fw-semibold"
            style={{ fontSize: '0.8rem', color: 'var(--accent-blue)' }}
          >
            {clipNum}
          </span>

          <div className="text-truncate fw-medium text-white" style={{ fontSize: '0.84rem' }}>
            {segment.name || `Đoạn ${clipNum}`}
          </div>

          <div className="d-none d-sm-flex align-items-center gap-1.5 font-monospace" style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)' }}>
            <span>{segment.start || '00:00:00'}</span>
            <span>&rarr;</span>
            <span>{segment.end || '00:00:00'}</span>
          </div>

          {duration !== null && (
            <GlassPill variant="accent" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
              <Clock size={10} />
              <span>{duration}s</span>
            </GlassPill>
          )}
        </div>

        {/* Action Controls */}
        <div className="d-flex align-items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {onMoveUp && (
            <button
              type="button"
              className="glass-btn-icon"
              onClick={() => onMoveUp(segment.id)}
              disabled={disabled || index === 0}
              title="Di chuyển lên"
            >
              <ArrowUp size={13} strokeWidth={2} />
            </button>
          )}

          {onMoveDown && (
            <button
              type="button"
              className="glass-btn-icon"
              onClick={() => onMoveDown(segment.id)}
              disabled={disabled || index === totalSegments - 1}
              title="Di chuyển xuống"
            >
              <ArrowDown size={13} strokeWidth={2} />
            </button>
          )}

          {canDelete && !disabled && (
            <button
              type="button"
              className="glass-btn-icon text-danger"
              onClick={() => onDelete(segment.id)}
              title="Xóa đoạn"
            >
              <Trash2 size={13} strokeWidth={1.8} />
            </button>
          )}

          <button
            type="button"
            className="glass-btn-icon"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Thu gọn' : 'Mở rộng'}
          >
            <MorphIconWrapper
              icon={isExpanded ? ChevronUp : ChevronDown}
              spring="smooth"
              size={15}
              color="var(--text-secondary)"
            />
          </button>
        </div>
      </div>

      {/* Expanded Details Body */}
      {isExpanded && (
        <div className="p-3 pt-1 border-top animate-fade-in" style={{ borderColor: 'var(--glass-border-subtle)' }}>
          <div className="row g-2 align-items-center">
            {/* Tên đoạn */}
            <div className="col-12 col-md-5">
              <div className="text-secondary small mb-1" style={{ fontSize: '0.72rem' }}>
                Tên đoạn
              </div>
              <GlassInput
                style={{ padding: '6px 10px', fontSize: '0.82rem' }}
                placeholder={`Đoạn ${clipNum}`}
                value={segment.name || ''}
                onChange={(e) => onUpdate(segment.id, 'name', e.target.value)}
                disabled={disabled}
              />
            </div>

            {/* Bắt đầu */}
            <div className="col-6 col-md-3.5">
              <div className="text-secondary small mb-1" style={{ fontSize: '0.72rem' }}>
                Bắt đầu
              </div>
              <GlassInput
                className="font-monospace"
                style={{ padding: '6px 10px', fontSize: '0.82rem' }}
                placeholder="00:00:05"
                value={segment.start}
                onChange={(e) => onUpdate(segment.id, 'start', e.target.value)}
                disabled={disabled}
                isInvalid={!!segment.error && !segment.start}
              />
            </div>

            {/* Kết thúc */}
            <div className="col-6 col-md-3.5">
              <div className="text-secondary small mb-1" style={{ fontSize: '0.72rem' }}>
                Kết thúc
              </div>
              <GlassInput
                className="font-monospace"
                style={{ padding: '6px 10px', fontSize: '0.82rem' }}
                placeholder="00:00:30"
                value={segment.end}
                onChange={(e) => onUpdate(segment.id, 'end', e.target.value)}
                disabled={disabled}
                isInvalid={!!segment.error && !segment.end}
              />
            </div>
          </div>

          {/* Error Message */}
          {segment.error && (
            <div
              className="d-flex align-items-center gap-2 mt-2 p-2 px-2.5 rounded-2"
              style={{
                background: 'rgba(255, 69, 58, 0.12)',
                color: 'var(--color-danger)',
                fontSize: '0.76rem',
              }}
            >
              <AlertCircle size={13} className="flex-shrink-0" />
              <span>{segment.error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
