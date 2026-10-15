import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  FileCode,
  GitPullRequest,
} from 'lucide-react';
import { SevBadge, StatusBadge, ValidationBadge } from '../components/ui';
import CodeView from '../components/CodeView';
import ThreatGraph from '../components/ThreatGraph';
import { useFinding } from '../store/WorkspaceContext';
import { AntiMetalButton } from '../components/ui/anti-metal-button';

export default function FindingDetailPage() {
  const { id } = useParams();
  const finding = useFinding(id);
  const navigate = useNavigate();
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!finding) {
    return (
      <div className="max-w-[800px] mx-auto py-16 text-center space-y-4">
        <div className="mono text-[13px] text-[#6B6B6B]">
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
    <div className="max-w-[1340px] mx-auto space-y-6 fade-in py-4">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/findings')}
          className="inline-flex items-center gap-1.5 text-[12px] font-extrabold text-[#5E5E5E] hover:text-[#0A0A0A] transition-colors cursor-pointer group min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>FINDINGS INVESTIGATION</span>
        </button>

        <div className="protocol-tag">zorqen://finding/{finding.cwe_id.toLowerCase()}</div>
      </div>

      {/* Forensic Investigation Header Card */}
      <div className="p-6 sm:p-7 rounded-[20px] bg-white border-2 border-[#111111] shadow-hard space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <SevBadge sev={finding.severity} />
            <h1 className="text-xl sm:text-3xl font-extrabold text-[#0A0A0A] tracking-tight break-words">
              {finding.title.toUpperCase()}
            </h1>
            <span className="chip mono font-bold text-[11px]">{finding.cwe_id}</span>
            <span className="mono text-[12px] font-extrabold px-3 py-1 rounded-full border-[1.5px] border-[#111111] bg-[#C8F31D] text-[#111111] tabular-nums">
              {finding.confidence_pct}% CONFIDENCE
            </span>
            <ValidationBadge v={finding.validation} />
            <StatusBadge s={finding.status} />
          </div>

          {hasFix && (
            <AntiMetalButton
              onClick={() => navigate(`/remediation/${finding.id}`)}
              icon={<GitPullRequest className="w-[18px] h-[18px] stroke-[2] text-[#C8F31D]" />}
              className="w-full sm:w-auto"
            >
              Review Patch Proposal →
            </AntiMetalButton>
          )}
        </div>

        <div className="mono text-[12.5px] font-semibold p-3.5 rounded-[14px] border-2 border-[#111111] bg-[#F7F5F0] text-[#0A0A0A] flex items-center gap-2 flex-wrap break-all tabular-nums">
          <FileCode className="w-4 h-4 stroke-[2] text-[#0A0A0A] shrink-0" />
          <span className="font-extrabold">{finding.file_path}:{finding.line_number}</span>
          {finding.endpoint && (
            <>
              <span>•</span>
              <span>{finding.endpoint}</span>
            </>
          )}
        </div>
      </div>

      {/* AI Threat Graph Visualization */}
      <ThreatGraph finding={finding} />

      {/* Forensic Code & Evidence Matrix */}
      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* Source Code Viewer (Monaco Editor) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="mono text-[11.5px] font-extrabold uppercase tracking-wider flex items-center gap-2 text-[#0A0A0A]">
              <FileCode className="w-4 h-4 text-[#0A0A0A]" />
              SOURCE EVIDENCE CODE VIEWER
            </div>
            <span className="mono text-[11px] font-bold text-[#6B6B6B] tabular-nums">
              Line {finding.line_number} Highlighted
            </span>
          </div>

          <div className="rounded-[20px] border-2 border-[#111111] bg-white shadow-hard overflow-hidden">
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

        {/* Evidence Matrix & Why It Matters */}
        <div className="space-y-6">
          {/* Why It Matters */}
          <div className="p-6 rounded-[20px] bg-white border-2 border-[#111111] shadow-hard space-y-3">
            <h3 className="mono text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full border-[1.5px] border-[#111111] bg-[#C8F31D] text-[#111111] inline-block">
              WHY IT MATTERS
            </h3>
            <p className="text-[14.5px] leading-relaxed font-bold text-[#0A0A0A]">
              {finding.root_cause}
            </p>
            <p className="text-[13.5px] leading-relaxed font-medium text-[#525252]">
              {finding.impact}
            </p>
          </div>

          {/* Evidence Matrix */}
          <div className="p-6 rounded-[20px] bg-white border-2 border-[#111111] shadow-hard space-y-4">
            <h3 className="mono text-[11px] font-extrabold uppercase tracking-wider text-[#0A0A0A]">
              CORROBORATING EVIDENCE MATRIX
            </h3>

            <div className="space-y-3">
              <div className="p-4 rounded-[14px] border-2 border-[#111111] bg-[#F7F5F0] space-y-1">
                <div className="flex items-center gap-2 font-extrabold text-[13px] text-[#0A0A0A]">
                  <CheckCircle2 className="w-4 h-4 stroke-[2] text-[#111111]" />
                  Static Analysis Match
                </div>
                <p className="text-[12.5px] text-[#525252] font-medium leading-snug">
                  {finding.evidence?.static_analysis ? (
                    finding.evidence.static_analysis
                  ) : (
                    <>Rule <span className="mono text-[11px] font-bold text-[#0A0A0A]">{finding.cwe_id}</span> matched statement at line {finding.line_number}.</>
                  )}
                </p>
              </div>

              <div className="p-4 rounded-[14px] border-2 border-[#111111] bg-[#F7F5F0] space-y-1">
                <div className="flex items-center gap-2 font-extrabold text-[13px] text-[#0A0A0A]">
                  {finding.evidence?.runtime_result === 'REPRODUCED' ? (
                    <CheckCircle2 className="w-4 h-4 stroke-[2] text-[#111111]" />
                  ) : (
                    <AlertCircle className="w-4 h-4 stroke-[2] text-[#737373]" />
                  )}
                  Runtime Reproduction
                </div>
                <p className="text-[12.5px] text-[#525252] font-medium leading-snug">
                  {finding.evidence?.runtime_result === 'REPRODUCED' ? (
                    finding.evidence.runtime || 'Exploit confirmed through runtime execution.'
                  ) : (
                    'Runtime exploit verification not executed. Sandbox infrastructure unavailable.'
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Details Toggle */}
      <div className="pt-2">
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex items-center justify-between w-full mono text-[12px] font-bold text-[#525252] hover:text-[#0A0A0A] transition-colors py-2 border-t-2 border-[#111111] group min-h-[44px]"
        >
          <span>ADVANCED FORENSIC RAW EVIDENCE</span>
          <ChevronDown className={`w-4 h-4 stroke-[2] text-[#525252] transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>

        {showAdvanced && (
          <div className="mt-3 p-4 rounded-[14px] bg-[#F7F5F0] border-2 border-[#111111] mono text-[11px] text-[#333333] space-y-2 fade-in">
            <div>Target: {finding.endpoint || finding.file_path} (line {finding.line_number})</div>
            <div>Confidence score: {finding.confidence_pct}%</div>
            <div>Rule ID: {finding.cwe_id}</div>
            <div>Source tool: {finding.source_tool || 'Semgrep'}</div>
            <div>Attack vector: {finding.attack_path?.[0] || 'HTTP parameters'}</div>
          </div>
        )}
      </div>
    </div>
  );
}