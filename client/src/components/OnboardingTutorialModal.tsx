import React, { useState } from 'react';

interface OnboardingTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TutorialStep {
  stepNumber: number;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  badgeColor: string;
  tip: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    stepNumber: 1,
    title: 'Bước 1: Dán link YouTube',
    subtitle: 'Nhập liên kết video bạn muốn lấy cảnh',
    description: 'Chỉ cần copy đường link video từ YouTube (hỗ trợ cả video dài, Shorts và link có sẵn mốc giờ) rồi dán vào ô nhập liệu.',
    icon: 'bi-youtube text-danger',
    badgeColor: 'bg-danger',
    tip: 'Mẹo: Bạn có thể bấm nút "Dán link nhanh" để dán ngay liên kết từ bộ nhớ tạm.',
  },
  {
    stepNumber: 2,
    title: 'Bước 2: Chọn các đoạn video cần cắt',
    subtitle: 'Sử dụng thanh thời gian hoặc nhập mốc giờ',
    description: 'Kéo thanh thước thời gian đến cảnh bạn muốn lấy và bấm "Đặt mốc bắt đầu / kết thúc" hoặc tự gõ mốc giờ (ví dụ: 00:04:34).',
    icon: 'bi-scissors text-primary',
    badgeColor: 'bg-primary',
    tip: 'Mẹo: Bấm nút "+ Thêm đoạn 30s tại đây" để tạo nhanh một đoạn ngắn 30 giây ngay tại vị trí đang xem.',
  },
  {
    stepNumber: 3,
    title: 'Bước 3: Đặt tên & Chọn thư mục lưu trên máy',
    subtitle: 'Tự động đồng bộ với Google Drive Desktop',
    description: 'Đặt tên gợi nhớ cho đoạn video và chọn thư mục lưu trữ trên máy tính (ví dụ: C:\\Users\\...\\Google Drive\\Video Assets) để Google Drive Desktop tự động đồng bộ.',
    icon: 'bi-folder2-open text-warning',
    badgeColor: 'bg-warning text-dark',
    tip: 'Mẹo: Tên file sẽ được tự động đánh số thứ tự chuẩn (ví dụ: The_Boy_Who_Learned_001.mp4).',
  },
  {
    stepNumber: 4,
    title: 'Bước 4: Xuất video (MP4 hoặc ZIP)',
    subtitle: 'Nhận ngay các đoạn video 720p HD sắc nét',
    description: 'Bấm nút "Bắt đầu xử lý video". Sau khi hoàn tất, bạn có thể tải trực tiếp từng file MP4 (không cần giải nén ZIP) hoặc tải trọn bộ file ZIP.',
    icon: 'bi-check-circle-fill text-success',
    badgeColor: 'bg-success',
    tip: 'Mẹo: Nếu YouTube hạn chế tải trực tiếp, ứng dụng có sẵn chế độ "Ghi hình tab trình duyệt" dự phòng 100%.',
  },
];

export const OnboardingTutorialModal: React.FC<OnboardingTutorialModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  if (!isOpen) return null;

  const currentStep = TUTORIAL_STEPS[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === TUTORIAL_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('has_seen_tutorial', 'true');
    onClose();
  };

  return (
    <div
      className="modal show d-block"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1070 }}
      tabIndex={-1}
      role="dialog"
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content bg-dark text-light border-secondary shadow-lg">
          {/* Header */}
          <div className="modal-header border-secondary-subtle py-3 px-4">
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-primary px-3 py-2 rounded-pill font-monospace">
                Hướng Dẫn Nhanh
              </span>
              <h5 className="modal-title fw-bold mb-0 text-white">
                4 Bước Sử Dụng YouTube Clip Studio Pro
              </h5>
            </div>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={handleComplete}
              aria-label="Đóng"
            ></button>
          </div>

          {/* Body */}
          <div className="modal-body p-4">
            {/* Step Indicators */}
            <div className="d-flex justify-content-between align-items-center mb-4 gap-1">
              {TUTORIAL_STEPS.map((step, idx) => {
                const isActive = idx === currentStepIndex;
                const isPassed = idx < currentStepIndex;
                return (
                  <button
                    key={step.stepNumber}
                    type="button"
                    className={`btn btn-sm flex-grow-1 d-flex align-items-center justify-content-center gap-1 ${
                      isActive
                        ? 'btn-primary fw-bold shadow'
                        : isPassed
                        ? 'btn-outline-success'
                        : 'btn-outline-secondary opacity-50'
                    }`}
                    onClick={() => setCurrentStepIndex(idx)}
                    style={{ fontSize: '0.85rem', padding: '6px 4px' }}
                  >
                    <span>Bước {step.stepNumber}</span>
                    {isPassed && <i className="bi bi-check" style={{ fontSize: '1rem' }}></i>}
                  </button>
                );
              })}
            </div>

            {/* Step Content Card */}
            <div className="p-4 bg-body-tertiary rounded-3 border border-secondary-subtle text-center mb-3">
              <div className="mb-3">
                <i className={`bi ${currentStep.icon}`} style={{ fontSize: '3.5rem' }}></i>
              </div>

              <div className="mb-2">
                <span className={`badge ${currentStep.badgeColor} px-3 py-1 rounded-pill mb-2`}>
                  Bước {currentStep.stepNumber} / 4
                </span>
                <h4 className="fw-bold text-white mb-1">{currentStep.title}</h4>
                <p className="text-info small mb-3">{currentStep.subtitle}</p>
              </div>

              <p className="text-secondary mb-4 mx-auto" style={{ maxWidth: '580px', lineHeight: '1.6' }}>
                {currentStep.description}
              </p>

              <div className="alert alert-dark border-secondary-subtle py-2 px-3 d-inline-flex align-items-center gap-2 text-start small text-light">
                <i className="bi bi-lightbulb-fill text-warning flex-shrink-0"></i>
                <span>{currentStep.tip}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer border-secondary-subtle py-3 px-4 d-flex justify-content-between">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={handleComplete}
            >
              Bỏ qua hướng dẫn
            </button>

            <div className="d-flex gap-2">
              {!isFirstStep && (
                <button
                  type="button"
                  className="btn btn-outline-light px-3"
                  onClick={handlePrev}
                >
                  &larr; Bước trước
                </button>
              )}

              <button
                type="button"
                className="btn btn-primary px-4 fw-bold shadow d-flex align-items-center gap-2"
                onClick={handleNext}
              >
                <span>{isLastStep ? 'Bắt đầu sử dụng ngay 🚀' : 'Tiếp theo &rarr;'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
