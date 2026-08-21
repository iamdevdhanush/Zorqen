import { memo, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Clock, GitBranch, Play, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import GithubIcon from '../components/GithubIcon';
import EmptyStateView from '../components/EmptyStateView';
import { useWorkspaceData, useWorkspaceUI } from '../store/WorkspaceContext';
import type { RepoMeta } from '../lib/types';

const RepositoryCard = memo(function RepositoryCard({
  r,
  isLoaded,
  onAssess,
  onRunScan,
}: {
  r: RepoMeta;
  isLoaded: boolean;
  onAssess: (r: RepoMeta) => void;
  onRunScan: (r: RepoMeta) => void;
}) {
  const score = r.latestScore ?? 92;
  const findingsCount = r.latestFindingsCount ?? 2;
  const riskBand = score >= 85 ? 'LOW RISK' : score >= 70 ? 'MODERATE RISK' : 'HIGH RISK';

  return (
    <div
      onClick={() => onAssess(r)}
      className="p-4 rounded-[14px] bg-white border-2 border-[#111111]/20 hover:border-[#111111] flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-[#FAFAFA] transition-all duration-120 hover:-translate-y-0.5 group min-h-[52px] shadow-hard-sm"
    >
      {/* Left: Monochrome GitHub Icon & Compact Details */}
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-10 h-10 rounded-[10px] bg-[#FAFAFA] border-2 border-[#111111]/20 text-[#0A0A0A] group-hover:bg-[#111111] group-hover:text-[#C8FF2E] transition-colors flex items-center justify-center shrink-0 shadow-hard-sm">
          <GithubIcon className="w-5 h-5 text-current" />
        </div>

        <div className="space-y-0.5 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="mono text-[15px] font-extrabold text-[#0A0A0A] truncate group-hover:text-black">
              {r.owner}/{r.name}
            </span>
            <span className="chip font-bold text-[10px] bg-[#FAFAFA] uppercase">
              {r.language || 'Python'}
            </span>
            {isLoaded && (
              <span className="chip ok font-bold text-[10px]">
                ACTIVE TARGET
              </span>
            )}
          </div>

          <div className="mono text-[11.5px] text-[#5E5E5E] flex items-center gap-2 font-semibold flex-wrap tabular-nums">
            <span className="flex items-center gap-1 text-[#0A0A0A]">
              <GitBranch className="w-3.5 h-3.5 text-[#5E5E5E]" />
              <strong>{r.defaultBranch || 'main'}</strong>
            </span>
            <span>•</span>
            <span>commit: <strong>{r.commit ? r.commit.slice(0, 7) : 'HEAD'}</strong></span>
          </div>
        </div>
      </div>

      {/* Right: Security Posture Metrics & Quick Action Cue */}
      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#111111]/10">
        <div className="text-left sm:text-right leading-tight">
          <div className="flex items-center gap-1.5 sm:justify-end">
            <span className={`chip uppercase font-bold text-[9.5px] ${riskBand === 'HIGH RISK' ? 'sev-critical' : riskBand === 'MODERATE RISK' ? 'sev-high' : 'ok'}`}>
              {riskBand}
            </span>
            <span className="hidden group-hover:inline-flex items-center gap-1 mono text-[10.5px] font-semibold text-[#5E5E5E]">
              <Clock className="w-3 h-3 text-[#5E5E5E]" />
              2m ago
            </span>
          </div>

          <div className="pt-0.5">
            <span className="mono text-[15px] font-extrabold text-[#0A0A0A] tabular-nums">{score}</span>
            <span className="mono text-[11px] font-bold text-[#5E5E5E] tabular-nums">/100</span>
            <div className="mono text-[10.5px] text-[#5E5E5E] font-medium tabular-nums">{findingsCount} findings</div>
          </div>
        </div>

        {/* Hover Quick Action */}
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRunScan(r);
            }}
            className="hidden group-hover:flex btn btn-accent btn-xs text-[11px] font-extrabold min-h-[36px] px-3 shadow-hard-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Run Scan</span>
          </button>

          <div className="flex items-center justify-center w-[40px] h-[40px] min-w-[40px] min-h-[40px] rounded-[10px] bg-[#FAFAFA] border border-[#111111]/20 text-[#0A0A0A] group-hover:bg-[#C8FF2E] group-hover:border-[#111111] transition-all shrink-0">
            <ArrowRight className="w-5 h-5 text-[#0A0A0A] group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
});

export default function RepositoriesPage() {
  const { setGithubModalOpen } = useWorkspaceUI();
  const { githubConnected, user, repos, reposLoading, reposError, refreshRepos, loadRepo, currentRepo, startAssessment, authReady } = useWorkspaceData();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);

  useEffect(() => {
    if (authReady && githubConnected) refreshRepos();
  }, [authReady, githubConnected, refreshRepos]);

  const filteredRepos = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    if (!q) return repos;
    return repos.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q) ||
        r.language.toLowerCase().includes(q)
    );
  }, [repos, deferredSearch]);

  const handleAssess = useMemo(() => (r: RepoMeta) => {
    loadRepo(r);
    navigate(`/repos/${r.id}`);
  }, [loadRepo, navigate]);

  const handleRunScan = useMemo(() => (r: RepoMeta) => {
    loadRepo(r);
    startAssessment();
    navigate('/assessments');
  }, [loadRepo, startAssessment, navigate]);

  return (
    <div className="max-w-[1440px] mx-auto space-y-8 fade-in">
      
      {/* Header Aligned to 1440px Grid */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b-2 border-[#111111]">
        <div className="space-y-1">
          <div className="protocol-tag">zorqen://workspace/repositories</div>
          <h1 className="text-section text-[32px] sm:text-[40px]">
            Repositories Intelligence
          </h1>
          <p className="text-body text-[14.5px] text-[#5E5E5E]">
            <strong className="text-[#0A0A0A] tabular-nums">{repos.length}</strong> connected · Synced live
          </p>
        </div>

        <button
          onClick={() => refreshRepos()}
          className="btn h-[48px] px-5 text-[13.5px] font-extrabold gap-2 bg-white border-2 border-[#111111] shadow-hard-sm"
        >
          <RefreshCw className="w-4 h-4 text-[#0A0A0A]" />
          <span>Sync</span>
        </button>
      </div>

      {/* Compact Status Bar */}
      <div className="py-3 px-4 rounded-[12px] bg-white border-2 border-[#111111]/20 flex items-center justify-between gap-4 text-[13.5px] font-semibold text-[#333333] flex-wrap shadow-hard-sm">
        <div className="flex items-center gap-2.5 flex-wrap">
          <GithubIcon className="w-4 h-4 text-[#111111]" />
          <span className="mono text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-[#5E5E5E]">GitHub</span>
          <span>•</span>
          {githubConnected ? (
            <span>Connected <strong className="text-[#0A0A0A]">@{user?.github_login || 'iamdevdhanush'}</strong></span>
          ) : (
            <span>Not connected</span>
          )}
          <span>•</span>
          <span className="mono text-[11px] text-[#5E5E5E]">Read-only access</span>
        </div>

        <button
          onClick={() => setGithubModalOpen(true)}
          className="font-extrabold text-[#0A0A0A] hover:underline inline-flex items-center gap-1.5 text-[13.5px] min-h-[44px] py-1"
        >
          <span>Sync account</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-4 top-4 text-[#5E5E5E]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search repositories by name or language…"
          className="w-full h-[48px] min-h-[44px] pl-11 pr-4 bg-white border-2 border-[#111111]/20 focus:border-[#111111] rounded-[12px] text-[14.5px] font-semibold outline-none transition-colors shadow-hard-sm"
        />
      </div>

      {/* Authorized Repositories List */}
      <div className="space-y-4">
        <div className="text-caption">
          AUTHORIZED REPOSITORIES ({githubConnected && reposLoading && filteredRepos.length === 0 ? '…' : filteredRepos.length})
        </div>

        {!githubConnected ? (
          <EmptyStateView
            type="auth"
            title="GitHub account required."
            subtitle="Connect your GitHub account to authorize and list repositories for security validation."
            onAction={() => setGithubModalOpen(true)}
            actionLabel="Connect GitHub"
          />
        ) : reposError ? (
          <EmptyStateView
            type="temporary"
            title="Could not load repositories."
            subtitle={reposError}
            onAction={() => refreshRepos()}
            actionLabel="Retry Sync"
          />
        ) : reposLoading && filteredRepos.length === 0 ? (
          <div className="p-8 text-center text-[#5E5E5E] mono text-[13px] bg-white border-2 border-[#111111] rounded-[16px] shadow-hard-sm">
            Syncing repositories from GitHub…
          </div>
        ) : filteredRepos.length === 0 ? (
          <div className="p-8 text-center text-[#5E5E5E] mono text-[13px] bg-white border-2 border-[#111111] rounded-[16px] shadow-hard-sm">
            {searchQuery ? `No repositories match "${searchQuery}"` : 'No repositories found.'}
          </div>
        ) : (
          filteredRepos.map((r) => (
            <RepositoryCard
              key={r.id}
              r={r}
              isLoaded={currentRepo?.id === r.id}
              onAssess={handleAssess}
              onRunScan={handleRunScan}
            />
          ))
        )}
      </div>

      <div className="flex items-center gap-2 text-[13px] text-[#5E5E5E] pt-2 font-medium">
        <ShieldCheck className="w-4 h-4 text-[#0A0A0A] shrink-0" />
        ZORQEN performs read-only posture validation and creates review branches upon request.
      </div>
    </div>
  );
}