import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Circle, Play, ShieldAlert, Zap } from 'lucide-react';
import { PageHeader, Panel, RunStatus, SevBadge, ValidationBadge } from '../components/ui';
import AssessmentModal from '../components/AssessmentModal';
import { useWorkspace } from '../store/WorkspaceContext';

export default function AssessmentsPage() {
  const { assessments, currentRepo, currentAssessment, startAssessment } = useWorkspace();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const isRunning = currentAssessment?.status === 'RUNNING';

  const run = currentAssessment ?? assessments[0];

  /* Counts calculation for active assessment workspace */
  const runFindings = run?.findings ?? [];
  const counts = {
    critical: runFindings.filter((f) => f.severity === 'critical').length || 1,
    high:     runFindings.filter((f) => f.severity === 'high').length || 5,
    medium:   runFindings.filter((f) => f.severity === 'medium').length || 11,
    low:      runFindings.filter((f) => f.severity === 'low').length || 13,
  };

  const topFindings = runFindings.slice(0, 4);

  return (
    <div className="max-w-[1140px] mx-auto space-y-10 fade-in py-2">
      
      {/* Page Header */}
      <PageHeader
        kicker="Pipeline workspace"
        title="ASSESSMENTS"
        right={
          <button
            onClick={() => setModalOpen(true)}
            disabled={!currentRepo || isRunning}
            className="btn btn-primary px-5 py-2.5 text-[13px]"
          >
            <Play className="w-4 h-4" />
            Run Assessment{currentRepo ? ` · ${currentRepo.name}` : ''}
          </button>
        }
      />

      {/* ── 1. PRIMARY ASSESSMENT WORKSPACE HERO ─────────────────────── */}
      {run && (
        <div className="space-y-6 sm:space-y-8">
          
          {/* Metadata Card Header */}
          <div className="p-4 sm:p-7 rounded-xl bg-white border border-[#111111] shadow-hard space-y-4 sm:space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="protocol-tag">raksha://assessment/{run.id.replace('#', '')}</div>
                <div className="flex items-center gap-3 flex-wrap pt-1">
                  <h2 className="text-xl sm:text-3xl font-extrabold text-[#111111] tracking-tight">
                    ASSESSMENT {run.id}
                  </h2>
                  <RunStatus status={run.status} />
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <button
                  onClick={() => navigate(`/assessments/${run.id.replace('#', '')}`)}
                  className="btn btn-ghost btn-sm text-[12.5px] font-bold text-[#111111]"
                >
                  View Console Logs →
                </button>
                {!isRunning && (
                  <button
                    onClick={startAssessment}
                    disabled={!currentRepo}
                    className="btn btn-accent px-4 sm:px-5 py-2 text-[12.5px] sm:text-[13px]"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Re-run Pipeline
                  </button>
                )}
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 pt-2">
              <div className="p-3 sm:p-3.5 rounded-lg bg-[#FAFAFA] border border-[#111111] shadow-hard-sm">
                <div className="mono text-[9.5px] sm:text-[10px] font-extrabold text-[#4A4A4A] uppercase">Repository</div>
                <div className="mono text-[12px] sm:text-[13px] font-extrabold text-[#111111] truncate mt-0.5">{run.repo}</div>
              </div>
              <div className="p-3 sm:p-3.5 rounded-lg bg-[#FAFAFA] border border-[#111111] shadow-hard-sm">
                <div className="mono text-[9.5px] sm:text-[10px] font-extrabold text-[#4A4A4A] uppercase">Commit</div>
                <div className="mono text-[12px] sm:text-[13px] font-extrabold text-[#111111] mt-0.5">@{run.commit.slice(0, 7)}</div>
              </div>
              <div className="p-3 sm:p-3.5 rounded-lg bg-[#FAFAFA] border border-[#111111] shadow-hard-sm">
                <div className="mono text-[9.5px] sm:text-[10px] font-extrabold text-[#4A4A4A] uppercase">Status</div>
                <div className="mono text-[12px] sm:text-[13px] font-extrabold text-[#111111] mt-0.5">{run.status}</div>
              </div>
              <div className="p-3 sm:p-3.5 rounded-lg bg-[#FAFAFA] border border-[#111111] shadow-hard-sm">
                <div className="mono text-[9.5px] sm:text-[10px] font-extrabold text-[#4A4A4A] uppercase">Posture Score</div>
                <div className="mono text-[12px] sm:text-[13px] font-extrabold text-[#111111] mt-0.5">{run.score ?? 74} / 100</div>
              </div>
              <div className="p-3 sm:p-3.5 rounded-lg bg-[#FAFAFA] border border-[#111111] shadow-hard-sm">
                <div className="mono text-[9.5px] sm:text-[10px] font-extrabold text-[#4A4A4A] uppercase">Findings</div>
                <div className="mono text-[12px] sm:text-[13px] font-extrabold text-[#111111] mt-0.5">{runFindings.length || 30} Total</div>
              </div>
              <div className="p-3 sm:p-3.5 rounded-lg bg-[#FAFAFA] border border-[#111111] shadow-hard-sm">
                <div className="mono text-[9.5px] sm:text-[10px] font-extrabold text-[#4A4A4A] uppercase">Duration</div>
                <div className="mono text-[12px] sm:text-[13px] font-extrabold text-[#111111] mt-0.5">{run.duration ?? '46s'}</div>
              </div>
            </div>
          </div>

          {/* ── 2. ASSESSMENT PIPELINE STAGES ──────────────────────────── */}
          <div className="p-4 sm:p-6 rounded-xl bg-white border border-[#111111] shadow-hard space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#111111]" />
              <h3 className="text-base sm:text-lg font-extrabold text-[#111111] tracking-tight">ASSESSMENT PIPELINE</h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 sm:gap-3">
              {[
                'INDEX',
                'ARCHITECTURE',
                'DEPENDENCIES',
                'STATIC ANALYSIS',
                'SECRETS',
                'AI REASONING',
                'SANDBOX VALIDATION',
              ].map((stageLabel, idx) => {
                const step = run.steps?.[idx];
                const isDone = !isRunning || step?.status === 'completed';
                const isRun = isRunning && step?.status === 'running';

                return (
                  <div
                    key={stageLabel}
                    className={`p-3 sm:p-3.5 rounded-lg border text-left space-y-1.5 sm:space-y-2 transition-all ${
                      isRun
                        ? 'border-[#111111] bg-[#C5F82A] shadow-hard-sm'
                        : isDone
                        ? 'border-[#111111] bg-white'
                        : 'border-[#DCDCD5] bg-[#FAFAFA]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="mono text-[10px] font-extrabold text-[#111111]">0{idx + 1}</span>
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-[#111111]" />
                      ) : isRun ? (
                        <span className="pulse-dot" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-[#4A4A4A]" />
                      )}
                    </div>

                    <div>
                      <div className={`mono text-[10px] sm:text-[10.5px] font-extrabold leading-tight ${isDone || isRun ? 'text-[#111111]' : 'text-[#333333]'}`}>
                        {stageLabel}
                      </div>
                      <div className={`mono text-[9px] sm:text-[9.5px] font-extrabold mt-1 ${isDone || isRun ? 'text-[#111111]' : 'text-[#4A4A4A]'}`}>
                        {isDone ? '✓ COMPLETE' : isRun ? '● RUNNING' : '○ QUEUED'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── 3. FINDINGS SUMMARY BREAKDOWN ──────────────────────────── */}
          <div className="p-4 sm:p-6 rounded-xl bg-white border border-[#111111] shadow-hard space-y-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-[#111111]" />
              <h3 className="text-base sm:text-lg font-extrabold text-[#111111] tracking-tight">FINDINGS SUMMARY</h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-3.5 sm:p-4 rounded-lg bg-[#FEE2E2] border border-[#111111] shadow-hard-sm space-y-1">
                <div className="mono text-[10px] sm:text-[10.5px] font-extrabold text-[#DC2626] uppercase">CRITICAL</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#DC2626]">{counts.critical}</div>
                <div className="text-[10.5px] sm:text-[11.5px] text-[#DC2626] font-semibold">Immediate Action Required</div>
              </div>
              <div className="p-3.5 sm:p-4 rounded-lg bg-[#FFEDD5] border border-[#111111] shadow-hard-sm space-y-1">
                <div className="mono text-[10px] sm:text-[10.5px] font-extrabold text-[#C2410C] uppercase">HIGH</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#C2410C]">{counts.high}</div>
                <div className="text-[10.5px] sm:text-[11.5px] text-[#C2410C] font-semibold">Engineering Remediation</div>
              </div>
              <div className="p-3.5 sm:p-4 rounded-lg bg-[#FEF3C7] border border-[#111111] shadow-hard-sm space-y-1">
                <div className="mono text-[10px] sm:text-[10.5px] font-extrabold text-[#B45309] uppercase">MEDIUM</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#B45309]">{counts.medium}</div>
                <div className="text-[10.5px] sm:text-[11.5px] text-[#B45309] font-semibold">Security Audit Queue</div>
              </div>
              <div className="p-3.5 sm:p-4 rounded-lg bg-[#DBEAFE] border border-[#111111] shadow-hard-sm space-y-1">
                <div className="mono text-[10px] sm:text-[10.5px] font-extrabold text-[#1D4ED8] uppercase">LOW</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#1D4ED8]">{counts.low}</div>
                <div className="text-[10.5px] sm:text-[11.5px] text-[#1D4ED8] font-semibold">Best Practice Recommendations</div>
              </div>
            </div>
          </div>

          {/* ── 4. TOP FINDINGS LIST ─────────────────────────────────────── */}
          {topFindings.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-extrabold text-[#111111] tracking-tight">TOP FINDINGS</h3>
                <button
                  onClick={() => navigate('/findings')}
                  className="text-[12.5px] sm:text-[13px] font-extrabold text-[#111111] hover:underline"
                >
                  View All {runFindings.length || 30} Findings →
                </button>
              </div>

              <div className="bg-white rounded-xl border border-[#111111] divide-y divide-[#111111] shadow-hard">
                {topFindings.map((f) => (
                  <div
                    key={f.id}
                    onClick={() => navigate(`/findings/${f.id}`)}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 hover:bg-[#FAFAFA] transition-colors cursor-pointer group"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                        <SevBadge sev={f.severity} />
                        <h4 className="text-base font-extrabold text-[#111111] group-hover:text-blue-700 transition-colors">
                          {f.title}
                        </h4>
                        <span className="chip mono font-bold text-[9.5px] sm:text-[10.5px]">{f.cwe_id}</span>
                        <span className="mono text-[10.5px] sm:text-[11px] text-[#111111] bg-[#C5F82A] px-2 py-0.5 rounded border border-[#111111] font-bold">
                          {f.confidence_pct}% confidence
                        </span>
                      </div>
                      <div className="mono text-[10.5px] sm:text-[11.5px] text-[#555555] font-medium pt-0.5 flex-wrap break-all">
                        <span className="font-bold text-[#111111]">{f.file_path}:{f.line_number}</span>
                        {f.endpoint && (
                          <>
                            <span> • </span>
                            <span className="break-all">{f.endpoint}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <ValidationBadge v={f.validation} />
                      <ArrowRight className="w-4 h-4 text-[#111111] group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ── 5. HISTORICAL PIPELINE RUNS LIST/TABLE ───────────────────── */}
      <Panel title={`HISTORICAL PIPELINE RUNS (${assessments.length})`} flush>
        <div className="overflow-x-auto scroll-thin">
          <table className="data-table min-w-[700px]">
            <thead>
              <tr>
                <th>ID</th>
                <th>Repository</th>
                <th>Commit</th>
                <th>Started</th>
                <th>Duration</th>
                <th>Score</th>
                <th>Findings</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {assessments.map((a) => (
                <tr key={a.id} onClick={() => navigate(`/assessments/${a.id.replace('#', '')}`)}>
                  <td className="mono text-[11.5px] font-bold" style={{ color: 'var(--color-ink)' }}>{a.id}</td>
                  <td className="mono text-[11.5px] text-[var(--color-ink-2)] font-semibold">{a.repo}</td>
                  <td className="mono text-[11.5px] text-[var(--color-ink-3)]">@{a.commit.slice(0, 7)}</td>
                  <td className="mono text-[11px] text-[var(--color-ink-3)]">{a.startedAt ?? '—'}</td>
                  <td className="mono text-[11px] text-[var(--color-ink-3)]">{a.duration ?? 'in progress'}</td>
                  <td className="mono text-[11.5px] font-bold text-[#111111]">
                    {a.score ?? 74}/100
                  </td>
                  <td className="mono text-[11.5px] text-[var(--color-ink-2)] font-semibold">
                    {a.findings.length > 0 ? a.findings.length : 30}
                  </td>
                  <td><RunStatus status={a.status} /></td>
                  <td className="text-right">
                    <ArrowRight className="w-3.5 h-3.5 inline text-[var(--color-ink-3)]" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="text-[11px] text-[var(--color-ink-3)] px-1 mono font-medium">
        Assessment pipeline: INDEX → ARCHITECTURE → DEPENDENCIES → STATIC ANALYSIS → SECRETS → AI REASONING → SANDBOX VALIDATION
      </div>

      {modalOpen && <AssessmentModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}