import React, { useState } from 'react';
import { Plus as PlusNode, Check as CheckNode } from 'lucide';
import { Scissors, Plus } from 'lucide-react';
import { Segment } from '../types';
import { SegmentItem } from './SegmentItem';
import { MorphIconWrapper } from './glass/MorphIconWrapper';

interface SegmentListProps {
  segments: Segment[];
  activeSegmentId?: string;
  disabled?: boolean;
  onSelectSegment?: (id: string) => void;
  onAddSegment: () => void;
  onUpdateSegment: (id: string, field: 'name' | 'start' | 'end', value: string) => void;
  onDeleteSegment: (id: string) => void;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
}

export const SegmentList: React.FC<SegmentListProps> = ({
  segments,
  activeSegmentId,
  disabled,
  onSelectSegment,
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
    setTimeout(() => setIsAdding(false), 600);
  };

  return (
    <div className="section">
      {/* Header */}
      <div className="section-header">
        <div className="section-title">
          <Scissors size={14} style={{ color: 'var(--accent)' }} />
          <span>Đoạn cắt</span>
          <span className="badge badge-accent">{segments.length}</span>
        </div>

        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={handleAddClick}
          disabled={disabled}
          title="Thêm đoạn cắt mới"
        >
          <MorphIconWrapper
            icon={isAdding ? CheckNode : PlusNode}
            spring="smooth"
            size={13}
            color="#ffffff"
          />
          <span>{isAdding ? 'Đã thêm' : 'Thêm đoạn'}</span>
        </button>
      </div>

      {/* Segment List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {segments.length === 0 ? (
          <div
            style={{
              padding: '24px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '13px',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ marginBottom: '8px' }}>Chưa có đoạn cắt</div>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={handleAddClick}
              disabled={disabled}
            >
              <Plus size={12} />
              <span>Thêm đoạn</span>
            </button>
          </div>
        ) : (
          segments.map((segment, index) => (
            <SegmentItem
              key={segment.id}
              segment={segment}
              index={index}
              totalSegments={segments.length}
              isActive={segment.id === activeSegmentId}
              canDelete={segments.length > 1}
              disabled={disabled}
              onSelect={onSelectSegment}
              onUpdate={onUpdateSegment}
              onDelete={onDeleteSegment}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
            />
          ))
        )}
      </div>
    </div>
  );
};
