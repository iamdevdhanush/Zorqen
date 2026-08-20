import { memo } from 'react';
import { ExternalLink, Globe, Heart, X } from 'lucide-react';
import GithubIcon from './GithubIcon';
import ZorqenLogoMark from './ZorqenLogoMark';

interface MeetDeveloperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSupport?: () => void;
}

export const MeetDeveloperModal = memo(function MeetDeveloperModal({
  isOpen,
  onClose,
  onOpenSupport,
}: MeetDeveloperModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111111]/60 backdrop-blur-xs fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="meet-dev-title"
    >
      <div
        className="w-full max-w-[460px] bg-white border border-[#111111] rounded-xl shadow-hard-lg overflow-hidden slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#FAFAFA] border-b border-[#111111]">
          <div className="flex items-center gap-2">
            <span className="mono text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-[#111111] bg-[#C5F82A] px-2 py-0.5 rounded border border-[#111111]">
              MEET THE DEVELOPER
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#111111] hover:bg-[#EAEAE2] transition-colors border border-transparent hover:border-[#111111]"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Profile Identity */}
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-full bg-[#111111] text-[#C5F82A] border-2 border-[#111111] flex items-center justify-center font-extrabold text-xl shadow-hard-sm">
                DP
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#C5F82A] border border-[#111111]" title="Active Maintainer" />
            </div>

            <div className="space-y-1 min-w-0 flex-1">
              <h2 id="meet-dev-title" className="text-xl font-extrabold text-[#111111] tracking-tight leading-tight">
                Dhanush D. Prabhu
              </h2>
              <div className="font-mono text-[12px] font-bold text-[#4A4A4A]">
                @iamdevdhanush
              </div>
              <p className="text-[13px] text-[#333333] font-medium pt-1 leading-snug">
                Building ZORQEN to make security validation more accessible for AI-built software.
              </p>
            </div>
          </div>

          <div className="border-t border-[#111111]/20" />

          {/* Project Summary */}
          <div className="p-3.5 rounded-lg bg-[#F7F7F2] border border-[#111111] flex items-center gap-3">
            <ZorqenLogoMark size="sm" />
            <div className="min-w-0 flex-1">
              <div className="font-extrabold text-[13px] text-[#111111]">ZORQEN</div>
              <div className="text-[11.5px] text-[#4A4A4A] font-medium">
                Security validation for AI-built software.
              </div>
            </div>
          </div>

          {/* Build / Connect Links */}
          <div className="space-y-2">
            <div className="font-mono text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#4A4A4A]">
              BUILD / CONNECT
            </div>
            <div className="grid grid-cols-3 gap-2">
              <a
                href="https://github.com/iamdevdhanush"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-[#111111] bg-white hover:bg-[#C5F82A] text-[12px] font-bold text-[#111111] shadow-hard-sm transition-all text-center"
              >
                <GithubIcon className="w-3.5 h-3.5 text-[#111111]" />
                <span>GitHub</span>
              </a>
              <a
                href="https://linkedin.com/in/iamdevdhanush"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-[#111111] bg-white hover:bg-[#C5F82A] text-[12px] font-bold text-[#111111] shadow-hard-sm transition-all text-center"
              >
                <svg className="w-3.5 h-3.5 fill-current text-[#111111]" viewBox="0 0 24 24">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                </svg>
                <span>LinkedIn</span>
              </a>
              <a
                href="https://dhanushdprabhu.com"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-[#111111] bg-white hover:bg-[#C5F82A] text-[12px] font-bold text-[#111111] shadow-hard-sm transition-all text-center"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Portfolio</span>
              </a>
            </div>
          </div>

          {/* Support the Project */}
          <div className="pt-2 border-t border-[#111111]/20 space-y-2">
            <div className="font-mono text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#4A4A4A]">
              SUPPORT THE PROJECT
            </div>
            <p className="text-[12px] text-[#4A4A4A] font-medium">
              If ZORQEN is useful to you, consider supporting its open development:
            </p>
            <a
              href="https://buymeacoffee.com/dhanushdprabhu"
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                if (onOpenSupport) onOpenSupport();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border border-[#111111] bg-[#FFDD00] hover:bg-[#F2D000] text-[13px] font-bold text-[#111111] shadow-hard-sm transition-all"
            >
              <Heart className="w-4 h-4 text-[#111111] fill-[#111111]" />
              <span>Buy me a coffee</span>
              <ExternalLink className="w-3.5 h-3.5 ml-auto text-[#111111]" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
});

export default MeetDeveloperModal;
