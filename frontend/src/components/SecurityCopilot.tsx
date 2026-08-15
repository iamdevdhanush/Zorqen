import { memo, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Send, Terminal, X } from 'lucide-react';
import { useWorkspaceData, useFinding } from '../store/WorkspaceContext';
import { copilotChat, type CopilotChatContext, type CopilotSource } from '../services/api';
import type { Finding } from '../lib/types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: CopilotSource[];
}

const ERROR_MESSAGE = 'ASK RAKSHA is temporarily unavailable. Please try again.';

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
      content: `ASK RAKSHA • INVESTIGATION CONSOLE\nContext: ${currentRepo?.name ?? 'no repository'}${currentAssessment ? ` • ${currentAssessment.id}` : ''}${
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
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: ERROR_MESSAGE, sources: [] }]);
    } finally {
      setLoading(false);
    }
  };

  const questions = starterQuestions(page, finding);

  return (
    <div
      className="fixed inset-y-0 right-0 z-50 flex flex-col shadow-hard-lg bg-white border-l border-[#111111] slide-right w-full max-w-full sm:w-[420px] sm:max-w-[420px]"
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3.5 border-b border-[#111111] bg-[#FAFAFA]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-[#111111] text-white flex items-center justify-center">
            <Terminal className="w-4 h-4 text-[#C5F82A]" />
          </div>
          <div>
            <div className="font-extrabold text-[13px] text-[#111111] leading-none">ASK RAKSHA</div>
            <div className="mono text-[9px] text-[#4A4A4A] font-extrabold mt-0.5">INVESTIGATION CONSOLE</div>
          </div>
        </div>
        <button onClick={onClose} className="btn btn-ghost btn-xs" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
      </header>

      {finding && (
        <div className="px-4 py-2 border-b border-[#111111] mono text-[10.5px] font-bold bg-[#C5F82A] text-[#111111]">
          TARGET: {finding.id} • {finding.title}
        </div>
      )}

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto scroll-thin p-4 space-y-3 bg-[#F7F7F2]">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {m.role === 'assistant' && (
              <div className="w-6 h-6 rounded bg-[#111111] text-white flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5 text-[#C5F82A]" />
              </div>
            )}
            <div
              className={`text-[12.5px] leading-relaxed p-3.5 rounded-lg border shadow-hard-sm whitespace-pre-wrap ${
                m.role === 'assistant'
                  ? 'bg-white border-[#111111] text-[#111111] font-semibold'
                  : 'bg-[#111111] border-[#111111] text-white font-bold'
              }`}
              style={{ maxWidth: '85%' }}
            >
              <div>{m.content}</div>
              {m.role === 'assistant' && m.sources && m.sources.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {m.sources.map((s, j) => (
                    <button
                      key={j}
                      onClick={() => openSource(s)}
                      title={s.title ?? s.name ?? s.file}
                      className="mono text-[9.5px] font-bold px-2 py-0.5 rounded border border-[#111111] bg-[#F7F7F2] hover:bg-[#C5F82A] transition-colors text-[#111111]"
                    >
                      {sourceLabel(s)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded bg-[#111111] text-white flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-[#C5F82A] animate-pulse" />
            </div>
            <div className="text-[12px] p-3 rounded-lg border border-[#111111] bg-white text-[#333333] font-extrabold">
              Reasoning against repository evidence…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length <= 1 && (
        <div className="p-3 border-t border-[#111111] bg-white space-y-1.5">
          <div className="mono text-[9.5px] text-[#4A4A4A] uppercase font-extrabold mb-1">CONTEXTUAL INVESTIGATION QUESTIONS</div>
          {questions.map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              className="block w-full text-left text-[12px] font-bold px-3 py-1.5 rounded-md border border-[#111111] bg-[#FAFAFA] hover:bg-[#C5F82A] transition-colors text-[#111111] shadow-hard-sm"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <footer className="p-4 border-t border-[#111111] bg-white space-y-2">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Ask investigation question…"
            className="input flex-1 bg-white text-[12.5px] font-medium"
            disabled={loading}
          />
          <button onClick={() => send()} disabled={!input.trim() || loading} className="btn btn-accent px-3 py-1.5">
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="mono text-[9.5px] font-extrabold text-[#4A4A4A] text-center">
          Grounded in assessed repository evidence • Never scans production
        </p>
      </footer>
    </div>
  );
});

export default SecurityCopilot;
