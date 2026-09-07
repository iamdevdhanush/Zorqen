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
    <div className={`panel space-y-4 ${className}`}>
      <div className="flex items-center justify-between border-b-2 border-[#111111] pb-3">
        <div className="flex items-center gap-2">
          <span className="mono text-[11px] font-extrabold text-[#0A0A0A] uppercase tracking-[0.18em]">
            VALIDATION PIPELINE STAGES
          </span>
        </div>
        <div className="mono text-[11px] text-[#5E5E5E] font-bold">
          SYSTEM PIPELINE VISUALIZATION
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {steps.map((step, idx) => {
          const isDone = step.status === 'completed';
          const isFailed = step.status === 'failed';
          const isRun = step.status === 'running' || (activeStep && activeStep.id === step.id);
          const isUnavailable = step.status === 'unavailable';

          return (
            <div
              key={step.id || idx}
              className={`p-3.5 rounded-[14px] text-left space-y-2 transition-all relative overflow-hidden ${
                isRun
                  ? 'border-2 border-[#111111] bg-[#C8F31D] shadow-hard-sm'
                  : isDone
                  ? 'border-2 border-[#111111] bg-white shadow-hard-sm'
                  : isFailed
                  ? 'border-2 border-[#111111] bg-[#FEE2E2]'
                  : 'border-2 border-[#111111]/20 bg-[#F7F5F0]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="mono text-[11px] font-extrabold text-[#0A0A0A]">
                  0{idx + 1}
                </span>
                {isDone ? (
                  <span className="mono text-[12px] font-extrabold text-[#0A0A0A]">✓</span>
                ) : isFailed ? (
                  <span className="mono text-[12px] font-extrabold text-[#DC2626]">✕</span>
                ) : isRun ? (
                  <span className="pulse-dot" />
                ) : isUnavailable ? (
                  <span className="mono text-[10px] font-bold text-[#5E5E5E]">—</span>
                ) : (
                  <span className="mono text-[10px] text-[#5E5E5E]">○</span>
                )}
              </div>

              <div>
                <div
                  className={`mono text-[11px] font-extrabold leading-tight ${
                    isRun || isDone ? 'text-[#0A0A0A]' : isFailed ? 'text-[#DC2626]' : 'text-[#5E5E5E]'
                  }`}
                >
                  {step.label.toUpperCase()}
                </div>
                <div
                  className={`mono text-[9.5px] font-extrabold mt-1.5 ${
                    isRun
                      ? 'text-[#0A0A0A] bg-white px-1.5 py-0.5 rounded-[4px] border border-[#111111] inline-block shadow-hard-sm'
                      : isDone
                      ? 'text-[#0A0A0A]'
                      : isFailed
                      ? 'text-[#DC2626]'
                      : 'text-[#5E5E5E]'
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
