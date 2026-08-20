import { memo, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bot,
  ClipboardList,
  Folder,
  GitMerge,
  LayoutDashboard,
  Play,
  Search,
  Settings,
} from 'lucide-react';
import GithubIcon from './GithubIcon';
import { useWorkspaceData, useWorkspaceUI } from '../store/WorkspaceContext';

interface CmdItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
  group: string;
}

interface CommandPaletteProps {
  onClose: () => void;
}

const CommandPalette = memo(function CommandPalette({ onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { copilotOpen, setCopilotOpen } = useWorkspaceUI();
  const { currentRepo, currentAssessment, startAssessment, connectGithub } = useWorkspaceData();
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const nav = (to: string) => { navigate(to); onClose(); };

  const allItems: CmdItem[] = [
    { id: 'findings', label: 'Search findings', icon: <AlertTriangle className="w-3.5 h-3.5" />, group: 'Navigation', shortcut: 'G F', action: () => nav('/findings') },
    { id: 'overview', label: 'Open repository overview', icon: <LayoutDashboard className="w-3.5 h-3.5" />, group: 'Navigation', action: () => nav('/') },
    { id: 'repos', label: 'Open repositories', icon: <Folder className="w-3.5 h-3.5" />, group: 'Navigation', action: () => nav('/repos') },
    { id: 'assessments', label: 'Open assessments', icon: <ClipboardList className="w-3.5 h-3.5" />, group: 'Navigation', action: () => nav('/assessments') },
    { id: 'settings', label: 'Go to Settings', icon: <Settings className="w-3.5 h-3.5" />, group: 'Navigation', action: () => nav('/settings') },
    {
      id: 'run',
      label: 'Run assessment',
      description: currentRepo ? `on ${currentRepo.name}` : 'no repository loaded',
      icon: <Play className="w-3.5 h-3.5" />,
      group: 'Actions',
      shortcut: 'R',
      action: () => { if (currentRepo) { startAssessment(); nav('/assessments'); } },
    },
    {
      id: 'latest',
      label: 'Open latest assessment',
      description: currentAssessment ? currentAssessment.id : 'none recorded yet',
      icon: <ClipboardList className="w-3.5 h-3.5" />,
      group: 'Actions',
      action: () => { if (currentAssessment) nav(`/assessments/${currentAssessment.id.replace('#', '')}`); },
    },
    {
      id: 'repo',
      label: 'Switch repository',
      description: currentRepo ? `${currentRepo.owner}/${currentRepo.name}` : 'no repository loaded',
      icon: <GitMerge className="w-3.5 h-3.5" />,
      group: 'Actions',
      action: () => { nav('/repos'); },
    },
    {
      id: 'github',
      label: 'Connect GitHub',
      description: 'read-only access to authorized repositories',
      icon: <GithubIcon className="w-3.5 h-3.5" />,
      group: 'Actions',
      action: () => { connectGithub(); onClose(); },
    },
    {
      id: 'copilot',
      label: copilotOpen ? 'Close Ask ZORQEN' : 'Ask ZORQEN',
      description: 'context: current repository, finding, evidence',
      icon: <Bot className="w-3.5 h-3.5" />,
      group: 'Actions',
      shortcut: 'C',
      action: () => { setCopilotOpen(!copilotOpen); onClose(); },
    },
  ];

  const filtered = query.trim()
    ? allItems.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.description?.toLowerCase().includes(query.toLowerCase()) ||
          item.group.toLowerCase().includes(query.toLowerCase())
      )
    : allItems;

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === 'Enter') {
      e.preventDefault();
      filtered[activeIdx]?.action();
    }
  };

  const groups = filtered.reduce<Record<string, CmdItem[]>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  let flatIdx = 0;

  return (
    <div
      className="cmd-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div className="cmd-box" onKeyDown={handleKey}>
        <div className="flex items-center gap-2 px-4 border-b border-[var(--color-line)]">
          <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--color-ink-3)' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="cmd-input"
            placeholder="Search commands, pages, actions…"
            aria-label="Command search"
          />
          <kbd>Esc</kbd>
        </div>

        <div className="max-h-[360px] overflow-y-auto scroll-thin pb-2">
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center mono text-[11px] text-[var(--color-ink-3)]">
              No commands match “{query}”
            </div>
          )}
          {Object.entries(groups).map(([group, items]) => (
            <div key={group}>
              <div className="cmd-section-label">{group}</div>
              {items.map((item) => {
                const idx = flatIdx++;
                const isActive = idx === activeIdx;
                return (
                  <div
                    key={item.id}
                    className={`cmd-item${isActive ? ' active' : ''}`}
                    onClick={() => item.action()}
                    onMouseEnter={() => setActiveIdx(idx)}
                    role="option"
                    aria-selected={isActive}
                  >
                    <span style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-ink-3)' }}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                    {item.description && (
                      <span className="mono text-[10px] text-[var(--color-ink-3)]">— {item.description}</span>
                    )}
                    {item.shortcut && (
                      <span className="cmd-kbd">{item.shortcut}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 px-4 py-2 border-t border-[var(--color-line)]">
          <span className="mono text-[9.5px] text-[var(--color-ink-3)] flex items-center gap-1">
            <kbd>↑↓</kbd> navigate
          </span>
          <span className="mono text-[9.5px] text-[var(--color-ink-3)] flex items-center gap-1">
            <kbd>↵</kbd> select
          </span>
          <span className="mono text-[9.5px] text-[var(--color-ink-3)] flex items-center gap-1">
            <kbd>Esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
});

export default CommandPalette;