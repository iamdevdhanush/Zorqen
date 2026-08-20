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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-4 top-3.5 text-[#5E5E5E]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search findings by title, path, CWE or endpoint…"
            className="input input-search w-full bg-white text-[14px] font-medium"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-4 top-3.5 text-[#5E5E5E]">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <SlidersHorizontal className="w-4 h-4 text-[#0A0A0A] shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="select bg-white text-[13px] font-bold w-full sm:w-auto"
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

      {/* Findings List or Intentional Empty State */}
      <div className="bg-white rounded-[18px] border-2 border-[#111111] divide-y-2 divide-[#111111] shadow-hard overflow-hidden">
        {filteredFindings.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#C8FF2E] border-2 border-[#111111] flex items-center justify-center mx-auto shadow-hard-sm">
              <CheckCircle2 className="w-6 h-6 text-[#111111]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-[18px] font-extrabold text-[#0A0A0A]">
                No security findings detected.
              </h3>
              <p className="mono text-[12px] font-bold text-[#5E5E5E]">
                Static analysis completed successfully.
              </p>
            </div>
            <button
              onClick={() => navigate('/assessments')}
              className="btn btn-accent px-5 h-[40px] text-[13px] inline-flex items-center gap-2"
            >
              <span>Launch Sandbox Probe Validation</span>
              <ArrowRight className="w-4 h-4" />
            </button>
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