import { memo, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Clock, GitBranch, Play, RefreshCw, Search, ShieldCheck, X } from 'lucide-react';
import GithubIcon from '../components/GithubIcon';
import EmptyStateView from '../components/EmptyStateView';
import { RepoListSkeleton } from '../components/SkeletonCard';
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
  // Never show fake data — null means no assessment has run yet
  const score = r.latestScore ?? null;
  const findingsCount = r.latestFindingsCount ?? null;
  const riskBand =
    score == null ? null
    : score >= 85 ? 'LOW RISK'
    : score >= 70 ? 'MODERATE RISK'
    : 'HIGH RISK';

  return (
    <div
      onClick={() => onAssess(r)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAssess(r); } }}
      aria-label={`Open repository ${r.owner}/${r.name}`}
      className={`p-5 lg:p-6 rounded-[20px] bg-white border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition-all duration-180 group min-h-[80px] focus-ring ${
        isLoaded ? 'border-[#111111] shadow-hard-sm' : 'border-[#111111] hover:border-[#111111] interactive-card'
      }`}
    >
      {/* Left: Monochrome GitHub Icon & Repository Details */}
      <div className="flex items-center gap-4 min-w-0">
        <GithubIcon className="w-[18px] h-[18px] md:w-5 md:h-5 text-[#111111] shrink-0" aria-hidden="true" />

        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[17px] font-extrabold text-[#111111] truncate group-hover:text-black">
              {r.owner}/{r.name}
            </span>
            <span className="chip font-bold text-[10.5px] bg-[#F9F8F5] text-[#525252] uppercase">
              {r.language || 'Unknown'}
            </span>
            {isLoaded && (
              <span className="chip ok font-bold text-[10.5px]">
                ACTIVE TARGET
              </span>
            )}
          </div>

          <div className="mono text-[12px] text-[#525252] flex items-center gap-2 font-semibold flex-wrap tabular-nums">
            <span className="flex items-center gap-1.5 text-[#111111]">
              <GitBranch className="w-4 h-4 text-[#525252] stroke-[2px]" aria-hidden="true" />
              <strong>{r.defaultBranch || 'main'}</strong>
            </span>
            <span aria-hidden="true">•</span>
            <span>commit: <strong>{r.commit ? r.commit.slice(0, 7) : 'HEAD'}</strong></span>
          </div>
        </div>
      </div>

      {/* Right: Security Posture Metrics & Action Arrow */}
      <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 pt-3 sm:pt-0 border-t-2 sm:border-t-0 border-[#111111]/10">
        <div className="text-left sm:text-right leading-tight">
          {/* Risk band — only shown when a score exists */}
          <div className="flex items-center gap-2 sm:justify-end">
            {riskBand ? (
              <span className={`chip uppercase font-bold text-[10px] ${
                riskBand === 'HIGH RISK' ? 'sev-critical' : riskBand === 'MODERATE RISK' ? 'sev-high' : 'bg-[#F9F8F5] text-[#111111]'
              }`}>
                {riskBand}
              </span>
            ) : (
              <span className="chip font-bold text-[10px] bg-[#F9F8F5] text-[#525252]">NO SCAN</span>
            )}
            <span className="hidden group-hover:inline-flex items-center gap-1 mono text-[11px] font-semibold text-[#525252]">
              <Clock className="w-3.5 h-3.5 text-[#525252] stroke-[2px]" aria-hidden="true" />
              recently
            </span>
          </div>

          <div className="pt-1">
            {score != null ? (
              <>
                <span className="mono text-[16px] font-extrabold text-[#111111] tabular-nums">{score}</span>
                <span className="mono text-[12px] font-bold text-[#525252] tabular-nums">/100</span>
                <div className="mono text-[11px] text-[#525252] font-medium tabular-nums">
                  {findingsCount} finding{findingsCount !== 1 ? 's' : ''}
                </div>
              </>
            ) : (
              <span className="mono text-[12px] font-semibold text-[#525252]">Run scan</span>
            )}
          </div>
        </div>

        {/* Hover Quick Action */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRunScan(r);
            }}
            aria-label={`Run security scan on ${r.name}`}
            className="hidden group-hover:flex btn btn-accent btn-xs text-[11.5px] font-extrabold min-h-[38px] px-3.5 shadow-hard-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
            <span>Run Scan</span>
          </button>

          <div
            aria-hidden="true"
            className="flex items-center justify-center w-[38px] h-[38px] min-w-[38px] min-h-[38px] rounded-[10px] bg-[#F9F8F5] border-2 border-[#111111] text-[#111111] group-hover:bg-[#C8F31D] transition-all shrink-0"
          >
            <ArrowRight className="w-4 h-4 text-[#111111] group-hover:translate-x-0.5 transition-transform stroke-[2px]" />
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
  const searchRef = useRef<HTMLInputElement>(null);

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
    <div className="max-w-[1280px] mx-auto space-y-6 lg:space-y-8 fade-in overflow-safe">
      
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b-2 border-[#111111]">
        <div className="space-y-1.5">
          <div className="protocol-tag">zorqen://workspace/repositories</div>
          <h1 className="text-page-title">
            Repositories Intelligence
          </h1>
          <p className="text-body text-[14.5px] text-[#525252]">
            <strong className="text-[#111111] tabular-nums">{repos.length}</strong> connected · Synced live
          </p>
        </div>

        <button
          onClick={() => refreshRepos()}
          disabled={reposLoading}
          aria-label="Sync repositories from GitHub"
          className="btn h-[48px] px-6 text-[13.5px] font-extrabold gap-2.5 bg-white border-2 border-[#111111] shadow-hard-sm hover:bg-[#F9F8F5] disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 text-[#111111] stroke-[2px] ${reposLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
          <span>{reposLoading ? 'Syncing…' : 'Sync Repositories'}</span>
        </button>
      </div>

      {/* GitHub Workspace Integration Strip */}
      <div className="p-5 lg:p-6 rounded-[20px] bg-white border-[3px] border-[#111111] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-[14px] font-semibold text-[#333333] shadow-hard interactive-card">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <GithubIcon className="w-5 h-5 text-[#111111] shrink-0" aria-hidden="true" />
            <span className="font-extrabold text-[#111111]">GitHub Workspace</span>
          </div>
          <span className="hidden sm:inline text-[#111111]/25" aria-hidden="true">•</span>
          {githubConnected ? (
            <span className="text-[#525252] font-semibold">Connected as <strong className="text-[#111111]">@{user?.github_login || '—'}</strong></span>
          ) : (
            <span className="text-[#525252] font-semibold">Not connected</span>
          )}
          <span className="hidden sm:inline text-[#111111]/25" aria-hidden="true">•</span>
          <span className="mono text-[11px] font-extrabold text-[#525252] uppercase tracking-wider">READ-ONLY ANALYSIS WORKFLOW</span>
        </div>

        <button
          onClick={() => setGithubModalOpen(true)}
          aria-label="Sync GitHub account"
          className="group btn btn-primary btn-sm px-5 text-[13px] font-extrabold inline-flex items-center gap-2 self-start sm:self-auto shadow-hard-sm hover:shadow-hard hover:-translate-y-0.5"
        >
          <span>Sync Account</span>
          <ArrowRight className="w-4 h-4 stroke-[2px] group-hover:translate-x-0.5 transition-transform duration-140" aria-hidden="true" />
        </button>
      </div>

      {/* Sticky Search Input Bar */}
      <div className="sticky top-[72px] z-20 bg-[var(--color-base)] pt-2 pb-3">
        <div className="relative group">
          <Search
            className="w-[18px] h-[18px] absolute left-4 top-3.5 text-[#525252] stroke-[2px] group-focus-within:text-[#111111] transition-colors duration-140"
            aria-hidden="true"
          />
          <input
            ref={searchRef}
            type="search"
            id="repo-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, language, or branch…"
            aria-label="Search repositories"
            aria-controls="repo-list"
            className="w-full h-[48px] min-h-[44px] pl-11 pr-24 bg-white border-2 border-[#111111] focus:ring-2 focus:ring-[#C8F31D] focus:ring-offset-1 rounded-[14px] text-[14.5px] font-semibold text-[#111111] placeholder:text-[#888] outline-none shadow-hard-sm transition-all duration-140"
          />
          {searchQuery ? (
            <button
              onClick={() => { setSearchQuery(''); searchRef.current?.focus(); }}
              aria-label="Clear search"
              className="absolute right-4 top-2.5 flex items-center justify-center w-[28px] h-[28px] rounded-full bg-[#111111]/8 hover:bg-[#111111]/15 text-[#525252] hover:text-[#111111] transition-colors"
            >
              <X className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />
            </button>
          ) : (
            <kbd className="absolute right-4 top-3.5 hidden md:inline-flex">Ctrl K</kbd>
          )}
        </div>
        {/* Result count feedback */}
        {searchQuery && !reposLoading && (
          <p className="mt-2 mono text-[11.5px] text-[#525252] font-semibold" aria-live="polite">
            Showing {filteredRepos.length} of {repos.length} {repos.length === 1 ? 'repository' : 'repositories'}
          </p>
        )}
      </div>

      {/* Authorized Repositories List */}
      <div id="repo-list" className="space-y-4">
        <div className="section-label">
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
          /* Skeleton loaders during initial fetch */
          <RepoListSkeleton count={4} />
        ) : filteredRepos.length === 0 ? (
          <div className="p-8 sm:p-12 rounded-[20px] bg-white border-2 border-[#111111] shadow-hard-sm text-center space-y-3">
            <p className="font-extrabold text-[17px] text-[#111111] tracking-tight">
              {searchQuery ? `No repositories match "${searchQuery}"` : 'No repositories found.'}
            </p>
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="btn btn-sm bg-white border-2 border-[#111111] text-[#111111] shadow-hard-sm"
              >
                Clear search
              </button>
            ) : (
              <p className="text-[14px] text-[#525252] font-medium">Sync your GitHub account to load repositories.</p>
            )}
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
        <ShieldCheck className="w-4 h-4 text-[#111111] shrink-0" aria-hidden="true" />
        ZORQEN performs read-only posture validation and creates review branches upon request.
      </div>
    </div>
  );
}