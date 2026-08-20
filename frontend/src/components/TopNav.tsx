import { memo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Bot, ChevronRight, Heart, LogOut, Menu, Search, User, UserCheck, X } from 'lucide-react';
import GithubIcon from './GithubIcon';
import ZorqenLogoMark from './ZorqenLogoMark';
import { Dropdown } from './ui';
import MeetDeveloperModal from './MeetDeveloperModal';
import { useWorkspaceData, useWorkspaceUI } from '../store/WorkspaceContext';

interface TopNavProps {
  onOpenCmd: () => void;
}

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

const TopNav = memo(function TopNav({ onOpenCmd }: TopNavProps) {
  const navigate = useNavigate();
  const { copilotOpen, setCopilotOpen, setGithubModalOpen } = useWorkspaceUI();
  const { user, githubConnected, signOut } = useWorkspaceData();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [meetDevOpen, setMeetDevOpen] = useState(false);

  const navItems = [
    { to: '/', label: 'Overview', end: true },
    { to: '/repos', label: 'Repositories' },
    { to: '/assessments', label: 'Assessments' },
    { to: '/findings', label: 'Findings' },
  ];

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const userName = user?.github_name || user?.github_login || 'Dhanush D Prabhu';
  const userHandle = user?.github_login ? `@${user.github_login}` : '@iamdevdhanush';
  const userInitials = (userName.slice(0, 1) || 'D').toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-[#111111] px-4 sm:px-6 py-2.5">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-3 sm:gap-6">
          
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-5 lg:gap-8 min-w-0">
            <NavLink
              to="/"
              onClick={closeMobileMenu}
              className="flex items-center gap-3 group shrink-0 py-0.5 outline-none focus-visible:ring-2 focus-visible:ring-[#111111] rounded-md"
            >
              <ZorqenLogoMark size="md" showText={true} />
            </NavLink>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 ml-2" aria-label="Main Navigation">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `px-3.5 py-1.5 rounded-md text-[13px] font-extrabold transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#111111] ${
                      isActive
                        ? 'bg-[#C5F82A] text-[#111111] border border-[#111111] shadow-hard-sm'
                        : 'text-[#333333] hover:text-[#111111] hover:bg-[#FAFAFA] border border-transparent'
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
              className="flex lg:hidden items-center justify-center min-w-[40px] min-h-[40px] p-2 rounded-md border border-[#111111] bg-[#FAFAFA] shadow-hard-sm text-[#111111] hover:bg-white transition-all active:translate-y-0.5"
              title="Search"
              aria-label="Open Search"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Desktop Cmd+K trigger button (>= lg) */}
            <button
              onClick={onOpenCmd}
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 min-h-[36px] rounded-md border border-[#111111] bg-[#FAFAFA] shadow-hard-sm text-[12px] font-bold text-[#111111] hover:bg-white transition-all"
              title="Open Command Palette"
            >
              <Search className="w-3.5 h-3.5 shrink-0" />
              <span className="leading-none">Search</span>
              <kbd className="ml-1.5 leading-none">{IS_MAC ? '⌘K' : 'Ctrl K'}</kbd>
            </button>

            {/* Ask ZORQEN Copilot Button */}
            <button
              onClick={() => { closeMobileMenu(); setCopilotOpen(!copilotOpen); }}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 min-h-[36px] rounded-md text-[12px] font-extrabold border border-[#111111] transition-all ${
                copilotOpen
                  ? 'bg-[#111111] text-white shadow-hard-lime'
                  : 'bg-white text-[#111111] shadow-hard-sm hover:bg-[#C5F82A]'
              }`}
            >
              <Bot className={`w-4 h-4 shrink-0 ${copilotOpen ? 'text-[#C5F82A]' : 'text-[#111111]'}`} />
              <span className="hidden sm:inline">Ask ZORQEN</span>
              <span className="sm:hidden">Ask</span>
            </button>

            {/* GitHub Connection Status (Desktop) */}
            <div className="hidden sm:flex items-center gap-2">
              {githubConnected ? (
                <div className="flex items-center gap-2 px-3 py-1.5 min-h-[36px] rounded-md border border-[#111111] bg-[#C5F82A] shadow-hard-sm text-[12px] font-extrabold text-[#111111]">
                  <GithubIcon className="w-3.5 h-3.5 text-[#111111]" />
                  <span className="mono text-[11px]">{userHandle}</span>
                </div>
              ) : (
                <button
                  onClick={() => setGithubModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 min-h-[36px] rounded-md border border-[#111111] bg-white text-[12px] font-extrabold text-[#111111] shadow-hard-sm hover:bg-[#FAFAFA] transition-all"
                >
                  <GithubIcon className="w-3.5 h-3.5 text-[#111111]" />
                  <span>+ Connect GitHub</span>
                </button>
              )}
            </div>

            {/* User Profile / Account Dropdown Menu (Desktop) */}
            <Dropdown
              align="right"
              trigger={(open) => (
                <div
                  className={`flex items-center gap-2 px-2.5 py-1 min-h-[36px] rounded-md border border-[#111111] shadow-hard-sm transition-all cursor-pointer ${
                    open ? 'bg-[#C5F82A] text-[#111111]' : 'bg-white text-[#111111] hover:bg-[#FAFAFA]'
                  }`}
                  title="Account Menu"
                  aria-label="Open Account Menu"
                >
                  {user?.github_avatar_url ? (
                    <img src={user.github_avatar_url} alt="" className="w-5 h-5 rounded-full border border-[#111111] shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-[#111111] text-[#C5F82A] flex items-center justify-center font-extrabold text-[10px] shrink-0">
                      {userInitials}
                    </div>
                  )}
                  <span className="hidden xl:inline text-[12px] font-extrabold max-w-[110px] truncate">
                    {userName.split(' ')[0]}
                  </span>
                  <User className="w-3.5 h-3.5 text-[#111111]" />
                </div>
              )}
            >
              {(close) => (
                <div className="p-3 w-[260px] space-y-3 font-sans" onClick={(e) => e.stopPropagation()}>
                  {/* User Account Header — Clicking profile header opens settings, NEVER logs out */}
                  <button
                    type="button"
                    onClick={() => {
                      close();
                      navigate('/settings');
                    }}
                    className="w-full text-left flex items-center gap-2.5 pb-2.5 border-b border-[#111111] hover:opacity-80 transition-opacity"
                  >
                    {user?.github_avatar_url ? (
                      <img src={user.github_avatar_url} alt="" className="w-8 h-8 rounded-full border border-[#111111] shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#111111] text-[#C5F82A] border border-[#111111] flex items-center justify-center font-extrabold text-[12px] shrink-0">
                        {userInitials}
                      </div>
                    )}
                    <div className="min-w-0 flex-1 leading-tight">
                      <div className="font-extrabold text-[13px] text-[#111111] truncate">
                        {userName}
                      </div>
                      <div className="mono text-[10.5px] font-semibold text-[#555555]">
                        {userHandle}
                      </div>
                    </div>
                  </button>

                  {/* Account Navigation Links */}
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        close();
                        navigate('/settings');
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-md text-[12.5px] font-extrabold text-[#111111] hover:bg-[#FAFAFA] border border-transparent hover:border-[#111111] transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-[#111111]" />
                        <span>Account Settings</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-[#666666]" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        close();
                        setMeetDevOpen(true);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-md text-[12.5px] font-extrabold text-[#111111] hover:bg-[#FAFAFA] border border-transparent hover:border-[#111111] transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-[#111111]" />
                        <span>Meet the Developer</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-[#666666]" />
                    </button>

                    <a
                      href="https://buymeacoffee.com/dhanushdprabhu"
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => close()}
                      className="flex items-center justify-between px-3 py-2 rounded-md text-[12.5px] font-extrabold text-[#111111] hover:bg-[#FFDD00]/20 border border-transparent hover:border-[#111111] transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <Heart className="w-4 h-4 text-[#111111]" />
                        <span>Support ZORQEN</span>
                      </div>
                      <span className="mono text-[9px] font-extrabold uppercase bg-[#FFDD00] text-[#111111] px-1.5 py-0.5 rounded border border-[#111111]">☕ COFFEE</span>
                    </a>
                  </div>

                  {/* Explicit Sign Out Action — ONLY BUTTON THAT CALLS signOut() */}
                  <div className="pt-2 border-t border-[#111111]">
                    <button
                      type="button"
                      onClick={() => {
                        close();
                        signOut();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-md text-[12.5px] font-extrabold text-[#DC2626] bg-[#FEE2E2] border border-[#111111] hover:bg-[#FCA5A5] transition-all shadow-hard-sm cursor-pointer"
                    >
                      <span>Sign Out</span>
                      <LogOut className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              )}
            </Dropdown>

            {/* Mobile Hamburger Toggle (< md) */}
            <button
              onClick={() => setMobileMenuOpen((o) => !o)}
              className="flex md:hidden items-center justify-center min-w-[40px] min-h-[40px] p-2 rounded-md border border-[#111111] bg-white shadow-hard-sm text-[#111111] hover:bg-[#FAFAFA] transition-all active:translate-y-0.5"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

          </div>
        </div>

        {/* Mobile Drawer Navigation (< md) */}
        {mobileMenuOpen && (
          <div className="md:hidden pt-3 pb-3 border-t border-[#111111] mt-3 space-y-4 slide-down">
            {/* User Profile Card Header */}
            <div className="p-3 rounded-lg bg-[#FAFAFA] border border-[#111111] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                {user?.github_avatar_url ? (
                  <img src={user.github_avatar_url} alt="" className="w-8 h-8 rounded-full border border-[#111111] shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#111111] text-[#C5F82A] flex items-center justify-center font-extrabold text-[11px] shrink-0">
                    {userInitials}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-extrabold text-[13px] text-[#111111] truncate">{userName}</div>
                  <div className="mono text-[10px] text-[#555555]">{userHandle}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { closeMobileMenu(); navigate('/settings'); }}
                className="btn btn-xs btn-ghost"
              >
                Settings
              </button>
            </div>

            {/* Navigation items */}
            <nav className="flex flex-col gap-1.5" aria-label="Mobile Navigation">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={closeMobileMenu}
                  className={({ isActive }) =>
                    `px-4 py-2.5 rounded-md text-[13.5px] font-bold transition-all flex items-center justify-between ${
                      isActive
                        ? 'bg-[#C5F82A] text-[#111111] border border-[#111111] shadow-hard-sm'
                        : 'text-[#333333] hover:bg-black/5 border border-transparent'
                    }`
                  }
                >
                  <span>{item.label}</span>
                  <ChevronRight className="w-4 h-4 text-[#666666]" />
                </NavLink>
              ))}
            </nav>

            {/* Action buttons */}
            <div className="pt-3 border-t border-[#111111] flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  closeMobileMenu();
                  setMeetDevOpen(true);
                }}
                className="flex items-center justify-between px-4 py-2.5 rounded-md border border-[#111111] bg-white text-[13px] font-extrabold text-[#111111] shadow-hard-sm"
              >
                <span>Meet the Developer</span>
                <User className="w-4 h-4 text-[#111111]" />
              </button>

              <a
                href="https://buymeacoffee.com/dhanushdprabhu"
                target="_blank"
                rel="noreferrer"
                onClick={closeMobileMenu}
                className="flex items-center justify-between px-4 py-2.5 rounded-md border border-[#111111] bg-[#FFDD00] text-[13px] font-extrabold text-[#111111] shadow-hard-sm"
              >
                <span>Support ZORQEN</span>
                <Heart className="w-4 h-4 text-[#111111]" />
              </a>

              {githubConnected ? (
                <div className="flex items-center justify-between px-4 py-2.5 rounded-md border border-[#111111] bg-[#C5F82A] text-[12px] font-extrabold text-[#111111]">
                  <div className="flex items-center gap-2">
                    <GithubIcon className="w-4 h-4 text-[#111111]" />
                    <span className="mono text-[11.5px]">{userHandle}</span>
                  </div>
                  <span className="chip text-[9.5px] font-extrabold uppercase">Connected</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { closeMobileMenu(); setGithubModalOpen(true); }}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border border-[#111111] bg-white text-[13px] font-extrabold text-[#111111] shadow-hard-sm"
                >
                  <GithubIcon className="w-4 h-4 text-[#111111]" />
                  <span>+ Connect GitHub</span>
                </button>
              )}

              {/* Explicit Sign Out Button in Mobile Drawer — ONLY BUTTON CALLING signOut() */}
              {user && (
                <button
                  type="button"
                  onClick={() => { closeMobileMenu(); signOut(); }}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border border-[#111111] bg-[#FEE2E2] text-[#DC2626] text-[13px] font-extrabold shadow-hard-sm active:translate-y-0.5"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Dedicated Meet the Developer Modal */}
      <MeetDeveloperModal
        isOpen={meetDevOpen}
        onClose={() => setMeetDevOpen(false)}
      />
    </>
  );
});

export default TopNav;
