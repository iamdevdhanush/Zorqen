import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ChevronDown,
  ClipboardList,
  Folder,
  LayoutDashboard,
  LogOut,
  Settings,
} from 'lucide-react';
import { useWorkspace } from '../store/WorkspaceContext';
import GithubIcon from './GithubIcon';
import { Dropdown } from './ui';

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/repos', label: 'Repositories', icon: Folder },
  { to: '/assessments', label: 'Assessments', icon: ClipboardList },
  { to: '/findings', label: 'Findings', icon: AlertTriangle },
];

export default function Sidebar() {
  const { currentAssessment, githubConnected, user, connectGithub, disconnectGithub, signOut } = useWorkspace();
  const location = useLocation();
  const navigate = useNavigate();

  const findings = currentAssessment?.findings ?? [];
  const openCount = findings.filter((f) => f.status === 'OPEN' || f.status === 'REVIEW').length;
  const critCount = findings.filter((f) => f.severity === 'critical' && (f.status === 'OPEN' || f.status === 'REVIEW')).length;

  const isActive = (to: string, end?: boolean) => {
    if (end) return location.pathname === to;
    return location.pathname.startsWith(to);
  };

  const initials = (user?.github_name ?? user?.github_login ?? '?').slice(0, 1).toUpperCase();

  return (
    <aside
      className="flex flex-col shrink-0 border-r border-[var(--color-line)]"
      style={{ width: 220, background: 'var(--color-base)' }}
    >
      {/* Wordmark */}
      <div className="px-4 pt-[12px] pb-[10px] border-b border-[var(--color-line)]">
        <div className="mono font-bold text-[13px] tracking-[0.18em]" style={{ color: 'var(--color-ink)' }}>
          ZORQEN
        </div>
        <div className="mono text-[8.5px] tracking-[0.1em] mt-[3px]" style={{ color: 'var(--color-ink-3)' }}>
          SECURITY VALIDATION
        </div>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 px-2 py-2 space-y-[2px] overflow-y-auto scroll-thin">
        {NAV.map(({ to, label, icon: Icon, end }) => {
          const active = isActive(to, end);
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={label}
              className="flex items-center gap-[10px] px-[10px] py-[6px] rounded-[6px] text-[12.5px] transition-colors duration-100 group"
              style={{
                color: active ? 'var(--color-ink)' : 'var(--color-ink-2)',
                background: active ? 'var(--color-active)' : 'transparent',
              }}
            >
              <Icon
                className="w-[14px] h-[14px] shrink-0"
                style={{ color: active ? 'var(--color-accent)' : 'var(--color-ink-3)' }}
                strokeWidth={1.75}
              />
              <span className="flex-1 truncate">{label}</span>

              {label === 'Findings' && openCount > 0 && (
                <span className={`nav-badge ${critCount > 0 ? 'crit' : 'neutral'}`}>{openCount}</span>
              )}
              {label === 'Assessments' && currentAssessment && (
                <span className="nav-badge neutral">1</span>
              )}
            </NavLink>
          );
        })}

        {/* Critical inline notice — findable from Findings */}
        {critCount > 0 && (
          <button
            onClick={() => navigate('/findings')}
            className="w-full flex items-center gap-[10px] px-[10px] py-[4px] rounded-[6px] hover:bg-[var(--color-hover)] transition-colors"
          >
            <span className="w-[14px]" />
            <span className="mono text-[9.5px] flex items-center gap-1.5" style={{ color: 'var(--color-critical)' }}>
              <span className="w-[5px] h-[5px] rounded-full inline-block" style={{ background: 'var(--color-critical)' }} />
              {critCount} CRITICAL OPEN
            </span>
          </button>
        )}

        <div className="nav-divider" />
        <NavLink
          to="/settings"
          title="Settings"
          className="flex items-center gap-[10px] px-[10px] py-[6px] rounded-[6px] text-[12.5px] transition-colors duration-100"
          style={({ isActive }) => ({
            color: isActive ? 'var(--color-ink)' : 'var(--color-ink-2)',
            background: isActive ? 'var(--color-active)' : 'transparent',
          })}
        >
          <Settings className="w-[14px] h-[14px] shrink-0" style={{ color: 'var(--color-ink-3)' }} strokeWidth={1.75} />
          Settings
        </NavLink>
      </nav>

      {/* Bottom: GitHub status + user */}
      <div className="border-t border-[var(--color-line)] px-2 py-2 space-y-[2px]">
        {/* GitHub */}
        <Dropdown
          align="right"
          className="w-full"
          trigger={(open) => (
            <div
              className={`flex items-center gap-[10px] px-[10px] py-[5px] rounded-[6px] transition-colors ${
                open ? 'bg-[var(--color-hover)]' : 'hover:bg-[var(--color-hover)]'
              }`}
            >
              <GithubIcon className="w-[14px] h-[14px] shrink-0 text-[#111111]" aria-label="GitHub" />
              <span className="mono text-[10px] flex-1 truncate font-bold text-[#111111]">
                {githubConnected ? `CONNECTED @${(user?.github_login ?? '').toUpperCase()}` : 'CONNECT GITHUB'}
              </span>
              <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--color-ink-3)' }} />
            </div>
          )}
        >
          {(close) => (
            <div className="py-1 w-[240px]">
              <div className="px-3 pt-1.5 pb-2 border-b border-[var(--color-line)] mb-1">
                <div className="text-[12px] font-medium text-[var(--color-ink)]">GitHub integration</div>
                <div className="mono text-[10px] mt-0.5 text-[var(--color-ink-3)]">
                  {githubConnected ? 'read access · repos fetched from your account' : 'read-only · no write scope requested'}
                </div>
              </div>
              {githubConnected ? (
                <button
                  onClick={() => { close(); disconnectGithub(); }}
                  className="w-full text-left flex items-center gap-2 px-3 py-[6px] text-[12px] hover:bg-[var(--color-hover)]"
                  style={{ color: 'var(--color-critical)' }}
                >
                  <LogOut className="w-3 h-3" /> Disconnect GitHub
                </button>
              ) : (
                <button
                  onClick={() => { close(); connectGithub(); }}
                  className="w-full text-left flex items-center gap-2 px-3 py-[6px] text-[12px] hover:bg-[var(--color-hover)] text-[#111111]"
                >
                  <GithubIcon className="w-3.5 h-3.5 text-[#111111]" aria-label="GitHub" />
                  Connect GitHub
                </button>
              )}
            </div>
          )}
        </Dropdown>

        {/* User */}
        <Dropdown
          align="right"
          className="w-full"
          trigger={(open) => (
            <div
              className={`flex items-center gap-[10px] px-[10px] py-[5px] rounded-[6px] transition-colors ${
                open ? 'bg-[var(--color-hover)]' : 'hover:bg-[var(--color-hover)]'
              }`}
            >
              {user?.github_avatar_url ? (
                <img src={user.github_avatar_url} alt="" className="w-[17px] h-[17px] rounded-full shrink-0" />
              ) : (
                <span
                  className="w-[17px] h-[17px] rounded-full flex items-center justify-center text-[9px] font-semibold shrink-0"
                  style={{
                    background: user ? 'rgba(63,185,80,0.15)' : 'var(--color-panel-2)',
                    color: user ? 'var(--color-accent)' : 'var(--color-ink-3)',
                    border: '1px solid var(--color-line-2)',
                  }}
                >
                  {user ? initials : '?'}
                </span>
              )}
              <span className="text-[11.5px] flex-1 truncate" style={{ color: user ? 'var(--color-ink)' : 'var(--color-ink-3)' }}>
                {user?.github_name ?? user?.github_login ?? 'not signed in'}
              </span>
              <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--color-ink-3)' }} />
            </div>
          )}
        >
          {(close) => (
            <div className="py-1 w-[220px]">
              {user ? (
                <>
                  <div className="px-3 py-1.5 border-b border-[var(--color-line)] mb-1">
                    <div className="text-[12px] font-medium text-[var(--color-ink)]">{user.github_name ?? user.github_login}</div>
                    <div className="mono text-[10px] text-[var(--color-ink-3)]">@{user.github_login}</div>
                  </div>
                  <button
                    onClick={() => { close(); signOut(); }}
                    className="w-full text-left flex items-center gap-2 px-3 py-[5px] text-[12px] hover:bg-[var(--color-hover)]"
                    style={{ color: 'var(--color-critical)' }}
                  >
                    <LogOut className="w-3 h-3" /> Sign out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { close(); connectGithub(); }}
                  className="w-full text-left flex items-center gap-2 px-3 py-[5px] text-[12px] hover:bg-[var(--color-hover)] text-[#111111]"
                >
                  <GithubIcon className="w-3.5 h-3.5 text-[#111111]" aria-label="GitHub" /> Connect GitHub
                </button>
              )}
            </div>
          )}
        </Dropdown>
      </div>
    </aside>
  );
}