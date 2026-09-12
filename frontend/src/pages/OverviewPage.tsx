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
import {
  PageCornerDotAccent,
} from '../components/SelectiveDotGrid';

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
      <div className="relative max-w-[1280px] mx-auto fade-in overflow-hidden">

        {/* ══════════════════════════════════════════════════════════════════
            HERO SECTION — Editorial Brutalist Premium (Typography as Hero)
            12-column grid: 8 cols left content (~67%), 4 cols negative space.
            Subtle dot accent ONLY in upper-right corner (5–8% opacity).
            Zero right-side decorative visual elements.
        ══════════════════════════════════════════════════════════════════ */}
        <div className="relative pt-10 sm:pt-14 md:pt-18 lg:pt-24 pb-16 sm:pb-20 lg:pb-28 overflow-visible">

          {/* Subtle black dot pattern ONLY in the upper-right corner behind intentional negative space (5–8% opacity) */}
          <div
            aria-hidden="true"
            className="hidden md:block absolute top-0 right-0 w-[460px] lg:w-[580px] h-[360px] lg:h-[440px] pointer-events-none select-none z-0"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(17, 17, 17, 0.07) 1.5px, transparent 1.5px)',
              backgroundSize: '18px 18px',
              WebkitMaskImage: 'radial-gradient(ellipse at 80% 20%, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 45%, transparent 75%)',
              maskImage: 'radial-gradient(ellipse at 80% 20%, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 45%, transparent 75%)',
            }}
          />

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 relative z-1 items-start">
            
            {/* ── LEFT COLUMN: 8 Columns (~65–70% Desktop width), 100% Mobile ── */}
            <div className="col-span-1 md:col-span-8 flex flex-col justify-center relative z-10 w-full max-w-[680px]">

              {/* Protocol Badge: 28px margin to headline */}
              <div className="relative z-1 mb-[28px]">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[8px] bg-white border-2 border-[#111111] shadow-hard-sm mono text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#111111]">
                  <span className="w-2 h-2 rounded-full bg-[#C8F31D] border border-[#111111] animate-pulse" />
                  <span>zorqen://platform/overview</span>
                </div>
              </div>

              {/* Headline: Typography is the Hero (88–96px desktop, 64px tablet, 42–48px mobile, 900 weight, 0.9 line-height) */}
              <div className="relative z-1 mb-[32px]">
                <h1 className="text-[#111111] font-[900] text-[42px] sm:text-[48px] md:text-[64px] lg:text-[88px] xl:text-[94px] leading-[0.9] tracking-[-0.035em]">
                  Autonomous Security Validation
                  <br />
                  <span className="text-[#444444]">for AI-built software.</span>
                </h1>
              </div>

              {/* Description: 32px from headline, 44px to CTA card */}
              <div className="relative z-1 mb-[44px]">
                <p className="text-[#333333] font-normal text-[17px] sm:text-[18px] max-w-[640px] leading-[1.6]">
                  Continuous threat validation and vulnerability remediation for repositories you control.
                  Find it. Fix it. Prove it.
                </p>
              </div>

              {/* GitHub CTA Card: Full-width beneath description, thick 4px border, large radius, unified baseline */}
              <div className="relative z-1 w-full max-w-[680px]">
                <div
                  onClick={connectGithub}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); connectGithub(); }
                  }}
                  className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-5 p-6 sm:py-7 sm:px-8 rounded-[24px] bg-white border-4 border-[#111111] shadow-[5px_5px_0px_#111111] hover:shadow-[7px_7px_0px_#111111] hover:-translate-y-[1.5px] active:translate-y-0 transition-all duration-150 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-[14px] bg-[#F4F2EC] border-2 border-[#111111] flex items-center justify-center shrink-0 shadow-hard-sm">
                      <GithubIcon className="w-6 h-6 text-[#111111]" aria-label="GitHub" />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-extrabold text-[#111111] text-[16px] tracking-tight">GitHub Workspace</span>
                        <span className="chip ok text-[11px] font-bold py-0.5 px-2.5 inline-flex items-center gap-1.5 border-1.5 border-[#111111]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#111111]" />
                          {githubConnected
                            ? `@${user?.github_login || 'iamdevdhanush'}`
                            : 'Disconnected'}
                        </span>
                      </div>
                      <div className="mono text-[11px] font-bold text-[#525252] tracking-wider">
                        READ-ONLY INTEGRATION // ENCRYPTED
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center sm:shrink-0 w-full sm:w-auto">
                    <div className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-5 py-3 rounded-[14px] bg-[#111111] text-white hover:bg-[#C8F31D] hover:text-[#111111] font-extrabold text-[14px] border-2 border-[#111111] hover:-translate-y-0.5 transition-all duration-150 shrink-0 shadow-hard-sm">
                      <span>{githubConnected ? 'Sync Workspace' : 'Connect Account'}</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5px]" />
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* ── RIGHT COLUMN: 4 Columns Intentional Negative Space (Desktop only) ── */}
            <div className="hidden md:block md:col-span-4 relative pointer-events-none" aria-hidden="true" />

          </div>
        </div>
        {/* ══════════════════════════════════════════════ END HERO ══════ */}

        {/* Connected Security Validation Pipeline */}
        <div className="space-y-5 relative z-1 pb-8 lg:pb-10">
          <div className="section-label">ZORQEN SECURITY VALIDATION PIPELINE</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">

            {/* Module 01 — AST */}
            <div className="p-6 rounded-[20px] bg-white border-2 border-[#111111] shadow-hard space-y-4 interactive-card">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-[10px] bg-[#C8F31D] border-2 border-[#111111] flex items-center justify-center shadow-hard-sm">
                  <ShieldCheck className="w-5 h-5 text-[#111111] stroke-[2px]" aria-hidden="true" />
                </div>
                <span className="module-badge active">01</span>
              </div>
              <div>
                <h3 className="font-extrabold text-[16px] text-[#111111] tracking-tight leading-snug">Static AST Analysis</h3>
                <div className="mono text-[11px] text-[#525252] font-semibold mt-0.5">MODULE // AST</div>
              </div>
              <p className="text-[13.5px] text-[#525252] leading-relaxed font-medium">
                Deep call graph extraction and pattern matching for OWASP vulnerabilities across your codebase.
              </p>
            </div>

            {/* Module 02 — AI Reasoning */}
            <div className="p-6 rounded-[20px] bg-white border-2 border-[#111111] shadow-hard space-y-4 interactive-card">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-[10px] bg-[#111111] border-2 border-[#111111] flex items-center justify-center shadow-hard-sm">
                  <Zap className="w-5 h-5 text-[#C8F31D] stroke-[2px]" aria-hidden="true" />
                </div>
                <span className="module-badge inverted">02</span>
              </div>
              <div>
                <h3 className="font-extrabold text-[16px] text-[#111111] tracking-tight leading-snug">AI Threat Reasoning</h3>
                <div className="mono text-[11px] text-[#525252] font-semibold mt-0.5">MODULE // REASONING</div>
              </div>
              <p className="text-[13.5px] text-[#525252] leading-relaxed font-medium">
                Autonomous threat vector correlation and confidence scoring derived from repository data flow architecture.
              </p>
            </div>

            {/* Module 03 — Sandbox */}
            <div className="p-6 rounded-[20px] bg-white border-2 border-[#111111] shadow-hard space-y-4 interactive-card">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-[10px] bg-[#F9F8F5] border-2 border-[#111111] flex items-center justify-center shadow-hard-sm">
                  <Terminal className="w-5 h-5 text-[#111111] stroke-[2px]" aria-hidden="true" />
                </div>
                <span className="module-badge">03</span>
              </div>
              <div>
                <h3 className="font-extrabold text-[16px] text-[#111111] tracking-tight leading-snug">Sandbox Verification</h3>
                <div className="mono text-[11px] text-[#525252] font-semibold mt-0.5">MODULE // SANDBOX</div>
              </div>
              <p className="text-[13.5px] text-[#525252] leading-relaxed font-medium">
                Safe isolated container reproduction verifying exploits and generating automated pull request patches.
              </p>
            </div>
          </div>
        </div>

        {/* What ZORQEN Checks Component */}
        <div className="relative z-1 pb-10 lg:pb-14">
          <ZorqenChecksSection />
        </div>

        {/* Bottom-right corner subtle dot accent */}
        <PageCornerDotAccent />

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
    <div className="max-w-[1280px] mx-auto space-y-6 lg:space-y-8 fade-in">
      
      {/* Compressed Editorial Hero Section */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="protocol-tag">zorqen://repository/security-posture</div>
            <h1 className="text-hero text-left">
              SECURITY VALIDATION <br />
              <span className="text-[#333333] font-extrabold">FOR AI-BUILT SOFTWARE.</span>
            </h1>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={startAssessment}
              disabled={running}
              className="btn btn-accent px-6 h-[48px] text-[14px] font-extrabold shadow-hard min-h-[44px]"
            >
              <Play className="w-[18px] h-[18px] fill-current" />
              <span>{running ? 'Pipeline Running…' : 'Run Assessment'}</span>
            </button>
          </div>
        </div>

        <div className="h-[2px] bg-[#111111] w-full" />

        {/* Repository Target Card */}
        <div className="panel flex flex-wrap items-center justify-between gap-6 p-6">
          <div className="space-y-1.5 min-w-0">
            <div className="text-metadata">TARGET REPOSITORY</div>
            <div className="text-card-title text-[22px] sm:text-[26px] flex items-center gap-3 flex-wrap break-all">
              {currentRepo.owner}/{currentRepo.name}
              <span className="chip uppercase text-[10px] font-bold">{currentRepo.private ? 'Private' : 'Public'}</span>
            </div>
            <div className="text-[14px] text-[#333333] font-medium">
              Security posture for latest assessed snapshot.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[12px]">
            <div className="mono text-[11.5px] font-bold text-[#111111] bg-[#F9F8F5] px-3 py-2 rounded-full border-1.5 border-[#111111] shadow-hard-sm">
              {arch?.primaryLanguage ? `${arch.primaryLanguage} • ${arch.dependencies} DEPS` : 'READY TO SCAN'}
            </div>
            <div className="flex items-center gap-2 mono text-[11.5px] font-extrabold text-[#111111] bg-[#C8F31D] px-3.5 py-2 rounded-full border-1.5 border-[#111111] shadow-hard-sm">
              <GitBranch className="w-4 h-4 text-[#111111] stroke-[2px]" />
              <span>{branch}</span>
              <span className="text-[#111111] font-mono tabular-nums">@{commit.slice(0, 7)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Security Score & Live Activity Stream */}
      <div className="grid lg:grid-cols-12 gap-6 items-stretch">
        <div className="col-span-12 lg:col-span-8 panel grid lg:grid-cols-[260px_1fr] gap-6 items-center p-6">
          <div className="border-b lg:border-b-0 lg:border-r-2 border-[#111111] pb-6 lg:pb-0 pr-0 lg:pr-6 flex flex-col justify-center">
            <div className="text-metadata mb-1">SECURITY SCORE</div>
            <div className="flex items-baseline gap-2">
              {score != null ? (
                <>
                  <span className="text-5xl sm:text-[56px] font-[900] text-[#111111] tracking-tighter leading-none tabular-nums">
                    <AnimatedNumber value={score} />
                  </span>
                  <span className="text-2xl sm:text-[28px] font-bold text-[#525252]">/100</span>
                </>
              ) : (
                <span className="text-4xl sm:text-[56px] font-[900] text-[#525252] tracking-tighter leading-none">
                  —
                </span>
              )}
            </div>
            <div className="mt-4">
              {riskBand ? (
                <span className={`chip text-[11px] px-3.5 py-1 uppercase font-extrabold ${riskBand === 'HIGH RISK' ? 'sev-critical' : riskBand === 'MODERATE RISK' ? 'sev-high' : 'ok'}`}>
                  {riskBand}
                </span>
              ) : (
                <span className="chip text-[11px] px-3.5 py-1 uppercase font-extrabold">NOT STARTED</span>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 text-[12.5px] font-bold">
              <div className="chip sev-critical text-[11.5px] font-extrabold">
                <span className="font-mono font-bold tabular-nums">{counts.critical}</span> CRITICAL
              </div>
              <div className="chip sev-high text-[11.5px] font-extrabold">
                <span className="font-mono font-bold tabular-nums">{counts.high}</span> HIGH
              </div>
              <div className="chip sev-medium text-[11.5px] font-extrabold">
                <span className="font-mono font-bold tabular-nums">{counts.medium}</span> MEDIUM
              </div>
              <div className="chip sev-low text-[11.5px] font-extrabold">
                <span className="font-mono font-bold tabular-nums">{counts.low}</span> LOW
              </div>
            </div>

            <div className="text-base sm:text-[19px] font-extrabold text-[#111111] tracking-tight leading-snug">
              {criticalHigh > 0
                ? `“${criticalHigh} critical & high security finding${criticalHigh === 1 ? '' : 's'} require${criticalHigh === 1 ? 's' : ''} immediate engineering remediation.”`
                : findings.length > 0
                  ? '“No critical or high findings — remaining issues are lower priority.”'
                  : '“No findings yet — run an assessment to scan this repository.”'}
            </div>
          </div>
        </div>

        {/* Live Activity Stream */}
        <div className="col-span-12 lg:col-span-4 panel space-y-3 flex flex-col justify-between p-6">
          <div className="flex items-center justify-between border-b-2 border-[#111111] pb-2.5">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#111111] stroke-[2px]" />
              <span className="mono text-[11px] font-extrabold uppercase tracking-wider text-[#111111]">
                LIVE ACTIVITY FEED
              </span>
            </div>
            <span className="chip ok text-[10px] font-extrabold">
              SOC LIVE
            </span>
          </div>

          <div className="space-y-2.5 text-[12.5px]">
            {activityFeedItems.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2.5">
                <span className="mono text-[10.5px] font-bold text-[#525252] shrink-0 tabular-nums pt-0.5">
                  {item.time}
                </span>
                <span className="font-semibold text-[#111111] leading-snug">
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
            <h2 className="text-[20px] sm:text-[22px] font-extrabold text-[#111111] tracking-tight flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 stroke-[2px]" />
              BIGGEST SECURITY FINDING
            </h2>
            <button
              onClick={() => navigate(`/findings/${biggestFinding.id}`)}
              className="text-[13.5px] font-extrabold text-[#111111] hover:underline flex items-center gap-1.5 min-h-[44px]"
            >
              <span>Investigate finding</span>
              <ArrowRight className="w-4 h-4 stroke-[2px]" />
            </button>
          </div>

          <div className="panel space-y-6 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <SevBadge sev={biggestFinding.severity} />
                <h3 className="text-xl sm:text-2xl font-extrabold text-[#111111] tracking-tight break-words">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13px] border-y-2 border-[#111111] py-4 bg-[#F9F8F5] px-4 rounded-[12px]">
              <div className="min-w-0">
                <span className="text-[#525252] font-bold">ENDPOINT: </span>
                <span className="mono font-bold text-[#111111] break-all">{biggestFinding.endpoint || '—'}</span>
              </div>
              <div className="min-w-0">
                <span className="text-[#525252] font-bold">LOCATION: </span>
                <span className="mono font-bold text-[#111111] break-all tabular-nums">{biggestFinding.file_path}:{biggestFinding.line_number}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <p className="text-[14.5px] text-[#333333] font-medium max-w-[760px] leading-relaxed">
                {biggestFinding.root_cause}
              </p>

              <button
                onClick={() => navigate(`/findings/${biggestFinding.id}`)}
                className="btn btn-accent px-6 h-[48px] text-[13.5px] font-extrabold min-h-[44px]"
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