import type { FC } from 'react';
import type { StepState } from '../lib/types';

interface PipelineSystemStatusProps {
  steps: StepState[];
  activeStep?: StepState;
  className?: string;
}

export const PipelineSystemStatus: FC<PipelineSystemStatusProps> = ({
  steps = [],
  activeStep,
  className = '',
}) => {
  return (
    <div className={`p-4 sm:p-5 rounded-xl bg-white border border-[#111111] shadow-hard space-y-3 ${className}`}>
      <div className="flex items-center justify-between border-b border-[#111111] pb-2.5">
        <div className="flex items-center gap-2">
          <span className="mono text-[11px] font-extrabold text-[#111111] uppercase tracking-wider">
            VALIDATION PIPELINE STAGES
          </span>
        </div>
        <div className="mono text-[10px] text-[#666666] font-bold">
          SYSTEM PIPELINE VISUALIZATION
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
        {steps.map((step, idx) => {
          const isDone = step.status === 'completed';
          const isFailed = step.status === 'failed';
          const isRun = step.status === 'running' || (activeStep && activeStep.id === step.id);
          const isUnavailable = step.status === 'unavailable';

          return (
            <div
              key={step.id || idx}
              className={`p-3 rounded-lg border text-left space-y-1.5 transition-all relative overflow-hidden ${
                isRun
                  ? 'border-[#111111] bg-[#C5F82A] shadow-hard-sm'
                  : isFailed
                  ? 'border-[#111111] bg-[#FEE2E2]'
                  : isDone
                  ? 'border-[#111111] bg-white'
                  : isUnavailable
                  ? 'border-[#DCDCD5] bg-[#FAFAFA] opacity-60'
                  : 'border-[#DCDCD5] bg-[#FAFAFA]'
              }`}
            >
              {isRun && <div className="animate-scan-line" />}

              <div className="flex items-center justify-between">
                <span className="mono text-[10px] font-extrabold text-[#111111]">
                  0{idx + 1}
                </span>
                {isDone ? (
                  <span className="mono text-[11px] font-extrabold text-[#111111]">✓</span>
                ) : isFailed ? (
                  <span className="mono text-[11px] font-extrabold text-[#DC2626]">✕</span>
                ) : isRun ? (
                  <span className="pulse-dot" />
                ) : isUnavailable ? (
                  <span className="mono text-[9px] font-bold text-[#888888]">—</span>
                ) : (
                  <span className="mono text-[9px] text-[#888888]">○</span>
                )}
              </div>

              <div>
                <div
                  className={`mono text-[10.5px] font-extrabold leading-tight ${
                    isRun || isDone ? 'text-[#111111]' : isFailed ? 'text-[#DC2626]' : 'text-[#4A4A4A]'
                  }`}
                >
                  {step.label.toUpperCase()}
                </div>
                <div
                  className={`mono text-[9px] font-extrabold mt-1 ${
                    isRun
                      ? 'text-[#111111] bg-white px-1 py-0.5 rounded border border-[#111111] inline-block'
                      : isDone
                      ? 'text-[#111111]'
                      : isFailed
                      ? 'text-[#DC2626]'
                      : 'text-[#666666]'
                  }`}
                >
                  {isDone
                    ? '✓ COMPLETE'
                    : isFailed
                    ? '✕ FAILED'
                    : isRun
                    ? '● ACTIVE'
                    : isUnavailable
                    ? '— UNAVAILABLE'
                    : '○ QUEUED'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PipelineSystemStatus;
