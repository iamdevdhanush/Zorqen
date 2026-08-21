import { memo } from 'react';
import { Check, Loader2, ShieldCheck, Circle, Clock } from 'lucide-react';
import type { AssessmentRun } from '../lib/types';
import { getAssessmentStateMachine } from '../lib/assessmentState';

interface AssessmentStateCardProps {
  run?: AssessmentRun | null;
  className?: string;
  compact?: boolean;
}

export const AssessmentStateCard = memo(function AssessmentStateCard({
  run,
  className = '',
  compact = false,
}: AssessmentStateCardProps) {
  const stateMachine = getAssessmentStateMachine(run);
  const { isRunning, isCompleted, overallProgress, stages } = stateMachine;

  const score = run?.score ?? 92;
  const ratingText = score >= 85 ? 'Excellent' : score >= 70 ? 'Moderate Risk' : 'High Risk';
  const lastScannedText = run?.startedAt || '2 minutes ago';

  return (
    <div className={`p-4 sm:p-5 bg-white border-2 border-[#111111] rounded-[16px] shadow-hard-sm space-y-4 ${className}`}>
      {/* Card Header & Security Rating Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#111111]/15 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-[#111111] text-[#C8FF2E] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-[#C8FF2E]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="mono text-[13px] font-extrabold text-[#0A0A0A] uppercase tracking-[0.1em]">
                Security Posture
              </span>
              <span className="mono text-[14px] font-extrabold text-[#0A0A0A] tabular-nums">
                {score}<span className="text-[11px] text-[#6B6B6B]">/100</span>
              </span>
              <span className={`chip text-[10px] uppercase font-extrabold ${score >= 85 ? 'ok' : 'warn'}`}>
                {ratingText}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11.5px] text-[#6B6B6B] font-medium pt-0.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Last scanned {lastScannedText}</span>
            </div>
          </div>
        </div>

        <div>
          {isCompleted ? (
            <span className="mono text-[10px] font-extrabold text-[#111111] bg-[#C8FF2E] px-2.5 py-1 rounded-[6px] border border-[#111111]">
              ✓ VERIFIED
            </span>
          ) : isRunning ? (
            <span className="mono text-[10px] font-extrabold text-[#111111] bg-[#C8FF2E] px-2.5 py-1 rounded-[6px] border border-[#111111] animate-pulse flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#111111]" />
              SCANNING
            </span>
          ) : (
            <span className="mono text-[10px] font-extrabold text-[#5E5E5E] bg-[#FAFAFA] px-2.5 py-1 rounded-[6px] border border-[#111111]/20">
              READY TO SCAN
            </span>
          )}
        </div>
      </div>

      {/* Stage Items Checklist */}
      <div className="space-y-2">
        {stages.map((stage) => {
          const isDone = stage.status === 'completed';
          const isRun = stage.status === 'running';

          return (
            <div
              key={stage.id}
              className={`flex items-center justify-between px-3 py-2 rounded-[10px] border transition-all ${
                isRun
                  ? 'bg-[#C8FF2E]/15 border-[#111111] font-bold text-[#0A0A0A]'
                  : isDone
                  ? 'bg-[#FAFAFA] border-[#111111]/15 text-[#0A0A0A]'
                  : 'bg-white border-[#111111]/10 text-[#6B6B6B]'
              }`}
            >
              <span className={`text-[13px] ${isRun ? 'font-extrabold text-[#0A0A0A]' : 'font-semibold'}`}>
                {stage.label}
              </span>

              <div className="mono text-[11px] font-extrabold flex items-center gap-1.5 tabular-nums">
                {isDone ? (
                  <span className="flex items-center gap-1 text-[#0A0A0A] font-bold">
                    <Check className="w-4 h-4 text-[#111111] stroke-[3]" />
                    {!compact && <span className="sr-only">Done</span>}
                  </span>
                ) : isRun ? (
                  <span className="flex items-center gap-1.5 text-[#111111] bg-[#C8FF2E] px-2 py-0.5 rounded border border-[#111111]">
                    <Loader2 className="w-3 h-3 animate-spin text-[#111111]" />
                    <span>Running</span>
                  </span>
                ) : (
                  <span className="text-[#6B6B6B]/60">
                    <Circle className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress Bar & Status Footer */}
      <div className="pt-2 border-t border-[#111111]/10 space-y-2">
        <div className="flex items-center justify-between mono text-[12px] font-extrabold text-[#0A0A0A]">
          <span>Pipeline Completion</span>
          <span className="text-[#0A0A0A] bg-[#FAFAFA] px-2 py-0.5 rounded border border-[#111111]/20 tabular-nums">
            {overallProgress}% Complete
          </span>
        </div>

        <div className="h-2.5 bg-[#FAFAFA] border border-[#111111]/30 rounded-[4px] overflow-hidden p-0.5">
          <div
            className="h-full bg-[#C8FF2E] rounded-[2px] border border-[#111111] transition-all duration-500"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
});

export default AssessmentStateCard;
