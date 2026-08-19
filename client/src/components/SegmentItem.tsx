import React from 'react';
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
  const clipNum = (index + 1).toString().padStart(3, '0');
  const markerColor = color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];

  // Tính toán thời lượng clip
  const startSec = timeStringToSeconds(segment.start);
  const endSec = timeStringToSeconds(segment.end);
  const duration =
    startSec !== null && endSec !== null && endSec > startSec ? endSec - startSec : null;

  return (
    <div
      className={`card mb-3 border-secondary-subtle bg-body-tertiary shadow-sm transition-all ${
        segment.error ? 'border-danger' : ''
      }`}
      style={{ borderLeft: `5px solid ${markerColor}` }}
    >
      <div className="card-body p-3">
        {/* Header Row: Huy hiệu số thứ tự, Thời lượng, Nút đổi vị trí & Xóa */}
        <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <span
              className="badge text-white px-2 py-1 shadow-sm font-monospace"
              style={{ backgroundColor: markerColor }}
            >
              Đoạn #{clipNum}
            </span>

            {duration !== null ? (
              <span className="badge bg-success-subtle text-success border border-success-subtle font-monospace">
                <i className="bi bi-stopwatch me-1"></i> Dài {duration} giây
              </span>
            ) : (
              <span className="badge bg-secondary-subtle text-secondary font-monospace">
                Thời lượng: --
              </span>
            )}
          </div>

          <div className="d-flex align-items-center gap-1">
            {/* Đổi vị trí lên */}
            {onMoveUp && (
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm px-2 py-0"
                onClick={() => onMoveUp(segment.id)}
                disabled={disabled || index === 0}
                title="Di chuyển đoạn này lên trên"
              >
                <i className="bi bi-arrow-up"></i>
              </button>
            )}

            {/* Đổi vị trí xuống */}
            {onMoveDown && (
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm px-2 py-0"
                onClick={() => onMoveDown(segment.id)}
                disabled={disabled || index === totalSegments - 1}
                title="Di chuyển đoạn này xuống dưới"
              >
                <i className="bi bi-arrow-down"></i>
              </button>
            )}

            {/* Xóa đoạn */}
            {canDelete && !disabled && (
              <button
                type="button"
                className="btn btn-outline-danger btn-sm px-2 py-0 ms-2"
                onClick={() => onDelete(segment.id)}
                title="Xóa đoạn này"
              >
                <i className="bi bi-trash3-fill"></i>
              </button>
            )}
          </div>
        </div>

        {/* Input Fields Row: Tên đoạn (tùy chọn), Thời gian bắt đầu, Thời gian kết thúc */}
        <div className="row g-2 align-items-center">
          {/* Tên đoạn */}
          <div className="col-12 col-md-4">
            <label className="form-label small fw-semibold text-secondary mb-1">
              Tên đoạn (tùy chọn):
            </label>
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-dark border-secondary-subtle">
                <i className="bi bi-file-earmark-play text-primary"></i>
              </span>
              <input
                type="text"
                className="form-control border-secondary-subtle bg-dark text-light"
                placeholder={index === 0 ? 'cảnh học tập' : index === 1 ? 'khoảnh khắc thành công' : `doan_${clipNum}`}
                value={segment.name || ''}
                onChange={(e) => onUpdate(segment.id, 'name', e.target.value)}
                disabled={disabled}
              />
            </div>
          </div>

          {/* Thời gian bắt đầu */}
          <div className="col-6 col-md-4">
            <label className="form-label small fw-semibold text-secondary mb-1">
              Thời gian bắt đầu:
            </label>
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-dark border-secondary-subtle">
                <i className="bi bi-play-fill text-success"></i>
              </span>
              <input
                type="text"
                className={`form-control border-secondary-subtle font-monospace bg-dark text-light ${
                  segment.error && !segment.start ? 'is-invalid' : ''
                }`}
                placeholder="00:04:34"
                value={segment.start}
                onChange={(e) => onUpdate(segment.id, 'start', e.target.value)}
                disabled={disabled}
              />
            </div>
          </div>

          {/* Thời gian kết thúc */}
          <div className="col-6 col-md-4">
            <label className="form-label small fw-semibold text-secondary mb-1">
              Thời gian kết thúc:
            </label>
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-dark border-secondary-subtle">
                <i className="bi bi-stop-fill text-danger"></i>
              </span>
              <input
                type="text"
                className={`form-control border-secondary-subtle font-monospace bg-dark text-light ${
                  segment.error && !segment.end ? 'is-invalid' : ''
                }`}
                placeholder="00:05:12"
                value={segment.end}
                onChange={(e) => onUpdate(segment.id, 'end', e.target.value)}
                disabled={disabled}
              />
            </div>
          </div>
        </div>

        {segment.error && (
          <div className="alert alert-danger py-1 px-2 mt-2 mb-0 d-flex align-items-center gap-2 small" style={{ fontSize: '0.8rem' }}>
            <i className="bi bi-exclamation-triangle-fill"></i>
            <span>{segment.error}</span>
          </div>
        )}
      </div>
    </div>
  );
};
