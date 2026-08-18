import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Play } from 'lucide-react';
import { BackLink, EmptyState, PageHeader, Panel, SevBadge } from '../components/ui';
import RepositoryTree from '../components/RepositoryTree';
import { useWorkspace, useFindings } from '../store/WorkspaceContext';
import { getRepoDetail } from '../services/api';
import api from '../services/api';
import type { RepoDetail, RepoMeta } from '../lib/types';

/** Read and validate the JWT from localStorage without importing the context. */
function localTokenValid(): boolean {
  const token = localStorage.getItem('raksha_token');
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

export default function RepositoryDetailPage() {
  const { repoId } = useParams<{ repoId: string }>();
  const { currentRepo, currentAssessment, startAssessment, loadRepo, authReady } = useWorkspace();
  const findings = useFindings();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<RepoDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [repoLoading, setRepoLoading] = useState(false);

  // When currentRepo doesn't match the URL repoId, try to fetch the repo.
  // This handles direct URL navigation (e.g. bookmark to /repos/1331115680)
  // where the workspace context is cold. The /repositories/github/{id} endpoint
  // auto-connects the repo by GitHub integer ID.
  //
  // CRITICAL: must NOT run until authReady=true AND a valid token exists.
  // Without this guard, a 401 clearing currentRepo → effect fires → loadRepo →
  // loadAssessments → 401 again → infinite loop at ~0.5 s intervals.
  useEffect(() => {
    if (!repoId) return;
    if (!authReady) return;   // wait until session restore has completed
    if (!localTokenValid()) return; // do not hit auth-gated endpoints without a JWT

    // Check if currentRepo matches either by GitHub integer ID or RAKSHA UUID
    const matchesCurrent = Boolean(
      currentRepo && (
        currentRepo.id === repoId ||
        String(currentRepo.id) === String(repoId) ||
        (currentRepo.rakshaId && currentRepo.rakshaId === repoId)
      )
    );
    if (matchesCurrent) return;

    let cancelled = false;
    setRepoLoading(true);
    // Try GitHub integer ID auto-connect endpoint first
    api.get(`/repositories/github/${repoId}`)
      .then(({ data }) => {
        if (!cancelled) {
          loadRepo(data as RepoMeta);
        }
      })
      .catch(() => {
        // Fall back: try direct RAKSHA UUID lookup
        api.get(`/repositories/${repoId}`)
          .then(({ data }) => {
            if (!cancelled) loadRepo(data as RepoMeta);
          })
          .catch(() => {
            // Repository not accessible — detail fetch will show the error
          });
      })
      .finally(() => {
        if (!cancelled) setRepoLoading(false);
      });
    return () => { cancelled = true; };
  }, [repoId, currentRepo?.id, currentRepo?.rakshaId, loadRepo, authReady]);

  // Fetch detail once we have a valid currentRepo that matches our URL.
  // Gated on authReady and token validity to prevent auth-race requests.
  useEffect(() => {
    if (!currentRepo) {
      setDetail(null);
      return;
    }
    if (!authReady || !localTokenValid()) return;
    let cancelled = false;
    const targetId = currentRepo.rakshaId || currentRepo.id;
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
  }, [currentRepo?.id, currentRepo?.rakshaId, authReady]);

  if (!currentRepo) {
    return (
      <div className="max-w-[1080px] mx-auto space-y-3 fade-in">
        <BackLink to="/repos" label="Repositories" />
        <PageHeader kicker="raksha://workspace/repositories" title="REPOSITORY DETAIL" />
        <div className="p-8 sm:p-12 text-center text-[#666666] mono text-[13px] bg-white border border-[#111111] rounded-xl shadow-hard">
          {repoLoading
            ? 'Connecting repository from GitHub…'
            : repoId
            ? `Repository ${repoId} not accessible — ensure you are connected to GitHub with the correct account.`
            : 'No repository loaded — select a repository from the Repositories page.'}
        </div>
      </div>
    );
  }

  const repo = currentRepo;
  const running = currentAssessment?.status === 'RUNNING';
  const lastScore = currentAssessment?.score;
  const riskBand = lastScore == null ? null : lastScore >= 80 ? 'LOW RISK' : lastScore >= 60 ? 'MODERATE RISK' : 'HIGH RISK';

  const langTotal = detail?.languages ? Object.values(detail.languages).reduce((a, b) => a + b, 0) : 0;
  const topLanguages = detail?.languages ? Object.entries(detail.languages).sort((a, b) => b[1] - a[1]).slice(0, 6) : [];

  return (
    <div className="max-w-[1080px] mx-auto space-y-3 fade-in">
      <div className="flex items-center gap-2">
        <BackLink to="/repos" label="Repositories" />
        <span className="mono text-[10px] text-[var(--color-ink-3)]">/</span>
        <span className="mono text-[11px] text-[var(--color-ink-2)]">{repo.name}</span>
      </div>

      <PageHeader
        kicker={`${repo.owner}/${repo.name}`}
        title={
          <span className="flex items-center gap-2 flex-wrap">
            <span className="mono">{repo.name}</span>
            <span className="chip">{repo.private ? 'PRIVATE' : 'PUBLIC'}</span>
            <span className="chip">{repo.language}</span>
            <span className="chip mono text-[10px]">{detail?.defaultBranch ?? repo.defaultBranch} · {(detail?.headCommit ?? repo.commit ?? '').slice(0, 7) || '—'}</span>
          </span>
        }
        right={
          <>
            {riskBand && (
              <span className={`chip text-[11.5px] uppercase font-bold ${riskBand === 'HIGH RISK' ? 'sev-critical' : riskBand === 'MODERATE RISK' ? 'sev-high' : 'ok'}`}>
                {riskBand} · {lastScore}/100
              </span>
            )}
            <button onClick={startAssessment} disabled={running} className="btn btn-primary">
              <Play className="w-3 h-3" />
              {running ? 'Assessment running…' : 'Run Assessment'}
            </button>
          </>
        }
      />

      <div className="grid lg:grid-cols-[1fr_260px] gap-3 items-start">
        {/* Repository tree */}
        <Panel
          title={`Repository tree · ${repo.name}`}
          right={
            <span className="mono text-[9.5px] text-[var(--color-ink-3)]">
              {detail ? `${detail.fileCount} files · HEAD` : '…'}
            </span>
          }
          flush
        >
          {detailLoading ? (
            <div className="p-6 text-center text-[var(--color-ink-3)] mono text-[12px]">Loading repository tree from GitHub…</div>
          ) : detailError ? (
            <div className="p-6 text-center text-[var(--color-ink-3)] mono text-[12px]">
              Could not load repository tree — {detailError}
            </div>
          ) : detail && detail.treePaths.length > 0 ? (
            <RepositoryTree
              paths={detail.treePaths}
              truncated={detail.treeTruncated}
              repoName={repo.name}
              findings={findings}
            />
          ) : (
            <div className="p-6 text-center text-[var(--color-ink-3)] mono text-[12px]">
              {detail ? 'No files found in this repository tree.' : 'Run an assessment to populate the repository tree.'}
            </div>
          )}
        </Panel>

        {/* Stack metadata */}
        <div className="space-y-3">
          <Panel title="LANGUAGE" flush>
            <div className="px-3 py-1.5">
              {detailLoading ? (
                <div className="text-[11px] text-[var(--color-ink-3)] mono py-1">Loading…</div>
              ) : topLanguages.length === 0 ? (
                <div className="text-[11px] text-[var(--color-ink-3)] mono py-1">No language data</div>
              ) : (
                topLanguages.map(([lang, bytes]) => {
                  const w = langTotal > 0 ? Math.max(2, Math.round((bytes / langTotal) * 100)) : 2;
                  return (
                    <div key={lang} className="py-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[var(--color-ink-2)]">{lang}</span>
                        <span className="mono text-[var(--color-ink)]">{w}%</span>
                      </div>
                      <div className="thin-bar mt-[3px]">
                        <div style={{ width: `${w}%`, background: 'var(--color-accent)' }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Panel>

          <Panel title="REPOSITORY" flush>
            <div className="px-3 py-1.5">
              {[
                ['default branch', detail?.defaultBranch ?? '—'],
                ['head commit', detail?.headCommit ? detail.headCommit.slice(0, 7) : repo.commit?.slice(0, 7) ?? '—'],
                ['files', detail ? String(detail.fileCount) : '—'],
                ['visibility', repo.private ? 'PRIVATE' : 'PUBLIC'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-[2px] border-b border-[var(--color-line)] last:border-0">
                  <span className="text-[9.5px] uppercase tracking-[0.06em] text-[var(--color-ink-3)] font-medium">{k}</span>
                  <span className="mono text-[10.5px] text-[var(--color-ink)]">{v}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Next actions" flush>
            <div className="p-2 space-y-1">
              <button onClick={startAssessment} disabled={running} className="btn btn-sm w-full justify-center">
                {running ? 'Assessment running…' : 'Run Assessment'}
              </button>
              <button onClick={() => navigate('/findings')} className="btn btn-sm w-full justify-center">
                Findings ({findings.length})
              </button>
              {findings.length > 0 && (
                <button onClick={() => navigate(`/findings/${findings[0].id}`)} className="btn btn-sm w-full justify-center">
                  Open {findings[0].id}
                </button>
              )}
            </div>
          </Panel>
        </div>
      </div>

      {/* Files flagged in this tree */}
      <Panel title="Files with findings" flush>
        {findings.length === 0 ? (
          <EmptyState text="No findings registered for this repository yet — run an assessment first." />
        ) : (
          <div>
            {findings.map((f) => (
              <button
                key={f.id}
                onClick={() => navigate(`/findings/${f.id}`)}
                className="w-full text-left flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 px-3 py-2 sm:py-[6px] border-b border-[var(--color-line)] last:border-0 hover:bg-[var(--color-hover)] transition-colors group"
              >
                <SevBadge sev={f.severity} />
                <span className="mono text-[10.5px] sm:text-[11px] text-[var(--color-ink)] break-all">{f.file_path}:{f.line_number}</span>
                <span className="text-[11.5px] text-[var(--color-ink-2)] truncate flex-1 min-w-0">{f.title}</span>
                <span className="chip ml-auto mono text-[9px]">{f.cwe_id}</span>
              </button>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
