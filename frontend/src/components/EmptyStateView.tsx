import { memo } from 'react';
import { RefreshCw, Check, ArrowRight, ExternalLink } from 'lucide-react';
import GithubIcon from './GithubIcon';
import { AntiMetalButton } from './ui/anti-metal-button';
import { EmptyStateIllustrationDotAccent } from './SelectiveDotGrid';

interface EmptyStateViewProps {
  type: 'auth' | 'temporary' | 'no-data' | 'clean-pass';
  title?: string;
  subtitle?: string;
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
}

function SecurityIllustration() {
  return (
    <div className="relative w-36 h-36 mx-auto flex items-center justify-center my-2">
      {/* 5. Editorial Dot Accent: Behind the empty-state illustration on Repositories */}
      <EmptyStateIllustrationDotAccent />

      {/* Concentric Radar Grid Rings */}
      <svg className="w-full h-full relative z-1" viewBox="0 0 144 144" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="72" cy="72" r="64" stroke="#111111" strokeWidth="2" strokeDasharray="4 4" opacity="0.25" />
        <circle cx="72" cy="72" r="48" stroke="#111111" strokeWidth="2" opacity="0.35" />
        <circle cx="72" cy="72" r="32" stroke="#111111" strokeWidth="2" strokeDasharray="3 3" opacity="0.5" />
        
        {/* Crosshair Grid Lines */}
        <line x1="72" y1="8" x2="72" y2="136" stroke="#111111" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.2" />
        <line x1="8" y1="72" x2="136" y2="72" stroke="#111111" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.2" />
        
        {/* Radar Rotating Node Reticle */}
        <circle cx="72" cy="72" r="24" fill="#C8F31D" stroke="#111111" strokeWidth="2" />
        
        {/* Shield Geometry */}
        <path
          d="M72 58L60 64V76C60 84 66 90 72 93C78 90 84 84 84 76V64L72 58Z"
          fill="#111111"
          stroke="#111111"
          strokeWidth="2"
        />
        <path
          d="M68 75L71 78L77 71"
          stroke="#C8F31D"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Orbit Satellite Nodes */}
        <circle cx="106" cy="48" r="4" fill="#111111" />
        <circle cx="38" cy="96" r="3" fill="#C8F31D" stroke="#111111" strokeWidth="1.5" />
        <circle cx="112" cy="88" r="3" fill="#111111" />
      </svg>
    </div>
  );
}

export const EmptyStateView = memo(function EmptyStateView({
  type,
  title,
  subtitle,
  onAction,
  actionLabel,
  className = '',
}: EmptyStateViewProps) {
  if (type === 'clean-pass') {
    return (
      <div className={`p-8 sm:p-12 text-center space-y-6 bg-white border-2 border-[#111111] rounded-[20px] shadow-hard ${className}`}>
        <SecurityIllustration />

        <div className="space-y-2 max-w-[480px] mx-auto">
          <h3 className="text-2xl font-extrabold text-[#111111] tracking-tight">
            {title || 'Repository passed validation.'}
          </h3>
          <p className="text-[14.5px] text-[#525252] font-medium leading-relaxed">
            {subtitle || 'Zero unhandled findings or vulnerable attack vectors were detected in this snapshot.'}
          </p>
        </div>

        {/* Validation Posture Matrix */}
        <div className="p-4 rounded-[14px] bg-[#F9F8F5] border-2 border-[#111111] max-w-[480px] mx-auto grid grid-cols-2 gap-3 text-left">
          <div className="flex items-center gap-2 text-[12.5px] font-bold text-[#111111]">
            <Check className="w-4 h-4 text-[#111111] stroke-[3]" />
            <span>OWASP Top 10 ✓</span>
          </div>
          <div className="flex items-center gap-2 text-[12.5px] font-bold text-[#111111]">
            <Check className="w-4 h-4 text-[#111111] stroke-[3]" />
            <span>Secrets Scanner ✓</span>
          </div>
          <div className="flex items-center gap-2 text-[12.5px] font-bold text-[#111111]">
            <Check className="w-4 h-4 text-[#111111] stroke-[3]" />
            <span>Dependencies ✓</span>
          </div>
          <div className="flex items-center gap-2 text-[12.5px] font-bold text-[#111111]">
            <Check className="w-4 h-4 text-[#111111] stroke-[3]" />
            <span>Sandbox Verified ✓</span>
          </div>
        </div>

        {onAction && (
          <div className="pt-3">
            <button
              onClick={onAction}
              className="btn btn-accent px-8 h-[48px] text-[14px] font-extrabold gap-2 inline-flex shadow-hard-sm min-h-[44px]"
            >
              <span>{actionLabel || 'Schedule Daily Validation'}</span>
              <ArrowRight className="w-4 h-4 stroke-[2px]" />
            </button>
          </div>
        )}
      </div>
    );
  }

  if (type === 'auth') {
    return (
      <div
        className={`relative overflow-hidden rounded-[20px] bg-white border-2 border-[#111111] shadow-hard transition-all duration-[180ms] ${className}`}
        style={{ minHeight: '420px' }}
      >
        {/* Subtle dotted pattern — top-right corner only */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 right-0 w-[260px] h-[260px]"
          style={{
            backgroundImage: 'radial-gradient(circle, #111111 1px, transparent 1px)',
            backgroundSize: '18px 18px',
            opacity: 0.05,
            maskImage: 'radial-gradient(ellipse 100% 100% at 100% 0%, black 20%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse 100% 100% at 100% 0%, black 20%, transparent 75%)',
          }}
        />

        {/* Layout: two columns on desktop */}
        <div className="relative z-10 flex flex-col lg:flex-row h-full">

          {/* ── Left Column ─────────────────────────────────────── */}
          <div className="flex-1 p-8 sm:p-10 lg:p-12 flex flex-col justify-between gap-8">

            {/* Top: label + heading + description */}
            <div className="space-y-6">
              {/* Eyebrow label */}
              <div className="flex items-center gap-2.5">
                <span
                  className="inline-block w-2 h-2 rounded-full bg-[#C8F31D] border border-[#111111]"
                  aria-hidden="true"
                />
                <span className="mono text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-[#525252]">
                  GitHub Authorization Required
                </span>
              </div>

              {/* Heading */}
              <div className="space-y-3">
                <h2 className="text-[28px] sm:text-[34px] font-extrabold text-[#111111] tracking-tight leading-[1.05]">
                  Connect GitHub<br />Workspace
                </h2>
                <p className="text-[15px] text-[#525252] font-medium leading-[1.65] max-w-[520px]">
                  Authorize your GitHub account to analyze repositories with static AST analysis, AI threat reasoning, and sandbox verification.
                </p>
              </div>

              {/* Trust indicators */}
              <div className="space-y-3 pt-1">
                {[
                  'Read-only repository access',
                  'No code modifications without approval',
                  'Encrypted repository metadata',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <span
                      className="flex-shrink-0 w-[7px] h-[7px] rounded-full bg-[#C8F31D] border border-[#111111]"
                      aria-hidden="true"
                    />
                    <span className="text-[13.5px] text-[#333333] font-semibold">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom: CTA cluster */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
              {onAction && (
                <AntiMetalButton
                  id="connect-github-cta"
                  onClick={onAction}
                  icon={<GithubIcon className="w-[18px] h-[18px] text-white" aria-label="GitHub" />}
                  rightIcon={<ArrowRight className="w-4 h-4 stroke-[2.5px]" />}
                  className="w-full sm:w-auto"
                >
                  {actionLabel || 'Connect GitHub'}
                </AntiMetalButton>
              )}
              <button
                onClick={() => window.open('https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps', '_blank', 'noopener')}
                className="inline-flex items-center justify-center gap-1.5 h-[52px] px-5 rounded-[14px] bg-transparent text-[#525252] text-[13.5px] font-semibold border-2 border-transparent hover:border-[#111111]/20 hover:text-[#111111] transition-all duration-[180ms] w-full sm:w-auto"
              >
                <ExternalLink className="w-3.5 h-3.5 stroke-[2px]" />
                <span>Learn how permissions work</span>
              </button>
            </div>
          </div>

          {/* ── Right Column — info cards ────────────────────────── */}
          <div className="lg:w-[220px] xl:w-[240px] flex-shrink-0 border-t-2 lg:border-t-0 lg:border-l-2 border-[#111111]/10 p-6 lg:p-8 flex flex-row lg:flex-col gap-3 overflow-x-auto lg:overflow-visible lg:justify-start">
            {[
              {
                label: 'READ-ONLY',
                desc: 'Repository metadata only.',
              },
              {
                label: 'AST',
                desc: 'Static code analysis.',
              },
              {
                label: 'SANDBOX',
                desc: 'Isolated validation.',
              },
            ].map(({ label, desc }) => (
              <div
                key={label}
                className="flex-shrink-0 w-[160px] lg:w-auto p-4 rounded-[14px] border-2 border-[#111111]/15 bg-[#F9F8F5] hover:border-[#111111]/40 hover:-translate-y-0.5 hover:shadow-hard-sm transition-all duration-[180ms] cursor-default"
              >
                <div className="mono text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#111111] mb-1.5">
                  {label}
                </div>
                <div className="text-[12.5px] text-[#525252] font-medium leading-snug">
                  {desc}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    );
  }

  if (type === 'temporary') {
    return (
      <div className={`p-8 sm:p-12 text-center space-y-6 bg-white border-2 border-[#111111] rounded-[20px] shadow-hard ${className}`}>
        <div className="w-16 h-16 rounded-full bg-[#F9F8F5] text-[#111111] border-2 border-[#111111] shadow-hard-sm flex items-center justify-center mx-auto">
          <RefreshCw className="w-6 h-6 text-[#111111] stroke-[2px]" />
        </div>
        <div className="space-y-2 max-w-[460px] mx-auto">
          <h3 className="text-2xl font-extrabold text-[#111111] tracking-tight">
            {title || "Couldn't load repository metadata."}
          </h3>
          <p className="text-[14.5px] text-[#525252] font-medium leading-relaxed">
            {subtitle || 'A temporary communication error occurred while fetching tree metadata from GitHub.'}
          </p>
        </div>
        {onAction && (
          <div className="pt-2">
            <button
              onClick={onAction}
              className="btn bg-white border-2 border-[#111111] text-[#111111] px-8 h-[48px] text-[14px] font-extrabold gap-2 inline-flex shadow-hard-sm hover:bg-[#FAFAFA] min-h-[44px]"
            >
              <RefreshCw className="w-[18px] h-[18px] stroke-[2px]" />
              <span>{actionLabel || 'Retry Sync'}</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`p-8 text-center text-[#525252] mono text-[13.5px] bg-white border-2 border-[#111111] rounded-[20px] shadow-hard-sm ${className}`}>
      {title || 'No data available for this section.'}
    </div>
  );
});

export default EmptyStateView;
