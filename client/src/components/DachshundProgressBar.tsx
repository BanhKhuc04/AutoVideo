import React, { useEffect, useState } from 'react';
import { useRive, useStateMachineInput, Layout, Fit, Alignment } from '@rive-app/react-canvas';
import { GlassProgress } from './glass/GlassProgress';

interface DachshundProgressBarProps {
  progress: number; // 0 to 100
  statusText?: string;
  subText?: string;
}

export const DachshundProgressBar: React.FC<DachshundProgressBarProps> = ({
  progress,
  statusText = 'Đang xử lý...',
  subText,
}) => {
  const [hasRiveError, setHasRiveError] = useState(false);
  const clamped = Math.max(0, Math.min(100, Math.round(progress)));

  const { rive, RiveComponent } = useRive({
    src: './dachshund-progress-bar.riv',
    stateMachines: 'State Machine 1',
    artboard: 'Artboard',
    autoplay: true,
    layout: new Layout({
      fit: Fit.Contain,
      alignment: Alignment.Center,
    }),
    onLoadError: () => {
      console.warn('Could not load Rive file, falling back to glass progress bar');
      setHasRiveError(true);
    },
  });

  const numberInput = useStateMachineInput(rive, 'State Machine 1', 'Number');
  const dogNumberInput = useStateMachineInput(rive, 'State Machine 1', 'DogNumber');

  useEffect(() => {
    if (numberInput) {
      numberInput.value = clamped;
    }
    if (dogNumberInput) {
      dogNumberInput.value = clamped;
    }
  }, [numberInput, dogNumberInput, clamped]);

  return (
    <div className="d-flex flex-column align-items-center justify-content-center w-100 py-2">
      {/* Rive Dachshund Canvas */}
      {!hasRiveError ? (
        <div
          className="w-100 position-relative rounded-3 overflow-hidden d-flex align-items-center justify-content-center"
          style={{ height: '170px', maxWidth: '420px', background: 'transparent' }}
        >
          <RiveComponent className="w-100 h-100" />
        </div>
      ) : (
        <div className="w-100 my-3" style={{ maxWidth: '420px' }}>
          <GlassProgress percent={clamped} height={8} />
        </div>
      )}

      {/* Status Typography */}
      <div className="text-center mt-2">
        <div className="fw-semibold text-white d-flex align-items-center justify-content-center gap-2" style={{ fontSize: '0.94rem' }}>
          <span>{statusText}</span>
          <span className="font-monospace text-primary" style={{ color: 'var(--accent-blue)', fontSize: '0.88rem' }}>
            {clamped}%
          </span>
        </div>
        {subText && (
          <div className="small mt-1" style={{ color: 'var(--text-tertiary)', fontSize: '0.78rem' }}>
            {subText}
          </div>
        )}
      </div>

      {/* Attribution */}
      <div className="mt-2 text-center" style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
        Animation: <a href="https://rive.app/marketplace/27816-52571-a-dachshund-progress-bar/" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>A dachshund progress bar by fredsalaun</a> (CC BY)
      </div>
    </div>
  );
};
