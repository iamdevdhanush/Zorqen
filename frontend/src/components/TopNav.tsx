import { memo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Bot, Menu, Search, User, X } from 'lucide-react';
import GithubIcon from './GithubIcon';
import { useWorkspaceData, useWorkspaceUI } from '../store/WorkspaceContext';

interface TopNavProps {
  onOpenCmd: () => void;
}

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

const TopNav = memo(function TopNav({ onOpenCmd }: TopNavProps) {
  const { copilotOpen, setCopilotOpen, setGithubModalOpen } = useWorkspaceUI();
  const { user, githubConnected, signOut } = useWorkspaceData();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { to: '/', label: 'Overview', end: true },
    { to: '/repos', label: 'Repositories' },
    { to: '/assessments', label: 'Assessments' },
    { to: '/findings', label: 'Findings' },
  ];

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 bg-[#FFFFFF] border-b border-[#111111] px-4 sm:px-6 py-3">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-3 sm:gap-6">
        
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-5 lg:gap-8 min-w-0">
          <NavLink to="/" onClick={closeMobileMenu} className="flex items-center gap-3 sm:gap-3.5 group shrink-0 py-0.5">
            <img
              src="/logo.png"
              alt="RAKSHA"
              className="w-8 h-8 sm:w-9 sm:h-9 object-contain shrink-0 transition-transform group-hover:-translate-y-0.5"
            />
            <div className="leading-tight flex flex-col justify-center">
              <div className="font-extrabold text-[15px] sm:text-[16px] tracking-tight text-[#111111] leading-none flex items-center gap-1.5">
                RAKSHA
              </div>
              <div className="mono text-[8px] sm:text-[8.5px] font-extrabold tracking-[0.18em] text-[#4A4A4A] uppercase mt-1">
                SECURITY VALIDATION
              </div>
            </div>
          </NavLink>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 ml-2" aria-label="Main Navigation">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `px-4 py-1.5 rounded-md text-[13px] font-extrabold transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#111111] ${
                    isActive
                      ? 'bg-[#C5F82A] text-[#111111] border border-[#111111] shadow-hard-sm'
                      : 'text-[#333333] hover:text-[#111111] hover:bg-black/5 border border-transparent'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          
          {/* Mobile Search Button (< lg) */}
          <button
            onClick={() => { closeMobileMenu(); onOpenCmd(); }}
            className="flex lg:hidden items-center justify-center p-2 rounded-md border border-[#111111] bg-[#FAFAFA] shadow-hard-sm text-[#111111] hover:bg-white transition-all"
            title="Search"
            aria-label="Open Search"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Desktop Cmd+K trigger button (>= lg) */}
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
            onClick={() => { closeMobileMenu(); setCopilotOpen(!copilotOpen); }}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-md text-[12px] font-bold border border-[#111111] transition-all ${
              copilotOpen
                ? 'bg-[#111111] text-white shadow-hard-lime'
                : 'bg-white text-[#111111] shadow-hard-sm hover:bg-[#C5F82A]'
            }`}
          >
            <Bot className={`w-4 h-4 shrink-0 ${copilotOpen ? 'text-[#C5F82A]' : 'text-[#111111]'}`} />
            <span className="hidden sm:inline">Ask RAKSHA</span>
            <span className="sm:hidden">Ask</span>
          </button>

          {/* GitHub Connection Status (Desktop) */}
          <div className="hidden sm:flex items-center gap-2">
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
          </div>

          {/* User Profile / Sign Out (Desktop) */}
          {user && (
            <button
              onClick={signOut}
              className="hidden sm:flex p-1.5 rounded-md border border-[#111111] bg-white shadow-hard-sm text-[#111111] hover:bg-[#FEE2E2] transition-all"
              title="Sign Out"
            >
              <User className="w-4 h-4" />
            </button>
          )}

          {/* Mobile Hamburger Toggle (< md) */}
          <button
            onClick={() => setMobileMenuOpen((o) => !o)}
            className="flex md:hidden items-center justify-center p-2 rounded-md border border-[#111111] bg-white shadow-hard-sm text-[#111111] hover:bg-[#FAFAFA] transition-all"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

        </div>
      </div>

      {/* Mobile Drawer Navigation (< md) */}
      {mobileMenuOpen && (
        <div className="md:hidden pt-3 pb-2 border-t border-[#111111] mt-3 space-y-3 slide-down">
          <nav className="flex flex-col gap-1.5" aria-label="Mobile Navigation">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={closeMobileMenu}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-md text-[13.5px] font-bold transition-all flex items-center justify-between ${
                    isActive
                      ? 'bg-[#C5F82A] text-[#111111] border border-[#111111] shadow-hard-sm'
                      : 'text-[#333333] hover:bg-black/5 border border-transparent'
                  }`
                }
              >
                <span>{item.label}</span>
                <span className="mono text-[10px] text-[#666666]">→</span>
              </NavLink>
            ))}
          </nav>

          <div className="pt-2 border-t border-gray-200 flex flex-col gap-2">
            {githubConnected ? (
              <div className="flex items-center justify-between px-3 py-2 rounded-md border border-[#111111] bg-[#C5F82A] text-[12px] font-bold text-[#111111]">
                <div className="flex items-center gap-2">
                  <GithubIcon className="w-4 h-4 text-[#111111]" />
                  <span className="mono text-[11.5px]">@{user?.github_login}</span>
                </div>
                <span className="chip text-[9.5px] font-bold uppercase">Connected</span>
              </div>
            ) : (
              <button
                onClick={() => { closeMobileMenu(); setGithubModalOpen(true); }}
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-[#111111] bg-white text-[12.5px] font-bold text-[#111111] shadow-hard-sm"
              >
                <GithubIcon className="w-4 h-4 text-[#111111]" />
                <span>+ Connect GitHub</span>
              </button>
            )}

            {user && (
              <button
                onClick={() => { closeMobileMenu(); signOut(); }}
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-[#111111] bg-[#FEE2E2] text-[#DC2626] text-[12.5px] font-bold shadow-hard-sm"
              >
                <User className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
});

export default TopNav;

