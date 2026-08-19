import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Play } from 'lucide-react';
import { PageHeader, Panel, RunStatus } from '../components/ui';
import AssessmentModal from '../components/AssessmentModal';
import AssessmentOperationConsole from '../components/AssessmentOperationConsole';
import { useWorkspace, useAssessmentActive } from '../store/WorkspaceContext';

export default function AssessmentsPage() {
  const { assessments, currentRepo, currentAssessment, startAssessment } = useWorkspace();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const isRunning = useAssessmentActive();

  const run = currentAssessment ?? assessments[0];

  return (
    <div className="max-w-[1240px] mx-auto space-y-10 fade-in py-2">
      
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

      {/* ── 1. PRIMARY ASSESSMENT OPERATION CONSOLE HERO ─────────────────── */}
      {run ? (
        <AssessmentOperationConsole
          run={run}
          onRetry={startAssessment}
        />
      ) : (
        <div className="p-8 sm:p-12 text-center text-[#666666] mono text-[13px] bg-white border border-[#111111] rounded-xl shadow-hard">
          {currentRepo
            ? 'No assessments for this repository yet — run your first assessment to launch the Security Validation Console.'
            : 'No repository loaded — select a repository to run an assessment.'}
        </div>
      )}

      {/* ── 2. HISTORICAL PIPELINE RUNS TABLE ──────────────────────────── */}
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
                  <td className="mono text-[11.5px] text-[var(--color-ink-3)]">@{a.commit?.slice(0, 7) ?? '—'}</td>
                  <td className="mono text-[11px] text-[var(--color-ink-3)]">{a.startedAt ?? '—'}</td>
                  <td className="mono text-[11px] text-[var(--color-ink-3)]">{a.duration ?? 'in progress'}</td>
                  <td className="mono text-[11.5px] font-bold text-[#111111]">
                    {a.score ?? '—'}/100
                  </td>
                  <td className="mono text-[11.5px] text-[var(--color-ink-2)] font-semibold">
                    {a.findings.length}
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