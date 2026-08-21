import { memo } from 'react';
import { Lock, RefreshCw, ShieldCheck, Check, ArrowRight } from 'lucide-react';
import GithubIcon from './GithubIcon';

interface EmptyStateViewProps {
  type: 'auth' | 'temporary' | 'no-data' | 'clean-pass';
  title?: string;
  subtitle?: string;
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
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
      <div className={`p-8 sm:p-10 text-center space-y-5 bg-white border-2 border-[#111111] rounded-[18px] shadow-hard ${className}`}>
        <div className="w-14 h-14 rounded-full bg-[#C8FF2E] text-[#111111] border-2 border-[#111111] shadow-hard-sm flex items-center justify-center mx-auto">
          <ShieldCheck className="w-7 h-7 text-[#111111]" />
        </div>

        <div className="space-y-1.5 max-w-[480px] mx-auto">
          <h3 className="text-xl font-extrabold text-[#0A0A0A] tracking-tight">
            {title || 'Repository passed validation.'}
          </h3>
          <p className="text-[14px] text-[#5E5E5E] font-medium leading-relaxed">
            {subtitle || 'Zero unhandled findings or vulnerable attack vectors were detected in this snapshot.'}
          </p>
        </div>

        {/* Validation Posture Matrix */}
        <div className="p-4 rounded-[12px] bg-[#FAFAFA] border border-[#111111]/20 max-w-[480px] mx-auto grid grid-cols-2 gap-3 text-left">
          <div className="flex items-center gap-2 text-[12.5px] font-bold text-[#0A0A0A]">
            <Check className="w-4 h-4 text-[#111111] stroke-[3]" />
            <span>OWASP Top 10 ✓</span>
          </div>
          <div className="flex items-center gap-2 text-[12.5px] font-bold text-[#0A0A0A]">
            <Check className="w-4 h-4 text-[#111111] stroke-[3]" />
            <span>Secrets Scanner ✓</span>
          </div>
          <div className="flex items-center gap-2 text-[12.5px] font-bold text-[#0A0A0A]">
            <Check className="w-4 h-4 text-[#111111] stroke-[3]" />
            <span>Dependencies ✓</span>
          </div>
          <div className="flex items-center gap-2 text-[12.5px] font-bold text-[#0A0A0A]">
            <Check className="w-4 h-4 text-[#111111] stroke-[3]" />
            <span>Sandbox Verified ✓</span>
          </div>
        </div>

        {onAction && (
          <div className="pt-2">
            <button
              onClick={onAction}
              className="btn btn-accent px-6 h-[48px] text-[14px] font-extrabold gap-2 inline-flex shadow-hard-sm min-h-[44px]"
            >
              <span>{actionLabel || 'Schedule Daily Validation'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    );
  }

  if (type === 'auth') {
    return (
      <div className={`p-8 sm:p-10 text-center space-y-4 bg-white border-2 border-[#111111] rounded-[18px] shadow-hard ${className}`}>
        <div className="w-14 h-14 rounded-full bg-[#111111] text-[#C8FF2E] border-2 border-[#111111] shadow-hard-sm flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6 text-[#C8FF2E]" />
        </div>
        <div className="space-y-1.5 max-w-[460px] mx-auto">
          <h3 className="text-xl font-extrabold text-[#0A0A0A] tracking-tight">
            {title || 'GitHub connection required.'}
          </h3>
          <p className="text-[14px] text-[#5E5E5E] font-medium leading-relaxed">
            {subtitle || 'Reconnect your GitHub account to inspect and validate this repository.'}
          </p>
        </div>
        {onAction && (
          <button
            onClick={onAction}
            className="btn btn-accent px-6 h-[48px] text-[14px] font-extrabold gap-2.5 inline-flex shadow-hard-sm min-h-[44px]"
          >
            <GithubIcon className="w-4 h-4 text-[#111111]" />
            <span>{actionLabel || 'Reconnect GitHub'}</span>
          </button>
        )}
      </div>
    );
  }

  if (type === 'temporary') {
    return (
      <div className={`p-8 sm:p-10 text-center space-y-4 bg-white border-2 border-[#111111] rounded-[18px] shadow-hard ${className}`}>
        <div className="w-14 h-14 rounded-full bg-[#FAFAFA] text-[#0A0A0A] border-2 border-[#111111] shadow-hard-sm flex items-center justify-center mx-auto">
          <RefreshCw className="w-6 h-6 text-[#111111]" />
        </div>
        <div className="space-y-1.5 max-w-[460px] mx-auto">
          <h3 className="text-xl font-extrabold text-[#0A0A0A] tracking-tight">
            {title || "Couldn't load repository metadata."}
          </h3>
          <p className="text-[14px] text-[#5E5E5E] font-medium leading-relaxed">
            {subtitle || 'A temporary communication error occurred while fetching tree metadata from GitHub.'}
          </p>
        </div>
        {onAction && (
          <button
            onClick={onAction}
            className="btn bg-white border-2 border-[#111111] text-[#0A0A0A] px-6 h-[48px] text-[14px] font-extrabold gap-2 inline-flex shadow-hard-sm hover:bg-[#FAFAFA] min-h-[44px]"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{actionLabel || 'Retry'}</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`p-8 text-center text-[#5E5E5E] mono text-[13.5px] bg-white border-2 border-[#111111] rounded-[16px] shadow-hard-sm ${className}`}>
      {title || 'No data available for this section.'}
    </div>
  );
});

export default EmptyStateView;
