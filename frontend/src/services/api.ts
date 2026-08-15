import axios from 'axios';

/** Effective RAKSHA API base URL, always ending in `/api`.
 *
 * `VITE_API_URL` is a deployment setting that operators have historically set
 * to the bare backend origin (e.g. `https://raksha-ai-b8wf.onrender.com`)
 * without the `/api` suffix. All backend routes live under `/api`, so requests
 * built from the raw value silently 404. This normalizes the value so the
 * frontend always targets the canonical `/api` namespace regardless of how the
 * environment variable was configured.
 */
export function getApiBase(): string {
  const raw = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').trim();
  return raw.replace(/\/+$/, '').replace(/\/api$/, '') + '/api';
}

const BASE_URL = getApiBase();

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('raksha_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 by clearing token
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('raksha_token');
      localStorage.removeItem('raksha_user');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

// ── Auth ────────────────────────────────────────────────────────────────────
export const demoLogin = () => api.post('/auth/demo-login');
export const getMe = () => api.get('/auth/me');

// ── Demo ────────────────────────────────────────────────────────────────────
export const getDemoRepository = () => api.get('/demo/repository');
export const getDemoAssessment = () => api.get('/demo/assessment');
export const getDemoFindings = (filters?: { severity?: string; status?: string }) =>
  api.get('/demo/findings', { params: filters });
export const getDemoFinding = (id: string) => api.get(`/demo/findings/${id}`);
export const getDemoScore = () => api.get('/demo/score');
export const getDemoArchitecture = () => api.get('/demo/architecture');
export const getDemoTimeline = () => api.get('/demo/timeline');
export const getDemoSourceFile = (path: string) => api.get(`/demo/source/${path}`);
export const listDemoSourceFiles = () => api.get('/demo/source');
export const simulateRemediation = (findingId: string) =>
  api.post(`/demo/simulate-remediation/${findingId}`);

// ── Repositories ────────────────────────────────────────────────────────────
export const listRepositories = () => api.get('/repositories');
export const listGitHubRepos = () => api.get('/repositories/github');
export const connectRepository = (data: object) => api.post('/repositories', data);
export const getRepository = (id: string) => api.get(`/repositories/${id}`);
export const getRepoBranches = (id: string) => api.get(`/repositories/${id}/branches`);
export const getRepoCommits = (id: string, branch: string) =>
  api.get(`/repositories/${id}/commits`, { params: { branch } });

// ── Assessments ─────────────────────────────────────────────────────────────
export const startAssessment = (data: object) => api.post('/assessments', data);
export const getAssessment = (id: string) => api.get(`/assessments/${id}`);
export const getAssessmentFindings = (id: string, filters?: object) =>
  api.get(`/assessments/${id}/findings`, { params: filters });
export const listRepoAssessments = (repoId: string) => api.get(`/assessments/repository/${repoId}`);

// ── Findings ────────────────────────────────────────────────────────────────
export const getFinding = (id: string) => api.get(`/findings/${id}`);
export const dismissFinding = (id: string) => api.post(`/findings/${id}/dismiss`);
export const generateFix = (findingId: string) => api.post(`/findings/${findingId}/generate-fix`);

// ── Copilot (ASK RAKSHA) ────────────────────────────────────────────────────
export interface CopilotSource {
  type: 'repository' | 'assessment' | 'finding' | 'source';
  id?: string;
  run_number?: number;
  title?: string;
  name?: string;
  file?: string;
  line?: number;
  finding_id?: string;
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface CopilotChatContext {
  page: string;
  repositoryId?: string;
  assessmentId?: string;
  findingId?: string;
  history?: ChatTurn[];
}

export const copilotChat = (message: string, context: CopilotChatContext) =>
  api.post('/copilot/chat', { message, context }, { timeout: 90000 });

// ── Health ──────────────────────────────────────────────────────────────────
export const getHealth = () => api.get('/health');

export default api;
