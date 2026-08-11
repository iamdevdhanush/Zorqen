import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, GitBranch, ShieldCheck, XCircle } from 'lucide-react';
import { SevBadge, StatusBadge } from '../components/ui';
import DiffPane from '../components/DiffPane';
import { useFinding, useWorkspace } from '../store/WorkspaceContext';

export default function RemediationPage() {
  const { id } = useParams();
  const finding = useFinding(id);
  const { currentRepo, markFinding } = useWorkspace();
  const navigate = useNavigate();

  const [branchCreated, setBranchCreated] = useState(false);
  const [applied, setApplied] = useState(false);
  const [rejected, setRejected] = useState(false);

  if (!finding) {
    return (
      <div className="max-w-[800px] mx-auto py-16 text-center space-y-4">
        <div className="mono text-[12px] text-[var(--color-ink-3)]">Finding &lsquo;#{id}&lsquo; not found.</div>
        <button onClick={() => navigate('/findings')} className="btn btn-primary btn-sm">← Back to Findings</button>
      </div>
    );
  }

  const rem = finding.remediation;

  if (!rem) {
    return (
      <div className="max-w-[800px] mx-auto py-16 text-center space-y-4">
        <div className="mono text-[12px] text-[var(--color-ink-3)]">No patch proposal available for this finding.</div>
        <button onClick={() => navigate(`/findings/${finding.id}`)} className="btn btn-primary btn-sm">← Back to Finding</button>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 fade-in py-2">
      
      {/* Navigation & Protocol Tag */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(`/findings/${finding.id}`)}
          className="btn btn-ghost btn-sm text-[12px] font-semibold text-[var(--color-ink-2)]"
        >
          <ArrowLeft className="w-4 h-4" />
          ← FINDING INVESTIGATION
        </button>

        <div className="protocol-tag">raksha://remediation/proposal</div>
      </div>

      {/* Header Banner */}
      <div className="p-6 rounded-xl bg-white border border-[var(--color-line)] shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <SevBadge sev={finding.severity} />
            <h1 className="text-2xl font-extrabold text-[var(--color-ink)] tracking-tight">
              REMEDIATION <span className="text-[var(--color-ink-3)] font-normal">/ {finding.title}</span>
            </h1>
            <StatusBadge s={finding.status} />
          </div>

          <div className="mono text-[12px] font-semibold text-[var(--color-ink)] bg-[#FAFAFA] px-3 py-1.5 rounded-md border border-[var(--color-line)] flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-[#0F8A5A]" />
            <span>{rem.branch}</span>
          </div>
        </div>
      </div>

      {/* BEFORE VS AFTER Code Diff Editor */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="mono text-[11px] font-bold text-[var(--color-ink-3)] uppercase tracking-wider">
            BEFORE vs AFTER PROPOSED PATCH DIFF
          </div>
          <span className="mono text-[11px] text-[var(--color-ink-3)]">
            Base branch: {currentRepo?.defaultBranch || 'main'}
          </span>
        </div>

        <div className="rounded-xl border border-[var(--color-line)] bg-white shadow-xs overflow-hidden">
          <DiffPane
            before={rem.diff_before}
            after={rem.diff_after}
            height={360}
            fileName={`${finding.file_path} (patch diff)`}
          />
        </div>
      </div>

      {/* WHY THIS FIX + RISK + VALIDATION + ACTION CONTROLS */}
      <div className="grid md:grid-cols-3 gap-6 items-start">
        
        {/* Why this fix */}
        <div className="p-6 rounded-xl bg-white border border-[var(--color-line)] shadow-xs space-y-2 md:col-span-2">
          <h3 className="mono text-[11px] font-bold text-[#0F8A5A] uppercase tracking-wider">
            WHY THIS FIX
          </h3>
          <p className="text-[13px] text-[var(--color-ink)] leading-relaxed font-medium">
            {rem.why_this_fix}
          </p>
          <p className="text-[12.5px] text-[var(--color-ink-3)] leading-relaxed">
            {rem.explanation}
          </p>
        </div>

        {/* Change scope & Review Actions */}
        <div className="p-6 rounded-xl bg-white border border-[var(--color-line)] shadow-xs space-y-4">
          <div className="space-y-2 text-[12.5px]">
            <div className="flex justify-between items-center">
              <span className="text-[var(--color-ink-3)]">REGRESSION RISK</span>
              <span className="chip ok font-bold">{rem.risk.toUpperCase()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--color-ink-3)]">REGRESSION TESTS</span>
              <span className="mono font-semibold text-[var(--color-ink)]">{rem.regression_passed} / {rem.regression_tests} PASSED</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--color-ink-3)]">VALIDATION</span>
              <span className="chip warn font-bold">{applied ? 'READY' : 'PENDING'}</span>
            </div>
          </div>

          <div className="h-[1px] bg-[var(--color-line)] w-full" />

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            {!applied && !rejected && (
              <>
                <button
                  onClick={() => { markFinding(finding.id, 'FIX_PENDING'); setApplied(true); }}
                  className="btn btn-accent w-full justify-center py-2.5 text-[12.5px]"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve Fix
                </button>

                <button
                  onClick={() => setBranchCreated(true)}
                  disabled={branchCreated}
                  className="btn btn-primary w-full justify-center py-2 text-[12px]"
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  {branchCreated ? 'Branch Created' : 'Create GitHub Branch'}
                </button>

                <button
                  onClick={() => { markFinding(finding.id, 'OPEN'); setRejected(true); }}
                  className="btn btn-danger w-full justify-center py-2 text-[12px]"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Reject Fix
                </button>
              </>
            )}

            {applied && (
              <div className="space-y-2 text-center">
                <div className="chip ok w-full py-1.5 text-[11px] justify-center">
                  Fix approved! Ready for sandbox verification.
                </div>
                <button
                  onClick={() => navigate(`/verification/${finding.id}`)}
                  className="btn btn-accent w-full justify-center py-2.5 text-[12.5px]"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Verify Patch →
                </button>
              </div>
            )}

            {rejected && (
              <div className="space-y-2 text-center">
                <div className="chip bad w-full py-1.5 text-[11px] justify-center">
                  Fix proposal rejected.
                </div>
                <button
                  onClick={() => { setRejected(false); markFinding(finding.id, 'REVIEW'); }}
                  className="btn btn-ghost btn-xs text-[11px]"
                >
                  Reopen review
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}