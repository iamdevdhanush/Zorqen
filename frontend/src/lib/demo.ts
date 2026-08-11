import type { Finding, LogLine, RepoMeta, StepState } from './types';
import { FINDINGS_A } from './demoFindingsA';
import { FINDINGS_B } from './demoFindingsB';
import { COMPLETED_ACTIVITY, CYBER_PORTAL, DEMO_REPO, REPO_TREE, RISK_PATHS, STACK_META } from './demoRepo';
import type { StackMeta } from './demoRepo';

export const ALL_FINDINGS: Finding[] = [...FINDINGS_A, ...FINDINGS_B];

export { COMPLETED_ACTIVITY, CYBER_PORTAL, DEMO_REPO, REPO_TREE, RISK_PATHS, STACK_META };

/* ── Assessment pipeline (used for the live simulation) ─────────────────── */

export interface PipelineStep {
  id: string;
  label: string;
  durationMs: number;
  logs: Array<[string, string]>; // [text, tone]
}

export const PIPELINE_STEPS: PipelineStep[] = [
  {
    id: 'index',
    label: 'Repository indexed',
    durationMs: 1000,
    logs: [
      ['indexer: 1,284 files indexed', 'ok'],
      ['indexer: .gitignore exclusions applied (48 files)', 'info'],
    ],
  },
  {
    id: 'architecture',
    label: 'Architecture analyzed',
    durationMs: 1200,
    logs: [
      ['architect: 12 modules · 4 layers · data flow graph written', 'ok'],
      ['architect: entry points resolved (6 endpoints)', 'info'],
    ],
  },
  {
    id: 'dependencies',
    label: 'Dependencies analyzed',
    durationMs: 1200,
    logs: [
      ['trivy: 142 packages analyzed', 'ok'],
      ['trivy: 5 vulnerabilities · 2 critical', 'warn'],
    ],
  },
  {
    id: 'static',
    label: 'Static analysis completed',
    durationMs: 1800,
    logs: [
      ['semgrep: 152 rules executed', 'ok'],
      ['semgrep: 14 findings · 1 critical · 3 high', 'warn'],
    ],
  },
  {
    id: 'secrets',
    label: 'Secrets scan completed',
    durationMs: 1200,
    logs: [
      ['secret-detector: 1,284 files scanned', 'ok'],
      ['secret-detector: 2 secrets found', 'err'],
    ],
  },
  {
    id: 'reasoning',
    label: 'AI reasoning completed',
    durationMs: 1800,
    logs: [
      ['reasoner: analyzing CWE-89 · SQL injection', 'info'],
      ['reasoner: CWE-89 confidence 97% · CWE-639 91%', 'info'],
    ],
  },
  {
    id: 'validation',
    label: 'Sandbox validation',
    durationMs: 2600,
    logs: [
      ['sandbox: container secure-sandbox-0242 created', 'ok'],
      ['sandbox: payload `\' OR \'1\'=\'1` → users.py', 'warn'],
      ['validator: SQL injection REPRODUCED · HTTP 500', 'err'],
      ['validator: test complete · 4/4 reproduced', 'warn'],
    ],
  },
];

export const PIPELINE_LOG_SOURCES = ['indexer', 'architect', 'trivy', 'semgrep', 'secret-detector', 'reasoner', 'sandbox', 'validator'];

export const IDLE_STEPS: StepState[] = PIPELINE_STEPS.map((s) => ({ id: s.id, label: s.label, status: 'pending' }));

export const COMPLETED_STEPS: StepState[] = PIPELINE_STEPS.map((s) => ({ id: s.id, label: s.label, status: 'completed' }));

export const PIPELINE_FINAL_LOGS: LogLine[] = [
  { time: '09:42:31', source: 'scorer', text: '74/100 · HIGH RISK', tone: 'warn' },
  { time: '09:42:34', source: 'raksha', text: 'assessment #0242 completed', tone: 'ok' },
];

/* ── Generic repo (cyber-portal) fitness generator ──────────────────────── */

export function generateFindingsFor(repo: RepoMeta): Finding[] {
  if (repo.name === DEMO_REPO.name) return ALL_FINDINGS;
  if (repo.name === CYBER_PORTAL.name) {
    return [
      {
        id: 'F-1001',
        severity: 'high',
        title: 'JWT Stored in localStorage',
        file_path: 'src/lib/auth.ts',
        line_number: 41,
        cwe_id: 'CWE-922',
        cwe_name: 'Insecure Storage of Sensitive Information',
        confidence_pct: 92,
        validation: 'STATIC',
        status: 'OPEN',
        source_tool: 'semgrep',
        root_cause: 'Access tokens are persisted in localStorage instead of an HttpOnly cookie.',
        impact: 'Any XSS in the portal yields full session compromise.',
        attack_path: ['browser store', 'localStorage token', 'XSS session theft'],
        evidence: {
          static_analysis: 'semgrep rule typescript.lang.security.audit.localstorage-token matched u\'auth.ts:41\'.',
          ai_reasoning: 'Move tokens to a server-set HttpOnly cookie or a memory-only token with refresh.',
        },
        code: {
          language: 'typescript',
          snippet: `export function persistAuth(token: string) {
  localStorage.setItem("raksha_token", token);
}`,
          vuln_line: 2,
          start_line: 39,
        },
      },
      {
        id: 'F-1002',
        severity: 'medium',
        title: 'Permissive CORS Configuration',
        file_path: 'src/server.ts',
        line_number: 27,
        cwe_id: 'CWE-942',
        cwe_name: 'Permissive Cross-domain Policy',
        confidence_pct: 86,
        validation: 'UNVALIDATED',
        status: 'OPEN',
        source_tool: 'semgrep',
        root_cause: 'CORS allows any origin with credentials for the dashboard API.',
        impact: 'Unauthorized cross-origin reads of dashboard telemetry.',
        attack_path: ['malicious origin', 'credentialed fetch', 'telemetry read'],
        evidence: {
          static_analysis: 'semgrep rule typescript.lang.security.audit.cors-wildcard matched origin: "*".',
          ai_reasoning: 'Replace with the explicit portal origin and credentials: true.',
        },
        code: {
          language: 'typescript',
          snippet: `app.use(cors({
  origin: "*",
  credentials: true,
}))`,
          vuln_line: 2,
          start_line: 25,
        },
      },
      {
        id: 'F-1003',
        severity: 'medium',
        title: 'Unpinned npm Dependencies',
        file_path: 'package.json',
        line_number: 4,
        cwe_id: 'CWE-1104',
        cwe_name: 'Use of Unmaintained Dependency',
        confidence_pct: 94,
        validation: 'STATIC',
        status: 'OPEN',
        source_tool: 'trivy',
        root_cause: 'Dependencies use caret ranges; installs drift between environments.',
        impact: 'Non-reproducible builds and silent introduction of vulnerable versions.',
        attack_path: ['npm install', 'caret range', 'version drift'],
        evidence: {
          static_analysis: 'trivy: 3 advisories reachable under the current lockfile.',
          ai_reasoning: 'Commit a lockfile and pin via overrides for the affected packages.',
        },
        code: {
          language: 'json',
          snippet: `"dependencies": {
  "next": "^15.2.0",
  "axios": "^1.7.0"
}`,
          vuln_line: 1,
          start_line: 4,
        },
      },
      {
        id: 'F-1004',
        severity: 'low',
        title: 'Version Disclosure in Bundle',
        file_path: 'src/pages/_app.tsx',
        line_number: 19,
        cwe_id: 'CWE-200',
        cwe_name: 'Exposure of Sensitive Information',
        confidence_pct: 79,
        validation: 'STATIC',
        status: 'OPEN',
        source_tool: 'semgrep',
        root_cause: 'Bundle exposes app version and build commit in a global constant.',
        impact: 'Build metadata assists targeted exploitation.',
        attack_path: ['bundle read', 'global __APP_META__', 'version disclosure'],
        evidence: {
          static_analysis: 'semgrep rule typescript.lang.security.audit.info-exposure matched __APP_META__.',
          ai_reasoning: 'Keep build hash out of the client bundle.',
        },
        code: {
          language: 'typescript',
          snippet: `declare global { const __APP_META__: { version: string; commit: string } }`,
          vuln_line: 1,
          start_line: 19,
        },
      },
      {
        id: 'F-1005',
        severity: 'low',
        title: 'Missing CSRF on Admin Mutations',
        file_path: 'src/pages/admin.tsx',
        line_number: 33,
        cwe_id: 'CWE-352',
        cwe_name: 'Cross-Site Request Forgery',
        confidence_pct: 68,
        validation: 'UNVALIDATED',
        status: 'OPEN',
        source_tool: 'custom rule csrf',
        root_cause: 'Admin state-changing calls rely on the bearer token only; no double-submit cookie.',
        impact: 'Cross-site mutations when a token is present in a cookie jar.',
        attack_path: ['malicious page', 'fetch to admin API', 'state change'],
        evidence: {
          static_analysis: 'custom rule csrf: no Origin validation on /api/admin POST routes.',
          ai_reasoning: 'Verify Origin/Referer on the server for non-GET admin requests.',
        },
        code: {
          language: 'typescript',
          snippet: `export async function updateTeam(payload: TeamUpdate) {
  return api.post("/admin/team", payload);
}`,
          vuln_line: 2,
          start_line: 31,
        },
      },
      {
        id: 'F-1006',
        severity: 'low',
        title: 'Sensitive Data in Client Logs',
        file_path: 'src/lib/http.ts',
        line_number: 58,
        cwe_id: 'CWE-532',
        cwe_name: 'Data Exposure Through Logs',
        confidence_pct: 82,
        validation: 'STATIC',
        status: 'OPEN',
        source_tool: 'semgrep',
        root_cause: 'Request and response bodies are logged verbatim in dev builds that ship to staging.',
        impact: 'Tokens and PII in browser console and log collectors.',
        attack_path: ['api call', 'console.log(body)', 'token exposure'],
        evidence: {
          static_analysis: 'semgrep rule typescript.lang.security.audit.console-data matched the interceptor.',
          ai_reasoning: 'Redact authorization headers and body fields before logging.',
        },
        code: {
          language: 'typescript',
          snippet: `axios.interceptors.request.use(req => {
  console.log("[http]", req.url, req.data);
  return req;
})`,
          vuln_line: 2,
          start_line: 56,
        },
      },
    ];
  }
  return [];
}

export function treeFor(repo: RepoMeta) {
  return repo.name === DEMO_REPO.name ? REPO_TREE : generateTree(repo.name);
}

function generateTree(name: string): typeof REPO_TREE {
  const src = name.includes('portal') ? 'src' : 'app';
  return [
    { name: `${src}/`, type: 'dir', depth: 0 },
    { name: 'index.ts', type: 'file', depth: 1 },
    { name: 'server.ts', type: 'file', depth: 1 },
    { name: 'lib/', type: 'dir', depth: 1 },
    { name: 'auth.ts', type: 'file', depth: 2 },
    { name: 'http.ts', type: 'file', depth: 2 },
    { name: 'pages/', type: 'dir', depth: 1 },
    { name: '_app.tsx', type: 'file', depth: 2 },
    { name: 'admin.tsx', type: 'file', depth: 2 },
    { name: 'dashboard/tsx', type: 'file', depth: 2 },
    { name: 'tests/', type: 'dir', depth: 0 },
    { name: 'auth.test.ts', type: 'file', depth: 1 },
    { name: 'package.json', type: 'file', depth: 0 },
    { name: 'tsconfig.json', type: 'file', depth: 0 },
    { name: 'Dockerfile', type: 'file', depth: 0 },
    { name: '.github/', type: 'dir', depth: 0 },
    { name: 'workflows/', type: 'dir', depth: 1 },
    { name: 'ci.yml', type: 'file', depth: 2 },
  ];
}

export function stackFor(repo: RepoMeta): StackMeta[] {
  if (repo.name === DEMO_REPO.name) return STACK_META;
  return [
    {
      label: 'LANGUAGE',
      rows: [
        { k: 'TypeScript', v: '82%', w: 82 },
        { k: 'Python', v: '18%', w: 18 },
      ],
    },
    {
      label: 'STACK',
      rows: [
        { k: 'Framework', v: 'Next.js 15.2' },
        { k: 'Database', v: 'PostgreSQL 15' },
        { k: 'Auth', v: 'JWT · HttpOnly cookie' },
        { k: 'Container', v: 'Docker · node:22-alpine' },
        { k: 'CI/CD', v: 'GitHub Actions' },
        { k: 'Package Mgr', v: 'npm · package-lock.json' },
      ],
    },
  ];
}