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
      className={`relative flex items-center justify-center p-5 rounded-[18px] bg-white border-2 border-[#111111] shadow-hard ${className}`}
      aria-label="Security Scanning Reticle"
    >
      <svg
        viewBox="0 0 120 120"
        className="w-32 h-32 sm:w-40 sm:h-40 text-[#111111] shrink-0 select-none overflow-visible"
        shapeRendering="geometricPrecision"
      >
        {/* Outer Reticle Ring */}
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="6 3"
        />

        {/* Inner Target Rings */}
        <circle
          cx="60"
          cy="60"
          r="38"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeOpacity="0.35"
        />
        <circle
          cx="60"
          cy="60"
          r="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeOpacity="0.5"
        />
        <circle
          cx="60"
          cy="60"
          r="5"
          fill="#111111"
        />

        {/* Axes Crosshairs */}
        <line
          x1="60"
          y1="4"
          x2="60"
          y2="116"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeOpacity="0.35"
        />
        <line
          x1="4"
          y1="60"
          x2="116"
          y2="60"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeOpacity="0.35"
        />

        {/* Cardinal Corner Marks */}
        <path d="M 10 10 L 20 10 M 10 10 L 10 20" stroke="currentColor" strokeWidth="2" fill="none" />
        <path d="M 110 10 L 100 10 M 110 10 L 110 20" stroke="currentColor" strokeWidth="2" fill="none" />
        <path d="M 10 110 L 20 110 M 10 110 L 10 100" stroke="currentColor" strokeWidth="2" fill="none" />
        <path d="M 110 110 L 100 110 M 110 110 L 110 100" stroke="currentColor" strokeWidth="2" fill="none" />

        {/* Rotational Sweeping Radar Line */}
        {active && (
          <g className="animate-radar-sweep">
            <line
              x1="60"
              y1="60"
              x2="60"
              y2="8"
              stroke="#111111"
              strokeWidth="2"
            />
            <path
              d="M 60 60 L 60 8 A 52 52 0 0 1 100 32 Z"
              fill="#C8FF2E"
              fillOpacity="0.35"
            />
          </g>
        )}

        {/* Active Scanning Surface Nodes (Lime Signal Pulse) */}
        {active ? (
          <g className="animate-signal-pulse">
            <circle cx="82" cy="38" r="5" fill="#C8FF2E" stroke="#111111" strokeWidth="2" />
            <circle cx="36" cy="80" r="4" fill="#C8FF2E" stroke="#111111" strokeWidth="1.5" />
            <circle cx="75" cy="85" r="3.5" fill="#111111" />
          </g>
        ) : (
          <g>
            <circle cx="82" cy="38" r="4" fill="#111111" />
            <circle cx="36" cy="80" r="3" fill="#111111" />
          </g>
        )}
      </svg>

      {/* Reticle Status Label */}
      <div className="absolute bottom-3 left-0 right-0 text-center">
        <span className="mono text-[10px] font-extrabold text-[#111111] uppercase tracking-[0.18em] bg-[#C8FF2E] px-2 py-0.5 rounded-[6px] border border-[#111111]">
          {statusLabel}
        </span>
      </div>
    </div>
  );
};

export default RadarReticle;
