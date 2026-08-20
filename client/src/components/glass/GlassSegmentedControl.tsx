import React from 'react';

export interface SegmentOption<T extends string = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

interface GlassSegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function GlassSegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  className = '',
  size = 'md',
}: GlassSegmentedControlProps<T>) {
  return (
    <div className={`segmented-control ${className}`}>
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            className={`segment-item ${isActive ? 'segment-active' : ''}`}
            style={size === 'sm' ? { padding: '3px 10px', fontSize: '12px' } : undefined}
            onClick={() => onChange(opt.value)}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
