import React from 'react';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'icon' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  style,
  ...props
}) => {
  let variantClass = 'glass-btn';
  if (variant === 'primary') variantClass += ' glass-btn-primary';
  if (variant === 'icon') variantClass += ' glass-btn-icon';

  const sizeStyle: React.CSSProperties =
    size === 'sm'
      ? { padding: '5px 11px', fontSize: '0.78rem' }
      : size === 'lg'
      ? { padding: '12px 24px', fontSize: '0.96rem', borderRadius: '14px' }
      : {};

  return (
    <button
      type="button"
      className={`${variantClass} ${className}`}
      style={{ ...sizeStyle, ...style }}
      {...props}
    >
      {children}
    </button>
  );
};
