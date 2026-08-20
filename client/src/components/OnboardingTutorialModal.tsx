import React, { useState } from 'react';
import { Scissors, Folder, CheckCircle, X, ArrowRight, ArrowLeft } from 'lucide-react';

interface OnboardingTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface StepItem {
  step: number;
  title: string;
  desc: string;
  icon: React.ReactNode;
}

const YouTubeIcon = () => (
  <svg width={36} height={36} viewBox="0 0 24 24" fill="#FF3B30">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const STEPS: StepItem[] = [
  {
    step: 1,
    title: 'Dán liên kết YouTube',
    desc: 'Sao chép đường link video hoặc YouTube Shorts và dán vào ô nhập liệu.',
    icon: <YouTubeIcon />,
  },
  {
    step: 2,
    title: 'Thêm các đoạn cần lấy',
    desc: 'Chọn mốc bắt đầu - kết thúc trên thanh thước thời gian hoặc tự gõ mốc giờ.',
    icon: <Scissors size={36} color="#0A84FF" strokeWidth={1.8} />,
  },
  {
    step: 3,
    title: 'Chọn nơi lưu trữ',
    desc: 'Chọn thư mục trên máy tính (hoặc thư mục Google Drive Desktop để tự đồng bộ).',
    icon: <Folder size={36} color="#FF9F0A" strokeWidth={1.8} />,
  },
  {
    step: 4,
    title: 'Nhấn "Xuất video"',
    desc: 'Hệ thống tự động cắt và lưu từng tệp video MP4 720p sắc nét vào máy.',
    icon: <CheckCircle size={36} color="#30D158" strokeWidth={1.8} />,
  },
];

export const OnboardingTutorialModal: React.FC<OnboardingTutorialModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);

  if (!isOpen) return null;

  const isLast = currentStep === STEPS.length - 1;
  const isFirst = currentStep === 0;

  const handleComplete = () => {
    localStorage.setItem('has_seen_tutorial', 'true');
    onClose();
  };

  const current = STEPS[currentStep];

  return (
    <div
      className="modal show d-block apple-modal-backdrop"
      style={{ zIndex: 1070 }}
      tabIndex={-1}
      role="dialog"
      onClick={handleComplete}
    >
      <div
        className="modal-dialog modal-dialog-centered"
        style={{ maxWidth: '480px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="apple-modal-content p-4 text-light text-center">
          {/* Close button */}
          <div className="d-flex justify-content-end mb-2">
            <button
              type="button"
              className="apple-btn-icon"
              onClick={handleComplete}
              aria-label="Đóng"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          {/* Icon Circle */}
          <div
            className="mx-auto d-flex align-items-center justify-content-center mb-4"
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '24px',
              background: 'var(--bg-surface-2)',
              border: '1px solid var(--border-subtle)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            }}
          >
            {current.icon}
          </div>

          {/* Step Pill */}
          <div className="mb-2">
            <span className="apple-pill font-monospace" style={{ fontSize: '0.72rem' }}>
              Bước {current.step} / {STEPS.length}
            </span>
          </div>

          {/* Title & Desc */}
          <h4 className="fw-semibold text-white mb-2" style={{ fontSize: '1.2rem', letterSpacing: '-0.01em' }}>
            {current.title}
          </h4>
          <p className="mb-4 mx-auto" style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', maxWidth: '340px', lineHeight: '1.5' }}>
            {current.desc}
          </p>

          {/* Dots Indicator */}
          <div className="d-flex justify-content-center gap-1.5 mb-4">
            {STEPS.map((_, idx) => (
              <div
                key={idx}
                style={{
                  width: idx === currentStep ? '20px' : '6px',
                  height: '6px',
                  borderRadius: '3px',
                  background: idx === currentStep ? 'var(--accent-apple)' : 'var(--bg-surface-3)',
                  transition: 'all 200ms ease',
                }}
              ></div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="d-flex align-items-center justify-content-between pt-2">
            <button
              type="button"
              className="apple-btn-secondary"
              style={{ fontSize: '0.8rem', visibility: isFirst ? 'hidden' : 'visible' }}
              onClick={() => setCurrentStep((prev) => prev - 1)}
            >
              <ArrowLeft size={14} />
              <span>Quay lại</span>
            </button>

            <button
              type="button"
              className="apple-btn-primary"
              style={{ fontSize: '0.84rem', padding: '8px 20px' }}
              onClick={() => {
                if (isLast) {
                  handleComplete();
                } else {
                  setCurrentStep((prev) => prev + 1);
                }
              }}
            >
              <span>{isLast ? 'Bắt đầu sử dụng' : 'Tiếp theo'}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
