import { memo } from 'react';
import { ExternalLink, Globe, Heart, ShieldCheck, Cpu, Terminal, X, Activity } from 'lucide-react';
import GithubIcon from './GithubIcon';
import { useWorkspaceData } from '../store/WorkspaceContext';
import { useGithubProfile } from '../lib/useGithubProfile';

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
  const { user } = useWorkspaceData();
  const targetLogin = user?.github_login || 'iamdevdhanush';
  const { profile } = useGithubProfile(targetLogin);

  if (!isOpen) return null;

  const displayName = profile?.name || user?.github_name || 'Dhanush D. Prabhu';
  const displayHandle = user?.github_login ? `@${user.github_login}` : '@iamdevdhanush';
  const avatarUrl = profile?.avatar_url || user?.github_avatar_url || 'https://github.com/iamdevdhanush.png';
  const profileUrl = profile?.html_url || `https://github.com/${targetLogin}`;

  const currentlyBuildingItems = [
    {
      icon: ShieldCheck,
      name: 'Static AST Analysis Engine',
      status: 'Active',
      statusClass: 'bg-[#C7F11A] text-[#111111]',
    },
    {
      icon: Cpu,
      name: 'AI Threat Reasoning Engine',
      status: 'In Progress',
      statusClass: 'bg-[#111111] text-[#C7F11A]',
    },
    {
      icon: Terminal,
      name: 'Container Sandbox Validation',
      status: 'Beta',
      statusClass: 'bg-[#F9F8F5] text-[#111111]',
    },
  ];

  // Mini contribution heatmap level values (0-4 intensity scale)
  const miniHeatmapLevels = [
    [1, 2, 3, 1, 4, 2, 3, 4, 2, 1, 3, 4, 2, 3],
    [0, 1, 2, 3, 2, 4, 1, 2, 3, 4, 2, 1, 2, 3],
    [2, 3, 4, 2, 1, 3, 4, 2, 3, 4, 1, 2, 4, 3],
    [1, 2, 1, 4, 3, 2, 1, 3, 2, 4, 3, 2, 1, 4],
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0A0A]/70 backdrop-blur-sm fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="meet-dev-title"
    >
      <div
        className="w-full max-w-[480px] max-h-[90vh] bg-white border-2 border-[#111111] rounded-[16px] shadow-hard-lg flex flex-col overflow-hidden slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3.5 bg-[#F9F8F5] border-b-2 border-[#111111] shrink-0">
          <div className="flex items-center gap-2">
            <span className="mono text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-[#111111] bg-[#C7F11A] px-2.5 py-0.5 rounded-[4px] border border-[#111111]">
              DEVELOPER PROFILE
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-[36px] h-[36px] rounded-[8px] text-[#111111] hover:bg-white border border-transparent hover:border-[#111111] transition-all outline-none"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto scroll-thin flex-1">
          {/* Identity Header */}
          <div className="flex items-center gap-3.5">
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-14 h-14 rounded-full border-2 border-[#111111] object-cover shrink-0"
            />
            <div className="space-y-0.5 min-w-0 flex-1">
              <h2 id="meet-dev-title" className="text-lg font-extrabold text-[#111111] tracking-tight leading-none truncate">
                {displayName}
              </h2>
              <div className="mono text-[12px] font-bold text-[#555555]">
                {displayHandle}
              </div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#C7F11A] border border-[#111111] mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#111111]" />
                <span className="mono text-[9.5px] font-extrabold text-[#111111] uppercase tracking-wider">
                  VERIFIED BUILDER
                </span>
              </div>
            </div>
          </div>

          {/* Compact Builder Stats Grid */}
          <div className="p-3.5 rounded-[10px] bg-[#F9F8F5] border border-[#111111]/20 grid grid-cols-3 divide-x divide-[#111111]/15 text-center">
            <div>
              <div className="text-metadata text-[9px]">BUILDER SCORE</div>
              <div className="mono text-[17px] font-extrabold text-[#111111] mt-0.5 tabular-nums">94</div>
            </div>
            <div>
              <div className="text-metadata text-[9px]">REPOSITORIES</div>
              <div className="mono text-[17px] font-extrabold text-[#111111] mt-0.5 tabular-nums">59</div>
            </div>
            <div>
              <div className="text-metadata text-[9px]">SCANS</div>
              <div className="mono text-[17px] font-extrabold text-[#111111] mt-0.5 tabular-nums">143</div>
            </div>
          </div>

          {/* Current Projects Compact Rows */}
          <div className="p-4 rounded-[10px] bg-white border border-[#111111]/20 space-y-2.5">
            <div className="flex items-center justify-between border-b border-[#111111]/15 pb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#111111]" />
                <span className="font-extrabold text-[13px] text-[#111111]">Current Projects</span>
              </div>
              <span className="mono text-[9.5px] font-bold text-[#111111] bg-[#C7F11A] px-2 py-0.5 rounded border border-[#111111] uppercase tracking-wider">
                LIVE
              </span>
            </div>

            <div className="space-y-2">
              {currentlyBuildingItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.name}
                    className="flex items-center justify-between p-2.5 rounded-[8px] bg-[#F9F8F5] border border-[#111111]/10 text-[12.5px]"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-[#111111] shrink-0" />
                      <span className="font-extrabold text-[#111111]">{item.name}</span>
                    </div>
                    <span className={`mono text-[9.5px] font-bold px-2 py-0.5 rounded border border-[#111111]/20 ${item.statusClass}`}>
                      {item.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Contribution Heatmap Mini Grid */}
          <div className="p-4 rounded-[10px] bg-white border border-[#111111]/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="text-metadata text-[9.5px]">CONTRIBUTION ACTIVITY</div>
              <span className="mono text-[10px] text-[#555555] font-semibold">Past 90 Days</span>
            </div>
            
            {/* SVG/CSS Mini Heatmap */}
            <div className="p-2.5 rounded-[8px] bg-[#F9F8F5] border border-[#111111]/10 space-y-1.5">
              {miniHeatmapLevels.map((row, rIdx) => (
                <div key={rIdx} className="flex items-center gap-1.5 justify-between">
                  {row.map((lvl, cIdx) => (
                    <div
                      key={cIdx}
                      className={`w-3.5 h-3.5 rounded-[3px] border border-[#111111]/20 ${
                        lvl === 4 ? 'bg-[#111111]' : lvl === 3 ? 'bg-[#C7F11A]' : lvl === 2 ? 'bg-[#C7F11A]/60' : lvl === 1 ? 'bg-[#C7F11A]/25' : 'bg-white'
                      }`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Social Buttons */}
        <div className="sticky bottom-0 z-10 p-4 bg-[#F9F8F5] border-t-2 border-[#111111] space-y-2.5">
          <div className="grid grid-cols-3 gap-2">
            <a
              href={profileUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary h-[44px] min-h-[44px] text-[12.5px] px-2 w-full justify-center shadow-hard-sm no-underline"
            >
              <GithubIcon className="w-4 h-4 text-[#111111]" />
              <span>GitHub</span>
            </a>
            <a
              href="https://linkedin.com/in/iamdevdhanush"
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary h-[44px] min-h-[44px] text-[12.5px] px-2 w-full justify-center shadow-hard-sm no-underline"
            >
              <svg className="w-4 h-4 fill-current text-[#111111]" viewBox="0 0 24 24">
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
              </svg>
              <span>LinkedIn</span>
            </a>
            <a
              href="https://dhanushdprabhu.com"
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary h-[44px] min-h-[44px] text-[12.5px] px-2 w-full justify-center shadow-hard-sm no-underline"
            >
              <Globe className="w-4 h-4 text-[#111111]" />
              <span>Portfolio</span>
            </a>
          </div>

          <a
            href="https://buymeacoffee.com/dhanushdprabhu"
            target="_blank"
            rel="noreferrer"
            onClick={() => onOpenSupport?.()}
            className="w-full flex items-center justify-between px-4 h-[44px] min-h-[44px] rounded-[10px] border-2 border-[#111111] bg-white hover:bg-[#F9F8F5] text-[13px] font-extrabold text-[#111111] shadow-hard-sm no-underline transition-all"
          >
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-[#111111] fill-[#111111]" />
              <span>Support ZORQEN Platform</span>
            </div>
            <ExternalLink className="w-4 h-4 text-[#111111]" />
          </a>
        </div>
      </div>
    </div>
  );
});

export default MeetDeveloperModal;
