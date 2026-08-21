import { useEffect, useRef } from 'react';
import { ArrowRight, ShieldCheck, X } from 'lucide-react';
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
      className="modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) setGithubModalOpen(false); }}
      role="dialog"
      aria-modal="true"
      aria-label="Connect GitHub"
    >
      <div className="modal-box border border-[#111111] shadow-hard-lg max-w-[440px]">
        <div className="modal-header flex items-center justify-between p-4 border-b border-[#111111] bg-[#FAFAFA]">
          <div className="flex items-center gap-3">
            <GithubIcon className="w-5 h-5 text-[#111111]" />
            <div>
              <div className="mono text-[10px] font-bold uppercase tracking-[0.1em] text-[#666666]">AUTHORIZATION</div>
              <div className="text-[15px] font-extrabold text-[#111111] leading-tight">CONNECT GITHUB</div>
            </div>
          </div>
          <button onClick={() => setGithubModalOpen(false)} className="btn btn-ghost btn-xs" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-[13px] leading-relaxed text-[#333333] font-medium">
            “Authorize ZORQEN to inspect repositories you choose.”
          </p>

          <button
            ref={primaryRef}
            onClick={proceedGithubAuth}
            className="group relative flex items-center justify-between gap-3.5 h-[52px] px-4 w-full rounded-[16px] bg-[#111111] text-white border-2 border-[#111111] border-b-4 hover:border-b-[6px] border-b-[#C8FF2E] shadow-hard-sm hover:-translate-y-[2px] transition-all duration-150 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#C8FF2E]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#222222] border border-[#333333] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-150">
                <GithubIcon className="w-5 h-5 text-white" />
              </div>

              <div className="text-left leading-tight min-w-0">
                <div className="font-extrabold text-[14px] text-white tracking-tight flex items-center gap-1.5">
                  Connect with GitHub
                </div>
                <div className="text-[11px] font-medium text-zinc-400 truncate">
                  Authorize repository access via GitHub OAuth.
                </div>
              </div>
            </div>

            <ArrowRight className="w-4 h-4 text-[#C8FF2E] shrink-0 group-hover:translate-x-[4px] transition-transform duration-150 ml-2" />
          </button>

          <div className="p-4 rounded-md border border-[#111111] bg-[#FAFAFA] shadow-hard-sm space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#111111]" />
              <span className="mono text-[11px] font-bold tracking-[0.08em] text-[#111111]">READ-ONLY ACCESS</span>
            </div>
            <p className="text-[11.5px] text-[#555555] leading-relaxed">
              “ZORQEN does not modify your repositories without explicit approval.”
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}