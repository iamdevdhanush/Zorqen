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
      className="p-4 sm:p-5 rounded-[14px] bg-white border-2 border-[#111111]/20 hover:border-[#111111] flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-[#FAFAFA] transition-all duration-200 hover:-translate-y-0.5 group min-h-[56px] shadow-hard-sm"
    >
      {/* Left: Monochrome GitHub Icon & Repo Details */}
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-11 h-11 rounded-[10px] bg-[#FAFAFA] border-2 border-[#111111]/20 text-[#0A0A0A] group-hover:bg-[#111111] group-hover:text-[#C8FF2E] transition-colors flex items-center justify-center shrink-0 shadow-hard-sm">
          <GithubIcon className="w-5 h-5 text-current" />
        </div>

        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="mono text-[16px] font-extrabold text-[#0A0A0A] truncate group-hover:text-black">
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

          <div className="mono text-[12px] text-[#6B6B6B] flex items-center gap-2 font-medium flex-wrap tabular-nums">
            <span className="flex items-center gap-1 text-[#0A0A0A]">
              <GitBranch className="w-3.5 h-3.5 text-[#6B6B6B]" />
              <strong>{r.defaultBranch || 'main'}</strong>
            </span>
            <span>•</span>
            <span>commit: <strong>{r.commit ? r.commit.slice(0, 7) : 'HEAD'}</strong></span>
          </div>
        </div>
      </div>

      {/* Right: Security Posture Intelligence Metrics & Hover Quick Action */}
      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#111111]/10">
        <div className="text-left sm:text-right leading-tight">
          <div className="flex items-center gap-1.5 sm:justify-end">
            <span className={`chip uppercase font-bold text-[9.5px] ${riskBand === 'HIGH RISK' ? 'sev-critical' : riskBand === 'MODERATE RISK' ? 'sev-high' : 'ok'}`}>
              {riskBand}
            </span>
            <span className="hidden group-hover:inline-flex items-center gap-1 mono text-[10.5px] font-semibold text-[#6B6B6B]">
              <Clock className="w-3 h-3 text-[#6B6B6B]" />
              2m ago
            </span>
          </div>

          <div className="pt-0.5">
            <span className="mono text-[16px] font-extrabold text-[#0A0A0A] tabular-nums">{score}</span>
            <span className="mono text-[11.5px] font-bold text-[#6B6B6B] tabular-nums">/100</span>
            <div className="mono text-[11px] text-[#6B6B6B] font-medium tabular-nums">{findingsCount} findings</div>
          </div>
        </div>

        {/* Hover Quick Action Cue: Run Assessment Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRunScan(r);
            }}
            className="hidden group-hover:flex btn btn-accent btn-xs text-[11px] font-extrabold min-h-[44px] px-3 shadow-hard-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Run Scan</span>
          </button>

          <div className="flex items-center justify-center w-[44px] h-[44px] min-w-[44px] min-h-[44px] rounded-[10px] bg-[#FAFAFA] border border-[#111111]/20 text-[#0A0A0A] group-hover:bg-[#C8FF2E] group-hover:border-[#111111] transition-all shrink-0">
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
    <div className="max-w-[1080px] mx-auto space-y-8 fade-in py-4 px-1 sm:px-0">
      
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b-2 border-[#111111]">
        <div className="space-y-1">
          <div className="protocol-tag">zorqen://workspace/repositories</div>
          <h1 className="text-3xl sm:text-[36px] font-extrabold text-[#0A0A0A] tracking-tight">
            Repositories Intelligence
          </h1>
          <p className="text-[14px] text-[#6B6B6B] font-medium">
            <strong className="text-[#0A0A0A] tabular-nums">{repos.length}</strong> connected · Synced live
          </p>
        </div>

        <button
          onClick={() => refreshRepos()}
          className="btn h-[44px] min-h-[44px] px-4 text-[13px] font-bold gap-2 bg-white border-2 border-[#111111]/20 hover:border-[#111111]"
        >
          <RefreshCw className="w-4 h-4 text-[#0A0A0A]" />
          <span>Sync</span>
        </button>
      </div>

      {/* Compact Status Bar */}
      <div className="py-3 px-4 rounded-[12px] bg-white border border-[#111111]/15 flex items-center justify-between gap-4 text-[13px] font-medium text-[#333333] flex-wrap">
        <div className="flex items-center gap-2.5 flex-wrap">
          <GithubIcon className="w-4 h-4 text-[#111111]" />
          <span className="mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#6B6B6B]">GitHub</span>
          <span>•</span>
          {githubConnected ? (
            <span>Connected <strong className="text-[#0A0A0A]">@{user?.github_login || 'iamdevdhanush'}</strong></span>
          ) : (
            <span>Not connected</span>
          )}
          <span>•</span>
          <span className="mono text-[11px] text-[#6B6B6B]">Read-only access</span>
        </div>

        <button
          onClick={() => setGithubModalOpen(true)}
          className="font-extrabold text-[#0A0A0A] hover:underline inline-flex items-center gap-1.5 text-[13px] min-h-[44px] py-1"
        >
          <span>Sync account</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-[#6B6B6B]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search repositories by name or language…"
          className="w-full h-[44px] min-h-[44px] pl-10 pr-4 bg-white border-2 border-[#111111]/20 focus:border-[#111111] rounded-[10px] text-[14px] font-medium outline-none transition-colors"
        />
      </div>

      {/* Authorized Repositories List */}
      <div className="space-y-4">
        <div className="mono text-[10.5px] font-bold text-[#6B6B6B] uppercase tracking-[0.14em]">
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
          <div className="p-8 text-center text-[#6B6B6B] mono text-[12.5px] bg-white border-2 border-[#111111]/15 rounded-[12px]">
            Syncing repositories from GitHub…
          </div>
        ) : filteredRepos.length === 0 ? (
          <div className="p-8 text-center text-[#6B6B6B] mono text-[12.5px] bg-white border-2 border-[#111111]/15 rounded-[12px]">
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

      <div className="flex items-center gap-2 text-[12.5px] text-[#6B6B6B] pt-2 font-medium">
        <ShieldCheck className="w-4 h-4 text-[#0A0A0A] shrink-0" />
        ZORQEN performs read-only posture validation and creates review branches upon request.
      </div>
    </div>
  );
}