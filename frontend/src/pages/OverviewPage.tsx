import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Circle,
  Database,
  FileCode,
  FolderTree,
  GitBranch,
  Key,
  Lock,
  Play,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Zap,
} from 'lucide-react';
import { AnimatedNumber, SevBadge, StatusBadge, ValidationBadge } from '../components/ui';
import { useWorkspace, useFindings, useAssessmentActive } from '../store/WorkspaceContext';

export default function OverviewPage() {
  const {
    currentRepo,
    branch,
    commit,
    currentAssessment,
    startAssessment,
    connectGithub,
  } = useWorkspace();
  const findings = useFindings();
  const running = useAssessmentActive();
  const navigate = useNavigate();

  /* ── Empty State ─────────────────────────────────────────── */
  if (!currentRepo) {
    return (
      <div className="max-w-[840px] mx-auto py-8 sm:py-16 px-2 sm:px-4 fade-in space-y-6 sm:space-y-8">
        <div className="space-y-3 sm:space-y-4">
          <div className="protocol-tag">zorqen://platform/overview</div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-[#111111] tracking-tighter leading-none">
            SECURITY VALIDATION <br />
            <span className="text-[#666666] font-normal">FOR AI-BUILT SOFTWARE.</span>
          </h1>
          <p className="text-base sm:text-lg text-[#333333] max-w-[560px] leading-relaxed font-medium">
            Autonomous security validation and vulnerability remediation for repositories you control. Find it. Fix it. Prove it.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={connectGithub} className="btn btn-primary px-5 sm:px-6 py-2.5 sm:py-3 text-[13px] sm:text-[13.5px]">
            Connect GitHub Account
          </button>
        </div>

        <div className="pt-6 sm:pt-8 border-t border-[#111111] space-y-4">
          <div className="mono text-[11px] font-bold text-[#666666] uppercase tracking-wider">
            AUTOMATED SECURITY WORKFLOW
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              ['01 DETECT', 'Static analysis & dependency audit', 'Reads source, maps architecture and flags syntax patterns.'],
              ['02 REASON', 'AI threat path correlation', 'Correlates vulnerabilities with entry points and confidence.'],
              ['03 VALIDATE', 'Sandbox runtime reproduction', 'Executes probes in isolated containers to confirm exploitability.'],
              ['04 REMEDIATE', 'Minimal patch generation', 'Produces localized before/after code diff proposals.'],
            ].map(([num, title, desc]) => (
              <div key={num} className="p-4 rounded-lg border border-[#111111] bg-white shadow-hard-sm space-y-1">
                <div className="mono text-[10px] text-[#111111] font-extrabold bg-[#C5F82A] px-1.5 py-0.5 rounded inline-block">{num}</div>
                <div className="font-extrabold text-[13px] text-[#111111]">{title}</div>
                <div className="text-[12px] text-[#555555]">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── Stats & Counts calculation ───────────────────────────── */
  const counts = {
    critical: findings.filter((f) => f.severity === 'critical').length,
    high:     findings.filter((f) => f.severity === 'high').length,
    medium:   findings.filter((f) => f.severity === 'medium').length,
    low:      findings.filter((f) => f.severity === 'low').length,
  };

  const biggestFinding = findings.find((f) => f.severity === 'critical') || findings[0];
  const score = currentAssessment?.score;
  const arch = currentAssessment?.architecture;
  const stack = arch ? [...new Set([arch.primaryLanguage, ...(arch.frameworks ?? [])])].filter(Boolean).join(' • ') : null;
  const riskBand = score == null ? null : score >= 80 ? 'LOW RISK' : score >= 60 ? 'MODERATE RISK' : 'HIGH RISK';
  const criticalHigh = counts.critical + counts.high;

  return (
    <div className="max-w-[1240px] mx-auto space-y-8 fade-in py-2">
      
      {/* ── 1. LARGE EDITORIAL HERO SECTION ─────────────────────── */}
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 sm:gap-6">
          <div className="space-y-2">
            <div className="protocol-tag">zorqen://repository/security-posture</div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-[#111111] tracking-tighter leading-none mt-2">
              SECURITY VALIDATION <br />
              <span className="text-[#4A4A4A] font-bold">FOR AI-BUILT SOFTWARE.</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={startAssessment}
              disabled={running}
              className="btn btn-accent px-5 sm:px-6 py-2.5 sm:py-3 text-[13px] sm:text-[13.5px]"
            >
              <Play className="w-4 h-4 fill-current" />
              {running ? 'Pipeline Running…' : 'Run Assessment'}
            </button>
          </div>
        </div>

        <div className="h-[2px] bg-[#111111] w-full" />

        {/* Repository Header Target Strip */}
        <div className="p-5 sm:p-6 rounded-[18px] bg-white border-2 border-[#111111] shadow-hard flex flex-wrap items-center justify-between gap-4 sm:gap-6">
          <div className="space-y-1 min-w-0">
            <div className="mono text-[10.5px] font-extrabold tracking-wider text-[#4A4A4A] uppercase">
              TARGET REPOSITORY
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-[#111111] tracking-tight flex items-center gap-2.5 flex-wrap break-all">
              {currentRepo.owner}/{currentRepo.name}
              <span className="chip uppercase text-[10px] font-bold">{currentRepo.private ? 'Private' : 'Public'}</span>
            </div>
            <div className="text-[12.5px] sm:text-[13px] text-[#333333] font-semibold">
              Security posture for latest assessed snapshot.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[12px]">
            <div className="mono text-[11px] sm:text-[12px] font-bold text-[#111111] bg-[#FAFAFA] px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-md border border-[#111111] shadow-hard-sm">
              {stack || 'NO ASSESSMENT YET'}
            </div>
            <div className="flex items-center gap-2 mono text-[11px] sm:text-[12px] font-extrabold text-[#111111] bg-[#C5F82A] px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-md border border-[#111111] shadow-hard-sm">
              <GitBranch className="w-4 h-4 text-[#111111]" />
              <span>{branch}</span>
              <span className="text-[#111111]">@{commit.slice(0, 7)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. SECURITY POSTURE: Visually Dominant Score Block ─── */}
      <div className="p-5 sm:p-8 rounded-xl bg-white border border-[#111111] shadow-hard grid lg:grid-cols-[300px_1fr] gap-6 sm:gap-8 items-center">
        
        {/* Huge Editorial Score Block */}
        <div className="border-b lg:border-b-0 lg:border-r border-[#111111] pb-5 lg:pb-0 pr-0 lg:pr-8 flex flex-col justify-center">
          <div className="mono text-[11px] font-extrabold tracking-[0.12em] text-[#4A4A4A] uppercase mb-1">
            SECURITY POSTURE SCORE
          </div>
          <div className="flex items-baseline gap-2">
            {score != null ? (
              <>
                <span className="text-5xl sm:text-7xl font-extrabold text-[#111111] tracking-tighter leading-none">
                  <AnimatedNumber value={score} />
                </span>
                <span className="text-2xl sm:text-3xl font-extrabold text-[#333333]">/100</span>
              </>
            ) : (
              <span className="text-3xl sm:text-5xl font-extrabold text-[#333333] tracking-tighter leading-none">
                —
              </span>
            )}
          </div>
          <div className="mt-3 sm:mt-4">
            {riskBand ? (
              <span className={`chip text-[11.5px] px-3 py-1 uppercase font-bold ${riskBand === 'HIGH RISK' ? 'sev-critical' : riskBand === 'MODERATE RISK' ? 'sev-high' : 'ok'}`}>
                {riskBand}
              </span>
            ) : (
              <span className="chip text-[11.5px] px-3 py-1 uppercase font-bold">NO ASSESSMENT YET</span>
            )}
          </div>
        </div>

        {/* Clean Severity Counts & Action Statement */}
        <div className="space-y-4 sm:space-y-5">
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5 sm:gap-3 text-[12px] sm:text-[13px] font-bold">
            <div className="flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-md bg-[#FEE2E2] text-[#DC2626] border border-[#111111] shadow-hard-sm">
              <span className="font-extrabold text-[14px] sm:text-[15px]">{counts.critical}</span> CRITICAL
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-md bg-[#FFEDD5] text-[#C2410C] border border-[#111111] shadow-hard-sm">
              <span className="font-extrabold text-[14px] sm:text-[15px]">{counts.high}</span> HIGH
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-md bg-[#FEF3C7] text-[#B45309] border border-[#111111] shadow-hard-sm">
              <span className="font-extrabold text-[14px] sm:text-[15px]">{counts.medium}</span> MEDIUM
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-md bg-[#DBEAFE] text-[#1D4ED8] border border-[#111111] shadow-hard-sm">
              <span className="font-extrabold text-[14px] sm:text-[15px]">{counts.low}</span> LOW
            </div>
          </div>

          <div className="text-lg sm:text-xl font-extrabold text-[#111111] tracking-tight leading-snug">
            {criticalHigh > 0
              ? `“${criticalHigh} critical & high security finding${criticalHigh === 1 ? '' : 's'} require${criticalHigh === 1 ? 's' : ''} immediate engineering remediation.”`
              : findings.length > 0
                ? '“No critical or high findings — remaining issues are lower priority.”'
                : '“No findings yet — run an assessment to scan this repository.”'}
          </div>
          <div className="text-[12.5px] sm:text-[13px] text-[#555555] font-medium">
            Scan scope encompasses HTTP routes, database ORM queries, environment credentials, and dependency lockfiles across {findings.length} total findings.
          </div>
        </div>
      </div>

      {/* ── 3. AI-REASONED ATTACK MAP ────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-[#111111]" />
            <h2 className="text-lg sm:text-xl font-extrabold text-[#111111] tracking-tight">AI-REASONED ATTACK MAP</h2>
          </div>

          {arch ? (
            <div className="flex items-center gap-2 sm:gap-2.5 mono text-[10.5px] sm:text-[11px] font-bold text-[#111111] bg-[#FAFAFA] px-3 sm:px-3.5 py-1.5 rounded-md border border-[#111111] shadow-hard-sm flex-wrap">
              <span>{arch.files} FILES</span>
              <span>•</span>
              <span>{arch.routes} ROUTES</span>
              <span>•</span>
              <span>{arch.inputs} INPUTS</span>
              <span>•</span>
              <span>{arch.sinks} SINKS</span>
              <span>•</span>
              <span>{arch.flows.length} FLOWS</span>
              <span>•</span>
              <span className={arch.secrets > 0 ? 'text-[#DC2626] font-extrabold' : ''}>{arch.secrets} SECRETS</span>
            </div>
          ) : (
            <span className="mono text-[11px] font-bold text-[#666666] bg-[#FAFAFA] px-3 py-1.5 rounded-md border border-[#111111] shadow-hard-sm">
              NO ASSESSMENT YET — RUN AN ASSESSMENT TO BUILD THE ATTACK MAP
            </span>
          )}
        </div>

        {arch ? (
          <div className="p-4 sm:p-6 rounded-xl bg-white border border-[#111111] shadow-hard space-y-6">
            <div className="grid md:grid-cols-2 gap-6 items-start">
              {arch.topRoutes.length > 0 ? (
                /* Real detected routes from the repository */
                <div className="mono text-[11.5px] sm:text-[12.5px] leading-relaxed space-y-1.5 bg-[#FAFAFA] p-4 sm:p-5 rounded-lg border border-[#111111] shadow-hard-sm overflow-x-auto scroll-thin">
                  <div className="text-[#111111] font-bold mb-2">ROUTES</div>
                  {arch.topRoutes.map((r) => (
                    <div key={`${r.method}${r.endpoint}${r.file_path}${r.line_number}`} className="flex items-center justify-between gap-2 px-2.5 py-1 rounded border border-[#111111] min-w-max">
                      <span className="text-[#444444] font-bold">
                        <span className="text-[#C2410C]">{r.method}</span> {r.endpoint}
                      </span>
                      <span className="text-[10px] text-[#555555] truncate max-w-[140px]">{r.file_path}:{r.line_number}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mono text-[11.5px] leading-relaxed bg-[#FAFAFA] p-4 sm:p-5 rounded-lg border border-[#111111] shadow-hard-sm">
                  <div className="text-[#111111] font-bold mb-2">ROUTES</div>
                  <div className="text-[#666666]">No HTTP routes detected in scanned files.</div>
                </div>
              )}

              <div className="space-y-4">
                <div className="p-4 sm:p-5 rounded-lg bg-[#FAFAFA] border border-[#111111] shadow-hard-sm space-y-2">
                  <div className="mono text-[10.5px] font-extrabold text-[#111111] uppercase tracking-wider bg-[#C5F82A] px-2 py-0.5 rounded border border-[#111111] inline-block">
                    PRIMARY LANGUAGE
                  </div>
                  <div className="font-extrabold text-[12px] sm:text-[13.5px] text-[#111111] mono leading-tight break-all">
                    {arch.primaryLanguage}
                  </div>
                  <div className="text-[12px] sm:text-[12.5px] text-[#555555] leading-relaxed font-medium">
                    {arch.summary || `Stack: ${arch.frameworks.join(', ') || 'unknown'} · ${arch.dependencies} dependencies detected.`}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-lg border border-[#111111] bg-white text-[12px] sm:text-[12.5px] font-semibold flex-wrap gap-2">
                  <span className="text-[#555555]">Sandbox Probe Status</span>
                  <span className="mono font-bold text-[#111111] flex items-center gap-2">
                    <span className="pulse-dot" /> Static validation only — sandbox execution not run
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 sm:p-12 text-center text-[#666666] mono text-[13px] bg-white border border-[#111111] rounded-xl shadow-hard">
            Run an assessment to analyze routes, inputs, sinks, and secrets for this repository.
          </div>
        )}
      </div>

      {/* ── 4. WHAT ZORQEN CHECKS (6-Card Feature Matrix) ───────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#111111]" />
          <h2 className="text-lg sm:text-xl font-extrabold text-[#111111] tracking-tight">WHAT ZORQEN CHECKS</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {([
            [Key, 'Secret Exposure', 'Scans environment configs, committed tokens, and hardcoded API credentials across repo history.'],
            [Lock, 'Broken Access Control', 'Maps authorization boundaries across endpoints to prevent unauthorized object reads.'],
            [Database, 'Injection Paths', 'Traces unsanitized user inputs into database queries, sub-processes, and dangerous sinks.'],
            [FileCode, 'Data Leakage', 'Audits request interceptors and logger output for unredacted PII or auth headers.'],
            [Zap, 'AI Security Drift', 'Flags insecure code patterns commonly introduced by automated AI code generators.'],
            [Terminal, 'Sandbox Verification', 'Executes automated exploit probes in ephemeral container sandboxes to prove impact.'],
          ] as const).map(([IconComponent, title, desc], idx) => {
            const Icon = IconComponent as any;
            const numStr = `0${idx + 1}`;
            return (
              <div
                key={idx}
                className="p-5 sm:p-6 rounded-xl bg-white border border-[#111111] shadow-hard space-y-3 hover:-translate-y-0.5 transition-transform"
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-lg bg-[#C5F82A] border border-[#111111] flex items-center justify-center text-[#111111]">
                    <Icon className="w-5 h-5" strokeWidth={2.2} />
                  </div>
                  <span className="mono text-[14px] font-extrabold text-[#111111] bg-[#FAFAFA] px-2 py-0.5 rounded border border-[#111111]">{numStr}</span>
                </div>
                <h3 className="font-extrabold text-[15px] text-[#111111] tracking-tight">{title}</h3>
                <p className="text-[12.5px] text-[#555555] leading-relaxed font-medium">{desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 5. BIGGEST SECURITY FINDING SECTION ─────────────────── */}
      {biggestFinding && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-lg sm:text-xl font-extrabold text-[#111111] tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
              BIGGEST SECURITY FINDING
            </h2>
            <button
              onClick={() => navigate(`/findings/${biggestFinding.id}`)}
              className="text-[12.5px] sm:text-[13px] font-extrabold text-[#111111] hover:underline flex items-center gap-1"
            >
              Investigate finding <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 sm:p-7 rounded-xl bg-white border-2 border-[#111111] shadow-hard-lg space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <SevBadge sev={biggestFinding.severity} />
                <h3 className="text-xl sm:text-2xl font-extrabold text-[#111111] tracking-tight break-words">
                  {biggestFinding.title.toUpperCase()}
                </h3>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="chip mono font-bold">{biggestFinding.cwe_id}</span>
                <span className="chip ok font-bold">{biggestFinding.confidence_pct}% CONFIDENCE</span>
                <ValidationBadge v={biggestFinding.validation} />
                <StatusBadge s={biggestFinding.status} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-[12.5px] sm:text-[13px] border-y border-[#111111] py-3.5">
              <div className="min-w-0">
                <span className="text-[#666666] font-bold">ENDPOINT: </span>
                <span className="mono font-bold text-[#111111] break-all">{biggestFinding.endpoint || '—'}</span>
              </div>
              <div className="min-w-0">
                <span className="text-[#666666] font-bold">LOCATION: </span>
                <span className="mono font-bold text-[#111111] break-all">{biggestFinding.file_path}:{biggestFinding.line_number}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <p className="text-[12.5px] sm:text-[13px] text-[#333333] font-medium max-w-[720px] leading-relaxed">
                {biggestFinding.root_cause}
              </p>

              <button
                onClick={() => navigate(`/findings/${biggestFinding.id}`)}
                className="btn btn-accent px-5 sm:px-6 py-2.5 text-[13px] w-full sm:w-auto justify-center"
              >
                INVESTIGATE →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. FINDING REMEDIATION LIFECYCLE ─────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-[#111111]" />
          <h2 className="text-lg sm:text-xl font-extrabold text-[#111111] tracking-tight">FINDING REMEDIATION LIFECYCLE</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {([
            ['01', 'DETECT', 'Static analysis & repo mapping.', currentAssessment?.steps?.some(s => s.status === 'completed') ? 'Complete' : currentAssessment?.status === 'RUNNING' ? 'Running' : 'Pending'],
            ['02', 'REASON', 'AI correlates source & attack paths.', currentAssessment?.steps?.find(s => s.id === 'reasoning')?.status === 'completed' ? 'Complete' : 'Pending'],
            ['03', 'VALIDATE', 'Sandbox runtime reproduction.', 'Unavailable'],
            ['04', 'REMEDIATE', 'Minimal patch diff generation.', findings.some(f => f.status === 'FIX_PENDING' || f.status === 'FIX_APPLIED') ? 'In Progress' : findings.length > 0 ? 'Ready' : 'Pending'],
            ['05', 'VERIFY', 'Confirm patch fixes vulnerability.', findings.some(f => f.status === 'VERIFIED') ? 'Verified' : 'Pending'],
          ] as const).map(([stepNum, stepTitle, stepDesc, stepStatus]) => (
            <div key={stepNum} className="p-4 rounded-xl bg-white border border-[#111111] shadow-hard space-y-2">
              <div className="flex items-center justify-between">
                <span className="mono text-[11px] font-extrabold bg-[#C5F82A] px-1.5 py-0.5 rounded border border-[#111111]">{stepNum}</span>
                {stepStatus === 'Complete' || stepStatus === 'Verified' ? (
                  <CheckCircle2 className="w-4 h-4 text-[#111111]" />
                ) : stepStatus === 'Unavailable' ? (
                  <AlertTriangle className="w-4 h-4 text-[#B45309]" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-[#4A4A4A]" />
                )}
              </div>
              <div className="font-extrabold text-[13.5px] text-[#111111] tracking-tight">{stepTitle}</div>
              <div className="text-[11.5px] text-[#555555] leading-snug font-medium">{stepDesc}</div>
              <div className="pt-1">
                <span className={`chip text-[9.5px] font-bold ${stepStatus === 'Complete' || stepStatus === 'Verified' ? 'ok' : stepStatus === 'Unavailable' ? '' : ''}`}>{stepStatus}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}