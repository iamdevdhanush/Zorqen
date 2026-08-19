import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  ChevronDown,
  GitBranch,
  GitCommit,
  Play,
  Settings,
  ShieldCheck,
  X,
} from 'lucide-react';
import GithubIcon from './GithubIcon';
import { useWorkspace, useAssessmentActive } from '../store/WorkspaceContext';

const MODULES = [
  { id: 'static',       label: 'STATIC ANALYSIS',       detail: 'Semgrep + custom rules' },
  { id: 'dependency',   label: 'DEPENDENCY ANALYSIS',   detail: 'Dependency vulnerability analysis' },
  { id: 'secrets',      label: 'SECRET DETECTION',      detail: 'Pattern + entropy scanning' },
  { id: 'architecture', label: 'ARCHITECTURE ANALYSIS', detail: 'Call graph + data flow' },
  { id: 'reasoning',    label: 'AI SECURITY REASONING', detail: 'Confidence + root-cause analysis' },
  { id: 'validation',   label: 'SANDBOX VALIDATION',   detail: 'Isolated container verification' },
];

interface AssessmentModalProps {
  onClose: () => void;
}

export default function AssessmentModal({ onClose }: AssessmentModalProps) {
  const { currentRepo, branch, commit, startAssessment } = useWorkspace();
  const isRunning = useAssessmentActive();
  const navigate = useNavigate();

  const [modules, setModules] = useState<Record<string, boolean>>(
    Object.fromEntries(MODULES.map((m) => [m.id, true]))
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!currentRepo) return null;

  const isSubmitting = submitting || isRunning;

  const handleRun = async () => {
    if (isSubmitting) return;
    setSubmitting(true);
    try {
      await startAssessment();
      onClose();
      navigate('/assessments');
    } catch {
      setSubmitting(false);
    }
  };

  const toggleModule = (id: string) => {
    setModules((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Determine actual commit SHA (or HEAD) — never show 'main' as the commit
  const rawCommit = currentRepo.commit || commit;
  const displayCommit =
    rawCommit && rawCommit !== 'main' && rawCommit !== 'master'
      ? rawCommit.slice(0, 7)
      : commit && commit !== 'main' && commit !== 'master'
      ? commit.slice(0, 7)
      : 'HEAD';

  const displayBranch = currentRepo.defaultBranch || branch || 'main';
  const isPrivate = currentRepo.private ?? (currentRepo.visibility === 'private');

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Run Assessment"
    >
      <div className="modal-box border border-[#111111] shadow-hard-lg w-full max-w-[620px] p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-5 sm:p-6 border-b border-[#111111] bg-[#FAFAFA]">
          <div className="space-y-1">
            <div className="protocol-tag">zorqen://pipeline/configure</div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#111111] tracking-tight">
              RUN ASSESSMENT
            </h2>
            <p className="text-[12.5px] text-[#555555] font-medium">
              Configure the security checks for this repository snapshot.
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-xs p-1"
            aria-label="Close modal"
          >
            <X className="w-4 h-4 text-[#111111]" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[calc(85vh-140px)] overflow-y-auto scroll-thin">
          {/* Repository Block */}
          <div className="p-4 rounded-lg bg-white border border-[#111111] shadow-hard-sm space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <GithubIcon className="w-4 h-4 text-[#111111]" />
                <span className="mono text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#666666]">
                  REPOSITORY
                </span>
              </div>
              <span className="chip uppercase font-bold text-[9.5px]">
                {isPrivate ? 'PRIVATE' : 'PUBLIC'}
              </span>
            </div>

            <div className="mono text-[15px] font-extrabold text-[#111111] break-all">
              {currentRepo.owner}/{currentRepo.name}
            </div>

            <div className="pt-2 border-t border-[#111111]/10 grid grid-cols-2 gap-4">
              <div>
                <div className="mono text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#666666] mb-0.5 flex items-center gap-1">
                  <GitBranch className="w-3 h-3 text-[#666666]" /> BRANCH
                </div>
                <div className="mono text-[12px] font-bold text-[#111111]">
                  {displayBranch}
                </div>
              </div>
              <div>
                <div className="mono text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#666666] mb-0.5 flex items-center gap-1">
                  <GitCommit className="w-3 h-3 text-[#666666]" /> COMMIT
                </div>
                <div className="mono text-[12px] font-bold text-[#111111]">
                  {displayCommit}
                </div>
              </div>
            </div>
          </div>

          {/* Analysis Modules Section */}
          <div className="space-y-2.5">
            <div className="mono text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-[#666666]">
              ANALYSIS MODULES
            </div>
            <div className="space-y-2">
              {MODULES.map((mod) => {
                const isChecked = modules[mod.id];
                return (
                  <div
                    key={mod.id}
                    onClick={() => toggleModule(mod.id)}
                    className={`p-3 rounded-lg border cursor-pointer select-none transition-all flex items-start gap-3 ${
                      isChecked
                        ? 'bg-white border-[#111111] shadow-hard-sm'
                        : 'bg-[#FAFAFA] border-[#111111]/30 opacity-75 hover:opacity-100 hover:border-[#111111] hover:bg-white'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        isChecked
                          ? 'bg-[#C5F82A] border-[#111111] text-[#111111]'
                          : 'bg-white border-[#666666]'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="mono text-[12px] font-extrabold text-[#111111] tracking-tight">
                        {mod.label}
                      </div>
                      <div className="text-[11.5px] text-[#555555] font-medium leading-snug">
                        {mod.detail}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="pt-1">
            <button
              onClick={() => setShowAdvanced((v) => !v)}
              className="flex items-center justify-between w-full mono text-[11px] font-bold text-[#4A4A4A] hover:text-[#111111] transition-colors py-1 group"
            >
              <span className="flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-[#666666] group-hover:text-[#111111]" />
                ADVANCED SETTINGS
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-[#666666] transition-transform duration-200 ${
                  showAdvanced ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showAdvanced && (
              <div className="mt-2.5 p-4 rounded-lg bg-[#FAFAFA] border border-[#111111] shadow-hard-sm space-y-2.5 slide-down">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-[#4A4A4A] font-semibold">Sandbox timeout</span>
                  <span className="chip font-mono font-bold">120s</span>
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-[#4A4A4A] font-semibold">Exclude paths</span>
                  <span className="chip font-mono font-bold">none</span>
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-[#4A4A4A] font-semibold">Confidence threshold</span>
                  <span className="chip font-mono font-bold">≥ 60%</span>
                </div>
              </div>
            )}
          </div>

          {/* Security Safety Note */}
          <div className="pt-2 border-t border-[#111111]/10 flex items-start gap-2.5 text-[11.5px] text-[#555555] font-medium leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-[#111111] shrink-0 mt-0.5" />
            <span>
              Zorqen analyzes a repository snapshot and never modifies your repository automatically.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 sm:p-5 border-t border-[#111111] bg-[#FAFAFA]">
          <button
            onClick={onClose}
            className="btn btn-ghost text-[12.5px] px-4 py-2"
          >
            CANCEL
          </button>
          <button
            onClick={handleRun}
            disabled={isSubmitting}
            className="btn btn-accent text-[12.5px] px-5 py-2.5 font-bold"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {isSubmitting ? 'RUNNING ASSESSMENT…' : 'RUN ASSESSMENT →'}
          </button>
        </div>
      </div>
    </div>
  );
}
