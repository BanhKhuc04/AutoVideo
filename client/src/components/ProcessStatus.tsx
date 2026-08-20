import React from 'react';
import { Check } from 'lucide';
import { Loader2, AlertCircle, Circle } from 'lucide-react';
import { ProcessingStep } from '../types';
import { GlassPanel } from './glass/GlassPanel';
import { GlassProgress } from './glass/GlassProgress';
import { MorphIconWrapper } from './glass/MorphIconWrapper';

interface ProcessStatusProps {
  step: ProcessingStep;
  errorMessage?: string;
  totalSegments?: number;
}

interface StepItem {
  key: ProcessingStep;
  label: string;
  sublabel: string;
}

const STAGES: StepItem[] = [
  {
    key: 'downloading',
    label: 'Tải video nguồn',
    sublabel: 'Trích xuất luồng video YouTube',
  },
  {
    key: 'processing',
    label: 'Cắt các đoạn video',
    sublabel: 'Trích xuất chính xác theo mốc thời gian',
  },
  {
    key: 'zipping',
    label: 'Lưu các tệp MP4',
    sublabel: 'Ghi trực tiếp vào thư mục máy tính',
  },
];

export const ProcessStatus: React.FC<ProcessStatusProps> = ({ step, errorMessage }) => {
  if (step === 'idle') return null;

  if (step === 'error') {
    return (
      <GlassPanel
        className="p-4 mb-4 animate-fade-in"
        style={{
          border: '1px solid rgba(255, 69, 58, 0.3)',
          background: 'rgba(255, 69, 58, 0.08)',
        }}
      >
        <div className="d-flex align-items-start gap-3">
          <AlertCircle size={20} className="flex-shrink-0" style={{ color: 'var(--color-danger)', marginTop: '2px' }} />
          <div>
            <div className="fw-semibold mb-1" style={{ color: 'var(--color-danger)', fontSize: '0.92rem' }}>
              Xử lý video chưa thành công
            </div>
            <p className="mb-0 small" style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
              {errorMessage || 'Đã xảy ra lỗi trong quá trình xử lý video. Vui lòng kiểm tra lại liên kết hoặc dung lượng bộ nhớ.'}
            </p>
          </div>
        </div>
      </GlassPanel>
    );
  }

  const stepOrder: ProcessingStep[] = ['downloading', 'processing', 'zipping', 'completed'];
  const currentIndex = stepOrder.indexOf(step);

  const progressPercent =
    step === 'downloading' ? 30 : step === 'processing' ? 70 : step === 'zipping' ? 90 : 100;

  return (
    <GlassPanel className="p-4 mb-4 animate-fade-in" variant="elevated">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div className="d-flex align-items-center gap-2">
          <Loader2 size={16} className="animate-spin" style={{ color: 'var(--accent-blue)', animation: 'spin 1s linear infinite' }} />
          <span className="fw-semibold text-white" style={{ fontSize: '0.92rem' }}>
            Đang xử lý video...
          </span>
        </div>
        <span className="font-monospace fw-semibold" style={{ fontSize: '0.78rem', color: 'var(--accent-blue)' }}>
          {progressPercent}%
        </span>
      </div>

      {/* Progress Bar */}
      <GlassProgress percent={progressPercent} height={6} className="mb-3.5" />

      {/* Steps List */}
      <div className="d-flex flex-column gap-1.5">
        {STAGES.map((s, idx) => {
          const isDone = currentIndex > idx;
          const isCurrent = s.key === step;
          const isPending = currentIndex < idx;

          return (
            <div
              key={s.key}
              className="d-flex align-items-center justify-content-between p-2 px-3 rounded-2 transition-all"
              style={{
                background: isCurrent ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                opacity: isPending ? 0.35 : 1,
              }}
            >
              <div className="d-flex align-items-center gap-2.5">
                {isDone ? (
                  <div
                    className="d-flex align-items-center justify-content-center rounded-circle"
                    style={{ width: '18px', height: '18px', background: 'var(--color-success-translucent)' }}
                  >
                    <MorphIconWrapper
                      icon={Check}
                      spring="snappy"
                      size={12}
                      color="var(--color-success)"
                    />
                  </div>
                ) : isCurrent ? (
                  <Loader2 size={15} className="animate-spin" style={{ color: 'var(--accent-blue)', animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Circle size={15} style={{ color: 'var(--text-tertiary)' }} />
                )}
                <div>
                  <div className="fw-medium text-white" style={{ fontSize: '0.84rem' }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                    {s.sublabel}
                  </div>
                </div>
              </div>

              <div>
                {isDone && (
                  <span className="font-monospace" style={{ fontSize: '0.72rem', color: 'var(--color-success)' }}>
                    Xong
                  </span>
                )}
                {isCurrent && (
                  <span className="font-monospace" style={{ fontSize: '0.72rem', color: 'var(--accent-blue)' }}>
                    Đang chạy...
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </GlassPanel>
  );
};
