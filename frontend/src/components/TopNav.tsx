import { memo } from 'react';
import { NavLink } from 'react-router-dom';
import { Bot, Search, ShieldCheck, User } from 'lucide-react';
import GithubIcon from './GithubIcon';
import { useWorkspaceData, useWorkspaceUI } from '../store/WorkspaceContext';

interface TopNavProps {
  onOpenCmd: () => void;
}

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

const TopNav = memo(function TopNav({ onOpenCmd }: TopNavProps) {
  const { copilotOpen, setCopilotOpen, setGithubModalOpen } = useWorkspaceUI();
  const { user, githubConnected, signOut } = useWorkspaceData();

  const navItems = [
    { to: '/', label: 'Overview', end: true },
    { to: '/repos', label: 'Repositories' },
    { to: '/assessments', label: 'Assessments' },
    { to: '/findings', label: 'Findings' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#FFFFFF] border-b border-[#111111] px-6 py-3">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-6">
        
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-8">
          <NavLink to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-md bg-[#111111] border border-[#111111] shadow-hard-sm flex items-center justify-center text-white transition-transform group-hover:-translate-y-0.5">
              <ShieldCheck className="w-5 h-5 text-[#C5F82A]" strokeWidth={2.5} />
            </div>
            <div className="leading-tight">
              <div className="font-extrabold text-[16px] tracking-tight text-[#111111] flex items-center gap-1.5">
                RAKSHA
              </div>
              <div className="mono text-[8.5px] font-bold tracking-[0.18em] text-[#666666] uppercase">
                SECURITY VALIDATION
              </div>
            </div>
          </NavLink>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 ml-2" aria-label="Main Navigation">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `px-4 py-1.5 rounded-md text-[13px] font-bold transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#111111] ${
                    isActive
                      ? 'bg-[#C5F82A] text-[#111111] border border-[#111111] shadow-hard-sm'
                      : 'text-[#555555] hover:text-[#111111] hover:bg-black/5 border border-transparent'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center gap-3">
          
          {/* Cmd+K trigger button */}
          <button
            onClick={onOpenCmd}
            className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#111111] bg-[#FAFAFA] shadow-hard-sm text-[12px] font-semibold text-[#111111] hover:bg-white transition-all"
            title="Open Command Palette"
          >
            <Search className="w-3.5 h-3.5 shrink-0" />
            <span className="leading-none">Search</span>
            <kbd className="ml-1.5 leading-none">{IS_MAC ? '⌘K' : 'Ctrl K'}</kbd>
          </button>

          {/* Ask RAKSHA Copilot Button */}
          <button
            onClick={() => setCopilotOpen(!copilotOpen)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-[12px] font-bold border border-[#111111] transition-all ${
              copilotOpen
                ? 'bg-[#111111] text-white shadow-hard-lime'
                : 'bg-white text-[#111111] shadow-hard-sm hover:bg-[#C5F82A]'
            }`}
          >
            <Bot className="w-4 h-4 text-[#111111]" />
            <span>Ask RAKSHA</span>
          </button>

          {/* GitHub Connection Status */}
          {githubConnected ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#111111] bg-[#C5F82A] shadow-hard-sm text-[12px] font-bold text-[#111111]">
              <GithubIcon className="w-3.5 h-3.5 text-[#111111]" />
              <span className="mono text-[11px]">@{user?.github_login}</span>
            </div>
          ) : (
            <button
              onClick={() => setGithubModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#111111] bg-white text-[12px] font-semibold text-[#111111] shadow-hard-sm hover:bg-[#FAFAFA] transition-all"
            >
              <GithubIcon className="w-3.5 h-3.5 text-[#111111]" />
              <span>+ Connect GitHub</span>
            </button>
          )}

          {/* User Profile / Sign Out */}
          {user && (
            <button
              onClick={signOut}
              className="p-1.5 rounded-md border border-[#111111] bg-white shadow-hard-sm text-[#111111] hover:bg-[#FEE2E2] transition-all"
              title="Sign Out"
            >
              <User className="w-4 h-4" />
            </button>
          )}

        </div>
      </div>
    </header>
  );
});

export default TopNav;
