import { memo, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitFork, Plus, Search, ShieldCheck } from 'lucide-react';
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
    <div className="py-3.5 px-5 rounded-[18px] bg-white border-2 border-[#111111] shadow-hard-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 interactive-card hover:bg-[#FAFAFA]">
      {/* Left + Center */}
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-10 h-10 rounded-[10px] bg-[#111111] text-white border-2 border-[#111111] flex items-center justify-center shrink-0 shadow-hard-sm">
          <GithubIcon className="w-6 h-6 text-[#C8FF2E]" />
        </div>

        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="mono text-[16px] font-extrabold text-[#0A0A0A] break-all">
              {r.owner}/{r.name}
            </span>
            <span className="chip uppercase font-bold text-[10px]">{r.private ? 'PRIVATE' : 'PUBLIC'}</span>
            <span className="chip font-bold text-[10px] bg-[#FAFAFA]">{r.language}</span>
            {isLoaded && <span className="chip ok font-bold text-[10px]">LOADED TARGET</span>}
          </div>

          <div className="mono text-[11px] text-[#5E5E5E] flex items-center gap-2 font-semibold flex-wrap">
            <span>branch: <strong className="text-[#0A0A0A]">{r.defaultBranch}</strong></span>
            <span>•</span>
            <span>commit: <strong className="text-[#0A0A0A]">{r.commit ? r.commit.slice(0, 7) : '—'}</strong></span>
          </div>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#111111]/10 shrink-0">
        <div className="text-left sm:text-right">
          {assessed ? (
            <>
              <div className="mono text-[18px] font-extrabold text-[#0A0A0A]">
                {score} <span className="text-[12px] text-[#5E5E5E] font-bold">/ 100</span>
              </div>
              <div className="mono text-[11px] font-bold text-[#5E5E5E]">
                {findingsCount ?? 0} findings
              </div>
            </>
          ) : (
            <div className="mono text-[12px] font-bold text-[#5E5E5E]">
              NO ASSESSMENT YET
            </div>
          )}
        </div>

        <button
          onClick={() => onAssess(r)}
          className="btn btn-accent px-4 h-[40px] text-[13px]"
        >
          <GitFork className="w-4 h-4" />
          Assess
        </button>
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
      <div className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b-2 border-[#111111]">
        <div className="space-y-1">
          <div className="protocol-tag">zorqen://workspace/repositories</div>
          <h1 className="text-3xl sm:text-[34px] font-extrabold text-[#0A0A0A] tracking-tighter">
            REPOSITORIES
          </h1>
          <p className="text-[14px] text-[#5E5E5E] font-medium">
            Repositories authorized for autonomous security assessment.
          </p>
        </div>

        <button
          onClick={() => setGithubModalOpen(true)}
          className="btn btn-accent px-5 h-[44px] text-[13px]"
        >
          <Plus className="w-4 h-4" />
          Connect GitHub
        </button>
      </div>

      {/* Connection Info Banner */}
      <div className="panel p-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[10px] bg-[#C8FF2E] border-2 border-[#111111] flex items-center justify-center text-[#111111] shrink-0">
            <GithubIcon className="w-5 h-5" />
          </div>
          <div className="text-[14px] text-[#0A0A0A] font-medium">
            {githubConnected ? (
              <>
                Connected as <span className="font-extrabold text-[#0A0A0A]">@{user?.github_login}</span> — repositories read via authenticated OAuth token.
              </>
            ) : (
              <>
                Connect GitHub read-only access to assess your private and public repositories.
              </>
            )}
          </div>
        </div>
      </div>

      {/* Search Filter Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-4 top-3.5 text-[#5E5E5E]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter repositories by name or language…"
          className="input input-search w-full bg-white text-[14px] font-medium"
        />
      </div>

      {/* Authorized Repositories List */}
      <div className="space-y-3">
        <div className="mono text-[11px] font-extrabold text-[#5E5E5E] uppercase tracking-[0.18em]">
          AUTHORIZED REPOSITORIES ({githubConnected && reposLoading && filteredRepos.length === 0 ? '…' : filteredRepos.length})
        </div>

        {!githubConnected ? (
          <div className="panel p-12 text-center text-[#5E5E5E] mono text-[13px]">
            No GitHub account connected — connect to list the repositories you can assess.
          </div>
        ) : reposError ? (
          <div className="panel p-12 text-center text-[#5E5E5E] mono text-[13px]">
            Could not load GitHub repositories — {reposError}. Reconnect GitHub from the sidebar to try again.
          </div>
        ) : reposLoading && filteredRepos.length === 0 ? (
          <div className="panel p-12 text-center text-[#5E5E5E] mono text-[13px]">
            Syncing repositories from GitHub…
          </div>
        ) : filteredRepos.length === 0 ? (
          <div className="panel p-12 text-center text-[#5E5E5E] mono text-[13px]">
            {searchQuery ? `No repositories match "${searchQuery}"` : 'No repositories found on this account.'}
          </div>
        ) : (
          filteredRepos.map((r) => (
            <RepositoryCard key={r.id} r={r} isLoaded={currentRepo?.id === r.id} onAssess={handleAssess} />
          ))
        )}
      </div>

      <div className="flex items-center gap-2 text-[13px] text-[#5E5E5E] pt-2 font-medium">
        <ShieldCheck className="w-4 h-4 text-[#0A0A0A] shrink-0" />
        ZORQEN never modifies your repositories without explicit review and branch creation.
      </div>
    </div>
  );
}