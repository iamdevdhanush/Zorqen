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
  const { profile, loading: profileLoading } = useGithubProfile(targetLogin);

  if (!isOpen) return null;

  // Derived live identity fields with fallbacks
  const displayName = profile?.name || user?.github_name || 'Dhanush D. Prabhu';
  const displayHandle = user?.github_login ? `@${user.github_login}` : '@iamdevdhanush';
  const avatarUrl = profile?.avatar_url || user?.github_avatar_url || 'https://github.com/iamdevdhanush.png';
  const profileUrl = profile?.html_url || `https://github.com/${targetLogin}`;
  const publicRepos = profileLoading ? 48 : (profile?.public_repos ?? 48);
  const followers = profileLoading ? 6 : (profile?.followers ?? 6);
  const following = profileLoading ? 4 : (profile?.following ?? 4);

  const currentlyBuildingItems = [
    {
      icon: ShieldCheck,
      name: 'Static Analysis Engine',
      status: 'Active',
      statusClass: 'bg-[#C8FF2E] text-[#111111]',
    },
    {
      icon: Cpu,
      name: 'AI Threat Reasoning',
      status: 'In Progress',
      statusClass: 'bg-[#111111] text-[#C8FF2E]',
    },
    {
      icon: Terminal,
      name: 'Sandbox Validation',
      status: 'Beta',
      statusClass: 'bg-[#FAFAFA] text-[#111111]',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111111]/70 fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="meet-dev-title"
    >
      <div
        className="w-full max-w-[480px] max-h-[90vh] bg-white border-2 border-[#111111] rounded-[18px] shadow-hard-lg flex flex-col overflow-hidden slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#FAFAFA] border-b-2 border-[#111111] shrink-0">
          <div className="flex items-center gap-2">
            <span className="mono text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-[#111111] bg-[#C8FF2E] px-2.5 py-0.5 rounded-[6px] border border-[#111111]">
              MEET THE DEVELOPER
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-[8px] text-[#111111] hover:bg-[#EAEAE2] border-2 border-transparent hover:border-[#111111] transition-all duration-150 outline-none"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto scroll-thin flex-1">
          {/* Profile Identity Card */}
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full border-2 border-[#111111] object-cover shadow-hard-sm"
                />
              </div>

              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 id="meet-dev-title" className="text-xl font-extrabold text-[#111111] tracking-tight leading-none">
                    {displayName}
                  </h2>
                </div>
                <div className="mono text-[12.5px] font-bold text-[#5E5E5E]">
                  {displayHandle}
                </div>
                
                {/* Verified Builder Badge */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#C8FF2E] border border-[#111111] shadow-[1.5px_1.5px_0px_#111111] mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-[#111111] animate-pulse" />
                  <span className="mono text-[10px] font-extrabold text-[#111111] uppercase tracking-wider">
                    Verified Builder
                  </span>
                </div>
              </div>
            </div>

            {/* One-sentence Bio */}
            <p className="text-[13px] text-[#333333] font-medium leading-snug pt-1">
              Building ZORQEN — AI-powered Security Validation for AI-built software.
            </p>
          </div>

          {/* GitHub Stats Row */}
          <div className="bg-[#FAFAFA] border-2 border-[#111111] rounded-[14px] p-3 grid grid-cols-3 divide-x-2 divide-[#111111]/15 text-center shadow-hard-sm hover:-translate-y-[2px] hover:border-[#C8FF2E] transition-all duration-150">
            <div className="px-1">
              <div className="mono text-[9px] font-extrabold text-[#5E5E5E] uppercase tracking-[0.14em]">Public Repos</div>
              <div className="mono text-[16px] font-extrabold text-[#111111] mt-0.5">
                {publicRepos}
              </div>
            </div>
            <div className="px-1">
              <div className="mono text-[9px] font-extrabold text-[#5E5E5E] uppercase tracking-[0.14em]">Followers</div>
              <div className="mono text-[16px] font-extrabold text-[#111111] mt-0.5">
                {followers}
              </div>
            </div>
            <div className="px-1">
              <div className="mono text-[9px] font-extrabold text-[#5E5E5E] uppercase tracking-[0.14em]">Following</div>
              <div className="mono text-[16px] font-extrabold text-[#111111] mt-0.5">
                {following}
              </div>
            </div>
          </div>

          {/* Currently Building Status Card */}
          <div className="p-4 rounded-[14px] bg-[#FAFAFA] border-2 border-[#111111] shadow-hard-sm hover:-translate-y-[2px] hover:border-[#C8FF2E] transition-all duration-150 space-y-3">
            <div className="flex items-center justify-between border-b-2 border-[#111111]/15 pb-2.5">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#111111]" />
                <span className="font-extrabold text-[13.5px] text-[#111111]">Currently Building</span>
              </div>
              <span className="mono text-[10px] font-extrabold text-[#111111] bg-[#C8FF2E] px-2 py-0.5 rounded-[6px] border border-[#111111] uppercase tracking-wider">
                LIVE
              </span>
            </div>

            <div className="space-y-2">
              {currentlyBuildingItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.name}
                    className="flex items-center justify-between p-2.5 rounded-[10px] bg-white border border-[#111111]/30 hover:border-[#111111] transition-all duration-150"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-[6px] bg-[#FAFAFA] border border-[#111111]/20">
                        <Icon className="w-3.5 h-3.5 text-[#111111]" />
                      </div>
                      <span className="font-extrabold text-[12.5px] text-[#111111]">{item.name}</span>
                    </div>
                    <span className={`mono text-[10px] font-extrabold px-2 py-0.5 rounded-[6px] border border-[#111111] ${item.statusClass}`}>
                      {item.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Contribution Heatmap Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <div className="mono text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#5E5E5E]">
                  CONTRIBUTION ACTIVITY
                </div>
                <div className="text-[11.5px] text-[#5E5E5E] font-medium">
                  Live GitHub activity from {displayHandle}
                </div>
              </div>
            </div>

            {/* Heatmap Card */}
            <div className="p-3.5 rounded-[14px] bg-[#FAFAFA] border-2 border-[#111111] shadow-hard-sm hover:-translate-y-[2px] hover:border-[#C8FF2E] transition-all duration-150 space-y-3">
              <div className="overflow-x-auto scroll-thin pb-1">
                <img
                  src={`https://ghchart.rshah.org/C8FF2E/${targetLogin}`}
                  alt={`${displayHandle} GitHub Contribution Chart`}
                  className="w-full min-w-[380px] h-auto object-contain rounded-[6px]"
                  loading="lazy"
                  onError={(e) => {
                    // Graceful fallback if image stream is blocked
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>

              {/* Four Compact Contribution Stats Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-[#111111]/15">
                <div className="bg-white border-2 border-[#111111] rounded-[8px] p-2 text-center shadow-[2px_2px_0px_#111111] hover:-translate-y-[1px] hover:bg-[#C8FF2E] transition-all duration-150">
                  <div className="mono text-[8.5px] font-extrabold text-[#5E5E5E] uppercase tracking-wider">This Year</div>
                  <div className="mono text-[11px] font-extrabold text-[#111111] mt-0.5">Live</div>
                </div>

                <div className="bg-white border-2 border-[#111111] rounded-[8px] p-2 text-center shadow-[2px_2px_0px_#111111] hover:-translate-y-[1px] hover:bg-[#C8FF2E] transition-all duration-150">
                  <div className="mono text-[8.5px] font-extrabold text-[#5E5E5E] uppercase tracking-wider">Current Streak</div>
                  <div className="mono text-[11px] font-extrabold text-[#111111] mt-0.5">Live</div>
                </div>

                <div className="bg-white border-2 border-[#111111] rounded-[8px] p-2 text-center shadow-[2px_2px_0px_#111111] hover:-translate-y-[1px] hover:bg-[#C8FF2E] transition-all duration-150">
                  <div className="mono text-[8.5px] font-extrabold text-[#5E5E5E] uppercase tracking-wider">Longest Streak</div>
                  <div className="mono text-[11px] font-extrabold text-[#111111] mt-0.5">Live</div>
                </div>

                <div className="bg-white border-2 border-[#111111] rounded-[8px] p-2 text-center shadow-[2px_2px_0px_#111111] hover:-translate-y-[1px] hover:bg-[#C8FF2E] transition-all duration-150">
                  <div className="mono text-[8.5px] font-extrabold text-[#5E5E5E] uppercase tracking-wider">Total Contrib</div>
                  <div className="mono text-[11px] font-extrabold text-[#111111] mt-0.5">Live</div>
                </div>
              </div>
            </div>
          </div>

          {/* Bordered Primary GitHub Profile Link Card */}
          <a
            href={profileUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between p-3.5 rounded-[14px] bg-[#111111] text-white border-2 border-[#111111] shadow-hard-sm hover:bg-[#222222] hover:-translate-y-[2px] hover:shadow-hard transition-all duration-150 group outline-none focus-visible:ring-2 focus-visible:ring-[#C8FF2E] no-underline"
          >
            <div className="flex items-center gap-3 font-extrabold text-[13.5px]">
              <GithubIcon className="w-5 h-5 text-[#C8FF2E] group-hover:scale-110 transition-transform duration-150" />
              <span>View GitHub Profile</span>
            </div>
            <ExternalLink className="w-4 h-4 text-[#C8FF2E] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-150" />
          </a>

          {/* Secondary Outline Links Grid (LinkedIn & Portfolio) */}
          <div className="grid grid-cols-2 gap-2.5">
            <a
              href="https://linkedin.com/in/iamdevdhanush"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 h-[42px] px-3 rounded-[12px] border-2 border-[#111111] bg-white hover:bg-[#C8FF2E] text-[13px] font-extrabold text-[#111111] shadow-hard-sm hover:-translate-y-[2px] hover:shadow-hard transition-all duration-150 text-center outline-none no-underline"
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
              className="flex items-center justify-center gap-2 h-[42px] px-3 rounded-[12px] border-2 border-[#111111] bg-white hover:bg-[#C8FF2E] text-[13px] font-extrabold text-[#111111] shadow-hard-sm hover:-translate-y-[2px] hover:shadow-hard transition-all duration-150 text-center outline-none no-underline"
            >
              <Globe className="w-4 h-4 text-[#111111]" />
              <span>Portfolio</span>
            </a>
          </div>

          {/* Subtle Outlined Support Link */}
          <div className="pt-1">
            <a
              href="https://buymeacoffee.com/dhanushdprabhu"
              target="_blank"
              rel="noreferrer"
              onClick={() => onOpenSupport?.()}
              className="w-full flex items-center justify-between px-4 h-[44px] rounded-[12px] border-2 border-[#111111] bg-white hover:bg-[#C8FF2E] text-[13px] font-extrabold text-[#111111] shadow-hard-sm hover:-translate-y-[2px] hover:shadow-hard transition-all duration-150 outline-none no-underline"
            >
              <div className="flex items-center gap-2.5">
                <Heart className="w-4 h-4 text-[#111111] fill-[#111111]" />
                <span>Support ZORQEN</span>
              </div>
              <ExternalLink className="w-4 h-4 text-[#111111]" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
});

export default MeetDeveloperModal;
