import { memo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bot, ChevronRight, ExternalLink, Heart, LogOut, Menu, Search, User, UserCheck, X } from 'lucide-react';
import GithubIcon from './GithubIcon';
import ZorqenLogoMark from './ZorqenLogoMark';
import { Dropdown } from './ui';
import MeetDeveloperModal from './MeetDeveloperModal';
import { useWorkspaceData, useWorkspaceUI } from '../store/WorkspaceContext';
import { useGithubProfile } from '../lib/useGithubProfile';

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

  // Live GitHub OAuth profile hook
  const { profile, loading: profileLoading } = useGithubProfile(user?.github_login);

  const navItems = [
    { to: '/', label: 'Overview', end: true },
    { to: '/repos', label: 'Repositories' },
    { to: '/assessments', label: 'Assessments' },
    { to: '/findings', label: 'Findings' },
  ];

  const closeMobileMenu = () => setMobileMenuOpen(false);

  // Derived live identity fields
  const displayName = profile?.name || user?.github_name || user?.github_login || (githubConnected ? 'GitHub User' : 'Guest');
  const displayHandle = user?.github_login ? `@${user.github_login}` : '@unknown';
  const avatarUrl = profile?.avatar_url || user?.github_avatar_url;
  const profileUrl = profile?.html_url || (user?.github_login ? `https://github.com/${user.github_login}` : 'https://github.com');

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b-2 border-[#111111] h-[72px] flex items-center">
        <div className="max-w-[1280px] w-full mx-auto px-5 lg:px-8 flex items-center justify-between gap-3 sm:gap-4">
          
          {/* Brand Logo & Navigation */}
          <div className="flex items-center gap-6 lg:gap-8 min-w-0 shrink-0">
            <NavLink
              to="/"
              onClick={closeMobileMenu}
              className="flex items-center gap-2.5 group shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[#111111] rounded-[10px]"
            >
              {/* Logo text collapses below 380px screen width */}
              <ZorqenLogoMark size="md" showText={true} textClassName="hidden min-[380px]:flex" />
            </NavLink>

            {/* Desktop Navigation Links (>= md) */}
            <nav className="hidden md:flex items-center gap-1.5 lg:gap-3" aria-label="Main Navigation">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `relative px-3.5 h-[44px] flex items-center justify-center text-[15px] transition-all duration-150 ease-out outline-none focus-visible:ring-2 focus-visible:ring-[#111111] rounded-[8px] select-none ${
                      isActive
                        ? 'text-[#111111] font-extrabold'
                        : 'text-[#555555] font-semibold hover:text-[#111111] md:hover:-translate-y-0.5'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <span className="relative flex flex-col items-center justify-center h-full">
                      <span className="relative z-10">{item.label}</span>
                      {isActive && (
                        <motion.div
                          layoutId="topNavActiveUnderline"
                          className="absolute bottom-[2px] w-[calc(100%+8px)] left-1/2 -translate-x-1/2 h-[3px] bg-[#111111] rounded-full"
                          transition={{
                            type: 'spring',
                            stiffness: 420,
                            damping: 32,
                            mass: 0.7,
                          }}
                        />
                      )}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Right Actions Desktop (>= md): Search | Ask | Profile */}
          <div className="hidden md:flex items-center gap-2.5 lg:gap-3 shrink-0">
            {/* Search Trigger */}
            <button
              onClick={onOpenCmd}
              className="flex items-center gap-2 h-[48px] px-4 rounded-[10px] border-2 border-[#111111] bg-[#F9F8F5] shadow-hard-sm text-[13.5px] font-extrabold text-[#111111] hover:bg-white transition-all min-h-[44px] min-w-[44px]"
              title="Open Command Palette"
            >
              <Search className="w-4 h-4 shrink-0 text-[#111111]" />
              <span>Search</span>
              <kbd className="ml-1 leading-none text-[10px] hidden lg:inline-flex">{IS_MAC ? '⌘K' : 'Ctrl K'}</kbd>
            </button>

            {/* Ask ZORQEN Copilot Button */}
            <button
              onClick={() => { closeMobileMenu(); setCopilotOpen(!copilotOpen); }}
              className={`flex items-center gap-2 h-[48px] min-h-[44px] min-w-[44px] px-4 rounded-[10px] text-[13.5px] font-extrabold border-2 border-[#111111] transition-all ${
                copilotOpen
                  ? 'bg-[#111111] text-white shadow-hard-lime'
                  : 'bg-white text-[#111111] shadow-hard-sm hover:bg-[#C7F11A]'
              }`}
            >
              <Bot className={`w-4 h-4 shrink-0 ${copilotOpen ? 'text-[#C7F11A]' : 'text-[#111111]'}`} />
              <span>Ask ZORQEN</span>
            </button>

            {/* Desktop Account Dropdown (320px width) */}
            <Dropdown
              align="right"
              trigger={(open) => (
                <div
                  className={`flex items-center gap-2.5 px-3.5 h-[48px] min-h-[44px] min-w-[44px] rounded-[10px] border-2 border-[#111111] transition-all cursor-pointer select-none shadow-hard-sm ${
                    open ? 'bg-[#C7F11A] text-[#111111]' : 'bg-white text-[#111111] hover:bg-[#F9F8F5]'
                  }`}
                  title="Account Menu"
                  aria-label="Open Account Menu"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-6 h-6 rounded-full border border-[#111111]/30 object-cover shrink-0" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[#111111] text-[#C7F11A] flex items-center justify-center shrink-0">
                      <GithubIcon className="w-3.5 h-3.5 text-[#C7F11A]" />
                    </div>
                  )}
                  <span className="text-[13.5px] font-extrabold max-w-[120px] truncate">
                    {displayName}
                  </span>
                </div>
              )}
            >
              {(close) => (
                <div className="w-[320px] font-sans overflow-hidden bg-white border-2 border-[#111111] rounded-[14px] shadow-hard-lg" onClick={(e) => e.stopPropagation()}>
                  <div className="p-4 bg-[#F9F8F5] border-b-2 border-[#111111] space-y-3">
                    <div className="flex items-center gap-3">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="" className="w-11 h-11 rounded-full border-2 border-[#111111] object-cover shrink-0" />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-[#111111] text-[#C7F11A] border-2 border-[#111111] flex items-center justify-center shrink-0">
                          <GithubIcon className="w-5 h-5 text-[#C7F11A]" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1 leading-snug">
                        <div className="font-extrabold text-[15px] text-[#111111] truncate">
                          {displayName}
                        </div>
                        <div className="mono text-[12px] font-bold text-[#555555] truncate">
                          {displayHandle}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-2 space-y-1 bg-white border-b-2 border-[#111111]/15">
                    <a
                      href={profileUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => close()}
                      className="flex items-center justify-between px-3 py-2.5 rounded-[8px] text-[13px] font-bold text-[#111111] hover:bg-[#F9F8F5] transition-all min-h-[44px]"
                    >
                      <div className="flex items-center gap-2.5">
                        <GithubIcon className="w-4 h-4 text-[#111111]" />
                        <span>GitHub Profile</span>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-[#555555]" />
                    </a>

                    <button
                      type="button"
                      onClick={() => { close(); navigate('/settings'); }}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-[8px] text-[13px] font-bold text-[#111111] hover:bg-[#F9F8F5] transition-all min-h-[44px]"
                    >
                      <div className="flex items-center gap-2.5">
                        <UserCheck className="w-4 h-4 text-[#111111]" />
                        <span>Account Settings</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-[#555555]" />
                    </button>
                  </div>

                  <div className="p-2 bg-[#F9F8F5]">
                    {githubConnected ? (
                      <button
                        type="button"
                        onClick={() => { close(); signOut(); }}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-[8px] text-[13px] font-extrabold text-[#DC2626] bg-[#FEE2E2] hover:bg-[#FCA5A5] border border-[#DC2626]/30 transition-all min-h-[44px]"
                      >
                        <span>Sign Out</span>
                        <LogOut className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { close(); setGithubModalOpen(true); }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-[8px] text-[13px] font-extrabold text-[#111111] bg-[#C7F11A] border-2 border-[#111111] hover:bg-[#b8e010] transition-all min-h-[44px]"
                      >
                        <GithubIcon className="w-4 h-4 text-[#111111]" />
                        <span>Connect GitHub Account</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </Dropdown>
          </div>

          {/* Mobile Right Controls (< md): Logo Icon | Search | Ask | Avatar | Menu */}
          <div className="flex md:hidden items-center gap-1.5 shrink-0">
            {/* Search Trigger */}
            <button
              onClick={onOpenCmd}
              className="flex items-center justify-center h-[44px] w-[44px] min-w-[44px] min-h-[44px] rounded-[10px] border-2 border-[#111111] bg-[#F9F8F5] text-[#111111] hover:bg-white transition-all active:translate-y-0.5"
              title="Search"
              aria-label="Open Search"
            >
              <Search className="w-5 h-5 text-[#111111]" />
            </button>

            {/* Ask ZORQEN Copilot Button */}
            <button
              onClick={() => setCopilotOpen(!copilotOpen)}
              className={`flex items-center justify-center h-[44px] w-[44px] min-w-[44px] min-h-[44px] rounded-[10px] border-2 border-[#111111] text-[#111111] transition-all active:translate-y-0.5 ${
                copilotOpen ? 'bg-[#111111] text-white shadow-hard-lime' : 'bg-white text-[#111111] shadow-hard-sm'
              }`}
              title="Ask ZORQEN"
              aria-label="Ask ZORQEN"
            >
              <Bot className={`w-5 h-5 ${copilotOpen ? 'text-[#C7F11A]' : 'text-[#111111]'}`} />
            </button>

            {/* Profile Avatar trigger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="flex items-center justify-center h-[44px] w-[44px] min-w-[44px] min-h-[44px] rounded-[10px] border-2 border-[#111111] bg-white overflow-hidden shadow-hard-sm"
              title="Profile"
              aria-label="Open profile drawer"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#111111] text-[#C7F11A] flex items-center justify-center">
                  <GithubIcon className="w-5 h-5 text-[#C7F11A]" />
                </div>
              )}
            </button>

            {/* Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen((o) => !o)}
              className="flex items-center justify-center h-[44px] w-[44px] min-w-[44px] min-h-[44px] rounded-[10px] border-2 border-[#111111] bg-[#C7F11A] text-[#111111] shadow-hard-sm transition-all active:translate-y-0.5"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6 stroke-[2.5]" /> : <Menu className="w-6 h-6 stroke-[2.5]" />}
            </button>
          </div>

        </div>

        {/* Mobile Slide-out Drawer (< md) */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
            <div
              className="fixed inset-0 bg-[#0A0A0A]/70 fade-in"
              onClick={closeMobileMenu}
            />

            <div className="relative z-10 w-full min-h-[70vh] max-h-[90vh] overflow-y-auto bg-[#ECEBE6] border-t-2 border-[#111111] rounded-t-[24px] shadow-hard-lg p-5 space-y-4 slide-up">
              <div className="w-12 h-1.5 bg-[#111111]/40 rounded-full mx-auto" />

              <div className="flex items-center justify-between pb-2 border-b-2 border-[#111111]/20">
                <span className="mono text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#0A0A0A] bg-[#C8FF2E] px-2.5 py-0.5 rounded-[6px] border border-[#111111]">
                  NAVIGATION & PROFILE
                </span>
                <button
                  onClick={closeMobileMenu}
                  className="flex items-center justify-center w-[44px] h-[44px] min-w-[44px] min-h-[44px] rounded-[8px] text-[#0A0A0A] hover:bg-[#EAEAE2] border-2 border-transparent hover:border-[#111111]"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Profile Card */}
              <div className="flex items-center gap-3 p-4 rounded-[16px] bg-white border-2 border-[#111111] shadow-hard-sm">
                {profileLoading ? (
                  <div className="w-12 h-12 rounded-full bg-[#EAEAE2] animate-pulse border-2 border-[#111111]" />
                ) : avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-12 h-12 rounded-full border-2 border-[#111111] object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#111111] text-[#C8FF2E] border-2 border-[#111111] flex items-center justify-center shrink-0">
                    <GithubIcon className="w-6 h-6 text-[#C8FF2E]" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <h2 className="text-[16px] font-extrabold text-[#0A0A0A] truncate leading-snug">{displayName}</h2>
                  <div className="mono text-[12px] font-bold text-[#5E5E5E] truncate">{displayHandle}</div>
                </div>

                <a
                  href={profileUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={closeMobileMenu}
                  className="mono text-[11px] font-bold text-[#0A0A0A] bg-[#FAFAFA] px-2.5 py-1 rounded-[8px] border border-[#111111] shrink-0"
                >
                  Profile
                </a>
              </div>

              {/* Navigation Items */}
              <nav className="flex flex-col gap-2" aria-label="Mobile Navigation Drawer">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={closeMobileMenu}
                    className={({ isActive }) =>
                      `px-4 h-[48px] min-h-[44px] rounded-[12px] text-[15px] font-extrabold transition-all flex items-center justify-between ${
                        isActive
                          ? 'bg-[#C8FF2E] text-[#111111] border-2 border-[#111111] shadow-hard-sm'
                          : 'bg-white text-[#0A0A0A] border-2 border-[#111111]/15 hover:border-[#111111]'
                      }`
                    }
                  >
                    <span>{item.label}</span>
                    <ChevronRight className="w-5 h-5 text-[#0A0A0A]" />
                  </NavLink>
                ))}
              </nav>

              {/* Actions */}
              <div className="pt-2 border-t-2 border-[#111111]/20 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    closeMobileMenu();
                    setCopilotOpen(!copilotOpen);
                  }}
                  className={`flex items-center justify-between px-4 h-[48px] min-h-[44px] rounded-[12px] border-2 border-[#111111] text-[14px] font-extrabold shadow-hard-sm transition-all ${
                    copilotOpen ? 'bg-[#111111] text-white' : 'bg-white text-[#0A0A0A] hover:bg-[#C8FF2E]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Bot className={`w-5 h-5 ${copilotOpen ? 'text-[#C8FF2E]' : 'text-[#0A0A0A]'}`} />
                    <span>Ask ZORQEN</span>
                  </div>
                  <ChevronRight className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={() => { closeMobileMenu(); navigate('/settings'); }}
                  className="flex items-center justify-between px-4 h-[48px] min-h-[44px] rounded-[12px] border-2 border-[#111111] bg-white text-[14px] font-extrabold text-[#0A0A0A] shadow-hard-sm"
                >
                  <div className="flex items-center gap-3">
                    <UserCheck className="w-5 h-5 text-[#0A0A0A]" />
                    <span>Settings</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#0A0A0A]" />
                </button>

                <button
                  type="button"
                  onClick={() => { closeMobileMenu(); setMeetDevOpen(true); }}
                  className="flex items-center justify-between px-4 h-[48px] min-h-[44px] rounded-[12px] border-2 border-[#111111] bg-white text-[14px] font-extrabold text-[#0A0A0A] shadow-hard-sm"
                >
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-[#0A0A0A]" />
                    <span>Meet the Developer</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#0A0A0A]" />
                </button>

                <a
                  href="https://buymeacoffee.com/dhanushdprabhu"
                  target="_blank"
                  rel="noreferrer"
                  onClick={closeMobileMenu}
                  className="flex items-center justify-between px-4 h-[48px] min-h-[44px] rounded-[12px] border-2 border-[#111111] bg-white text-[14px] font-extrabold text-[#0A0A0A] shadow-hard-sm no-underline"
                >
                  <div className="flex items-center gap-3">
                    <Heart className="w-5 h-5 text-[#0A0A0A]" />
                    <span>Support ZORQEN</span>
                  </div>
                  <ExternalLink className="w-5 h-5 text-[#0A0A0A]" />
                </a>

                {user && (
                  <button
                    type="button"
                    onClick={() => { closeMobileMenu(); signOut(); }}
                    className="flex items-center justify-center gap-2 px-4 h-[48px] min-h-[44px] rounded-[12px] border-2 border-[#111111] bg-[#FEE2E2] text-[#DC2626] text-[14px] font-extrabold shadow-hard-sm active:translate-y-0.5 mt-2 cursor-pointer"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Dedicated Meet Developer Modal */}
      <MeetDeveloperModal
        isOpen={meetDevOpen}
        onClose={() => setMeetDevOpen(false)}
      />
    </>
  );
});

export default TopNav;
