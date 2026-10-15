import type { AssessmentRun } from './types';

export type AssessmentStageId =
  | 'NOT_STARTED'
  | 'STATIC_ANALYSIS'
  | 'AI_REASONING'
  | 'SANDBOX_VALIDATION'
  | 'REMEDIATION'
  | 'COMPLETED';

export interface StageStatusItem {
  id: AssessmentStageId;
  label: string;
  status: 'completed' | 'running' | 'pending' | 'failed' | 'unavailable';
}

export interface AssessmentStateMachine {
  currentStage: AssessmentStageId;
  currentStageLabel: string;
  overallProgress: number; // 0..100
  stages: StageStatusItem[];
  isRunning: boolean;
  isCompleted: boolean;
  isFailed: boolean;
}

/**
 * Computes the unified assessment state machine for any given assessment run.
 */
export function getAssessmentStateMachine(run?: AssessmentRun | null): AssessmentStateMachine {
  if (!run) {
    return {
      currentStage: 'NOT_STARTED',
      currentStageLabel: 'Not Started',
      overallProgress: 0,
      stages: [
        { id: 'STATIC_ANALYSIS', label: 'Static Analysis', status: 'pending' },
        { id: 'AI_REASONING', label: 'AI Reasoning', status: 'pending' },
        { id: 'SANDBOX_VALIDATION', label: 'Sandbox Validation', status: 'unavailable' },
        { id: 'REMEDIATION', label: 'Remediation', status: 'pending' },
      ],
      isRunning: false,
      isCompleted: false,
      isFailed: false,
    };
  }

  const hasSandboxEvidence = run.findings?.some((f) => f.evidence?.runtime_result === 'REPRODUCED') ?? false;
  const hasRemediations = run.findings?.some((f) => !!f.remediation) ?? false;

  if (run.status === 'COMPLETED') {
    return {
      currentStage: 'COMPLETED',
      currentStageLabel: 'Scan Completed',
      overallProgress: 100,
      stages: [
        { id: 'STATIC_ANALYSIS', label: 'Static Analysis', status: 'completed' },
        { id: 'AI_REASONING', label: 'AI Reasoning', status: 'completed' },
        { id: 'SANDBOX_VALIDATION', label: 'Sandbox Validation', status: hasSandboxEvidence ? 'completed' : 'unavailable' },
        { id: 'REMEDIATION', label: 'Remediation', status: hasRemediations ? 'completed' : 'pending' },
      ],
      isRunning: false,
      isCompleted: true,
      isFailed: false,
    };
  }

  if (run.status === 'FAILED') {
    return {
      currentStage: 'STATIC_ANALYSIS',
      currentStageLabel: 'Scan Failed',
      overallProgress: run.progress ?? 0,
      stages: [
        { id: 'STATIC_ANALYSIS', label: 'Static Analysis', status: 'failed' },
        { id: 'AI_REASONING', label: 'AI Reasoning', status: 'pending' },
        { id: 'SANDBOX_VALIDATION', label: 'Sandbox Validation', status: 'unavailable' },
        { id: 'REMEDIATION', label: 'Remediation', status: 'pending' },
      ],
      isRunning: false,
      isCompleted: false,
      isFailed: true,
    };
  }

  // Active / Running state calculation from steps or progress %
  const rawProgress = run.progress ?? 0;
  
  // Calculate individual stage status based on steps or overall progress
  const aiStep = run.steps?.find((s) => s.id === 'ai_reasoning' || s.id === 'reasoning');
  const reportStep = run.steps?.find((s) => s.id === 'report_generated' || s.id === 'report');

  let staticStatus: 'completed' | 'running' | 'pending' | 'failed' = 'running';
  let aiStatus: 'completed' | 'running' | 'pending' | 'failed' = 'pending';
  const sandboxStatus: 'completed' | 'running' | 'pending' | 'failed' | 'unavailable' = hasSandboxEvidence ? 'completed' : 'unavailable';
  const remediationStatus: 'completed' | 'running' | 'pending' | 'failed' = hasRemediations ? 'completed' : 'pending';

  if (rawProgress >= 40 || aiStep?.status === 'running' || aiStep?.status === 'completed') {
    staticStatus = 'completed';
    aiStatus = rawProgress >= 70 || reportStep?.status === 'running' || reportStep?.status === 'completed' ? 'completed' : 'running';
  }

  if (rawProgress >= 70 || reportStep?.status === 'running' || reportStep?.status === 'completed') {
    aiStatus = 'completed';
  }

  let activeStage: AssessmentStageId = 'STATIC_ANALYSIS';
  let activeStageLabel = 'Static Analysis';

  if (aiStatus === 'running') {
    activeStage = 'AI_REASONING';
    activeStageLabel = 'AI Reasoning';
  } else if (aiStatus === 'completed') {
    activeStage = 'AI_REASONING';
    activeStageLabel = 'AI Reasoning Completed';
  }

  return {
    currentStage: activeStage,
    currentStageLabel: activeStageLabel,
    overallProgress: Math.max(10, Math.min(99, rawProgress)),
    stages: [
      { id: 'STATIC_ANALYSIS', label: 'Static Analysis', status: staticStatus },
      { id: 'AI_REASONING', label: 'AI Reasoning', status: aiStatus },
      { id: 'SANDBOX_VALIDATION', label: 'Sandbox Validation', status: sandboxStatus },
      { id: 'REMEDIATION', label: 'Remediation', status: remediationStatus },
    ],
    isRunning: true,
    isCompleted: false,
    isFailed: false,
  };
}
