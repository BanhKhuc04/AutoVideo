import React from 'react';

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'base' | 'elevated' | 'inset';
}

export const GlassPanel: React.FC<GlassPanelProps> = ({
  children,
  className = '',
  variant = 'base',
  style,
  ...props
}) => {
  const variantClass =
    variant === 'inset'
      ? 'panel-inset'
      : variant === 'elevated'
      ? 'panel-elevated'
      : 'panel';

  return (
    <div
      className={`${variantClass} ${className}`}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
};
