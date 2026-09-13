import { memo, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspaceData, useFinding } from '../store/WorkspaceContext';
import { copilotChat, type CopilotChatContext, type CopilotSource } from '../services/api';
import type { Finding } from '../lib/types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: CopilotSource[];
}

const ERROR_MESSAGE = 'Investigation telemetry offline. Please retry command.';

const MAX_HISTORY = 8;

function starterQuestions(page: string, finding?: Finding): string[] {
  if (page.startsWith('/findings/') && finding) {
    return [
      `why is ${finding.id} dangerous`,
      'show evidence',
      'sandbox validation',
      'remediation diff',
    ];
  }
  if (page.startsWith('/repos/')) {
    return [
      'current posture',
      'highest risk',
      'vulnerable routes',
      'secrets found',
    ];
  }
  if (page.startsWith('/assessments/')) {
    return [
      'highest risk',
      'vulnerable routes',
      'critical findings',
      'sandbox status',
    ];
  }
  return [
    'current posture',
    'highest risk',
    'vulnerable routes',
    'secrets found',
  ];
}

function sourceLabel(s: CopilotSource): string {
  switch (s.type) {
    case 'finding':
      return s.id ?? 'FINDING';
    case 'assessment':
      return s.id ?? 'ASSESSMENT';
    case 'repository':
      return s.name ?? 'REPO';
    case 'source':
      return `${s.file ?? 'source'}${s.line ? `:${s.line}` : ''}`;
  }
}

/** Security keyword highlighter for assistant output */
const KEYWORD_REGEX = /(High confidence|Critical|High risk|High|Moderate risk|Moderate|Medium|Low risk|Low|Validated|Confirmed|Remediation|Exploitable|Vulnerabilit(?:y|ies)|AST|Sandbox|Patch(?:es)?|Secrets?|SQL Injection|OWASP|Read-only|Isolated|Zero-day|Verified|Passed)/gi;

function renderKeywordText(text: string) {
  const parts = text.split(KEYWORD_REGEX);
  return parts.map((part, idx) => {
    if (KEYWORD_REGEX.test(part)) {
      return (
        <span key={idx} className="text-[#C8F31D] font-bold">
          {part}
        </span>
      );
    }
    return part;
  });
}

const SecurityCopilot = memo(function SecurityCopilot({
  assessmentId,
  onClose,
}: {
  assessmentId?: string;
  onClose: () => void;
}) {
  const { currentRepo, currentAssessment } = useWorkspaceData();
  const navigate = useNavigate();
  const page = window.location.pathname;
  const findingId = page.startsWith('/findings/') ? page.split('/findings/')[1] : undefined;
  const finding = useFinding(findingId as string | undefined);

  // Terminal conversation feed begins clean with zero bloated intro cards
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input automatically on drawer open
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Keyboard shortcut: Escape closes Ask ZORQEN
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Smooth auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const openSource = (s: CopilotSource) => {
    if (s.type === 'repository' && s.id) {
      navigate(`/repos/${s.id}`);
      return;
    }
    if (s.type === 'finding' && s.id) {
      navigate(`/findings/${s.id}`);
      return;
    }
    if (s.type === 'source' && s.finding_id) {
      navigate(`/findings/${s.finding_id}`);
      return;
    }
    if (s.type === 'assessment') {
      const run = s.run_number ?? (s.id ? s.id.replace(/\D/g, '') : undefined);
      if (run) navigate(`/assessments/${run}`);
    }
  };

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');

    const history = messages
      .map((m) => ({ role: m.role, content: m.content }))
      .slice(-MAX_HISTORY);

    const context: CopilotChatContext = {
      page,
      repositoryId: currentRepo?.id,
      assessmentId: currentAssessment?.id ?? assessmentId,
      findingId: finding?.id,
      history,
    };

    setMessages((m) => [...m, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const { data } = await copilotChat(msg, context);
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: data.answer, sources: (data.sources ?? []) as CopilotSource[] },
      ]);
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: { message?: string; code?: string } } } })
        ?.response?.data?.detail;
      const msgText =
        detail?.message ||
        (detail?.code ? `Investigation error (${detail.code}). Please re-run command.` : ERROR_MESSAGE);
      setMessages((m) => [...m, { role: 'assistant', content: msgText, sources: [] }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const questions = starterQuestions(page, finding);
  const repoName = (currentRepo?.name || 'ZORQEN').toUpperCase();
  const runId = currentAssessment?.id || 'RUN-143';

  return (
    <>
      {/* Optional backdrop on mobile viewports */}
      <div
        onClick={onClose}
        className="fixed inset-0 top-[72px] bg-black/40 z-40 sm:hidden transition-opacity"
        aria-hidden="true"
      />

      {/* Security Investigation Terminal Drawer */}
      <aside
        className="fixed top-[72px] right-0 bottom-0 z-50 flex flex-col w-full sm:w-[440px] bg-[#0A0A0A] text-[#ECEBE6] border-l-[3px] border-[#111111] shadow-hard-lg overflow-hidden transition-all duration-200 select-text"
        aria-label="Security Investigation Terminal"
      >
        {/* ═════ 1. Command Terminal Header ═════ */}
        <header className="px-4 py-3 border-b-[3px] border-[#111111] bg-[#0E0E0E] shrink-0 space-y-2.5">
          {/* Top row: > ASK ZORQEN & [LIVE ANALYST] */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[#C8F31D] font-mono text-[20px] font-black leading-none select-none">
                &gt;
              </span>
              <h2 className="text-[20px] font-bold tracking-tight text-white uppercase font-sans leading-none">
                ASK ZORQEN
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="mono text-[11px] font-bold text-[#C8F31D] tracking-widest flex items-center gap-1.5 select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C8F31D] animate-pulse" />
                <span>[LIVE ANALYST]</span>
              </div>
              <button
                onClick={onClose}
                className="mono text-[13px] font-bold text-zinc-400 hover:text-white hover:bg-[#1C1C1C] w-7 h-7 flex items-center justify-center border border-[#333333] transition-colors cursor-pointer select-none"
                title="Close terminal (Esc)"
                aria-label="Close Ask ZORQEN"
              >
                ×
              </button>
            </div>
          </div>

          {/* Second row: Monospace Metadata */}
          <div className="mono text-[12px] text-zinc-400 font-medium flex items-center gap-2 sm:gap-2.5 flex-wrap border-t border-[#1E1E1E] pt-2 select-none">
            <span>
              Repo: <strong className="text-[#ECEBE6] font-bold">{repoName}</strong>
            </span>
            <span className="text-zinc-600">//</span>
            <span>
              Run: <strong className="text-[#ECEBE6] font-bold">{runId}</strong>
            </span>
            <span className="text-zinc-600">//</span>
            <span className="text-zinc-400">
              Mode: <strong className="text-[#C8F31D] font-bold">READ ONLY</strong>
            </span>
          </div>
        </header>

        {/* Active Target Banner (if viewing specific finding) */}
        {finding && (
          <div className="px-4 py-2 border-b border-[#222222] mono text-[11px] font-bold bg-[#141414] text-[#C8F31D] flex items-center justify-between shrink-0">
            <span className="truncate">TARGET: {finding.id} // {finding.title}</span>
            <span className="text-[10px] text-zinc-500 uppercase shrink-0">FOCUSED</span>
          </div>
        )}

        {/* ═════ 2. Conversation Area ═════ */}
        <div className="flex-1 overflow-y-auto scroll-thin p-4 space-y-4 font-mono text-[13px] bg-[#070707]">
          {/* Ready Banner */}
          <div className="space-y-2 pb-2">
            <div className="mono text-[12px] font-bold text-[#C8F31D] tracking-wider flex items-center gap-2 select-none">
              <span>&gt;</span>
              <span>READY FOR SECURITY INVESTIGATION.</span>
            </div>
            <div className="border-b border-[#222222]" />
          </div>

          {/* Initial Suggested Command Chips (Visible before inquiry) */}
          {messages.length === 0 && (
            <div className="space-y-2.5 pt-1">
              <div className="mono text-[11px] font-bold text-zinc-500 uppercase tracking-widest select-none">
                SUGGESTED COMMANDS
              </div>
              <div className="flex flex-wrap gap-2">
                {questions.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => send(q)}
                    className="mono text-[12px] font-bold px-3 py-1.5 border-2 border-[#262626] bg-[#121212] text-[#ECEBE6] hover:bg-[#C8F31D] hover:text-[#111111] hover:border-[#C8F31D] transition-colors cursor-pointer select-none"
                  >
                    $ {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message Stream */}
          {messages.map((m, i) => (
            <div key={i} className="space-y-2">
              {m.role === 'user' ? (
                /* User command block: right-aligned, dark gray bg, 2px border, no bubble */
                <div className="flex justify-end">
                  <div className="bg-[#181818] border-2 border-[#333333] px-3.5 py-2.5 text-left font-mono text-[13.5px] text-[#ECEBE6] max-w-[90%] shadow-hard-sm">
                    <span className="text-[#C8F31D] font-bold mr-2">$</span>
                    <span>{m.content}</span>
                  </div>
                </div>
              ) : (
                /* Assistant message: plain text on black, prefixed with > zorqen_agent, lime keywords */
                <div className="space-y-1.5 animate-terminal-fade">
                  <div className="mono text-[12px] font-bold text-[#C8F31D] tracking-wider select-none">
                    &gt; zorqen_agent
                  </div>
                  <div className="text-[15px] sm:text-[16px] leading-[1.65] text-[#ECEBE6] font-sans whitespace-pre-wrap pl-3 border-l-2 border-[#222222]">
                    {renderKeywordText(m.content)}
                  </div>
                  {m.sources && m.sources.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1.5 pl-3">
                      {m.sources.map((s, j) => (
                        <button
                          key={j}
                          onClick={() => openSource(s)}
                          title={s.title ?? s.name ?? s.file}
                          className="mono text-[11px] font-bold px-2 py-0.5 border border-[#333333] bg-[#121212] text-[#C8F31D] hover:bg-[#C8F31D] hover:text-[#111111] hover:border-[#C8F31D] transition-colors cursor-pointer"
                        >
                          {sourceLabel(s)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Loading Telemetry State */}
          {loading && (
            <div className="flex items-center gap-2 text-[#C8F31D] mono text-[12px] pl-1 animate-pulse select-none">
              <span className="w-2 h-3.5 bg-[#C8F31D] inline-block" />
              <span>&gt; zorqen_agent analyzing AST telemetry...</span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Subsequent Command Chips (compact bar when messages are present) */}
        {messages.length > 0 && !loading && (
          <div className="px-4 py-2 border-t border-[#1C1C1C] bg-[#0E0E0E] shrink-0 flex items-center gap-2 overflow-x-auto scroll-thin">
            <span className="mono text-[10px] font-bold text-zinc-600 uppercase shrink-0 select-none">QUICK:</span>
            {questions.slice(0, 3).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => send(q)}
                className="mono text-[11px] font-bold px-2.5 py-1 border border-[#262626] bg-[#141414] text-zinc-300 hover:bg-[#C8F31D] hover:text-[#111111] hover:border-[#C8F31D] transition-colors shrink-0 cursor-pointer select-none"
              >
                $ {q}
              </button>
            ))}
          </div>
        )}

        {/* ═════ 3. Terminal Command Bar Input ═════ */}
        <footer className="p-4 border-t-[3px] border-[#111111] bg-[#0E0E0E] shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-center bg-[#000000] border-2 border-[#262626] focus-within:border-[#C8F31D] h-[48px] px-3.5 transition-colors group"
          >
            {/* Left Prompt Indicator $ */}
            <span className="mono text-[#C8F31D] font-bold text-[15px] select-none mr-2.5">
              $
            </span>

            {/* Center Terminal Input */}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type investigation command..."
              disabled={loading}
              className="flex-1 bg-transparent text-[#ECEBE6] font-mono text-[13.5px] sm:text-[14px] outline-none placeholder:text-zinc-600 caret-[#C8F31D]"
            />

            {/* Right Command Submit Arrow */}
            <button
              type="submit"
              disabled={!input.trim() || loading}
              aria-label="Execute investigation command"
              className="text-[#C8F31D] hover:text-white disabled:text-zinc-700 text-[18px] font-bold px-1.5 py-1 transition-all cursor-pointer disabled:cursor-not-allowed group-hover:translate-x-0.5"
            >
              ➜
            </button>
          </form>
        </footer>
      </aside>
    </>
  );
});

export default SecurityCopilot;
