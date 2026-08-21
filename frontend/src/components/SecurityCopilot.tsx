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
      className="fixed inset-y-0 right-0 z-50 flex flex-col shadow-hard-lg bg-[#111111] text-[#ECEBE6] border-l border-[#222222] slide-right w-full sm:w-[420px] sm:max-w-[420px]"
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3.5 border-b border-[#222222] bg-[#161616]">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-[#222222] border border-[#333333] flex items-center justify-center text-[#C8FF2E]">
            <Terminal className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="font-extrabold text-[13px] text-white leading-none">
              Ask ZORQEN
            </div>
            <div className="mono text-[10px] text-[#A0A0A0] font-semibold mt-0.5">
              Repository: <strong className="text-[#C8FF2E]">{currentRepo?.name || 'Zorqen'}</strong>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white transition-colors" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
      </header>

      {finding && (
        <div className="px-4 py-2 border-b border-[#222222] mono text-[10.5px] font-bold bg-[#C8FF2E] text-[#111111]">
          TARGET: {finding.id} • {finding.title}
        </div>
      )}

      {/* Messages Terminal Output Feed */}
      <div className="flex-1 overflow-y-auto scroll-thin p-4 space-y-3 font-mono text-[12px] bg-[#0B0B0B]">
        {messages.map((m, i) => (
          <div key={i} className="space-y-1.5 border-b border-[#1A1A1A] pb-3">
            <div className="flex items-center gap-2 text-[10.5px] font-bold">
              <span className={m.role === 'user' ? 'text-zinc-400' : 'text-[#C8FF2E]'}>
                {m.role === 'user' ? '$ user_query' : '● zorqen_agent'}
              </span>
            </div>
            <div className="leading-relaxed text-[#ECEBE6] whitespace-pre-wrap pl-2 border-l border-[#222222]">
              {m.content}
            </div>
            {m.role === 'assistant' && m.sources && m.sources.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1 pl-2">
                {m.sources.map((s, j) => (
                  <button
                    key={j}
                    onClick={() => openSource(s)}
                    title={s.title ?? s.name ?? s.file}
                    className="mono text-[9.5px] font-bold px-2 py-0.5 rounded border border-[#333333] bg-[#161616] text-[#C8FF2E] hover:border-[#C8FF2E] transition-colors"
                  >
                    {sourceLabel(s)}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-[#C8FF2E] mono text-[11.5px] pt-1">
            <span className="w-1.5 h-3.5 bg-[#C8FF2E] animate-pulse inline-block" />
            <span>Parsing main.py &amp; reasoning against repository evidence…</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length <= 1 && (
        <div className="p-3 border-t border-[#222222] bg-[#161616] space-y-1.5">
          <div className="mono text-[9.5px] text-zinc-400 uppercase font-bold mb-1">RECOMMENDED INVESTIGATIONS</div>
          {questions.map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              className="block w-full text-left text-[12px] font-mono px-3 py-1.5 rounded border border-[#262626] bg-[#111111] hover:border-[#C8FF2E] text-zinc-200 transition-colors"
            >
              &gt; {q}
            </button>
          ))}
        </div>
      )}

      {/* Terminal Input */}
      <footer className="p-3.5 border-t border-[#222222] bg-[#161616] space-y-2">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Type investigation query…"
            className="w-full h-[38px] px-3 bg-[#0B0B0B] border border-[#262626] rounded text-[#ECEBE6] text-[12.5px] font-mono outline-none focus:border-[#C8FF2E]"
            disabled={loading}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="px-3 h-[38px] rounded bg-[#C8FF2E] text-[#111111] font-bold text-[12px] hover:bg-[#b5eb1c] transition-colors shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </div>
  );
});

export default SecurityCopilot;
