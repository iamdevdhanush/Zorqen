import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { ActivityItem, AssessmentRun, Finding, FindingStatus, LogLine, RepoMeta } from '../lib/types';
import { listGitHubRepos } from '../services/api';
import {
  COMPLETED_ACTIVITY,
  COMPLETED_STEPS,
  CYBER_PORTAL,
  DEMO_REPO,
  PIPELINE_FINAL_LOGS,
  PIPELINE_STEPS,
  generateFindingsFor,
} from '../lib/demo';
import type { AuthUser } from '../App';

const DEMO_USER: AuthUser = {
  id: 'demo-user',
  github_login: 'secureops',
  github_name: 'Secure Ops',
  github_avatar_url: '',
  is_demo: true,
};

interface ScheduleEvent {
  at: number;
  kind: 'step-done' | 'step-run' | 'log' | 'complete';
  stepId?: string;
  log?: { time: string; source: string; text: string; tone?: 'ok' | 'warn' | 'err' | 'info' };
}

function buildSchedule(): ScheduleEvent[] {
  const events: ScheduleEvent[] = [];
  const t0 = Date.now();
  let cursor = 0;
  for (const step of PIPELINE_STEPS) {
    events.push({ at: t0 + cursor, kind: 'step-run', stepId: step.id });
    cursor += 400;
    for (const [text, tone] of step.logs) {
      events.push({ at: t0 + cursor, kind: 'log', stepId: step.id, log: { time: '—', source: text.split(':')[0], text, tone: tone as any } });
      cursor += 350;
    }
    events.push({ at: t0 + cursor, kind: 'step-done', stepId: step.id });
    cursor += 900;
  }
  const endAt = t0 + cursor + 800;
  for (const l of PIPELINE_FINAL_LOGS) events.push({ at: endAt + 900, kind: 'log', log: l });
  events.push({ at: endAt + 1600, kind: 'complete' });
  return events;
}

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

  signInDemo: () => void;
  signInGithub: (user: AuthUser) => void;
  signOut: () => void;
  connectGithub: () => void;
  proceedGithubAuth: () => void;
  disconnectGithub: () => void;
  refreshRepos: () => Promise<void>;
  loadDemoRepo: () => void;
  selectRepo: (id: string) => void;
  loadRepo: (repo: RepoMeta) => void;
  startAssessment: () => void;
  markFinding: (findingId: string, status: FindingStatus) => void;
}

export type WorkspaceState = WorkspaceDataState & WorkspaceUIState;

const WorkspaceUIContext = createContext<WorkspaceUIState | null>(null);
const WorkspaceDataContext = createContext<WorkspaceDataState | null>(null);

let runSeq = 242;

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [githubConnected, setGithubConnected] = useState(false);
  const [githubModalOpen, setGithubModalOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [repos, setRepos] = useState<RepoMeta[]>([DEMO_REPO]);
  const [reposLoading, setReposLoading] = useState(false);
  const [reposError, setReposError] = useState<string | null>(null);
  const [currentRepo, setCurrentRepo] = useState<RepoMeta | null>(null);
  const [branch, setBranch] = useState('main');
  const [commit, setCommit] = useState<string>(DEMO_REPO.commit || 'main');
  const [assessments, setAssessments] = useState<AssessmentRun[]>([]);
  const [currentAssessment, setCurrentAssessment] = useState<AssessmentRun | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [notifications, setNotifications] = useState<LogLine[]>([]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Fetch the connected GitHub account's repositories (all pages, live data) */
  const refreshRepos = useCallback(async () => {
    const stored = localStorage.getItem('raksha_user');
    if (!stored) return;
    const parsed = JSON.parse(stored) as AuthUser;
    if (parsed.is_demo) return;

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

  /* Restore session */
  useEffect(() => {
    const storedUser = localStorage.getItem('raksha_user');
    const storedRepo = localStorage.getItem('raksha_repo');
    const storedAssess = localStorage.getItem('raksha_assessment');
    if (storedUser) {
      const u = JSON.parse(storedUser);
      setUser(u);
      setGithubConnected(!u.is_demo);
      if (!u.is_demo) {
        setRepos([]);
        refreshRepos();
      }
    }
    if (storedRepo) {
      const r = JSON.parse(storedRepo) as RepoMeta;
      setCurrentRepo(r);
      setCommit(r.commit || 'main');
    }
    if (storedAssess) {
      const a = JSON.parse(storedAssess) as AssessmentRun;
      setCurrentAssessment(a);
      setAssessments([a]);
    }
  }, [refreshRepos]);

  const persist = useCallback(() => {
    if (currentRepo) localStorage.setItem('raksha_repo', JSON.stringify(currentRepo));
  }, [currentRepo]);

  useEffect(() => persist(), [persist]);
  useEffect(() => {
    if (currentAssessment) localStorage.setItem('raksha_assessment', JSON.stringify(currentAssessment));
  }, [currentAssessment]);

  /* Simulation driver — mutates a local snapshot, then commits to state */
  const startSimulation = useCallback(
    (assessment: AssessmentRun) => {
      if (timerRef.current) clearInterval(timerRef.current);
      const schedule = buildSchedule();
      const startTime = Date.now();
      const snap = {
        steps: assessment.steps.map((s) => ({ ...s })),
        logs: [...assessment.logs],
      };
      let done = false;

      const tick = () => {
        if (done) return;
        const now = Date.now();
        let dirty = false;
        let hasEvents = false;

        for (const ev of schedule) {
          if (now < ev.at) break;
          hasEvents = true;
          if (ev.kind === 'step-run') {
            const s = snap.steps.find((x) => x.id === ev.stepId);
            if (s && s.status !== 'running') { s.status = 'running'; dirty = true; }
          } else if (ev.kind === 'step-done') {
            const s = snap.steps.find((x) => x.id === ev.stepId);
            if (s && s.status !== 'completed') { s.status = 'completed'; dirty = true; }
          } else if (ev.kind === 'log' && ev.log) {
            const line: LogLine = {
              ...ev.log,
              time: ev.log.time === '—' ? fmtTime(new Date(startTime + (ev.at - startTime))) : ev.log.time,
              source: ev.log.source,
            };
            if (!snap.logs.some((l) => l.text === line.text)) {
              snap.logs.push(line);
              dirty = true;
            }
          } else if (ev.kind === 'complete') {
            done = true;
            snap.steps = snap.steps.map((s) => ({ ...s, status: 'completed' as const }));
            dirty = true;
          }
        }

        if (hasEvents && !done && dirty) {
          setAssessments([{ ...assessment, steps: snap.steps, logs: snap.logs, status: 'RUNNING' }]);
        }
        if (dirty) {
          const last = snap.logs[snap.logs.length - 1];
          if (last && (last.tone === 'err' || last.tone === 'warn') && !last.text.startsWith('scorer')) {
            setNotifications((n) => (n[n.length - 1]?.text === last.text ? n : [...n.slice(-4), last]));
          }
        }
        if (done) {
          if (timerRef.current) clearInterval(timerRef.current);
          setAssessments([
            {
              ...assessment,
              steps: snap.steps,
              logs: snap.logs,
              status: 'COMPLETED',
              score: 74,
              duration: `${Math.round((Date.now() - startTime) / 1000)}s`,
              findings: generateFindingsFor({ name: assessment.repo } as RepoMeta),
            },
          ]);
        }
      };

      tick();
      timerRef.current = setInterval(tick, 400);
    },
    []
  );

  /* Cleanup timers */
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  /* Derive activity from the current assessment */
  useEffect(() => {
    if (!currentAssessment) return;
    const items: ActivityItem[] = currentAssessment.logs.map((l) => ({
      time: l.time === '—' ? new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : l.time,
      text: `${l.source}: ${l.text}`,
      tone: l.tone,
    }));
    setActivity(items);
  }, [currentAssessment]);

  const loadRepo = useCallback(
    (repo: RepoMeta) => {
      setCurrentRepo(repo);
      setCommit(repo.commit || 'main');
      setBranch(repo.defaultBranch);
      setAssessments([]);
      setCurrentAssessment(null);
      const completedRun: AssessmentRun = {
        id: '#0241',
        repo: repo.name,
        commit: repo.commit || 'main',
        branch: repo.defaultBranch,
        status: 'COMPLETED',
        startedAt: '09:41:18',
        duration: '46s',
        score: repo.name === DEMO_REPO.name ? 74 : 61,
        steps: COMPLETED_STEPS,
        logs: repo.name === DEMO_REPO.name ? COMPLETED_ACTIVITY.map((a) => ({ time: a.time, source: a.text.split(':')[0], text: a.text.split(':').slice(1).join(':').trim(), tone: a.tone })) : COMPLETED_ACTIVITY.map((a) => ({ time: a.time, source: a.text.split(':')[0], text: a.text.split(':').slice(1).join(':').trim(), tone: a.tone })),
        findings: generateFindingsFor(repo),
      };
      setAssessments([completedRun]);
      setCurrentAssessment(completedRun);
    },
    []
  );

  const loadDemoRepo = useCallback(() => {
    const u = localStorage.getItem('raksha_user');
    if (u) {
      const parsed = JSON.parse(u);
      setUser(parsed);
      setGithubConnected(!parsed.is_demo);
    } else {
      setUser(DEMO_USER);
      setGithubConnected(false);
    }
    loadRepo(DEMO_REPO);
  }, [loadRepo]);

  const selectRepo = useCallback((id: string) => {
    const repo = [DEMO_REPO, CYBER_PORTAL].find((r) => r.id === id);
    if (repo) loadRepo(repo);
  }, [loadRepo]);

  const startAssessment = useCallback(() => {
    if (!currentRepo) return;
    const id = `#${runSeq++}`;
    const run: AssessmentRun = {
      id,
      repo: currentRepo.name,
      commit,
      branch,
      status: 'RUNNING',
      startedAt: fmtTime(new Date()),
      steps: PIPELINE_STEPS.map((s) => ({ id: s.id, label: s.label, status: 'pending' })),
      logs: [{ time: fmtTime(new Date()), source: 'raksha', text: `assessment ${id} queued · repo ${currentRepo.name}@${commit}`, tone: 'info' }],
      findings: [],
    };
    setAssessments([run, ...assessments]);
    setCurrentAssessment(run);
    startSimulation(run);
  }, [currentRepo, commit, branch, assessments, startSimulation]);

  const markFinding = useCallback(
    (findingId: string, status: FindingStatus) => {
      setCurrentAssessment((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          findings: prev.findings.map((f) => (f.id === findingId ? { ...f, status } : f)),
        };
      });
    },
    []
  );

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
      signInDemo: loadDemoRepo,
      signInGithub: (u: AuthUser) => {
        setUser(u);
        setGithubConnected(true);
        localStorage.setItem('raksha_user', JSON.stringify(u));
        setRepos([]);
        loadRepo(DEMO_REPO);
        refreshRepos();
      },
      signOut: () => {
        localStorage.removeItem('raksha_token');
        localStorage.removeItem('raksha_user');
        localStorage.removeItem('raksha_repo');
        localStorage.removeItem('raksha_assessment');
        setUser(null);
        setGithubConnected(false);
        setCurrentRepo(null);
        setCurrentAssessment(null);
        setAssessments([]);
        setRepos([DEMO_REPO]);
        setReposError(null);
      },
      connectGithub: () => setGithubModalOpen(true),
      proceedGithubAuth: () => {
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
        window.location.href = `${apiBase}/auth/github`;
      },
      disconnectGithub: () => {
        setGithubConnected(false);
      },
      refreshRepos,
      loadDemoRepo,
      selectRepo,
      loadRepo,
      startAssessment,
      markFinding,
    }),
    [user, githubConnected, repos, reposLoading, reposError, currentRepo, branch, commit, assessments, currentAssessment, activity, notifications, loadDemoRepo, selectRepo, loadRepo, startAssessment, markFinding, refreshRepos]
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