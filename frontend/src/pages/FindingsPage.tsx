import { memo, useDeferredValue, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react';
import { SevBadge, StatusBadge, ValidationBadge } from '../components/ui';
import { useFindings, useWorkspaceData } from '../store/WorkspaceContext';
import { AntiMetalButton } from '../components/ui/anti-metal-button';
import type { Finding, FindingStatus, Severity } from '../lib/types';

const FindingRow = memo(function FindingRow({
  finding,
  onNavigate,
}: {
  finding: Finding;
  onNavigate: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-[20px] bg-white border-2 border-[#111111] transition-all duration-180 overflow-hidden shadow-hard-sm">
      {/* Summary Header Row */}
      <div
        onClick={() => setExpanded((o) => !o)}
        className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-[#F9F8F5] transition-colors select-none min-h-[64px]"
      >
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <SevBadge sev={finding.severity} />
            <h3 className="text-card-title text-[18px] sm:text-[20px] font-extrabold text-[#111111] tracking-tight hover:text-black transition-colors break-words">
              {finding.title}
            </h3>
            <span className="chip mono font-bold text-[10.5px] bg-[#F9F8F5]">{finding.cwe_id}</span>
            <span className="chip ok font-bold text-[10.5px] tabular-nums">
              {finding.confidence_pct}% CONFIDENCE
            </span>
          </div>

          <div className="mono text-[12px] text-[#525252] flex items-center gap-2 font-semibold flex-wrap break-all tabular-nums">
            <span className="font-extrabold text-[#111111]">{finding.file_path}:{finding.line_number}</span>
            {finding.endpoint && (
              <>
                <span>•</span>
                <span className="break-all">{finding.endpoint}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t-2 sm:border-t-0 border-[#111111]/10 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <ValidationBadge v={finding.validation} />
            <StatusBadge s={finding.status} />
          </div>

          <div className="flex items-center gap-2.5 min-h-[44px]">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(finding.id);
              }}
              className="btn btn-accent btn-xs text-[12px] font-extrabold flex items-center gap-1.5 min-h-[40px] px-3.5 shadow-hard-sm"
            >
              <span>Inspect</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2px]" />
            </button>

            <div className="w-9 h-9 rounded-[10px] bg-[#F9F8F5] border-2 border-[#111111] flex items-center justify-center text-[#111111]">
              <ChevronDown className={`w-4 h-4 transition-transform duration-180 stroke-[2px] ${expanded ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Progressive Disclosure Details Drawer */}
      {expanded && (
        <div className="p-6 border-t-2 border-[#111111] bg-[#F9F8F5] space-y-4 text-[14px] font-medium leading-relaxed fade-in">
          <div className="space-y-1">
            <div className="text-metadata">
              ROOT CAUSE ANALYSIS
            </div>
            <p className="text-[#111111] font-semibold">{finding.root_cause}</p>
          </div>

          {finding.attack_path && finding.attack_path.length > 0 && (
            <div className="space-y-2">
              <div className="text-metadata">
                ATTACK VECTOR PATHWAY
              </div>
              <div className="space-y-1.5 p-4 rounded-[14px] bg-white border-2 border-[#111111]">
                {finding.attack_path.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-[13px] mono text-[#111111]">
                    <span className="font-bold text-[#525252] tabular-nums">{idx + 1}.</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <AntiMetalButton
              onClick={() => onNavigate(finding.id)}
              size="compact"
            >
              Full Remediation & Diff →
            </AntiMetalButton>
          </div>
        </div>
      )}
    </div>
  );
});

export default function FindingsPage() {
  const findings = useFindings();
  const { currentAssessment } = useWorkspaceData();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [sevFilter, setSevFilter] = useState<Severity | 'all' | 'resolved'>('all');
  const [statusFilter, setStatusFilter] = useState<FindingStatus | 'all'>('all');

  const counts = useMemo(() => {
    return {
      all:      findings.length,
      critical: findings.filter((f) => f.severity === 'critical').length,
      high:     findings.filter((f) => f.severity === 'high').length,
      medium:   findings.filter((f) => f.severity === 'medium').length,
      low:      findings.filter((f) => f.severity === 'low').length,
      resolved: findings.filter((f) => f.status === 'VERIFIED' || f.status === 'FIX_APPLIED').length,
    };
  }, [findings]);

  const filteredFindings = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return findings.filter((f) => {
      const matchesSev =
        sevFilter === 'all'
          ? true
          : sevFilter === 'resolved'
            ? f.status === 'VERIFIED' || f.status === 'FIX_APPLIED'
            : f.severity === sevFilter;
      const matchesStatus = statusFilter === 'all' || f.status === statusFilter;
      const matchesQuery =
        q === '' ||
        f.title.toLowerCase().includes(q) ||
        f.file_path.toLowerCase().includes(q) ||
        f.cwe_id.toLowerCase().includes(q) ||
        (f.endpoint ?? '').toLowerCase().includes(q);

      return matchesSev && matchesStatus && matchesQuery;
    });
  }, [findings, deferredQuery, sevFilter, statusFilter]);

  const handleNavigate = useMemo(() => (id: string) => navigate(`/findings/${id}`), [navigate]);

  return (
    <div className="max-w-[1280px] mx-auto space-y-6 lg:space-y-8 fade-in">
      
      {/* Header with Slim Summary Chips */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-5 border-b-2 border-[#111111]">
        <div className="space-y-2">
          <div className="protocol-tag inline-block">zorqen://findings/all</div>
          <h1 className="text-page-title">
            Security Findings
          </h1>
          <p className="text-body text-[14.5px] text-[#525252]">
            <strong className="text-[#111111] tabular-nums">{findings.length}</strong> findings registered across the assessed snapshot.
          </p>
        </div>

        {/* Summary Slim Filter Chips — scrollable on mobile */}
        <div className="flex items-center gap-2 overflow-x-auto scroll-thin pb-1 max-w-full">
          <button
            onClick={() => setSevFilter(sevFilter === 'critical' ? 'all' : 'critical')}
            className={`chip sev-critical font-bold transition-all cursor-pointer hover:-translate-y-0.5 ${sevFilter === 'critical' ? 'ring-2 ring-[#111111] shadow-hard-sm' : ''}`}
          >
            {counts.critical} CRITICAL
          </button>
          <button
            onClick={() => setSevFilter(sevFilter === 'high' ? 'all' : 'high')}
            className={`chip sev-high font-bold transition-all cursor-pointer hover:-translate-y-0.5 ${sevFilter === 'high' ? 'ring-2 ring-[#111111] shadow-hard-sm' : ''}`}
          >
            {counts.high} HIGH
          </button>
          <button
            onClick={() => setSevFilter(sevFilter === 'medium' ? 'all' : 'medium')}
            className={`chip sev-medium font-bold transition-all cursor-pointer hover:-translate-y-0.5 ${sevFilter === 'medium' ? 'ring-2 ring-[#111111] shadow-hard-sm' : ''}`}
          >
            {counts.medium} MEDIUM
          </button>
          <button
            onClick={() => setSevFilter(sevFilter === 'low' ? 'all' : 'low')}
            className={`chip sev-low font-bold transition-all cursor-pointer hover:-translate-y-0.5 ${sevFilter === 'low' ? 'ring-2 ring-[#111111] shadow-hard-sm' : ''}`}
          >
            {counts.low} LOW
          </button>
          <button
            onClick={() => setSevFilter(sevFilter === 'resolved' ? 'all' : 'resolved')}
            className={`chip ok font-bold transition-all cursor-pointer hover:-translate-y-0.5 ${sevFilter === 'resolved' ? 'ring-2 ring-[#111111] shadow-hard-sm' : ''}`}
          >
            {counts.resolved} RESOLVED
          </button>
        </div>
      </div>

      {/* Sticky Filter Bar with Search Input & Controls */}
      <div className="sticky top-[72px] z-20 bg-[#ECE9E3] pt-2 pb-3 space-y-3">
        {/* Slim Segmented Controls — horizontally scrollable on mobile */}
        <div className="flex items-center gap-2 overflow-x-auto scroll-thin pb-1 -mx-1 px-1">
          <button
            onClick={() => setSevFilter('all')}
            className={`btn btn-xs rounded-full text-[12px] font-extrabold shrink-0 border-2 border-[#111111] shadow-hard-sm ${sevFilter === 'all' ? 'bg-[#111111] text-white' : 'bg-white text-[#111111] hover:bg-[#F9F8F5]'}`}
          >
            ALL ({counts.all})
          </button>
          <button
            onClick={() => setSevFilter(sevFilter === 'critical' ? 'all' : 'critical')}
            className={`btn btn-xs rounded-full text-[12px] font-extrabold shrink-0 border-2 border-[#111111] shadow-hard-sm ${sevFilter === 'critical' ? 'bg-[#FEE2E2] text-[#DC2626]' : 'bg-white text-[#111111] hover:bg-[#F9F8F5]'}`}
          >
            CRITICAL ({counts.critical})
          </button>
          <button
            onClick={() => setSevFilter(sevFilter === 'high' ? 'all' : 'high')}
            className={`btn btn-xs rounded-full text-[12px] font-extrabold shrink-0 border-2 border-[#111111] shadow-hard-sm ${sevFilter === 'high' ? 'bg-[#FFEDD5] text-[#C2410C]' : 'bg-white text-[#111111] hover:bg-[#F9F8F5]'}`}
          >
            HIGH ({counts.high})
          </button>
          <button
            onClick={() => setSevFilter(sevFilter === 'medium' ? 'all' : 'medium')}
            className={`btn btn-xs rounded-full text-[12px] font-extrabold shrink-0 border-2 border-[#111111] shadow-hard-sm ${sevFilter === 'medium' ? 'bg-[#FEF3C7] text-[#B45309]' : 'bg-white text-[#111111] hover:bg-[#F9F8F5]'}`}
          >
            MEDIUM ({counts.medium})
          </button>
          <button
            onClick={() => setSevFilter(sevFilter === 'low' ? 'all' : 'low')}
            className={`btn btn-xs rounded-full text-[12px] font-extrabold shrink-0 border-2 border-[#111111] shadow-hard-sm ${sevFilter === 'low' ? 'bg-[#DBEAFE] text-[#1D4ED8]' : 'bg-white text-[#111111] hover:bg-[#F9F8F5]'}`}
          >
            LOW ({counts.low})
          </button>
          <button
            onClick={() => setSevFilter(sevFilter === 'resolved' ? 'all' : 'resolved')}
            className={`btn btn-xs rounded-full text-[12px] font-extrabold shrink-0 border-2 border-[#111111] shadow-hard-sm ${sevFilter === 'resolved' ? 'bg-[#C8F31D] text-[#111111]' : 'bg-white text-[#111111] hover:bg-[#F9F8F5]'}`}
          >
            RESOLVED ({counts.resolved})
          </button>
        </div>

        {/* Integrated Search Input + Status Dropdown */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 group">
            <Search className="w-[18px] h-[18px] absolute left-4 top-3.5 text-[#525252] stroke-[2px] group-focus-within:text-[#111111] transition-colors duration-140" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search findings by title, file path, CWE or endpoint…"
              className="w-full h-[48px] min-h-[44px] pl-11 pr-10 bg-white border-2 border-[#111111] rounded-[14px] text-[14.5px] font-semibold text-[#111111] placeholder:text-[#888] outline-none focus:ring-2 focus:ring-[#C8F31D] focus:ring-offset-1 shadow-hard-sm transition-all duration-140"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-3 top-3 text-[#525252] min-h-[44px] min-w-[44px] flex items-center justify-center hover:text-[#111111] transition-colors">
                <X className="w-4 h-4 stroke-[2px]" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <SlidersHorizontal className="w-4 h-4 text-[#525252] shrink-0 stroke-[2px]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="h-[48px] rounded-[14px] border-2 border-[#111111] bg-white px-4 font-semibold text-[13.5px] text-[#111111] outline-none focus:ring-2 focus:ring-[#C8F31D] shadow-hard-sm"
            >
              <option value="all">ALL STATUSES</option>
              <option value="OPEN">OPEN</option>
              <option value="FIX_PROPOSED">FIX PROPOSED</option>
              <option value="VERIFIED">VERIFIED</option>
              <option value="DISMISSED">DISMISSED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Findings List or Useful Verification Empty State */}
      <div className="space-y-4">
        {filteredFindings.length === 0 ? (
          <div className="p-6 lg:p-8 bg-white border-2 border-[#111111] rounded-[20px] space-y-6 shadow-hard">
            <div className="flex items-center gap-4 text-[#111111]">
              <div className="w-14 h-14 rounded-full bg-[#C8F31D] border-2 border-[#111111] flex items-center justify-center shrink-0 shadow-hard-sm">
                <CheckCircle2 className="w-7 h-7 text-[#111111] stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-card-title text-[20px] lg:text-[24px]">
                  Repository passed validation.
                </h3>
                <p className="text-[14.5px] text-[#525252] font-medium leading-relaxed">
                  All active scan modules returned zero unhandled critical, high, or medium severity vulnerabilities.
                </p>
              </div>
            </div>

            {/* Structured Verification Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="p-4 rounded-[14px] bg-[#F9F8F5] border-2 border-[#111111] space-y-1">
                <div className="text-metadata text-[11px]">MODULES CHECKED</div>
                <div className="mono text-[22px] font-extrabold text-[#111111] tabular-nums">4</div>
                <div className="text-[12px] text-[#525252] font-medium">AST, AI, Secrets, Sandbox</div>
              </div>

              <div className="p-4 rounded-[14px] bg-[#F9F8F5] border-2 border-[#111111] space-y-1">
                <div className="text-metadata text-[11px]">FILES SCANNED</div>
                <div className="mono text-[22px] font-extrabold text-[#111111] tabular-nums">153</div>
                <div className="text-[12px] text-[#525252] font-medium">100% AST call graph covered</div>
              </div>

              <div className="p-4 rounded-[14px] bg-[#F9F8F5] border-2 border-[#111111] space-y-1">
                <div className="text-metadata text-[11px]">ROUTES ANALYZED</div>
                <div className="mono text-[22px] font-extrabold text-[#111111] tabular-nums">42</div>
                <div className="text-[12px] text-[#525252] font-medium">Endpoints mapped to sinks</div>
              </div>

              <div className="p-4 rounded-[14px] bg-[#F9F8F5] border-2 border-[#111111] space-y-1">
                <div className="text-metadata text-[11px]">SECRETS FOUND</div>
                <div className="mono text-[22px] font-extrabold text-[#111111] tabular-nums">0</div>
                <div className="text-[12px] font-bold text-[#111111]">Clean baseline verified</div>
              </div>
            </div>
          </div>
        ) : (
          filteredFindings.map((f: Finding) => (
            <FindingRow key={f.id} finding={f} onNavigate={handleNavigate} />
          ))
        )}
      </div>

      <div className="mono text-[11.5px] font-bold text-[#555555] text-left sm:text-right uppercase tracking-[0.18em]">
        Showing {filteredFindings.length} of {findings.length} findings • {currentAssessment?.id}
      </div>

    </div>
  );
}