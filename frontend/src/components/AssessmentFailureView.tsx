import type { FC } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface AssessmentFailureViewProps {
  errorMessage?: string;
  errorCode?: string;
  onRetry?: () => void;
  className?: string;
}

export const AssessmentFailureView: FC<AssessmentFailureViewProps> = ({
  errorMessage = 'Backend assessment service is unavailable. Please retry.',
  errorCode,
  onRetry,
  className = '',
}) => {
  return (
    <div className={`p-6 rounded-xl bg-[#FEE2E2] border border-[#111111] shadow-hard space-y-5 slide-up ${className}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#111111]/30 pb-4">
        <div className="space-y-1">
          <div className="mono text-[10.5px] font-extrabold text-[#DC2626] bg-white px-2 py-0.5 rounded border border-[#111111] inline-block">
            zorqen://validation/error
          </div>
          <div className="flex items-center gap-3 pt-1">
            <AlertTriangle className="w-6 h-6 text-[#DC2626] shrink-0" />
            <h2 className="text-2xl font-extrabold text-[#DC2626] tracking-tight">
              VALIDATION FAILED — ASSESSMENT COULD NOT START
            </h2>
          </div>
          <p className="text-[12.5px] text-[#7F1D1D] font-medium">
            The security operation encountered an error and scanning has been halted.
          </p>
        </div>

        {onRetry && (
          <button
            onClick={onRetry}
            className="btn btn-primary px-5 py-2.5 text-[13px] bg-[#111111] text-white hover:bg-[#222222]"
          >
            <RefreshCw className="w-4 h-4" />
            RETRY VALIDATION
          </button>
        )}
      </div>

      {/* Error Detail Instrument Box */}
      <div className="p-4 rounded-lg bg-white border border-[#111111] shadow-hard-sm space-y-2">
        <div className="mono text-[10px] font-extrabold text-[#555555] uppercase tracking-wider">
          DIAGNOSTIC BACKEND ERROR DETAIL
        </div>
        {errorCode && (
          <div className="inline-block mono text-[10.5px] font-extrabold text-[#111111] bg-[#C5F82A] px-2 py-0.5 rounded border border-[#111111]">
            {errorCode}
          </div>
        )}
        <div className="mono text-[12.5px] font-bold text-[#DC2626] bg-[#FAFAFA] p-3 rounded border border-[#111111] break-all">
          {errorMessage}
        </div>
        <div className="mono text-[10.5px] text-[#666666] pt-1">
          Live scanning animations and background polling have been terminated cleanly.
        </div>
      </div>
    </div>
  );
};

export default AssessmentFailureView;
