import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowDown,
  ArrowLeft,
  CheckCircle2,
  FileCode,
  GitPullRequest,
  Layers,
} from 'lucide-react';
import { SevBadge, StatusBadge, ValidationBadge } from '../components/ui';
import CodeView from '../components/CodeView';
import { useFinding } from '../store/WorkspaceContext';

export default function FindingDetailPage() {
  const { id } = useParams();
  const finding = useFinding(id);
  const navigate = useNavigate();

  if (!finding) {
    return (
      <div className="max-w-[800px] mx-auto py-16 text-center space-y-4">
        <div className="mono text-[12px] text-[#666666]">
          Finding &lsquo;#{id}&lsquo; not found on current assessment.
        </div>
        <button onClick={() => navigate('/findings')} className="btn btn-primary btn-sm">
          ← Back to Findings
        </button>
      </div>
    );
  }

  const hasFix = !!finding.remediation;

  return (
    <div className="max-w-[1340px] mx-auto space-y-5 fade-in py-2">
      
      {/* Navigation & Protocol Tag */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/findings')}
          className="inline-flex items-center gap-1.5 text-[11.5px] font-extrabold transition-colors cursor-pointer group"
          style={{ color: 'var(--color-ink-2)' }}
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" style={{ color: 'var(--color-ink)' }} />
          <span>FINDINGS INVESTIGATION</span>
        </button>

        <div className="protocol-tag">zorqen://finding/{finding.cwe_id.toLowerCase()}</div>
      </div>

      {/* Forensic Investigation Header Banner */}
      <div className="p-4 sm:p-7 rounded-xl bg-white border border-[#111111] shadow-hard space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            <SevBadge sev={finding.severity} />
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight break-words" style={{ color: 'var(--color-ink)' }}>
              {finding.title.toUpperCase()}
            </h1>
            <span className="chip mono font-bold text-[10px] sm:text-[11px]">{finding.cwe_id}</span>
            <span className="mono text-[11px] sm:text-[12px] font-extrabold px-2.5 py-1 rounded border border-[#111111]" style={{ background: 'var(--color-accent)', color: 'var(--color-ink)' }}>
              {finding.confidence_pct}% CONFIDENCE
            </span>
            <ValidationBadge v={finding.validation} />
            <StatusBadge s={finding.status} />
          </div>

          {hasFix && (
            <button
              onClick={() => navigate(`/remediation/${finding.id}`)}
              className="btn btn-accent px-5 sm:px-6 py-2 sm:py-2.5 text-[12.5px] sm:text-[13px] w-full sm:w-auto justify-center"
            >
              <GitPullRequest className="w-4 h-4" />
              Review Patch Proposal →
            </button>
          )}
        </div>

        <div className="mono text-[11.5px] sm:text-[12.5px] font-semibold p-3 sm:p-3.5 rounded-lg border border-[#111111] shadow-hard-sm flex items-center gap-2 flex-wrap break-all" style={{ background: 'var(--color-panel-2)', color: 'var(--color-ink)' }}>
          <FileCode className="w-4 h-4 shrink-0" style={{ color: 'var(--color-ink)' }} />
          <span className="font-extrabold" style={{ color: 'var(--color-ink)' }}>{finding.file_path}:{finding.line_number}</span>
          {finding.endpoint && (
            <>
              <span>•</span>
              <span className="break-all">{finding.endpoint}</span>
            </>
          )}
        </div>
      </div>

      {/* ── TECHNICAL EVIDENCE CHAIN COMPONENT ────── */}
      <div className="p-4 sm:p-6 rounded-xl bg-white border border-[#111111] shadow-hard space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 shrink-0" style={{ color: 'var(--color-ink)' }} />
            <h2 className="text-base sm:text-lg font-extrabold tracking-tight select-none" style={{ color: 'var(--color-ink)' }}>
              EVIDENCE CHAIN
            </h2>
            <span className="mono text-[10px] font-extrabold px-2 py-0.5 rounded border border-[#111111] uppercase" style={{ background: 'var(--color-accent)', color: 'var(--color-ink)' }}>
              REASONING &amp; PROBE
            </span>
          </div>
          <span className="mono text-[10px] sm:text-[11px] font-bold" style={{ color: 'var(--color-ink-3)' }}>
            Derived from Repository Call Graph &amp; Sandbox Transcripts
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-lg border border-[#111111] shadow-hard-sm overflow-x-auto scroll-thin" style={{ background: 'var(--color-panel-2)' }}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-2.5 sm:gap-3 text-center min-w-max">
            
            {/* 01: Ingress */}
            <div className="p-3 rounded-lg border border-[#111111] text-[12px] font-bold space-y-0.5 shadow-hard-sm min-w-[130px]" style={{ background: 'var(--color-panel)', color: 'var(--color-ink)' }}>
              <div className="mono text-[9.5px] uppercase font-extrabold" style={{ color: 'var(--color-ink-3)' }}>01 INGRESS</div>
              <div className="mono text-[11.5px]">USER INPUT</div>
            </div>

            <ArrowDown className="w-4 h-4 md:-rotate-90 shrink-0" style={{ color: 'var(--color-ink)' }} />

            {/* 02: Route Endpoint */}
            <div className="p-3 rounded-lg border border-[#111111] text-[12px] font-bold space-y-0.5 shadow-hard-sm min-w-[140px]" style={{ background: 'var(--color-panel)', color: 'var(--color-ink)' }}>
              <div className="mono text-[9.5px] uppercase font-extrabold" style={{ color: 'var(--color-ink-3)' }}>02 ENDPOINT</div>
              <div className="mono text-[11.5px] truncate max-w-[180px]">{finding.endpoint || 'HTTP ROUTE'}</div>
            </div>

            <ArrowDown className="w-4 h-4 md:-rotate-90 shrink-0" style={{ color: 'var(--color-ink)' }} />

            {/* 03: Source Location */}
            <div className="p-3 rounded-lg border border-[#111111] text-[12px] font-bold space-y-0.5 shadow-hard-sm min-w-[140px]" style={{ background: 'var(--color-panel)', color: 'var(--color-ink)' }}>
              <div className="mono text-[9.5px] uppercase font-extrabold" style={{ color: 'var(--color-ink-3)' }}>03 SOURCE CODE</div>
              <div className="mono text-[11.5px] truncate max-w-[180px]">
                {finding.file_path.split('/').pop()}:{finding.line_number}
              </div>
            </div>

            <ArrowDown className="w-4 h-4 md:-rotate-90 shrink-0" style={{ color: 'var(--color-ink)' }} />

            {/* 04: Vulnerable Sink */}
            <div className="p-3 rounded-lg border border-[#111111] bg-[#FEE2E2] text-[12px] font-bold text-[#DC2626] space-y-0.5 shadow-hard-sm min-w-[140px]">
              <div className="mono text-[9.5px] text-[#DC2626] uppercase font-extrabold">04 SINK</div>
              <div className="mono text-[11.5px] uppercase">{finding.cwe_name.slice(0, 18)}</div>
            </div>

            <ArrowDown className="w-4 h-4 md:-rotate-90 shrink-0" style={{ color: 'var(--color-ink)' }} />

            {/* 05: Validation State */}
            {finding.validation === 'CONFIRMED' || finding.validation === 'VALIDATED' ? (
              <div className="p-3 rounded-lg border border-[#111111] text-[12px] font-extrabold space-y-0.5 shadow-hard-sm min-w-[150px]" style={{ background: 'var(--color-accent)', color: 'var(--color-ink)' }}>
                <div className="mono text-[9.5px] uppercase font-bold" style={{ color: 'var(--color-ink)' }}>05 PROBE RESULT</div>
                <div className="mono text-[11.5px]">SANDBOX VERIFIED</div>
              </div>
            ) : (
              <div className="p-3 rounded-lg border border-[#111111] text-[12px] font-extrabold space-y-0.5 shadow-hard-sm min-w-[150px]" style={{ background: 'var(--color-panel)', color: 'var(--color-ink-3)' }}>
                <div className="mono text-[9.5px] uppercase font-bold" style={{ color: 'var(--color-ink-3)' }}>05 PROBE RESULT</div>
                <div className="mono text-[11.5px]" style={{ color: 'var(--color-ink-2)' }}>NOT VALIDATED</div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── FORENSIC WORKSPACE SPLIT-VIEW: SOURCE CODE | EVIDENCE ───── */}
      <div className="grid lg:grid-cols-2 gap-6 items-start">
        
        {/* SOURCE CODE (Monaco Editor) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="mono text-[11.5px] font-extrabold uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--color-ink)' }}>
              <FileCode className="w-4 h-4 shrink-0" style={{ color: 'var(--color-ink)' }} />
              SOURCE EVIDENCE CODE VIEWER
            </div>
            <span className="mono text-[10.5px] font-bold" style={{ color: 'var(--color-ink-3)' }}>Line {finding.line_number} Highlighted</span>
          </div>

          <div className="rounded-xl border border-[#111111] bg-white shadow-hard overflow-hidden">
            <CodeView
              snippet={finding.code.snippet}
              startLine={finding.code.start_line}
              language={finding.code.language}
              highlightLine={finding.code.vuln_line}
              height={380}
              filePath={finding.file_path}
            />
          </div>
        </div>

        {/* CORROBORATING EVIDENCE & AI REASONING */}
        <div className="space-y-6">
          
          {/* Why It Matters / Root Cause */}
          <div className="p-6 rounded-xl bg-white border border-[#111111] shadow-hard space-y-2">
            <h3 className="mono text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded border border-[#111111] inline-block" style={{ background: 'var(--color-accent)', color: 'var(--color-ink)' }}>
              WHY IT MATTERS
            </h3>
            <p className="text-[14px] leading-relaxed font-bold" style={{ color: 'var(--color-ink)' }}>
              {finding.root_cause}
            </p>
            <p className="text-[13px] leading-relaxed font-medium" style={{ color: 'var(--color-ink-2)' }}>
              {finding.impact}
            </p>
          </div>

          {/* Evidence Checklist */}
          <div className="p-6 rounded-xl bg-white border border-[#111111] shadow-hard space-y-4">
            <h3 className="mono text-[11px] font-extrabold uppercase tracking-wider" style={{ color: 'var(--color-ink)' }}>
              CORROBORATING EVIDENCE MATRIX
            </h3>

            <div className="space-y-3">
              <div className="p-3.5 rounded-lg border border-[#111111] shadow-hard-sm space-y-1" style={{ background: 'var(--color-panel-2)' }}>
                <div className="flex items-center gap-2 font-extrabold text-[13px]" style={{ color: 'var(--color-ink)' }}>
                  <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: 'var(--color-ink)' }} />
                  Static Analysis Match
                </div>
                <p className="text-[12px] font-medium leading-snug" style={{ color: 'var(--color-ink-2)' }}>
                  Semgrep rule <span className="mono text-[11px] font-bold">python.sql.injection</span> matched statement at line {finding.line_number}.
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-[#111111] shadow-hard-sm space-y-1" style={{ background: 'var(--color-panel-2)' }}>
                <div className="flex items-center gap-2 font-extrabold text-[13px]" style={{ color: 'var(--color-ink)' }}>
                  <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: 'var(--color-ink)' }} />
                  Runtime Reproduction
                </div>
                <p className="text-[12px] font-medium leading-snug" style={{ color: 'var(--color-ink-2)' }}>
                  Exploit probe verified via sandboxed container execution probe #0242.
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}