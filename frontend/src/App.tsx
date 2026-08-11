import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WorkspaceProvider } from './store/WorkspaceContext';
import AppShell from './layouts/AppShell';
import './index.css';

const OverviewPage = lazy(() => import('./pages/OverviewPage'));
const RepositoriesPage = lazy(() => import('./pages/RepositoriesPage'));
const RepositoryDetailPage = lazy(() => import('./pages/RepositoryDetailPage'));
const AssessmentsPage = lazy(() => import('./pages/AssessmentsPage'));
const AssessmentDetailPage = lazy(() => import('./pages/AssessmentDetailPage'));
const FindingsPage = lazy(() => import('./pages/FindingsPage'));
const FindingDetailPage = lazy(() => import('./pages/FindingDetailPage'));
const RemediationPage = lazy(() => import('./pages/RemediationPage'));
const VerificationPage = lazy(() => import('./pages/VerificationPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));

export interface AuthUser {
  id: string;
  github_login: string;
  github_name?: string;
  github_avatar_url?: string;
  is_demo: boolean;
}

function PageFallback() {
  return (
    <div className="max-w-[1140px] mx-auto py-12 space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-[#EAEAE2] rounded-md" />
      <div className="h-4 w-96 bg-[#EAEAE2] rounded-md" />
      <div className="h-64 w-full bg-[#FFFFFF] border border-[#111111] rounded-xl shadow-hard" />
    </div>
  );
}

function App() {
  return (
    <WorkspaceProvider>
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* OAuth redirect target — standalone, re-enters the shell */}
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* The console shell — RAKSHA opens directly into the workspace */}
            <Route path="/" element={<AppShell />}>
              <Route index element={<OverviewPage />} />
              <Route path="/repos" element={<RepositoriesPage />} />
              <Route path="/repos/:repoId" element={<RepositoryDetailPage />} />
              <Route path="/assessments" element={<AssessmentsPage />} />
              <Route path="/assessments/:id" element={<AssessmentDetailPage />} />
              <Route path="/findings" element={<FindingsPage />} />
              <Route path="/findings/:id" element={<FindingDetailPage />} />
              {/* Remediation and Verification are entered from a finding — never standalone */}
              <Route path="/remediation/:id" element={<RemediationPage />} />
              <Route path="/verification/:id" element={<VerificationPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </WorkspaceProvider>
  );
}

export default App;