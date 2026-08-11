import { memo, useDeferredValue, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitFork, Plus, Search, ShieldCheck } from 'lucide-react';
import GithubIcon from '../components/GithubIcon';
import { useWorkspaceData, useWorkspaceUI } from '../store/WorkspaceContext';
import { CYBER_PORTAL, DEMO_REPO } from '../lib/demo';
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
  const score = r.name === DEMO_REPO.name ? 74 : 61;
  const findingsCount = r.name === DEMO_REPO.name ? 30 : 27;

  return (
    <div className="p-6 rounded-xl bg-white border border-[#111111] shadow-hard flex flex-wrap items-center justify-between gap-6 hover:bg-[#FAFAFA] transition-all">
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-12 h-12 rounded-lg bg-[#111111] text-white border border-[#111111] flex items-center justify-center shrink-0">
          <GithubIcon className="w-6 h-6 text-[#C5F82A]" />
        </div>

        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="mono text-[16px] font-extrabold text-[#111111]">
              {r.owner}/{r.name}
            </span>
            <span className="chip uppercase font-bold">{r.private ? 'PRIVATE' : 'PUBLIC'}</span>
            <span className="chip font-bold">{r.language}</span>
            {isLoaded && <span className="chip ok font-bold">LOADED TARGET</span>}
          </div>

          <div className="mono text-[11.5px] text-[#555555] flex items-center gap-2 font-medium">
            <span>branch: <strong className="text-[#111111]">{r.defaultBranch}</strong></span>
            <span>•</span>
            <span>commit: <strong className="text-[#111111]">{r.commit.slice(0, 7)}</strong></span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6 shrink-0">
        <div className="text-right">
          <div className="mono text-[18px] font-extrabold text-[#111111]">
            {score} <span className="text-[12px] text-[#666666] font-normal">/ 100</span>
          </div>
          <div className="mono text-[11px] font-bold text-[#666666]">
            {findingsCount} findings
          </div>
        </div>

        <button
          onClick={() => onAssess(r)}
          className="btn btn-accent px-5 py-2.5 text-[13px]"
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
  const { githubConnected, user, repos, loadRepo, currentRepo, loadDemoRepo } = useWorkspaceData();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);

  const availableRepos = useMemo(() => (githubConnected ? repos : [DEMO_REPO, CYBER_PORTAL]), [githubConnected, repos]);

  const filteredRepos = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    if (!q) return availableRepos;
    return availableRepos.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q) ||
        r.language.toLowerCase().includes(q)
    );
  }, [availableRepos, deferredSearch]);

  const handleAssess = useMemo(() => (r: RepoMeta) => {
    loadRepo(r);
    navigate(`/repos/${r.id}`);
  }, [loadRepo, navigate]);

  return (
    <div className="max-w-[1040px] mx-auto space-y-8 fade-in py-2">
      
      {/* Editorial Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-[#111111]">
        <div className="space-y-1">
          <div className="protocol-tag">raksha://workspace/repositories</div>
          <h1 className="text-4xl font-extrabold text-[#111111] tracking-tighter">
            REPOSITORIES
          </h1>
          <p className="text-[13.5px] text-[#555555] font-medium">
            Repositories authorized for autonomous security assessment.
          </p>
        </div>

        <button
          onClick={() => setGithubModalOpen(true)}
          className="btn btn-accent px-5 py-2.5 text-[13px]"
        >
          <Plus className="w-4 h-4" />
          Connect GitHub
        </button>
      </div>

      {/* Connection Info Banner */}
      <div className="p-5 rounded-xl bg-white border border-[#111111] shadow-hard flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-[#C5F82A] border border-[#111111] flex items-center justify-center text-[#111111] shrink-0">
            <GithubIcon className="w-5 h-5" />
          </div>
          <div className="text-[13px] text-[#333333] font-medium">
            {githubConnected ? (
              <>
                Connected as <span className="font-extrabold text-[#111111]">@{user?.github_login}</span> — repositories read via authenticated OAuth token.
              </>
            ) : (
              <>
                Connect GitHub read-only access to assess private repositories, or try the reference specimens below.
              </>
            )}
          </div>
        </div>

        {!githubConnected && (
          <button
            onClick={() => { loadDemoRepo(); navigate('/'); }}
            className="btn btn-ghost btn-sm text-[12.5px] font-bold"
          >
            Load reference demo →
          </button>
        )}
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
          AUTHORIZED REPOSITORIES ({filteredRepos.length})
        </div>

        {filteredRepos.length === 0 ? (
          <div className="p-12 text-center text-[#666666] mono text-[13px] bg-white border border-[#111111] rounded-xl shadow-hard">
            No repositories match &ldquo;{searchQuery}&rdquo;
          </div>
        ) : (
          filteredRepos.map((r) => (
            <RepositoryCard key={r.id} r={r} isLoaded={currentRepo?.id === r.id} onAssess={handleAssess} />
          ))
        )}
      </div>

      <div className="flex items-center gap-2 text-[12px] text-[#555555] pt-2 font-medium">
        <ShieldCheck className="w-4 h-4 text-[#111111]" />
        RAKSHA never modifies your repositories without explicit review and branch creation.
      </div>
    </div>
  );
}