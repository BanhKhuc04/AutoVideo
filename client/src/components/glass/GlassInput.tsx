import React from 'react';

interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  isInvalid?: boolean;
}

export const GlassInput: React.FC<GlassInputProps> = ({
  className = '',
  isInvalid = false,
  style,
  ...props
}) => {
  return (
    <input
      className={`glass-input ${isInvalid ? 'border-danger' : ''} ${className}`}
      style={{
        borderColor: isInvalid ? 'var(--color-danger)' : undefined,
        ...style,
      }}
      {...props}
    />
  );
};
