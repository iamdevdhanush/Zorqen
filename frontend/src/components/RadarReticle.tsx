import type { FC } from 'react';

interface RadarReticleProps {
  active?: boolean;
  statusLabel?: string;
  className?: string;
}

export const RadarReticle: FC<RadarReticleProps> = ({
  active = true,
  statusLabel = 'SCANNING',
  className = '',
}) => {
  return (
    <div
      className={`relative flex items-center justify-center p-3 rounded-xl bg-white border border-[#111111] shadow-hard-sm ${className}`}
      aria-label="Security Scanning Reticle"
    >
      <svg
        viewBox="0 0 120 120"
        className="w-24 h-24 sm:w-28 sm:h-28 text-[#111111] shrink-0 select-none overflow-visible"
      >
        {/* Outer Reticle Ring */}
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="4 2"
        />

        {/* Inner Target Rings */}
        <circle
          cx="60"
          cy="60"
          r="38"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeOpacity="0.4"
        />
        <circle
          cx="60"
          cy="60"
          r="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeOpacity="0.6"
        />
        <circle
          cx="60"
          cy="60"
          r="4"
          fill="#111111"
        />

        {/* Axes Crosshairs */}
        <line
          x1="60"
          y1="4"
          x2="60"
          y2="116"
          stroke="currentColor"
          strokeWidth="1"
          strokeOpacity="0.4"
        />
        <line
          x1="4"
          y1="60"
          x2="116"
          y2="60"
          stroke="currentColor"
          strokeWidth="1"
          strokeOpacity="0.4"
        />

        {/* Cardinal Corner Marks */}
        <path d="M 12 12 L 20 12 M 12 12 L 12 20" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M 108 12 L 100 12 M 108 12 L 108 20" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M 12 108 L 20 108 M 12 108 L 12 100" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M 108 108 L 100 108 M 108 108 L 108 100" stroke="currentColor" strokeWidth="1.5" fill="none" />

        {/* Rotational Sweeping Radar Line */}
        {active && (
          <g className="animate-radar-sweep">
            <line
              x1="60"
              y1="60"
              x2="60"
              y2="8"
              stroke="#111111"
              strokeWidth="1.5"
            />
            <path
              d="M 60 60 L 60 8 A 52 52 0 0 1 100 32 Z"
              fill="#C5F82A"
              fillOpacity="0.3"
            />
          </g>
        )}

        {/* Active Scanning Surface Nodes (Lime Signal Pulse) */}
        {active ? (
          <g className="animate-signal-pulse">
            <circle cx="82" cy="38" r="4.5" fill="#C5F82A" stroke="#111111" strokeWidth="1.5" />
            <circle cx="36" cy="80" r="3.5" fill="#C5F82A" stroke="#111111" strokeWidth="1.2" />
            <circle cx="75" cy="85" r="3" fill="#111111" />
          </g>
        ) : (
          <g>
            <circle cx="82" cy="38" r="4" fill="#111111" />
            <circle cx="36" cy="80" r="3" fill="#111111" />
          </g>
        )}
      </svg>

      {/* Reticle Status Label */}
      <div className="absolute bottom-2 left-0 right-0 text-center">
        <span className="mono text-[9px] font-extrabold text-[#111111] uppercase tracking-wider bg-[#C5F82A] px-1.5 py-0.5 rounded border border-[#111111]">
          {statusLabel}
        </span>
      </div>
    </div>
  );
};

export default RadarReticle;
