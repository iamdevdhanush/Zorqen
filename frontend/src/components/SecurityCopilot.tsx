import { memo, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, X } from 'lucide-react';
import { useWorkspaceData, useFinding } from '../store/WorkspaceContext';
import { copilotChat, type CopilotChatContext, type CopilotSource } from '../services/api';
import type { Finding } from '../lib/types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: CopilotSource[];
}

const ERROR_MESSAGE = 'Unable to reach the security analyst. Please try again.';
const MAX_HISTORY = 8;

function starterQuestions(page: string, finding?: Finding): string[] {
  if (page.startsWith('/findings/') && finding) {
    return [
      'Explain this vulnerability',
      'Review authentication flow',
      'Show exploitability evidence',
      'How to remediate this finding',
    ];
  }
  return [
    'Current security posture',
    'Highest-risk findings',
    'Review authentication flow',
    'Explain this vulnerability',
  ];
}

function sourceLabel(s: CopilotSource): string {
  switch (s.type) {
    case 'finding':
      return s.id ?? 'Finding';
    case 'assessment':
      return s.id ?? 'Assessment';
    case 'repository':
      return s.name ?? 'Repo';
    case 'source':
      return `${s.file ?? 'source'}${s.line ? `:${s.line}` : ''}`;
  }
}

/** Render body text with Inter and monospace only for code blocks/file paths/commands */
function renderMessageText(content: string) {
  const codeBlockRegex = /```([\s\S]*?)```|`([^`]+)`/g;
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.substring(lastIndex, match.index));
    }
    if (match[1] !== undefined) {
      parts.push(
        <pre
          key={match.index}
          className="my-2 p-3 rounded-[10px] bg-[#111111] text-[#ECEBE6] font-mono text-[12px] overflow-x-auto leading-[1.5]"
        >
          <code>{match[1].trim()}</code>
        </pre>
      );
    } else if (match[2] !== undefined) {
      parts.push(
        <code
          key={match.index}
          className="font-mono text-[12px] bg-[#EAE8E0] text-[#111111] px-1.5 py-0.5 rounded-[5px] border border-[#DCDAD2]"
        >
          {match[2]}
        </code>
      );
    }
    lastIndex = codeBlockRegex.lastIndex;
  }

  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex));
  }

  return parts;
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

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input on drawer open
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Escape key closes drawer
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Scroll to bottom on new messages or loading
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
        (detail?.code ? `Investigation error (${detail.code}). Please try again.` : ERROR_MESSAGE);
      setMessages((m) => [...m, { role: 'assistant', content: msgText, sources: [] }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const questions = starterQuestions(page, finding);
  const repoName = currentRepo?.name || 'ZORQEN';
  const runId = currentAssessment?.id || 'RUN-143';

  return (
    <>
      {/* Soft Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/15 z-40 transition-opacity duration-200"
        aria-hidden="true"
      />

      {/* Premium Enterprise AI Assistant Sidebar */}
      <aside
        className="fixed inset-y-0 right-0 z-50 flex flex-col w-full sm:w-[400px] bg-[#F8F7F2] text-[#111111] border-l border-[#E5E5E5] rounded-l-[28px] overflow-hidden transition-all duration-200 ease-out select-text"
        style={{
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.08)',
        }}
        aria-label="Ask ZORQEN Security Assistant"
      >
        {/* ═════ Header ═════ */}
        <header className="px-6 pt-5 pb-4 border-b border-[#E5E5E5] bg-[#F8F7F2] shrink-0 space-y-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <h2 className="text-[18px] font-bold text-[#111111] tracking-tight font-sans">
                Ask ZORQEN
              </h2>
              <div className="text-[13px] text-[#666666] font-normal font-sans">
                Live Security Analyst
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Compact Status Chip */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#C8F31D]/20 border border-[#C8F31D]/40 text-[#111111] text-[12px] font-medium font-sans select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                <span>Ready</span>
              </div>

              {/* Ghost Close Button */}
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#777777] hover:text-[#111111] hover:bg-black/5 transition-colors cursor-pointer"
                title="Close (Esc)"
                aria-label="Close Ask ZORQEN"
              >
                <X className="w-4 h-4 stroke-[2]" />
              </button>
            </div>
          </div>

          {/* Metadata: Repo • Run • Read-only in one clean row */}
          <div className="text-[12px] text-[#777777] font-medium font-sans flex items-center gap-1.5 flex-wrap select-none">
            <span>{repoName}</span>
            <span className="text-[#BBBBBB]">•</span>
            <span className="font-mono text-[11.5px]">{runId}</span>
            <span className="text-[#BBBBBB]">•</span>
            <span>Read-only</span>
          </div>
        </header>

        {/* ═════ Conversation Area ═════ */}
        <div className="flex-1 overflow-y-auto scroll-thin px-5 py-5 space-y-4 font-sans bg-[#F8F7F2]">
          {/* Empty State */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center text-center pt-8 pb-4 px-2 space-y-4">
              {/* Small ZORQEN Badge */}
              <div className="w-10 h-10 rounded-full bg-[#111111] text-[#C8F31D] flex items-center justify-center text-[15px] font-bold shadow-sm">
                Z
              </div>

              {/* Title & Description */}
              <div className="space-y-1.5 max-w-[300px]">
                <h3 className="text-[17px] sm:text-[18px] font-bold text-[#111111] tracking-tight font-sans">
                  Start a security investigation
                </h3>
                <p className="text-[13.5px] text-[#666666] leading-relaxed font-sans">
                  Ask about risks, attack paths, vulnerable files, or remediation.
                </p>
              </div>

              {/* Suggested Prompts */}
              <div className="w-full pt-4 space-y-2 text-left">
                <div className="text-[11px] font-semibold text-[#888888] uppercase tracking-wider px-1 font-sans select-none">
                  Suggested prompts
                </div>
                <div className="flex flex-wrap gap-2">
                  {questions.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => send(q)}
                      className="w-full sm:w-auto text-left rounded-[14px] bg-white border border-[#E5E5E5] px-3.5 py-2.5 text-[13px] font-medium text-[#222222] hover:border-[#111111] hover:bg-[#F2F0E8] hover:-translate-y-[2px] transition-all duration-150 shadow-xs cursor-pointer font-sans"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Messages Stream */}
          {messages.map((m, i) => (
            <div key={i} className="space-y-2">
              {m.role === 'user' ? (
                /* User Message: Light gray bubble, right aligned, rounded pill corners */
                <div className="flex justify-end animate-fadeIn">
                  <div className="bg-[#ECEAE3] text-[#111111] px-4 py-2.5 rounded-[20px] rounded-br-[4px] text-[14px] leading-[1.5] max-w-[85%] font-sans shadow-xs">
                    {m.content}
                  </div>
                </div>
              ) : (
                /* Assistant Message: White card, 16px radius, subtle border, left lime accent, Z avatar */
                <div className="flex items-start gap-3 animate-fadeIn">
                  <div className="w-7 h-7 rounded-full bg-[#111111] text-[#C8F31D] flex items-center justify-center text-[12px] font-bold shrink-0 mt-1 shadow-xs select-none">
                    Z
                  </div>

                  <div className="flex-1 bg-white rounded-[16px] border border-[#E5E5E5] border-l-4 border-l-[#C8F31D] p-3.5 sm:p-4 shadow-sm space-y-2.5">
                    <div className="text-[14.5px] leading-[1.6] text-[#222222] font-sans whitespace-pre-wrap">
                      {renderMessageText(m.content)}
                    </div>

                    {m.sources && m.sources.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-[#F2F1EC]">
                        {m.sources.map((s, j) => (
                          <button
                            key={j}
                            onClick={() => openSource(s)}
                            title={s.title ?? s.name ?? s.file}
                            className="mono text-[11px] font-medium px-2 py-0.5 rounded-[6px] border border-[#E0DFD8] bg-[#F9F8F5] text-[#444444] hover:border-[#111111] hover:text-[#111111] hover:bg-white transition-all duration-150 cursor-pointer"
                          >
                            {sourceLabel(s)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator with 3 Animated Dots */}
          {loading && (
            <div className="flex items-start gap-3 animate-fadeIn">
              <div className="w-7 h-7 rounded-full bg-[#111111] text-[#C8F31D] flex items-center justify-center text-[12px] font-bold shrink-0 mt-1 shadow-xs">
                Z
              </div>
              <div className="bg-white rounded-[16px] border border-[#E5E5E5] border-l-4 border-l-[#C8F31D] px-4 py-3 shadow-sm flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#888888] animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#888888] animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#888888] animate-bounce" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Compact Suggested Prompts when conversation has messages */}
        {messages.length > 0 && !loading && (
          <div className="px-5 py-2 bg-[#F8F7F2] shrink-0 flex items-center gap-1.5 overflow-x-auto scroll-thin border-t border-[#EAE8E0]">
            {questions.slice(0, 3).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => send(q)}
                className="rounded-full bg-white border border-[#E5E5E5] px-3 py-1 text-[12px] font-medium text-[#444444] hover:border-[#111111] hover:text-[#111111] hover:bg-[#F2F0E8] transition-all duration-150 shrink-0 cursor-pointer shadow-xs font-sans"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* ═════ Input Area: 52px Rounded Input, Lime Glow on Focus, Circular Send Button ═════ */}
        <footer className="p-4 border-t border-[#E5E5E5] bg-[#F8F7F2] shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-center bg-white border border-[#E0DFD8] rounded-[26px] h-[52px] pl-4 pr-2 shadow-xs focus-within:border-[#C8F31D] focus-within:shadow-[0_0_0_3px_rgba(200,243,29,0.35)] transition-all duration-150"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about findings, CVEs, or attack paths..."
              disabled={loading}
              className="flex-1 bg-transparent text-[#111111] text-[13.5px] sm:text-[14px] font-sans outline-none placeholder:text-[#888888]"
            />

            {/* Black circular button with white arrow */}
            <button
              type="submit"
              disabled={!input.trim() || loading}
              aria-label="Send message"
              className="w-9 h-9 rounded-full bg-[#111111] text-white flex items-center justify-center hover:bg-[#222222] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 shrink-0 cursor-pointer shadow-sm ml-2"
            >
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            </button>
          </form>
        </footer>
      </aside>
    </>
  );
});

export default SecurityCopilot;
