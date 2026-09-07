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
  Terminal,
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
  group: 'Repositories' | 'Findings' | 'Actions' | 'Ask ZORQEN';
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

  const nav = (to: string) => {
    navigate(to);
    onClose();
  };

  const allItems: CmdItem[] = [
    // Repositories
    {
      id: 'repo-zorqen',
      label: 'Zorqen / Security Operations Console',
      description: 'main • Python • 153 files indexed',
      icon: <Folder className="w-4 h-4 text-[#111111]" />,
      group: 'Repositories',
      action: () => nav('/repos'),
    },
    {
      id: 'repo-switch',
      label: 'Switch Active Repository',
      description: currentRepo ? `${currentRepo.owner}/${currentRepo.name}` : 'no repository loaded',
      icon: <GitMerge className="w-4 h-4 text-[#111111]" />,
      group: 'Repositories',
      action: () => nav('/repos'),
    },
    // Findings
    {
      id: 'findings-search',
      label: 'Search Findings Index',
      description: 'Critical (2) • High (5) • Medium (8)',
      icon: <AlertTriangle className="w-4 h-4 text-[#DC2626]" />,
      group: 'Findings',
      shortcut: 'G F',
      action: () => nav('/findings'),
    },
    {
      id: 'latest-assessment',
      label: 'Open Latest Assessment Report',
      description: currentAssessment ? currentAssessment.id : 'no run recorded',
      icon: <ClipboardList className="w-4 h-4 text-[#111111]" />,
      group: 'Findings',
      action: () => {
        if (currentAssessment) nav(`/assessments/${currentAssessment.id.replace('#', '')}`);
      },
    },
    // Actions
    {
      id: 'run-assessment',
      label: 'Run Assessment',
      description: currentRepo ? `on ${currentRepo.name}` : 'execute full pipeline',
      icon: <Play className="w-4 h-4 text-[#111111]" />,
      group: 'Actions',
      shortcut: 'R',
      action: () => {
        if (currentRepo) {
          startAssessment();
          nav('/assessments');
        }
      },
    },
    {
      id: 'overview-page',
      label: 'Open Dashboard Overview',
      icon: <LayoutDashboard className="w-4 h-4 text-[#111111]" />,
      group: 'Actions',
      action: () => nav('/'),
    },
    {
      id: 'connect-github',
      label: 'Connect GitHub Account',
      description: 'OAuth read-only access',
      icon: <GithubIcon className="w-4 h-4 text-[#111111]" aria-label="GitHub" />,
      group: 'Actions',
      action: () => {
        connectGithub();
        onClose();
      },
    },
    {
      id: 'settings-page',
      label: 'Go to Settings & Configuration',
      icon: <Settings className="w-4 h-4 text-[#111111]" />,
      group: 'Actions',
      action: () => nav('/settings'),
    },
    // Ask ZORQEN
    {
      id: 'copilot-ask',
      label: 'What should I fix first?',
      description: 'Ask AI reasoning copilot for prioritized remediation',
      icon: <Bot className="w-4 h-4 text-[#111111]" />,
      group: 'Ask ZORQEN',
      shortcut: 'C',
      action: () => {
        setCopilotOpen(true);
        onClose();
      },
    },
    {
      id: 'copilot-toggle',
      label: copilotOpen ? 'Close Copilot Drawer' : 'Open Copilot Drawer',
      description: 'AI security assistant',
      icon: <Terminal className="w-4 h-4 text-[#111111]" />,
      group: 'Ask ZORQEN',
      action: () => {
        setCopilotOpen(!copilotOpen);
        onClose();
      },
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
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    }
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
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div className="cmd-box border-2 border-[#111111] shadow-hard-lg" onKeyDown={handleKey}>
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-2 border-b-2 border-[#111111] bg-white">
          <Search className="w-5 h-5 shrink-0 text-[#111111] stroke-[2px]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-[52px] bg-transparent border-none outline-none font-sans text-[15px] font-semibold text-[#111111] placeholder-[#525252]"
            placeholder="Search repositories, findings, actions, AI prompts…"
            aria-label="Command search"
          />
          <button
            onClick={onClose}
            className="sm:hidden w-8 h-8 rounded-[8px] bg-[#F9F8F5] border-1.5 border-[#111111] flex items-center justify-center text-[#111111] shrink-0"
            aria-label="Close"
          >
            <span className="mono text-[11px] font-bold">✕</span>
          </button>
          <kbd className="shrink-0 hidden sm:inline-flex">Esc</kbd>
        </div>

        {/* Category Quick Chips */}
        {!query && (
          <div className="px-4 py-2.5 bg-[#F9F8F5] border-b-2 border-[#111111]/20 flex items-center gap-2 overflow-x-auto scroll-thin">
            <span className="mono text-[10.5px] font-extrabold text-[#525252] uppercase tracking-wider shrink-0">
              FILTER:
            </span>
            <button
              onClick={() => setQuery('Repositories')}
              className="mono text-[11px] font-bold bg-white text-[#111111] px-3 py-1 rounded-full border-1.5 border-[#111111] hover:bg-[#ECEAE4] transition-colors shrink-0"
            >
              Repositories
            </button>
            <button
              onClick={() => setQuery('Findings')}
              className="mono text-[11px] font-bold bg-white text-[#111111] px-3 py-1 rounded-full border-1.5 border-[#111111] hover:bg-[#ECEAE4] transition-colors shrink-0"
            >
              Findings
            </button>
            <button
              onClick={() => setQuery('Actions')}
              className="mono text-[11px] font-bold bg-white text-[#111111] px-3 py-1 rounded-full border-1.5 border-[#111111] hover:bg-[#ECEAE4] transition-colors shrink-0"
            >
              Actions
            </button>
            <button
              onClick={() => setQuery('Ask ZORQEN')}
              className="mono text-[11px] font-bold bg-[#C8F31D] text-[#111111] px-3 py-1 rounded-full border-1.5 border-[#111111] shrink-0"
            >
              Ask ZORQEN
            </button>
          </div>
        )}

        {/* Scrollable Command List */}
        <div className="max-h-[420px] overflow-y-auto scroll-thin pb-2">
          {filtered.length === 0 && (
            <div className="px-4 py-12 text-center mono text-[13px] text-[#525252]">
              No commands match “{query}”
            </div>
          )}
          {Object.entries(groups).map(([group, items]) => (
            <div key={group}>
              <div className="mono text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-[#525252] px-4 py-2 bg-[#F9F8F5] border-y border-[#111111]/15">
                {group}
              </div>
              {items.map((item) => {
                const idx = flatIdx++;
                const isActive = idx === activeIdx;
                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between px-4 py-3.5 min-h-[52px] cursor-pointer text-[14px] font-semibold transition-all border-l-4 ${
                      isActive
                        ? 'bg-[#F9F8F5] text-[#111111] border-l-[#111111] font-bold'
                        : 'text-[#333333] border-l-transparent hover:bg-[#F9F8F5]'
                    }`}
                    onClick={() => item.action()}
                    onMouseEnter={() => setActiveIdx(idx)}
                    role="option"
                    aria-selected={isActive}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className={`w-5 h-5 flex items-center justify-center shrink-0 ${isActive ? 'text-[#111111]' : 'text-[#525252]'}`}>
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                      {item.description && (
                        <span className="mono text-[11.5px] text-[#525252] truncate font-normal">— {item.description}</span>
                      )}
                    </div>
                    {item.shortcut && <kbd className="ml-2 shrink-0">{item.shortcut}</kbd>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer Shortcut Bar */}
        <div className="flex items-center gap-4 px-4 py-2.5 bg-[#F9F8F5] border-t-2 border-[#111111]">
          <span className="mono text-[11px] text-[#525252] flex items-center gap-1.5 font-medium">
            <kbd>↑↓</kbd> navigate
          </span>
          <span className="mono text-[11px] text-[#525252] flex items-center gap-1.5 font-medium">
            <kbd>↵</kbd> select
          </span>
          <span className="mono text-[11px] text-[#525252] flex items-center gap-1.5 font-medium">
            <kbd>Esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
});

export default CommandPalette;