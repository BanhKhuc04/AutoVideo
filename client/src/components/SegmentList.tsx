import React from 'react';
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

const DEFAULT_COLORS = [
  '#0d6efd',
  '#198754',
  '#ffc107',
  '#0dcaf0',
  '#d63384',
  '#fd7e14',
  '#6f42c1',
  '#20c997',
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
    <div className="card shadow-sm border-0 mb-4 bg-dark-subtle">
      <div className="card-body p-4">
        <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-scissors fs-5 text-primary"></i>
            <h5 className="mb-0 fw-bold text-white">Quản Lý Các Đoạn Cắt Video</h5>
            <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle rounded-pill font-monospace">
              {segments.length} {segments.length === 1 ? 'đoạn' : 'đoạn'}
            </span>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-sm d-flex align-items-center gap-2 shadow-sm"
            onClick={onAddSegment}
            disabled={disabled}
          >
            <i className="bi bi-plus-circle-fill"></i>
            <span>+ Thêm đoạn cắt</span>
          </button>
        </div>

        <p className="text-secondary small mb-3">
          Đặt tên gợi nhớ (tùy chọn) và mốc thời gian bắt đầu - kết thúc cho từng đoạn video. Các file xuất ra sẽ được tự động đặt tên chuẩn (ví dụ: <code>The_Boy_Who_Learned_001.mp4</code>).
        </p>

        <div className="segments-container">
          {segments.map((segment, index) => (
            <SegmentItem
              key={segment.id}
              segment={segment}
              index={index}
              totalSegments={segments.length}
              color={DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
              canDelete={segments.length > 1}
              disabled={disabled}
              onUpdate={onUpdateSegment}
              onDelete={onDeleteSegment}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
            />
          ))}
        </div>

        <div className="d-flex justify-content-center mt-3">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2"
            onClick={onAddSegment}
            disabled={disabled}
          >
            <i className="bi bi-plus-lg"></i>
            <span>+ Thêm đoạn cắt khác</span>
          </button>
        </div>
      </div>
    </div>
  );
};
