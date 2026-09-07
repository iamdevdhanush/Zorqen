import { memo } from 'react';
import { RefreshCw, Check, ArrowRight } from 'lucide-react';
import GithubIcon from './GithubIcon';

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
      {/* Concentric Radar Grid Rings */}
      <svg className="w-full h-full" viewBox="0 0 144 144" fill="none" xmlns="http://www.w3.org/2000/svg">
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
      <div className={`p-8 sm:p-12 text-center space-y-6 bg-white border-2 border-[#111111] rounded-[20px] shadow-hard ${className}`}>
        <SecurityIllustration />
        
        <div className="space-y-2 max-w-[460px] mx-auto">
          <h3 className="text-2xl font-extrabold text-[#111111] tracking-tight">
            {title || 'GitHub connection required.'}
          </h3>
          <p className="text-[14.5px] text-[#525252] font-medium leading-relaxed">
            {subtitle || 'Connect your GitHub account with read-only permissions to list and validate your repositories.'}
          </p>
        </div>

        {onAction && (
          <div className="pt-2">
            <button
              onClick={onAction}
              className="btn btn-accent px-8 h-[48px] text-[14px] font-extrabold gap-2.5 inline-flex shadow-hard-sm min-h-[44px]"
            >
              <GithubIcon className="w-[18px] h-[18px] text-[#111111]" />
              <span>{actionLabel || 'Connect GitHub Account'}</span>
            </button>
          </div>
        )}
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
