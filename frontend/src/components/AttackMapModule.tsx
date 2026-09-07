import { memo, useState } from 'react';
import { ArrowRight, ChevronDown, Database, FileCode, Network, Server } from 'lucide-react';
import type { AssessmentArchitecture } from '../lib/types';

interface AttackMapModuleProps {
  architecture?: AssessmentArchitecture;
}

export const AttackMapModule = memo(function AttackMapModule({
  architecture,
}: AttackMapModuleProps) {
  const [activeTab, setActiveTab] = useState<'flow' | 'routes'>('flow');
  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({
    Health: true,
    'Database & Core': true,
  });

  if (!architecture) {
    return (
      <div className="p-8 text-center text-[#525252] mono text-[13px] bg-white border-2 border-[#111111] rounded-[20px] shadow-hard">
        Run an assessment to analyze routes, inputs, sinks, and secrets for this repository.
      </div>
    );
  }

  const allRoutes = architecture.topRoutes ?? [];

  // Group routes by category (Health, Database & Core, API & Endpoints)
  const routeGroups = {
    Health: allRoutes.filter((r) => r.endpoint.toLowerCase().includes('health')),
    'Database & Storage': allRoutes.filter((r) => r.endpoint.toLowerCase().includes('db') || r.endpoint.toLowerCase().includes('data') || r.endpoint.toLowerCase().includes('store')),
    'API & Operations': allRoutes.filter((r) => !r.endpoint.toLowerCase().includes('health') && !r.endpoint.toLowerCase().includes('db') && !r.endpoint.toLowerCase().includes('data') && !r.endpoint.toLowerCase().includes('store')),
  };

  const toggleGroup = (groupName: string) => {
    setExpandedFiles((prev) => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  return (
    <div className="space-y-6">
      {/* ── 1. ATTACK SURFACE TOP STAT CARDS ─────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 stroke-[2] text-[#111111]" />
            <h3 className="text-section-title text-[20px]">
              AI-REASONED ATTACK SURFACE
            </h3>
          </div>
          <span className="protocol-tag text-[10px]">THREAT SURFACE MAP</span>
        </div>

        {/* 6 Top Metric Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 rounded-[14px] bg-white border-2 border-[#111111] shadow-hard-sm space-y-1">
            <div className="text-metadata text-[10.5px]">FILES</div>
            <div className="mono text-[24px] font-extrabold text-[#111111] tabular-nums">{architecture.files}</div>
            <div className="text-[11.5px] font-medium text-[#525252]">Indexed AST nodes</div>
          </div>

          <div className="p-4 rounded-[14px] bg-white border-2 border-[#111111] shadow-hard-sm space-y-1">
            <div className="text-metadata text-[10.5px]">ROUTES</div>
            <div className="mono text-[24px] font-extrabold text-[#111111] tabular-nums">{architecture.routes}</div>
            <div className="text-[11.5px] font-medium text-[#525252]">HTTP endpoints</div>
          </div>

          <div className="p-4 rounded-[14px] bg-white border-2 border-[#111111] shadow-hard-sm space-y-1">
            <div className="text-metadata text-[10.5px]">INPUTS</div>
            <div className="mono text-[24px] font-extrabold text-[#111111] tabular-nums">{architecture.inputs}</div>
            <div className="text-[11.5px] font-medium text-[#525252]">User entry points</div>
          </div>

          <div className="p-4 rounded-[14px] bg-white border-2 border-[#111111] shadow-hard-sm space-y-1">
            <div className="text-metadata text-[10.5px]">SINKS</div>
            <div className="mono text-[24px] font-extrabold text-[#111111] tabular-nums">{architecture.sinks}</div>
            <div className="text-[11.5px] font-medium text-[#525252]">Dangerous operations</div>
          </div>

          <div className="p-4 rounded-[14px] bg-white border-2 border-[#111111] shadow-hard-sm space-y-1">
            <div className="text-metadata text-[10.5px]">FLOWS</div>
            <div className="mono text-[24px] font-extrabold text-[#111111] tabular-nums">{architecture.flows.length}</div>
            <div className="text-[11.5px] font-medium text-[#525252]">Traced data pathways</div>
          </div>

          <div className="p-4 rounded-[14px] bg-white border-2 border-[#111111] shadow-hard-sm space-y-1">
            <div className="text-metadata text-[10.5px]">SECRETS</div>
            <div className={`mono text-[24px] font-extrabold tabular-nums ${architecture.secrets > 0 ? 'text-[#DC2626]' : 'text-[#111111]'}`}>
              {architecture.secrets}
            </div>
            <div className="text-[11.5px] font-bold text-[#111111]">{architecture.secrets > 0 ? 'Exposures found' : 'Clean baseline'}</div>
          </div>
        </div>
      </div>

      {/* ── 2. RELATIONSHIP FLOW PIPELINE & INVESTIGATION SURFACE ────────── */}
      <div className="panel space-y-5 p-5 lg:p-6">
        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-[#111111]/15 pb-4">
          <div className="space-y-1">
            <div className="text-metadata">DATA FLOW PIPELINE & RELATIONSHIPS</div>
            <h4 className="font-extrabold text-[16px] text-[#111111]">
              Input → Route → Processing → Sink → Finding
            </h4>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('flow')}
              className={`btn btn-xs text-[11.5px] ${activeTab === 'flow' ? 'btn-accent' : 'btn-secondary'}`}
            >
              Pipeline Visualizer
            </button>
            <button
              onClick={() => setActiveTab('routes')}
              className={`btn btn-xs text-[11.5px] ${activeTab === 'routes' ? 'btn-accent' : 'btn-secondary'}`}
            >
              Grouped Routes ({architecture.routes})
            </button>
          </div>
        </div>

        {activeTab === 'flow' ? (
          /* Visual Relationship Pipeline */
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-center">
              {/* Step 1: Input */}
              <div className="p-4 rounded-[14px] bg-[#F7F5F0] border-2 border-[#111111] space-y-1.5 text-center">
                <span className="mono text-[10px] font-bold text-[#111111] bg-white px-2.5 py-0.5 rounded-full border-[1.5px] border-[#111111]">01. INPUT</span>
                <div className="font-extrabold text-[14px] text-[#111111] pt-1">HTTP Request</div>
                <div className="mono text-[11px] text-[#525252]">JSON Payload / Query</div>
              </div>

              <div className="hidden sm:flex items-center justify-center">
                <ArrowRight className="w-5 h-5 stroke-[2] text-[#111111]" />
              </div>

              {/* Step 2: Route */}
              <div className="p-4 rounded-[14px] bg-[#F7F5F0] border-2 border-[#111111] space-y-1.5 text-center">
                <span className="mono text-[10px] font-bold text-[#111111] bg-white px-2.5 py-0.5 rounded-full border-[1.5px] border-[#111111]">02. ROUTE</span>
                <div className="font-extrabold text-[14px] text-[#111111] pt-1">API Controller</div>
                <div className="mono text-[11px] text-[#525252]">Router Decorator</div>
              </div>

              <div className="hidden sm:flex items-center justify-center">
                <ArrowRight className="w-5 h-5 stroke-[2] text-[#111111]" />
              </div>

              {/* Step 3: Processing */}
              <div className="p-4 rounded-[14px] bg-[#F7F5F0] border-2 border-[#111111] space-y-1.5 text-center">
                <span className="mono text-[10px] font-bold text-[#111111] bg-white px-2.5 py-0.5 rounded-full border-[1.5px] border-[#111111]">03. PROCESSING</span>
                <div className="font-extrabold text-[14px] text-[#111111] pt-1">AST Call Graph</div>
                <div className="mono text-[11px] text-[#525252]">Business Logic</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-center pt-2">
              {/* Step 4: Sink */}
              <div className="p-4 rounded-[14px] bg-[#F7F5F0] border-2 border-[#111111] space-y-1.5 text-center sm:col-start-2">
                <span className="mono text-[10px] font-bold text-[#111111] bg-[#C8F31D] px-2.5 py-0.5 rounded-full border-[1.5px] border-[#111111]">04. SINK</span>
                <div className="font-extrabold text-[14px] text-[#111111] pt-1">Database / Shell Execution</div>
                <div className="mono text-[11px] text-[#525252]">Raw Query Sinks</div>
              </div>

              <div className="hidden sm:flex items-center justify-center">
                <ArrowRight className="w-5 h-5 stroke-[2] text-[#111111]" />
              </div>

              {/* Step 5: Finding */}
              <div className="p-4 rounded-[14px] bg-[#FEE2E2] border-2 border-[#111111] space-y-1.5 text-center">
                <span className="mono text-[10px] font-bold text-[#DC2626] bg-white px-2.5 py-0.5 rounded-full border-[1.5px] border-[#DC2626]">05. FINDING</span>
                <div className="font-extrabold text-[14px] text-[#DC2626] pt-1">Vulnerability Proved</div>
                <div className="mono text-[11px] text-[#DC2626] font-bold">SQL Injection (CWE-89)</div>
              </div>
            </div>
          </div>
        ) : (
          /* Grouped HTTP Routes Surface */
          <div className="space-y-4">
            {Object.entries(routeGroups).map(([groupName, routes]) => {
              if (routes.length === 0) return null;
              const isOpen = Boolean(expandedFiles[groupName]);

              return (
                <div key={groupName} className="rounded-[14px] bg-[#F7F5F0] border-2 border-[#111111] overflow-hidden">
                  <div
                    onClick={() => toggleGroup(groupName)}
                    className="p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-black/5 transition-all select-none min-h-[44px]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {groupName === 'Health' ? (
                        <Server className="w-4 h-4 stroke-[2] text-[#111111] shrink-0" />
                      ) : groupName.includes('Database') ? (
                        <Database className="w-4 h-4 stroke-[2] text-[#111111] shrink-0" />
                      ) : (
                        <FileCode className="w-4 h-4 stroke-[2] text-[#111111] shrink-0" />
                      )}
                      <span className="font-extrabold text-[14px] text-[#111111] truncate">
                        {groupName} ({routes.length})
                      </span>
                    </div>

                    <div className="mono text-[11px] font-bold text-[#111111] bg-white px-3 py-1 rounded-[8px] border-2 border-[#111111] flex items-center gap-1.5 shrink-0">
                      <span>{isOpen ? 'Collapse' : 'Expand'}</span>
                      <ChevronDown className={`w-3.5 h-3.5 stroke-[2] transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </div>

                  {isOpen && (
                    <div className="p-4 border-t-2 border-[#111111] space-y-2 bg-white font-mono text-[12.5px]">
                      {routes.map((r, i) => (
                        <div
                          key={i}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-[10px] bg-[#F7F5F0] border border-[#111111]/20 hover:border-[#111111] transition-all"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="mono text-[11px] font-extrabold text-white bg-[#111111] px-2 py-0.5 rounded">
                              {r.method}
                            </span>
                            <span className="font-extrabold text-[#111111]">{r.endpoint}</span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-[#525252] flex-wrap">
                            <span>Handler: <strong className="text-[#111111]">{r.handler}</strong></span>
                            <span>•</span>
                            <span>{r.file_path}:{r.line_number}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

export default AttackMapModule;
