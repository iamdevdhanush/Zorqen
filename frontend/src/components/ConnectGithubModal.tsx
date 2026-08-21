import { useEffect, useRef } from 'react';
import { ArrowRight, Check, X } from 'lucide-react';
import GithubIcon from './GithubIcon';
import { useWorkspace } from '../store/WorkspaceContext';

export default function ConnectGithubModal() {
  const { setGithubModalOpen, proceedGithubAuth } = useWorkspace();
  const primaryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    primaryRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setGithubModalOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [setGithubModalOpen]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111111]/60 backdrop-blur-md fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) setGithubModalOpen(false); }}
      role="dialog"
      aria-modal="true"
      aria-label="Connect GitHub"
    >
      <div className="w-full max-w-[420px] bg-white border border-[#111111]/15 rounded-[12px] shadow-hard-lg overflow-hidden slide-up">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-[#111111]/10 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[8px] bg-[#FAFAFA] border border-[#111111]/15 flex items-center justify-center text-[#111111] shrink-0">
              <GithubIcon className="w-4.5 h-4.5 text-[#111111]" />
            </div>
            <div>
              <div className="mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#6B6B6B]">
                AUTHORIZATION
              </div>
              <h2 className="text-[18px] font-extrabold text-[#0A0A0A] tracking-tight leading-none mt-0.5">
                Connect GitHub
              </h2>
            </div>
          </div>
          <button
            onClick={() => setGithubModalOpen(false)}
            className="w-8 h-8 rounded-[6px] flex items-center justify-center text-[#6B6B6B] hover:text-[#0A0A0A] hover:bg-[#FAFAFA] border border-transparent hover:border-[#111111]/15 transition-all outline-none"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <p className="text-[13.5px] text-[#6B6B6B] font-medium leading-relaxed">
            Authorize ZORQEN to inspect repositories you choose for security posture and threat validation.
          </p>

          {/* Primary Action Button */}
          <button
            ref={primaryRef}
            onClick={proceedGithubAuth}
            className="w-full h-[44px] px-4 rounded-[8px] bg-white border border-[#111111]/20 hover:border-[#111111] text-[#0A0A0A] font-bold text-[14px] flex items-center justify-between transition-all duration-150 group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#111111] hover:-translate-y-[1px]"
          >
            <div className="flex items-center gap-2.5">
              <GithubIcon className="w-4 h-4 text-[#111111]" />
              <span>Continue with GitHub</span>
            </div>
            <ArrowRight className="w-4 h-4 text-[#0A0A0A] group-hover:translate-x-[4px] transition-transform duration-150" />
          </button>

          <div className="h-[1px] bg-[#111111]/10 my-4" />

          {/* Compact Permissions Checklist */}
          <div className="space-y-2.5 text-[12.5px] text-[#333333] font-medium">
            <div className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#6B6B6B]">
              PERMISSIONS GRANTED
            </div>
            <div className="space-y-2 pt-0.5">
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#111111] shrink-0" />
                <span>Read-only repository access</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#111111] shrink-0" />
                <span>Commit metadata &amp; branch structure</span>
              </div>
              <div className="flex items-center gap-2.5 font-semibold text-[#0A0A0A]">
                <span className="w-2 h-2 rounded-full bg-[#C8FF2E] border border-[#111111] shrink-0 ml-1 mr-0.5" />
                <span>No code mutation without explicit pull request</span>
              </div>
            </div>
          </div>

          <div className="h-[1px] bg-[#111111]/10 my-4" />

          {/* Muted Trust Signals */}
          <div className="text-[11.5px] text-[#6B6B6B] font-medium flex items-center justify-center gap-2 flex-wrap">
            <span>✓ OAuth handled by GitHub</span>
            <span>•</span>
            <span>No write permissions</span>
            <span>•</span>
            <span>Disconnect anytime</span>
          </div>
        </div>
      </div>
    </div>
  );
}