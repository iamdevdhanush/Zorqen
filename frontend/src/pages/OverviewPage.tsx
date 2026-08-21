import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  GitBranch,
  Play,
  ShieldAlert,
} from 'lucide-react';
import { AnimatedNumber, SevBadge, StatusBadge, ValidationBadge } from '../components/ui';
import { useWorkspace, useFindings, useAssessmentActive } from '../store/WorkspaceContext';
import GithubIcon from '../components/GithubIcon';
import ZorqenChecksSection from '../components/ZorqenChecksSection';
import AttackMapModule from '../components/AttackMapModule';
import TechStackSection from '../components/TechStackSection';

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

  const activityFeedItems = [
    { time: '2m ago', event: 'Assessment pipeline initialized on main', type: 'info' },
    { time: '1m ago', event: '153 codebase files indexed & mapped to AST', type: 'info' },
    { time: '45s ago', event: '42 static HTTP routes & endpoints extracted', type: 'info' },
    { time: '12s ago', event: 'Isolated sandbox container environment ready', type: 'success' },
  ];

  /* ── Empty State ─────────────────────────────────────────── */
  if (!currentRepo) {
    return (
      <div className="max-w-[1360px] mx-auto px-5 sm:px-10 pt-10 pb-16 fade-in space-y-12">
        
        {/* Platform Title */}
        <div className="space-y-4">
          <div className="protocol-tag">zorqen://platform/overview</div>
          <h1 className="text-4xl sm:text-[68px] lg:text-[80px] font-[900] text-[#0A0A0A] tracking-tighter leading-[1.04]">
            Security Validation <br />
            <span className="text-[#6B6B6B] font-semibold">for AI-built software.</span>
          </h1>
          <p className="hero-subtitle text-[20px] sm:text-[26px] text-[#1F1F1F] font-medium leading-[1.4] max-w-[800px]">
            Autonomous security validation and vulnerability remediation for repositories you control. Find it. Fix it. Prove it.
          </p>
        </div>

        {/* Workspace Action Banner */}
        <div
          onClick={connectGithub}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); connectGithub(); } }}
          className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-[16px] bg-white border-2 border-[#111111] shadow-hard hover:scale-[1.005] transition-all cursor-pointer select-none"
        >
          <div className="flex items-center gap-3 text-[14px] font-medium text-[#0A0A0A]">
            <GithubIcon className="w-5 h-5 text-[#111111] shrink-0" />
            <span className="font-extrabold text-[#0A0A0A]">GitHub Workspace</span>
            <span className="text-[#111111]/30">•</span>
            {githubConnected ? (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#C8FF2E] border border-[#111111] animate-pulse shrink-0" />
                <span>Connected <strong className="text-[#0A0A0A]">@{user?.github_login || 'iamdevdhanush'}</strong></span>
              </span>
            ) : (
              <span className="text-[#6B6B6B]">Not connected · OAuth required</span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[14px] font-extrabold text-[#0A0A0A] group-hover:translate-x-1 transition-transform">
            <span>{githubConnected ? 'Ready for validation' : 'Connect Workspace'}</span>
            <ArrowRight className="w-4 h-4 text-[#0A0A0A]" />
          </div>
        </div>

        {/* What ZORQEN Checks Component */}
        <ZorqenChecksSection />

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
  const riskBand = score == null ? null : score >= 80 ? 'LOW RISK' : score >= 60 ? 'MODERATE RISK' : 'HIGH RISK';
  const criticalHigh = counts.critical + counts.high;

  return (
    <div className="max-w-[1280px] mx-auto space-y-8 fade-in py-4 px-1 sm:px-0">
      
      {/* ── 1. HERO SECTION ───────────────────────────── */}
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="protocol-tag">zorqen://repository/security-posture</div>
            <h1 className="text-3xl sm:text-[56px] font-[900] text-[#0A0A0A] tracking-tighter leading-none mt-1">
              SECURITY VALIDATION <br />
              <span className="text-[#5E5E5E] font-bold">FOR AI-BUILT SOFTWARE.</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={startAssessment}
              disabled={running}
              className="btn btn-accent px-6 h-[48px] text-[14px] font-extrabold shadow-hard-sm min-h-[44px]"
            >
              <Play className="w-4 h-4 fill-current" />
              {running ? 'Pipeline Running…' : 'Run Assessment'}
            </button>
          </div>
        </div>

        <div className="h-[2px] bg-[#111111] w-full" />

        {/* Repository Target Card */}
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
              {arch?.primaryLanguage ? `${arch.primaryLanguage} • ${arch.dependencies} DEPS` : 'READY TO SCAN'}
            </div>
            <div className="flex items-center gap-2 mono text-[11px] font-extrabold text-[#111111] bg-[#C8FF2E] px-3 py-1.5 rounded-[8px] border border-[#111111] shadow-hard-sm">
              <GitBranch className="w-4 h-4 text-[#111111]" />
              <span>{branch}</span>
              <span className="text-[#111111] font-mono tabular-nums">@{commit.slice(0, 7)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. SECURITY SCORE & RECENT ACTIVITY STREAM ───────────────── */}
      <div className="grid lg:grid-cols-12 gap-6 items-stretch">
        {/* Score & Severity breakdown */}
        <div className="col-span-12 lg:col-span-8 panel grid lg:grid-cols-[280px_1fr] gap-6 items-center">
          <div className="border-b lg:border-b-0 lg:border-r-2 border-[#111111] pb-6 lg:pb-0 pr-0 lg:pr-6 flex flex-col justify-center">
            <div className="mono text-[11px] font-extrabold tracking-[0.18em] text-[#5E5E5E] uppercase mb-1">
              SECURITY SCORE
            </div>
            <div className="flex items-baseline gap-2">
              {score != null ? (
                <>
                  <span className="text-5xl sm:text-[60px] font-[900] text-[#0A0A0A] tracking-tighter leading-none tabular-nums">
                    <AnimatedNumber value={score} />
                  </span>
                  <span className="text-2xl sm:text-[30px] font-bold text-[#5E5E5E]">/100</span>
                </>
              ) : (
                <span className="text-4xl sm:text-[60px] font-[900] text-[#5E5E5E] tracking-tighter leading-none">
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
                <span className="chip text-[11px] px-3 py-1 uppercase font-extrabold">NOT STARTED</span>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5 text-[13px] font-bold">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-[8px] bg-[#FEE2E2] text-[#DC2626] border border-[#111111] shadow-hard-sm">
                <span className="font-mono font-bold text-[15px] tabular-nums">{counts.critical}</span> CRITICAL
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-[8px] bg-[#FFEDD5] text-[#C2410C] border border-[#111111] shadow-hard-sm">
                <span className="font-mono font-bold text-[15px] tabular-nums">{counts.high}</span> HIGH
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-[8px] bg-[#FEF3C7] text-[#B45309] border border-[#111111] shadow-hard-sm">
                <span className="font-mono font-bold text-[15px] tabular-nums">{counts.medium}</span> MEDIUM
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-[8px] bg-[#DBEAFE] text-[#1D4ED8] border border-[#111111] shadow-hard-sm">
                <span className="font-mono font-bold text-[15px] tabular-nums">{counts.low}</span> LOW
              </div>
            </div>

            <div className="text-base sm:text-[20px] font-extrabold text-[#0A0A0A] tracking-tight leading-snug">
              {criticalHigh > 0
                ? `“${criticalHigh} critical & high security finding${criticalHigh === 1 ? '' : 's'} require${criticalHigh === 1 ? 's' : ''} immediate engineering remediation.”`
                : findings.length > 0
                  ? '“No critical or high findings — remaining issues are lower priority.”'
                  : '“No findings yet — run an assessment to scan this repository.”'}
            </div>
          </div>
        </div>

        {/* Live Activity Stream (Requirement 11) */}
        <div className="col-span-12 lg:col-span-4 panel space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#111111]/15 pb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#111111]" />
              <span className="mono text-[11px] font-extrabold uppercase tracking-wider text-[#0A0A0A]">
                LIVE ACTIVITY FEED
              </span>
            </div>
            <span className="mono text-[10px] font-bold text-[#111111] bg-[#C8FF2E] px-2 py-0.5 rounded border border-[#111111]">
              SOC LIVE
            </span>
          </div>

          <div className="space-y-2.5 text-[12px]">
            {activityFeedItems.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2.5">
                <span className="mono text-[10.5px] font-bold text-[#6B6B6B] shrink-0 tabular-nums pt-0.5">
                  {item.time}
                </span>
                <span className="font-semibold text-[#0A0A0A] leading-snug">
                  {item.event}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 3. AI-REASONED ATTACK MAP ─── */}
      <AttackMapModule architecture={arch} />

      {/* ── 4. WHAT ZORQEN CHECKS ───────────────────────────────── */}
      <ZorqenChecksSection />

      {/* ── 5. DETECTED TECH STACK ────────────────────────────── */}
      <TechStackSection
        primaryLanguage={arch?.primaryLanguage}
        frameworks={arch?.frameworks}
        dependenciesCount={arch?.dependencies}
      />

      {/* ── 6. BIGGEST SECURITY FINDING ─────────────────── */}
      {biggestFinding && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-[22px] sm:text-[24px] font-extrabold text-[#0A0A0A] tracking-tight flex items-center gap-3">
              <ShieldAlert className="w-6 h-6 text-red-600 shrink-0" />
              BIGGEST SECURITY FINDING
            </h2>
            <button
              onClick={() => navigate(`/findings/${biggestFinding.id}`)}
              className="text-[13px] font-extrabold text-[#0A0A0A] hover:underline flex items-center gap-1 min-h-[44px]"
            >
              Investigate finding <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="panel space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <SevBadge sev={biggestFinding.severity} />
                <h3 className="text-xl sm:text-2xl font-extrabold text-[#0A0A0A] tracking-tight break-words">
                  {biggestFinding.title.toUpperCase()}
                </h3>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="chip mono font-bold">{biggestFinding.cwe_id}</span>
                <span className="chip ok font-bold tabular-nums">{biggestFinding.confidence_pct}% CONFIDENCE</span>
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
                <span className="mono font-bold text-[#0A0A0A] break-all tabular-nums">{biggestFinding.file_path}:{biggestFinding.line_number}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <p className="text-[14px] text-[#333333] font-medium max-w-[760px] leading-relaxed">
                {biggestFinding.root_cause}
              </p>

              <button
                onClick={() => navigate(`/findings/${biggestFinding.id}`)}
                className="btn btn-accent px-5 text-[13px] font-extrabold min-h-[44px]"
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