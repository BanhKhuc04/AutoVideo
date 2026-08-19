import React, { useState } from 'react';
import { ProcessClipResult } from '../types';
import { formatBytes } from '../utils/timeValidator';

interface ClipPreviewPlayerProps {
  clips: ProcessClipResult[];
  jobId?: string;
}

export const ClipPreviewPlayer: React.FC<ClipPreviewPlayerProps> = ({ clips, jobId }) => {
  const [selectedClipIndex, setSelectedClipIndex] = useState<number>(0);

  if (!clips || clips.length === 0) return null;

  const currentClip = clips[selectedClipIndex] || clips[0];

  return (
    <div className="card shadow-sm border-0 mb-4 bg-body-tertiary">
      <div className="card-header bg-dark-subtle border-secondary-subtle py-3 px-4 d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <i className="bi bi-camera-video-fill fs-5 text-primary"></i>
          <h5 className="mb-0 fw-bold text-white">Xem Trước Các Đoạn Video Đã Cắt</h5>
        </div>
        <span className="badge bg-primary px-3 py-1 rounded-pill">
          {clips.length} {clips.length === 1 ? 'đoạn' : 'đoạn'} đã tạo thành công
        </span>
      </div>

      <div className="card-body p-4">
        {/* Clip Selector Tabs */}
        <div className="d-flex gap-2 overflow-x-auto pb-3 mb-3 border-bottom border-secondary-subtle">
          {clips.map((clip, idx) => {
            const isSelected = idx === selectedClipIndex;
            return (
              <button
                key={idx}
                type="button"
                className={`btn btn-sm text-nowrap d-flex align-items-center gap-2 ${
                  isSelected ? 'btn-primary shadow-sm' : 'btn-outline-secondary'
                }`}
                onClick={() => setSelectedClipIndex(idx)}
              >
                <i className="bi bi-film"></i>
                <span className="text-truncate" style={{ maxWidth: '180px' }}>
                  {clip.name || clip.filename}
                </span>
                <span className="badge bg-dark-subtle text-white font-monospace">
                  {clip.durationSeconds}s
                </span>
              </button>
            );
          })}
        </div>

        {/* Video Player & Info */}
        <div className="row g-4 align-items-center">
          <div className="col-12 col-lg-7">
            <div className="ratio ratio-16x9 rounded-3 overflow-hidden shadow bg-black border border-secondary-subtle">
              <video
                key={currentClip.streamUrl}
                controls
                autoPlay={false}
                playsInline
                preload="metadata"
                className="w-100 h-100"
              >
                <source src={currentClip.streamUrl} type="video/mp4" />
                Trình duyệt của bạn không hỗ trợ xem trước video HTML5.
              </video>
            </div>
          </div>

          <div className="col-12 col-lg-5">
            <div className="p-3 bg-dark-subtle rounded-3 border border-secondary-subtle">
              {/* Tên file có wrap chống tràn */}
              <div className="mb-3">
                <div className="d-flex align-items-center gap-2 mb-1">
                  <i className="bi bi-info-circle text-primary"></i>
                  <span className="fw-bold text-white small">Tên tệp video:</span>
                </div>
                <div
                  className="p-2 bg-dark rounded border border-secondary-subtle font-monospace text-primary small"
                  style={{ wordBreak: 'break-all', overflowWrap: 'anywhere', fontSize: '0.78rem' }}
                >
                  {currentClip.filename}
                </div>
              </div>

              <ul className="list-unstyled text-secondary small mb-3">
                <li className="mb-2 d-flex justify-content-between">
                  <span>Thời lượng clip:</span>
                  <strong className="text-white font-monospace">{currentClip.durationSeconds} giây</strong>
                </li>
                <li className="mb-2 d-flex justify-content-between">
                  <span>Dung lượng file:</span>
                  <strong className="text-white font-monospace">{formatBytes(currentClip.sizeBytes)}</strong>
                </li>
                <li className="mb-2 d-flex justify-content-between">
                  <span>Định dạng &amp; Chuẩn nén:</span>
                  <strong className="text-white">720p HD MP4 (H.264 / AAC)</strong>
                </li>
              </ul>

              {/* Nút tải gọn gàng không bị thò chữ */}
              <a
                href={jobId ? `/api/download-clip/${jobId}/${encodeURIComponent(currentClip.filename)}` : currentClip.streamUrl}
                download={currentClip.filename}
                className="btn btn-outline-primary btn-sm w-100 d-flex align-items-center justify-content-center gap-2 shadow-sm py-2"
              >
                <i className="bi bi-download fs-6"></i>
                <span className="fw-semibold text-truncate">
                  Tải riêng video MP4 này ({formatBytes(currentClip.sizeBytes)})
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
