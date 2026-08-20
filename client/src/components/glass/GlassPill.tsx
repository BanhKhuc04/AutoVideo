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
      ? 'ui-pill-accent'
      : variant === 'success'
      ? 'ui-pill-success'
      : '';

  return (
    <span className={`ui-pill ${variantClass} font-monospace ${className}`} style={style}>
      {children}
    </span>
  );
};
