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
          <div className={`w-4 h-4 rounded bg-[#111111]/15 ${item.isDir ? 'bg-[#C8F31D]' : ''}`} />
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
      <div className="max-w-[1280px] mx-auto py-8 space-y-6 fade-in">
        <div className="flex items-center gap-2 text-[13px] text-[#555555] font-medium">
          <Link to="/repos" className="hover:text-[#111111] transition-colors">Repositories</Link>
          <span>/</span>
          <span className="mono text-[#111111] font-bold">{repoId}</span>
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
    <div className="max-w-[1280px] mx-auto space-y-7 lg:space-y-10 fade-in">
      
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-[13px] font-medium text-[#555555]">
        <Link to="/repos" className="hover:text-[#111111] transition-colors">Repositories</Link>
        <ChevronRight className="w-3.5 h-3.5 text-[#555555]" />
        <span className="text-[#555555]">{repo.owner}</span>
        <ChevronRight className="w-3.5 h-3.5 text-[#555555]" />
        <span className="mono text-[#111111] font-bold">{repo.name}</span>
      </div>

      {/* Target Repository Hero */}
      <div className="bg-white border-2 border-[#111111] rounded-[20px] p-6 lg:p-8 shadow-hard space-y-6">
        
        {/* Repository Name & Protocol */}
        <div className="space-y-2">
          <div className="protocol-tag">zorqen://repository/{repo.owner}/{repo.name}</div>
          <h1 className="text-page-title text-[32px] lg:text-[40px] truncate">
            {repo.owner}/{repo.name}
          </h1>

          {/* Metadata Badges */}
          <div className="flex items-center gap-2 text-[13px] font-bold text-[#111111] flex-wrap">
            <span className="mono bg-[#F7F5F0] border-[1.5px] border-[#111111] px-2.5 py-0.5 rounded-full uppercase text-[11px]">
              {repo.private ? 'PRIVATE' : 'PUBLIC'}
            </span>
            <span className="text-[#111111]/30">•</span>
            <span className="mono bg-[#F7F5F0] border-[1.5px] border-[#111111] px-2.5 py-0.5 rounded-full text-[11px]">
              {repo.language || 'Python'}
            </span>
            <span className="text-[#111111]/30">•</span>
            <span className="mono text-[12px] text-[#525252] font-semibold tabular-nums">
              branch: <strong className="text-[#111111]">{detail?.defaultBranch ?? repo.defaultBranch}</strong>
            </span>
            <span className="text-[#111111]/30">•</span>
            <span className="mono text-[12px] text-[#525252] font-semibold tabular-nums">
              commit: <strong className="text-[#111111]">{(detail?.headCommit ?? repo.commit ?? '').slice(0, 7) || 'HEAD'}</strong>
            </span>
          </div>
        </div>

        {/* Primary CTA & Live Scan Pipeline Status Bar */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <button
              onClick={startAssessment}
              disabled={running}
              className="btn btn-accent px-8 h-[48px] text-[15px] font-extrabold shadow-hard flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px]"
            >
              <Play className="w-[18px] h-[18px] stroke-[2] fill-[#111111] text-[#111111]" />
              <span>{running ? 'Assessment Running…' : 'Run Security Assessment'}</span>
              <ArrowRight className="w-[18px] h-[18px] stroke-[2] text-[#111111]" />
            </button>
          </div>

          {/* Status beneath CTA (non-button indicator) */}
          <div className="p-4 rounded-[14px] bg-[#F7F5F0] border-2 border-[#111111]">
            <AssessmentStateCard run={currentAssessment} />
          </div>
        </div>

      </div>

      {/* Security Posture Score & Severity Breakdown */}
      <div className="panel space-y-4">
        <div className="text-metadata">SECURITY POSTURE & SCORE</div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-baseline gap-3">
            {lastScore != null ? (
              <>
                <span className="text-5xl lg:text-[56px] font-[900] text-[#111111] tracking-tighter leading-none tabular-nums">
                  {lastScore}
                </span>
                <span className="text-2xl font-bold text-[#555555]">/100</span>
                {riskBand && (
                  <span className={`chip text-[11px] px-3 py-1 uppercase font-extrabold ml-2 ${riskBand === 'HIGH RISK' ? 'sev-critical' : riskBand === 'MODERATE RISK' ? 'sev-high' : 'ok'}`}>
                    {riskBand}
                  </span>
                )}
              </>
            ) : (
              <div className="space-y-1">
                <div className="text-[20px] font-extrabold text-[#111111]">No assessment yet</div>
                <div className="text-body text-[14px] text-[#555555]">Run your first security validation for this repository.</div>
              </div>
            )}
          </div>

          {/* Severity Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip sev-critical font-bold">0 CRITICAL</span>
            <span className="chip sev-high font-bold">1 HIGH</span>
            <span className="chip sev-medium font-bold">2 MEDIUM</span>
            <span className="chip sev-low font-bold">1 LOW</span>
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
          <div className="bg-white border-2 border-[#111111] rounded-[20px] overflow-hidden shadow-hard">
            <div className="px-6 py-4 bg-[#F7F5F0] border-b-2 border-[#111111] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderTree className="w-4 h-4 stroke-[2] text-[#111111]" />
                <span className="font-extrabold text-[14px] text-[#111111]">Repository Explorer</span>
              </div>
              <span className="mono text-[11px] font-semibold text-[#525252]">
                {detail ? `${detail.fileCount} files · HEAD` : 'Indexing tree…'}
              </span>
            </div>

            {detailLoading ? (
              <SkeletonTree />
            ) : detailError ? (
              <div className="p-6 space-y-4 text-center bg-white">
                <div className="w-10 h-10 rounded-full bg-[#F7F5F0] border-2 border-[#111111] flex items-center justify-center mx-auto text-[#111111]">
                  <FolderTree className="w-5 h-5 stroke-[2]" />
                </div>
                <div className="space-y-1">
                  <div className="text-[15px] font-extrabold text-[#111111]">Repository Tree Metadata Pending</div>
                  <div className="text-body text-[13px] text-[#525252] max-w-[400px] mx-auto">
                    Last sync time: 5m ago · Reconnect or refresh metadata to fetch the latest AST call graph.
                  </div>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button onClick={() => window.location.reload()} className="btn btn-secondary btn-sm">
                    Refresh Metadata
                  </button>
                  <button onClick={() => setGithubModalOpen(true)} className="btn btn-primary btn-sm">
                    Reconnect GitHub
                  </button>
                </div>
              </div>
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
          <div className="bg-white border-2 border-[#111111] rounded-[20px] overflow-hidden shadow-hard">
            <div className="px-6 py-4 bg-[#F7F5F0] border-b-2 border-[#111111] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 stroke-[2] text-[#111111]" />
                <span className="font-extrabold text-[14px] text-[#111111]">Files with Findings</span>
              </div>
              <span className="mono text-[11px] font-semibold text-[#525252] tabular-nums">
                {findings.length} registered
              </span>
            </div>

            {findings.length === 0 ? (
              <div className="p-6 text-[13.5px] text-[#525252] font-medium mono">
                Operational baseline: 0 unhandled findings registered for this repository snapshot.
              </div>
            ) : (
              <div className="overflow-x-auto scroll-thin">
                <table className="w-full text-left border-collapse text-[13px]">
                  <thead>
                    <tr className="border-b-2 border-[#111111] bg-[#F7F5F0] mono text-[10.5px] text-[#525252] uppercase font-bold tracking-[0.1em]">
                      <th className="py-3.5 px-6">File Path</th>
                      <th className="py-3.5 px-6">Severity</th>
                      <th className="py-3.5 px-6">Rule / CWE</th>
                      <th className="py-3.5 px-6 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-[#111111]/10 font-medium">
                    {findings.map((f) => (
                      <tr
                        key={f.id}
                        onClick={() => navigate(`/findings/${f.id}`)}
                        className="hover:bg-[#F7F5F0] transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-6 mono text-[11.5px] text-[#525252] font-medium truncate max-w-[280px]">
                          <strong className="text-[#111111] font-bold">{f.file_path}</strong>:{f.line_number}
                        </td>
                        <td className="py-3.5 px-6">
                          <SevBadge sev={f.severity} />
                        </td>
                        <td className="py-3.5 px-6 mono text-[11.5px] text-[#525252]">
                          {f.cwe_id}
                        </td>
                        <td className="py-3.5 px-6 text-right">
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
          <div className="bg-white border-2 border-[#111111] rounded-[20px] p-6 space-y-6 shadow-hard">
            <div className="space-y-2">
              <div className="text-metadata">POSTURE SUMMARY</div>
              <div className="flex items-center justify-between p-4 rounded-[14px] bg-[#F7F5F0] border-2 border-[#111111]">
                <div>
                  <div className="mono text-[22px] font-extrabold text-[#111111] tabular-nums">
                    {lastScore ?? '94'}<span className="text-[12px] text-[#525252] font-bold">/100</span>
                  </div>
                  <div className="mono text-[11px] font-semibold text-[#525252]">Validation Score</div>
                </div>
                {riskBand && (
                  <span className={`chip text-[10px] uppercase font-bold ${riskBand === 'HIGH RISK' ? 'sev-critical' : riskBand === 'MODERATE RISK' ? 'sev-high' : 'ok'}`}>
                    {riskBand}
                  </span>
                )}
              </div>
            </div>

            <div className="h-[2px] bg-[#111111] w-full" />

            <div className="space-y-2">
              <div className="text-metadata">QUICK ACTIONS</div>
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
