import { memo, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Terminal, X } from 'lucide-react';
import { useWorkspaceData, useFinding } from '../store/WorkspaceContext';
import { copilotChat, type CopilotChatContext, type CopilotSource } from '../services/api';
import type { Finding } from '../lib/types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: CopilotSource[];
}

const ERROR_MESSAGE = 'ASK ZORQEN is temporarily unavailable. Please try again.';

const MAX_HISTORY = 8;

function starterQuestions(page: string, finding?: Finding): string[] {
  if (page.startsWith('/findings/') && finding) {
    return [
      `Why is ${finding.id} dangerous?`,
      'Show me the evidence.',
      'Was this actually validated?',
      'How should I remediate it?',
    ];
  }
  if (page.startsWith('/repos/')) {
    return [
      'What are the highest-risk findings?',
      'Which files are most affected?',
      "What is this repository's security posture?",
    ];
  }
  if (page.startsWith('/assessments/')) {
    return [
      'Summarize this assessment.',
      'What is the most dangerous finding?',
      'How many critical findings?',
    ];
  }
  return [
    "What's the current security posture?",
    'What should I fix first?',
    'Which files have the most findings?',
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

const SecurityCopilot = memo(function SecurityCopilot({ assessmentId, onClose }: { assessmentId?: string; onClose: () => void }) {
  const { currentRepo, currentAssessment } = useWorkspaceData();
  const navigate = useNavigate();
  const page = window.location.pathname;
  const findingId = page.startsWith('/findings/') ? page.split('/findings/')[1] : undefined;
  const finding = useFinding(findingId as string | undefined);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `ASK ZORQEN • INVESTIGATION CONSOLE\nContext: ${currentRepo?.name ?? 'no repository'}${currentAssessment ? ` • ${currentAssessment.id}` : ''}${
        finding ? ` • ${finding.id} ${finding.title}` : ''
      }\n\nGrounded in assessed repository evidence, static analysis rules, and sandbox validation transcripts.`,
      sources: [],
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

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
      .slice(1)
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
      const msg =
        detail?.message ||
        (detail?.code ? `ASK ZORQEN error (${detail.code}). Please try again.` : ERROR_MESSAGE);
      setMessages((m) => [...m, { role: 'assistant', content: msg, sources: [] }]);
    } finally {
      setLoading(false);
    }
  };

  const questions = starterQuestions(page, finding);

  return (
    <div
      className="fixed inset-y-0 right-0 z-50 flex flex-col shadow-hard-lg bg-[#111111] text-[#ECEBE6] border-l-2 border-[#222222] slide-right w-full sm:w-[460px] sm:max-w-[460px]"
    >
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 border-b-2 border-[#222222] bg-[#161616]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[8px] bg-[#222222] border-2 border-[#333333] flex items-center justify-center text-[#C8F31D]">
            <Terminal className="w-4 h-4 stroke-[2px]" />
          </div>
          <div>
            <div className="font-extrabold text-[14px] text-white leading-none flex items-center gap-2">
              <span>Ask ZORQEN</span>
              <span className="flex items-center gap-1.5 text-[10px] font-mono text-[#C8F31D] bg-[#222222] px-2 py-0.5 rounded-full border border-[#333333]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C8F31D] animate-pulse" />
                <span>LIVE ANALYST</span>
              </span>
            </div>
            <div className="mono text-[11px] text-[#A0A0A0] font-semibold mt-1 flex items-center gap-2">
              <span>Repo: <strong className="text-[#C8F31D]">{currentRepo?.name || 'Zorqen'}</strong></span>
              <span>•</span>
              <span>Scan: <strong className="text-zinc-300">{currentAssessment?.id || 'RUN-143'}</strong></span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-[44px] h-[44px] min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-400 hover:text-white rounded-[8px] hover:bg-[#222222] transition-colors"
          aria-label="Close Ask ZORQEN"
        >
          <X className="w-5 h-5 stroke-[2px]" />
        </button>
      </header>

      {finding && (
        <div className="px-5 py-2.5 border-b-2 border-[#222222] mono text-[11px] font-bold bg-[#C8F31D] text-[#111111]">
          TARGET: {finding.id} • {finding.title}
        </div>
      )}

      {/* Messages Terminal Output Feed */}
      <div className="flex-1 overflow-y-auto scroll-thin p-5 space-y-4 font-mono text-[12.5px] bg-[#0B0B0B]">
        {messages.map((m, i) => (
          <div key={i} className="space-y-2 border-b border-[#1E1E1E] pb-4">
            <div className="flex items-center gap-2 text-[11px] font-bold">
              <span className={m.role === 'user' ? 'text-zinc-400' : 'text-[#C8F31D]'}>
                {m.role === 'user' ? '$ user_query' : '● zorqen_agent'}
              </span>
            </div>
            <div className="leading-relaxed text-[#ECEBE6] whitespace-pre-wrap pl-3 border-l-2 border-[#262626]">
              {m.content}
            </div>
            {m.role === 'assistant' && m.sources && m.sources.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2 pl-3">
                {m.sources.map((s, j) => (
                  <button
                    key={j}
                    onClick={() => openSource(s)}
                    title={s.title ?? s.name ?? s.file}
                    className="mono text-[10px] font-bold px-2.5 py-1 rounded-full border border-[#333333] bg-[#161616] text-[#C8F31D] hover:border-[#C8F31D] transition-colors"
                  >
                    {sourceLabel(s)}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-[#C8F31D] mono text-[12px] pt-2 pl-1">
            <span className="w-2 h-4 bg-[#C8F31D] animate-pulse inline-block" />
            <span>Reasoning across repository AST &amp; sandbox telemetry…</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length <= 1 && (
        <div className="p-4 border-t-2 border-[#222222] bg-[#161616] space-y-2">
          <div className="mono text-[10px] text-zinc-400 uppercase font-bold mb-1 tracking-wider">RECOMMENDED INVESTIGATIONS</div>
          <div className="space-y-1.5">
            {questions.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                className="w-full text-left text-[12.5px] font-mono px-3.5 py-2.5 rounded-[10px] border border-[#2E2E2E] bg-[#111111] hover:border-[#C8F31D] hover:-translate-y-0.5 text-zinc-200 transition-all cursor-pointer flex items-center justify-between group"
              >
                <span>&gt; {q}</span>
                <span className="text-[#C8F31D] opacity-0 group-hover:opacity-100 transition-opacity">↵</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sticky Terminal Input Area */}
      <footer className="sticky bottom-0 p-4 border-t-2 border-[#222222] bg-[#161616] space-y-2">
        <div className="flex gap-2.5 items-center">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Type investigation query or prompt…"
            className="w-full h-[48px] px-4 bg-[#0B0B0B] border-2 border-[#2E2E2E] rounded-[12px] text-[#ECEBE6] text-[13.5px] font-mono outline-none focus:border-[#C8F31D] transition-colors"
            disabled={loading}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="w-[48px] h-[48px] rounded-[12px] bg-[#C8F31D] hover:bg-[#B8E316] text-[#111111] flex items-center justify-center transition-all shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-hard-sm"
            aria-label="Send query"
          >
            <Send className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </footer>
    </div>
  );
});

export default SecurityCopilot;
