import { useCallback, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import TopNav from '../components/TopNav';
import Seo from '../components/Seo';
import SecurityCopilot from '../components/SecurityCopilot';
import CommandPalette from '../components/CommandPalette';
import ConnectGithubModal from '../components/ConnectGithubModal';
import { ToastProvider } from '../components/ToastProvider';
import ZorqenStartupScreen from '../components/ZorqenStartupScreen';
import BottomOperationDock from '../components/BottomOperationDock';
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

  const isScanning = currentAssessment?.status === 'RUNNING' || currentAssessment?.status === 'IDLE';

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

      {/* Main Page Area Aligned to 1440px Grid */}
      <main
        className="flex-1 max-w-[1440px] w-full mx-auto px-6 sm:px-8 lg:px-12 xl:px-16 py-7 lg:py-10 transition-all"
        style={{
          paddingBottom: isScanning ? 'calc(72px + env(safe-area-inset-bottom))' : 'calc(24px + env(safe-area-inset-bottom))',
        }}
      >
        <Outlet />
      </main>

      {/* Compact Bottom Live Security Operation Dock */}
      {isScanning && currentAssessment && (
        <BottomOperationDock
          run={currentAssessment}
          repoName={currentRepo?.name}
        />
      )}

      {/* Footer Aligned to 1440px Grid */}
      <footer className="border-t border-[#111111]/15 px-6 sm:px-8 lg:px-12 xl:px-16 py-5 mt-auto bg-[var(--color-base)]">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[13px] text-[#555555]">
          <div className="flex items-center gap-2 flex-wrap font-medium">
            <span className="font-extrabold text-[#111111]">ZORQEN</span>
            <span className="text-[#111111]/30">•</span>
            <span>Autonomous Security Validation Platform</span>
          </div>
          <div className="mono text-[11.5px] font-semibold text-[#555555]">
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