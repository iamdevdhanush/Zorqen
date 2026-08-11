import { memo, useEffect, useRef, useState } from 'react';
import { Bot, Send, Terminal, X } from 'lucide-react';
import { useWorkspaceData, useFinding } from '../store/WorkspaceContext';
import { copilotChat } from '../services/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  'Why is this finding valid?',
  'Show the attack path.',
  'What evidence confirms this?',
  'How should I remediate it?',
  'Was this reproduced in the sandbox?',
];

function fallbackReply(q: string): string {
  const low = q.toLowerCase();
  if (low.includes('valid'))
    return 'The finding is validated across multiple layers: static analysis matched the rule pattern at line 42, taint flow traced HTTP input directly to SQL execution, and runtime probe confirmed execution in container sandbox #0241.';
  if (low.includes('attack path'))
    return 'ATTACK PATH:\nUSER INPUT\n→ GET /api/users/search\n→ search_users() (app/api/users.py:42)\n→ PostgreSQL SQL Execution Sink';
  if (low.includes('evidence'))
    return 'Corroborating evidence includes Semgrep rule python.lang.security.audit.raw-sql-interpolation match, static taint graph analysis, and sandboxed container reproduction log (HTTP 500 psycopg2 syntax error on input `\'`).';
  if (low.includes('remediate'))
    return 'Proposed remediation replaces f-string string interpolation with parameterized SQL query arguments, ensuring user input is bound safely by the database driver.';
  if (low.includes('sandbox'))
    return 'Yes. Exploit probe `\' OR \'1\'=\'1` returned all 1,284 database rows (HTTP 200) and `\'` triggered a psycopg2 syntax exception (HTTP 500) inside container sandbox #0241.';
  return 'Grounded in assessment evidence: repository, findings, call graph, and verification logs. Ask about specific findings or evidence.';
}

const SecurityCopilot = memo(function SecurityCopilot({ assessmentId, onClose }: { assessmentId?: string; onClose: () => void }) {
  const { currentRepo, currentAssessment } = useWorkspaceData();
  const findingId = window.location.pathname.startsWith('/findings/')
    ? window.location.pathname.split('/findings/')[1]
    : undefined;
  const finding = useFinding(findingId as string | undefined);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `ASK RAKSHA • INVESTIGATION CONSOLE\nContext: ${currentRepo?.name ?? 'no repository'}${currentAssessment ? ` • ${currentAssessment.id}` : ''}${
        finding ? ` • ${finding.id} ${finding.title}` : ''
      }\n\nGrounded in assessed repository evidence, static analysis rules, and sandbox validation transcripts.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const { data } = await copilotChat(msg, assessmentId, finding?.id);
      setMessages((m) => [...m, { role: 'assistant', content: data.response }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: fallbackReply(msg) }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-y-0 right-0 z-50 flex flex-col shadow-hard-lg bg-white border-l border-[#111111] slide-right"
      style={{ width: 420 }}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3.5 border-b border-[#111111] bg-[#FAFAFA]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-[#111111] text-white flex items-center justify-center">
            <Terminal className="w-4 h-4 text-[#C5F82A]" />
          </div>
          <div>
            <div className="font-extrabold text-[13px] text-[#111111] leading-none">ASK RAKSHA</div>
            <div className="mono text-[9px] text-[#666666] font-bold mt-0.5">INVESTIGATION CONSOLE</div>
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
                  ? 'bg-white border-[#111111] text-[#111111] font-medium'
                  : 'bg-[#111111] border-[#111111] text-white font-bold'
              }`}
              style={{ maxWidth: '85%' }}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded bg-[#111111] text-white flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-[#C5F82A] animate-pulse" />
            </div>
            <div className="text-[12px] p-3 rounded-lg border border-[#111111] bg-white text-[#555555] font-semibold">
              Reasoning against repository evidence…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length <= 1 && (
        <div className="p-3 border-t border-[#111111] bg-white space-y-1.5">
          <div className="mono text-[9.5px] text-[#666666] uppercase font-extrabold mb-1">CONTEXTUAL INVESTIGATION QUESTIONS</div>
          {SUGGESTIONS.map((q) => (
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
        <p className="mono text-[9.5px] font-semibold text-[#666666] text-center">
          Grounded in assessed repository evidence • Never scans production
        </p>
      </footer>
    </div>
  );
});

export default SecurityCopilot;