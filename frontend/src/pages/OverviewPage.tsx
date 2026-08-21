import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
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

import GithubIcon from '../components/GithubIcon';

export default function OverviewPage() {
  const {
    currentRepo,
    branch,
    commit,
    currentAssessment,
    startAssessment,
    connectGithub,
    githubConnected,
    user,
  } = useWorkspace();
  const findings = useFindings();
  const running = useAssessmentActive();
  const navigate = useNavigate();

  /* ── Empty State ─────────────────────────────────────────── */
  if (!currentRepo) {
    return (
      <div className="max-w-[980px] mx-auto py-12 sm:py-20 px-4 fade-in space-y-10">
        <div className="space-y-4">
          <div className="protocol-tag">zorqen://platform/overview</div>
          <h1 className="text-4xl sm:text-[56px] lg:text-[72px] font-extrabold text-[#0A0A0A] tracking-tight leading-[1.05]">
            Security Validation <br />
            <span className="text-[#6B6B6B] font-semibold">for AI-built software.</span>
          </h1>
          <p className="text-base sm:text-[18px] text-[#333333] max-w-[640px] leading-relaxed font-medium">
            Autonomous security validation and vulnerability remediation for repositories you control. Find it. Fix it. Prove it.
          </p>
        </div>

        {/* Minimal Aligned Workspace Metadata Line (No Background Box) */}
        <div
          onClick={connectGithub}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); connectGithub(); } }}
          className="group flex items-center justify-between gap-4 py-2 cursor-pointer select-none border-b border-[#111111]/15 hover:border-[#111111] transition-colors"
        >
          <div className="flex items-center gap-3 text-[13.5px] font-medium text-[#333333]">
            <GithubIcon className="w-4 h-4 text-[#111111]" />
            <span className="mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#6B6B6B]">
              GitHub Workspace
            </span>
            <span className="text-[#111111]/30">•</span>
            {githubConnected ? (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#C8FF2E] border border-[#111111] animate-pulse" />
                <span>Connected <strong className="text-[#0A0A0A]">@{user?.github_login || 'iamdevdhanush'}</strong></span>
              </span>
            ) : (
              <span>Not connected — OAuth required</span>
            )}
          </div>

          <div className="flex items-center gap-1 text-[13px] font-bold text-[#0A0A0A] group-hover:translate-x-1 transition-transform">
            <span>{githubConnected ? 'Ready for validation' : 'Connect workspace'}</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        {/* Workflow Grid */}
        <div className="space-y-4 pt-4">
          <div className="mono text-[11px] font-extrabold text-[#6B6B6B] uppercase tracking-[0.14em]">
            WORKFLOW PIPELINE
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              ['01', 'Static Analysis', 'Maps architecture & flags patterns', '153 files · 42 endpoints'],
              ['02', 'AI Reasoning', 'Correlates exploit pathways', 'High confidence scoring'],
              ['03', 'Sandbox Probes', 'Executes containerized probes', 'Isolated runtime test'],
              ['04', 'Remediation', 'Generates validated code diffs', 'Automated patch PRs'],
            ].map(([num, title, desc, meta]) => (
              <div key={num} className="p-4 rounded-[12px] bg-white border border-[#111111]/15 hover:border-[#111111] transition-all space-y-2 relative group overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-transparent group-hover:bg-[#C8FF2E] transition-colors" />
                <div className="mono text-[11px] font-extrabold text-[#0A0A0A]">{num}</div>
                <div className="font-extrabold text-[14.5px] text-[#0A0A0A]">{title}</div>
                <div className="text-[13px] text-[#6B6B6B] font-medium leading-snug">{desc}</div>
                <div className="h-[1px] bg-[#111111]/10 my-2" />
                <div className="mono text-[10.5px] text-[#6B6B6B] font-semibold">{meta}</div>
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
  const frameworks = arch?.frameworks ?? [];
  const riskBand = score == null ? null : score >= 80 ? 'LOW RISK' : score >= 60 ? 'MODERATE RISK' : 'HIGH RISK';
  const criticalHigh = counts.critical + counts.high;

  return (
    <div className="max-w-[1280px] mx-auto space-y-8 fade-in py-4">
      
      {/* ── 1. LARGE EDITORIAL HERO SECTION ─────────────────────── */}
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-3">
            <div className="protocol-tag">zorqen://repository/security-posture</div>
            <h1 className="text-4xl sm:text-[64px] font-[900] text-[#0A0A0A] tracking-tighter leading-none mt-2">
              SECURITY VALIDATION <br />
              <span className="text-[#5E5E5E] font-bold">FOR AI-BUILT SOFTWARE.</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={startAssessment}
              disabled={running}
              className="btn btn-accent px-6 h-[48px] text-[14px]"
            >
              <Play className="w-4 h-4 fill-current" />
              {running ? 'Pipeline Running…' : 'Run Assessment'}
            </button>
          </div>
        </div>

        <div className="h-[2px] bg-[#111111] w-full" />

        {/* Repository Header Target Card */}
        <div className="panel flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-1.5 min-w-0">
            <div className="mono text-[11px] font-extrabold tracking-[0.18em] text-[#5E5E5E] uppercase">
              TARGET REPOSITORY
            </div>
            <div className="text-2xl sm:text-[28px] font-extrabold text-[#0A0A0A] tracking-tight flex items-center gap-3 flex-wrap break-all">
              {currentRepo.owner}/{currentRepo.name}
              <span className="chip uppercase text-[10px] font-bold">{currentRepo.private ? 'Private' : 'Public'}</span>
            </div>
            <div className="text-[14px] text-[#5E5E5E] font-medium">
              Security posture for latest assessed snapshot.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[12px]">
            <div className="mono text-[11px] font-bold text-[#0A0A0A] bg-[#FAFAFA] px-3 py-1.5 rounded-[8px] border border-[#111111] shadow-hard-sm">
              {arch?.primaryLanguage ? `${arch.primaryLanguage} • ${arch.dependencies} DEPS` : 'NO ASSESSMENT YET'}
            </div>
            <div className="flex items-center gap-2 mono text-[11px] font-extrabold text-[#111111] bg-[#C8FF2E] px-3 py-1.5 rounded-[8px] border border-[#111111] shadow-hard-sm">
              <GitBranch className="w-4 h-4 text-[#111111]" />
              <span>{branch}</span>
              <span className="text-[#111111]">@{commit.slice(0, 7)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. SECURITY SCORE: Split into Two Visual Columns ─────── */}
      <div className="panel grid lg:grid-cols-[320px_1fr] gap-8 items-center">
        
        {/* Left Column: Huge Score */}
        <div className="border-b lg:border-b-0 lg:border-r-2 border-[#111111] pb-6 lg:pb-0 pr-0 lg:pr-8 flex flex-col justify-center">
          <div className="mono text-[11px] font-extrabold tracking-[0.18em] text-[#5E5E5E] uppercase mb-1">
            SECURITY POSTURE SCORE
          </div>
          <div className="flex items-baseline gap-2">
            {score != null ? (
              <>
                <span className="text-5xl sm:text-[64px] font-[900] text-[#0A0A0A] tracking-tighter leading-none">
                  <AnimatedNumber value={score} />
                </span>
                <span className="text-2xl sm:text-[34px] font-bold text-[#5E5E5E]">/100</span>
              </>
            ) : (
              <span className="text-4xl sm:text-[64px] font-[900] text-[#5E5E5E] tracking-tighter leading-none">
                —
              </span>
            )}
          </div>
          <div className="mt-4">
            {riskBand ? (
              <span className={`chip text-[11px] px-3 py-1 uppercase font-extrabold ${riskBand === 'HIGH RISK' ? 'sev-critical' : riskBand === 'MODERATE RISK' ? 'sev-high' : 'ok'}`}>
                {riskBand}
              </span>
            ) : (
              <span className="chip text-[11px] px-3 py-1 uppercase font-extrabold">NO ASSESSMENT YET</span>
            )}
          </div>
        </div>

        {/* Right Column: Severity Counts & Explanation */}
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-3 text-[13px] font-bold">
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-[8px] bg-[#FEE2E2] text-[#DC2626] border border-[#111111] shadow-hard-sm">
              <span className="font-mono font-bold text-[16px]">{counts.critical}</span> CRITICAL
            </div>
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-[8px] bg-[#FFEDD5] text-[#C2410C] border border-[#111111] shadow-hard-sm">
              <span className="font-mono font-bold text-[16px]">{counts.high}</span> HIGH
            </div>
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-[8px] bg-[#FEF3C7] text-[#B45309] border border-[#111111] shadow-hard-sm">
              <span className="font-mono font-bold text-[16px]">{counts.medium}</span> MEDIUM
            </div>
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-[8px] bg-[#DBEAFE] text-[#1D4ED8] border border-[#111111] shadow-hard-sm">
              <span className="font-mono font-bold text-[16px]">{counts.low}</span> LOW
            </div>
          </div>

          <div className="text-lg sm:text-[24px] font-extrabold text-[#0A0A0A] tracking-tight leading-snug">
            {criticalHigh > 0
              ? `“${criticalHigh} critical & high security finding${criticalHigh === 1 ? '' : 's'} require${criticalHigh === 1 ? 's' : ''} immediate engineering remediation.”`
              : findings.length > 0
                ? '“No critical or high findings — remaining issues are lower priority.”'
                : '“No findings yet — run an assessment to scan this repository.”'}
          </div>
          <div className="text-[14px] text-[#5E5E5E] font-medium leading-relaxed">
            Scan scope encompasses HTTP routes, database ORM queries, environment credentials, and dependency lockfiles across {findings.length} total findings.
          </div>
        </div>
      </div>

      {/* ── 3. AI-REASONED ATTACK MAP (Hero Feature) ────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <FolderTree className="w-6 h-6 text-[#0A0A0A]" />
            <h2 className="text-[24px] font-extrabold text-[#0A0A0A] tracking-tight">AI-REASONED ATTACK MAP</h2>
          </div>

          {arch ? (
            <div className="flex items-center gap-2.5 mono text-[11px] font-bold text-[#0A0A0A] bg-[#FAFAFA] px-4 py-2 rounded-[8px] border border-[#111111] shadow-hard-sm flex-wrap">
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
            <span className="mono text-[11px] font-bold text-[#5E5E5E] bg-[#FAFAFA] px-3.5 py-2 rounded-[8px] border border-[#111111] shadow-hard-sm">
              NO ASSESSMENT YET — RUN AN ASSESSMENT TO BUILD THE ATTACK MAP
            </span>
          )}
        </div>

        {arch ? (
          <div className="panel space-y-6">
            <div className="grid md:grid-cols-2 gap-6 items-start">
              {arch.topRoutes.length > 0 ? (
                /* Interactive Route Rows */
                <div className="mono text-[12px] leading-relaxed space-y-2 bg-[#FAFAFA] p-5 rounded-[12px] border-1.5 border-[#111111] shadow-hard-sm overflow-x-auto scroll-thin">
                  <div className="text-[#0A0A0A] font-extrabold text-[13px] mb-3 uppercase tracking-[0.18em]">HTTP ROUTES</div>
                  {arch.topRoutes.map((r) => (
                    <div
                      key={`${r.method}${r.endpoint}${r.file_path}${r.line_number}`}
                      className="interactive-card flex items-center justify-between gap-3 px-3 py-2 rounded-[8px] border border-[#111111] bg-white hover:bg-[#F2F2EB] cursor-pointer min-w-max"
                    >
                      <span className="text-[#0A0A0A] font-bold">
                        <span className="text-[#C2410C]">{r.method}</span> {r.endpoint}
                      </span>
                      <span className="text-[11px] text-[#5E5E5E] truncate max-w-[160px]">{r.file_path}:{r.line_number}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mono text-[12px] leading-relaxed bg-[#FAFAFA] p-5 rounded-[12px] border-1.5 border-[#111111] shadow-hard-sm">
                  <div className="text-[#0A0A0A] font-extrabold mb-2 uppercase tracking-[0.18em]">HTTP ROUTES</div>
                  <div className="text-[#5E5E5E]">No HTTP routes detected in scanned files.</div>
                </div>
              )}

              <div className="space-y-4">
                <div className="card-secondary space-y-3">
                  <div className="mono text-[11px] font-extrabold text-[#111111] uppercase tracking-[0.18em] bg-[#C8FF2E] px-2.5 py-0.5 rounded-[6px] border border-[#111111] inline-block">
                    PRIMARY LANGUAGE
                  </div>
                  <div className="font-extrabold text-[16px] text-[#0A0A0A] mono leading-tight break-all">
                    {arch.primaryLanguage}
                  </div>
                  
                  {/* Tech stack chips */}
                  {frameworks.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {frameworks.map((fw) => (
                        <span key={fw} className="chip font-bold text-[10.5px] bg-[#FAFAFA]">
                          {fw}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="text-[13px] text-[#5E5E5E] leading-relaxed font-medium">
                    {arch.summary || `Stack: ${frameworks.join(', ') || 'unknown'} · ${arch.dependencies} dependencies detected.`}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-[12px] border-1.5 border-[#111111] bg-white text-[13px] font-semibold flex-wrap gap-2">
                  <span className="text-[#5E5E5E]">Sandbox Probe Status</span>
                  <span className="mono font-bold text-[#0A0A0A] flex items-center gap-2">
                    <span className="pulse-dot" /> Static validation only — sandbox execution pending
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="panel p-12 text-center text-[#5E5E5E] mono text-[14px]">
            Run an assessment to analyze routes, inputs, sinks, and secrets for this repository.
          </div>
        )}
      </div>

      {/* ── 4. WHAT ZORQEN CHECKS ───────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-[#0A0A0A]" />
          <h2 className="text-[24px] font-extrabold text-[#0A0A0A] tracking-tight">WHAT ZORQEN CHECKS</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                className="panel space-y-4 interactive-card"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-[10px] bg-[#C8FF2E] border-2 border-[#111111] flex items-center justify-center text-[#111111]">
                    <Icon className="w-5 h-5" strokeWidth={2.2} />
                  </div>
                  <span className="mono text-[13px] font-extrabold text-[#0A0A0A] bg-[#FAFAFA] px-2.5 py-0.5 rounded-[6px] border border-[#111111]">{numStr}</span>
                </div>
                <h3 className="font-extrabold text-[18px] text-[#0A0A0A] tracking-tight">{title}</h3>
                <p className="text-[14px] text-[#5E5E5E] leading-relaxed font-medium">{desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 5. BIGGEST SECURITY FINDING SECTION ─────────────────── */}
      {biggestFinding && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-[24px] font-extrabold text-[#0A0A0A] tracking-tight flex items-center gap-3">
              <ShieldAlert className="w-6 h-6 text-red-600 shrink-0" />
              BIGGEST SECURITY FINDING
            </h2>
            <button
              onClick={() => navigate(`/findings/${biggestFinding.id}`)}
              className="text-[13px] font-extrabold text-[#0A0A0A] hover:underline flex items-center gap-1"
            >
              Investigate finding <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="panel space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <SevBadge sev={biggestFinding.severity} />
                <h3 className="text-2xl font-extrabold text-[#0A0A0A] tracking-tight break-words">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13px] border-y-2 border-[#111111] py-4">
              <div className="min-w-0">
                <span className="text-[#5E5E5E] font-bold">ENDPOINT: </span>
                <span className="mono font-bold text-[#0A0A0A] break-all">{biggestFinding.endpoint || '—'}</span>
              </div>
              <div className="min-w-0">
                <span className="text-[#5E5E5E] font-bold">LOCATION: </span>
                <span className="mono font-bold text-[#0A0A0A] break-all">{biggestFinding.file_path}:{biggestFinding.line_number}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <p className="text-[14px] text-[#333333] font-medium max-w-[760px] leading-relaxed">
                {biggestFinding.root_cause}
              </p>

              <button
                onClick={() => navigate(`/findings/${biggestFinding.id}`)}
                className="btn btn-accent px-5 text-[13px]"
              >
                Inspect Threat Flow →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}