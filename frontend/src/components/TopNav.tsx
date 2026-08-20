import { memo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Bot, ChevronDown, ChevronRight, ExternalLink, Heart, LogOut, Menu, Search, User, UserCheck, X } from 'lucide-react';
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

  // Derived user attributes (never hardcoded, no generic initial avatar "D")
  const displayName = profile?.name || user?.github_name || user?.github_login || 'GitHub User';
  const displayHandle = user?.github_login ? `@${user.github_login}` : '@unknown';
  const avatarUrl = profile?.avatar_url || user?.github_avatar_url;
  const profileUrl = profile?.html_url || (user?.github_login ? `https://github.com/${user.github_login}` : 'https://github.com');

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
                  <span className="mono text-[11px]">{displayHandle}</span>
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
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-7 h-7 rounded-full border border-[#111111] object-cover shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-[#111111] text-[#C5F82A] flex items-center justify-center border border-[#111111] shrink-0">
                      <GithubIcon className="w-4 h-4 text-[#C5F82A]" />
                    </div>
                  )}
                  <span className="hidden xl:inline text-[12.5px] font-extrabold max-w-[130px] truncate">
                    {displayName}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-[#111111] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                </div>
              )}
            >
              {(close) => (
                <div className="w-[300px] font-sans overflow-hidden bg-white" onClick={(e) => e.stopPropagation()}>
                  {/* Real GitHub Identity Card (Header) */}
                  <a
                    href={profileUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => close()}
                    className="block p-4 bg-[#FAFAFA] border-b border-[#111111] space-y-3.5 hover:bg-[#F7F7F4] transition-colors cursor-pointer outline-none no-underline"
                  >
                    <div className="flex items-center gap-3">
                      {profileLoading ? (
                        <div className="w-12 h-12 rounded-full bg-[#EAEAE2] animate-pulse border border-[#111111] shrink-0" />
                      ) : avatarUrl ? (
                        <img src={avatarUrl} alt="" className="w-12 h-12 rounded-full border border-[#111111] object-cover shrink-0 shadow-hard-sm" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-[#111111] text-[#C5F82A] border border-[#111111] flex items-center justify-center shrink-0 shadow-hard-sm">
                          <GithubIcon className="w-6 h-6 text-[#C5F82A]" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1 leading-snug">
                        {profileLoading ? (
                          <div className="space-y-1.5">
                            <div className="h-4 w-28 bg-[#EAEAE2] rounded animate-pulse" />
                            <div className="h-3 w-20 bg-[#EAEAE2] rounded animate-pulse" />
                          </div>
                        ) : (
                          <>
                            <div className="font-extrabold text-[14.5px] text-[#111111] truncate flex items-center gap-1">
                              <span>{displayName}</span>
                            </div>
                            <div className="mono text-[11.5px] font-bold text-[#555555] truncate">
                              {displayHandle}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* GitHub Live Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-[#111111]/15 text-center">
                      <div>
                        <div className="mono text-[8.5px] font-extrabold text-[#666666] uppercase tracking-wider">Public Repos</div>
                        <div className="mono text-[14px] font-extrabold text-[#111111]">
                          {profileLoading ? '…' : profile?.public_repos ?? 0}
                        </div>
                      </div>
                      <div>
                        <div className="mono text-[8.5px] font-extrabold text-[#666666] uppercase tracking-wider">Followers</div>
                        <div className="mono text-[14px] font-extrabold text-[#111111]">
                          {profileLoading ? '…' : profile?.followers ?? 0}
                        </div>
                      </div>
                      <div>
                        <div className="mono text-[8.5px] font-extrabold text-[#666666] uppercase tracking-wider">Following</div>
                        <div className="mono text-[14px] font-extrabold text-[#111111]">
                          {profileLoading ? '…' : profile?.following ?? 0}
                        </div>
                      </div>
                    </div>
                  </a>

                  {/* Navigation & Action Links */}
                  <div className="p-2 space-y-0.5 bg-white">
                    <a
                      href={profileUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => close()}
                      className="flex items-center justify-between px-3 py-2 rounded-md text-[12.5px] font-extrabold text-[#111111] hover:bg-[#C5F82A] border border-transparent hover:border-[#111111] transition-all cursor-pointer outline-none no-underline"
                    >
                      <div className="flex items-center gap-2.5">
                        <GithubIcon className="w-4 h-4 text-[#111111]" />
                        <span>GitHub Profile</span>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-[#111111]" />
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        close();
                        navigate('/settings');
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-md text-[12.5px] font-extrabold text-[#111111] hover:bg-[#C5F82A] border border-transparent hover:border-[#111111] transition-all cursor-pointer outline-none"
                    >
                      <div className="flex items-center gap-2.5">
                        <UserCheck className="w-4 h-4 text-[#111111]" />
                        <span>Account Settings</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-[#111111]" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        close();
                        setMeetDevOpen(true);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-md text-[12.5px] font-extrabold text-[#111111] hover:bg-[#C5F82A] border border-transparent hover:border-[#111111] transition-all cursor-pointer outline-none"
                    >
                      <div className="flex items-center gap-2.5">
                        <User className="w-4 h-4 text-[#111111]" />
                        <span>Meet the Developer</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-[#111111]" />
                    </button>

                    <a
                      href="https://buymeacoffee.com/dhanushdprabhu"
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => close()}
                      className="flex items-center justify-between px-3 py-2 rounded-md text-[12.5px] font-extrabold text-[#111111] hover:bg-[#FFDD00]/30 border border-transparent hover:border-[#111111] transition-all cursor-pointer outline-none no-underline"
                    >
                      <div className="flex items-center gap-2.5">
                        <Heart className="w-4 h-4 text-[#111111]" />
                        <span>Support ZORQEN</span>
                      </div>
                      <span className="mono text-[9px] font-extrabold uppercase bg-[#FFDD00] text-[#111111] px-1.5 py-0.5 rounded border border-[#111111] shadow-hard-sm">☕ COFFEE</span>
                    </a>
                  </div>

                  {/* Explicit Sign Out Action */}
                  <div className="p-2 border-t border-[#111111] bg-[#FAFAFA]">
                    <button
                      type="button"
                      onClick={() => {
                        close();
                        signOut();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-md text-[12.5px] font-extrabold text-[#DC2626] bg-[#FEE2E2] border border-[#111111] hover:bg-[#FCA5A5] transition-all shadow-hard-sm cursor-pointer outline-none"
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

        {/* Mobile Bottom Sheet Drawer (< md) */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
            {/* Backdrop Overlay */}
            <div
              className="fixed inset-0 bg-[#111111]/60 backdrop-blur-xs fade-in"
              onClick={closeMobileMenu}
            />

            {/* Bottom Sheet Modal Container (Height 65vh+) */}
            <div className="relative z-10 w-full min-h-[65vh] max-h-[85vh] overflow-y-auto bg-[#F7F7F2] border-t-2 border-[#111111] rounded-t-[24px] shadow-hard-lg p-6 space-y-5 slide-up">
              {/* Drag Handle */}
              <div className="w-12 h-1.5 bg-[#111111]/30 rounded-full mx-auto" />

              {/* Close Header */}
              <div className="flex items-center justify-between pb-2 border-b border-[#111111]/15">
                <span className="mono text-[10px] font-extrabold uppercase tracking-widest text-[#111111] bg-[#C5F82A] px-2 py-0.5 rounded border border-[#111111]">
                  ACCOUNT & NAVIGATION
                </span>
                <button
                  onClick={closeMobileMenu}
                  className="p-1 rounded-md text-[#111111] hover:bg-[#EAEAE2] border border-transparent hover:border-[#111111]"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Real GitHub Identity Card (Large Avatar 72px) */}
              <div className="flex flex-col items-center text-center space-y-3 p-5 rounded-2xl bg-white border border-[#111111] shadow-hard-sm">
                {profileLoading ? (
                  <div className="w-[72px] h-[72px] rounded-full bg-[#EAEAE2] animate-pulse border-2 border-[#111111]" />
                ) : avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-[72px] h-[72px] rounded-full border-2 border-[#111111] shadow-hard-sm object-cover" />
                ) : (
                  <div className="w-[72px] h-[72px] rounded-full bg-[#111111] text-[#C5F82A] border-2 border-[#111111] shadow-hard-sm flex items-center justify-center">
                    <GithubIcon className="w-9 h-9 text-[#C5F82A]" />
                  </div>
                )}

                <div className="space-y-0.5">
                  <h2 className="text-xl font-extrabold text-[#111111] tracking-tight">{displayName}</h2>
                  <div className="mono text-[12px] font-bold text-[#555555]">{displayHandle}</div>
                  {profile?.bio && <p className="text-[12.5px] text-[#4A4A4A] italic font-medium pt-1">{profile.bio}</p>}
                </div>

                {/* Mobile GitHub Stats Grid */}
                <div className="w-full grid grid-cols-3 gap-2 pt-3 border-t border-[#111111]/15 text-center">
                  <div>
                    <div className="mono text-[9px] font-extrabold text-[#666666] uppercase tracking-wider">Public Repos</div>
                    <div className="mono text-[15px] font-extrabold text-[#111111]">{profileLoading ? '…' : profile?.public_repos ?? 0}</div>
                  </div>
                  <div>
                    <div className="mono text-[9px] font-extrabold text-[#666666] uppercase tracking-wider">Followers</div>
                    <div className="mono text-[15px] font-extrabold text-[#111111]">{profileLoading ? '…' : profile?.followers ?? 0}</div>
                  </div>
                  <div>
                    <div className="mono text-[9px] font-extrabold text-[#666666] uppercase tracking-wider">Following</div>
                    <div className="mono text-[15px] font-extrabold text-[#111111]">{profileLoading ? '…' : profile?.following ?? 0}</div>
                  </div>
                </div>
              </div>

              {/* Primary Navigation items */}
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

              {/* Actions list */}
              <div className="pt-3 border-t border-[#111111] flex flex-col gap-2">
                <a
                  href={profileUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={closeMobileMenu}
                  className="flex items-center justify-between px-4 py-2.5 rounded-md border border-[#111111] bg-white text-[13px] font-extrabold text-[#111111] shadow-hard-sm no-underline"
                >
                  <div className="flex items-center gap-2">
                    <GithubIcon className="w-4 h-4 text-[#111111]" />
                    <span>GitHub Profile</span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-[#111111]" />
                </a>

                <button
                  type="button"
                  onClick={() => { closeMobileMenu(); navigate('/settings'); }}
                  className="flex items-center justify-between px-4 py-2.5 rounded-md border border-[#111111] bg-white text-[13px] font-extrabold text-[#111111] shadow-hard-sm"
                >
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[#111111]" />
                    <span>Account Settings</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#111111]" />
                </button>

                <button
                  type="button"
                  onClick={() => { closeMobileMenu(); setMeetDevOpen(true); }}
                  className="flex items-center justify-between px-4 py-2.5 rounded-md border border-[#111111] bg-white text-[13px] font-extrabold text-[#111111] shadow-hard-sm"
                >
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-[#111111]" />
                    <span>Meet the Developer</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#111111]" />
                </button>

                <a
                  href="https://buymeacoffee.com/dhanushdprabhu"
                  target="_blank"
                  rel="noreferrer"
                  onClick={closeMobileMenu}
                  className="flex items-center justify-between px-4 py-2.5 rounded-md border border-[#111111] bg-[#FFDD00] text-[13px] font-extrabold text-[#111111] shadow-hard-sm no-underline"
                >
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-[#111111]" />
                    <span>Support ZORQEN</span>
                  </div>
                  <span className="mono text-[9.5px] font-extrabold uppercase bg-[#111111] text-[#FFDD00] px-1.5 py-0.5 rounded">☕ COFFEE</span>
                </a>

                {user && (
                  <button
                    type="button"
                    onClick={() => { closeMobileMenu(); signOut(); }}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border border-[#111111] bg-[#FEE2E2] text-[#DC2626] text-[13px] font-extrabold shadow-hard-sm active:translate-y-0.5 mt-2 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
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
