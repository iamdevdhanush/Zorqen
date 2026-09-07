import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ChevronRight, Play } from 'lucide-react';
import { PageHeader, Panel, RunStatus } from '../components/ui';
import AssessmentModal from '../components/AssessmentModal';
import AssessmentOperationConsole from '../components/AssessmentOperationConsole';
import { useWorkspace, useAssessmentActive } from '../store/WorkspaceContext';

const PIPELINE_STAGES = [
  { step: '01', name: 'INDEX', desc: 'Codebase AST' },
  { step: '02', name: 'ARCHITECTURE', desc: 'Data Flows' },
  { step: '03', name: 'DEPENDENCIES', desc: 'Supply Chain' },
  { step: '04', name: 'STATIC ANALYSIS', desc: 'OWASP Engine' },
  { step: '05', name: 'SECRETS', desc: 'Entropy Vault' },
  { step: '06', name: 'AI REASONING', desc: 'Threat Graph' },
  { step: '07', name: 'SANDBOX', desc: 'Exploit Proof' },
];

export default function AssessmentsPage() {
  const { assessments, currentRepo, currentAssessment, startAssessment } = useWorkspace();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const isRunning = useAssessmentActive();

  const run = currentAssessment ?? assessments[0];

  return (
    <div className="max-w-[1280px] mx-auto space-y-6 lg:space-y-8 fade-in py-2">
      
      {/* Page Header */}
      <PageHeader
        kicker="zorqen://pipeline/workspace"
        title="ASSESSMENTS"
        right={
          <button
            onClick={() => setModalOpen(true)}
            disabled={!currentRepo || isRunning}
            className="group btn btn-primary px-6 h-[48px] text-[13.5px] font-extrabold shadow-hard min-h-[44px] hover:shadow-hard-lg hover:-translate-y-0.5"
          >
            <Play className="w-[18px] h-[18px] fill-current" />
            <span>Run Assessment{currentRepo ? ` · ${currentRepo.name}` : ''}</span>
            <ArrowRight className="w-4 h-4 stroke-[2px] group-hover:translate-x-0.5 transition-transform duration-140" />
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
        <div className="panel p-8 sm:p-12 text-center space-y-4 rounded-[20px] border-2 border-[#111111]">
          <div className="w-14 h-14 rounded-full bg-[#F9F8F5] border-2 border-[#111111] shadow-hard-sm flex items-center justify-center mx-auto text-[#111111]">
            <Play className="w-6 h-6 ml-0.5" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-xl font-extrabold text-[#111111] tracking-tight">
              Select a repository to begin a validation operation.
            </h3>
            <p className="text-[14px] text-[#525252] font-medium max-w-[480px] mx-auto leading-relaxed">
              Authorized repositories can be scanned for security posture, threat vectors, and verified patches.
            </p>
          </div>
          <button
            onClick={() => navigate('/repos')}
            className="btn btn-accent px-6 h-[48px] text-[13.5px] font-extrabold gap-2 inline-flex"
          >
            <span>Open Repositories</span>
            <ArrowRight className="w-4 h-4 stroke-[2px]" />
          </button>
        </div>
      )}

      {/* ── 2. ANIMATED PIPELINE PROGRESS TIMELINE ──────────────────────── */}
      <div className="panel p-6 rounded-[20px] border-2 border-[#111111] space-y-5">
        <div className="flex items-center justify-between pb-3 border-b-2 border-[#111111]">
          <div className="section-label flex-1">
            <span className="w-2 h-2 rounded-full bg-[#111111] animate-pulse shrink-0" />
            ZORQEN VALIDATION PIPELINE SEQUENCE
          </div>
          <span className="chip ok text-[10px] font-extrabold shrink-0 ml-3">7 ACTIVE PHASES</span>
        </div>

        {/* Horizontal responsive step progress track */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 pt-1">
          {PIPELINE_STAGES.map((stage, idx) => {
            const isFinished = run?.status === 'COMPLETED';
            const isCurrent = isRunning && !isFinished && idx === 3;
            return (
              <div
                key={stage.step}
                className={`p-3.5 rounded-[12px] border-2 transition-all flex flex-col justify-between min-h-[88px] ${
                  isCurrent
                    ? 'bg-[#C8F31D] border-[#111111] shadow-hard-sm animate-pulse'
                    : isFinished
                    ? 'bg-[#F9F8F5] border-[#111111]'
                    : 'bg-white border-[#111111]/25 hover:border-[#111111]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`module-badge ${isCurrent ? 'active' : isFinished ? '' : ''}`}>
                    {stage.step}
                  </span>
                  {isFinished ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#111111] stroke-[2.5]" />
                  ) : (
                    <span className="w-2 h-2 rounded-full border border-[#111111]/40" />
                  )}
                </div>
                <div className="pt-2">
                  <div className="text-[12px] font-extrabold text-[#111111] leading-tight">{stage.name}</div>
                  <div className="mono text-[10px] font-semibold text-[#525252] truncate mt-0.5">{stage.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 3. HISTORICAL PIPELINE RUNS TABLE & MOBILE CARDS ───────────── */}
      <Panel title={`HISTORICAL PIPELINE RUNS (${assessments.length})`} flush>
        {/* Desktop Data Table (>= md) */}
        <div className="hidden md:block overflow-x-auto scroll-thin">
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
                  <td className="mono text-[12.5px] font-extrabold text-[#111111] py-4">{a.id}</td>
                  <td className="mono text-[12.5px] text-[#111111] font-extrabold py-4">{a.repo}</td>
                  <td className="mono text-[12px] text-[#525252] py-4">@{a.commit?.slice(0, 7) ?? '—'}</td>
                  <td className="mono text-[11.5px] text-[#525252] py-4">{a.startedAt ?? '—'}</td>
                  <td className="mono text-[11.5px] text-[#525252] py-4">{a.duration ?? 'in progress'}</td>
                  <td className="mono text-[13px] font-extrabold text-[#111111] py-4">
                    {a.score ?? '—'}/100
                  </td>
                  <td className="mono text-[13px] text-[#111111] font-extrabold py-4">
                    {a.findings.length}
                  </td>
                  <td className="py-4"><RunStatus status={a.status} /></td>
                  <td className="text-right py-4 pr-5">
                    <ArrowRight className="w-4 h-4 inline text-[#111111] stroke-[2px]" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Responsive Cards (< md) */}
        <div className="md:hidden divide-y-2 divide-[#111111]/10 p-3 space-y-3">
          {assessments.map((a) => (
            <div
              key={a.id}
              onClick={() => navigate(`/assessments/${a.id.replace('#', '')}`)}
              className="p-4 rounded-[16px] bg-white border-2 border-[#111111] shadow-hard-sm space-y-3 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="mono text-[13px] font-extrabold text-[#111111]">{a.id}</span>
                <RunStatus status={a.status} />
              </div>

              <div className="flex items-center justify-between text-[13px] font-bold text-[#111111]">
                <span>{a.repo}</span>
                <span className="mono text-[11.5px] text-[#525252]">@{a.commit?.slice(0, 7) ?? '—'}</span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#111111]/10 mono text-[12px]">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-[#111111]">{a.score ?? '—'}/100</span>
                  <span>•</span>
                  <span>{a.findings.length} findings</span>
                </div>
                <div className="flex items-center gap-1 text-[#525252]">
                  <span>{a.duration ?? 'live'}</span>
                  <ChevronRight className="w-4 h-4 text-[#111111]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {modalOpen && <AssessmentModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}