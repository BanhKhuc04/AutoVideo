import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide';
import { ArrowUp, ArrowDown, Trash2, AlertCircle } from 'lucide-react';
import { Segment } from '../types';
import { timeStringToSeconds } from '../utils/timeValidator';
import { MorphIconWrapper } from './glass/MorphIconWrapper';

interface SegmentItemProps {
  segment: Segment;
  index: number;
  totalSegments: number;
  isActive?: boolean;
  canDelete: boolean;
  disabled?: boolean;
  onSelect?: (id: string) => void;
  onUpdate: (id: string, field: 'name' | 'start' | 'end', value: string) => void;
  onDelete: (id: string) => void;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
}

export const SegmentItem: React.FC<SegmentItemProps> = ({
  segment,
  index,
  totalSegments,
  isActive = false,
  canDelete,
  disabled,
  onSelect,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(index === 0 || isActive);
  const clipNum = (index + 1).toString().padStart(2, '0');

  const startSec = timeStringToSeconds(segment.start);
  const endSec = timeStringToSeconds(segment.end);
  const duration =
    startSec !== null && endSec !== null && endSec > startSec ? endSec - startSec : null;

  const handleRowClick = () => {
    onSelect?.(segment.id);
    setIsExpanded(true);
  };

  return (
    <div
      style={{
        background: isActive ? 'var(--bg-hover)' : 'var(--bg-card-inner)',
        border: segment.error
          ? '1.5px solid var(--color-danger)'
          : isActive
          ? '1.5px solid #0a84ff'
          : '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        transition: 'all 140ms ease',
        boxShadow: isActive ? '0 0 12px rgba(10, 132, 255, 0.25)' : 'none',
        overflow: 'hidden',
      }}
    >
      {/* Header Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          cursor: 'pointer',
          userSelect: 'none',
          gap: '8px',
        }}
        onClick={handleRowClick}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1, minWidth: 0 }}>
          {/* Index Pill */}
          <span
            className="font-monospace"
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: isActive ? '#0a84ff' : 'rgba(255, 255, 255, 0.08)',
              color: isActive ? '#ffffff' : 'var(--accent)',
              flexShrink: 0,
            }}
          >
            {clipNum}
          </span>

          {/* Name */}
          <span
            style={{
              fontSize: '13px',
              fontWeight: isActive ? 600 : 500,
              color: isActive ? '#ffffff' : 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {segment.name || `Đoạn ${clipNum}`}
          </span>

          {/* Time range */}
          <span
            className="font-monospace"
            style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}
          >
            {segment.start || '00:00:00'} → {segment.end || '00:00:00'}
          </span>

          {/* Duration Badge */}
          {duration !== null && (
            <span
              className={`ui-pill ${isActive ? 'ui-pill-accent' : ''} font-monospace`}
              style={{ fontSize: '10px', flexShrink: 0, padding: '1px 6px' }}
            >
              {duration}s
            </span>
          )}
        </div>

        {/* Actions Row */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {onMoveUp && (
            <button
              type="button"
              className="btn-icon"
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
              className="btn-icon"
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
              className="btn-icon"
              onClick={() => onDelete(segment.id)}
              title="Xóa đoạn"
              style={{ color: 'var(--color-danger)' }}
            >
              <Trash2 size={13} strokeWidth={1.8} />
            </button>
          )}

          <button
            type="button"
            className="btn-icon"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Thu gọn' : 'Mở rộng'}
          >
            <MorphIconWrapper
              icon={isExpanded ? ChevronUp : ChevronDown}
              spring="smooth"
              size={14}
              color="var(--text-secondary)"
            />
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div
          className="animate-fade-in"
          style={{
            padding: '10px 12px 14px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'rgba(0, 0, 0, 0.2)',
          }}
        >
          {/* Name */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Tên đoạn
            </div>
            <input
              className="input"
              style={{ padding: '6px 10px', fontSize: '13px' }}
              placeholder={`Đoạn ${clipNum}`}
              value={segment.name || ''}
              onFocus={() => onSelect?.(segment.id)}
              onChange={(e) => onUpdate(segment.id, 'name', e.target.value)}
              disabled={disabled}
            />
          </div>

          {/* Time Inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#0a84ff', fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>Bắt đầu [I]</span>
              </div>
              <input
                className={`input font-monospace ${segment.error && !segment.start ? 'input-error' : ''}`}
                style={{ padding: '6px 10px', fontSize: '13px' }}
                placeholder="00:00:05"
                value={segment.start}
                onFocus={() => onSelect?.(segment.id)}
                onChange={(e) => onUpdate(segment.id, 'start', e.target.value)}
                disabled={disabled}
              />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#ffd60a', fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>Kết thúc [O]</span>
              </div>
              <input
                className={`input font-monospace ${segment.error && !segment.end ? 'input-error' : ''}`}
                style={{ padding: '6px 10px', fontSize: '13px' }}
                placeholder="00:00:30"
                value={segment.end}
                onFocus={() => onSelect?.(segment.id)}
                onChange={(e) => onUpdate(segment.id, 'end', e.target.value)}
                disabled={disabled}
              />
            </div>
          </div>

          {/* Duration Footer */}
          {duration !== null && (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Thời lượng: <strong style={{ color: 'var(--text-primary)' }}>{duration}</strong> giây
            </div>
          )}

          {/* Error */}
          {segment.error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '8px',
                padding: '6px 10px',
                background: 'var(--color-danger-subtle)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                color: 'var(--color-danger)',
              }}
            >
              <AlertCircle size={13} style={{ flexShrink: 0 }} />
              <span>{segment.error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
