import type { FC } from 'react';
import type { AssessmentArchitecture, StepState } from '../lib/types';

interface ActiveAnalysisModuleProps {
  activeStep?: StepState;
  architecture?: AssessmentArchitecture;
  activeFile?: string;
  repoName?: string;
  className?: string;
}

const FLOW_NODES = [
  { id: 'index',        label: 'USER INPUT',     sub: 'External API / Web' },
  { id: 'architecture', label: 'AUTH / PERM',    sub: 'Token & Scope Validation' },
  { id: 'dependencies', label: 'REPO SERVICE',   sub: 'Internal Routing' },
  { id: 'static',       label: 'FILE SYSTEM',    sub: 'Static Source Scanning' },
  { id: 'secrets',      label: 'DATA SINK',      sub: 'Storage & DB Operation' },
  { id: 'reasoning',    label: 'EXECUTION',      sub: 'AI Validation Pipeline' },
];

export const ActiveAnalysisModule: FC<ActiveAnalysisModuleProps> = ({
  activeStep,
  architecture,
  activeFile,
  repoName = 'repository',
  className = '',
}) => {
  const currentStepId = activeStep?.id || 'static';
  
  // Determine active node index based on current step
  const activeNodeIdx = FLOW_NODES.findIndex((n) => n.id === currentStepId);
  const highlightedIdx = activeNodeIdx >= 0 ? activeNodeIdx : 3;

  // Real inspected file or top route handler if available
  const inspectedPath = activeFile ||
    (architecture?.topRoutes?.[0]?.file_path) ||
    `src/${currentStepId === 'dependencies' ? 'package.json' : currentStepId === 'secrets' ? 'config/env.py' : 'auth/session.py'}`;

  return (
    <div className={`relative p-5 rounded-xl bg-white border border-[#111111] shadow-hard space-y-4 overflow-hidden ${className}`}>
      {/* Subtle Horizontal Scanning Line Effect */}
      <div className="animate-scan-line" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#111111] pb-3">
        <div className="space-y-0.5">
          <div className="mono text-[10px] font-extrabold text-[#666666] uppercase tracking-wider">
            REAL-TIME SECURITY ANALYSIS ENGINE
          </div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-extrabold text-[#111111] tracking-tight uppercase">
              ACTIVE ANALYSIS: {activeStep?.label || 'THREAT-PATH CORRELATION'}
            </h3>
            <span className="mono text-[9.5px] font-extrabold text-[#111111] bg-[#C5F82A] px-2 py-0.5 rounded border border-[#111111] animate-pulse">
              ● LIVE
            </span>
          </div>
        </div>

        <div className="mono text-[11px] font-bold text-[#111111] bg-[#FAFAFA] px-2.5 py-1 rounded border border-[#111111]">
          INSPECTING: <span className="underline">{repoName}</span>
        </div>
      </div>

      {/* Threat Path Architectural Node Flow */}
      <div className="space-y-2">
        <div className="mono text-[10px] font-extrabold text-[#666666] uppercase tracking-wider">
          THREAT-PATH DATA FLOW CORRELATION
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {FLOW_NODES.map((node, idx) => {
            const isActive = idx === highlightedIdx;
            const isCompleted = idx < highlightedIdx;

            return (
              <div
                key={node.id}
                className={`p-3 rounded-lg border text-left space-y-1 transition-all ${
                  isActive
                    ? 'bg-[#C5F82A] border-[#111111] shadow-hard-sm animate-node-ping'
                    : isCompleted
                    ? 'bg-white border-[#111111]'
                    : 'bg-[#FAFAFA] border-[#DCDCD5] opacity-70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="mono text-[9.5px] font-extrabold text-[#111111]">
                    0{idx + 1}
                  </span>
                  {isActive ? (
                    <span className="mono text-[8.5px] font-extrabold text-[#111111] bg-white px-1 rounded border border-[#111111]">
                      ACTIVE
                    </span>
                  ) : isCompleted ? (
                    <span className="mono text-[10px] font-bold text-[#111111]">✓</span>
                  ) : (
                    <span className="mono text-[9px] text-[#888888]">○</span>
                  )}
                </div>

                <div className="mono text-[11px] font-extrabold text-[#111111] tracking-tight leading-tight">
                  {node.label}
                </div>
                <div className="text-[10px] text-[#4A4A4A] font-medium leading-snug truncate">
                  {node.sub}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Code / Repository Surface Inspection Fragment */}
      <div className="p-3.5 rounded-lg bg-[#FAFAFA] border border-[#111111] space-y-2">
        <div className="flex items-center justify-between border-b border-[#111111]/20 pb-1.5">
          <div className="flex items-center gap-2 mono text-[10.5px] font-bold text-[#111111]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#111111]" />
            <span>CURRENT SCAN TARGET SURFACE</span>
          </div>
          <span className="mono text-[10px] font-extrabold text-[#111111] bg-[#C5F82A] px-2 py-0.5 rounded border border-[#111111]">
            {inspectedPath}
          </span>
        </div>

        <div className="mono text-[11px] text-[#333333] space-y-1 pt-1 overflow-x-auto scroll-thin">
          <div className="text-[#666666] font-semibold">
            Mapping external input → auth handler → repository endpoint → file operation
          </div>
          <div className="flex items-center gap-2 font-bold text-[#111111] pt-1">
            <span>[17:46:18]</span>
            <span className="bg-[#C5F82A] text-[#111111] px-1 rounded border border-[#111111]">
              SURFACE EVAL
            </span>
            <span>Parsing call-graph & static AST tokens for {inspectedPath.split('/').pop()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActiveAnalysisModule;
