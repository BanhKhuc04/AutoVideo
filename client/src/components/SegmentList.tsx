import React from 'react';
import { Plus } from 'lucide-react';
import { Segment } from '../types';
import { SegmentItem } from './SegmentItem';

interface SegmentListProps {
  segments: Segment[];
  disabled?: boolean;
  onAddSegment: () => void;
  onUpdateSegment: (id: string, field: 'name' | 'start' | 'end', value: string) => void;
  onDeleteSegment: (id: string) => void;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
}

const MARKER_COLORS = [
  '#0A84FF',
  '#30D158',
  '#FF9F0A',
  '#BF5AF2',
  '#64D2FF',
  '#FF375F',
  '#FFD60A',
  '#5E5CE6',
];

export const SegmentList: React.FC<SegmentListProps> = ({
  segments,
  disabled,
  onAddSegment,
  onUpdateSegment,
  onDeleteSegment,
  onMoveUp,
  onMoveDown,
}) => {
  return (
    <div className="apple-card p-4 mb-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div className="d-flex align-items-center gap-2">
          <span className="fw-semibold text-white" style={{ fontSize: '0.92rem' }}>
            Đoạn cắt
          </span>
          <span className="apple-pill font-monospace" style={{ fontSize: '0.72rem' }}>
            {segments.length} đoạn
          </span>
        </div>

        <button
          type="button"
          className="apple-btn-secondary"
          style={{ padding: '5px 12px', fontSize: '0.8rem' }}
          onClick={onAddSegment}
          disabled={disabled}
        >
          <Plus size={14} strokeWidth={2} />
          <span>Thêm đoạn</span>
        </button>
      </div>

      {/* Segments Container */}
      <div className="d-flex flex-column gap-2 mb-3">
        {segments.map((segment, index) => (
          <SegmentItem
            key={segment.id}
            segment={segment}
            index={index}
            totalSegments={segments.length}
            color={MARKER_COLORS[index % MARKER_COLORS.length]}
            canDelete={segments.length > 1}
            disabled={disabled}
            onUpdate={onUpdateSegment}
            onDelete={onDeleteSegment}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
          />
        ))}
      </div>

      <div className="d-flex justify-content-center">
        <button
          type="button"
          className="apple-btn-secondary w-100 justify-content-center"
          style={{ padding: '8px 16px', fontSize: '0.84rem', borderStyle: 'dashed' }}
          onClick={onAddSegment}
          disabled={disabled}
        >
          <Plus size={15} strokeWidth={2} />
          <span>Thêm đoạn cắt tiếp theo</span>
        </button>
      </div>
    </div>
  );
};
