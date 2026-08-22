import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  GitBranch,
  Play,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Terminal,
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

  /* ── 1. LANDING PAGE VIEWPORT (When No Active Target Repo Selected) ───── */
  if (!currentRepo) {
    return (
      <div className="max-w-[1280px] mx-auto space-y-10 lg:space-y-12 fade-in">
        
        {/* Landing Hero Section */}
        <div className="space-y-4 max-w-[960px] text-left">
          <div className="protocol-tag">zorqen://platform/overview</div>
          <h1 className="text-hero">
            Autonomous Security Validation <br />
            <span className="text-[#333333] font-extrabold">for AI-built software.</span>
          </h1>
          <p className="text-body text-[#333333] max-w-[760px] leading-normal font-normal">
            Continuous threat validation and vulnerability remediation for repositories you control. Find it. Fix it. Prove it.
          </p>
        </div>

        {/* GitHub Workspace Clean Status Strip */}
        <div
          onClick={connectGithub}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); connectGithub(); } }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 rounded-[12px] bg-white border border-[#111111]/20 hover:border-[#111111] shadow-hard-sm transition-all cursor-pointer select-none"
        >
          <div className="flex items-center gap-3 text-[14px]">
            <div className="w-8 h-8 rounded-[8px] bg-[#111111] text-[#C7F11A] flex items-center justify-center shrink-0">
              <GithubIcon className="w-4 h-4 text-[#C7F11A]" />
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-extrabold text-[#111111]">GitHub Workspace</span>
              <span className="text-[#111111]/30">•</span>
              <span className="mono text-[12px] font-bold text-[#111111] bg-[#C7F11A] px-2 py-0.5 rounded border border-[#111111] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#111111]" />
                {githubConnected ? `Connected as @${user?.github_login || 'iamdevdhanush'}` : 'Disconnected'}
              </span>
              <span className="text-[#111111]/30">•</span>
              <span className="mono text-[11.5px] font-semibold text-[#555555]">READ-ONLY ACCESS</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[13.5px] font-extrabold text-[#111111] shrink-0">
            <span>{githubConnected ? 'Sync now' : 'Connect Account'}</span>
            <ArrowRight className="w-4 h-4 text-[#111111]" />
          </div>
        </div>

        {/* Connected Security Validation Pipeline (Compact 25% Reduced Height Workflow Cards) */}
        <div className="space-y-4">
          <div className="text-metadata">ZORQEN SECURITY VALIDATION PIPELINE</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="panel space-y-2 p-5">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-[8px] bg-[#C7F11A] border-2 border-[#111111] flex items-center justify-center font-mono font-extrabold text-[13px] text-[#111111]">
                  01
                </span>
                <span className="mono text-[11px] font-bold text-[#555555]">MODULE // AST</span>
              </div>
              <h3 className="text-card-title flex items-center gap-2 text-[18px]">
                <ShieldCheck className="w-4.5 h-4.5 text-[#111111]" />
                Static AST Analysis
              </h3>
              <p className="text-body text-[13.5px] text-[#333333] leading-snug">
                Deep call graph extraction and pattern matching for OWASP vulnerabilities across your codebase.
              </p>
            </div>

            <div className="panel space-y-2 p-5">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-[8px] bg-[#111111] text-[#C7F11A] border-2 border-[#111111] flex items-center justify-center font-mono font-extrabold text-[13px]">
                  02
                </span>
                <span className="mono text-[11px] font-bold text-[#555555]">MODULE // REASONING</span>
              </div>
              <h3 className="text-card-title flex items-center gap-2 text-[18px]">
                <Zap className="w-4.5 h-4.5 text-[#111111]" />
                AI Threat Reasoning
              </h3>
              <p className="text-body text-[13.5px] text-[#333333] leading-snug">
                Autonomous threat vector correlation and confidence scoring derived from repository data flow architecture.
              </p>
            </div>

            <div className="panel space-y-2 p-5">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-[8px] bg-[#F9F8F5] border-2 border-[#111111] flex items-center justify-center font-mono font-extrabold text-[13px] text-[#111111]">
                  03
                </span>
                <span className="mono text-[11px] font-bold text-[#555555]">MODULE // SANDBOX</span>
              </div>
              <h3 className="text-card-title flex items-center gap-2 text-[18px]">
                <Terminal className="w-4.5 h-4.5 text-[#111111]" />
                Sandbox Verification
              </h3>
              <p className="text-body text-[13.5px] text-[#333333] leading-snug">
                Safe isolated container reproduction verifying exploits and generating automated pull request patches.
              </p>
            </div>
          </div>
        </div>

        {/* What ZORQEN Checks Component */}
        <ZorqenChecksSection />

      </div>
    );
  }

  /* ── 2. DASHBOARD VIEW (When Target Repository is Active) ───────────── */
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
    <div className="max-w-[1280px] mx-auto space-y-8 lg:space-y-10 fade-in">
      
      {/* Editorial Hero Section */}
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="protocol-tag">zorqen://repository/security-posture</div>
            <h1 className="text-hero text-left">
              SECURITY VALIDATION <br />
              <span className="text-[#333333] font-extrabold">FOR AI-BUILT SOFTWARE.</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={startAssessment}
              disabled={running}
              className="btn btn-accent px-6 h-[48px] text-[14px] font-extrabold shadow-hard min-h-[44px]"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{running ? 'Pipeline Running…' : 'Run Assessment'}</span>
            </button>
          </div>
        </div>

        <div className="h-[2px] bg-[#111111] w-full" />

        {/* Repository Target Card */}
        <div className="panel flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-1.5 min-w-0">
            <div className="text-metadata">TARGET REPOSITORY</div>
            <div className="text-card-title text-[24px] sm:text-[28px] flex items-center gap-3 flex-wrap break-all">
              {currentRepo.owner}/{currentRepo.name}
              <span className="chip uppercase text-[10px] font-bold">{currentRepo.private ? 'Private' : 'Public'}</span>
            </div>
            <div className="text-[14px] text-[#333333] font-medium">
              Security posture for latest assessed snapshot.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[12px]">
            <div className="mono text-[11.5px] font-bold text-[#111111] bg-[#F9F8F5] px-3 py-2 rounded-[8px] border border-[#111111]/20 shadow-hard-sm">
              {arch?.primaryLanguage ? `${arch.primaryLanguage} • ${arch.dependencies} DEPS` : 'READY TO SCAN'}
            </div>
            <div className="flex items-center gap-2 mono text-[11.5px] font-extrabold text-[#111111] bg-[#C7F11A] px-3 py-2 rounded-[8px] border-2 border-[#111111] shadow-hard-sm">
              <GitBranch className="w-4 h-4 text-[#111111]" />
              <span>{branch}</span>
              <span className="text-[#111111] font-mono tabular-nums">@{commit.slice(0, 7)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Security Score & Live Activity Stream */}
      <div className="grid lg:grid-cols-12 gap-6 items-stretch">
        <div className="col-span-12 lg:col-span-8 panel grid lg:grid-cols-[280px_1fr] gap-6 items-center">
          <div className="border-b lg:border-b-0 lg:border-r-2 border-[#111111]/20 pb-6 lg:pb-0 pr-0 lg:pr-6 flex flex-col justify-center">
            <div className="text-metadata mb-1">SECURITY SCORE</div>
            <div className="flex items-baseline gap-2">
              {score != null ? (
                <>
                  <span className="text-5xl sm:text-[60px] font-[900] text-[#111111] tracking-tighter leading-none tabular-nums">
                    <AnimatedNumber value={score} />
                  </span>
                  <span className="text-2xl sm:text-[30px] font-bold text-[#555555]">/100</span>
                </>
              ) : (
                <span className="text-4xl sm:text-[60px] font-[900] text-[#555555] tracking-tighter leading-none">
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
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-[8px] bg-[#FEE2E2] text-[#DC2626] border border-[#111111]/20 shadow-hard-sm">
                <span className="font-mono font-bold text-[15px] tabular-nums">{counts.critical}</span> CRITICAL
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-[8px] bg-[#FFEDD5] text-[#C2410C] border border-[#111111]/20 shadow-hard-sm">
                <span className="font-mono font-bold text-[15px] tabular-nums">{counts.high}</span> HIGH
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-[8px] bg-[#FEF3C7] text-[#B45309] border border-[#111111]/20 shadow-hard-sm">
                <span className="font-mono font-bold text-[15px] tabular-nums">{counts.medium}</span> MEDIUM
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-[8px] bg-[#DBEAFE] text-[#1D4ED8] border border-[#111111]/20 shadow-hard-sm">
                <span className="font-mono font-bold text-[15px] tabular-nums">{counts.low}</span> LOW
              </div>
            </div>

            <div className="text-base sm:text-[20px] font-extrabold text-[#111111] tracking-tight leading-snug">
              {criticalHigh > 0
                ? `“${criticalHigh} critical & high security finding${criticalHigh === 1 ? '' : 's'} require${criticalHigh === 1 ? 's' : ''} immediate engineering remediation.”`
                : findings.length > 0
                  ? '“No critical or high findings — remaining issues are lower priority.”'
                  : '“No findings yet — run an assessment to scan this repository.”'}
            </div>
          </div>
        </div>

        {/* Live Activity Stream */}
        <div className="col-span-12 lg:col-span-4 panel space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#111111]/15 pb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#111111]" />
              <span className="mono text-[11px] font-extrabold uppercase tracking-wider text-[#111111]">
                LIVE ACTIVITY FEED
              </span>
            </div>
            <span className="mono text-[10px] font-bold text-[#111111] bg-[#C7F11A] px-2 py-0.5 rounded border border-[#111111]">
              SOC LIVE
            </span>
          </div>

          <div className="space-y-2.5 text-[12.5px]">
            {activityFeedItems.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2.5">
                <span className="mono text-[10.5px] font-bold text-[#5E5E5E] shrink-0 tabular-nums pt-0.5">
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

      {/* AI-Reasoned Attack Map */}
      <AttackMapModule architecture={arch} />

      {/* What ZORQEN Checks */}
      <ZorqenChecksSection />

      {/* Tech Stack Section */}
      <TechStackSection
        primaryLanguage={arch?.primaryLanguage}
        frameworks={arch?.frameworks}
        dependenciesCount={arch?.dependencies}
      />

      {/* Biggest Finding Section */}
      {biggestFinding && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-[22px] sm:text-[24px] font-extrabold text-[#0A0A0A] tracking-tight flex items-center gap-3">
              <ShieldAlert className="w-6 h-6 text-red-600 shrink-0" />
              BIGGEST SECURITY FINDING
            </h2>
            <button
              onClick={() => navigate(`/findings/${biggestFinding.id}`)}
              className="text-[13.5px] font-extrabold text-[#0A0A0A] hover:underline flex items-center gap-1 min-h-[44px]"
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
              <p className="text-[14.5px] text-[#333333] font-medium max-w-[760px] leading-relaxed">
                {biggestFinding.root_cause}
              </p>

              <button
                onClick={() => navigate(`/findings/${biggestFinding.id}`)}
                className="btn btn-accent px-6 text-[13.5px] font-extrabold min-h-[44px]"
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