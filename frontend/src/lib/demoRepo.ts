import type { ActivityItem, RepoMeta, RiskPath, TreeEntry } from './types';

export const DEMO_REPO: RepoMeta = {
  id: 'demo-defence-logistics-api',
  name: 'defence-logistics-api',
  owner: 'secureops',
  private: true,
  language: 'Python',
  defaultBranch: 'main',
  commit: '8f3a21c',
  isDemo: true,
};

export const CYBER_PORTAL: RepoMeta = {
  id: 'demo-cyber-portal',
  name: 'cyber-portal',
  owner: 'secureops',
  private: true,
  language: 'TypeScript',
  defaultBranch: 'main',
  commit: 'c91d4fe',
  isDemo: true,
};

export const REPO_TREE: TreeEntry[] = [
  { name: 'app/', type: 'dir', depth: 0 },
  { name: 'main.py', type: 'file', depth: 1 },
  { name: 'config.py', type: 'file', depth: 1 },
  { name: 'db.py', type: 'file', depth: 1 },
  { name: 'api/', type: 'dir', depth: 1 },
  { name: 'users.py', type: 'file', depth: 2 },
  { name: 'admin.py', type: 'file', depth: 2 },
  { name: 'auth.py', type: 'file', depth: 2 },
  { name: 'errors.py', type: 'file', depth: 2 },
  { name: 'auth/', type: 'dir', depth: 1 },
  { name: 'jwt.py', type: 'file', depth: 2 },
  { name: 'middleware.py', type: 'file', depth: 2 },
  { name: 'models/', type: 'dir', depth: 1 },
  { name: 'user.py', type: 'file', depth: 2 },
  { name: 'report.py', type: 'file', depth: 2 },
  { name: 'services/', type: 'dir', depth: 1 },
  { name: 'query.py', type: 'file', depth: 2 },
  { name: 'reports.py', type: 'file', depth: 2 },
  { name: 'cache.py', type: 'file', depth: 2 },
  { name: 'imports.py', type: 'file', depth: 2 },
  { name: 'tests/', type: 'dir', depth: 0 },
  { name: 'test_users.py', type: 'file', depth: 1 },
  { name: 'test_auth.py', type: 'file', depth: 1 },
  { name: 'test_reports.py', type: 'file', depth: 1 },
  { name: 'Dockerfile', type: 'file', depth: 0 },
  { name: 'requirements.txt', type: 'file', depth: 0 },
  { name: '.env.example', type: 'file', depth: 0 },
  { name: '.github/', type: 'dir', depth: 0 },
  { name: 'workflows/', type: 'dir', depth: 1 },
  { name: 'ci.yml', type: 'file', depth: 2 },
];

export interface StackRow {
  k: string;
  v: string;
  w?: number;
}

export interface StackMeta {
  label: string;
  rows: StackRow[];
}

export const STACK_META: StackMeta[] = [
  {
    label: 'LANGUAGE',
    rows: [
      { k: 'Python', v: '82%', w: 82 },
      { k: 'TypeScript', v: '18%', w: 18 },
    ],
  },
  {
    label: 'STACK',
    rows: [
      { k: 'Framework', v: 'FastAPI 0.98.4' },
      { k: 'Database', v: 'PostgreSQL 15' },
      { k: 'Auth', v: 'JWT · Authlib 1.3.9' },
      { k: 'Container', v: 'Docker · python:3.12-slim' },
      { k: 'CI/CD', v: 'GitHub Actions' },
      { k: 'Package Mgr', v: 'pip · requirements.txt' },
    ],
  },
];

export const RISK_PATHS: RiskPath[] = [
  {
    id: 'p-users-search',
    method: 'GET',
    endpoint: '/api/users/search',
    handlerFile: 'app/api/users.py',
    handlerLine: 38,
    functionName: 'search_users()',
    sink: 'PostgreSQL · SQL interpolation',
    risk: 'critical',
    findingIds: ['F-0001'],
  },
  {
    id: 'p-admin-role',
    method: 'PATCH',
    endpoint: '/api/admin/users/:id',
    handlerFile: 'app/api/admin/users.py',
    handlerLine: 112,
    functionName: 'update_role()',
    sink: 'PostgreSQL · role mutation',
    risk: 'high',
    findingIds: ['F-0003', 'F-0010'],
  },
  {
    id: 'p-report-export',
    method: 'GET',
    endpoint: '/api/reports/export',
    handlerFile: 'app/services/reports.py',
    handlerLine: 64,
    functionName: 'export_report()',
    sink: 'Filesystem · path join',
    risk: 'high',
    findingIds: ['F-0004'],
  },
  {
    id: 'p-auth-login',
    method: 'POST',
    endpoint: '/api/auth/login',
    handlerFile: 'app/api/auth.py',
    handlerLine: 200,
    functionName: 'login()',
    sink: 'PostgreSQL · user lookup',
    risk: 'medium',
    findingIds: ['F-0007', 'F-0011'],
  },
  {
    id: 'p-imports-url',
    method: 'POST',
    endpoint: '/api/imports/url',
    handlerFile: 'app/services/imports.py',
    handlerLine: 46,
    functionName: 'import_from_url()',
    sink: 'External HTTP · no allowlist',
    risk: 'medium',
    findingIds: ['F-0009'],
  },
  {
    id: 'p-health',
    method: 'GET',
    endpoint: '/api/health',
    handlerFile: 'main.py',
    handlerLine: 8,
    functionName: 'health()',
    sink: 'Version banner',
    risk: 'low',
    findingIds: ['F-0013', 'F-0014'],
  },
];

/* Completed assessment #0241 — activity feed shown on the overview */
export const COMPLETED_ACTIVITY: ActivityItem[] = [
  { time: '09:41:22', text: 'indexer: 1,284 files indexed', tone: 'ok' },
  { time: '09:41:25', text: 'architect: 12 modules · 4 layers · data flow mapped', tone: 'ok' },
  { time: '09:41:31', text: 'semgrep: 152 rules · 14 findings', tone: 'info' },
  { time: '09:41:34', text: 'secret-detector: 2 secrets found', tone: 'warn' },
  { time: '09:41:38', text: 'trivy: 142 packages · 5 vulnerabilities', tone: 'warn' },
  { time: '09:41:42', text: 'reasoner: CWE-89 · confidence 97%', tone: 'info' },
  { time: '09:41:45', text: 'reasoner: CWE-798 · confidence 99%', tone: 'info' },
  { time: '09:41:51', text: 'sandbox: container secure-sandbox-0241 created', tone: 'info' },
  { time: '09:41:55', text: 'validator: SQL injection REPRODUCED · HTTP 500', tone: 'err' },
  { time: '09:41:58', text: 'validator: test complete · 4/4 reproduced', tone: 'warn' },
  { time: '09:42:01', text: 'scorer: 74/100 · HIGH RISK', tone: 'warn' },
  { time: '09:42:04', text: 'assessment #0241 completed', tone: 'ok' },
];