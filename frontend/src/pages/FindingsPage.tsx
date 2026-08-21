import { memo, useDeferredValue, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react';
import { SevBadge, StatusBadge, ValidationBadge } from '../components/ui';
import { useWorkspaceData, useFindings } from '../store/WorkspaceContext';
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
    <div className="rounded-[16px] bg-white border-2 border-[#111111]/20 hover:border-[#111111] transition-all duration-120 overflow-hidden shadow-hard-sm">
      {/* Summary Header Row */}
      <div
        onClick={() => setExpanded((o) => !o)}
        className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-[#FAFAFA] transition-colors select-none min-h-[56px]"
      >
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <SevBadge sev={finding.severity} />
            <h3 className="text-card-title text-[18px] sm:text-[20px] font-extrabold text-[#0A0A0A] tracking-tight hover:text-[#111111] transition-colors break-words">
              {finding.title}
            </h3>
            <span className="chip mono font-bold text-[10.5px] bg-[#FAFAFA] border-2 border-[#111111]/20">{finding.cwe_id}</span>
            <span className="mono text-[11px] font-bold text-[#111111] bg-[#C8FF2E] px-2 py-0.5 rounded border border-[#111111] tabular-nums">
              {finding.confidence_pct}% CONFIDENCE
            </span>
          </div>

          <div className="mono text-[12px] text-[#5E5E5E] flex items-center gap-2 font-semibold flex-wrap break-all tabular-nums">
            <span className="font-extrabold text-[#0A0A0A]">{finding.file_path}:{finding.line_number}</span>
            {finding.endpoint && (
              <>
                <span>•</span>
                <span className="break-all">{finding.endpoint}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#111111]/10 shrink-0">
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
              className="btn btn-accent btn-xs text-[12px] font-extrabold flex items-center gap-1.5 min-h-[44px] px-3.5 shadow-hard-sm"
            >
              <span>Inspect</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <div className="w-9 h-9 rounded-[10px] bg-[#FAFAFA] border-2 border-[#111111]/20 flex items-center justify-center text-[#0A0A0A]">
              <ChevronDown className={`w-4 h-4 transition-transform duration-120 ${expanded ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Progressive Disclosure Details Drawer */}
      {expanded && (
        <div className="p-5 border-t-2 border-[#111111]/15 bg-[#FAFAFA] space-y-4 text-[14px] font-medium leading-relaxed fade-in">
          <div className="space-y-1">
            <div className="text-caption text-[10.5px]">
              ROOT CAUSE ANALYSIS
            </div>
            <p className="text-[#0A0A0A] font-semibold">{finding.root_cause}</p>
          </div>

          {finding.attack_path && finding.attack_path.length > 0 && (
            <div className="space-y-2">
              <div className="text-caption text-[10.5px]">
                ATTACK VECTOR PATHWAY
              </div>
              <div className="space-y-1.5 p-3 rounded-[10px] bg-white border border-[#111111]/15">
                {finding.attack_path.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-[13px] mono text-[#0A0A0A]">
                    <span className="font-bold text-[#5E5E5E] tabular-nums">{idx + 1}.</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => onNavigate(finding.id)}
              className="btn btn-accent btn-sm text-[13px] font-extrabold min-h-[44px]"
            >
              Full Remediation & Diff →
            </button>
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
  const [sevFilter, setSevFilter] = useState<Severity | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<FindingStatus | 'all'>('all');

  const counts = useMemo(() => {
    return {
      all:      findings.length,
      critical: findings.filter((f) => f.severity === 'critical').length,
      high:     findings.filter((f) => f.severity === 'high').length,
      medium:   findings.filter((f) => f.severity === 'medium').length,
      low:      findings.filter((f) => f.severity === 'low').length,
    };
  }, [findings]);

  const filteredFindings = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return findings.filter((f) => {
      const matchesSev = sevFilter === 'all' || f.severity === sevFilter;
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
    <div className="max-w-[1440px] mx-auto space-y-6 fade-in">
      
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b-2 border-[#111111]">
        <div className="space-y-1">
          <div className="protocol-tag">zorqen://findings/all</div>
          <h1 className="text-section text-[32px] sm:text-[40px]">
            Security Findings
          </h1>
          <p className="text-body text-[14.5px] text-[#5E5E5E]">
            <strong className="text-[#0A0A0A] tabular-nums">{findings.length}</strong> findings across the assessed repository snapshot.
          </p>
        </div>
      </div>

      {/* Sticky Filter Bar with Segmented Controls & Search Input */}
      <div className="sticky top-[72px] md:top-[76px] z-20 bg-[#ECEBE6] py-3 border-b-2 border-[#111111]/15 space-y-3">
        {/* Segmented Severity Controls */}
        <div className="flex items-center gap-2 overflow-x-auto scroll-thin pb-1">
          <button
            onClick={() => setSevFilter('all')}
            className={`btn btn-xs text-[12px] font-extrabold shrink-0 border-2 border-[#111111] shadow-hard-sm ${sevFilter === 'all' ? 'bg-[#111111] text-white' : 'bg-white text-[#0A0A0A]'}`}
          >
            ALL ({counts.all})
          </button>
          <button
            onClick={() => setSevFilter(sevFilter === 'critical' ? 'all' : 'critical')}
            className={`btn btn-xs text-[12px] font-extrabold shrink-0 border-2 border-[#111111] shadow-hard-sm ${sevFilter === 'critical' ? 'sev-critical' : 'bg-white text-[#0A0A0A]'}`}
          >
            CRITICAL ({counts.critical})
          </button>
          <button
            onClick={() => setSevFilter(sevFilter === 'high' ? 'all' : 'high')}
            className={`btn btn-xs text-[12px] font-extrabold shrink-0 border-2 border-[#111111] shadow-hard-sm ${sevFilter === 'high' ? 'sev-high' : 'bg-white text-[#0A0A0A]'}`}
          >
            HIGH ({counts.high})
          </button>
          <button
            onClick={() => setSevFilter(sevFilter === 'medium' ? 'all' : 'medium')}
            className={`btn btn-xs text-[12px] font-extrabold shrink-0 border-2 border-[#111111] shadow-hard-sm ${sevFilter === 'medium' ? 'sev-medium' : 'bg-white text-[#0A0A0A]'}`}
          >
            MEDIUM ({counts.medium})
          </button>
          <button
            onClick={() => setSevFilter(sevFilter === 'low' ? 'all' : 'low')}
            className={`btn btn-xs text-[12px] font-extrabold shrink-0 border-2 border-[#111111] shadow-hard-sm ${sevFilter === 'low' ? 'sev-low' : 'bg-white text-[#0A0A0A]'}`}
          >
            LOW ({counts.low})
          </button>
        </div>

        {/* Integrated Search Input + Status Dropdown */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-4 top-4 text-[#5E5E5E]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search findings by title, file path, CWE or endpoint…"
              className="w-full h-[48px] min-h-[44px] pl-11 pr-8 bg-white border-2 border-[#111111]/20 rounded-[12px] text-[14.5px] font-semibold outline-none focus:border-[#111111] shadow-hard-sm"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-3 top-3 text-[#5E5E5E] min-h-[44px] min-w-[44px] flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <SlidersHorizontal className="w-4 h-4 text-[#0A0A0A] shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="h-[48px] min-h-[44px] px-4 bg-white border-2 border-[#111111]/20 rounded-[12px] text-[13.5px] font-extrabold text-[#0A0A0A] outline-none focus:border-[#111111] cursor-pointer shadow-hard-sm"
            >
              <option value="all">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="REVIEW">Review</option>
              <option value="FIX_PENDING">Fix Pending</option>
              <option value="FIX_APPLIED">Fix Applied</option>
              <option value="VERIFIED">Verified</option>
              <option value="DISMISSED">Dismissed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Findings List */}
      <div className="space-y-4">
        {filteredFindings.length === 0 ? (
          <div className="p-8 sm:p-10 bg-white border-2 border-[#111111] rounded-[18px] space-y-6 shadow-hard">
            <div className="flex items-center gap-3 text-[#0A0A0A]">
              <div className="w-12 h-12 rounded-full bg-[#C8FF2E] border-2 border-[#111111] flex items-center justify-center shrink-0 shadow-hard-sm">
                <CheckCircle2 className="w-6 h-6 text-[#111111]" />
              </div>
              <div>
                <h3 className="text-card-title text-[20px] sm:text-[24px]">
                  Repository passed security validation.
                </h3>
                <p className="text-[14px] text-[#5E5E5E] font-medium">
                  All active scan modules returned zero critical, high, or medium severity vulnerabilities.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              {[
                ['OWASP Top 10', 'Vulnerability patterns', 'All clear ✓'],
                ['Secrets Scanner', 'API keys & tokens', 'All clear ✓'],
                ['Dependencies Audit', 'CVE database check', 'All clear ✓'],
                ['Sandbox Runtime', 'Exploitability probes', 'All clear ✓'],
              ].map(([module, desc, status]) => (
                <div key={module} className="p-4 rounded-[12px] bg-[#FAFAFA] border-2 border-[#111111]/20 space-y-1">
                  <div className="font-extrabold text-[14px] text-[#0A0A0A]">{module}</div>
                  <div className="text-[12px] text-[#5E5E5E] font-medium">{desc}</div>
                  <div className="mono text-[11px] font-bold text-[#0A0A0A] pt-1">{status}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          filteredFindings.map((f: Finding) => (
            <FindingRow key={f.id} finding={f} onNavigate={handleNavigate} />
          ))
        )}
      </div>

      <div className="mono text-[11.5px] font-bold text-[#5E5E5E] text-left sm:text-right uppercase tracking-[0.18em]">
        Showing {filteredFindings.length} of {findings.length} findings • {currentAssessment?.id}
      </div>

    </div>
  );
}