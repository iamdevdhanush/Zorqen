import { useState } from 'react';
import { Eye, EyeOff, LogOut, ShieldCheck, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { KV, KVCol, Panel } from '../components/ui';
import { useWorkspace } from '../store/WorkspaceContext';
import { getApiBase } from '../services/api';
import GithubIcon from '../components/GithubIcon';
import { AntiMetalButton } from '../components/ui/anti-metal-button';

export default function SettingsPage() {
  const {
    user,
    githubConnected,
    connectGithub,
    disconnectGithub,
    signOut,
    currentRepo,
    grokKey,
    grokStatus,
    setGrokKey,
    clearGrokKey,
    testGrokConnection,
  } = useWorkspace();

  const [keyDraft, setKeyDraft] = useState('');
  const [showKey, setShowKey] = useState(false);

  const isTesting = grokStatus.state === 'testing';
  const isConnected = grokStatus.state === 'connected';

  const handleSaveKey = () => {
    const trimmed = keyDraft.trim();
    if (!trimmed) return;
    setGrokKey(trimmed);
    setKeyDraft('');
    setShowKey(false);
  };

  const handleDisconnect = () => {
    clearGrokKey();
    setKeyDraft('');
    setShowKey(false);
  };

  return (
    <div className="max-w-[860px] mx-auto space-y-6 fade-in py-2">
      
      {/* Editorial Header */}
      <div className="pb-4 border-b border-[var(--color-line)] space-y-1">
        <div className="protocol-tag">zorqen://workspace/settings</div>
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
              <GithubIcon className="w-[18px] h-[18px] md:w-5 md:h-5 text-[#111111]" aria-label="GitHub" />
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
              <AntiMetalButton
                onClick={connectGithub}
                size="compact"
                icon={<GithubIcon className="w-4 h-4 text-white mr-1.5" aria-label="GitHub" />}
                className="w-full sm:w-auto justify-center"
              >
                Connect GitHub
              </AntiMetalButton>
            )}
          </div>
        </div>
      </Panel>

      {/* ── AI Provider (BYOK xAI Grok) ─────────────────────────────────── */}
      <Panel title="AI Provider">
        <div className="p-4 space-y-4">

          {/* Configured state */}
          {grokKey ? (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-lg border-2 border-[#111111] bg-[#C8F31D] flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4 text-[#111111]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold text-[var(--color-ink)]">xAI Grok</div>
                    <div className="mono text-[11px] text-[var(--color-ink-3)] mt-[1px]">
                      {isConnected
                        ? `verified • ${(grokStatus as { state: 'connected'; model: string }).model}`
                        : 'key configured • not yet tested'}
                    </div>
                  </div>
                  {/* Status chip */}
                  {isConnected && (
                    <span className="chip ok inline-flex items-center gap-1.5 font-bold shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Connected
                    </span>
                  )}
                  {grokStatus.state === 'error' && (
                    <span className="chip sev-high inline-flex items-center gap-1.5 font-bold shrink-0">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Error
                    </span>
                  )}
                  {isTesting && (
                    <span className="chip ok inline-flex items-center gap-1.5 font-bold animate-pulse shrink-0">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Testing…
                    </span>
                  )}
                </div>
                <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                  <button
                    id="grok-test-connection-btn"
                    onClick={testGrokConnection}
                    disabled={isTesting}
                    className="btn btn-sm flex-1 sm:flex-none justify-center"
                  >
                    {isTesting ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" />Testing</>
                    ) : 'Test Connection'}
                  </button>
                  <button
                    id="grok-disconnect-btn"
                    onClick={handleDisconnect}
                    className="btn btn-sm flex-1 sm:flex-none justify-center text-red-600 border-red-200 hover:bg-red-50"
                    aria-label="Disconnect xAI Grok key"
                  >
                    <X className="w-3.5 h-3.5" />
                    Disconnect
                  </button>
                </div>
              </div>

              {/* Error message */}
              {grokStatus.state === 'error' && (
                <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-[1px] shrink-0" />
                  <p className="text-[12px] text-red-700 leading-relaxed">
                    {(grokStatus as { state: 'error'; message: string }).message}
                  </p>
                </div>
              )}

              {/* Privacy notice */}
              <p className="text-[11px] text-[var(--color-ink-3)] leading-relaxed">
                Your API key is held in browser memory only and is never stored on disk or sent to ZORQEN's servers.
                Code and finding snippets sent to ASK ZORQEN may be processed by xAI. The key is cleared when you sign out.
              </p>
            </div>
          ) : (
            /* Key entry form */
            <div className="space-y-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.06em] text-[#4A4A4A] font-extrabold mb-2">
                  xAI Grok API Key
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      id="grok-api-key-input"
                      type={showKey ? 'text' : 'password'}
                      value={keyDraft}
                      onChange={(e) => setKeyDraft(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveKey()}
                      placeholder="xai-…"
                      autoComplete="off"
                      spellCheck={false}
                      className="w-full h-10 px-3 pr-10 border-2 border-[#111111] rounded-xl bg-white text-[13px] mono font-semibold text-[#111111] placeholder:text-[#AAAAAA] placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#C8F31D] focus:ring-offset-1"
                      aria-label="xAI Grok API key"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#525252] hover:text-[#111111] transition-colors"
                      aria-label={showKey ? 'Hide API key' : 'Show API key'}
                      tabIndex={0}
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    id="grok-save-key-btn"
                    onClick={handleSaveKey}
                    disabled={!keyDraft.trim()}
                    className="btn btn-sm btn-primary shrink-0"
                    aria-label="Save xAI Grok API key"
                  >
                    Save Key
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[12px] text-[var(--color-ink-3)] leading-relaxed">
                  Get a key at{' '}
                  <a
                    href="https://console.x.ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 text-[#111111] font-semibold hover:text-[#0F8A5A] transition-colors"
                  >
                    console.x.ai
                  </a>
                  . Enables ASK ZORQEN using your own xAI Grok account.
                </p>
                <p className="text-[11px] text-[var(--color-ink-3)] leading-relaxed">
                  <strong>Privacy:</strong> Your key is held in browser memory only — it is never stored on disk, in cookies or in ZORQEN's servers.
                  Code snippets sent to ASK ZORQEN may be processed by xAI. The key is cleared when you sign out.
                </p>
              </div>
            </div>
          )}
        </div>
      </Panel>

      <Panel title="Active Workspace">
        <div className="p-4 space-y-2">
          <KV k="Current repository" v={<span className="mono text-[12px] font-semibold break-all">{currentRepo ? `${currentRepo.owner}/${currentRepo.name}` : '—'}</span>} />
          <KV k="Branch / commit" v={<span className="mono text-[12px] break-all">{currentRepo ? `${currentRepo.defaultBranch} • ${currentRepo.commit ? currentRepo.commit.slice(0, 7) : '—'}` : '—'}</span>} />
          <KV k="Assessment retention" v={<span className="mono text-[12px]">session-scoped • cleared on sign out</span>} />
          <div className="flex flex-wrap gap-2 pt-3">
            <button onClick={signOut} className="btn btn-sm text-red-600 border-red-200 hover:bg-red-50 flex-1 sm:flex-none justify-center">
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>
        </div>
      </Panel>

      <Panel title="System Environment">
        <div className="p-4 space-y-3">
          <KVCol k="API Endpoint" v={<span className="mono text-[11.5px] text-[#0F8A5A]">{getApiBase()}</span>} />
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
            <div className="mono text-[13px] font-bold text-[var(--color-ink)]">ZORQEN • Security Validation Platform</div>
            <div className="text-[12px] text-[var(--color-ink-3)] mt-[2px] leading-relaxed">
              v1.3.0 — detection, evidence, remediation and verification for software you control.
              ZORQEN never scans or modifies targets without your explicit action.
            </div>
          </div>
        </div>
      </Panel>

    </div>
  );
}