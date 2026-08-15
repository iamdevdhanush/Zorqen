import { memo, useDeferredValue, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Search, SlidersHorizontal, X } from 'lucide-react';
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
      className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 hover:bg-[#FAFAFA] transition-colors cursor-pointer group"
    >
      <div className="space-y-2 flex-1 min-w-0">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <SevBadge sev={finding.severity} />
          <h3 className="text-base sm:text-lg font-extrabold text-[#111111] tracking-tight group-hover:text-blue-700 transition-colors break-words">
            {finding.title}
          </h3>
          <span className="chip mono font-bold text-[9.5px] sm:text-[10.5px]">{finding.cwe_id}</span>
          <span className="mono text-[10.5px] sm:text-[11.5px] text-[#111111] bg-[#FAFAFA] px-2 py-0.5 rounded border border-[#111111] font-bold">
            {finding.confidence_pct}% confidence
          </span>
        </div>

        <p className="text-[12.5px] sm:text-[13px] text-[#333333] font-medium leading-relaxed sm:truncate max-w-[760px] break-words">
          {finding.root_cause}
        </p>

        <div className="mono text-[10.5px] sm:text-[11.5px] text-[#333333] flex items-center gap-2 pt-0.5 font-semibold flex-wrap break-all">
          <span className="font-extrabold text-[#111111]">{finding.file_path}:{finding.line_number}</span>
          {finding.endpoint && (
            <>
              <span>•</span>
              <span className="break-all">{finding.endpoint}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <ValidationBadge v={finding.validation} />
          <StatusBadge s={finding.status} />
        </div>
        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-[#111111] group-hover:translate-x-1 transition-all ml-1 shrink-0" />
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
    <div className="max-w-[1140px] mx-auto space-y-6 sm:space-y-8 fade-in py-2">
      
      {/* Editorial Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-4 sm:pb-6 border-b border-[#111111]">
        <div className="space-y-1">
          <div className="protocol-tag">raksha://findings/all</div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#111111] tracking-tighter">
            SECURITY FINDINGS
          </h1>
          <p className="text-[12.5px] sm:text-[13.5px] text-[#555555] font-medium">
            {findings.length} findings across the assessed repository snapshot.
          </p>
        </div>

        {/* Severity Summary Counter Pills */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <button
            onClick={() => setSevFilter(sevFilter === 'critical' ? 'all' : 'critical')}
            className={`chip font-bold py-1 px-2.5 sm:py-1.5 sm:px-3 text-[10px] sm:text-[10.5px] border border-[#111111] shadow-hard-sm cursor-pointer ${sevFilter === 'critical' ? 'sev-critical' : ''}`}
          >
            CRITICAL {counts.critical}
          </button>
          <button
            onClick={() => setSevFilter(sevFilter === 'high' ? 'all' : 'high')}
            className={`chip font-bold py-1 px-2.5 sm:py-1.5 sm:px-3 text-[10px] sm:text-[10.5px] border border-[#111111] shadow-hard-sm cursor-pointer ${sevFilter === 'high' ? 'sev-high' : ''}`}
          >
            HIGH {counts.high}
          </button>
          <button
            onClick={() => setSevFilter(sevFilter === 'medium' ? 'all' : 'medium')}
            className={`chip font-bold py-1 px-2.5 sm:py-1.5 sm:px-3 text-[10px] sm:text-[10.5px] border border-[#111111] shadow-hard-sm cursor-pointer ${sevFilter === 'medium' ? 'sev-medium' : ''}`}
          >
            MEDIUM {counts.medium}
          </button>
          <button
            onClick={() => setSevFilter(sevFilter === 'low' ? 'all' : 'low')}
            className={`chip font-bold py-1 px-2.5 sm:py-1.5 sm:px-3 text-[10px] sm:text-[10.5px] border border-[#111111] shadow-hard-sm cursor-pointer ${sevFilter === 'low' ? 'sev-low' : ''}`}
          >
            LOW {counts.low}
          </button>
        </div>
      </div>

      {/* Single Search Input + Compact Filter Control */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-[#666666]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search findings by title, path, CWE or endpoint…"
            className="input input-search w-full bg-white text-[13px] font-medium"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3.5 top-3.5 text-[#666666]">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <SlidersHorizontal className="w-4 h-4 text-[#111111] shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="select bg-white text-[12.5px] py-2.5 font-semibold w-full sm:w-auto"
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

      {/* Findings Clean Editorial List */}
      <div className="bg-white rounded-xl border border-[#111111] divide-y divide-[#111111] shadow-hard">
        {filteredFindings.length === 0 ? (
          <div className="p-8 sm:p-12 text-center text-[#666666] mono text-[13px]">
            No findings match the current filter criteria.
          </div>
        ) : (
          filteredFindings.map((f: Finding) => (
            <FindingRow key={f.id} finding={f} onClick={handleRowClick} />
          ))
        )}
      </div>

      <div className="mono text-[11.5px] font-bold text-[#666666] text-left sm:text-right">
        Showing {filteredFindings.length} of {findings.length} findings • {currentAssessment?.id}
      </div>

    </div>
  );
}