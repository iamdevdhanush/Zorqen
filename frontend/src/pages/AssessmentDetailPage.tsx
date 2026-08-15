import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Circle, Play, Terminal } from 'lucide-react';
import { RunStatus } from '../components/ui';
import LogStream from '../components/LogStream';
import { useWorkspace, useFindings } from '../store/WorkspaceContext';

export default function AssessmentDetailPage() {
  const { id } = useParams();
  const { assessments, currentAssessment, startAssessment, currentRepo } = useWorkspace();
  const findings = useFindings();
  const navigate = useNavigate();

  const run = assessments.find((a) => a.id.replace('#', '') === id) ?? currentAssessment;

  if (!run) {
    return (
      <div className="max-w-[800px] mx-auto py-16 text-center space-y-4">
        <div className="mono text-[12px] text-[#666666]">
          Assessment &lsquo;#{id}&lsquo; not found.
        </div>
      </div>
    );
  }

  const isRunning = run.status === 'RUNNING';
  const isCompleted = run.status === 'COMPLETED';

  return (
    <div className="max-w-[1140px] mx-auto space-y-8 fade-in py-2">
      
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-[#111111]">
        <div className="space-y-1">
          <div className="protocol-tag">raksha://assessment/{run.id.replace('#', '')}</div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-extrabold text-[#111111] tracking-tight">
              ASSESSMENT {run.id}
            </h1>
            <RunStatus status={run.status} />
          </div>
          <div className="mono text-[12px] text-[#444444] flex items-center gap-2">
            <span className="font-bold text-[#111111]">{run.repo}</span>
            <span>•</span>
            <span className="font-bold text-[#111111]">{run.branch}</span>
            <span>@</span>
            <span>{run.commit.slice(0, 7)}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isCompleted && (
            <button
              onClick={() => navigate('/findings')}
              className="btn btn-accent px-5 py-2.5 text-[13px]"
            >
              Review {findings.length} Findings →
            </button>
          )}
          {!isRunning && (
            <button
              onClick={startAssessment}
              disabled={!currentRepo}
              className="btn btn-primary px-5 py-2.5 text-[13px]"
            >
              <Play className="w-4 h-4 fill-current" />
              Re-run Pipeline
            </button>
          )}
        </div>
      </div>

      {/* Progressive Stage Visual Grid */}
      <div className="p-4 sm:p-6 rounded-xl bg-white border border-[#111111] shadow-hard space-y-4">
        <div className="mono text-[11px] font-extrabold text-[#666666] uppercase tracking-wider">
          PIPELINE STAGE PROGRESSION
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 sm:gap-3">
          {run.steps.map((step, idx) => {
            const isDone = step.status === 'completed';
            const isRun = step.status === 'running';

            return (
              <div
                key={step.id}
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
                  <div className={`mono text-[10px] sm:text-[11px] font-extrabold leading-tight ${isDone || isRun ? 'text-[#111111]' : 'text-[#333333]'}`}>
                    {step.label.toUpperCase()}
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

      {/* Live Analysis Terminal Stream */}
      <div className="rounded-xl border border-[#111111] bg-[#111111] text-white shadow-hard-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2 mono text-[11.5px] text-white font-bold">
            <Terminal className="w-4 h-4 text-[#C5F82A]" />
            <span>LIVE ANALYSIS LOG PROTOCOL</span>
          </div>
          <span className="mono text-[10.5px] text-zinc-300 font-extrabold">
            {run.logs.length} events logged
          </span>
        </div>

        <div className="p-4">
          <LogStream logs={run.logs} height={380} />
        </div>
      </div>

    </div>
  );
}