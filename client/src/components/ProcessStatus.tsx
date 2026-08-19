import React from 'react';
import { ProcessingStep } from '../types';

interface ProcessStatusProps {
  step: ProcessingStep;
  errorMessage?: string;
}

interface StepInfo {
  key: ProcessingStep;
  label: string;
  icon: string;
  description: string;
}

const STEPS_VN: StepInfo[] = [
  {
    key: 'downloading',
    label: '1. Đang tải video...',
    icon: 'bi-cloud-arrow-down-fill',
    description: 'Đang tải luồng video gốc chất lượng cao từ YouTube',
  },
  {
    key: 'processing',
    label: '2. Đang cắt các đoạn...',
    icon: 'bi-scissors',
    description: 'Trích xuất chính xác từng khung hình và mã hóa 720p HD',
  },
  {
    key: 'zipping',
    label: '3. Đang đóng gói...',
    icon: 'bi-file-earmark-zip-fill',
    description: 'Nén toàn bộ các đoạn video thành file lưu trữ ZIP',
  },
  {
    key: 'completed',
    label: '4. Hoàn tất!',
    icon: 'bi-check-circle-fill',
    description: 'Video đã sẵn sàng để xem trước, tải về hoặc lưu lên Drive',
  },
];

export const ProcessStatus: React.FC<ProcessStatusProps> = ({ step, errorMessage }) => {
  if (step === 'idle') return null;

  if (step === 'error') {
    return (
      <div className="card shadow border-danger mb-4 bg-danger-subtle text-danger-emphasis">
        <div className="card-body p-4">
          <div className="d-flex align-items-start gap-3">
            <i className="bi bi-x-circle-fill fs-2 text-danger flex-shrink-0"></i>
            <div>
              <h5 className="fw-bold mb-1">Xử Lý Video Chưa Thành Công</h5>
              <p className="mb-0 small">{errorMessage || 'Đã xảy ra lỗi trong quá trình xử lý video. Vui lòng kiểm tra lại liên kết hoặc mốc thời gian.'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Tiến độ phần trăm
  const stepIndexMap: Record<ProcessingStep, number> = {
    idle: 0,
    downloading: 25,
    processing: 60,
    zipping: 85,
    completed: 100,
    error: 0,
  };

  const progress = stepIndexMap[step];

  return (
    <div className="card shadow border-0 mb-4 bg-dark-subtle">
      <div className="card-body p-4">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h5 className="fw-bold mb-0 d-flex align-items-center gap-2 text-white">
            <span
              className="spinner-border spinner-border-sm text-primary"
              role="status"
              aria-hidden="true"
              style={{ display: step === 'completed' ? 'none' : 'inline-block' }}
            ></span>
            {step === 'completed' ? (
              <i className="bi bi-check-circle-fill text-success fs-5"></i>
            ) : null}
            <span>Tiến Độ Xử Lý Video</span>
          </h5>
          <span className="badge bg-primary px-3 py-2 rounded-pill">
            {STEPS_VN.find((s) => s.key === step)?.label || step}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="progress mb-4" style={{ height: '10px' }}>
          <div
            className={`progress-bar progress-bar-striped ${
              step !== 'completed' ? 'progress-bar-animated' : ''
            } bg-primary`}
            role="progressbar"
            style={{ width: `${progress}%` }}
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          ></div>
        </div>

        {/* Step Icons List */}
        <div className="row g-2 text-center">
          {STEPS_VN.map((s, idx) => {
            const currentIdx = Object.keys(stepIndexMap).indexOf(step) - 1;
            const isDone = currentIdx > idx || step === 'completed';
            const isActive = s.key === step;

            let cardClass = 'bg-body-tertiary border-secondary-subtle opacity-50';
            if (isActive) cardClass = 'bg-primary-subtle border-primary text-primary shadow-sm';
            if (isDone) cardClass = 'bg-success-subtle border-success text-success';

            return (
              <div key={s.key} className="col-6 col-md-3">
                <div className={`p-3 rounded border text-start h-100 ${cardClass}`}>
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <i className={`bi ${isDone ? 'bi-check2-circle' : s.icon} fs-5`}></i>
                    <strong className="small">{s.label}</strong>
                  </div>
                  <div className="small text-secondary" style={{ fontSize: '0.75rem' }}>
                    {s.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
