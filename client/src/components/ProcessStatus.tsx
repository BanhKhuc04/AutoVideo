import React from 'react';
import { CheckCircle2, AlertCircle, Loader2, Circle } from 'lucide-react';
import { ProcessingStep } from '../types';

interface ProcessStatusProps {
  step: ProcessingStep;
  errorMessage?: string;
}

interface StepItem {
  key: ProcessingStep;
  label: string;
  sublabel: string;
}

const STEPS: StepItem[] = [
  {
    key: 'downloading',
    label: 'Tải video nguồn',
    sublabel: 'Tải luồng video từ YouTube',
  },
  {
    key: 'processing',
    label: 'Cắt các đoạn video',
    sublabel: 'Trích xuất chính xác theo mốc thời gian',
  },
  {
    key: 'zipping',
    label: 'Lưu các tệp video MP4',
    sublabel: 'Ghi trực tiếp vào thư mục máy tính',
  },
];

export const ProcessStatus: React.FC<ProcessStatusProps> = ({ step, errorMessage }) => {
  if (step === 'idle') return null;

  if (step === 'error') {
    return (
      <div
        className="apple-card p-4 mb-4 animate-fade-in"
        style={{
          border: '1px solid rgba(255, 69, 58, 0.3)',
          background: 'rgba(255, 69, 58, 0.06)',
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
      </div>
    );
  }

  const stepOrder: ProcessingStep[] = ['downloading', 'processing', 'zipping', 'completed'];
  const currentIndex = stepOrder.indexOf(step);

  const progressPercent =
    step === 'downloading' ? 30 : step === 'processing' ? 70 : step === 'zipping' ? 90 : 100;

  return (
    <div className="apple-card p-4 mb-4 animate-fade-in">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div className="d-flex align-items-center gap-2">
          <Loader2 size={16} className="animate-spin" style={{ color: 'var(--accent-apple)', animation: 'spin 1s linear infinite' }} />
          <span className="fw-semibold text-white" style={{ fontSize: '0.92rem' }}>
            Đang xử lý video...
          </span>
        </div>
        <span className="apple-pill font-monospace" style={{ fontSize: '0.72rem', color: 'var(--accent-apple)' }}>
          {progressPercent}%
        </span>
      </div>

      {/* Progress Bar */}
      <div
        className="rounded-pill mb-4 overflow-hidden"
        style={{ height: '6px', background: 'var(--bg-surface-3)' }}
      >
        <div
          className="h-100 rounded-pill"
          style={{
            width: `${progressPercent}%`,
            background: 'linear-gradient(90deg, #0A84FF 0%, #64D2FF 100%)',
            transition: 'width 400ms cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: '0 0 12px rgba(10, 132, 255, 0.5)',
          }}
        ></div>
      </div>

      {/* Steps List */}
      <div className="d-flex flex-column gap-2">
        {STEPS.map((s, idx) => {
          const isDone = currentIndex > idx;
          const isCurrent = s.key === step;
          const isPending = currentIndex < idx;

          return (
            <div
              key={s.key}
              className="d-flex align-items-center justify-content-between p-2.5 px-3 rounded-2"
              style={{
                background: isCurrent ? 'var(--bg-surface-2)' : 'transparent',
                border: isCurrent ? '1px solid var(--border-subtle)' : '1px solid transparent',
                opacity: isPending ? 0.4 : 1,
                transition: 'all 200ms ease',
              }}
            >
              <div className="d-flex align-items-center gap-2.5">
                {isDone ? (
                  <CheckCircle2 size={16} style={{ color: 'var(--color-success)' }} />
                ) : isCurrent ? (
                  <Loader2 size={16} className="animate-spin" style={{ color: 'var(--accent-apple)', animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Circle size={16} style={{ color: 'var(--text-tertiary)' }} />
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
                  <span className="apple-pill-success" style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px' }}>
                    Xong
                  </span>
                )}
                {isCurrent && (
                  <span className="apple-pill-accent" style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px' }}>
                    Đang chạy...
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
