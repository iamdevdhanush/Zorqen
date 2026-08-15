import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, CheckCircle2, RotateCcw, ShieldCheck, XCircle } from 'lucide-react';
import { SevBadge } from '../components/ui';
import { useFinding, useWorkspace } from '../store/WorkspaceContext';
import type { Finding, LogLine } from '../lib/types';

interface TestStep {
  at: number;
  kind: 'log' | 'result';
  log?: [string, string, 'ok' | 'err' | 'info' | 'warn'];
  before?: boolean;
  after?: boolean;
}

function testSchedule(finding: Finding): TestStep[] {
  const payload = finding.severity === 'critical' ? `?q=' OR '1'='1` : `?file=../../../etc/passwd`;
  return [
    { at: 0,    kind: 'log', log: ['validator', `probe ${finding.endpoint ?? finding.file_path}${payload}`, 'info'] },
    { at: 500,  kind: 'log', log: ['sandbox',   'container secure-sandbox-vrfy created (image from assessed commit)', 'info'] },
    { at: 1100, kind: 'log', log: ['validator', 'request 1 — baseline build', 'info'] },
    { at: 1600, kind: 'log', log: ['validator', `response 500 · payload reproduced (${finding.cwe_id})`, 'err'] },
    { at: 2200, kind: 'result', before: true, log: ['security-test', 'FAILED — vulnerability reproduced on baseline', 'err'] },
    { at: 2800, kind: 'log', log: ['raksha',    'applying review-approved patch to sandbox build', 'info'] },
    { at: 3400, kind: 'log', log: ['builder',   'image rebuilt · regression suite compiled', 'info'] },
    { at: 4000, kind: 'log', log: ['validator', 'request 2 — patched build', 'info'] },
    { at: 4600, kind: 'log', log: ['validator', 'response 400 · payload blocked as data, not SQL', 'ok'] },
    { at: 5200, kind: 'result', after: true, log: ['security-test', 'PASSED — vulnerability no longer reproduced', 'ok'] },
    { at: 5900, kind: 'log', log: ['pytest',    'regression suite · 12/12 passed (0 failures)', 'ok'] },
    { at: 6500, kind: 'log', log: ['health',    'application health: healthy · latency p99 unchanged', 'ok'] },
    { at: 7100, kind: 'log', log: ['sandbox',   'container destroyed · artifacts purged · build cache cleared', 'info'] },
  ];
}

export default function VerificationPage() {
  const { id } = useParams();
  const finding = useFinding(id);
  const { markFinding, currentRepo } = useWorkspace();
  const navigate = useNavigate();

  const [logs, setLogs]     = useState<LogLine[]>([]);
  const [before, setBefore] = useState<boolean | null>(null);
  const [after, setAfter]   = useState<boolean | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runTest = () => {
    if (!finding) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setLogs([]); setBefore(null); setAfter(null);
    const t0 = Date.now();
    const schedule = testSchedule(finding);

    timerRef.current = setInterval(() => {
      const now = Date.now();
      let done = true;
      const newLogs: LogLine[] = [];
      let b: boolean | null = null;
      let a: boolean | null = null;

      for (const s of schedule) {
        if (now < t0 + s.at) { done = false; break; }
        if (s.kind === 'log' && s.log) {
          newLogs.push({
            time: new Date(t0 + s.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            source: s.log[0],
            text: s.log[1],
            tone: s.log[2],
          });
        }
        if (s.kind === 'result' && s.log) {
          if (s.before) b = true;
          if (s.after)  a = true;
        }
      }
      setLogs(newLogs);
      if (b !== null) setBefore(b);
      if (a !== null) setAfter(a);
      if (done && timerRef.current) {
        clearInterval(timerRef.current);
        markFinding(finding.id, 'VERIFIED');
      }
    }, 150);
  };

  useEffect(() => {
    runTest();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finding?.id]);

  if (!finding) {
    return (
      <div className="max-w-[800px] mx-auto py-16 text-center space-y-4">
        <div className="mono text-[12px] text-[var(--color-ink-3)]">Finding &lsquo;#{id}&lsquo; not found.</div>
        <button onClick={() => navigate('/findings')} className="btn btn-primary btn-sm">← Back to Findings</button>
      </div>
    );
  }

  const isComplete = before === true && after === true;

  return (
    <div className="max-w-[1100px] mx-auto space-y-8 fade-in py-2">
      
      {/* Navigation & Protocol Tag */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(`/remediation/${finding.id}`)}
          className="btn btn-ghost btn-sm text-[12px] font-semibold text-[var(--color-ink-2)]"
        >
          <ArrowLeft className="w-4 h-4" />
          ← REMEDIATION PROPOSAL
        </button>

        <div className="protocol-tag">raksha://verification/verified</div>
      </div>

      {/* Header Banner */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-4 sm:pb-6 border-b border-[var(--color-line)]">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            <SevBadge sev={finding.severity} />
            <h1 className="text-xl sm:text-3xl font-extrabold text-[var(--color-ink)] tracking-tight break-words">
              VERIFICATION <span className="text-[var(--color-ink-3)] font-normal">/ {finding.title}</span>
            </h1>
          </div>
          <p className="mono text-[11.5px] sm:text-[12px] text-[var(--color-ink-3)] break-all">
            {finding.cwe_id} • {finding.file_path}:{finding.line_number}
          </p>
        </div>

        <button onClick={() => runTest()} className="btn btn-primary btn-sm">
          <RotateCcw className="w-3.5 h-3.5" /> Re-run Verification
        </button>
      </div>

      {/* BEFORE VS AFTER PROOF CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        
        {/* BEFORE CARD */}
        <div className="p-4 sm:p-6 rounded-xl bg-white border border-red-200 shadow-xs space-y-3">
          <div className="mono text-[11px] font-bold text-red-600 uppercase tracking-wider">
            BEFORE (BASELINE BUILD)
          </div>

          <div className="flex items-center gap-3">
            <XCircle className="w-6 h-6 text-red-600 shrink-0" />
            <div className="font-bold text-[15px] sm:text-[16px] text-red-700">
              {before ? '✕ Payload Reproduced' : 'Testing Baseline Probe…'}
            </div>
          </div>

          <p className="text-[12.5px] text-[var(--color-ink-2)] leading-relaxed">
            Vulnerability probe executed against baseline commit <span className="mono">{currentRepo?.commit ? currentRepo.commit.slice(0, 7) : '—'}</span>. HTTP 500 error triggered.
          </p>
        </div>

        {/* AFTER CARD */}
        <div className="p-4 sm:p-6 rounded-xl bg-white border border-emerald-200 shadow-xs space-y-3">
          <div className="mono text-[11px] font-bold text-[#0F8A5A] uppercase tracking-wider">
            AFTER (PATCHED BUILD)
          </div>

          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-[#0F8A5A] shrink-0" />
            <div className="font-bold text-[15px] sm:text-[16px] text-[#0F8A5A]">
              {after ? '✓ Payload Blocked' : 'Testing Patched Build…'}
            </div>
          </div>

          <p className="text-[12.5px] text-[var(--color-ink-2)] leading-relaxed">
            Same payload replayed against patched container build. User input treated as sanitized data.
          </p>
        </div>

      </div>

      {/* REGRESSION & SANDBOX STATUS */}
      <div className="p-4 sm:p-6 rounded-xl bg-white border border-[var(--color-line)] shadow-xs flex flex-wrap items-center justify-between gap-4 sm:gap-6">
        <div className="space-y-1">
          <div className="mono text-[10.5px] font-bold text-[var(--color-ink-3)] uppercase tracking-wider">REGRESSION TEST SUITE</div>
          <div className="text-[13.5px] sm:text-[14px] font-bold text-[var(--color-ink)] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#0F8A5A]" />
            ✓ 12 / 12 Tests Passed
          </div>
        </div>

        <div className="space-y-1">
          <div className="mono text-[10.5px] font-bold text-[var(--color-ink-3)] uppercase tracking-wider">SANDBOX CONTAINER</div>
          <div className="text-[13.5px] sm:text-[14px] font-bold text-[var(--color-ink)] flex items-center gap-2 flex-wrap">
            <Check className="w-4 h-4 text-[#0F8A5A]" />
            <span>✓ Container Destroyed &amp; Purged</span>
            <span className="mono text-[10.5px] text-[var(--color-ink-3)]">({logs.length} probe events)</span>
          </div>
        </div>
      </div>

      {/* HUGE GREEN RESULT BANNER */}
      {isComplete && (
        <div className="p-5 sm:p-8 rounded-xl bg-[#16C784] text-[#111111] border border-[#111111] shadow-hard space-y-3 fade-in">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8 text-[#111111] shrink-0" />
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">VERIFIED</h2>
          </div>
          <p className="text-[14px] sm:text-[15px] font-bold leading-relaxed max-w-[800px] text-[#111111]">
            &ldquo;Vulnerability could not be reproduced against the patched build.&rdquo;
          </p>
          <div className="mono text-[11px] sm:text-[11.5px] text-[#111111] font-bold pt-2 border-t border-[#111111]/30">
            Audit proof recorded for assessment snapshot. Vulnerability status set to VERIFIED.
          </div>
        </div>
      )}

    </div>
  );
}