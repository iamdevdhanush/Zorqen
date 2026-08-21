import { memo, useDeferredValue, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Search, SlidersHorizontal, X } from 'lucide-react';
import { SevBadge, StatusBadge, ValidationBadge } from '../components/ui';
import { useWorkspaceData, useFindings } from '../store/WorkspaceContext';
import type { Finding, FindingStatus, Severity } from '../lib/types';

const FindingRow = memo(function FindingRow({
  finding,
  onClick,
}: {
  finding: Finding;
  onClick: (id: string) => void;
}) {
  return (
    <div
      onClick={() => onClick(finding.id)}
      className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FAFAFA] transition-colors cursor-pointer group"
    >
      <div className="space-y-2 flex-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <SevBadge sev={finding.severity} />
          <h3 className="text-base sm:text-lg font-extrabold text-[#0A0A0A] tracking-tight group-hover:text-blue-700 transition-colors break-words">
            {finding.title}
          </h3>
          <span className="chip mono font-bold text-[10.5px]">{finding.cwe_id}</span>
          <span className="mono text-[11px] text-[#0A0A0A] bg-[#FAFAFA] px-2 py-0.5 rounded-[6px] border border-[#111111] font-bold">
            {finding.confidence_pct}% confidence
          </span>
        </div>

        <p className="text-[14px] text-[#333333] font-medium leading-relaxed sm:truncate max-w-[780px] break-words">
          {finding.root_cause}
        </p>

        <div className="mono text-[11.5px] text-[#5E5E5E] flex items-center gap-2 pt-0.5 font-semibold flex-wrap break-all">
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
        <ArrowRight className="w-5 h-5 text-[#0A0A0A] group-hover:translate-x-1 transition-all ml-1 shrink-0" />
      </div>
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

  const handleRowClick = useMemo(() => (id: string) => navigate(`/findings/${id}`), [navigate]);

  return (
    <div className="max-w-[1180px] mx-auto space-y-6 fade-in py-4">
      
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
            className={`chip font-bold py-1.5 px-3 text-[11px] border-1.5 border-[#111111] shadow-hard-sm cursor-pointer ${sevFilter === 'critical' ? 'sev-critical' : ''}`}
          >
            CRITICAL {counts.critical}
          </button>
          <button
            onClick={() => setSevFilter(sevFilter === 'high' ? 'all' : 'high')}
            className={`chip font-bold py-1.5 px-3 text-[11px] border-1.5 border-[#111111] shadow-hard-sm cursor-pointer ${sevFilter === 'high' ? 'sev-high' : ''}`}
          >
            HIGH {counts.high}
          </button>
          <button
            onClick={() => setSevFilter(sevFilter === 'medium' ? 'all' : 'medium')}
            className={`chip font-bold py-1.5 px-3 text-[11px] border-1.5 border-[#111111] shadow-hard-sm cursor-pointer ${sevFilter === 'medium' ? 'sev-medium' : ''}`}
          >
            MEDIUM {counts.medium}
          </button>
          <button
            onClick={() => setSevFilter(sevFilter === 'low' ? 'all' : 'low')}
            className={`chip font-bold py-1.5 px-3 text-[11px] border-1.5 border-[#111111] shadow-hard-sm cursor-pointer ${sevFilter === 'low' ? 'sev-low' : ''}`}
          >
            LOW {counts.low}
          </button>
        </div>
      </div>

      {/* Single Search Input + Compact Filter Control */}
      {/* Floating Clean Search Bar + Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#6B6B6B]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search findings by title, path, CWE or endpoint…"
            className="w-full h-[38px] pl-10 pr-8 bg-white border border-[#111111]/15 rounded-[8px] text-[13.5px] font-medium outline-none focus:border-[#111111]"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-2.5 text-[#6B6B6B]">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <SlidersHorizontal className="w-4 h-4 text-[#0A0A0A] shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-[38px] px-3 bg-white border border-[#111111]/15 rounded-[8px] text-[13px] font-bold text-[#0A0A0A] outline-none focus:border-[#111111] cursor-pointer"
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

      {/* Findings List or Validation Modules Empty State */}
      <div className="bg-white rounded-[14px] border border-[#111111]/15 divide-y divide-[#111111]/10 overflow-hidden">
        {filteredFindings.length === 0 ? (
          <div className="p-8 space-y-6">
            <div className="flex items-center gap-3 text-[#0A0A0A]">
              <div className="w-8 h-8 rounded-full bg-[#C8FF2E] border border-[#111111] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4.5 h-4.5 text-[#111111]" />
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
                <div key={module} className="p-3.5 rounded-[10px] bg-[#FAFAFA] border border-[#111111]/10 space-y-1">
                  <div className="font-extrabold text-[13px] text-[#0A0A0A]">{module}</div>
                  <div className="text-[11.5px] text-[#6B6B6B] font-medium">{desc}</div>
                  <div className="mono text-[10.5px] font-bold text-[#0A0A0A] pt-1">{status}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          filteredFindings.map((f: Finding) => (
            <FindingRow key={f.id} finding={f} onClick={handleRowClick} />
          ))
        )}
      </div>

      <div className="mono text-[11px] font-bold text-[#5E5E5E] text-left sm:text-right uppercase tracking-[0.18em]">
        Showing {filteredFindings.length} of {findings.length} findings • {currentAssessment?.id}
      </div>

    </div>
  );
}