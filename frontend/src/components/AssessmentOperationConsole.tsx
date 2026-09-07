import type { FC } from 'react';
import type { AssessmentRun } from '../lib/types';
import RadarReticle from './RadarReticle';
import SecurityTelemetryPanel from './SecurityTelemetryPanel';
import ActiveAnalysisModule from './ActiveAnalysisModule';
import PipelineSystemStatus from './PipelineSystemStatus';
import LiveEventStream from './LiveEventStream';
import MicroStatusCluster from './MicroStatusCluster';
import AssessmentCompletionView from './AssessmentCompletionView';
import AssessmentFailureView from './AssessmentFailureView';

interface AssessmentOperationConsoleProps {
  run?: AssessmentRun | null;
  errorMessage?: string | null;
  onRetry?: () => void;
  className?: string;
}

export const AssessmentOperationConsole: FC<AssessmentOperationConsoleProps> = ({
  run,
  errorMessage,
  onRetry,
  className = '',
}) => {
  // If explicitly in FAILED state or errorMessage provided
  if (run?.status === 'FAILED' || errorMessage || run?.errorMessage) {
    return (
      <AssessmentFailureView
        errorMessage={errorMessage || run?.errorMessage || 'Validation pipeline execution failed.'}
        errorCode={run?.errorCode}
        onRetry={onRetry}
        className={className}
      />
    );
  }

  // If no run loaded yet
  if (!run) {
    return (
      <div className={`p-8 text-center text-[#525252] mono text-[13px] bg-white border-2 border-[#111111] rounded-[20px] shadow-hard ${className}`}>
        No active security assessment loaded.
      </div>
    );
  }

  // Active step in pipeline
  const activeStep = run.steps.find((s) => s.status === 'running') ||
    (run.status === 'RUNNING' ? run.steps[0] : undefined);

  const isCompleted = run.status === 'COMPLETED';

  return (
    <div className={`space-y-6 fade-in ${className}`}>
      {/* Product-Specific Status Header */}
      <div className="p-6 sm:p-7 rounded-[20px] bg-white border-2 border-[#111111] shadow-hard space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-[#111111] pb-4">
          <div className="space-y-1">
            <div className="protocol-tag">zorqen://security-operation/{run.id.replace('#', '')}</div>
            <div className="flex items-center gap-3 flex-wrap pt-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight uppercase">
                SECURITY VALIDATION OPERATION {run.id}
              </h1>
              {isCompleted ? (
                <span className="mono text-[11px] font-extrabold text-[#111111] bg-[#C8F31D] px-3 py-1 rounded-full border-[1.5px] border-[#111111]">
                  ✓ VALIDATION COMPLETE
                </span>
              ) : (
                <span className="mono text-[11px] font-extrabold text-[#111111] bg-[#C8F31D] px-3 py-1 rounded-full border-[1.5px] border-[#111111] animate-pulse">
                  ● ACTIVE ANALYSIS
                </span>
              )}
            </div>
            <div className="mono text-[12.5px] text-[#525252] flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-[#111111]">{run.repo}</span>
              <span>•</span>
              <span className="font-bold text-[#111111]">{run.branch}</span>
              <span>@</span>
              <span className="font-mono">{run.commit?.slice(0, 7) || 'HEAD'}</span>
            </div>
          </div>

          <div className="text-right space-y-1">
            <div className="mono text-[10px] font-extrabold text-[#525252] uppercase tracking-wider">
              ACTIVE STAGE DESCRIPTION
            </div>
            <div className="mono text-[12px] font-extrabold text-[#111111] bg-[#F7F5F0] px-3 py-1.5 rounded-[10px] border-2 border-[#111111]">
              {isCompleted
                ? 'COMPLETED · All security vectors validated'
                : activeStep
                ? activeStep.label.toUpperCase()
                : (run.currentStage || 'CORRELATING REPOSITORY STRUCTURE').toUpperCase()}
            </div>
          </div>
        </div>

        {/* Live Pipeline Progress */}
        {!isCompleted && (
          <div className="pt-4 border-t-2 border-[#111111] space-y-2">
            <div className="flex items-center justify-between mono text-[11px] font-bold text-[#525252]">
              <span className="uppercase tracking-wider">
                {run.currentStage || activeStep?.label || 'PIPELINE EXECUTION'}
              </span>
              <span className="text-[#111111]">
                {run.progress !== undefined && run.progress !== null ? `${run.progress}%` : 'INITIALIZING'}
              </span>
            </div>
            <div className="h-3 bg-[#F7F5F0] border-2 border-[#111111] rounded-[6px] overflow-hidden shadow-hard p-0.5">
              <div
                className="h-full bg-[#C8F31D] rounded-[2px] transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, run.progress ?? 0))}%` }}
              />
            </div>
            <div className="flex items-center justify-between mono text-[10px] font-bold text-[#666666] uppercase tracking-wider">
              <span className="truncate max-w-[60%]">
                {run.currentFile ? `SCANNING: ${run.currentFile}` : 'AWAITING FILE STREAM'}
              </span>
              <span className="shrink-0">
                {run.filesScanned !== undefined && run.totalFiles !== undefined
                  ? `${run.filesScanned}/${run.totalFiles} FILES · `
                  : ''}
                {run.etaSeconds !== undefined && run.etaSeconds !== null
                  ? `ETA ${run.etaSeconds}s`
                  : ''}
              </span>
            </div>
          </div>
        )}

        {/* Technical Micro-Status Bar */}
        <MicroStatusCluster status={run.status} />
      </div>

      {/* Completion View Render when completed */}
      {isCompleted && <AssessmentCompletionView run={run} />}

      {/* LIVE SECURITY OPERATION INSTRUMENT PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Radar & Reticle + Telemetry Column (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-6 flex flex-col justify-between">
          <RadarReticle
            active={!isCompleted}
            statusLabel={isCompleted ? 'SCAN COMPLETE' : activeStep?.label?.toUpperCase() || 'SCANNING'}
          />
          <SecurityTelemetryPanel
            architecture={run.architecture}
            fileCount={run.architecture?.files}
            findings={run.findings}
            logCount={run.logs.length}
            score={run.score}
            status={run.status}
          />
        </div>

        {/* Active Threat Analysis Module Column (7 cols on lg) */}
        <div className="lg:col-span-7">
          <ActiveAnalysisModule
            activeStep={activeStep}
            architecture={run.architecture}
            repoName={run.repo}
          />
        </div>
      </div>

      {/* 7-Step Pipeline System Status Visualization */}
      <PipelineSystemStatus steps={run.steps} activeStep={activeStep} />

      {/* Live Analysis Security Event Stream */}
      <LiveEventStream logs={run.logs} maxEvents={8} />
    </div>
  );
};

export default AssessmentOperationConsole;
