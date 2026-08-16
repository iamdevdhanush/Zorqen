import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { File, Folder, Play } from 'lucide-react';
import { BackLink, EmptyState, PageHeader, Panel, SevBadge } from '../components/ui';
import { useWorkspace, useFindings } from '../store/WorkspaceContext';
import { getRepoDetail } from '../services/api';
import type { RepoDetail } from '../lib/types';

function Tree({ paths, truncated }: { paths: string[]; truncated: boolean }) {
  return (
    <div className="mono text-[11.5px] leading-[19px] px-2 py-1 overflow-x-auto" style={{ background: 'var(--color-base)' }}>
      {paths.map((p, i) => {
        const isDir = p.endsWith('/');
        const name = p.split('/').pop() || '/';
        const depth = p.split('/').filter(Boolean).length - 1;
        return (
          <div key={`${p}-${i}`} style={{ paddingLeft: depth * 12 }} className="truncate">
            {isDir ? (
              <><Folder className="w-[11px] h-[11px] inline mr-1" style={{ color: 'var(--color-low)' }} /><span style={{ color: 'var(--color-ink-2)' }}>{name}/</span></>
            ) : (
              <><File className="w-[11px] h-[11px] inline mr-1" style={{ color: 'var(--color-ink-3)' }} /><span style={{ color: 'var(--color-ink)' }}>{name}</span></>
            )}
          </div>
        );
      })}
      {truncated && (
        <div className="mt-2 px-2 py-1.5 rounded border border-[#111111] text-[#666666] bg-[#FAFAFA]">
          Tree truncated — showing the first {paths.length} paths from GitHub.
        </div>
      )}
    </div>
  );
}

export default function RepositoryDetailPage() {
  useParams();
  const { currentRepo, currentAssessment, startAssessment } = useWorkspace();
  const findings = useFindings();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<RepoDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentRepo) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    getRepoDetail(currentRepo.id)
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
  }, [currentRepo]);

  if (!currentRepo) {
    return (
      <div className="max-w-[1080px] mx-auto space-y-3 fade-in">
        <BackLink to="/repos" label="Repositories" />
        <PageHeader kicker="raksha://workspace/repositories" title="REPOSITORY DETAIL" />
        <div className="p-8 sm:p-12 text-center text-[#666666] mono text-[13px] bg-white border border-[#111111] rounded-xl shadow-hard">
          No repository loaded — select a repository from the Repositories page.
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
            <Tree paths={detail.treePaths} truncated={detail.treeTruncated} />
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
