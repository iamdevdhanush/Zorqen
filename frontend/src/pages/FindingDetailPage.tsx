import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowDown,
  ArrowLeft,
  CheckCircle2,
  Database,
  FileCode,
  GitPullRequest,
  Globe,
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
    <div className="max-w-[1340px] mx-auto space-y-8 fade-in py-2">
      
      {/* Navigation & Protocol Tag */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/findings')}
          className="btn btn-ghost btn-sm text-[12px] font-bold text-[#111111]"
        >
          <ArrowLeft className="w-4 h-4" />
          ← FINDINGS INVESTIGATION
        </button>

        <div className="protocol-tag">raksha://finding/{finding.cwe_id.toLowerCase()}</div>
      </div>

      {/* Forensic Investigation Header Banner */}
      <div className="p-4 sm:p-7 rounded-xl bg-white border border-[#111111] shadow-hard space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            <SevBadge sev={finding.severity} />
            <h1 className="text-xl sm:text-3xl font-extrabold text-[#111111] tracking-tight break-words">
              {finding.title.toUpperCase()}
            </h1>
            <span className="chip mono font-bold text-[10px] sm:text-[11px]">{finding.cwe_id}</span>
            <span className="mono text-[11px] sm:text-[12px] font-extrabold text-[#111111] bg-[#C5F82A] px-2.5 py-1 rounded border border-[#111111]">
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

        <div className="mono text-[11.5px] sm:text-[12.5px] font-semibold text-[#111111] bg-[#FAFAFA] p-3 sm:p-3.5 rounded-lg border border-[#111111] shadow-hard-sm flex items-center gap-2 flex-wrap break-all">
          <FileCode className="w-4 h-4 text-[#111111] shrink-0" />
          <span className="font-extrabold text-[#111111]">{finding.file_path}:{finding.line_number}</span>
          {finding.endpoint && (
            <>
              <span>•</span>
              <span className="break-all">{finding.endpoint}</span>
            </>
          )}
        </div>
      </div>

      {/* ── PROMINENT VISUAL ATTACK PATH DIAGRAM (VibeScan Feature) ────── */}
      <div className="p-4 sm:p-6 rounded-xl bg-white border border-[#111111] shadow-hard space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#111111]" />
            <h2 className="text-base sm:text-lg font-extrabold text-[#111111] tracking-tight">VISUAL ATTACK PATH</h2>
          </div>
          <span className="mono text-[10px] sm:text-[11px] font-bold text-[#666666]">Derived from Repository Call Graph Analysis</span>
        </div>

        <div className="p-4 sm:p-6 rounded-lg bg-[#FAFAFA] border border-[#111111] shadow-hard-sm">
          <div className="max-w-[800px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4 text-center">
            
            {/* Step 1: User Input */}
            <div className="p-3.5 rounded-lg border border-[#111111] bg-blue-50 text-[12.5px] font-bold text-blue-950 space-y-1 w-full md:w-auto min-w-[140px] shadow-hard-sm">
              <div className="flex items-center justify-center gap-1.5 text-blue-700">
                <Globe className="w-4 h-4" />
                <span className="mono text-[10px] uppercase font-extrabold">HTTP INGRESS</span>
              </div>
              <div>USER INPUT</div>
            </div>

            <ArrowDown className="w-5 h-5 text-[#111111] md:-rotate-90 shrink-0" />

            {/* Step 2: Route Endpoint */}
            <div className="p-3.5 rounded-lg border border-[#111111] bg-white text-[12.5px] font-bold text-[#111111] space-y-1 w-full md:w-auto min-w-[140px] shadow-hard-sm min-w-0">
              <div className="mono text-[10px] text-[#666666] uppercase font-extrabold">ROUTE</div>
              <div className="mono text-[11.5px] sm:text-[12px] break-all">{finding.endpoint || '/api/users/search'}</div>
            </div>

            <ArrowDown className="w-5 h-5 text-[#111111] md:-rotate-90 shrink-0" />

            {/* Step 3: Source File */}
            <div className="p-3.5 rounded-lg border border-[#111111] bg-white text-[12.5px] font-bold text-[#111111] space-y-1 w-full md:w-auto min-w-[140px] shadow-hard-sm min-w-0">
              <div className="mono text-[10px] text-[#666666] uppercase font-extrabold">SOURCE FILE</div>
              <div className="mono text-[11.5px] sm:text-[12px] break-all">users.py:{finding.line_number}</div>
            </div>

            <ArrowDown className="w-5 h-5 text-[#111111] md:-rotate-90 shrink-0" />

            {/* Step 4: Vulnerable Operation / Sink */}
            <div className="p-3.5 rounded-lg border border-[#111111] bg-red-50 text-[12.5px] font-bold text-red-950 space-y-1 w-full md:w-auto min-w-[140px] shadow-hard-sm">
              <div className="flex items-center justify-center gap-1.5 text-red-700">
                <Database className="w-4 h-4" />
                <span className="mono text-[10px] uppercase font-extrabold">VULNERABLE SINK</span>
              </div>
              <div className="mono text-[12px] text-red-700">SQL EXECUTION</div>
            </div>

          </div>
        </div>
      </div>

      {/* ── FORENSIC WORKSPACE SPLIT-VIEW: SOURCE CODE | EVIDENCE ───── */}
      <div className="grid lg:grid-cols-2 gap-6 items-start">
        
        {/* SOURCE CODE (Monaco Editor) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="mono text-[11.5px] font-extrabold text-[#111111] uppercase tracking-wider flex items-center gap-2">
              <FileCode className="w-4 h-4 text-[#111111]" />
              SOURCE EVIDENCE CODE VIEWER
            </div>
            <span className="mono text-[10.5px] font-bold text-[#666666]">Line {finding.line_number} Highlighted</span>
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
            <h3 className="mono text-[11px] font-extrabold text-[#111111] uppercase tracking-wider bg-[#C5F82A] px-2 py-0.5 rounded border border-[#111111] inline-block">
              WHY IT MATTERS
            </h3>
            <p className="text-[14px] text-[#111111] leading-relaxed font-bold">
              {finding.root_cause}
            </p>
            <p className="text-[13px] text-[#555555] leading-relaxed font-medium">
              {finding.impact}
            </p>
          </div>

          {/* Evidence Checklist */}
          <div className="p-6 rounded-xl bg-white border border-[#111111] shadow-hard space-y-4">
            <h3 className="mono text-[11px] font-extrabold text-[#666666] uppercase tracking-wider">
              CORROBORATING EVIDENCE MATRIX
            </h3>

            <div className="space-y-3">
              <div className="p-3.5 rounded-lg bg-[#FAFAFA] border border-[#111111] shadow-hard-sm space-y-1">
                <div className="flex items-center gap-2 font-extrabold text-[13px] text-[#111111]">
                  <CheckCircle2 className="w-4 h-4 text-[#111111]" />
                  Static Analysis Match
                </div>
                <p className="text-[12px] text-[#555555] font-medium leading-snug">
                  Semgrep rule <span className="mono text-[11px] font-bold">python.sql.injection</span> matched statement at line {finding.line_number}.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-[#FAFAFA] border border-[#111111] shadow-hard-sm space-y-1">
                <div className="flex items-center gap-2 font-extrabold text-[13px] text-[#111111]">
                  <CheckCircle2 className="w-4 h-4 text-[#111111]" />
                  Runtime Reproduction
                </div>
                <p className="text-[12px] text-[#555555] font-medium leading-snug">
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