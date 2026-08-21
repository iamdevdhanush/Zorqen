import { memo } from 'react';
import { ArrowRight, CheckCircle2, ShieldAlert, Terminal } from 'lucide-react';
import type { Finding } from '../lib/types';

interface ThreatGraphProps {
  finding?: Finding;
  className?: string;
}

export const ThreatGraph = memo(function ThreatGraph({
  finding,
  className = '',
}: ThreatGraphProps) {
  const isVerified = finding?.validation === 'CONFIRMED' || finding?.validation === 'VALIDATED';
  const cweLabel = finding?.cwe_id || 'CWE-89';
  const fileBasename = finding?.file_path ? finding.file_path.split('/').pop() : 'auth.py';
  const lineNo = finding?.line_number ?? 42;
  const endpoint = finding?.endpoint || '/api/v1/auth/login';

  const nodes = [
    {
      step: '01',
      label: 'USER INPUT',
      subtext: 'HTTP Body Request',
      type: 'input',
      active: true,
    },
    {
      step: '02',
      label: 'ROUTE INGRESS',
      subtext: endpoint,
      type: 'route',
      active: true,
    },
    {
      step: '03',
      label: 'SOURCE CODE',
      subtext: `${fileBasename}:${lineNo}`,
      type: 'code',
      active: true,
    },
    {
      step: '04',
      label: 'VULNERABLE SINK',
      subtext: cweLabel,
      type: 'sink',
      critical: true,
      active: true,
    },
    {
      step: '05',
      label: 'PROBE RESULT',
      subtext: isVerified ? 'Sandbox Exploited' : 'Static Match Only',
      type: 'result',
      verified: isVerified,
      active: true,
    },
  ];

  return (
    <div className={`p-5 rounded-[16px] bg-white border-2 border-[#111111] shadow-hard-sm space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#111111]/15 pb-3">
        <div className="flex items-center gap-2.5">
          <Terminal className="w-5 h-5 text-[#111111]" />
          <h3 className="mono text-[12px] sm:text-[13px] font-extrabold text-[#0A0A0A] uppercase tracking-[0.14em]">
            AI THREAT GRAPH &amp; PATH TRACE
          </h3>
        </div>
        <span className="mono text-[10px] font-extrabold text-[#111111] bg-[#C8FF2E] px-2.5 py-0.5 rounded border border-[#111111]">
          EXPLOIT PATHWAY
        </span>
      </div>

      {/* Interactive Flow Nodes */}
      <div className="overflow-x-auto scroll-thin py-2">
        <div className="flex items-center justify-between gap-3 min-w-max">
          {nodes.map((node, idx) => (
            <div key={node.step} className="flex items-center gap-3">
              {/* Node Card */}
              <div
                className={`p-3.5 rounded-[12px] border-2 transition-all min-w-[140px] space-y-1 ${
                  node.critical
                    ? 'bg-[#FEE2E2] border-[#111111] text-[#DC2626]'
                    : node.verified
                    ? 'bg-[#C8FF2E] border-[#111111] text-[#111111]'
                    : 'bg-[#FAFAFA] border-[#111111]/20 text-[#0A0A0A]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="mono text-[9.5px] font-extrabold tracking-wider opacity-80">
                    {node.step} NODE
                  </span>
                  {node.critical ? (
                    <ShieldAlert className="w-3.5 h-3.5 text-[#DC2626]" />
                  ) : node.verified ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#111111]" />
                  ) : null}
                </div>
                <div className="mono text-[11px] font-extrabold uppercase">{node.label}</div>
                <div className="mono text-[10.5px] font-semibold opacity-90 truncate max-w-[150px]">
                  {node.subtext}
                </div>
              </div>

              {/* Connecting Pulse Arrow (Except last node) */}
              {idx < nodes.length - 1 && (
                <div className="flex items-center text-[#111111] shrink-0">
                  <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default ThreatGraph;
