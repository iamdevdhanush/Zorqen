import { memo, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, Shield, X } from 'lucide-react';
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

const DEFAULT_SUGGESTIONS = [
  'Current security posture',
  'Highest risk',
  'Vulnerable routes',
  'Secret scan',
];

function starterQuestions(page: string, finding?: Finding): string[] {
  if (page.startsWith('/findings/') && finding) {
    return [
      'Explain this vulnerability',
      'Show exploitability evidence',
      'Vulnerable routes',
      'Remediation guidance',
    ];
  }
  return DEFAULT_SUGGESTIONS;
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

/** Severity badge styling */
function SeverityBadge({ severity }: { severity: string }) {
  const norm = severity.toLowerCase();
  let colorCls = 'bg-black/5 text-[#555555] border-black/10';
  if (norm.includes('crit')) {
    colorCls = 'bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/25';
  } else if (norm.includes('high')) {
    colorCls = 'bg-[#EA580C]/10 text-[#EA580C] border-[#EA580C]/25';
  } else if (norm.includes('med')) {
    colorCls = 'bg-[#D97706]/10 text-[#D97706] border-[#D97706]/25';
  } else if (norm.includes('low')) {
    colorCls = 'bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/25';
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border uppercase select-none ${colorCls}`}
    >
      {severity}
    </span>
  );
}

/**
 * Format inline text: Inter 400 for text, monospace strictly for code blocks,
 * file paths, run IDs, and CWE codes.
 */
function renderInlineContent(text: string): ReactNode[] {
  const pattern = /(`[^`]+`|\bCWE-\d+\b|\b[a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]{2,5}(?::\d+)?\b)/g;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('`') && token.endsWith('`')) {
      const code = token.slice(1, -1);
      nodes.push(
        <code
          key={`${match.index}-code`}
          className="font-mono text-[12px] bg-[#EAE8E0] text-[#111111] px-1.5 py-0.5 rounded-[4px] border border-[#DCDAD2]"
        >
          {code}
        </code>
      );
    } else if (/^CWE-\d+$/i.test(token)) {
      nodes.push(
        <span
          key={`${match.index}-cwe`}
          className="font-mono text-[11.5px] font-medium bg-[#111111]/5 text-[#111111] px-1.5 py-0.5 rounded-[4px] border border-[#111111]/10"
        >
          {token}
        </span>
      );
    } else {
      nodes.push(
        <span
          key={`${match.index}-file`}
          className="font-mono text-[12px] text-[#222222] bg-[#EAE8E0]/70 px-1 py-0.5 rounded border border-[#DCDAD2]/60"
        >
          {token}
        </span>
      );
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.substring(lastIndex));
  }

  return nodes;
}

/**
 * Structured card renderer for AI responses.
 * Detects headers, key-value findings (Affected, Fix, CWE, Severity),
 * code blocks, and lists, rendering them with generous spacing instead of terminal separators.
 */
function renderMessageText(content: string): ReactNode {
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g;
  const sections: { type: 'text' | 'code'; content: string; lang?: string }[] = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      sections.push({ type: 'text', content: content.substring(lastIndex, match.index) });
    }
    sections.push({ type: 'code', content: match[2], lang: match[1] });
    lastIndex = codeBlockRegex.lastIndex;
  }
  if (lastIndex < content.length) {
    sections.push({ type: 'text', content: content.substring(lastIndex) });
  }

  return (
    <div className="space-y-3 font-sans text-[14px] leading-relaxed text-[#111111]">
      {sections.map((section, idx) => {
        if (section.type === 'code') {
          return (
            <div
              key={idx}
              className="rounded-[12px] bg-[#111111] border border-black/20 overflow-hidden shadow-xs my-2.5"
            >
              {section.lang && (
                <div className="px-3.5 py-1.5 bg-black/40 text-[#888888] font-mono text-[11px] uppercase tracking-wider border-b border-white/5">
                  {section.lang}
                </div>
              )}
              <pre className="p-3.5 text-[#ECEBE6] font-mono text-[12px] overflow-x-auto leading-[1.6]">
                <code>{section.content.trim()}</code>
              </pre>
            </div>
          );
        }

        const paragraphs = section.content.split(/\n\n+/);
        return paragraphs.map((para, pIdx) => {
          const lines = para.split('\n').filter((l) => l.trim().length > 0);

          if (lines.length === 1 && /^#{1,4}\s+(.+)$/.test(lines[0])) {
            const headingText = lines[0].replace(/^#{1,4}\s+/, '');
            return (
              <h4
                key={`${idx}-${pIdx}`}
                className="text-[15px] font-bold text-[#111111] tracking-tight pt-1 first:pt-0"
              >
                {headingText}
              </h4>
            );
          }

          const isStructuredCard = lines.some((line) =>
            /^(affected|fix|cwe|severity|recommendation|impact|observed|inferred|validation):/i.test(line)
          );

          if (isStructuredCard) {
            return (
              <div
                key={`${idx}-${pIdx}`}
                className="p-3.5 rounded-[12px] bg-[#FAF9F5] border border-black/8 space-y-2 my-2 shadow-xs"
              >
                {lines.map((line, lIdx) => {
                  const kvMatch = line.match(/^([A-Za-z0-9_\s-]+):\s*(.*)$/);
                  if (kvMatch) {
                    const key = kvMatch[1].trim();
                    const val = kvMatch[2].trim();
                    const isSeverity = /^severity$/i.test(key);

                    return (
                      <div key={lIdx} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                        <span className="text-[12px] font-semibold text-[#666666] tracking-wide uppercase min-w-[75px] shrink-0">
                          {key}:
                        </span>
                        <div className="text-[13.5px] text-[#111111] flex-1">
                          {isSeverity ? <SeverityBadge severity={val} /> : renderInlineContent(val)}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={lIdx} className="text-[13.5px] text-[#222222]">
                      {renderInlineContent(line)}
                    </div>
                  );
                })}
              </div>
            );
          }

          const isList = lines.every((l) => /^[-*•]\s+/.test(l));
          if (isList) {
            return (
              <ul key={`${idx}-${pIdx}`} className="space-y-1.5 pl-1 my-2">
                {lines.map((l, lIdx) => (
                  <li key={lIdx} className="flex items-start gap-2 text-[14px] text-[#222222]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#111111] mt-2 shrink-0" />
                    <span>{renderInlineContent(l.replace(/^[-*•]\s+/, ''))}</span>
                  </li>
                ))}
              </ul>
            );
          }

          return (
            <p key={`${idx}-${pIdx}`} className="text-[14px] text-[#222222] leading-relaxed">
              {renderInlineContent(para)}
            </p>
          );
        });
      })}
    </div>
  );
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
  const [mounted, setMounted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Smooth slide-in on mount
  useEffect(() => {
    const timer = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(timer);
  }, []);

  // Auto-focus input on open
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // Smooth slide-out on close
  const handleClose = () => {
    setMounted(false);
    setTimeout(onClose, 250);
  };

  // Escape key closes panel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
      {/* Subtle 6–8% black backdrop with slight background blur */}
      <div
        onClick={handleClose}
        className={`fixed inset-0 bg-black/[0.07] backdrop-blur-[2px] z-40 transition-opacity duration-250 ease-out ${
          mounted ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      {/* Premium Enterprise AI Investigation Panel */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex flex-col w-full sm:w-[360px] md:w-[400px] bg-[#FAF9F5] text-[#111111] border-l-2 border-[#111111] sm:rounded-l-[24px] overflow-hidden transition-transform duration-250 ease-out select-text ${
          mounted ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.08)',
        }}
        aria-label="Ask ZORQEN Security Assistant"
      >
        {/* ═════ Header ═════ */}
        <header className="px-6 pt-5 pb-4 border-b border-black/10 bg-[#FAF9F5] shrink-0 space-y-2.5 relative">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <h2 className="text-[18px] font-bold text-[#111111] tracking-tight font-sans">
                Ask ZORQEN
              </h2>

              {/* Status pill: Live Analyst with lime dot */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#111111]/5 border border-[#111111]/10 text-[#111111] text-[12px] font-medium font-sans select-none">
                <span className="w-2 h-2 rounded-full bg-[#C8F31D] shadow-[0_0_0_1px_rgba(17,17,17,0.15)] animate-pulse" />
                <span>Live Analyst</span>
              </div>
            </div>

            {/* Ghost Close Button */}
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#666666] hover:text-[#111111] hover:bg-black/5 active:scale-95 transition-all cursor-pointer"
              title="Close (Esc)"
              aria-label="Close Ask ZORQEN"
            >
              <X className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>

          {/* Muted Metadata Row */}
          <div className="text-[13px] text-[#666666] font-normal font-sans flex items-center gap-2 flex-wrap select-none">
            <span>Repo: {repoName}</span>
            <span className="text-[#CCCCCC]">•</span>
            <span>
              Run: <span className="font-mono text-[12px] text-[#333333]">{runId}</span>
            </span>
          </div>

          {/* Thin loading progress line directly under header */}
          {loading && (
            <div className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-[#C8F31D] overflow-hidden">
              <div className="w-full h-full bg-[#111111]/20 animate-pulse" />
            </div>
          )}
        </header>

        {/* ═════ Conversation Area (20px spacing between messages) ═════ */}
        <div className="flex-1 overflow-y-auto scroll-thin px-5 py-5 space-y-5 font-sans bg-[#FAF9F5]">
          {/* Empty State */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center text-center py-10 px-3 space-y-4">
              {/* Minimal Shield Icon */}
              <div className="w-12 h-12 rounded-2xl bg-white border border-black/10 flex items-center justify-center text-[#111111] shadow-xs">
                <Shield className="w-6 h-6 stroke-[1.8] text-[#111111]" />
              </div>

              {/* Title & Grounding Statement */}
              <div className="space-y-1.5 max-w-[310px]">
                <h3 className="text-[17px] font-bold text-[#111111] tracking-tight font-sans">
                  Ask questions about your repository.
                </h3>
                <p className="text-[13px] text-[#666666] leading-relaxed font-sans">
                  Grounded in AST analysis, findings, and sandbox evidence.
                </p>
              </div>

              {/* Suggested Prompts (Elegant Chips) */}
              <div className="w-full pt-5 space-y-2 text-left">
                <div className="text-[11px] font-semibold text-[#888888] uppercase tracking-wider px-1 select-none">
                  Suggested questions
                </div>
                <div className="flex flex-wrap gap-2">
                  {questions.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => send(q)}
                      className="text-left rounded-full bg-white border border-black/10 px-3.5 py-2 text-[13px] font-medium text-[#222222] hover:border-black/30 hover:-translate-y-[2px] active:scale-98 transition-all duration-150 shadow-xs cursor-pointer select-none"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Messages List (20px spacing via space-y-5) */}
          {messages.map((m, i) => (
            <div key={i} className="space-y-1.5">
              {m.role === 'user' ? (
                /* User Message: Light gray bubble, right aligned, 16px radius */
                <div className="flex justify-end">
                  <div className="bg-[#EAE8E1] text-[#111111] px-4 py-2.5 rounded-[16px] rounded-br-[4px] text-[14px] leading-relaxed max-w-[85%] font-sans shadow-xs">
                    {m.content}
                  </div>
                </div>
              ) : (
                /* Assistant Message: White card, subtle border, 16px radius, left aligned */
                <div className="space-y-1.5">
                  {/* Agent Identity Row */}
                  <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#666666] px-1 select-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                    <span>ZORQEN Analyst</span>
                  </div>

                  {/* Assistant Card */}
                  <div className="bg-white rounded-[16px] border border-black/10 p-4 shadow-xs space-y-3">
                    {renderMessageText(m.content)}

                    {/* Sources Chips */}
                    {m.sources && m.sources.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-2.5 border-t border-black/5">
                        {m.sources.map((s, j) => (
                          <button
                            key={j}
                            onClick={() => openSource(s)}
                            title={s.title ?? s.name ?? s.file}
                            className="font-mono text-[11px] font-medium px-2 py-0.5 rounded-[4px] border border-black/10 bg-[#FAF9F5] text-[#444444] hover:border-black hover:text-[#111111] hover:bg-white transition-all duration-150 cursor-pointer"
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

          {/* Loading State: Three-dot animated loader */}
          {loading && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#666666] px-1 select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                <span>ZORQEN Analyst</span>
              </div>
              <div className="bg-white rounded-[16px] border border-black/10 px-4 py-3.5 shadow-xs flex items-center gap-1.5 w-fit">
                <span className="w-2 h-2 rounded-full bg-[#888888] animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 rounded-full bg-[#888888] animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 rounded-full bg-[#888888] animate-bounce" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Suggested chips strip when conversation is active */}
        {messages.length > 0 && !loading && (
          <div className="px-5 py-2 bg-[#FAF9F5] shrink-0 flex items-center gap-1.5 overflow-x-auto scroll-thin border-t border-black/5">
            {questions.slice(0, 3).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => send(q)}
                className="rounded-full bg-white border border-black/10 px-3 py-1 text-[12px] font-medium text-[#333333] hover:border-black/30 hover:-translate-y-[1px] transition-all duration-150 shrink-0 cursor-pointer shadow-xs select-none"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* ═════ Input Area: 52px Rounded 18px Input, 2px border, Lime Focus Ring, Lime Send Button ═════ */}
        <footer className="p-4 border-t border-black/10 bg-[#FAF9F5] shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-center bg-white border-2 border-black/15 focus-within:border-[#111111] focus-within:ring-2 focus-within:ring-[#C8F31D]/40 rounded-[18px] h-[52px] pl-4 pr-1.5 shadow-xs transition-all duration-150"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about vulnerabilities, files, routes..."
              disabled={loading}
              className="flex-1 bg-transparent text-[#111111] text-[13.5px] sm:text-[14px] font-sans outline-none placeholder:text-[#888888]"
            />

            {/* Lime Send Button with Black Arrow Icon */}
            <button
              type="submit"
              disabled={!input.trim() || loading}
              aria-label="Send message"
              className="w-9 h-9 rounded-full bg-[#C8F31D] text-black flex items-center justify-center hover:bg-[#B8E316] active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 shrink-0 cursor-pointer shadow-xs ml-2"
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
