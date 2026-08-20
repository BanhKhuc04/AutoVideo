import React from 'react';

interface GlassPillProps {
  children: React.ReactNode;
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'danger';
  className?: string;
  style?: React.CSSProperties;
}

export const GlassPill: React.FC<GlassPillProps> = ({
  children,
  variant = 'default',
  className = '',
  style,
}) => {
  let bg = 'rgba(255, 255, 255, 0.08)';
  let border = 'rgba(255, 255, 255, 0.1)';
  let color = 'var(--text-secondary)';

  if (variant === 'accent') {
    bg = 'var(--accent-blue-translucent)';
    border = 'rgba(10, 132, 255, 0.35)';
    color = 'var(--accent-blue)';
  } else if (variant === 'success') {
    bg = 'var(--color-success-translucent)';
    border = 'rgba(48, 209, 88, 0.35)';
    color = 'var(--color-success)';
  } else if (variant === 'warning') {
    bg = 'var(--color-warning-translucent)';
    border = 'rgba(255, 214, 10, 0.35)';
    color = 'var(--color-warning)';
  } else if (variant === 'danger') {
    bg = 'var(--color-danger-translucent)';
    border = 'rgba(255, 69, 58, 0.35)';
    color = 'var(--color-danger)';
  }

  return (
    <span
      className={`d-inline-flex align-items-center gap-1 font-monospace ${className}`}
      style={{
        padding: '2px 8px',
        borderRadius: 'var(--radius-pill)',
        fontSize: '0.72rem',
        fontWeight: 500,
        background: bg,
        border: `1px solid ${border}`,
        color,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        ...style,
      }}
    >
      {children}
    </span>
  );
};
