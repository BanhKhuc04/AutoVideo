import React from 'react';
import { MorphIcon } from 'morphicons/react';
import { IconNode } from 'lucide';

interface MorphIconWrapperProps {
  icon: IconNode;
  size?: number | string;
  color?: string;
  strokeWidth?: number | string;
  spring?: 'smooth' | 'snappy' | 'bouncy';
  className?: string;
  style?: React.CSSProperties;
}

export const MorphIconWrapper: React.FC<MorphIconWrapperProps> = ({
  icon,
  size = 18,
  color = 'currentColor',
  strokeWidth = 2,
  spring = 'smooth',
  className,
  style,
}) => {
  return (
    <MorphIcon
      icon={icon}
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      spring={spring}
      reducedMotion="user"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
    />
  );
};
