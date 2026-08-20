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
        background: isActive ? 'var(--bg-hover)' : 'var(--bg-elevated)',
        border: segment.error
          ? '1.5px solid var(--danger)'
          : isActive
          ? '1.5px solid #3B82F6'
          : '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        transition: 'all 140ms ease',
        boxShadow: isActive ? '0 0 12px rgba(59, 130, 246, 0.2)' : 'none',
      }}
    >
      {/* Collapsed / Header Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={handleRowClick}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1, minWidth: 0 }}>
          <span
            className="text-mono"
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: isActive ? '#3B82F6' : 'rgba(255, 255, 255, 0.08)',
              color: isActive ? '#ffffff' : 'var(--accent)',
              flexShrink: 0,
            }}
          >
            {clipNum}
          </span>

          <span
            className="truncate"
            style={{
              fontSize: '13px',
              fontWeight: isActive ? 600 : 500,
              color: isActive ? '#ffffff' : 'var(--text-primary)',
            }}
          >
            {segment.name || `Đoạn ${clipNum}`}
          </span>

          <span
            className="text-mono"
            style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}
          >
            {segment.start || '00:00:00'} → {segment.end || '00:00:00'}
          </span>

          {duration !== null && (
            <span
              className={`ui-pill ${isActive ? 'ui-pill-accent' : ''} font-monospace`}
              style={{ fontSize: '10px', flexShrink: 0 }}
            >
              {duration}s
            </span>
          )}
        </div>

        {/* Actions */}
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
              style={{ color: 'var(--danger)' }}
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
            padding: '8px 12px 12px',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          {/* Name */}
          <div style={{ marginBottom: '8px' }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#3B82F6', fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>Bắt đầu [I]</span>
              </div>
              <input
                className={`input text-mono ${segment.error && !segment.start ? 'input-error' : ''}`}
                style={{ padding: '6px 10px', fontSize: '13px' }}
                placeholder="00:00:05"
                value={segment.start}
                onFocus={() => onSelect?.(segment.id)}
                onChange={(e) => onUpdate(segment.id, 'start', e.target.value)}
                disabled={disabled}
              />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#F59E0B', fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>Kết thúc [O]</span>
              </div>
              <input
                className={`input text-mono ${segment.error && !segment.end ? 'input-error' : ''}`}
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
              Thời lượng: <strong>{duration}</strong> giây
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
                background: 'var(--danger-subtle)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                color: 'var(--danger)',
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
