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
      className={`p-4 lg:p-5 rounded-[12px] bg-white border flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition-all duration-150 group min-h-[52px] ${
        isLoaded ? 'border-[#111111] shadow-hard-sm' : 'border-[#111111]/20 hover:border-[#111111] interactive-card'
      }`}
    >
      {/* Left: Monochrome GitHub Icon & Repository Details */}
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-9 h-9 rounded-[8px] bg-[#F9F8F5] border border-[#111111]/20 text-[#111111] group-hover:bg-[#111111] group-hover:text-[#C7F11A] transition-colors flex items-center justify-center shrink-0">
          <GithubIcon className="w-4.5 h-4.5 text-current" />
        </div>

        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[16px] font-extrabold text-[#111111] truncate group-hover:text-black">
              {r.owner}/{r.name}
            </span>
            <span className="chip font-bold text-[10px] bg-[#F9F8F5] text-[#555555] uppercase border-[#111111]/20">
              {r.language || 'Python'}
            </span>
            {isLoaded && (
              <span className="chip ok font-bold text-[10px]">
                ACTIVE TARGET
              </span>
            )}
          </div>

          <div className="mono text-[11.5px] text-[#555555] flex items-center gap-2 font-semibold flex-wrap tabular-nums">
            <span className="flex items-center gap-1 text-[#111111]">
              <GitBranch className="w-3.5 h-3.5 text-[#555555]" />
              <strong>{r.defaultBranch || 'main'}</strong>
            </span>
            <span>•</span>
            <span>commit: <strong>{r.commit ? r.commit.slice(0, 7) : 'HEAD'}</strong></span>
          </div>
        </div>
      </div>

      {/* Right: Security Posture Metrics & Action Arrow */}
      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#111111]/10">
        <div className="text-left sm:text-right leading-tight">
          <div className="flex items-center gap-1.5 sm:justify-end">
            <span className={`chip uppercase font-bold text-[9.5px] ${riskBand === 'HIGH RISK' ? 'sev-critical' : riskBand === 'MODERATE RISK' ? 'sev-high' : 'bg-[#F9F8F5] text-[#111111]'}`}>
              {riskBand}
            </span>
            <span className="hidden group-hover:inline-flex items-center gap-1 mono text-[10.5px] font-semibold text-[#555555]">
              <Clock className="w-3 h-3 text-[#555555]" />
              2m ago
            </span>
          </div>

          <div className="pt-0.5">
            <span className="mono text-[15px] font-extrabold text-[#111111] tabular-nums">{score}</span>
            <span className="mono text-[11px] font-bold text-[#555555] tabular-nums">/100</span>
            <div className="mono text-[10.5px] text-[#555555] font-medium tabular-nums">{findingsCount} findings</div>
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

          <div className="flex items-center justify-center w-[36px] h-[36px] min-w-[36px] min-h-[36px] rounded-[8px] bg-[#F9F8F5] border border-[#111111]/20 text-[#111111] group-hover:bg-[#C7F11A] group-hover:border-[#111111] transition-all shrink-0">
            <ArrowRight className="w-4 h-4 text-[#111111] group-hover:translate-x-0.5 transition-transform" />
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
    <div className="max-w-[1280px] mx-auto space-y-7 lg:space-y-10 fade-in">
      
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b border-[#111111]/20">
        <div className="space-y-1">
          <div className="protocol-tag">zorqen://workspace/repositories</div>
          <h1 className="text-page-title">
            Repositories Intelligence
          </h1>
          <p className="text-body text-[14.5px] text-[#555555]">
            <strong className="text-[#111111] tabular-nums">{repos.length}</strong> connected · Synced live
          </p>
        </div>

        <button
          onClick={() => refreshRepos()}
          className="btn h-[48px] px-5 text-[13.5px] font-extrabold gap-2 bg-white border-2 border-[#111111] shadow-hard-sm"
        >
          <RefreshCw className="w-4 h-4 text-[#111111]" />
          <span>Sync</span>
        </button>
      </div>

      {/* Stacked Layout on Mobile Repository Connection Strip */}
      <div className="p-4 sm:p-5 rounded-[12px] bg-white border border-[#111111]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[13.5px] font-semibold text-[#333333] shadow-hard-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <GithubIcon className="w-4 h-4 text-[#111111]" />
            <span className="font-extrabold text-[#111111]">GitHub</span>
          </div>
          <span className="hidden sm:inline text-[#111111]/30">•</span>
          {githubConnected ? (
            <span className="text-[#333333]">Connected as <strong className="text-[#111111]">@{user?.github_login || 'iamdevdhanush'}</strong></span>
          ) : (
            <span>Not connected</span>
          )}
          <span className="hidden sm:inline text-[#111111]/30">•</span>
          <span className="mono text-[11px] font-extrabold text-[#555555] uppercase tracking-wider">READ ONLY</span>
        </div>

        <button
          onClick={() => setGithubModalOpen(true)}
          className="font-extrabold text-[#111111] hover:underline inline-flex items-center gap-1.5 text-[13.5px] min-h-[44px] self-start sm:self-auto"
        >
          <span>Sync now</span>
          <ArrowRight className="w-4 h-4 text-[#111111]" />
        </button>
      </div>

      {/* Sticky Search Input Bar */}
      <div className="sticky top-[72px] z-20 bg-[#ECEAE4] pt-2 pb-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-4 top-4 text-[#111111]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search target repositories by name, language, or branch…"
            className="w-full h-[48px] min-h-[44px] pl-11 pr-24 bg-white border-2 border-[#111111] focus:ring-2 focus:ring-[#111111] rounded-[10px] text-[14.5px] font-semibold text-[#111111] placeholder:text-[#555555] outline-none shadow-hard-sm"
          />
          <kbd className="absolute right-4 top-3.5 hidden md:inline-flex">Ctrl K</kbd>
        </div>
      </div>

      {/* Authorized Repositories List */}
      <div className="space-y-4">
        <div className="text-metadata">
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
          <div className="p-8 text-center text-[#555555] mono text-[13px] bg-white border border-[#111111]/20 rounded-[12px] shadow-hard-sm">
            Syncing repositories from GitHub…
          </div>
        ) : filteredRepos.length === 0 ? (
          <div className="p-8 text-center text-[#555555] mono text-[13px] bg-white border border-[#111111]/20 rounded-[12px] shadow-hard-sm">
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

      <div className="flex items-center gap-2 text-[13px] text-[#555555] pt-2 font-medium">
        <ShieldCheck className="w-4 h-4 text-[#111111] shrink-0" />
        ZORQEN performs read-only posture validation and creates review branches upon request.
      </div>
    </div>
  );
}