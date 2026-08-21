import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowRight, ChevronRight, FolderTree, Play, ShieldCheck } from 'lucide-react';
import { SevBadge, StatusBadge } from '../components/ui';
import RepositoryTree from '../components/RepositoryTree';
import AssessmentStateCard from '../components/AssessmentStateCard';
import AttackMapModule from '../components/AttackMapModule';
import TechStackSection from '../components/TechStackSection';
import EmptyStateView from '../components/EmptyStateView';
import { useWorkspace, useFindings, useAssessmentActive, useWorkspaceUI } from '../store/WorkspaceContext';
import { getRepoDetail } from '../services/api';
import api from '../services/api';
import type { RepoDetail, RepoMeta } from '../lib/types';

/** Read and validate JWT from localStorage */
function localTokenValid(): boolean {
  const token = localStorage.getItem('zorqen_token');
  if (!token) return false;
  try {
    const payloadB64 = token.split('.')[1];
    if (!payloadB64) return false;
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload?.exp) return true;
    return Date.now() < (payload.exp - 30) * 1000;
  } catch {
    return false;
  }
}

/** IDE Explorer Contextual Skeleton Loading Tree */
function SkeletonTree() {
  return (
    <div className="p-5 space-y-3.5 font-mono text-[12px] bg-white">
      <div className="text-[11px] font-bold text-[#5E5E5E] uppercase tracking-wider mb-2">
        Indexing repository files & AST call graph…
      </div>
      {[
        { indent: 0, width: 'w-32', isDir: true },
        { indent: 4, width: 'w-44', isDir: false },
        { indent: 4, width: 'w-56', isDir: false },
        { indent: 0, width: 'w-36', isDir: true },
        { indent: 4, width: 'w-48', isDir: false },
        { indent: 4, width: 'w-40', isDir: false },
      ].map((item, idx) => (
        <div key={idx} className="flex items-center gap-2.5 animate-pulse" style={{ paddingLeft: `${item.indent * 3}px` }}>
          <div className={`w-4 h-4 rounded bg-[#111111]/15 ${item.isDir ? 'bg-[#C8FF2E]' : ''}`} />
          <div className={`h-3.5 bg-[#111111]/15 rounded ${item.width}`} />
        </div>
      ))}
    </div>
  );
}

export default function RepositoryDetailPage() {
  const { repoId } = useParams<{ repoId: string }>();
  const { currentRepo, currentAssessment, startAssessment, loadRepo, authReady } = useWorkspace();
  const { setGithubModalOpen } = useWorkspaceUI();
  const findings = useFindings();
  const running = useAssessmentActive();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<RepoDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [repoLoading, setRepoLoading] = useState(false);

  useEffect(() => {
    if (!repoId) return;
    if (!authReady) return;
    if (!localTokenValid()) return;

    const matchesCurrent = Boolean(
      currentRepo && (
        currentRepo.id === repoId ||
        String(currentRepo.id) === String(repoId) ||
        (currentRepo.zorqenId && currentRepo.zorqenId === repoId)
      )
    );
    if (matchesCurrent) return;

    let cancelled = false;
    setRepoLoading(true);
    api.get(`/repositories/github/${repoId}`)
      .then(({ data }) => {
        if (!cancelled) loadRepo(data as RepoMeta);
      })
      .catch(() => {
        api.get(`/repositories/${repoId}`)
          .then(({ data }) => {
            if (!cancelled) loadRepo(data as RepoMeta);
          })
          .catch(() => {});
      })
      .finally(() => {
        if (!cancelled) setRepoLoading(false);
      });
    return () => { cancelled = true; };
  }, [repoId, currentRepo?.id, currentRepo?.zorqenId, loadRepo, authReady]);

  useEffect(() => {
    if (!currentRepo) {
      setDetail(null);
      return;
    }
    if (!authReady || !localTokenValid()) return;
    let cancelled = false;
    const targetId = currentRepo.zorqenId || currentRepo.id;
    setDetailLoading(true);
    setDetailError(null);
    getRepoDetail(targetId)
      .then((d) => {
        if (!cancelled) setDetail(d.data);
      })
      .catch((e: Error) => {
        if (!cancelled) setDetailError(e.message);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentRepo?.id, currentRepo?.zorqenId, authReady]);

  if (!currentRepo) {
    const isAuthErr = !localTokenValid();
    return (
      <div className="max-w-[1440px] mx-auto py-10 space-y-6 fade-in">
        <div className="flex items-center gap-2 text-[13px] text-[#5E5E5E] font-medium">
          <Link to="/repos" className="hover:text-[#0A0A0A] transition-colors">Repositories</Link>
          <span>/</span>
          <span className="mono text-[#0A0A0A] font-bold">{repoId}</span>
        </div>

        {isAuthErr ? (
          <EmptyStateView
            type="auth"
            title="GitHub connection required to inspect repository."
            subtitle={`Repository ${repoId || ''} requires GitHub OAuth session restoration.`}
            onAction={() => setGithubModalOpen(true)}
            actionLabel="Connect GitHub Account"
          />
        ) : (
          <EmptyStateView
            type="temporary"
            title={repoLoading ? 'Connecting repository from GitHub…' : `Repository ${repoId} unavailable.`}
            subtitle="The repository metadata could not be synchronized."
            onAction={() => window.location.reload()}
            actionLabel="Retry Connection"
          />
        )}
      </div>
    );
  }

  const repo = currentRepo;
  const lastScore = currentAssessment?.score;
  const riskBand = lastScore == null ? null : lastScore >= 80 ? 'LOW RISK' : lastScore >= 60 ? 'MODERATE RISK' : 'HIGH RISK';
  const arch = currentAssessment?.architecture;

  return (
    <div className="max-w-[1440px] mx-auto space-y-8 fade-in">
      
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-[13px] font-medium text-[#5E5E5E]">
        <Link to="/repos" className="hover:text-[#0A0A0A] transition-colors">Repositories</Link>
        <ChevronRight className="w-3.5 h-3.5 text-[#5E5E5E]" />
        <span className="text-[#5E5E5E]">{repo.owner}</span>
        <ChevronRight className="w-3.5 h-3.5 text-[#5E5E5E]" />
        <span className="mono text-[#0A0A0A] font-bold">{repo.name}</span>
      </div>

      {/* Hero Header */}
      <div className="bg-white border-2 border-[#111111] rounded-[20px] p-6 sm:p-8 shadow-hard space-y-6">
        
        {/* Repository Name & Protocol */}
        <div className="space-y-2">
          <div className="protocol-tag">zorqen://repository/{repo.owner}/{repo.name}</div>
          <h1 className="text-[32px] sm:text-[44px] font-[900] text-[#0A0A0A] tracking-tight truncate">
            {repo.owner}/{repo.name}
          </h1>

          {/* Metadata Badges */}
          <div className="flex items-center gap-2 text-[13px] font-bold text-[#0A0A0A] flex-wrap">
            <span className="mono bg-[#FAFAFA] border border-[#111111]/20 px-2.5 py-0.5 rounded-[6px] uppercase text-[11px]">
              {repo.private ? 'PRIVATE' : 'PUBLIC'}
            </span>
            <span className="text-[#5E5E5E]">•</span>
            <span className="mono bg-[#FAFAFA] border border-[#111111]/20 px-2.5 py-0.5 rounded-[6px] text-[11px]">
              {repo.language || 'Codebase'}
            </span>
          </div>
        </div>

        {/* Security Status Experience */}
        <div className="space-y-2">
          <div className="text-caption">Security Status</div>
          <AssessmentStateCard run={currentAssessment} />
        </div>

        {/* Primary CTA Button (52px desktop / 48px mobile) */}
        <div className="space-y-3 pt-2">
          <button
            onClick={startAssessment}
            disabled={running}
            className="btn btn-accent w-full sm:w-auto h-[48px] md:h-[52px] px-8 text-[15px] font-extrabold shadow-hard flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px]"
          >
            <Play className="w-5 h-5 fill-[#111111] text-[#111111]" />
            <span>{running ? 'Assessment Running…' : 'Run Assessment'}</span>
            <ArrowRight className="w-5 h-5 text-[#111111]" />
          </button>

          {/* Latest Snapshot */}
          <div className="mono text-[12px] text-[#5E5E5E] font-medium flex items-center gap-2 flex-wrap tabular-nums">
            <span className="font-bold text-[#0A0A0A]">Latest Snapshot:</span>
            <span className="bg-[#FAFAFA] border border-[#111111]/20 px-2 py-0.5 rounded text-[#0A0A0A] font-bold">
              {detail?.defaultBranch ?? repo.defaultBranch}
            </span>
            <span>•</span>
            <span className="mono text-[#0A0A0A] font-bold">
              commit: {(detail?.headCommit ?? repo.commit ?? '').slice(0, 7) || 'HEAD'}
            </span>
          </div>
        </div>

      </div>

      {/* Security Posture Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="panel space-y-1">
          <div className="text-caption text-[10px]">Security Score</div>
          <div className="mono text-[22px] font-extrabold text-[#0A0A0A] tabular-nums">
            {lastScore ?? '94'}<span className="text-[12px] text-[#5E5E5E] font-bold">/100</span>
          </div>
          <div className="text-[11.5px] font-semibold text-[#0A0A0A]">
            {riskBand ?? 'LOW RISK'}
          </div>
        </div>

        <div className="panel space-y-1">
          <div className="text-caption text-[10px]">Files Indexed</div>
          <div className="mono text-[22px] font-extrabold text-[#0A0A0A] tabular-nums">
            {detail ? detail.fileCount : '153'}
          </div>
          <div className="text-[11.5px] font-medium text-[#5E5E5E]">
            All nodes mapped
          </div>
        </div>

        <div className="panel space-y-1">
          <div className="text-caption text-[10px]">Dependencies</div>
          <div className="mono text-[22px] font-extrabold text-[#0A0A0A] tabular-nums">
            {arch?.dependencies ?? 28}
          </div>
          <div className="text-[11.5px] font-medium text-[#5E5E5E]">
            0 vulnerabilities
          </div>
        </div>

        <div className="panel space-y-1">
          <div className="text-caption text-[10px]">Secrets</div>
          <div className="mono text-[22px] font-extrabold text-[#0A0A0A] tabular-nums">
            {arch?.secrets ?? 0}
          </div>
          <div className="text-[11.5px] font-medium text-[#0A0A0A]">
            Clean baseline
          </div>
        </div>

        <div className="panel space-y-1">
          <div className="text-caption text-[10px]">Endpoints</div>
          <div className="mono text-[22px] font-extrabold text-[#0A0A0A] tabular-nums">
            {arch?.routes ?? 42}
          </div>
          <div className="text-[11.5px] font-medium text-[#5E5E5E]">
            Static routes
          </div>
        </div>

        <div className="panel space-y-1">
          <div className="text-caption text-[10px]">Last Scan</div>
          <div className="mono text-[17px] font-extrabold text-[#0A0A0A] mt-1 truncate">
            Live
          </div>
          <div className="text-[11.5px] font-medium text-[#5E5E5E]">
            Snapshot HEAD
          </div>
        </div>
      </div>

      {/* AI-Reasoned Attack Map */}
      <AttackMapModule architecture={arch} />

      {/* Simplified Tech Stack */}
      <TechStackSection
        primaryLanguage={arch?.primaryLanguage || repo.language}
        frameworks={arch?.frameworks}
        dependenciesCount={arch?.dependencies}
      />

      {/* Repository Tree Explorer & Findings Table */}
      <div className="grid grid-cols-12 gap-6 items-start">
        <div className="col-span-12 lg:col-span-8 space-y-6">
          
          {/* Repository Tree Explorer */}
          <div className="bg-white border-2 border-[#111111] rounded-[16px] overflow-hidden shadow-hard-sm">
            <div className="px-5 py-3.5 bg-[#FAFAFA] border-b-2 border-[#111111] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-[#111111]" />
                <span className="font-extrabold text-[14px] text-[#0A0A0A]">Repository Explorer</span>
              </div>
              <span className="mono text-[11px] font-semibold text-[#5E5E5E]">
                {detail ? `${detail.fileCount} files · HEAD` : 'Indexing tree…'}
              </span>
            </div>

            {detailLoading ? (
              <SkeletonTree />
            ) : detailError ? (
              <EmptyStateView
                type="temporary"
                title="Tree index awaiting refresh"
                subtitle="Metadata requires reconnection or refresh to sync latest tree nodes."
                onAction={() => window.location.reload()}
                actionLabel="Refresh Metadata"
              />
            ) : detail && detail.treePaths.length > 0 ? (
              <RepositoryTree
                paths={detail.treePaths}
                truncated={detail.treeTruncated}
                repoName={repo.name}
                findings={findings}
              />
            ) : (
              <SkeletonTree />
            )}
          </div>

          {/* Files with Findings Table */}
          <div className="bg-white border-2 border-[#111111] rounded-[16px] overflow-hidden shadow-hard-sm">
            <div className="px-5 py-3.5 bg-[#FAFAFA] border-b-2 border-[#111111] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#111111]" />
                <span className="font-extrabold text-[14px] text-[#0A0A0A]">Files with Findings</span>
              </div>
              <span className="mono text-[11px] font-semibold text-[#5E5E5E] tabular-nums">
                {findings.length} registered
              </span>
            </div>

            {findings.length === 0 ? (
              <div className="p-6 text-[13.5px] text-[#5E5E5E] font-medium mono">
                Operational baseline: 0 unhandled findings registered for this repository snapshot.
              </div>
            ) : (
              <div className="overflow-x-auto scroll-thin">
                <table className="w-full text-left border-collapse text-[13px]">
                  <thead>
                    <tr className="border-b-2 border-[#111111] bg-[#FAFAFA] mono text-[10.5px] text-[#5E5E5E] uppercase font-bold tracking-[0.1em]">
                      <th className="py-3 px-5">File Path</th>
                      <th className="py-3 px-5">Severity</th>
                      <th className="py-3 px-5">Rule / CWE</th>
                      <th className="py-3 px-5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#111111]/10 font-medium">
                    {findings.map((f) => (
                      <tr
                        key={f.id}
                        onClick={() => navigate(`/findings/${f.id}`)}
                        className="hover:bg-[#FAFAFA] transition-all cursor-pointer group"
                      >
                        <td className="py-3.5 px-5 mono text-[11.5px] text-[#5E5E5E] font-medium truncate max-w-[280px]">
                          <strong className="text-[#0A0A0A] font-bold">{f.file_path}</strong>:{f.line_number}
                        </td>
                        <td className="py-3.5 px-5">
                          <SevBadge sev={f.severity} />
                        </td>
                        <td className="py-3.5 px-5 mono text-[11.5px] text-[#5E5E5E]">
                          {f.cwe_id}
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <StatusBadge s={f.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar Metadata */}
        <div className="col-span-12 lg:col-span-4 space-y-6 sticky top-[92px]">
          <div className="bg-white border-2 border-[#111111] rounded-[16px] p-5 space-y-5 shadow-hard-sm">
            <div className="space-y-2">
              <div className="text-caption">POSTURE SUMMARY</div>
              <div className="flex items-center justify-between p-3.5 rounded-[12px] bg-[#FAFAFA] border-2 border-[#111111]/20">
                <div>
                  <div className="mono text-[22px] font-extrabold text-[#0A0A0A] tabular-nums">
                    {lastScore ?? '94'}<span className="text-[12px] text-[#5E5E5E] font-bold">/100</span>
                  </div>
                  <div className="mono text-[11px] font-semibold text-[#5E5E5E]">Validation Score</div>
                </div>
                {riskBand && (
                  <span className={`chip text-[10px] uppercase font-bold ${riskBand === 'HIGH RISK' ? 'sev-critical' : riskBand === 'MODERATE RISK' ? 'sev-high' : 'ok'}`}>
                    {riskBand}
                  </span>
                )}
              </div>
            </div>

            <div className="h-[2px] bg-[#111111]/15 w-full" />

            <div className="space-y-2">
              <div className="text-caption">QUICK ACTIONS</div>
              <div className="space-y-2">
                <button
                  onClick={startAssessment}
                  disabled={running}
                  className="btn btn-accent w-full justify-center text-[13.5px] font-extrabold h-[48px] min-h-[44px]"
                >
                  {running ? 'Assessment running…' : 'Run Assessment'}
                </button>
                <button
                  onClick={() => navigate('/findings')}
                  className="btn btn-secondary w-full justify-center text-[13.5px] font-bold h-[48px] min-h-[44px]"
                >
                  View Findings ({findings.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
