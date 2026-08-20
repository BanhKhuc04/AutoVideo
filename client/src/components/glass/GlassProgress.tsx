import React from 'react';

interface GlassProgressProps {
  percent: number;
  height?: number;
  className?: string;
}

export const GlassProgress: React.FC<GlassProgressProps> = ({
  percent,
  height = 4,
  className = '',
}) => {
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div className={`progress-track ${className}`} style={{ height: `${height}px` }}>
      <div
        className="progress-fill"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
};
