import React from 'react';
import { AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { ProcessingStep } from '../types';

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
      <div
        className="ui-card animate-fade-in"
        style={{
          border: '1px solid rgba(255, 69, 58, 0.3)',
          background: 'rgba(255, 69, 58, 0.08)',
          padding: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <AlertCircle size={20} style={{ color: 'var(--color-danger)', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontWeight: 600, color: 'var(--color-danger)', fontSize: '14px', marginBottom: '4px' }}>
              Xử lý video chưa thành công
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
              {errorMessage || 'Đã xảy ra lỗi trong quá trình xử lý video. Vui lòng kiểm tra lại liên kết hoặc dung lượng bộ nhớ.'}
            </p>
          </div>
        </div>
      </div>
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
    <div className="ui-card animate-fade-in" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {step === 'completed' ? (
            <CheckCircle2 size={18} style={{ color: 'var(--color-success)' }} />
          ) : (
            <Loader2 size={18} className="animate-spin" style={{ color: 'var(--accent)' }} />
          )}
          <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
            {statusText}
          </span>
        </div>
        <span className="font-monospace" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent)' }}>
          {progressPercent}%
        </span>
      </div>

      {/* Clean Native Progress Bar */}
      <div
        style={{
          width: '100%',
          height: '6px',
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '999px',
          overflow: 'hidden',
          marginBottom: '8px',
        }}
      >
        <div
          style={{
            width: `${progressPercent}%`,
            height: '100%',
            background: 'var(--accent)',
            borderRadius: '999px',
            transition: 'width 300ms cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: '0 0 10px rgba(10, 132, 255, 0.5)',
          }}
        />
      </div>

      {subText && (
        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
          {subText}
        </div>
      )}
    </div>
  );
};
