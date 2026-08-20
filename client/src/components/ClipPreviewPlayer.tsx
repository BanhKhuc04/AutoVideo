import React, { useState } from 'react';
import { Download, Film } from 'lucide-react';
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
    <div className="apple-card-inner p-4 mb-4">
      {/* Selector pills */}
      <div className="d-flex gap-2 overflow-x-auto pb-3 mb-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        {clips.map((clip, idx) => {
          const isSelected = idx === selectedClipIndex;
          return (
            <button
              key={idx}
              type="button"
              className={isSelected ? 'apple-btn-primary' : 'apple-btn-secondary'}
              style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '8px' }}
              onClick={() => setSelectedClipIndex(idx)}
            >
              <Film size={13} strokeWidth={2} />
              <span className="text-truncate" style={{ maxWidth: '160px' }}>
                {clip.name || clip.filename}
              </span>
              <span className="font-monospace opacity-75" style={{ fontSize: '0.72rem' }}>
                {clip.durationSeconds}s
              </span>
            </button>
          );
        })}
      </div>

      {/* Player & Info */}
      <div className="row g-4 align-items-center">
        <div className="col-12 col-md-7">
          <div className="ratio ratio-16x9 rounded-3 overflow-hidden bg-black border" style={{ borderColor: 'var(--border-subtle)' }}>
            <video
              key={currentClip.streamUrl}
              controls
              autoPlay={false}
              playsInline
              preload="metadata"
              className="w-100 h-100"
            >
              <source src={currentClip.streamUrl} type="video/mp4" />
              Trình duyệt không hỗ trợ xem video trực tiếp.
            </video>
          </div>
        </div>

        <div className="col-12 col-md-5">
          <div className="d-flex flex-column gap-2.5">
            <div>
              <div className="text-secondary small mb-1" style={{ fontSize: '0.74rem' }}>
                Tên tệp video
              </div>
              <div
                className="p-2 px-3 rounded-2 font-monospace text-white"
                style={{
                  background: 'var(--bg-surface-1)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.8rem',
                  wordBreak: 'break-all',
                }}
              >
                {currentClip.filename}
              </div>
            </div>

            <div className="d-flex flex-column gap-1.5 py-1" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <div className="d-flex justify-content-between">
                <span>Thời lượng:</span>
                <span className="font-monospace text-white">{currentClip.durationSeconds} giây</span>
              </div>
              <div className="d-flex justify-content-between">
                <span>Dung lượng:</span>
                <span className="font-monospace text-white">{formatBytes(currentClip.sizeBytes)}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span>Định dạng:</span>
                <span className="text-white">720p HD MP4</span>
              </div>
            </div>

            <a
              href={jobId ? `/api/download-clip/${jobId}/${encodeURIComponent(currentClip.filename)}` : currentClip.streamUrl}
              download={currentClip.filename}
              className="apple-btn-secondary mt-1 justify-content-center"
              style={{ padding: '8px 14px', fontSize: '0.82rem' }}
            >
              <Download size={14} strokeWidth={1.8} />
              <span>Tải file MP4 này</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
