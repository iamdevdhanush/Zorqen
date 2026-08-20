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
    <div className="max-w-[1280px] mx-auto space-y-8 fade-in py-4">
      
      {/* Page Header */}
      <PageHeader
        kicker="zorqen://pipeline/workspace"
        title="ASSESSMENTS"
        right={
          <button
            onClick={() => setModalOpen(true)}
            disabled={!currentRepo || isRunning}
            className="btn btn-primary px-6 h-[44px] text-[13px]"
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
        <div className="panel p-12 text-center text-[#5E5E5E] mono text-[13px]">
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
                  <td className="mono text-[12px] font-extrabold text-[#0A0A0A] py-4">{a.id}</td>
                  <td className="mono text-[12px] text-[#0A0A0A] font-extrabold py-4">{a.repo}</td>
                  <td className="mono text-[12px] text-[#5E5E5E] py-4">@{a.commit?.slice(0, 7) ?? '—'}</td>
                  <td className="mono text-[11px] text-[#5E5E5E] py-4">{a.startedAt ?? '—'}</td>
                  <td className="mono text-[11px] text-[#5E5E5E] py-4">{a.duration ?? 'in progress'}</td>
                  <td className="mono text-[12px] font-extrabold text-[#0A0A0A] py-4">
                    {a.score ?? '—'}/100
                  </td>
                  <td className="mono text-[12px] text-[#0A0A0A] font-extrabold py-4">
                    {a.findings.length}
                  </td>
                  <td className="py-4"><RunStatus status={a.status} /></td>
                  <td className="text-right py-4">
                    <ArrowRight className="w-4 h-4 inline text-[#0A0A0A]" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="text-[11px] text-[#5E5E5E] px-1 mono font-bold uppercase tracking-[0.18em]">
        Pipeline Sequence: INDEX → ARCHITECTURE → DEPENDENCIES → STATIC ANALYSIS → SECRETS → AI REASONING → SANDBOX VALIDATION
      </div>

      {modalOpen && <AssessmentModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}