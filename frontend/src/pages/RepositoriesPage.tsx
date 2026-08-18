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
    <div className="p-4 sm:p-6 rounded-xl bg-white border border-[#111111] shadow-hard flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 interactive-card hover:bg-[#FAFAFA]">
      <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-[#111111] text-white border border-[#111111] flex items-center justify-center shrink-0">
          <GithubIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#C5F82A]" />
        </div>

        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="mono text-[14.5px] sm:text-[16px] font-extrabold text-[#111111] break-all">
              {r.owner}/{r.name}
            </span>
            <span className="chip uppercase font-bold text-[9.5px] sm:text-[10.5px]">{r.private ? 'PRIVATE' : 'PUBLIC'}</span>
            <span className="chip font-bold text-[9.5px] sm:text-[10.5px]">{r.language}</span>
            {isLoaded && <span className="chip ok font-bold text-[9.5px] sm:text-[10.5px]">LOADED TARGET</span>}
          </div>

          <div className="mono text-[10.5px] sm:text-[11.5px] text-[#333333] flex items-center gap-2 font-semibold flex-wrap">
            <span>branch: <strong className="text-[#111111]">{r.defaultBranch}</strong></span>
            <span>•</span>
            <span>commit: <strong className="text-[#111111]">{r.commit ? r.commit.slice(0, 7) : '—'}</strong></span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-[#111111]/10 shrink-0">
        <div className="text-left sm:text-right">
          {assessed ? (
            <>
              <div className="mono text-[16px] sm:text-[18px] font-extrabold text-[#111111]">
                {score} <span className="text-[11px] sm:text-[12px] text-[#4A4A4A] font-bold">/ 100</span>
              </div>
              <div className="mono text-[10.5px] sm:text-[11px] font-bold text-[#4A4A4A]">
                {findingsCount ?? 0} findings
              </div>
            </>
          ) : (
            <div className="mono text-[12px] sm:text-[13px] font-bold text-[#666666]">
              NO ASSESSMENT YET
            </div>
          )}
        </div>

        <button
          onClick={() => onAssess(r)}
          className="btn btn-accent px-4 sm:px-5 py-2 sm:py-2.5 text-[12.5px] sm:text-[13px]"
        >
          <GitFork className="w-4 h-4" />
          Assess Repository
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

  /* Refresh live GitHub repositories whenever a connected account views the page,
     so results are never stale from an earlier session.
     authReady guard ensures we don't fire before session restore completes. */
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
    <div className="max-w-[1040px] mx-auto space-y-6 sm:space-y-8 fade-in py-2">
      
      {/* Editorial Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-4 sm:pb-6 border-b border-[#111111]">
        <div className="space-y-1">
          <div className="protocol-tag">raksha://workspace/repositories</div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#111111] tracking-tighter">
            REPOSITORIES
          </h1>
          <p className="text-[12.5px] sm:text-[13.5px] text-[#555555] font-medium">
            Repositories authorized for autonomous security assessment.
          </p>
        </div>

        <button
          onClick={() => setGithubModalOpen(true)}
          className="btn btn-accent px-4 sm:px-5 py-2 sm:py-2.5 text-[12.5px] sm:text-[13px]"
        >
          <Plus className="w-4 h-4" />
          Connect GitHub
        </button>
      </div>

      {/* Connection Info Banner */}
      <div className="p-4 sm:p-5 rounded-xl bg-white border border-[#111111] shadow-hard flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#C5F82A] border border-[#111111] flex items-center justify-center text-[#111111] shrink-0">
            <GithubIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="text-[12.5px] sm:text-[13px] text-[#333333] font-medium">
            {githubConnected ? (
              <>
                Connected as <span className="font-extrabold text-[#111111]">@{user?.github_login}</span> — repositories read via authenticated OAuth token.
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
        <Search className="w-4 h-4 absolute left-4 top-3.5 text-[#666666]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter repositories by name or language…"
          className="input input-search w-full bg-white text-[13px] font-medium"
        />
      </div>

      {/* Security Assessment Specimen Cards */}
      <div className="space-y-4">
        <div className="mono text-[11px] font-bold text-[#666666] uppercase tracking-wider">
          AUTHORIZED REPOSITORIES ({githubConnected && reposLoading && filteredRepos.length === 0 ? '…' : filteredRepos.length})
        </div>

        {!githubConnected ? (
          <div className="p-8 sm:p-12 text-center text-[#666666] mono text-[13px] bg-white border border-[#111111] rounded-xl shadow-hard">
            No GitHub account connected — connect to list the repositories you can assess.
          </div>
        ) : reposError ? (
          <div className="p-8 sm:p-12 text-center text-[#666666] mono text-[13px] bg-white border border-[#111111] rounded-xl shadow-hard">
            Could not load GitHub repositories — {reposError}. Reconnect GitHub from the sidebar to try again.
          </div>
        ) : reposLoading && filteredRepos.length === 0 ? (
          <div className="p-8 sm:p-12 text-center text-[#666666] mono text-[13px] bg-white border border-[#111111] rounded-xl shadow-hard">
            Syncing repositories from GitHub…
          </div>
        ) : filteredRepos.length === 0 ? (
          <div className="p-8 sm:p-12 text-center text-[#666666] mono text-[13px] bg-white border border-[#111111] rounded-xl shadow-hard">
            {searchQuery ? `No repositories match "${searchQuery}"` : 'No repositories found on this account.'}
          </div>
        ) : (
          filteredRepos.map((r) => (
            <RepositoryCard key={r.id} r={r} isLoaded={currentRepo?.id === r.id} onAssess={handleAssess} />
          ))
        )}
      </div>

      <div className="flex items-center gap-2 text-[12px] text-[#555555] pt-2 font-medium">
        <ShieldCheck className="w-4 h-4 text-[#111111] shrink-0" />
        RAKSHA never modifies your repositories without explicit review and branch creation.
      </div>
    </div>
  );
}