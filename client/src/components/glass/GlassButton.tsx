import React from 'react';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'icon' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  children,
  variant = 'default',
  size = 'md',
  fullWidth = false,
  className = '',
  style,
  ...props
}) => {
  const classes = [
    'btn',
    variant === 'primary' && 'btn-primary',
    variant === 'icon' && 'btn-icon',
    variant === 'danger' && 'btn-danger',
    size === 'sm' && 'btn-sm',
    size === 'lg' && 'btn-lg',
    fullWidth && 'btn-full',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classes}
      style={style}
      {...props}
    >
      {children}
    </button>
  );
};
