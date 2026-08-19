import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AssessmentRun, Finding } from '../lib/types';

interface AssessmentCompletionViewProps {
  run: AssessmentRun;
  className?: string;
}

export const AssessmentCompletionView: FC<AssessmentCompletionViewProps> = ({
  run,
  className = '',
}) => {
  const navigate = useNavigate();
  const findings: Finding[] = run.findings || [];

  const counts = {
    critical: findings.filter((f) => f.severity === 'critical').length,
    high:     findings.filter((f) => f.severity === 'high').length,
    medium:   findings.filter((f) => f.severity === 'medium').length,
    low:      findings.filter((f) => f.severity === 'low').length,
  };

  const score = run.score ?? (findings.length === 0 ? 100 : Math.max(0, 100 - counts.critical * 25 - counts.high * 10 - counts.medium * 5));

  return (
    <div className={`p-6 rounded-xl bg-white border border-[#111111] shadow-hard space-y-6 slide-up ${className}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#111111] pb-4">
        <div className="space-y-1">
          <div className="protocol-tag">zorqen://validation/complete</div>
          <div className="flex items-center gap-3 pt-1">
            <h2 className="text-2xl font-extrabold text-[#111111] tracking-tight">
              VALIDATION COMPLETE
            </h2>
            <span className="mono text-[11px] font-extrabold text-[#111111] bg-[#C5F82A] px-2.5 py-0.5 rounded border border-[#111111]">
              ✓ SUCCESSFUL SCAN
            </span>
          </div>
          <div className="mono text-[12px] text-[#555555]">
            Repository snapshot <span className="font-bold text-[#111111]">{run.repo}</span> @ <span className="font-bold text-[#111111]">{run.commit?.slice(0, 7) || 'HEAD'}</span> validated cleanly in {run.duration || '42s'}.
          </div>
        </div>

        <button
          onClick={() => navigate('/findings')}
          className="btn btn-accent px-6 py-3 font-extrabold text-[13.5px]"
        >
          VIEW {findings.length} FINDINGS →
        </button>
      </div>

      {/* Posture Score & Threat Surface Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Score Card */}
        <div className="p-5 rounded-lg bg-[#FAFAFA] border border-[#111111] shadow-hard-sm flex flex-col justify-between space-y-2 md:col-span-2">
          <div className="mono text-[10.5px] font-extrabold text-[#555555] uppercase tracking-wider">
            SECURITY POSTURE SCORE
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-extrabold text-[#111111] tracking-tight">
              {score}
            </span>
            <span className="mono text-[14px] font-bold text-[#666666]">/ 100</span>
          </div>
          <div className="mono text-[11px] font-bold text-[#111111] pt-1">
            {score >= 80 ? '● STRONG SECURITY POSTURE' : score >= 60 ? '▲ MODERATE SECURITY POSTURE' : '✕ HIGH RISK SURFACE'}
          </div>
        </div>

        {/* Severity Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:col-span-3">
          <div className="p-4 rounded-lg bg-[#FEE2E2] border border-[#111111] shadow-hard-sm space-y-1">
            <div className="mono text-[10px] font-extrabold text-[#DC2626] uppercase">CRITICAL</div>
            <div className="text-3xl font-extrabold text-[#DC2626]">{counts.critical}</div>
            <div className="text-[10.5px] text-[#DC2626] font-semibold">Immediate Action</div>
          </div>

          <div className="p-4 rounded-lg bg-[#FFEDD5] border border-[#111111] shadow-hard-sm space-y-1">
            <div className="mono text-[10px] font-extrabold text-[#C2410C] uppercase">HIGH</div>
            <div className="text-3xl font-extrabold text-[#C2410C]">{counts.high}</div>
            <div className="text-[10.5px] text-[#C2410C] font-semibold">Remediation Req</div>
          </div>

          <div className="p-4 rounded-lg bg-[#FEF3C7] border border-[#111111] shadow-hard-sm space-y-1">
            <div className="mono text-[10px] font-extrabold text-[#B45309] uppercase">MEDIUM</div>
            <div className="text-3xl font-extrabold text-[#B45309]">{counts.medium}</div>
            <div className="text-[10.5px] text-[#B45309] font-semibold">Audit Queue</div>
          </div>

          <div className="p-4 rounded-lg bg-[#DBEAFE] border border-[#111111] shadow-hard-sm space-y-1">
            <div className="mono text-[10px] font-extrabold text-[#1D4ED8] uppercase">LOW</div>
            <div className="text-3xl font-extrabold text-[#1D4ED8]">{counts.low}</div>
            <div className="text-[10.5px] text-[#1D4ED8] font-semibold">Best Practice</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssessmentCompletionView;
