import React, { useState } from 'react';
import { Plus, Check } from 'lucide';
import { Scissors } from 'lucide-react';
import { Segment } from '../types';
import { SegmentItem } from './SegmentItem';
import { GlassPanel } from './glass/GlassPanel';
import { GlassButton } from './glass/GlassButton';
import { GlassPill } from './glass/GlassPill';
import { MorphIconWrapper } from './glass/MorphIconWrapper';

interface SegmentListProps {
  segments: Segment[];
  disabled?: boolean;
  onAddSegment: () => void;
  onUpdateSegment: (id: string, field: 'name' | 'start' | 'end', value: string) => void;
  onDeleteSegment: (id: string) => void;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
}

export const SegmentList: React.FC<SegmentListProps> = ({
  segments,
  disabled,
  onAddSegment,
  onUpdateSegment,
  onDeleteSegment,
  onMoveUp,
  onMoveDown,
}) => {
  const [isAdding, setIsAdding] = useState<boolean>(false);

  const handleAddClick = () => {
    setIsAdding(true);
    onAddSegment();
    setTimeout(() => {
      setIsAdding(false);
    }, 600);
  };

  return (
    <GlassPanel className="p-3.5 mb-3.5">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-2.5">
        <div className="d-flex align-items-center gap-2">
          <Scissors size={15} style={{ color: 'var(--accent-blue)' }} />
          <span className="fw-semibold text-white" style={{ fontSize: '0.88rem' }}>
            Đoạn cắt
          </span>
          <GlassPill variant="accent" style={{ fontSize: '0.7rem' }}>
            {segments.length} đoạn
          </GlassPill>
        </div>

        {/* Morphing Add Clip Button */}
        <GlassButton
          size="sm"
          variant="primary"
          onClick={handleAddClick}
          disabled={disabled}
          title="Thêm đoạn cắt mới (+)"
        >
          <MorphIconWrapper
            icon={isAdding ? Check : Plus}
            spring="smooth"
            size={14}
            color="#ffffff"
          />
          <span>{isAdding ? 'Đã thêm' : 'Thêm đoạn'}</span>
        </GlassButton>
      </div>

      {/* Segments list with compact rows */}
      <div className="d-flex flex-column gap-1">
        {segments.map((segment, index) => (
          <SegmentItem
            key={segment.id}
            segment={segment}
            index={index}
            totalSegments={segments.length}
            canDelete={segments.length > 1}
            disabled={disabled}
            onUpdate={onUpdateSegment}
            onDelete={onDeleteSegment}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
          />
        ))}
      </div>
    </GlassPanel>
  );
};
