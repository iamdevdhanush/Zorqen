import { useState } from 'react';
import { GitBranch, Play, Settings, X } from 'lucide-react';
import { useWorkspace } from '../store/WorkspaceContext';
import { useNavigate } from 'react-router-dom';

const MODULES = [
  { id: 'static',       label: 'Static analysis',     detail: 'Semgrep + custom rules' },
  { id: 'dependency',   label: 'Dependency analysis',  detail: 'Trivy SCA' },
  { id: 'secrets',      label: 'Secret detection',     detail: 'Pattern + entropy scan' },
  { id: 'architecture', label: 'Architecture analysis',detail: 'Call graph + data flow' },
  { id: 'reasoning',    label: 'AI security reasoning',detail: 'Confidence scoring + root cause' },
  { id: 'validation',   label: 'Sandbox validation',   detail: 'Isolated container exploit proof' },
];

interface AssessmentModalProps {
  onClose: () => void;
}

export default function AssessmentModal({ onClose }: AssessmentModalProps) {
  const { currentRepo, branch, commit, startAssessment } = useWorkspace();
  const navigate = useNavigate();
  const [modules, setModules] = useState<Record<string, boolean>>(
    Object.fromEntries(MODULES.map((m) => [m.id, true]))
  );
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleRun = () => {
    startAssessment();
    onClose();
    navigate('/assessments');
  };

  const toggleModule = (id: string) => {
    setModules((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (!currentRepo) return null;

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box">
        {/* Header */}
        <div className="modal-header">
          <div>
            <div className="mono text-[9.5px] uppercase tracking-[0.12em] text-[var(--color-ink-3)] mb-0.5">
              PIPELINE CONFIGURATION
            </div>
            <div className="text-[14px] font-semibold text-[var(--color-ink)]">Run Assessment</div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-xs">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body space-y-4">
          {/* Context */}
          <div className="panel px-3 py-2.5 space-y-1">
            <div className="flex items-center gap-2 text-[12px]">
              <span className="mono text-[9.5px] uppercase tracking-[0.08em] text-[var(--color-ink-3)] w-[70px]">Repository</span>
              <span className="mono text-[var(--color-ink)]">{currentRepo.owner}/{currentRepo.name}</span>
              <span className="chip ml-auto">{currentRepo.private ? 'PRIVATE' : 'PUBLIC'}</span>
            </div>
            <div className="flex items-center gap-2 text-[12px]">
              <span className="mono text-[9.5px] uppercase tracking-[0.08em] text-[var(--color-ink-3)] w-[70px]">Branch</span>
              <GitBranch className="w-3 h-3 shrink-0" style={{ color: 'var(--color-ink-3)' }} />
              <span className="mono text-[var(--color-low)]">{branch}</span>
            </div>
            <div className="flex items-center gap-2 text-[12px]">
              <span className="mono text-[9.5px] uppercase tracking-[0.08em] text-[var(--color-ink-3)] w-[70px]">Commit</span>
              <span className="mono text-[var(--color-ink-2)]">{commit.slice(0, 9)}</span>
            </div>
          </div>

          {/* Analysis modules */}
          <div>
            <div className="mono text-[9.5px] uppercase tracking-[0.12em] text-[var(--color-ink-3)] mb-2">
              Analysis modules
            </div>
            <div className="space-y-0.5">
              {MODULES.map((mod) => (
                <label key={mod.id} className="check-item px-2 py-1.5 rounded-[3px] hover:bg-[var(--color-hover)] transition-colors">
                  <input
                    type="checkbox"
                    checked={modules[mod.id]}
                    onChange={() => toggleModule(mod.id)}
                  />
                  <div className="flex-1">
                    <span className="text-[var(--color-ink)]">{mod.label}</span>
                    <span className="mono text-[10px] text-[var(--color-ink-3)] ml-2">{mod.detail}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Advanced (collapsed) */}
          <div>
            <button
              onClick={() => setShowAdvanced((v) => !v)}
              className="flex items-center gap-1.5 mono text-[10px] text-[var(--color-ink-3)] hover:text-[var(--color-ink-2)] transition-colors"
            >
              <Settings className="w-3 h-3" />
              Advanced settings
              <span className="ml-1">{showAdvanced ? '▲' : '▼'}</span>
            </button>
            {showAdvanced && (
              <div className="mt-2 panel px-3 py-2.5 space-y-2 slide-down">
                <div className="flex items-center justify-between text-[11.5px]">
                  <span className="text-[var(--color-ink-2)]">Sandbox timeout</span>
                  <span className="mono chip">120s</span>
                </div>
                <div className="flex items-center justify-between text-[11.5px]">
                  <span className="text-[var(--color-ink-2)]">Exclude paths</span>
                  <span className="mono chip">none</span>
                </div>
                <div className="flex items-center justify-between text-[11.5px]">
                  <span className="text-[var(--color-ink-2)]">Confidence threshold</span>
                  <span className="mono chip">≥ 60%</span>
                </div>
              </div>
            )}
          </div>

          <div className="mono text-[9.5px] text-[var(--color-ink-3)] leading-relaxed border-t border-[var(--color-line)] pt-2">
            Assessment runs in an isolated sandbox. RAKSHA never modifies the repository automatically.
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-sm">
            Cancel
          </button>
          <button onClick={handleRun} className="btn btn-primary btn-sm">
            <Play className="w-3.5 h-3.5" />
            Run Assessment
          </button>
        </div>
      </div>
    </div>
  );
}
