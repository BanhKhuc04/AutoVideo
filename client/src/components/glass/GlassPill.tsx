import React from 'react';

interface GlassPillProps {
  children: React.ReactNode;
  variant?: 'default' | 'accent' | 'success' | 'danger';
  className?: string;
  style?: React.CSSProperties;
}

export const GlassPill: React.FC<GlassPillProps> = ({
  children,
  variant = 'default',
  className = '',
  style,
}) => {
  const variantClass =
    variant === 'accent'
      ? 'badge-accent'
      : variant === 'success'
      ? 'badge-success'
      : variant === 'danger'
      ? 'badge-danger'
      : '';

  return (
    <span className={`badge ${variantClass} ${className}`} style={style}>
      {children}
    </span>
  );
};
