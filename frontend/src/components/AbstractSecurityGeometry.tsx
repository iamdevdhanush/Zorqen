import { memo } from 'react';

/**
 * Minimal Abstract Security Geometry
 * Editorial / Brutalist Architectural Decoration for ZORQEN Hero
 * 
 * Rules:
 * - Low contrast strictly at 5% to 8% opacity.
 * - Zero dashboards, cards, graphs, widgets, statistics, floating panels, or fake metrics.
 * - Pure geometric architectural lines, concentric validation rings, dot array, and perimeter coordinates.
 * - Non-interactive, aria-hidden.
 */
function AbstractSecurityGeometry() {
  return (
    <div
      aria-hidden="true"
      className="relative w-full max-w-[440px] aspect-square flex items-center justify-center select-none pointer-events-none"
    >
      <svg
        viewBox="0 0 440 440"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full text-[#111111]"
      >
        <defs>
          {/* Subtle dot pattern at ~6% opacity */}
          <pattern
            id="hero-geom-dots"
            x="0"
            y="0"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="10" cy="10" r="1" fill="#111111" fillOpacity="0.065" />
          </pattern>
          {/* Radial mask for soft fade of dots at edges */}
          <radialGradient id="hero-geom-mask" cx="50%" cy="50%" r="50%">
            <stop offset="20%" stopColor="white" stopOpacity="1" />
            <stop offset="65%" stopColor="white" stopOpacity="0.5" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <mask id="hero-geom-dot-mask">
            <rect width="440" height="440" fill="url(#hero-geom-mask)" />
          </mask>
        </defs>

        {/* Masked Dot Grid */}
        <rect
          width="440"
          height="440"
          fill="url(#hero-geom-dots)"
          mask="url(#hero-geom-dot-mask)"
        />

        {/* ── Outer Perimeter Bounding Frame with Corner Brackets ── */}
        <rect
          x="30"
          y="30"
          width="380"
          height="380"
          stroke="#111111"
          strokeWidth="1"
          strokeOpacity="0.05"
          strokeDasharray="4 8"
        />

        {/* Precision Corner Registration Brackets (8% opacity) */}
        {/* Top-Left */}
        <path d="M 24 38 L 24 24 L 38 24" stroke="#111111" strokeWidth="1.5" strokeOpacity="0.08" />
        {/* Top-Right */}
        <path d="M 402 24 L 416 24 L 416 38" stroke="#111111" strokeWidth="1.5" strokeOpacity="0.08" />
        {/* Bottom-Left */}
        <path d="M 24 402 L 24 416 L 38 416" stroke="#111111" strokeWidth="1.5" strokeOpacity="0.08" />
        {/* Bottom-Right */}
        <path d="M 402 416 L 416 416 L 416 402" stroke="#111111" strokeWidth="1.5" strokeOpacity="0.08" />

        {/* ── Precision Orthogonal Crosshair Axes (5-7% opacity) ── */}
        <line x1="220" y1="20" x2="220" y2="420" stroke="#111111" strokeWidth="1" strokeOpacity="0.06" strokeDasharray="3 6" />
        <line x1="20" y1="220" x2="420" y2="220" stroke="#111111" strokeWidth="1" strokeOpacity="0.06" strokeDasharray="3 6" />

        {/* Coordinate Axis Precision Ticks */}
        <line x1="216" y1="120" x2="224" y2="120" stroke="#111111" strokeWidth="1" strokeOpacity="0.07" />
        <line x1="216" y1="170" x2="224" y2="170" stroke="#111111" strokeWidth="1" strokeOpacity="0.07" />
        <line x1="216" y1="270" x2="224" y2="270" stroke="#111111" strokeWidth="1" strokeOpacity="0.07" />
        <line x1="216" y1="320" x2="224" y2="320" stroke="#111111" strokeWidth="1" strokeOpacity="0.07" />

        <line x1="120" y1="216" x2="120" y2="224" stroke="#111111" strokeWidth="1" strokeOpacity="0.07" />
        <line x1="170" y1="216" x2="170" y2="224" stroke="#111111" strokeWidth="1" strokeOpacity="0.07" />
        <line x1="270" y1="216" x2="270" y2="224" stroke="#111111" strokeWidth="1" strokeOpacity="0.07" />
        <line x1="320" y1="216" x2="320" y2="224" stroke="#111111" strokeWidth="1" strokeOpacity="0.07" />

        {/* ── Concentric Security Validation Circles ── */}
        {/* Outer Ring (r=170) */}
        <circle cx="220" cy="220" r="170" stroke="#111111" strokeWidth="1" strokeOpacity="0.06" strokeDasharray="2 6" />
        {/* Mid Ring (r=120) */}
        <circle cx="220" cy="220" r="120" stroke="#111111" strokeWidth="1" strokeOpacity="0.07" />
        {/* Inner Ring (r=70) */}
        <circle cx="220" cy="220" r="70" stroke="#111111" strokeWidth="1" strokeOpacity="0.07" strokeDasharray="4 4" />
        {/* Core Ring (r=24) */}
        <circle cx="220" cy="220" r="24" stroke="#111111" strokeWidth="1.2" strokeOpacity="0.08" />

        {/* ── Abstract Diamond / Hexagonal Security Enclave Boundary ── */}
        <polygon
          points="220,70 370,220 220,370 70,220"
          stroke="#111111"
          strokeWidth="1"
          strokeOpacity="0.06"
          strokeDasharray="6 6"
        />

        {/* Precision Registration Marks (+) at Key Intersections (7-8% opacity) */}
        <g stroke="#111111" strokeWidth="1" strokeOpacity="0.075">
          {/* Top */}
          <line x1="216" y1="70" x2="224" y2="70" />
          <line x1="220" y1="66" x2="220" y2="74" />
          {/* Right */}
          <line x1="366" y1="220" x2="374" y2="220" />
          <line x1="370" y1="216" x2="370" y2="224" />
          {/* Bottom */}
          <line x1="216" y1="370" x2="224" y2="370" />
          <line x1="220" y1="366" x2="220" y2="374" />
          {/* Left */}
          <line x1="66" y1="220" x2="74" y2="220" />
          <line x1="70" y1="216" x2="70" y2="224" />

          {/* Center Micro Reticle */}
          <circle cx="220" cy="220" r="4" fill="#111111" fillOpacity="0.08" />
        </g>
      </svg>
    </div>
  );
}

export default memo(AbstractSecurityGeometry);
