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
      {/* ── STICKY BOTTOM DOCK (Compact 52px Height with Safe-Area Padding) ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 bg-[#111111] text-white border-t-2 border-[#111111] shadow-hard-lg cursor-pointer transition-all hover:bg-black"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={() => setExpanded(true)}
        role="button"
        tabIndex={0}
        aria-label="Open live security operation console"
      >
        <div className="max-w-[1280px] mx-auto h-[52px] px-5 lg:px-8 flex items-center justify-between gap-3 min-h-[44px]">
          {/* Left: Status Badge & Timers */}
          <div className="flex items-center gap-3 min-w-0">
            {isCompleted ? (
              <span className="mono text-[11px] font-extrabold text-[#111111] bg-[#C8F31D] px-3 py-0.5 rounded-full border-[1.5px] border-[#111111] shrink-0 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                COMPLETE
              </span>
            ) : isScanning ? (
              <div className="flex items-center gap-2.5 shrink-0">
                <span className="mono text-[11px] font-extrabold text-[#111111] bg-[#C8F31D] px-3 py-0.5 rounded-full border-[1.5px] border-[#111111] shrink-0 flex items-center gap-1.5 tabular-nums">
                  <span className="w-2 h-2 rounded-full bg-[#111111] animate-ping" />
                  ● LIVE
                </span>
                <span className="mono text-[12px] font-extrabold text-white tracking-wider truncate">
                  {runNumber} SCAN RUNNING ({progressPct}%)
                </span>
              </div>
            ) : (
              <span className="mono text-[11px] font-extrabold text-[#111111] bg-[#C8F31D] px-3 py-0.5 rounded-full border-[1.5px] border-[#111111] shrink-0">
                ● LIVE
              </span>
            )}

            {/* Elapsed Timer & ETA */}
            {isScanning && (
              <div className="hidden sm:flex items-center gap-2 mono text-[12px] text-zinc-300 font-bold tabular-nums">
                <span className="text-zinc-400">•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 stroke-[2] text-[#C8F31D]" />
                  Elapsed: <strong className="text-white">{formattedElapsed}</strong>
                </span>
                <span className="hidden md:inline text-zinc-400">• ETA: {formattedEta}</span>
              </div>
            )}
          </div>

          {/* Right: Target Repo & Expand Trigger */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="mono text-[11px] text-zinc-300 font-bold max-w-[120px] sm:max-w-[200px] truncate">
              {repoName || run.repo}
            </span>
            <div className="w-7 h-7 rounded-[8px] bg-white/10 flex items-center justify-center text-white border border-white/20 hover:bg-white/20 transition-colors">
              <ChevronUp className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
        </div>
      </div>

      {/* ── EXPANDED OPERATION CONSOLE MODAL OVERLAY ───────────────────────── */}
      {expanded && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-[#0A0A0A]/80 backdrop-blur-sm fade-in">
          {/* Modal Container */}
          <div
            className="relative z-10 w-full max-w-[1280px] mx-auto h-[92vh] max-h-[92vh] overflow-y-auto bg-[#ECEAE4] border-t-2 border-x-2 border-[#111111] rounded-t-[24px] shadow-hard-lg p-5 lg:p-7 space-y-6 slide-up"
            style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}
          >
            {/* Sticky Header Bar */}
            <div className="sticky top-0 z-20 bg-[#ECEAE4] pb-3 border-b-2 border-[#111111] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[10px] bg-[#111111] text-[#C8F31D] flex items-center justify-center shrink-0 border-2 border-[#111111]">
                  <Terminal className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <div className="mono text-[11px] font-extrabold text-[#111111] bg-[#C8F31D] px-3 py-0.5 rounded-full border-[1.5px] border-[#111111] inline-block">
                    {runNumber} LIVE OPERATION CONSOLE
                  </div>
                  <div className="mono text-[13px] font-extrabold text-[#111111] mt-0.5 tabular-nums">
                    Target: {repoName || run.repo} · Elapsed: {formattedElapsed}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setExpanded(false)}
                className="flex items-center justify-center w-[44px] h-[44px] rounded-[12px] bg-white border-2 border-[#111111] text-[#111111] hover:bg-[#C8F31D] transition-all shadow-hard-sm cursor-pointer"
                aria-label="Close operation console"
              >
                <X className="w-5 h-5 stroke-[2]" />
              </button>
            </div>

            {/* Embedded Security Operation Console */}
            <AssessmentOperationConsole run={run} />

            {/* Sticky Footer */}
            <div className="sticky bottom-0 z-20 bg-[#ECEAE4] pt-3 border-t-2 border-[#111111] flex items-center justify-between gap-4">
              <span className="mono text-[11.5px] font-bold text-[#555555]">
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
