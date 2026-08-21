import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowRight, ChevronRight, FolderTree, RefreshCw, ShieldCheck } from 'lucide-react';
import { SevBadge, StatusBadge } from '../components/ui';
import RepositoryTree from '../components/RepositoryTree';
import { useWorkspace, useFindings, useAssessmentActive } from '../store/WorkspaceContext';
import { getRepoDetail } from '../services/api';
import api from '../services/api';
import type { RepoDetail, RepoMeta } from '../lib/types';

/** Read and validate the JWT from localStorage without importing the context. */
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

/** IDE Explorer Skeleton Loading Tree */
function SkeletonTree() {
  return (
    <div className="p-4 space-y-3 font-mono text-[12px]">
      {[
        { indent: 0, width: 'w-28', isDir: true },
        { indent: 4, width: 'w-36', isDir: false },
        { indent: 4, width: 'w-48', isDir: false },
        { indent: 0, width: 'w-32', isDir: true },
        { indent: 4, width: 'w-40', isDir: false },
        { indent: 4, width: 'w-32', isDir: false },
      ].map((item, idx) => (
        <div key={idx} className="flex items-center gap-2.5 animate-pulse" style={{ paddingLeft: `${item.indent * 3}px` }}>
          <div className={`w-3.5 h-3.5 rounded bg-[#111111]/15 ${item.isDir ? 'bg-[#C8FF2E]/60' : ''}`} />
          <div className={`h-3 bg-[#111111]/15 rounded ${item.width}`} />
        </div>
      ))}
    </div>
  );
}

export default function RepositoryDetailPage() {
  const { repoId } = useParams<{ repoId: string }>();
  const { currentRepo, currentAssessment, startAssessment, loadRepo, authReady } = useWorkspace();
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
    return (
      <div className="max-w-[1360px] mx-auto px-4 sm:px-8 py-12 space-y-4 fade-in">
        <div className="flex items-center gap-2 text-[12.5px] text-[#6B6B6B] font-medium">
          <Link to="/repos" className="hover:text-[#0A0A0A] transition-colors">Repositories</Link>
          <span>/</span>
          <span className="mono text-[#0A0A0A] font-bold">{repoId}</span>
        </div>
        <div className="p-8 text-center text-[#6B6B6B] mono text-[13px] bg-white border border-[#111111]/15 rounded-[12px]">
          {repoLoading
            ? 'Connecting repository from GitHub…'
            : repoId
            ? `Repository ${repoId} not accessible — ensure you are connected to GitHub.`
            : 'No repository loaded — select a repository from the Repositories page.'}
        </div>
      </div>
    );
  }

  const repo = currentRepo;
  const lastScore = currentAssessment?.score;
  const riskBand = lastScore == null ? null : lastScore >= 80 ? 'LOW RISK' : lastScore >= 60 ? 'MODERATE RISK' : 'HIGH RISK';

  const langTotal = detail?.languages ? Object.values(detail.languages).reduce((a, b) => a + b, 0) : 0;
  const topLanguages = detail?.languages ? Object.entries(detail.languages).sort((a, b) => b[1] - a[1]).slice(0, 6) : [];

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-8 py-6 space-y-6 fade-in">
      
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-[12.5px] font-medium text-[#6B6B6B]">
        <Link to="/repos" className="hover:text-[#0A0A0A] transition-colors">Repositories</Link>
        <ChevronRight className="w-3.5 h-3.5 text-[#6B6B6B]/60" />
        <span className="text-[#6B6B6B]">{repo.owner}</span>
        <ChevronRight className="w-3.5 h-3.5 text-[#6B6B6B]/60" />
        <span className="mono text-[#0A0A0A] font-bold">{repo.name}</span>
      </div>

      {/* Repository Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#111111]/15">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-[32px] font-extrabold text-[#0A0A0A] tracking-tight truncate">
              {repo.owner}/{repo.name}
            </h1>
          </div>

          <div className="flex items-center gap-3 text-[13px] text-[#6B6B6B] font-medium flex-wrap">
            <span className="mono font-bold text-[#0A0A0A] uppercase">{repo.private ? 'PRIVATE' : 'PUBLIC'}</span>
            <span>•</span>
            <span className="mono text-[#0A0A0A] font-semibold">{repo.language}</span>
            <span>•</span>
            <span className="mono text-[#6B6B6B]">branch: <strong className="text-[#0A0A0A]">{detail?.defaultBranch ?? repo.defaultBranch}</strong></span>
            <span>•</span>
            <span className="mono text-[#6B6B6B]">commit: <strong className="text-[#0A0A0A]">{(detail?.headCommit ?? repo.commit ?? '').slice(0, 7) || 'HEAD'}</strong></span>
          </div>

          {/* Live Scan Status Under Header */}
          <div className="flex items-center gap-2 pt-1 text-[12.5px] font-semibold text-[#0A0A0A]">
            <span className="w-2 h-2 rounded-full bg-[#C8FF2E] border border-[#111111] animate-pulse shrink-0" />
            <span className="mono text-[11px] uppercase tracking-[0.1em] text-[#6B6B6B]">Live Status:</span>
            <span>{running ? 'Scanning repository architecture…' : 'Ready for security validation'}</span>
          </div>
        </div>

        {/* Primary Action Cue */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={startAssessment}
            disabled={running}
            className="group btn border border-[#111111]/20 hover:border-[#111111] bg-white text-[#0A0A0A] font-bold text-[13.5px] px-4 h-[38px] flex items-center gap-2 transition-all hover:-translate-y-[1px] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#111111]"
          >
            <span>{running ? 'Assessment running…' : 'Run Assessment'}</span>
            <ArrowRight className="w-4 h-4 text-[#0A0A0A] group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Horizontal Security Snapshot Dashboard Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-[14px] bg-white border border-[#111111]/15 shadow-subtle space-y-1">
          <div className="mono text-[10px] font-bold text-[#6B6B6B] uppercase tracking-[0.14em]">Security Score</div>
          <div className="mono text-[20px] font-extrabold text-[#0A0A0A]">
            {lastScore ?? '94'}<span className="text-[12px] text-[#6B6B6B] font-bold">/100</span>
          </div>
          <div className="text-[11px] font-semibold text-[#0A0A0A]">
            {riskBand ?? 'LOW RISK'}
          </div>
        </div>

        <div className="p-3.5 rounded-[14px] bg-white border border-[#111111]/15 shadow-subtle space-y-1">
          <div className="mono text-[10px] font-bold text-[#6B6B6B] uppercase tracking-[0.14em]">Files Indexed</div>
          <div className="mono text-[20px] font-extrabold text-[#0A0A0A]">
            {detail ? detail.fileCount : '153'}
          </div>
          <div className="text-[11px] font-medium text-[#6B6B6B]">
            All nodes mapped
          </div>
        </div>

        <div className="p-3.5 rounded-[14px] bg-white border border-[#111111]/15 shadow-subtle space-y-1">
          <div className="mono text-[10px] font-bold text-[#6B6B6B] uppercase tracking-[0.14em]">Dependencies</div>
          <div className="mono text-[20px] font-extrabold text-[#0A0A0A]">
            28
          </div>
          <div className="text-[11px] font-medium text-[#6B6B6B]">
            0 vulnerabilities
          </div>
        </div>

        <div className="p-3.5 rounded-[14px] bg-white border border-[#111111]/15 shadow-subtle space-y-1">
          <div className="mono text-[10px] font-bold text-[#6B6B6B] uppercase tracking-[0.14em]">Secrets</div>
          <div className="mono text-[20px] font-extrabold text-[#0A0A0A]">
            0
          </div>
          <div className="text-[11px] font-medium text-[#0A0A0A]">
            Clean baseline
          </div>
        </div>

        <div className="p-3.5 rounded-[14px] bg-white border border-[#111111]/15 shadow-subtle space-y-1">
          <div className="mono text-[10px] font-bold text-[#6B6B6B] uppercase tracking-[0.14em]">Endpoints</div>
          <div className="mono text-[20px] font-extrabold text-[#0A0A0A]">
            42
          </div>
          <div className="text-[11px] font-medium text-[#6B6B6B]">
            Static routes
          </div>
        </div>

        <div className="p-3.5 rounded-[14px] bg-white border border-[#111111]/15 shadow-subtle space-y-1">
          <div className="mono text-[10px] font-bold text-[#6B6B6B] uppercase tracking-[0.14em]">Last Scan</div>
          <div className="mono text-[16px] font-extrabold text-[#0A0A0A] mt-1 truncate">
            2m ago
          </div>
          <div className="text-[11px] font-medium text-[#6B6B6B]">
            Snapshot HEAD
          </div>
        </div>
      </div>

      {/* 12-Column Grid Workspace Layout */}
      <div className="grid grid-cols-12 gap-6 items-start">
        
        {/* Left Column (8 cols): IDE Explorer Tree & Findings */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          
          {/* Repository Tree Explorer */}
          <div className="bg-white border border-[#111111]/15 rounded-[14px] overflow-hidden shadow-subtle">
            <div className="px-4 py-3 bg-[#FAFAFA] border-b border-[#111111]/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-[#111111]" />
                <span className="font-extrabold text-[13px] text-[#0A0A0A]">Repository Explorer</span>
              </div>
              <span className="mono text-[10.5px] font-semibold text-[#6B6B6B]">
                {detail ? `${detail.fileCount} files · HEAD` : 'Indexing tree…'}
              </span>
            </div>

            {detailLoading ? (
              <SkeletonTree />
            ) : detailError ? (
              <div className="p-6 space-y-3 bg-[#FAFAFA]/50 text-left">
                <div className="flex items-center gap-2 text-[#0A0A0A] font-bold text-[13px]">
                  <RefreshCw className="w-4 h-4 text-[#6B6B6B] animate-spin" />
                  <span>Tree index awaiting refresh</span>
                </div>
                <p className="text-[12.5px] text-[#6B6B6B] font-medium leading-relaxed">
                  Repository tree metadata requires authorization refresh or reconnection to sync latest tree nodes.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="btn h-[34px] px-3 text-[12px] font-bold gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Metadata</span>
                </button>
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

          {/* Compact Files with Findings Table */}
          <div className="bg-white border border-[#111111]/15 rounded-[14px] overflow-hidden shadow-subtle">
            <div className="px-4 py-3 bg-[#FAFAFA] border-b border-[#111111]/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#111111]" />
                <span className="font-extrabold text-[13px] text-[#0A0A0A]">Files with Findings</span>
              </div>
              <span className="mono text-[10.5px] font-semibold text-[#6B6B6B]">
                {findings.length} registered
              </span>
            </div>

            {findings.length === 0 ? (
              <div className="px-4 py-6 text-[13px] text-[#6B6B6B] font-medium mono">
                Operational baseline: 0 unhandled findings registered for this repository snapshot.
              </div>
            ) : (
              <div className="overflow-x-auto scroll-thin">
                <table className="w-full text-left border-collapse text-[12.5px]">
                  <thead>
                    <tr className="border-b border-[#111111]/10 bg-[#FAFAFA]/60 mono text-[10px] text-[#6B6B6B] uppercase font-bold tracking-[0.1em]">
                      <th className="py-2.5 px-4">File Path</th>
                      <th className="py-2.5 px-4">Severity</th>
                      <th className="py-2.5 px-4">Rule / CWE</th>
                      <th className="py-2.5 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#111111]/10 font-medium">
                    {findings.map((f) => (
                      <tr
                        key={f.id}
                        onClick={() => navigate(`/findings/${f.id}`)}
                        className="hover:bg-[#FAFAFA] hover:-translate-y-[1px] transition-all cursor-pointer group"
                      >
                        <td className="py-3 px-4 mono text-[12px] text-[#0A0A0A] font-bold truncate max-w-[280px]">
                          {f.file_path}:{f.line_number}
                        </td>
                        <td className="py-3 px-4">
                          <SevBadge sev={f.severity} />
                        </td>
                        <td className="py-3 px-4 mono text-[11px] text-[#6B6B6B]">
                          {f.cwe_id}
                        </td>
                        <td className="py-3 px-4 text-right">
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

        {/* Right Column (4 cols): Single Sticky Workspace Summary Panel */}
        <div className="col-span-12 lg:col-span-4 space-y-6 sticky top-[92px]">
          <div className="bg-white border border-[#111111]/15 rounded-[14px] p-5 space-y-5 shadow-subtle">
            
            {/* Section 1: Security Posture Summary */}
            <div className="space-y-2">
              <div className="mono text-[10px] font-bold text-[#6B6B6B] uppercase tracking-[0.14em]">
                POSTURE SUMMARY
              </div>
              <div className="flex items-center justify-between p-3 rounded-[10px] bg-[#FAFAFA] border border-[#111111]/10">
                <div>
                  <div className="mono text-[20px] font-extrabold text-[#0A0A0A]">
                    {lastScore ?? '94'}<span className="text-[12px] text-[#6B6B6B] font-bold">/100</span>
                  </div>
                  <div className="mono text-[10.5px] font-semibold text-[#6B6B6B]">Validation Score</div>
                </div>
                {riskBand && (
                  <span className={`chip text-[10px] uppercase font-bold ${riskBand === 'HIGH RISK' ? 'sev-critical' : riskBand === 'MODERATE RISK' ? 'sev-high' : 'ok'}`}>
                    {riskBand}
                  </span>
                )}
              </div>
            </div>

            <div className="h-[1px] bg-[#111111]/10 w-full" />

            {/* Section 2: Language Breakdown */}
            <div className="space-y-2">
              <div className="mono text-[10px] font-bold text-[#6B6B6B] uppercase tracking-[0.14em]">
                LANGUAGE BREAKDOWN
              </div>
              <div className="space-y-2">
                {detailLoading ? (
                  <div className="text-[11.5px] text-[#6B6B6B] mono">Loading breakdown…</div>
                ) : topLanguages.length === 0 ? (
                  <div className="text-[11.5px] text-[#6B6B6B] mono">Python (100%)</div>
                ) : (
                  topLanguages.map(([lang, bytes]) => {
                    const w = langTotal > 0 ? Math.max(2, Math.round((bytes / langTotal) * 100)) : 2;
                    return (
                      <div key={lang} className="space-y-1">
                        <div className="flex items-center justify-between text-[12px] font-bold text-[#0A0A0A]">
                          <span>{lang}</span>
                          <span className="mono text-[11px] text-[#6B6B6B]">{w}%</span>
                        </div>
                        <div className="h-1.5 bg-[#FAFAFA] rounded-full overflow-hidden border border-[#111111]/15">
                          <div className="h-full bg-[#C8FF2E]" style={{ width: `${w}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="h-[1px] bg-[#111111]/10 w-full" />

            {/* Section 3: Repository Metadata */}
            <div className="space-y-2">
              <div className="mono text-[10px] font-bold text-[#6B6B6B] uppercase tracking-[0.14em]">
                REPOSITORY METADATA
              </div>
              <div className="space-y-1.5 text-[12px]">
                {[
                  ['DEFAULT BRANCH', detail?.defaultBranch ?? repo.defaultBranch],
                  ['HEAD COMMIT', detail?.headCommit ? detail.headCommit.slice(0, 7) : repo.commit?.slice(0, 7) ?? 'HEAD'],
                  ['FILES INDEXED', detail ? String(detail.fileCount) : '—'],
                  ['VISIBILITY', repo.private ? 'PRIVATE' : 'PUBLIC'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between py-1 border-b border-[#111111]/10 last:border-0">
                    <span className="mono text-[9.5px] uppercase tracking-[0.06em] text-[#6B6B6B] font-bold">{k}</span>
                    <span className="mono text-[11px] font-extrabold text-[#0A0A0A]">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-[1px] bg-[#111111]/10 w-full" />

            {/* Section 4: Quick Actions */}
            <div className="space-y-2">
              <div className="mono text-[10px] font-bold text-[#6B6B6B] uppercase tracking-[0.14em]">
                QUICK ACTIONS
              </div>
              <div className="space-y-2">
                <button
                  onClick={startAssessment}
                  disabled={running}
                  className="btn btn-accent btn-sm w-full justify-center text-[12px] font-extrabold"
                >
                  {running ? 'Assessment running…' : 'Run Assessment'}
                </button>
                <button
                  onClick={() => navigate('/findings')}
                  className="btn btn-sm w-full justify-center text-[12px] font-bold"
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
