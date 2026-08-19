import { useEffect, useRef, useState } from 'react';
import { Bell, Bot, ChevronDown, Command, GitBranch, GitFork } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../store/WorkspaceContext';
import GithubIcon from './GithubIcon';

function Dropdown({
  trigger,
  children,
  align = 'left',
}: {
  trigger: (open: boolean) => React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen((o) => !o)}>{trigger(open)}</div>
      {open && (
        <div
          className="absolute top-[calc(100%+4px)] z-50 panel"
          style={{ ...(align === 'right' ? { right: 0 } : { left: 0 }), minWidth: 240, background: 'var(--color-panel-2)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

interface TopBarProps {
  onOpenCmd?: () => void;
}

export default function TopBar({ onOpenCmd }: TopBarProps) {
  const navigate = useNavigate();
  const {
    currentRepo,
    currentAssessment,
    branch,
    commit,
    repos,
    selectRepo,
    notifications,
    setCopilotOpen,
    copilotOpen,
  } = useWorkspace();

  const status = currentAssessment?.status ?? 'IDLE';
  const runningStep = currentAssessment?.steps.find((s) => s.status === 'running');

  const repoMenu = (
    <Dropdown
      trigger={(open) => (
        <div
          className="flex items-center gap-1.5 px-2 py-[3px] h-[26px] rounded-[6px] hover:bg-[var(--color-hover)] cursor-pointer transition-colors"
          title={currentRepo ? `${currentRepo.owner}/${currentRepo.name}` : 'no repository loaded'}
          aria-label="Switch repository"
        >
          <GitFork className="w-3 h-3" style={{ color: 'var(--color-ink-3)' }} />
          <span className="mono text-[11.5px] text-[var(--color-ink)] max-w-[160px] truncate">
            {currentRepo ? currentRepo.name : 'no repository'}
          </span>
          <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--color-ink-3)' }} />
        </div>
      )}
    >
      {(close) => (
        <div className="py-1">
          <div className="mono text-[9px] uppercase tracking-[0.1em] text-[var(--color-ink-3)] px-3 pt-1 pb-1.5">
            REPOSITORY
          </div>
          {repos.length === 0 && (
            <div className="px-3 py-2 text-[11px] mono text-[var(--color-ink-3)]">
              no repositories connected
            </div>
          )}
          {repos.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                if (currentRepo?.id === r.id) close();
                else {
                  selectRepo(r.id);
                  close();
                }
              }}
              className="w-full text-left flex items-center gap-2 px-3 py-[6px] text-[12px] hover:bg-[var(--color-hover)] transition-colors"
              style={{ color: currentRepo?.id === r.id ? 'var(--color-accent)' : 'var(--color-ink-2)' }}
            >
              <GitFork className="w-3 h-3" style={{ color: 'var(--color-ink-3)' }} />
              <span className="mono">{r.name}</span>
              <span className="chip ml-auto text-[9px]">{r.language}</span>
            </button>
          ))}
          <button
            onClick={() => { close(); navigate('/repos'); }}
            className="w-full text-left flex items-center gap-2 px-3 py-[6px] text-[12px] hover:bg-[var(--color-hover)] transition-colors"
            style={{ color: 'var(--color-ink-2)' }}
          >
            <GithubIcon className="w-3 h-3" style={{ color: 'var(--color-ink-3)' }} />
            <span>Browse repositories…</span>
          </button>
        </div>
      )}
    </Dropdown>
  );

  return (
    <header
      className="flex items-center shrink-0 border-b border-[var(--color-line)] px-2 gap-1"
      style={{ height: 40, background: 'var(--color-panel)' }}
    >
      {/* Left: wordmark + breadcrumb context */}
      <div className="flex items-center gap-0.5 min-w-0">
        <span className="mono font-bold text-[12px] tracking-[0.16em] px-2 select-none" style={{ color: 'var(--color-ink)' }}>
          ZORQEN
        </span>
        <span className="hidden lg:block" style={{ width: 1, height: 16, background: 'var(--color-line-2)' }} />

        <div className="flex items-center gap-0.5 pl-1">
          {repoMenu}

          <div className="flex items-center gap-1.5 px-2 py-[3px] h-[26px]">
            <GitBranch className="w-3 h-3" style={{ color: 'var(--color-ink-3)' }} />
            <span className="mono text-[11px]" style={{ color: 'var(--color-low)' }}>{branch}</span>
            <span className="mono text-[10px]" style={{ color: 'var(--color-ink-3)' }}>@</span>
            <span className="mono text-[11px]" style={{ color: 'var(--color-ink-2)' }}>{commit?.slice(0, 7) ?? '—'}</span>
          </div>
        </div>

        {/* Live assessment status */}
        <div className="hidden md:flex items-center gap-2 ml-1 pl-1 border-l border-[var(--color-line)]">
          {status === 'RUNNING' && (
            <span className="chip ok inline-flex items-center gap-1.5">
              <span className="pulse-dot" style={{ color: 'var(--color-accent)', background: 'var(--color-accent)' }} />
              {runningStep ? runningStep.label.toUpperCase() : 'ASSESSMENT RUNNING'}
            </span>
          )}
          {status === 'COMPLETED' && currentAssessment && (
            <button onClick={() => navigate(`/assessments/${currentAssessment.id.replace('#', '')}`)}
              className="chip inline-flex items-center gap-1.5 hover:bg-[var(--color-hover)] cursor-pointer transition-colors"
              title="Open assessment">
              <span className="w-[6px] h-[6px] rounded-full" style={{ background: 'var(--color-accent)' }} />
              {currentAssessment.id}
            </button>
          )}
          {status === 'IDLE' && <span className="chip" style={{ color: 'var(--color-ink-3)' }}>STANDBY</span>}
        </div>
      </div>

      {/* Right: Ask ZORQEN, notifications, cmd hint */}
      <div className="flex items-center gap-1 ml-auto">
        <button
          onClick={() => setCopilotOpen(!copilotOpen)}
          title="Ask ZORQEN about this assessment"
          className="flex items-center gap-1.5 px-2 py-[3px] h-[26px] rounded-[6px] text-[11px] font-medium transition-colors hover:bg-[var(--color-hover)]"
          style={{ color: copilotOpen ? 'var(--color-accent)' : 'var(--color-ink-2)' }}
        >
          <Bot className="w-[13px] h-[13px]" style={{ color: copilotOpen ? 'var(--color-accent)' : 'var(--color-ink-3)' }} strokeWidth={1.75} />
          Ask ZORQEN
        </button>

        {/* Notifications */}
        <Dropdown
          align="right"
          trigger={(_open) => (
            <div
              className="relative flex items-center justify-center w-[26px] h-[26px] rounded-[6px] hover:bg-[var(--color-hover)] cursor-pointer transition-colors"
              aria-label="Pipeline events"
            >
              <Bell className="w-[13px] h-[13px]" style={{ color: 'var(--color-ink-2)' }} />
              {notifications.length > 0 && (
                <span className="absolute top-[3px] right-[3px] w-[5px] h-[5px] rounded-full" style={{ background: 'var(--color-critical)' }} />
              )}
            </div>
          )}
        >
          {(close) => (
            <div className="py-1 w-[300px] max-h-[280px] overflow-y-auto scroll-thin">
              <div className="mono text-[9px] uppercase tracking-[0.1em] text-[var(--color-ink-3)] px-3 pt-1 pb-1.5">
                PIPELINE EVENTS
              </div>
              {notifications.length === 0 && (
                <div className="px-3 py-2 text-[11px] mono text-[var(--color-ink-3)]">
                  no events · start an assessment
                </div>
              )}
              {notifications.slice(-8).reverse().map((n, i) => (
                <div key={i} className="px-3 py-[4px] text-[11px] mono flex gap-2" style={{ color: 'var(--color-ink-2)' }}>
                  <span className="shrink-0" style={{ color: 'var(--color-ink-3)' }}>{n.time}</span>
                  <span className="truncate">{`${n.source}: ${n.text}`}</span>
                </div>
              ))}
              <button onClick={close} className="w-full text-left px-3 py-[5px] text-[11px] mono hover:bg-[var(--color-hover)] border-t border-[var(--color-line)] mt-1 pt-2" style={{ color: 'var(--color-ink-3)' }}>
                dismiss all
              </button>
            </div>
          )}
        </Dropdown>

        {/* Cmd+K hint */}
        <button
          onClick={onOpenCmd}
          title="Command palette (Cmd+K)"
          aria-label="Open command palette"
          className="hidden lg:flex items-center gap-1.5 px-2 py-[3px] h-[26px] rounded-[6px] hover:bg-[var(--color-hover)] transition-colors"
        >
          <Command className="w-[12px] h-[12px]" style={{ color: 'var(--color-ink-3)' }} />
          <span className="mono text-[9.5px] text-[var(--color-ink-3)]">K</span>
        </button>
      </div>
    </header>
  );
}