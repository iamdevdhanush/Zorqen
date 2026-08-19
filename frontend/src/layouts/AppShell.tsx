import { useCallback, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import TopNav from '../components/TopNav';
import Seo from '../components/Seo';
import SecurityCopilot from '../components/SecurityCopilot';
import CommandPalette from '../components/CommandPalette';
import ConnectGithubModal from '../components/ConnectGithubModal';
import { ToastProvider } from '../components/ToastProvider';
import BuyMeACoffeeWidget from '../components/BuyMeACoffeeWidget';
import { useWorkspaceData, useWorkspaceUI } from '../store/WorkspaceContext';

function AppShellInner() {
  const { copilotOpen, setCopilotOpen, githubModalOpen } = useWorkspaceUI();
  const { currentAssessment, currentRepo } = useWorkspaceData();
  const [cmdOpen, setCmdOpen] = useState(false);

  const handleOpenCmd = useCallback(() => setCmdOpen(true), []);
  const handleCloseCmd = useCallback(() => setCmdOpen(false), []);
  const handleCloseCopilot = useCallback(() => setCopilotOpen(false), [setCopilotOpen]);

  /* Global keyboard shortcut: Cmd/Ctrl+K → command palette.
     cmdOpen is read via functional updater / state setter — never needed in deps. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
      if (e.key === 'Escape') setCmdOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []); // no deps — stable for the lifetime of AppShell

  const runningStep = currentAssessment?.steps.find((s) => s.status === 'running');

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-base)] text-[var(--color-ink)]">
      {/* Console is a private authenticated workspace — never index it. */}
      <Seo
        title="ZORQEN — Security Operations Console"
        description="ZORQEN security validation console: run assessments, review findings, and remediate vulnerabilities in repositories you control."
        canonicalPath="/"
        noIndex
      />

      {/* Top Header Navigation */}
      <TopNav onOpenCmd={handleOpenCmd} />

      {/* Main Page Area */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <Outlet />
      </main>

      {/* Live Security Operation Strip — Active Execution Indicator */}
      {currentAssessment?.status === 'RUNNING' && (
        <div
          className="sticky bottom-0 z-30 border-t-2 border-[#111111] px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 bg-[#111111] text-white shadow-hard-lg"
        >
          <div className="flex items-center gap-3 flex-wrap">
            <span className="mono text-[10px] font-extrabold text-[#111111] bg-[#C5F82A] px-2 py-0.5 rounded border border-white animate-pulse">
              ● LIVE OPERATION
            </span>
            <span className="mono text-[12px] font-extrabold text-white">
              {currentAssessment.id}
            </span>
            <span className="mono text-[12px] text-zinc-400">•</span>
            <span className="mono text-[12px] font-extrabold text-[#C5F82A]">
              {runningStep?.label?.toUpperCase() ?? 'SECURITY SCAN RUNNING'}
            </span>
          </div>
          <div className="mono text-[11px] text-zinc-300 font-extrabold flex items-center gap-3">
            <span>{currentAssessment.logs.length} EVENTS LOGGED</span>
            <span>•</span>
            <span className="text-[#C5F82A]">{currentRepo?.name}</span>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-[var(--color-line)] bg-white px-4 sm:px-6 py-3 sm:py-4 mt-auto">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11.5px] text-[var(--color-ink-3)]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[var(--color-ink)]">ZORQEN</span>
            <span>— findings &amp; scores reflect assessed commit snapshots only</span>
          </div>
          <div className="mono text-[10.5px]">
            scans run in isolated sandboxes • never against production
          </div>
        </div>
      </footer>

      {/* Security Copilot Drawer */}
      {copilotOpen && (
        <SecurityCopilot
          assessmentId={currentAssessment?.id}
          onClose={handleCloseCopilot}
        />
      )}

      {/* GitHub Modal Dialog */}
      {githubModalOpen && <ConnectGithubModal />}

      {/* Command Palette */}
      {cmdOpen && <CommandPalette onClose={handleCloseCmd} />}

      {/* Global Buy Me a Coffee Floating Widget */}
      <BuyMeACoffeeWidget />
    </div>
  );
}

export default function AppShell() {
  return (
    <ToastProvider>
      <AppShellInner />
    </ToastProvider>
  );
}