import { useEffect, useRef } from 'react';
import { ShieldCheck, X } from 'lucide-react';
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
            className="btn btn-accent w-full justify-center py-2.5 text-[13px]"
          >
            <GithubIcon className="w-4 h-4" />
            Continue with GitHub
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