import { useEffect, useState } from 'react';
import ZorqenLogoMark from './ZorqenLogoMark';

interface ZorqenStartupScreenProps {
  onComplete?: () => void;
}

const STAGES = [
  { label: 'BOOTING ZORQEN', progress: 25 },
  { label: 'INITIALIZING SECURITY ENGINE', progress: 60 },
  { label: 'LOADING INTERFACE', progress: 90 },
  { label: 'READY', progress: 100 },
];

export default function ZorqenStartupScreen({ onComplete }: ZorqenStartupScreenProps) {
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Check reduced motion preference
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setVisible(false);
      if (onComplete) onComplete();
      return;
    }

    // Step through startup sequence (~900ms total)
    const stepInterval = setInterval(() => {
      setCurrentStageIdx((prev) => {
        if (prev < STAGES.length - 1) {
          return prev + 1;
        }
        clearInterval(stepInterval);
        return prev;
      });
    }, 220);

    // Complete sequence after 1000ms
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => {
        setVisible(false);
        if (onComplete) onComplete();
      }, 300);
    }, 950);

    return () => {
      clearInterval(stepInterval);
      clearTimeout(timer);
    };
  }, [onComplete]);

  if (!visible) return null;

  const currentStage = STAGES[currentStageIdx];

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#F7F7F2] transition-opacity duration-300 ${
        exiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      aria-label="Application loading"
    >
      <div className="flex flex-col items-center space-y-6 max-w-[340px] px-6 text-center">
        {/* Animated Brand Logo Mark */}
        <div className="relative">
          <div className="w-16 h-16 rounded-xl bg-white border border-[#111111] shadow-hard flex items-center justify-center transition-transform duration-300 hover:scale-105">
            <ZorqenLogoMark size={44} />
          </div>
          {/* Subtle Lime Pulse Ring */}
          <div className="absolute -inset-1 rounded-xl border border-[#C5F82A] animate-ping opacity-30 pointer-events-none" />
        </div>

        {/* Brand Text */}
        <div className="space-y-1">
          <h1 className="font-extrabold text-xl tracking-tight text-[#111111]">
            ZORQEN
          </h1>
          <div className="font-mono text-[9px] font-extrabold tracking-[0.2em] text-[#4A4A4A] uppercase">
            SECURITY VALIDATION PLATFORM
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full space-y-2">
          <div className="w-full h-1.5 bg-[#EAEAE2] rounded-full overflow-hidden border border-[#111111]/20">
            <div
              className="h-full bg-[#C5F82A] transition-all duration-200 ease-out border-r border-[#111111]"
              style={{ width: `${currentStage.progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between font-mono text-[10.5px] font-extrabold text-[#111111]">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C5F82A] border border-[#111111] animate-pulse" />
              {currentStage.label}
            </span>
            <span className="text-[#4A4A4A]">{currentStage.progress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
