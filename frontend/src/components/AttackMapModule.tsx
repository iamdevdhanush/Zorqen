import { memo, useState } from 'react';
import { ChevronDown, FolderTree, Network, Server } from 'lucide-react';
import type { AssessmentArchitecture } from '../lib/types';

interface AttackMapModuleProps {
  architecture?: AssessmentArchitecture;
}

export const AttackMapModule = memo(function AttackMapModule({
  architecture,
}: AttackMapModuleProps) {
  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({
    'backend/main.py': true, // Default first file expanded
  });
  const [healthExpanded, setHealthExpanded] = useState(false);

  if (!architecture) {
    return (
      <div className="p-8 text-center text-[#5E5E5E] mono text-[13px] bg-white border-2 border-[#111111] rounded-[16px] shadow-hard-sm">
        Run an assessment to analyze routes, inputs, sinks, and secrets for this repository.
      </div>
    );
  }

  // Separate health routes from main domain routes for intelligent grouping
  const allRoutes = architecture.topRoutes ?? [];
  const healthRoutes = allRoutes.filter((r) => r.endpoint.toLowerCase().includes('health'));
  const domainRoutes = allRoutes.filter((r) => !r.endpoint.toLowerCase().includes('health'));

  // Group domain routes by file_path
  const routesByFile = domainRoutes.reduce<Record<string, typeof allRoutes>>((acc, r) => {
    const file = r.file_path || 'backend/main.py';
    if (!acc[file]) acc[file] = [];
    acc[file].push(r);
    return acc;
  }, {});

  const toggleFile = (filePath: string) => {
    setExpandedFiles((prev) => ({ ...prev, [filePath]: !prev[filePath] }));
  };

  return (
    <div className="space-y-5">
      {/* ── 1. ATTACK SURFACE TOP SUMMARY BAR ─────────────────────────────── */}
      <div className="p-4 sm:p-5 rounded-[16px] bg-white border-2 border-[#111111] shadow-hard-sm space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b-2 border-[#111111]/15 pb-3">
          <div className="flex items-center gap-2.5">
            <FolderTree className="w-5 h-5 text-[#111111]" />
            <h3 className="mono text-[12px] sm:text-[13px] font-extrabold text-[#0A0A0A] uppercase tracking-[0.14em]">
              ATTACK SURFACE SUMMARY
            </h3>
          </div>
          <span className="mono text-[10px] font-bold text-[#111111] bg-[#C8FF2E] px-2.5 py-0.5 rounded border border-[#111111]">
            AI-REASONED
          </span>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 text-center">
          <div className="p-2.5 rounded-[10px] bg-[#FAFAFA] border border-[#111111]/15">
            <div className="mono text-[18px] font-extrabold text-[#0A0A0A]">{architecture.files}</div>
            <div className="mono text-[10px] font-bold text-[#6B6B6B] uppercase tracking-wider">Files</div>
          </div>
          <div className="p-2.5 rounded-[10px] bg-[#FAFAFA] border border-[#111111]/15">
            <div className="mono text-[18px] font-extrabold text-[#0A0A0A]">{architecture.routes}</div>
            <div className="mono text-[10px] font-bold text-[#6B6B6B] uppercase tracking-wider">Routes</div>
          </div>
          <div className="p-2.5 rounded-[10px] bg-[#FAFAFA] border border-[#111111]/15">
            <div className="mono text-[18px] font-extrabold text-[#0A0A0A]">{architecture.inputs}</div>
            <div className="mono text-[10px] font-bold text-[#6B6B6B] uppercase tracking-wider">Inputs</div>
          </div>
          <div className="p-2.5 rounded-[10px] bg-[#FAFAFA] border border-[#111111]/15">
            <div className="mono text-[18px] font-extrabold text-[#0A0A0A]">{architecture.sinks}</div>
            <div className="mono text-[10px] font-bold text-[#6B6B6B] uppercase tracking-wider">Sinks</div>
          </div>
          <div className="p-2.5 rounded-[10px] bg-[#FAFAFA] border border-[#111111]/15">
            <div className="mono text-[18px] font-extrabold text-[#0A0A0A]">{architecture.flows.length}</div>
            <div className="mono text-[10px] font-bold text-[#6B6B6B] uppercase tracking-wider">Flows</div>
          </div>
          <div className="p-2.5 rounded-[10px] bg-[#FAFAFA] border border-[#111111]/15">
            <div className={`mono text-[18px] font-extrabold ${architecture.secrets > 0 ? 'text-[#DC2626]' : 'text-[#0A0A0A]'}`}>
              {architecture.secrets}
            </div>
            <div className="mono text-[10px] font-bold text-[#6B6B6B] uppercase tracking-wider">Secrets</div>
          </div>
        </div>
      </div>

      {/* ── 2. PROGRESSIVE DISCLOSURE ROUTE VISUALIZATION ─────────────────── */}
      <div className="p-5 rounded-[16px] bg-white border-2 border-[#111111] shadow-hard-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-[#111111]" />
            <h3 className="text-[16px] font-extrabold text-[#0A0A0A]">
              HTTP Routes ({architecture.routes})
            </h3>
          </div>
          <span className="mono text-[11px] font-bold text-[#5E5E5E]">Grouped by controller</span>
        </div>

        {/* Health Endpoints Collapsible Cluster */}
        {healthRoutes.length > 0 && (
          <div className="rounded-[12px] bg-[#FAFAFA] border border-[#111111]/20 overflow-hidden">
            <div
              onClick={() => setHealthExpanded((h) => !h)}
              className="p-3 sm:p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-black/5 transition-all select-none"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Server className="w-4 h-4 text-[#5E5E5E] shrink-0" />
                <span className="mono text-[12.5px] font-extrabold text-[#0A0A0A]">
                  Health & Diagnostic Endpoints ({healthRoutes.length})
                </span>
              </div>
              <div className="mono text-[11px] font-bold text-[#111111] bg-white px-2.5 py-1 rounded border border-[#111111] flex items-center gap-1 shrink-0">
                <span>{healthExpanded ? 'Collapse' : 'Expand'}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${healthExpanded ? 'rotate-180' : ''}`} />
              </div>
            </div>

            {healthExpanded && (
              <div className="p-3 border-t border-[#111111]/15 space-y-2 bg-white font-mono text-[12px]">
                {healthRoutes.map((r, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded bg-[#FAFAFA] border border-[#111111]/10">
                    <span className="font-bold text-[#0A0A0A]">
                      <span className="text-[#C2410C] mr-2">{r.method}</span>{r.endpoint}
                    </span>
                    <span className="text-[#6B6B6B] text-[11px]">{r.file_path}:{r.line_number}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* File Grouped Route Accordions */}
        <div className="space-y-3">
          {Object.keys(routesByFile).length === 0 ? (
            <div className="text-[13px] text-[#5E5E5E] mono">No domain routes mapped.</div>
          ) : (
            Object.entries(routesByFile).map(([filePath, routes]) => {
              const isOpen = Boolean(expandedFiles[filePath]);

              return (
                <div key={filePath} className="rounded-[12px] bg-[#FAFAFA] border border-[#111111]/20 overflow-hidden">
                  {/* File Header Row */}
                  <div
                    onClick={() => toggleFile(filePath)}
                    className="p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-black/5 transition-all select-none min-h-[44px]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="mono text-[13px] font-extrabold text-[#0A0A0A] truncate">
                        {filePath}
                      </span>
                      <span className="chip font-bold text-[10px] bg-white border border-[#111111]/20">
                        {routes.length} route{routes.length === 1 ? '' : 's'}
                      </span>
                    </div>

                    <div className="mono text-[11px] font-bold text-[#0A0A0A] bg-white px-2.5 py-1 rounded border border-[#111111] flex items-center gap-1 shrink-0">
                      <span>{isOpen ? 'Hide Routes' : 'View Routes →'}</span>
                    </div>
                  </div>

                  {/* Expanded Route Items */}
                  {isOpen && (
                    <div className="p-3 border-t border-[#111111]/15 space-y-2 bg-white font-mono text-[12.5px]">
                      {routes.map((r, i) => (
                        <div
                          key={i}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-[8px] bg-[#FAFAFA] border border-[#111111]/10 hover:border-[#111111] transition-all"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="mono text-[11px] font-extrabold text-white bg-[#111111] px-2 py-0.5 rounded">
                              {r.method}
                            </span>
                            <span className="font-extrabold text-[#0A0A0A]">{r.endpoint}</span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-[#6B6B6B] flex-wrap">
                            <span>Handler: <strong className="text-[#0A0A0A]">{r.handler}</strong></span>
                            <span>•</span>
                            <span>Line {r.line_number}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
});

export default AttackMapModule;
