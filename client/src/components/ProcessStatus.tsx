import React from 'react';
import { AlertCircle } from 'lucide-react';
import { ProcessingStep } from '../types';
import { GlassPanel } from './glass/GlassPanel';
import { DachshundProgressBar } from './DachshundProgressBar';

interface ProcessStatusProps {
  step: ProcessingStep;
  errorMessage?: string;
  totalSegments?: number;
  currentSegmentIndex?: number;
}

export const ProcessStatus: React.FC<ProcessStatusProps> = ({
  step,
  errorMessage,
  totalSegments = 1,
  currentSegmentIndex = 1,
}) => {
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

  let progressPercent = 15;
  let statusText = 'Đang tải video nguồn...';
  let subText = 'Trích xuất luồng video YouTube tốt nhất';

  if (step === 'processing') {
    const fraction = totalSegments > 0 ? (currentSegmentIndex / totalSegments) : 0.5;
    progressPercent = Math.round(35 + fraction * 35);
    statusText = `Đang cắt đoạn ${currentSegmentIndex}/${totalSegments}...`;
    subText = 'Trích xuất chính xác theo mốc thời gian không giật hình';
  } else if (step === 'zipping') {
    progressPercent = 85;
    statusText = 'Đang lưu tệp và đóng gói...';
    subText = 'Ghi trực tiếp vào thư mục lưu trữ trên máy tính';
  } else if (step === 'completed') {
    progressPercent = 100;
    statusText = 'Đã hoàn tất!';
    subText = `Đã xuất thành công ${totalSegments} đoạn video`;
  }

  return (
    <GlassPanel className="p-4 mb-4 animate-fade-in" variant="elevated">
      <DachshundProgressBar
        progress={progressPercent}
        statusText={statusText}
        subText={subText}
      />
    </GlassPanel>
  );
};
