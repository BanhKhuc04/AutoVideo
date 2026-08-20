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
    <div
      className="p-3.5 rounded-3 mb-3"
      style={{
        background: 'rgba(18, 20, 26, 0.65)',
        border: '1px solid var(--glass-border-subtle)',
      }}
    >
      {/* Selector pills */}
      <div className="d-flex gap-1.5 overflow-x-auto pb-2.5 mb-3 border-bottom" style={{ borderColor: 'var(--glass-border-subtle)' }}>
        {clips.map((clip, idx) => {
          const isSelected = idx === selectedClipIndex;
          return (
            <button
              key={idx}
              type="button"
              className={`glass-btn ${isSelected ? 'glass-btn-primary' : ''}`}
              style={{ padding: '5px 10px', fontSize: '0.76rem', borderRadius: 'var(--radius-pill)' }}
              onClick={() => setSelectedClipIndex(idx)}
            >
              <Film size={12} strokeWidth={2} />
              <span className="text-truncate" style={{ maxWidth: '140px' }}>
                {clip.name || clip.filename}
              </span>
              <span className="font-monospace opacity-75" style={{ fontSize: '0.7rem' }}>
                {clip.durationSeconds}s
              </span>
            </button>
          );
        })}
      </div>

      {/* Player & Info */}
      <div className="row g-3 align-items-center">
        <div className="col-12 col-md-7">
          <div className="rounded-3 overflow-hidden bg-black border" style={{ aspectRatio: '16/9', borderColor: 'var(--glass-border)' }}>
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
          <div className="d-flex flex-column gap-2">
            <div>
              <div className="text-secondary small mb-1" style={{ fontSize: '0.72rem' }}>
                Tên tệp video
              </div>
              <div
                className="p-2 rounded-2 font-monospace text-white"
                style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid var(--glass-border-subtle)',
                  fontSize: '0.78rem',
                  wordBreak: 'break-all',
                }}
              >
                {currentClip.filename}
              </div>
            </div>

            <div className="d-flex flex-column gap-1 py-1 font-monospace" style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
              <div className="d-flex justify-content-between">
                <span>Thời lượng:</span>
                <span className="text-white">{currentClip.durationSeconds} giây</span>
              </div>
              <div className="d-flex justify-content-between">
                <span>Dung lượng:</span>
                <span className="text-white">{formatBytes(currentClip.sizeBytes)}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span>Định dạng:</span>
                <span className="text-white">720p / 1080p MP4</span>
              </div>
            </div>

            <a
              href={jobId ? `/api/download-clip/${jobId}/${encodeURIComponent(currentClip.filename)}` : currentClip.streamUrl}
              download={currentClip.filename}
              className="glass-btn mt-1 justify-content-center text-decoration-none"
              style={{ padding: '7px 12px', fontSize: '0.8rem' }}
            >
              <Download size={13} strokeWidth={1.8} />
              <span>Tải riêng file MP4 này</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
