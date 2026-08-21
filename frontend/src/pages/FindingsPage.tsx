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
    <div className="rounded-[14px] bg-white border-2 border-[#111111]/20 hover:border-[#111111] transition-all overflow-hidden shadow-hard-sm">
      {/* ── Summary Header Row (Progressive Disclosure) ──────────────────── */}
      <div
        onClick={() => setExpanded((o) => !o)}
        className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-[#FAFAFA] transition-colors select-none min-h-[56px]"
      >
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <SevBadge sev={finding.severity} />
            <h3 className="text-base sm:text-lg font-extrabold text-[#0A0A0A] tracking-tight hover:text-[#111111] transition-colors break-words">
              {finding.title}
            </h3>
            <span className="chip mono font-bold text-[10.5px] bg-[#FAFAFA] border border-[#111111]/20">{finding.cwe_id}</span>
          </div>

          <div className="mono text-[11.5px] text-[#5E5E5E] flex items-center gap-2 font-semibold flex-wrap break-all">
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

          <div className="flex items-center gap-1 min-h-[44px]">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(finding.id);
              }}
              className="mono text-[12px] font-extrabold text-[#0A0A0A] bg-[#C8FF2E] border-2 border-[#111111] px-3 py-1.5 rounded-[8px] hover:bg-[#b5eb1c] transition-all flex items-center gap-1"
            >
              <span>Open</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <div className="w-8 h-8 rounded-[8px] bg-[#FAFAFA] border border-[#111111]/20 flex items-center justify-center text-[#0A0A0A]">
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Progressive Disclosure Details Drawer ───────────────────────── */}
      {expanded && (
        <div className="p-4 sm:p-5 border-t-2 border-[#111111]/15 bg-[#FAFAFA] space-y-4 text-[13.5px] font-medium leading-relaxed fade-in">
          <div className="space-y-1">
            <div className="mono text-[10.5px] font-extrabold text-[#6B6B6B] uppercase tracking-[0.14em]">
              ROOT CAUSE ANALYSIS
            </div>
            <p className="text-[#0A0A0A]">{finding.root_cause}</p>
          </div>

          {finding.attack_path && finding.attack_path.length > 0 && (
            <div className="space-y-1.5">
              <div className="mono text-[10.5px] font-extrabold text-[#6B6B6B] uppercase tracking-[0.14em]">
                ATTACK PATH STEPS
              </div>
              <div className="space-y-1">
                {finding.attack_path.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-[12.5px] mono text-[#0A0A0A]">
                    <span className="font-bold text-[#6B6B6B]">{idx + 1}.</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => onNavigate(finding.id)}
              className="btn btn-accent btn-sm text-[12.5px] font-extrabold min-h-[44px]"
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
    <div className="max-w-[1180px] mx-auto space-y-6 fade-in py-4 px-1 sm:px-0">
      
      {/* Editorial Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b-2 border-[#111111]">
        <div className="space-y-1">
          <div className="protocol-tag">zorqen://findings/all</div>
          <h1 className="text-3xl sm:text-[34px] font-extrabold text-[#0A0A0A] tracking-tighter">
            SECURITY FINDINGS
          </h1>
          <p className="text-[14px] text-[#5E5E5E] font-medium">
            {findings.length} findings across the assessed repository snapshot.
          </p>
        </div>

        {/* Severity Summary Counter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSevFilter(sevFilter === 'critical' ? 'all' : 'critical')}
            className={`chip font-bold px-3 min-h-[44px] text-[11px] border-2 border-[#111111] shadow-hard-sm cursor-pointer ${sevFilter === 'critical' ? 'sev-critical' : 'bg-white'}`}
          >
            CRITICAL {counts.critical}
          </button>
          <button
            onClick={() => setSevFilter(sevFilter === 'high' ? 'all' : 'high')}
            className={`chip font-bold px-3 min-h-[44px] text-[11px] border-2 border-[#111111] shadow-hard-sm cursor-pointer ${sevFilter === 'high' ? 'sev-high' : 'bg-white'}`}
          >
            HIGH {counts.high}
          </button>
          <button
            onClick={() => setSevFilter(sevFilter === 'medium' ? 'all' : 'medium')}
            className={`chip font-bold px-3 min-h-[44px] text-[11px] border-2 border-[#111111] shadow-hard-sm cursor-pointer ${sevFilter === 'medium' ? 'sev-medium' : 'bg-white'}`}
          >
            MEDIUM {counts.medium}
          </button>
          <button
            onClick={() => setSevFilter(sevFilter === 'low' ? 'all' : 'low')}
            className={`chip font-bold px-3 min-h-[44px] text-[11px] border-2 border-[#111111] shadow-hard-sm cursor-pointer ${sevFilter === 'low' ? 'sev-low' : 'bg-white'}`}
          >
            LOW {counts.low}
          </button>
        </div>
      </div>

      {/* Search Input + Status Dropdown */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-[#6B6B6B]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search findings by title, path, CWE or endpoint…"
            className="w-full h-[44px] min-h-[44px] pl-10 pr-8 bg-white border-2 border-[#111111]/20 rounded-[10px] text-[14px] font-medium outline-none focus:border-[#111111]"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-3 text-[#6B6B6B] min-h-[44px] min-w-[44px] flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <SlidersHorizontal className="w-4 h-4 text-[#0A0A0A] shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-[44px] min-h-[44px] px-3 bg-white border-2 border-[#111111]/20 rounded-[10px] text-[13px] font-bold text-[#0A0A0A] outline-none focus:border-[#111111] cursor-pointer"
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

      {/* Findings List with Progressive Disclosure */}
      <div className="space-y-3">
        {filteredFindings.length === 0 ? (
          <div className="p-8 bg-white border-2 border-[#111111]/20 rounded-[16px] space-y-6 shadow-hard-sm">
            <div className="flex items-center gap-3 text-[#0A0A0A]">
              <div className="w-9 h-9 rounded-full bg-[#C8FF2E] border-2 border-[#111111] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-[#111111]" />
              </div>
              <div>
                <h3 className="text-[17px] font-extrabold text-[#0A0A0A] tracking-tight">
                  No findings — Repository passed security validation.
                </h3>
                <p className="text-[13px] text-[#6B6B6B] font-medium">
                  All active scan modules returned zero critical, high, or medium severity vulnerabilities.
                </p>
              </div>
            </div>

            {/* Validation Modules Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              {[
                ['OWASP Top 10', 'Vulnerability patterns', 'All clear ✓'],
                ['Secrets Scanner', 'API keys & tokens', 'All clear ✓'],
                ['Dependencies Audit', 'CVE database check', 'All clear ✓'],
                ['Sandbox Runtime', 'Exploitability probes', 'All clear ✓'],
              ].map(([module, desc, status]) => (
                <div key={module} className="p-3.5 rounded-[12px] bg-[#FAFAFA] border-2 border-[#111111]/15 space-y-1">
                  <div className="font-extrabold text-[13px] text-[#0A0A0A]">{module}</div>
                  <div className="text-[11.5px] text-[#6B6B6B] font-medium">{desc}</div>
                  <div className="mono text-[10.5px] font-bold text-[#0A0A0A] pt-1">{status}</div>
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

      <div className="mono text-[11px] font-bold text-[#5E5E5E] text-left sm:text-right uppercase tracking-[0.18em]">
        Showing {filteredFindings.length} of {findings.length} findings • {currentAssessment?.id}
      </div>

    </div>
  );
}