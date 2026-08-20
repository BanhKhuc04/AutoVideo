import React, { useRef } from 'react';

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'base' | 'elevated' | 'floating';
  specular?: boolean;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({
  children,
  className = '',
  variant = 'base',
  specular = true,
  style,
  onMouseMove,
  ...props
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (specular && panelRef.current) {
      const rect = panelRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      panelRef.current.style.setProperty('--mouse-x', `${x}px`);
      panelRef.current.style.setProperty('--mouse-y', `${y}px`);
    }
    onMouseMove?.(e);
  };

  const variantClass =
    variant === 'floating'
      ? 'liquid-glass-floating'
      : variant === 'elevated'
      ? 'liquid-glass-card'
      : 'liquid-glass-panel';

  return (
    <div
      ref={panelRef}
      className={`${variantClass} ${specular ? 'specular-container' : ''} ${className}`}
      style={style}
      onMouseMove={handleMouseMove}
      {...props}
    >
      {children}
    </div>
  );
};
