import axios from 'axios';

/** Effective ZORQEN API base URL, always ending in `/api`.
 *
 * `VITE_API_URL` is a build-time deployment setting. In production the
 * frontend (Cloudflare) and backend (Render) are different origins, so
 * `VITE_API_URL` must point at the Render backend (e.g.
 * `https://zorqen-api.onrender.com`). In local development the Vite dev
 * server proxies `/api` to the local backend, so the value is left unset
 * and the same-origin relative path `/api` is used. When set, the value may
 * be a bare backend origin (without the `/api` suffix) — all backend routes
 * live under `/api`, so the raw value is normalized to always target the
 * canonical `/api` namespace.
 */
export function getApiBase(): string {
  const raw = (import.meta.env.VITE_API_URL || '/api').trim();
  return raw.replace(/\/+$/, '').replace(/\/api$/, '') + '/api';
}

const BASE_URL = getApiBase();

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  withCredentials: true,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('zorqen_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 by dispatching a custom event — never reload the page directly.
// Using a CustomEvent lets the React WorkspaceProvider catch it and call signOut()
// cleanly without destroying the entire SPA (which caused the Vercel flash/reload).
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('zorqen_token');
      localStorage.removeItem('zorqen_user');
      // Signal React to handle the logout; avoids a full page reload
      window.dispatchEvent(new CustomEvent('zorqen:401'));
    }
    return Promise.reject(err);
  }
);

// ── Auth ────────────────────────────────────────────────────────────────────
export const getMe = () => api.get('/auth/me');

// ── Repositories ────────────────────────────────────────────────────────────
export const listRepositories = () => api.get('/repositories');
export const listGitHubRepos = () => api.get('/repositories/github');
export const connectRepository = (data: object) => api.post('/repositories', data);
export const getRepository = (id: string) => api.get(`/repositories/${id}`);
export const getRepoDetail = (id: string) => api.get(`/repositories/${id}/detail`);
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

// ── Copilot (ASK ZORQEN) ────────────────────────────────────────────────────
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
