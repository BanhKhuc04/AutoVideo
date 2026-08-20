import React from 'react';

interface GlassProgressProps {
  percent: number;
  height?: number;
  className?: string;
  glow?: boolean;
}

export const GlassProgress: React.FC<GlassProgressProps> = ({
  percent,
  height = 6,
  className = '',
  glow = true,
}) => {
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div
      className={`rounded-pill overflow-hidden ${className}`}
      style={{
        height: `${height}px`,
        background: 'rgba(255, 255, 255, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.4)',
      }}
    >
      <div
        className="h-100 rounded-pill"
        style={{
          width: `${clamped}%`,
          background: 'linear-gradient(90deg, #0A84FF 0%, #64D2FF 100%)',
          transition: 'width 300ms cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: glow ? '0 0 14px rgba(10, 132, 255, 0.5)' : undefined,
        }}
      />
    </div>
  );
};
