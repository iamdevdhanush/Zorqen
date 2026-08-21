import { memo, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import GithubIcon from '../components/GithubIcon';
import { useWorkspaceData, useWorkspaceUI } from '../store/WorkspaceContext';
import type { RepoMeta } from '../lib/types';

const RepositoryCard = memo(function RepositoryCard({
  r,
  isLoaded,
  onAssess,
}: {
  r: RepoMeta;
  isLoaded: boolean;
  onAssess: (r: RepoMeta) => void;
}) {
  const assessed = r.latestScore != null;
  const score = r.latestScore ?? null;
  const findingsCount = r.latestFindingsCount ?? null;

  return (
    <div
      onClick={() => onAssess(r)}
      className="p-4 rounded-[12px] bg-white border border-[#111111]/15 hover:border-[#111111] flex items-center justify-between gap-4 cursor-pointer hover:bg-[#FAFAFA] transition-all group"
    >
      {/* Left: GitHub icon, Repo name, branch, language */}
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-8 h-8 rounded-full bg-[#111111] text-white border border-[#111111] flex items-center justify-center shrink-0">
          <GithubIcon className="w-4 h-4 text-[#C8FF2E]" />
        </div>

        <div className="space-y-0.5 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="mono text-[14.5px] font-extrabold text-[#0A0A0A] truncate group-hover:text-black">
              {r.owner}/{r.name}
            </span>
            <span className="chip font-bold text-[9px] bg-[#FAFAFA] uppercase">{r.language}</span>
            {isLoaded && <span className="chip ok font-bold text-[9px]">ACTIVE TARGET</span>}
          </div>

          <div className="mono text-[11px] text-[#6B6B6B] flex items-center gap-2 font-medium">
            <span>branch: <strong className="text-[#0A0A0A]">{r.defaultBranch}</strong></span>
            <span>•</span>
            <span>commit: <strong className="text-[#0A0A0A]">{r.commit ? r.commit.slice(0, 7) : 'HEAD'}</strong></span>
          </div>
        </div>
      </div>

      {/* Center: Last assessment, visibility */}
      <div className="hidden md:flex items-center gap-4 text-center shrink-0">
        <span className="chip uppercase font-bold text-[9.5px]">{r.private ? 'PRIVATE' : 'PUBLIC'}</span>
        <div className="text-right leading-tight">
          {assessed ? (
            <div>
              <span className="mono text-[14px] font-extrabold text-[#0A0A0A]">{score}</span>
              <span className="mono text-[11px] font-bold text-[#6B6B6B]">/100</span>
              <div className="mono text-[10px] text-[#6B6B6B] font-medium">{findingsCount ?? 0} findings</div>
            </div>
          ) : (
            <span className="mono text-[10.5px] font-bold text-[#6B6B6B]">NO SCANS</span>
          )}
        </div>
      </div>

      {/* Right: Subtle Chevron / Arrow Action Cue */}
      <div className="flex items-center gap-1 text-[13px] font-bold text-[#0A0A0A] group-hover:translate-x-1 transition-transform shrink-0">
        <ArrowRight className="w-4 h-4 text-[#0A0A0A]" />
      </div>
    </div>
  );
});

export default function RepositoriesPage() {
  const { setGithubModalOpen } = useWorkspaceUI();
  const { githubConnected, user, repos, reposLoading, reposError, refreshRepos, loadRepo, currentRepo, authReady } = useWorkspaceData();
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

  return (
    <div className="max-w-[1080px] mx-auto space-y-6 fade-in py-4">
      
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b border-[#111111]/15">
        <div className="space-y-1">
          <div className="protocol-tag">zorqen://workspace/repositories</div>
          <h1 className="text-3xl sm:text-[36px] font-extrabold text-[#0A0A0A] tracking-tight">
            Repositories
          </h1>
          <p className="text-[14px] text-[#6B6B6B] font-medium">
            {repos.length} connected · Synced 2m ago
          </p>
        </div>

        <button
          onClick={() => refreshRepos()}
          className="btn h-[38px] px-3.5 text-[12.5px] font-bold gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sync</span>
        </button>
      </div>

      {/* Compact Single Horizontal Status Bar */}
      <div className="py-2.5 px-4 rounded-[10px] bg-white border border-[#111111]/15 flex items-center justify-between gap-4 text-[13px] font-medium text-[#333333]">
        <div className="flex items-center gap-3">
          <GithubIcon className="w-4 h-4 text-[#111111]" />
          <span className="mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#6B6B6B]">GitHub</span>
          <span>•</span>
          {githubConnected ? (
            <span>Connected <strong className="text-[#0A0A0A]">@{user?.github_login || 'iamdevdhanush'}</strong></span>
          ) : (
            <span>Not connected</span>
          )}
          <span>•</span>
          <span className="mono text-[11px] text-[#6B6B6B]">Read-only</span>
        </div>

        <button
          onClick={() => setGithubModalOpen(true)}
          className="font-bold text-[#0A0A0A] hover:underline inline-flex items-center gap-1 text-[12.5px]"
        >
          <span>Sync now</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#6B6B6B]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search repositories by name or language…"
          className="w-full h-[38px] pl-10 pr-4 bg-white border border-[#111111]/15 rounded-[8px] text-[13.5px] font-medium outline-none focus:border-[#111111]"
        />
      </div>

      {/* Authorized Repositories List */}
      <div className="space-y-2.5">
        <div className="mono text-[10.5px] font-bold text-[#6B6B6B] uppercase tracking-[0.14em]">
          AUTHORIZED REPOSITORIES ({githubConnected && reposLoading && filteredRepos.length === 0 ? '…' : filteredRepos.length})
        </div>

        {!githubConnected ? (
          <div className="p-8 text-center text-[#6B6B6B] mono text-[12.5px] bg-white border border-[#111111]/15 rounded-[12px]">
            No GitHub account connected — connect to list repositories.
          </div>
        ) : reposError ? (
          <div className="p-8 text-center text-[#6B6B6B] mono text-[12.5px] bg-white border border-[#111111]/15 rounded-[12px]">
            Could not load repositories — {reposError}.
          </div>
        ) : reposLoading && filteredRepos.length === 0 ? (
          <div className="p-8 text-center text-[#6B6B6B] mono text-[12.5px] bg-white border border-[#111111]/15 rounded-[12px]">
            Syncing repositories from GitHub…
          </div>
        ) : filteredRepos.length === 0 ? (
          <div className="p-8 text-center text-[#6B6B6B] mono text-[12.5px] bg-white border border-[#111111]/15 rounded-[12px]">
            {searchQuery ? `No repositories match "${searchQuery}"` : 'No repositories found.'}
          </div>
        ) : (
          filteredRepos.map((r) => (
            <RepositoryCard key={r.id} r={r} isLoaded={currentRepo?.id === r.id} onAssess={handleAssess} />
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