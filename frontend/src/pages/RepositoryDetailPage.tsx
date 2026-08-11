import { useNavigate, useParams } from 'react-router-dom';
import { File, Folder, Play } from 'lucide-react';
import { BackLink, EmptyState, PageHeader, Panel, SevBadge } from '../components/ui';
import { useWorkspace, useFindings } from '../store/WorkspaceContext';
import { DEMO_REPO, stackFor, treeFor } from '../lib/demo';

function Tree({ repoId }: { repoId: string }) {
  const repo = repoId === DEMO_REPO.id ? DEMO_REPO : { id: 'demo-cyber-portal', name: 'cyber-portal', owner: 'secureops', private: true, language: 'TypeScript', defaultBranch: 'main', commit: 'c91d4fe', isDemo: true };
  const tree = treeFor(repo);
  return (
    <div className="mono text-[11.5px] leading-[19px] px-2 py-1 overflow-x-auto" style={{ background: 'var(--color-base)' }}>
      {tree.map((entry, i) => {
        const connector =
          entry.depth === 0
            ? ''
            : `${'  '.repeat(Math.max(0, entry.depth - 1))}${i > 0 && tree[i - 1].depth < entry.depth && isLastChild(tree, i) ? '└─ ' : '├─ '}`;
        return (
          <div key={i} style={{ paddingLeft: entry.depth * 12 }}>
            <span className="select-none" style={{ color: 'var(--color-ink-3)' }}>{connector}</span>
            {entry.type === 'dir' ? (
              <><Folder className="w-[11px] h-[11px] inline mr-1" style={{ color: 'var(--color-low)' }} /><span style={{ color: 'var(--color-ink-2)' }}>{entry.name}</span></>
            ) : (
              <><File className="w-[11px] h-[11px] inline mr-1" style={{ color: 'var(--color-ink-3)' }} /><span style={{ color: 'var(--color-ink)' }}>{entry.name}</span></>
            )}
          </div>
        );
      })}
    </div>
  );
}

function isLastChild(tree: ReturnType<typeof treeFor>, i: number): boolean {
  const depth = tree[i].depth;
  let j = i + 1;
  while (j < tree.length && tree[j].depth > depth) j++;
  return j === tree.length || tree[j].depth === depth;
}

export default function RepositoryDetailPage() {
  useParams();
  const { currentRepo, currentAssessment, startAssessment } = useWorkspace();
  const findings = useFindings();
  const navigate = useNavigate();

  const repo = currentRepo ?? DEMO_REPO;
  const meta = stackFor(repo);
  const running = currentAssessment?.status === 'RUNNING';
  const lastScore = currentAssessment?.score;

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
            <span className="chip mono text-[10px]">{repo.defaultBranch} · {repo.commit.slice(0, 7)}</span>
          </span>
        }
        right={
          <>
            {lastScore != null && <span className="chip warn">score {lastScore}/100 · {lastScore >= 60 ? 'HIGH RISK' : 'MODERATE'}</span>}
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
          right={<span className="mono text-[9.5px] text-[var(--color-ink-3)]">1,284 files · HEAD</span>}
          flush
        >
          <Tree repoId={repo.id} />
        </Panel>

        {/* Stack metadata */}
        <div className="space-y-3">
          {meta.map((m) => (
            <Panel key={m.label} title={m.label} flush>
              <div className="px-3 py-1.5">
                {m.label === 'LANGUAGE' ? (
                  m.rows.map((row) => (
                    <div key={row.k} className="py-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[var(--color-ink-2)]">{row.k}</span>
                        <span className="mono text-[var(--color-ink)]">{row.v}</span>
                      </div>
                      <div className="thin-bar mt-[3px]">
                        <div style={{ width: `${row.w}%`, background: row.k === 'Python' ? 'var(--color-low)' : 'var(--color-accent)' }} />
                      </div>
                    </div>
                  ))
                ) : (
                  m.rows.map((row) => (
                    <div key={row.k} className="flex items-center justify-between py-[2px] border-b border-[var(--color-line)] last:border-0">
                      <span className="text-[9.5px] uppercase tracking-[0.06em] text-[var(--color-ink-3)] font-medium">{row.k}</span>
                      <span className="mono text-[10.5px] text-[var(--color-ink)]">{row.v}</span>
                    </div>
                  ))
                )}
              </div>
            </Panel>
          ))}

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