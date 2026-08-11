import { LogOut, PlugZap, RotateCcw, ShieldCheck } from 'lucide-react';
import { KV, KVCol, Panel } from '../components/ui';
import { useWorkspace } from '../store/WorkspaceContext';
import GithubIcon from '../components/GithubIcon';

export default function SettingsPage() {
  const { user, githubConnected, connectGithub, disconnectGithub, signOut, loadDemoRepo, currentRepo } = useWorkspace();

  return (
    <div className="max-w-[860px] mx-auto space-y-6 fade-in py-2">
      
      {/* Editorial Header */}
      <div className="pb-4 border-b border-[var(--color-line)] space-y-1">
        <div className="protocol-tag">raksha://workspace/settings</div>
        <h1 className="text-3xl font-extrabold text-[var(--color-ink)] tracking-tight">
          SETTINGS
        </h1>
        <p className="text-[13px] text-[var(--color-ink-3)]">
          Console configuration and workspace authorization environment.
        </p>
      </div>

      <Panel title="GitHub Integration">
        <div className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <GithubIcon className="w-5 h-5 text-[var(--color-ink)] shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold text-[var(--color-ink)]">
                  {githubConnected ? `Connected as @${user?.github_login}` : 'Not connected'}
                </div>
                <div className="mono text-[11px] text-[var(--color-ink-3)] mt-[1px]">
                  {githubConnected
                    ? 'read scopes: repo metadata, branches, commits, contents'
                    : 'requires OAuth read access — connect from the Repositories page'}
                </div>
              </div>
            </div>
            {githubConnected ? (
              <button onClick={disconnectGithub} className="btn btn-sm w-full sm:w-auto justify-center">Disconnect</button>
            ) : (
              <button onClick={connectGithub} className="btn btn-accent btn-sm w-full sm:w-auto justify-center">
                <PlugZap className="w-3.5 h-3.5" /> Connect GitHub
              </button>
            )}
          </div>
        </div>
      </Panel>

      <Panel title="Active Workspace">
        <div className="p-4 space-y-2">
          <KV k="Current repository" v={<span className="mono text-[12px] font-semibold break-all">{currentRepo ? `${currentRepo.owner}/${currentRepo.name}` : '—'}</span>} />
          <KV k="Branch / commit" v={<span className="mono text-[12px] break-all">{currentRepo ? `${currentRepo.defaultBranch} • ${currentRepo.commit.slice(0, 7)}` : '—'}</span>} />
          <KV k="Assessment retention" v={<span className="mono text-[12px]">session-scoped • cleared on sign out</span>} />
          <div className="flex flex-wrap gap-2 pt-3">
            <button onClick={loadDemoRepo} className="btn btn-sm flex-1 sm:flex-none justify-center">
              <RotateCcw className="w-3.5 h-3.5" /> Reload demo repository
            </button>
            <button onClick={signOut} className="btn btn-sm text-red-600 border-red-200 hover:bg-red-50 flex-1 sm:flex-none justify-center">
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>
        </div>
      </Panel>

      <Panel title="System Environment">
        <div className="p-4 space-y-3">
          <KVCol k="API Endpoint" v={<span className="mono text-[11.5px] text-[#0F8A5A]">{import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}</span>} />
          <KVCol k="Runtime Stack" v={<span className="mono text-[11.5px]">React 19 • Vite • Monaco Code Viewer</span>} />
          <KVCol k="Security Policy" v={<span className="mono text-[11.5px]">Assessment artifacts are processed inside isolated sandboxes; exports generated client-side.</span>} />
        </div>
      </Panel>

      <Panel title="Platform Information">
        <div className="p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-[var(--color-ink)] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6 text-[var(--color-accent)]" />
          </div>
          <div>
            <div className="mono text-[13px] font-bold text-[var(--color-ink)]">RAKSHA • Security Validation Platform</div>
            <div className="text-[12px] text-[var(--color-ink-3)] mt-[2px] leading-relaxed">
              v1.3.0 — detection, evidence, remediation and verification for software you control.
              RAKSHA never scans or modifies targets without your explicit action.
            </div>
          </div>
        </div>
      </Panel>

    </div>
  );
}