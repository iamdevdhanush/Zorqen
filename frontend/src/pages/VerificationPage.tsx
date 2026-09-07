import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, ExternalLink, ShieldAlert } from 'lucide-react';
import { SevBadge } from '../components/ui';
import { useFinding } from '../store/WorkspaceContext';

export default function VerificationPage() {
  const { id } = useParams();
  const finding = useFinding(id);
  const navigate = useNavigate();

  if (!finding) {
    return (
      <div className="max-w-[800px] mx-auto py-16 text-center space-y-4">
        <div className="mono text-[12px] text-[var(--color-ink-3)]">Finding &lsquo;#{id}&rsquo; not found.</div>
        <button onClick={() => navigate('/findings')} className="btn btn-primary btn-sm">← Back to Findings</button>
      </div>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto space-y-8 fade-in py-2">
      
      {/* Navigation & Protocol Tag */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="btn btn-ghost btn-sm text-[12px] font-semibold text-[var(--color-ink-2)]"
        >
          <ArrowLeft className="w-4 h-4" />
          ← BACK
        </button>

        <div className="protocol-tag">zorqen://verification</div>
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
      </div>

      {/* SANDBOX UNAVAILABLE NOTICE */}
      <div className="p-6 sm:p-8 rounded-[20px] bg-[#F7F5F0] border-2 border-[#111111] space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[12px] bg-[#FEF3C7] border-2 border-[#B45309] flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 stroke-[2] text-[#B45309]" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#111111] tracking-tight">SANDBOX VALIDATION UNAVAILABLE</h2>
            <p className="mono text-[11px] text-[#525252] font-bold mt-0.5">Runtime exploit verification requires sandbox infrastructure</p>
          </div>
        </div>

        <div className="p-5 rounded-[14px] bg-white border-2 border-[#111111] space-y-3">
          <p className="text-[13px] text-[#333333] font-medium leading-relaxed">
            Sandbox-based exploit reproduction is not currently available for this finding. 
            Runtime verification requires an isolated container environment to safely execute 
            exploit probes against the assessed codebase.
          </p>
          <p className="text-[12.5px] text-[#525252] font-medium leading-relaxed">
            The finding below was identified through <span className="font-bold text-[#111111]">static analysis</span> and 
            <span className="font-bold text-[#111111]"> AI reasoning</span>. Manual verification or sandbox infrastructure 
            is required to confirm exploitability at runtime.
          </p>
        </div>
      </div>

      {/* STATIC ANALYSIS EVIDENCE */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 stroke-[2] text-[#111111]" />
          <h2 className="text-lg sm:text-xl font-extrabold text-[#111111] tracking-tight">STATIC ANALYSIS EVIDENCE</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* File Location */}
          <div className="p-6 rounded-[20px] bg-white border-2 border-[#111111] shadow-hard space-y-3">
            <div className="mono text-[10.5px] font-bold text-[#525252] uppercase tracking-wider">
              FILE LOCATION
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="mono text-[12px] font-bold text-[#111111] break-all">{finding.file_path}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="mono text-[12px] text-[#333333]">Line {finding.line_number}</span>
              </div>
              {finding.endpoint && (
                <div className="flex items-center gap-2">
                  <span className="mono text-[12px] text-[#333333]">Endpoint: {finding.endpoint}</span>
                </div>
              )}
            </div>
          </div>

          {/* Confidence & Classification */}
          <div className="p-6 rounded-[20px] bg-white border-2 border-[#111111] shadow-hard space-y-3">
            <div className="mono text-[10.5px] font-bold text-[#525252] uppercase tracking-wider">
              CONFIDENCE & CLASSIFICATION
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-[#525252]">Confidence:</span>
                <span className="mono text-[12px] font-bold text-[#111111]">{finding.confidence_pct}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-[#525252]">Source:</span>
                <span className="mono text-[12px] font-bold text-[#111111]">{finding.source_tool}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-[#525252]">Status:</span>
                <span className="mono text-[12px] font-bold text-[#111111]">{finding.status}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Root Cause */}
        {finding.root_cause && (
          <div className="p-6 rounded-[20px] bg-white border-2 border-[#111111] shadow-hard space-y-3">
            <div className="mono text-[10.5px] font-bold text-[#525252] uppercase tracking-wider">
              ROOT CAUSE
            </div>
            <p className="text-[13px] text-[#333333] font-medium leading-relaxed">
              {finding.root_cause}
            </p>
          </div>
        )}

        {/* Impact */}
        {finding.impact && (
          <div className="p-6 rounded-[20px] bg-white border-2 border-[#111111] shadow-hard space-y-3">
            <div className="mono text-[10.5px] font-bold text-[#525252] uppercase tracking-wider">
              IMPACT
            </div>
            <p className="text-[13px] text-[#333333] font-medium leading-relaxed">
              {finding.impact}
            </p>
          </div>
        )}

        {/* Attack Path */}
        {finding.attack_path && finding.attack_path.length > 0 && (
          <div className="p-6 rounded-[20px] bg-white border-2 border-[#111111] shadow-hard space-y-3">
            <div className="mono text-[10.5px] font-bold text-[#525252] uppercase tracking-wider">
              ATTACK PATH
            </div>
            <div className="space-y-2">
              {finding.attack_path.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <span className="mono text-[11px] font-bold text-[#C8F31D] bg-[#111111] px-2 py-0.5 rounded-full border-[1.5px] border-[#111111] shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-[12.5px] text-[#333333] font-medium leading-relaxed">{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Evidence */}
        {finding.evidence && (
          <div className="p-6 rounded-[20px] bg-white border-2 border-[#111111] shadow-hard space-y-3">
            <div className="mono text-[10.5px] font-bold text-[#525252] uppercase tracking-wider">
              EVIDENCE
            </div>
            <div className="p-4 rounded-[14px] bg-[#F7F5F0] border-2 border-[#111111]">
              <pre className="mono text-[11.5px] text-[#333333] whitespace-pre-wrap break-words leading-relaxed">
                {typeof finding.evidence === 'string' 
                  ? finding.evidence 
                  : finding.evidence.static_analysis || finding.evidence.ai_reasoning || JSON.stringify(finding.evidence, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Code Snippet */}
        {finding.code && (
          <div className="p-6 rounded-[20px] bg-white border-2 border-[#111111] shadow-hard space-y-3">
            <div className="mono text-[10.5px] font-bold text-[#525252] uppercase tracking-wider">
              AFFECTED CODE
            </div>
            <div className="p-4 rounded-[14px] bg-[#111111] border-2 border-[#111111] overflow-x-auto">
              <pre className="mono text-[11.5px] text-[#C8F31D] whitespace-pre-wrap break-words leading-relaxed">
                {finding.code.snippet || 'No code snippet available'}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* ACTIONS */}
      <div className="p-6 rounded-[20px] bg-white border-2 border-[#111111] shadow-hard flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="mono text-[10.5px] font-bold text-[#4A4A4A] uppercase tracking-wider">NEXT STEPS</div>
          <p className="text-[12.5px] text-[#555555] font-medium">
            Review the evidence above and assess whether this finding requires remediation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="btn btn-ghost btn-sm text-[12px] font-semibold"
          >
            ← Back
          </button>
          <button
            onClick={() => navigate(`/findings/${finding.id}`)}
            className="btn btn-primary btn-sm text-[12px]"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View Full Finding
          </button>
        </div>
      </div>

    </div>
  );
}
