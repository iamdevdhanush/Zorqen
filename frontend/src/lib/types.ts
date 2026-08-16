export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type ValidationState = 'CONFIRMED' | 'VALIDATED' | 'UNVALIDATED' | 'STATIC';

export type FindingStatus = 'OPEN' | 'REVIEW' | 'FIX_PENDING' | 'FIX_APPLIED' | 'VERIFIED' | 'DISMISSED';

export interface Evidence {
  static_analysis: string;
  ai_reasoning: string;
  runtime?: string;
  runtime_result?: 'REPRODUCED' | 'NOT_REPRODUCED';
}

export interface Remediation {
  branch: string;
  diff_before: string;
  diff_after: string;
  explanation: string;
  why_this_fix: string;
  risk: 'Low' | 'Medium' | 'High';
  regression_tests: number;
  regression_passed: number;
}

export interface Finding {
  id: string;
  severity: Severity;
  title: string;
  endpoint?: string;
  file_path: string;
  line_number: number;
  cwe_id: string;
  cwe_name: string;
  confidence_pct: number;
  validation: ValidationState;
  status: FindingStatus;
  source_tool: string;
  category?: 'application' | 'secret' | 'dependency';
  root_cause: string;
  impact: string;
  attack_path: string[];
  evidence: Evidence;
  code: {
    language: string;
    snippet: string;
    vuln_line: number;
    start_line: number;
  };
  remediation?: Remediation;
}

export type AssessmentStatus = 'IDLE' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface StepState {
  id: string;
  label: string;
  status: 'completed' | 'running' | 'pending' | 'failed';
  detail?: string;
}

export interface LogLine {
  time: string;
  source: string;
  text: string;
  tone?: 'ok' | 'warn' | 'err' | 'info';
}

export interface AssessmentArchitecture {
  files: number;
  routes: number;
  topRoutes: {
    endpoint: string;
    method: string;
    file_path: string;
    line_number: number;
    handler: string;
    auth_required: boolean | null;
    framework: string;
  }[];
  inputs: number;
  sinks: number;
  flows: string[];
  secrets: number;
  languages: Record<string, number>;
  primaryLanguage: string;
  frameworks: string[];
  dependencies: number;
  summary: string;
  layers: {
    frontend: string[];
    backend: string[];
    database: string[];
    infrastructure: string[];
  };
  securityNotes: string[];
}

export interface AssessmentRun {
  id: string;
  repoId?: string;
  repo: string;
  commit: string;
  branch: string;
  status: AssessmentStatus;
  startedAt?: string;
  duration?: string;
  score?: number;
  errorMessage?: string;
  architecture?: AssessmentArchitecture;
  steps: StepState[];
  logs: LogLine[];
  findings: Finding[];
}

export interface RepoDetail {
  repoId: string;
  name: string;
  owner: string;
  fullName: string;
  defaultBranch: string;
  headCommit?: string;
  fileCount: number;
  treeTruncated: boolean;
  treePaths: string[];
  languages: Record<string, number>;
}

export interface ActivityItem {
  time: string;
  text: string;
  tone?: 'ok' | 'warn' | 'err' | 'info';
}

export interface RepoMeta {
  id: string;
  name: string;
  owner: string;
  private: boolean;
  language: string;
  defaultBranch: string;
  commit?: string;
  isDemo?: boolean;
  fullName?: string;
  htmlUrl?: string;
  updatedAt?: string;
  visibility?: string;
  permissions?: Record<string, boolean>;
  description?: string | null;
  latestScore?: number | null;
  latestFindingsCount?: number | null;
}

export interface TreeEntry {
  name: string;
  type: 'dir' | 'file';
  depth: number;
  last?: boolean;
}

export interface RiskPath {
  id: string;
  method: string;
  endpoint: string;
  handlerFile: string;
  handlerLine: number;
  functionName: string;
  sink: string;
  risk: Severity;
  findingIds: string[];
}