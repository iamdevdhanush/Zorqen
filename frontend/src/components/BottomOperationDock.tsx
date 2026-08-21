import { memo, useState, useEffect } from 'react';
import { Check, ChevronUp, X, Clock, Terminal } from 'lucide-react';
import type { AssessmentRun } from '../lib/types';
import AssessmentOperationConsole from './AssessmentOperationConsole';

interface BottomOperationDockProps {
  run: AssessmentRun;
  repoName?: string;
}

export const BottomOperationDock = memo(function BottomOperationDock({
  run,
  repoName,
}: BottomOperationDockProps) {
  const [expanded, setExpanded] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(14);

  const isCompleted = run.status === 'COMPLETED';
  const isScanning = run.status === 'RUNNING' || run.status === 'IDLE';
  const progressPct = run.progress ?? 64;
  const runNumber = run.id.includes('#') ? run.id : `#${run.id.slice(0, 4)}`;

  // Live timer tick
  useEffect(() => {
    if (!isScanning) return;
    const interval = setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isScanning]);

  const formattedElapsed = `00:${elapsedSec < 10 ? '0' : ''}${elapsedSec}s`;
  const etaSec = Math.max(0, 30 - elapsedSec);
  const formattedEta = etaSec > 0 ? `~${etaSec}s remaining` : 'Completing…';

  return (
    <>
      {/* ── 1. STICKY DOCK BAR (Live Operational Feedback) ────────────────── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 bg-[#111111] text-white border-t-2 border-[#111111] shadow-hard-lg cursor-pointer transition-all hover:bg-black"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={() => setExpanded(true)}
        role="button"
        tabIndex={0}
        aria-label="Open live security operation console"
      >
        <div className="max-w-[1400px] mx-auto h-[56px] px-4 sm:px-6 flex items-center justify-between gap-3 min-h-[44px]">
          {/* Left: Live Status & Counters */}
          <div className="flex items-center gap-3 min-w-0">
            {isCompleted ? (
              <span className="mono text-[11px] font-extrabold text-[#111111] bg-[#C8FF2E] px-2.5 py-1 rounded-[6px] border border-white shrink-0 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                COMPLETE
              </span>
            ) : isScanning ? (
              <span className="mono text-[11px] font-extrabold text-[#111111] bg-[#C8FF2E] px-2.5 py-1 rounded-[6px] border border-white animate-pulse shrink-0 flex items-center gap-1.5 tabular-nums">
                <span className="w-1.5 h-1.5 rounded-full bg-[#111111]" />
                {runNumber} LIVE OPERATION ({progressPct}%)
              </span>
            ) : (
              <span className="mono text-[11px] font-extrabold text-[#111111] bg-white px-2.5 py-1 rounded-[6px] border border-white shrink-0">
                ● LIVE
              </span>
            )}

            {/* Elapsed Timer & ETA */}
            {isScanning && (
              <div className="hidden md:flex items-center gap-2 mono text-[12px] text-zinc-300 font-bold tabular-nums">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#C8FF2E]" />
                  Elapsed: <strong className="text-white">{formattedElapsed}</strong>
                </span>
                <span>•</span>
                <span className="text-zinc-400">ETA: {formattedEta}</span>
              </div>
            )}
          </div>

          {/* Right: Target Repo & Expand Action */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="mono text-[11px] text-zinc-300 font-bold max-w-[120px] sm:max-w-[200px] truncate">
              {repoName || run.repo}
            </span>
            <div className="w-8 h-8 rounded-[8px] bg-white/10 flex items-center justify-center text-white border border-white/20 hover:bg-white/20 transition-colors">
              <ChevronUp className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. EXPANDED OPERATION CONSOLE MODAL OVERLAY ───────────────────────── */}
      {expanded && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-[#0A0A0A]/80 backdrop-blur-sm fade-in">
          {/* Modal Container */}
          <div
            className="relative z-10 w-full max-w-[1400px] mx-auto h-[92vh] max-h-[92vh] overflow-y-auto bg-[#ECEBE6] border-t-2 border-[#111111] rounded-t-[24px] shadow-hard-lg p-4 sm:p-6 space-y-6 slide-up"
            style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}
          >
            {/* Sticky Header Bar */}
            <div className="sticky top-0 z-20 bg-[#ECEBE6] pb-3 border-b-2 border-[#111111] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[8px] bg-[#111111] text-[#C8FF2E] flex items-center justify-center shrink-0">
                  <Terminal className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="mono text-[11px] font-extrabold text-[#111111] bg-[#C8FF2E] px-2.5 py-0.5 rounded border border-[#111111] inline-block">
                    {runNumber} LIVE OPERATION CONSOLE
                  </div>
                  <div className="mono text-[13px] font-extrabold text-[#0A0A0A] mt-0.5 tabular-nums">
                    Target: {repoName || run.repo} · Elapsed: {formattedElapsed}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setExpanded(false)}
                className="flex items-center justify-center w-[44px] h-[44px] rounded-[10px] bg-white border-2 border-[#111111] text-[#0A0A0A] hover:bg-[#C8FF2E] transition-all shadow-hard-sm"
                aria-label="Close operation console"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            {/* Embedded Security Operation Console Component */}
            <AssessmentOperationConsole run={run} />

            {/* Sticky Footer */}
            <div className="sticky bottom-0 z-20 bg-[#ECEBE6] pt-3 border-t-2 border-[#111111] flex items-center justify-between gap-4">
              <span className="mono text-[11.5px] font-bold text-[#5E5E5E]">
                ZORQEN Isolated Sandbox Execution Mode
              </span>
              <button
                onClick={() => setExpanded(false)}
                className="btn btn-secondary px-5 text-[13px] font-extrabold min-h-[44px]"
              >
                Close Console
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export default BottomOperationDock;
