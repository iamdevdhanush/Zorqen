import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { ActivityItem, AssessmentRun, Finding, FindingStatus, LogLine, RepoMeta } from '../lib/types';
import {
  getApiBase,
  listGitHubRepos,
  listRepoAssessments,
  getAssessment,
  startAssessment as apiStartAssessment,
} from '../services/api';
import type { AuthUser } from '../App';

function fmtTime(d: Date): string {
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export interface WorkspaceUIState {
  copilotOpen: boolean;
  setCopilotOpen: (open: boolean) => void;
  githubModalOpen: boolean;
  setGithubModalOpen: (open: boolean) => void;
}

export interface WorkspaceDataState {
  user: AuthUser | null;
  githubConnected: boolean;
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

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activePollRef = useRef<string | null>(null);
  const assessmentsReqIdRef = useRef(0);
  const initialRestoredRef = useRef(false);

  // Stable ref to currentRepo — allows loadRepo to read latest value without being in deps
  const currentRepoRef = useRef<RepoMeta | null>(null);
  currentRepoRef.current = currentRepo;

  // Stable ref to repos — allows selectRepo to read latest value without being in deps
  const reposRef = useRef<RepoMeta[]>([]);
  reposRef.current = repos;

  // Stable ref to branch — allows startAssessment to read latest value without being in deps
  const branchRef = useRef<string>('main');
  branchRef.current = branch;

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    activePollRef.current = null;
  }, []);

  /* Fetch the connected GitHub account's repositories (all pages, live data) */
  const refreshRepos = useCallback(async () => {
    setReposLoading(true);
    setReposError(null);
    try {
      const { data } = await listGitHubRepos();
      setRepos((data.repositories ?? []) as RepoMeta[]);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setReposError(status ? `GitHub repositories unavailable (HTTP ${status})` : 'GitHub repositories unavailable');
    } finally {
      setReposLoading(false);
    }
  }, []);

  /* Load the real assessments for a repository from the backend */
  const loadAssessments = useCallback(async (repoId: string) => {
    const reqId = ++assessmentsReqIdRef.current;
    try {
      const { data } = await listRepoAssessments(repoId);
      if (reqId !== assessmentsReqIdRef.current) return;
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
    } catch {
      // Do not erase existing valid data on transient network errors
    }
  }, []);

  // loadRepo: uses currentRepoRef so it never needs currentRepo in its deps
  // This prevents loadRepo from being recreated on every currentRepo state change
  const loadRepo = useCallback(
    (repo: RepoMeta) => {
      const dbId = repo.rakshaId || repo.id;
      const prev = currentRepoRef.current;

      // Check if this is the same repository already loaded in workspace
      const isSameRepo = prev && (
        prev.id === repo.id ||
        String(prev.id) === String(repo.id) ||
        (repo.rakshaId && prev.rakshaId === repo.rakshaId) ||
        (repo.rakshaId && prev.id === repo.rakshaId) ||
        (prev.rakshaId && prev.rakshaId === repo.id)
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

  /* Poll a real run until it leaves RUNNING, then load its final contract */
  const pollAssessment = useCallback(
    (assessmentRef: string) => {
      stopPolling();
      activePollRef.current = assessmentRef;
      let attempts = 0;
      const tick = async () => {
        if (activePollRef.current !== assessmentRef) return;
        attempts += 1;
        try {
          const { data } = await getAssessment(assessmentRef);
          const run = data as AssessmentRun;
          const last = run.logs[run.logs.length - 1];
          if (last && (last.tone === 'warn' || last.tone === 'err')) {
            pushNotification({ time: last.time, source: last.source, text: last.text, tone: last.tone });
          }
          if (run.status === 'RUNNING' && attempts < 300) {
            setCurrentAssessment(run);
            setAssessments((prev) => [run, ...prev.filter((a) => a.id !== run.id)]);
            return;
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
    [pushNotification, stopPolling]
  );

  // startAssessment: uses branchRef and currentRepoRef so it never needs them in deps
  const startAssessment = useCallback(async () => {
    const repo = currentRepoRef.current;
    if (!repo) return;
    stopPolling();
    try {
      const dbId = repo.rakshaId || repo.id;
      const { data } = await apiStartAssessment({ repository_id: dbId, branch: branchRef.current });
      const run = data as AssessmentRun;
      setAssessments((prev) => [run, ...prev]);
      setCurrentAssessment(run);
      if (run.commit) setCommit(run.commit);
      pollAssessment(run.id.replace('#', ''));
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      pushNotification({
        time: fmtTime(new Date()),
        source: 'raksha',
        text: detail || 'failed to start assessment',
        tone: 'err',
      });
    }
  }, [pollAssessment, pushNotification, stopPolling]); // currentRepo & branch removed — read via refs

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
    localStorage.setItem('raksha_user', JSON.stringify(u));
    setRepos([]);
    void refreshRepos();
  }, [refreshRepos]);

  const signOut = useCallback(() => {
    stopPolling();
    localStorage.removeItem('raksha_token');
    localStorage.removeItem('raksha_user');
    localStorage.removeItem('raksha_repo');
    setUser(null);
    setGithubConnected(false);
    setCurrentRepo(null);
    setCurrentAssessment(null);
    setAssessments([]);
    setRepos([]);
    setReposError(null);
    setNotifications([]);
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
  }, [stopPolling]);

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
     Uses empty deps + initialRestoredRef guard so it runs exactly once
     on mount regardless of React StrictMode double-invocation. */
  useEffect(() => {
    if (initialRestoredRef.current) return;
    initialRestoredRef.current = true;
    const storedUser = localStorage.getItem('raksha_user');
    const storedRepo = localStorage.getItem('raksha_repo');
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser) as AuthUser;
        setUser(u);
        setGithubConnected(true);
        void refreshRepos();
      } catch {
        /* ignore malformed session */
      }
    }
    if (storedRepo) {
      try {
        const r = JSON.parse(storedRepo) as RepoMeta;
        setCurrentRepo(r);
        setBranch(r.defaultBranch || 'main');
        setCommit(r.commit || 'main');
        const dbId = r.rakshaId || r.id;
        if (dbId) void loadAssessments(dbId);
      } catch {
        /* ignore malformed session */
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty — session restore runs once on mount only

  /* Persist the selected repository so a reload restores the workspace */
  useEffect(() => {
    if (currentRepo) localStorage.setItem('raksha_repo', JSON.stringify(currentRepo));
  }, [currentRepo]);

  /* Cleanup poller on unmount */
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  /* Listen for 401 events dispatched by the Axios interceptor.
     The interceptor no longer does window.location.href = '/' (which caused full reloads).
     Instead it fires this event so the WorkspaceProvider can call signOut() in React. */
  useEffect(() => {
    const handle = () => {
      stopPolling();
      setUser(null);
      setGithubConnected(false);
      setCurrentRepo(null);
      setCurrentAssessment(null);
      setAssessments([]);
      setRepos([]);
      setReposError(null);
      setNotifications([]);
    };
    window.addEventListener('raksha:401', handle);
    return () => window.removeEventListener('raksha:401', handle);
  }, [stopPolling]);

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
    }),
    // stopPolling intentionally removed — it is not part of the public interface
    // and including it caused dataValue to rebuild on every poll stop/start
    [user, githubConnected, repos, reposLoading, reposError, currentRepo, branch, commit, assessments, currentAssessment, activity, notifications, signInGithub, signOut, connectGithub, proceedGithubAuth, disconnectGithub, refreshRepos, selectRepo, loadRepo, startAssessment, markFinding]
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

export function useFinding(id: string | undefined): Finding | undefined {
  const { currentAssessment } = useWorkspaceData();
  if (!id) return undefined;
  return currentAssessment?.findings.find((f) => f.id === id);
}
