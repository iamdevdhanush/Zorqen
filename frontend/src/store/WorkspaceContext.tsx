import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { ActivityItem, AssessmentRun, Finding, FindingStatus, LogLine, RepoMeta } from '../lib/types';
import {
  getApiBase,
  listGitHubRepos,
  listRepoAssessments,
  getAssessment,
  startAssessment as apiStartAssessment,
  subscribeToAssessmentEvents,
  testGrokKey,
} from '../services/api';
import type { AuthUser } from '../App';
import type { ProgressEvent } from '../lib/types';

function fmtTime(d: Date): string {
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/** Returns true when localStorage has a JWT that has not expired yet. */
function hasValidToken(): boolean {
  const token = localStorage.getItem('zorqen_token');
  if (!token) return false;
  try {
    // JWT payload is the middle base64url segment
    const payloadB64 = token.split('.')[1];
    if (!payloadB64) return false;
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload?.exp) return true; // no exp claim — treat as valid
    // Give 30 s leeway so a near-expiry token isn't called mid-request
    return Date.now() < (payload.exp - 30) * 1000;
  } catch {
    return false; // malformed token → treat as invalid
  }
}

/** BYOK xAI Grok key status — lives in memory only, never persisted. */
export type GrokKeyStatus =
  | { state: 'idle' }
  | { state: 'testing' }
  | { state: 'connected'; model: string }
  | { state: 'error'; message: string };

export interface WorkspaceUIState {
  copilotOpen: boolean;
  setCopilotOpen: (open: boolean) => void;
  githubModalOpen: boolean;
  setGithubModalOpen: (open: boolean) => void;
}

export interface WorkspaceDataState {
  user: AuthUser | null;
  githubConnected: boolean;
  /** true once session-restore has completed (regardless of auth outcome) */
  authReady: boolean;
  repos: RepoMeta[];
  reposLoading: boolean;
  reposError: string | null;
  currentRepo: RepoMeta | null;
  branch: string;
  commit: string;
  assessments: AssessmentRun[];
  currentAssessment: AssessmentRun | null;
  activity: ActivityItem[];
  notifications: LogLine[];

  /** BYOK xAI Grok key — memory only, never persisted */
  grokKey: string | null;
  grokStatus: GrokKeyStatus;

  signInGithub: (user: AuthUser) => void;
  signOut: () => void;
  connectGithub: () => void;
  proceedGithubAuth: () => void;
  disconnectGithub: () => void;
  refreshRepos: () => Promise<void>;
  selectRepo: (id: string) => void;
  loadRepo: (repo: RepoMeta) => void;
  startAssessment: () => Promise<void>;
  markFinding: (findingId: string, status: FindingStatus) => void;
  /** Set the BYOK xAI key in memory (never persisted) */
  setGrokKey: (key: string) => void;
  /** Clear the BYOK xAI key and reset status */
  clearGrokKey: () => void;
  /** Fire a real connection test against the xAI API */
  testGrokConnection: () => Promise<void>;
}

export type WorkspaceState = WorkspaceDataState & WorkspaceUIState;

const WorkspaceUIContext = createContext<WorkspaceUIState | null>(null);
const WorkspaceDataContext = createContext<WorkspaceDataState | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [githubConnected, setGithubConnected] = useState(false);
  const [githubModalOpen, setGithubModalOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [repos, setRepos] = useState<RepoMeta[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [reposError, setReposError] = useState<string | null>(null);
  const [currentRepo, setCurrentRepo] = useState<RepoMeta | null>(null);
  const [branch, setBranch] = useState('main');
  const [commit, setCommit] = useState('main');
  const [assessments, setAssessments] = useState<AssessmentRun[]>([]);
  const [currentAssessment, setCurrentAssessment] = useState<AssessmentRun | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [notifications, setNotifications] = useState<LogLine[]>([]);

  // BYOK xAI Grok key — lives in React state (memory) only, never persisted
  const [grokKey, setGrokKeyState] = useState<string | null>(null);
  const [grokStatus, setGrokStatus] = useState<GrokKeyStatus>({ state: 'idle' });
  // Stable ref so callbacks can read latest key without being in their deps
  const grokKeyRef = useRef<string | null>(null);
  grokKeyRef.current = grokKey;

  // authReady: true once session restore has run (whether authenticated or not).
  // All auth-gated API calls MUST wait for authReady before firing.
  const [authReady, setAuthReady] = useState(false);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activePollRef = useRef<string | null>(null);
  const sseAbortRef = useRef<AbortController | null>(null);
  const assessmentsReqIdRef = useRef(0);
  const initialRestoredRef = useRef(false);

  // True while a POST /assessments is in flight — rapid double-clicks must
  // never fire concurrent create requests.
  const assessmentStartInFlightRef = useRef(false);

  // Tracks the last repoId for which loadAssessments succeeded, so we never
  // fire a duplicate call for the same repo while one is already in flight.
  const assessmentsFetchedForRef = useRef<string | null>(null);
  const assessmentsInFlightRef = useRef(false);

  // Stable ref to currentRepo — allows loadRepo to read latest value without being in deps
  const currentRepoRef = useRef<RepoMeta | null>(null);
  currentRepoRef.current = currentRepo;

  // Stable ref to repos — allows selectRepo to read latest value without being in deps
  const reposRef = useRef<RepoMeta[]>([]);
  reposRef.current = repos;

  // Stable ref to assessments — allows startAssessment to check for an active
  // run without depending on the assessments state value.
  const assessmentsRef = useRef<AssessmentRun[]>([]);
  assessmentsRef.current = assessments;

  // Stable ref to branch — allows startAssessment to read latest value without being in deps
  const branchRef = useRef<string>('main');
  branchRef.current = branch;

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (sseAbortRef.current) {
      sseAbortRef.current.abort();
      sseAbortRef.current = null;
    }
    activePollRef.current = null;
  }, []);

  /* Fetch the connected GitHub account's repositories (all pages, live data) */
  const refreshRepos = useCallback(async () => {
    if (!hasValidToken()) return; // never fire without a valid JWT
    setReposLoading(true);
    setReposError(null);
    try {
      const { data } = await listGitHubRepos();
      setRepos((data.repositories ?? []) as RepoMeta[]);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) return; // session cleared by interceptor — don't set error UI
      setReposError(status ? `GitHub repositories unavailable (HTTP ${status})` : 'GitHub repositories unavailable');
    } finally {
      setReposLoading(false);
    }
  }, []);

  /* Load the real assessments for a repository from the backend.
     Guards:
       1. Token must be present and valid before the request fires.
       2. Concurrent calls for the same repoId are debounced (one in-flight at a time).
       3. 401 responses are silently discarded — the interceptor already dispatches
          zorqen:401 which clears the session. We must NOT retry or loop here.
  */
  const loadAssessments = useCallback(async (repoId: string) => {
    // Guard 1: require a valid JWT before touching auth-gated endpoints.
    if (!hasValidToken()) {
      if (import.meta.env.DEV) {
        console.warn('[ZORQEN][ASSESSMENTS] skipped — no valid token', { repoId });
      }
      return;
    }

    // Guard 2: debounce — skip if a request is already in flight.
    if (assessmentsInFlightRef.current) {
      if (import.meta.env.DEV) {
        console.warn('[ZORQEN][ASSESSMENTS] skipped — request already in flight', { repoId });
      }
      return;
    }

    const reqId = ++assessmentsReqIdRef.current;
    assessmentsInFlightRef.current = true;

    if (import.meta.env.DEV) {
      console.log('[ZORQEN][ASSESSMENTS] request_start', {
        repoId,
        reqId,
        hasToken: true,
        timestamp: new Date().toISOString(),
      });
    }

    try {
      const { data } = await listRepoAssessments(repoId);

      // Guard 3: stale response — a newer call superseded this one.
      if (reqId !== assessmentsReqIdRef.current) {
        if (import.meta.env.DEV) {
          console.log('[ZORQEN][ASSESSMENTS] stale response discarded', { repoId, reqId });
        }
        return;
      }

      assessmentsFetchedForRef.current = repoId;
      const runs = (data.runs ?? []) as AssessmentRun[];
      setAssessments(runs);
      const active = runs.find((r) => r.status === 'RUNNING');
      setCurrentAssessment((prev) => {
        if (!runs.length) return null;
        if (active) return active;
        if (prev) {
          const match = runs.find((r) => r.id === prev.id);
          if (match) return match;
        }
        return runs[0];
      });
      if (runs[0]?.commit) setCommit(runs[0].commit);

      if (import.meta.env.DEV) {
        console.log('[ZORQEN][ASSESSMENTS] response_ok', {
          repoId,
          reqId,
          runCount: runs.length,
        });
      }
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;

      if (import.meta.env.DEV) {
        console.warn('[ZORQEN][ASSESSMENTS] response_error', {
          repoId,
          reqId,
          status,
          reason: 'will NOT retry — caller must re-invoke explicitly',
        });
      }

      // 401: the Axios interceptor already dispatches zorqen:401 which clears the
      // session. Do NOT retry, do NOT loop — just bail out silently.
      // Any other error: also do NOT erase existing valid data.
    } finally {
      assessmentsInFlightRef.current = false;
    }
  }, []);

  // loadRepo: uses currentRepoRef so it never needs currentRepo in its deps
  // This prevents loadRepo from being recreated on every currentRepo state change
  const loadRepo = useCallback(
    (repo: RepoMeta) => {
      if (!hasValidToken()) return; // never load a repo without a valid session

      const dbId = repo.zorqenId || repo.id;
      const prev = currentRepoRef.current;

      // Check if this is the same repository already loaded in workspace
      const isSameRepo = prev && (
        prev.id === repo.id ||
        String(prev.id) === String(repo.id) ||
        (repo.zorqenId && prev.zorqenId === repo.zorqenId) ||
        (repo.zorqenId && prev.id === repo.zorqenId) ||
        (prev.zorqenId && prev.zorqenId === repo.id)
      );

      if (isSameRepo) {
        // Preserve existing assessment/polling state when updating metadata
        setCurrentRepo((p) => (p ? { ...p, ...repo } : repo));
        if (repo.defaultBranch) setBranch(repo.defaultBranch);
        if (repo.commit) setCommit(repo.commit);
        if (dbId) void loadAssessments(dbId);
        return;
      }

      stopPolling();
      setCurrentRepo(repo);
      setBranch(repo.defaultBranch || 'main');
      setCommit(repo.commit || 'main');
      // Reset the "fetched-for" tracking so the new repo's assessments load fresh
      assessmentsFetchedForRef.current = null;
      if (dbId) {
        void loadAssessments(dbId);
      } else {
        setAssessments([]);
        setCurrentAssessment(null);
      }
    },
    [loadAssessments, stopPolling] // currentRepo removed — read via currentRepoRef
  );

  // selectRepo: uses reposRef so it never needs repos in its deps
  const selectRepo = useCallback(
    (id: string) => {
      const repo = reposRef.current.find((r) => r.id === id);
      if (repo) loadRepo(repo);
    },
    [loadRepo]
  );

  const pushNotification = useCallback((line: LogLine) => {
    setNotifications((n) => {
      if (n[n.length - 1]?.text === line.text) return n;
      return [...n.slice(-4), line];
    });
  }, []);

  /* Apply a live progress event to the current assessment state. */
  const applyProgressEvent = useCallback((ev: ProgressEvent) => {
    setCurrentAssessment((prev) => {
      if (!prev) return prev;
      const status: AssessmentRun['status'] =
        ev.status === 'failed' ? 'FAILED'
        : ev.status === 'completed' ? 'COMPLETED'
        : prev.status;
      const stageLabel = ev.stage || prev.currentStage;
      const merged: AssessmentRun = {
        ...prev,
        status,
        progress: ev.progress ?? prev.progress,
        currentStage: stageLabel,
        currentFile: ev.file || prev.currentFile,
        filesScanned: ev.filesScanned ?? prev.filesScanned,
        totalFiles: ev.totalFiles ?? prev.totalFiles,
        etaSeconds: ev.etaSeconds ?? prev.etaSeconds,
      };
      if (ev.message && prev.logs[prev.logs.length - 1]?.text !== ev.message) {
        merged.logs = [
          ...prev.logs,
          { time: fmtTime(new Date()), source: 'zorqen', text: ev.message, tone: 'info' },
        ];
      }
      return merged;
    });
    setAssessments((prev) => {
      if (ev.progress === undefined && !ev.stage && !ev.status) return prev;
      return prev.map((a) => {
        if (a.id !== activePollRef.current?.replace('#', '')) return a;
        const status =
          ev.status === 'failed' ? 'FAILED'
          : ev.status === 'completed' ? 'COMPLETED'
          : a.status;
        return {
          ...a,
          progress: ev.progress ?? a.progress,
          currentStage: ev.stage || a.currentStage,
          status,
        };
      });
    });
  }, []);

  /* Poll a real run until it leaves RUNNING, then load its final contract.
     Uses GET /api/assessments/{assessment_id} — a specific assessment endpoint,
     NOT the repository history endpoint. Polling is intentional here because
     we know an assessment is actively running. */
  const pollAssessment = useCallback(
    (assessmentRef: string) => {
      stopPolling();
      activePollRef.current = assessmentRef;

      // 1) Subscribe to the live SSE stream (primary channel).
      const abort = new AbortController();
      sseAbortRef.current = abort;
      void subscribeToAssessmentEvents(assessmentRef, (ev) => {
        if (activePollRef.current !== assessmentRef) return;
        if (ev.status === 'completed' || ev.status === 'failed') {
          stopPolling();
        }
        applyProgressEvent(ev);
      }, abort.signal)
        .catch(() => {
          // SSE unavailable — fall back to polling below.
          if (activePollRef.current !== assessmentRef) return;
        })
        .finally(() => {
          if (sseAbortRef.current === abort) sseAbortRef.current = null;
        });

      // 2) Polling fallback — keeps progress visible if SSE is unavailable.
      let attempts = 0;
      const tick = async () => {
        if (activePollRef.current !== assessmentRef) return;
        // Stop if token expired mid-poll
        if (!hasValidToken()) {
          stopPolling();
          return;
        }
        attempts += 1;
        try {
          const { data } = await getAssessment(assessmentRef);
          const run = data as AssessmentRun;
          const last = run.logs[run.logs.length - 1];
          if (last && (last.tone === 'warn' || last.tone === 'err')) {
            pushNotification({ time: last.time, source: last.source, text: last.text, tone: last.tone });
          }
          if (run.status === 'RUNNING' || run.status === 'IDLE') {
            // Keep polling while the assessment is active. IDLE means the
            // worker has been scheduled but has not written RUNNING yet —
            // stopping on IDLE would freeze the UI mid-start.
            if (attempts < 300) {
              setCurrentAssessment(run);
              setAssessments((prev) => [run, ...prev.filter((a) => a.id !== run.id)]);
              return;
            }
          }
          stopPolling();
          setCurrentAssessment(run);
          setAssessments((prev) => [run, ...prev.filter((a) => a.id !== run.id)]);
          if (run.commit) setCommit(run.commit);
        } catch {
          stopPolling();
        }
      };
      pollTimerRef.current = setInterval(tick, 2000);
      void tick();
    },
    [pushNotification, stopPolling, applyProgressEvent]
  );

  // startAssessment: uses branchRef and currentRepoRef so it never needs them in deps
  const startAssessment = useCallback(async () => {
    const repo = currentRepoRef.current;
    if (!repo || !hasValidToken()) return;

    const dbId = repo.zorqenId || repo.id;

    // LIFECYCLE GUARD: never POST while an assessment is already active for
    // this repository. A freshly created run is serialized as IDLE (PENDING)
    // until the worker writes RUNNING, so both states must block new POSTs.
    // If an active run exists, resume polling it instead — GET only.
    const activeRun = assessmentsRef.current.find(
      (a) =>
        (a.status === 'IDLE' || a.status === 'RUNNING') &&
        a.repoId === dbId
    );
    if (activeRun) {
      pollAssessment(activeRun.id.replace('#', ''));
      return;
    }

    // In-flight guard: rapid double-clicks must not fire concurrent POSTs.
    if (assessmentStartInFlightRef.current) return;
    assessmentStartInFlightRef.current = true;

    stopPolling();
    try {
      const { data } = await apiStartAssessment({ repository_id: dbId, branch: branchRef.current });
      const run = data as AssessmentRun;
      setAssessments((prev) => [run, ...prev]);
      setCurrentAssessment(run);
      if (run.commit) setCommit(run.commit);
      pollAssessment(run.id.replace('#', ''));
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      const isStructured =
        typeof detail === 'object' && detail !== null &&
        (detail as { success?: boolean }).success === false;
      const safeMsg = isStructured
        ? (detail as { message?: string }).message || 'Assessment backend unavailable. Please retry.'
        : typeof detail === 'string'
          ? detail
          : 'Assessment backend unavailable. Please retry.';
      const errorCode = isStructured ? (detail as { code?: string }).code : undefined;

      pushNotification({
        time: fmtTime(new Date()),
        source: 'zorqen',
        text: safeMsg,
        tone: 'err',
      });

      const failedRun: AssessmentRun = {
        id: '#FAIL',
        repoId: dbId,
        repo: repo.name,
        commit: repo.commit || 'HEAD',
        branch: branchRef.current,
        status: 'FAILED',
        errorCode,
        errorMessage: safeMsg,
        steps: [
          { id: 'repository_indexed', label: 'Repository Indexed', status: 'failed' },
          { id: 'architecture_generated', label: 'Architecture Analyzed', status: 'pending' },
          { id: 'dependencies', label: 'Dependencies Scanned', status: 'pending' },
          { id: 'secrets', label: 'Secrets Scan', status: 'pending' },
          { id: 'security_scan', label: 'Static Analysis', status: 'pending' },
          { id: 'ai_reasoning', label: 'AI Correlation', status: 'pending' },
          { id: 'report_generated', label: 'Report Generated', status: 'pending' },
        ],
        logs: [{ time: fmtTime(new Date()), source: 'zorqen', text: safeMsg, tone: 'err' }],
        findings: [],
      };
      setCurrentAssessment(failedRun);
    } finally {
      assessmentStartInFlightRef.current = false;
    }
  }, [pollAssessment, pushNotification, stopPolling]);

  const markFinding = useCallback((findingId: string, status: FindingStatus) => {
    setCurrentAssessment((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        findings: prev.findings.map((f) => (f.id === findingId ? { ...f, status } : f)),
      };
    });
  }, []);

  // Stable action callbacks — extracted so they don't recreate inline inside useMemo
  const signInGithub = useCallback((u: AuthUser) => {
    setUser(u);
    setGithubConnected(true);
    localStorage.setItem('zorqen_user', JSON.stringify(u));
    setRepos([]);
    void refreshRepos();
  }, [refreshRepos]);

  const signOut = useCallback(() => {
    stopPolling();
    localStorage.removeItem('zorqen_token');
    localStorage.removeItem('zorqen_user');
    localStorage.removeItem('zorqen_repo'); // must be cleared to prevent retry on next load
    setUser(null);
    setGithubConnected(false);
    setCurrentRepo(null);
    setCurrentAssessment(null);
    setAssessments([]);
    setRepos([]);
    setReposError(null);
    setNotifications([]);
    assessmentsFetchedForRef.current = null;
    assessmentsInFlightRef.current = false;
    // Clear BYOK key from memory on sign-out
    setGrokKeyState(null);
    setGrokStatus({ state: 'idle' });
  }, [stopPolling]);

  const connectGithub = useCallback(() => setGithubModalOpen(true), []);

  const proceedGithubAuth = useCallback(() => {
    window.location.href = `${getApiBase()}/auth/github`;
  }, []);

  const disconnectGithub = useCallback(() => {
    stopPolling();
    setGithubConnected(false);
    setCurrentRepo(null);
    setCurrentAssessment(null);
    setAssessments([]);
    setRepos([]);
    localStorage.removeItem('zorqen_repo');
    assessmentsFetchedForRef.current = null;
    // Clear BYOK key from memory on disconnect
    setGrokKeyState(null);
    setGrokStatus({ state: 'idle' });
  }, [stopPolling]);

  /* ── BYOK xAI Grok key actions ───────────────────────────────────────── */

  /** Store the API key in React memory only — never in localStorage or DB. */
  const setGrokKey = useCallback((key: string) => {
    const trimmed = key.trim();
    setGrokKeyState(trimmed || null);
    setGrokStatus({ state: 'idle' });
  }, []);

  /** Wipe the key and reset status. */
  const clearGrokKey = useCallback(() => {
    setGrokKeyState(null);
    setGrokStatus({ state: 'idle' });
  }, []);

  /**
   * Test the in-memory BYOK key against the real xAI API.
   * The key is read from grokKeyRef so this callback never needs grokKey in deps.
   */
  const testGrokConnection = useCallback(async () => {
    const key = grokKeyRef.current;
    if (!key) {
      setGrokStatus({ state: 'error', message: 'No API key configured.' });
      return;
    }
    setGrokStatus({ state: 'testing' });
    try {
      const { data } = await testGrokKey(key);
      setGrokStatus({ state: 'connected', model: data.model ?? 'grok' });
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: { message?: string } | string } } })?.response?.data?.detail;
      const msg =
        typeof detail === 'object' && detail !== null && 'message' in detail
          ? (detail as { message: string }).message
          : typeof detail === 'string'
          ? detail
          : 'Connection failed. Check your API key and try again.';
      setGrokStatus({ state: 'error', message: msg });
    }
  }, []);

  /* Derive activity from the current assessment's logs */
  useEffect(() => {
    if (!currentAssessment) {
      setActivity([]);
      return;
    }
    const items: ActivityItem[] = currentAssessment.logs.map((l) => ({
      time: l.time === '—' ? fmtTime(new Date()) : l.time,
      text: `${l.source}: ${l.text}`,
      tone: l.tone,
    }));
    setActivity(items);
  }, [currentAssessment]);

  /* Restore session: user + repositories + previously selected repo.
     Runs exactly once on mount. Sets authReady=true when complete so that
     all auth-gated API calls know the session has been initialized.

     KEY RULE: loadAssessments is only called here if there is a valid JWT token.
     If the token is absent or expired, we do NOT call any protected endpoints. */
  useEffect(() => {
    if (initialRestoredRef.current) return;
    initialRestoredRef.current = true;

    const storedUser = localStorage.getItem('zorqen_user');
    const storedRepo = localStorage.getItem('zorqen_repo');
    const tokenValid = hasValidToken();

    if (storedUser && tokenValid) {
      try {
        const u = JSON.parse(storedUser) as AuthUser;
        setUser(u);
        setGithubConnected(true);
        void refreshRepos();
      } catch {
        /* ignore malformed session */
      }
    } else if (!tokenValid) {
      // Token expired or absent — clear stale session data so we don't attempt
      // auth-gated requests with a dead token.
      localStorage.removeItem('zorqen_token');
      localStorage.removeItem('zorqen_user');
      localStorage.removeItem('zorqen_repo');
    }

    if (storedRepo && tokenValid) {
      try {
        const r = JSON.parse(storedRepo) as RepoMeta;
        setCurrentRepo(r);
        setBranch(r.defaultBranch || 'main');
        setCommit(r.commit || 'main');
        const dbId = r.zorqenId || r.id;
        if (dbId) void loadAssessments(dbId);
      } catch {
        /* ignore malformed session */
      }
    }

    // Signal that session restore is complete regardless of outcome.
    // Components can now make decisions based on auth state.
    setAuthReady(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty — session restore runs once on mount only

  /* Persist the selected repository so a reload restores the workspace */
  useEffect(() => {
    if (currentRepo) localStorage.setItem('zorqen_repo', JSON.stringify(currentRepo));
  }, [currentRepo]);

  /* Cleanup poller on unmount */
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  /* Listen for 401 events dispatched by the Axios interceptor.
     The interceptor no longer does window.location.href = '/' (which caused full reloads).
     Instead it fires this event so the WorkspaceProvider can handle session expiry cleanly.

     IMPORTANT: must clear localStorage.zorqen_repo here so that the next cold start
     does NOT attempt to reload assessments with an invalid/missing token. */
  useEffect(() => {
    const handle = () => {
      stopPolling();
      // Clear persisted repo — otherwise on next load session restore will call
      // loadAssessments again with no token → immediate 401 → loop
      localStorage.removeItem('zorqen_token');
      localStorage.removeItem('zorqen_user');
      localStorage.removeItem('zorqen_repo');
      setUser(null);
      setGithubConnected(false);
      setCurrentRepo(null);
      setCurrentAssessment(null);
      setAssessments([]);
      setRepos([]);
      setReposError(null);
      setNotifications([]);
      assessmentsFetchedForRef.current = null;
      assessmentsInFlightRef.current = false;
    };
    window.addEventListener('zorqen:401', handle);
    return () => window.removeEventListener('zorqen:401', handle);
  }, [stopPolling]);

  /* Clear BYOK key when session expires (zorqen:401) */
  useEffect(() => {
    const handle = () => {
      setGrokKeyState(null);
      setGrokStatus({ state: 'idle' });
    };
    window.addEventListener('zorqen:401', handle);
    return () => window.removeEventListener('zorqen:401', handle);
  }, []);

  const uiValue = useMemo<WorkspaceUIState>(
    () => ({
      copilotOpen,
      setCopilotOpen,
      githubModalOpen,
      setGithubModalOpen,
    }),
    [copilotOpen, githubModalOpen]
  );

  const dataValue = useMemo<WorkspaceDataState>(
    () => ({
      user,
      githubConnected,
      authReady,
      repos,
      reposLoading,
      reposError,
      currentRepo,
      branch,
      commit,
      assessments,
      currentAssessment,
      activity,
      notifications,
      grokKey,
      grokStatus,
      signInGithub,
      signOut,
      connectGithub,
      proceedGithubAuth,
      disconnectGithub,
      refreshRepos,
      selectRepo,
      loadRepo,
      startAssessment,
      markFinding,
      setGrokKey,
      clearGrokKey,
      testGrokConnection,
    }),
    [user, githubConnected, authReady, repos, reposLoading, reposError, currentRepo, branch, commit, assessments, currentAssessment, activity, notifications, grokKey, grokStatus, signInGithub, signOut, connectGithub, proceedGithubAuth, disconnectGithub, refreshRepos, selectRepo, loadRepo, startAssessment, markFinding, setGrokKey, clearGrokKey, testGrokConnection]
  );

  return (
    <WorkspaceUIContext.Provider value={uiValue}>
      <WorkspaceDataContext.Provider value={dataValue}>
        {children}
      </WorkspaceDataContext.Provider>
    </WorkspaceUIContext.Provider>
  );
}

export function useWorkspaceUI(): WorkspaceUIState {
  const ctx = useContext(WorkspaceUIContext);
  if (!ctx) throw new Error('useWorkspaceUI must be used within WorkspaceProvider');
  return ctx;
}

export function useWorkspaceData(): WorkspaceDataState {
  const ctx = useContext(WorkspaceDataContext);
  if (!ctx) throw new Error('useWorkspaceData must be used within WorkspaceProvider');
  return ctx;
}

export function useWorkspace(): WorkspaceState {
  const ui = useWorkspaceUI();
  const data = useWorkspaceData();
  return useMemo(() => ({ ...data, ...ui }), [data, ui]);
}

/** Convenience: findings of the current assessment (subscribes ONLY to data context) */
export function useFindings(): Finding[] {
  const { currentAssessment } = useWorkspaceData();
  return currentAssessment?.findings ?? [];
}

/**
 * True while an assessment is active (IDLE = freshly created PENDING, still
 * waiting for the worker to write RUNNING, or RUNNING). All Run Assessment
 * affordances must disable in BOTH states — otherwise clicks during the IDLE
 * window issue duplicate POST /assessments requests.
 */
export function useAssessmentActive(): boolean {
  const { currentAssessment } = useWorkspaceData();
  const status = currentAssessment?.status;
  return status === 'IDLE' || status === 'RUNNING';
}

export function useFinding(id: string | undefined): Finding | undefined {
  const { currentAssessment } = useWorkspaceData();
  if (!id) return undefined;
  return currentAssessment?.findings.find((f) => f.id === id);
}
