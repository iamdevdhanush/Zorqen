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
    try {
      const { data } = await listRepoAssessments(repoId);
      const runs = (data.runs ?? []) as AssessmentRun[];
      setAssessments(runs);
      const active = runs.find((r) => r.status === 'RUNNING');
      setCurrentAssessment(active ?? runs[0] ?? null);
      if (runs[0]?.commit) setCommit(runs[0].commit);
    } catch {
      setAssessments([]);
      setCurrentAssessment(null);
    }
  }, []);

  const loadRepo = useCallback(
    (repo: RepoMeta) => {
      stopPolling();
      setCurrentRepo(repo);
      setBranch(repo.defaultBranch || 'main');
      setCommit(repo.commit || 'main');
      setAssessments([]);
      setCurrentAssessment(null);
      if (repo.id) void loadAssessments(repo.id);
    },
    [loadAssessments, stopPolling]
  );

  const selectRepo = useCallback(
    (id: string) => {
      const repo = repos.find((r) => r.id === id);
      if (repo) loadRepo(repo);
    },
    [repos, loadRepo]
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

  /* Start a real assessment run against the current repository */
  const startAssessment = useCallback(async () => {
    if (!currentRepo) return;
    stopPolling();
    try {
      const { data } = await apiStartAssessment({ repository_id: currentRepo.id, branch });
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
  }, [currentRepo, branch, pollAssessment, pushNotification, stopPolling]);

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

  /* Restore session: user + repositories + previously selected repo */
  useEffect(() => {
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
        if (r.id) void loadAssessments(r.id);
      } catch {
        /* ignore malformed session */
      }
    }
  }, [refreshRepos, loadAssessments]);

  /* Persist the selected repository so a reload restores the workspace */
  useEffect(() => {
    if (currentRepo) localStorage.setItem('raksha_repo', JSON.stringify(currentRepo));
  }, [currentRepo]);

  /* Cleanup poller on unmount */
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const markFinding = useCallback((findingId: string, status: FindingStatus) => {
    setCurrentAssessment((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        findings: prev.findings.map((f) => (f.id === findingId ? { ...f, status } : f)),
      };
    });
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
      signInGithub: (u: AuthUser) => {
        setUser(u);
        setGithubConnected(true);
        localStorage.setItem('raksha_user', JSON.stringify(u));
        setRepos([]);
        void refreshRepos();
      },
      signOut: () => {
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
      },
      connectGithub: () => setGithubModalOpen(true),
      proceedGithubAuth: () => {
        window.location.href = `${getApiBase()}/auth/github`;
      },
      disconnectGithub: () => {
        stopPolling();
        setGithubConnected(false);
        setCurrentRepo(null);
        setCurrentAssessment(null);
        setAssessments([]);
        setRepos([]);
      },
      refreshRepos,
      selectRepo,
      loadRepo,
      startAssessment,
      markFinding,
    }),
    [user, githubConnected, repos, reposLoading, reposError, currentRepo, branch, commit, assessments, currentAssessment, activity, notifications, refreshRepos, selectRepo, loadRepo, startAssessment, markFinding, stopPolling]
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
