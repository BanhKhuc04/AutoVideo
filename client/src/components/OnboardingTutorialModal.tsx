import React, { useState, useEffect, useCallback } from 'react';
import { X, ArrowRight, ArrowLeft, Scissors, Folder, CheckCircle } from 'lucide-react';

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
  <svg width={24} height={24} viewBox="0 0 24 24" fill="#FF0000">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const STEPS: StepItem[] = [
  {
    step: 1,
    title: 'Dán link YouTube',
    desc: 'Sao chép đường link video và dán vào ô nhập liệu.',
    icon: <YouTubeIcon />,
  },
  {
    step: 2,
    title: 'Chọn thời gian muốn cắt',
    desc: 'Chọn mốc bắt đầu và kết thúc trên timeline hoặc nhập mốc giờ.',
    icon: <Scissors size={24} color="var(--accent)" strokeWidth={1.8} />,
  },
  {
    step: 3,
    title: 'Thêm các đoạn cần lấy',
    desc: 'Thêm nhiều đoạn cắt để trích xuất cùng lúc.',
    icon: <Folder size={24} color="#F59E0B" strokeWidth={1.8} />,
  },
  {
    step: 4,
    title: 'Chọn thư mục và xuất video',
    desc: 'Chọn nơi lưu và nhấn xuất. Video MP4 sẽ được lưu vào máy.',
    icon: <CheckCircle size={24} color="var(--success)" strokeWidth={1.8} />,
  },
];

export const OnboardingTutorialModal: React.FC<OnboardingTutorialModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);

  const handleComplete = useCallback(() => {
    localStorage.setItem('has_seen_tutorial', 'true');
    setCurrentStep(0);
    onClose();
  }, [onClose]);

  // Keyboard handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleComplete();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        if (currentStep === STEPS.length - 1) {
          handleComplete();
        } else {
          setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentStep((prev) => Math.max(prev - 1, 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep, handleComplete]);

  // Reset step on open
  useEffect(() => {
    if (isOpen) setCurrentStep(0);
  }, [isOpen]);

  if (!isOpen) return null;

  const current = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;
  const isFirst = currentStep === 0;

  return (
    <div
      className="modal-backdrop"
      onClick={handleComplete}
      role="dialog"
      aria-modal="true"
      aria-label="Hướng dẫn sử dụng"
    >
      <div
        className="modal-sheet animate-fade-in"
        style={{ width: '420px', maxWidth: '90vw' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 16px 0' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Bắt đầu nhanh
          </span>
          <button
            type="button"
            className="btn-icon"
            onClick={handleComplete}
            aria-label="Đóng"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px 24px 16px', textAlign: 'center' }}>
          {/* Icon */}
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: 'var(--radius-lg)',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            {current.icon}
          </div>

          {/* Step Indicator */}
          <div style={{ marginBottom: '8px' }}>
            <span className="badge badge-accent" style={{ fontSize: '11px' }}>
              Bước {current.step} / {STEPS.length}
            </span>
          </div>

          {/* Title & Desc */}
          <h4 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
            {current.title}
          </h4>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '300px', margin: '0 auto', lineHeight: 1.5 }}>
            {current.desc}
          </p>
        </div>

        {/* Dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: '0 24px 16px' }}>
          {STEPS.map((_, idx) => (
            <div
              key={idx}
              style={{
                width: idx === currentStep ? '16px' : '4px',
                height: '4px',
                borderRadius: '2px',
                background: idx === currentStep ? 'var(--accent)' : 'rgba(255, 255, 255, 0.12)',
                transition: 'all 200ms ease',
              }}
            />
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <button
            type="button"
            className="btn btn-sm"
            style={{ visibility: isFirst ? 'hidden' : 'visible' }}
            onClick={() => setCurrentStep((prev) => prev - 1)}
          >
            <ArrowLeft size={12} />
            <span>Quay lại</span>
          </button>

          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => {
              if (isLast) {
                handleComplete();
              } else {
                setCurrentStep((prev) => prev + 1);
              }
            }}
          >
            <span>{isLast ? 'Tôi đã hiểu' : 'Tiếp theo'}</span>
            {!isLast && <ArrowRight size={12} />}
          </button>
        </div>
      </div>
    </div>
  );
};
