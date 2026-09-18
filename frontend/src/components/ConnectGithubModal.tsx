import { useEffect, useRef } from 'react';
import { ArrowRight, Check, X } from 'lucide-react';
import GithubIcon from './GithubIcon';
import { useWorkspace } from '../store/WorkspaceContext';

import { AntiMetalButton } from './ui/anti-metal-button';

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
      <div className="w-full max-w-[440px] bg-white border-2 border-[#111111] rounded-[24px] shadow-hard-lg overflow-hidden slide-up">
        {/* Sticky Modal Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b-2 border-[#111111] bg-white">
          <div className="flex items-center gap-3.5">
            <GithubIcon className="w-[18px] h-[18px] md:w-5 md:h-5 text-[#111111]" aria-label="GitHub" />
            <div>
              <div className="mono text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-[#525252]">
                AUTHORIZATION
              </div>
              <h2 className="text-[20px] font-extrabold text-[#0A0A0A] tracking-tight leading-none mt-0.5">
                Connect GitHub
              </h2>
            </div>
          </div>
          <button
            onClick={() => setGithubModalOpen(false)}
            className="flex items-center justify-center w-[44px] h-[44px] rounded-[12px] text-[#0A0A0A] hover:bg-[#F7F5F0] border-2 border-transparent hover:border-[#111111] transition-all outline-none cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5 stroke-[2]" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <p className="text-[14px] text-[#525252] font-medium leading-relaxed">
            Authorize ZORQEN to inspect repositories you choose for security posture and threat validation.
          </p>

          {/* Primary Action Button */}
          <AntiMetalButton
            ref={primaryRef}
            onClick={proceedGithubAuth}
            size="full"
            icon={<GithubIcon className="w-[18px] h-[18px] md:w-5 md:h-5 text-white mr-1.5" aria-label="GitHub" />}
            rightIcon={<ArrowRight className="w-5 h-5 stroke-[2] text-white ml-auto" />}
            className="justify-between"
          >
            Continue with GitHub
          </AntiMetalButton>

          <div className="border-t-2 border-[#111111]/10 my-4" />

          {/* Permissions Checklist */}
          <div className="space-y-2 text-[13px] text-[#333333] font-medium">
            <div className="mono text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-[#525252]">
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
                <span className="w-2.5 h-2.5 rounded-full bg-[#C8F31D] border-2 border-[#111111] shrink-0" />
                <span>No code mutation without explicit pull request</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Modal Footer */}
        <div className="p-4 bg-[#F7F5F0] border-t-2 border-[#111111] text-[11.5px] text-[#525252] font-medium flex items-center justify-center gap-2 flex-wrap">
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