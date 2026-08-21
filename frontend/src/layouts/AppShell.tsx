import { useCallback, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import TopNav from '../components/TopNav';
import Seo from '../components/Seo';
import SecurityCopilot from '../components/SecurityCopilot';
import CommandPalette from '../components/CommandPalette';
import ConnectGithubModal from '../components/ConnectGithubModal';
import { ToastProvider } from '../components/ToastProvider';
import ZorqenStartupScreen from '../components/ZorqenStartupScreen';
import { useWorkspaceData, useWorkspaceUI } from '../store/WorkspaceContext';

function AppShellInner() {
  const { copilotOpen, setCopilotOpen, githubModalOpen } = useWorkspaceUI();
  const { currentAssessment, currentRepo } = useWorkspaceData();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [showStartup, setShowStartup] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !sessionStorage.getItem('zorqen_started');
  });

  const handleOpenCmd = useCallback(() => setCmdOpen(true), []);
  const handleCloseCmd = useCallback(() => setCmdOpen(false), []);
  const handleCloseCopilot = useCallback(() => setCopilotOpen(false), [setCopilotOpen]);

  const handleStartupComplete = useCallback(() => {
    sessionStorage.setItem('zorqen_started', 'true');
    setShowStartup(false);
  }, []);

  /* Global keyboard shortcut: Cmd/Ctrl+K → command palette */
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
  }, []);

  const runningStep = currentAssessment?.steps.find((s) => s.status === 'running');

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-base)] text-[var(--color-ink)]">
      {/* Console SEO settings */}
      <Seo
        title="ZORQEN — Security Operations Console"
        description="ZORQEN security validation console: run assessments, review findings, and remediate vulnerabilities in repositories you control."
        canonicalPath="/"
        noIndex
      />

      {/* Professional ZORQEN Startup Sequence (First load only, non-blocking) */}
      {showStartup && <ZorqenStartupScreen onComplete={handleStartupComplete} />}

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
      <footer className="border-t border-[#111111]/10 px-4 sm:px-6 py-3.5 mt-auto bg-[#ECEBE6]">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[12px] text-[#6B6B6B]">
          <div className="flex items-center gap-2 flex-wrap font-medium">
            <span className="font-extrabold text-[#0A0A0A]">ZORQEN</span>
            <span className="text-[#111111]/30">•</span>
            <span>Autonomous Security Validation Platform</span>
          </div>
          <div className="mono text-[11px] font-semibold text-[#6B6B6B]">
            Isolated sandbox execution · Read-only repository access
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