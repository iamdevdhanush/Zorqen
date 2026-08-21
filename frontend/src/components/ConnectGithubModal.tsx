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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0A0A]/70 backdrop-blur-sm fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) setGithubModalOpen(false); }}
      role="dialog"
      aria-modal="true"
      aria-label="Connect GitHub"
    >
      <div className="w-full max-w-[440px] bg-white border-2 border-[#111111] rounded-[18px] shadow-hard-lg overflow-hidden slide-up">
        {/* Sticky Modal Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b-2 border-[#111111] bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-[#111111] text-[#C8FF2E] border-2 border-[#111111] flex items-center justify-center shrink-0 shadow-hard-sm">
              <GithubIcon className="w-5 h-5 text-[#C8FF2E]" />
            </div>
            <div>
              <div className="mono text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-[#6B6B6B]">
                AUTHORIZATION
              </div>
              <h2 className="text-[20px] font-extrabold text-[#0A0A0A] tracking-tight leading-none mt-0.5">
                Connect GitHub
              </h2>
            </div>
          </div>
          <button
            onClick={() => setGithubModalOpen(false)}
            className="flex items-center justify-center w-[40px] h-[40px] rounded-[10px] text-[#0A0A0A] hover:bg-[#FAFAFA] border-2 border-transparent hover:border-[#111111] transition-all outline-none"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4">
          <p className="text-[14px] text-[#5E5E5E] font-medium leading-relaxed">
            Authorize ZORQEN to inspect repositories you choose for security posture and threat validation.
          </p>

          {/* Primary Action Button */}
          <button
            ref={primaryRef}
            onClick={proceedGithubAuth}
            className="w-full h-[48px] px-4 rounded-[12px] bg-[#C8FF2E] hover:bg-[#b5eb1c] border-2 border-[#111111] text-[#111111] font-extrabold text-[15px] flex items-center justify-between transition-all duration-140 group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#111111] shadow-hard-sm active:scale-[0.98]"
          >
            <div className="flex items-center gap-2.5">
              <GithubIcon className="w-5 h-5 text-[#111111]" />
              <span>Continue with GitHub</span>
            </div>
            <ArrowRight className="w-5 h-5 text-[#111111] group-hover:translate-x-1 transition-transform duration-140" />
          </button>

          <div className="border-t border-[#111111]/10 my-4" />

          {/* Permissions Checklist */}
          <div className="space-y-2 text-[13px] text-[#333333] font-medium">
            <div className="mono text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-[#6B6B6B]">
              PERMISSIONS GRANTED
            </div>
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#111111] shrink-0 stroke-[3]" />
                <span>Read-only repository access</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#111111] shrink-0 stroke-[3]" />
                <span>Commit metadata &amp; branch structure</span>
              </div>
              <div className="flex items-center gap-2.5 font-bold text-[#0A0A0A]">
                <span className="w-2 h-2 rounded-full bg-[#C8FF2E] border border-[#111111] shrink-0" />
                <span>No code mutation without explicit pull request</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Modal Footer */}
        <div className="p-4 bg-[#FAFAFA] border-t-2 border-[#111111] text-[11.5px] text-[#6B6B6B] font-medium flex items-center justify-center gap-2 flex-wrap">
          <span>✓ OAuth handled by GitHub</span>
          <span>•</span>
          <span>No write permissions</span>
          <span>•</span>
          <span>Disconnect anytime</span>
        </div>
      </div>
    </div>
  );
}