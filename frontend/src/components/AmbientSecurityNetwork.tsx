export default function AmbientSecurityNetwork() {
  return (
    <div
      aria-hidden="true"
      className="absolute top-0 right-0 w-[280px] md:w-[320px] lg:w-[480px] xl:w-[540px] h-[360px] lg:h-[460px] pointer-events-none select-none z-0 overflow-visible hidden md:block"
    >
      <svg
        className="w-full h-full ambient-float"
        viewBox="0 0 520 460"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Sparse dot-grid pattern in top-right */}
          <pattern
            id="ambientDots"
            x="0"
            y="0"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="10" cy="10" r="1" fill="#111111" fillOpacity="0.10" />
          </pattern>

          {/* Fade mask for the dot grid fading toward the center */}
          <radialGradient id="dotGridFade" cx="80%" cy="20%" r="65%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.75" />
            <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>

          <mask id="ambientDotMask">
            <rect width="520" height="460" fill="url(#dotGridFade)" />
          </mask>

          {/* Soft radial glow behind the main neon node */}
          <radialGradient id="mainNodeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#C6F20D" stopOpacity="0.30" />
            <stop offset="45%" stopColor="#C6F20D" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#C6F20D" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. Sparse Dot Grid (fading toward center) */}
        <rect width="520" height="460" fill="url(#ambientDots)" mask="url(#ambientDotMask)" />

        {/* 2. Hairline Technical Blueprint Lines (1px, 6-8% opacity) */}
        <g stroke="#111111" strokeOpacity="0.08" strokeWidth="1">
          <line x1="140" y1="180" x2="490" y2="180" strokeDasharray="3 6" />
          <line x1="360" y1="40" x2="360" y2="380" strokeDasharray="3 6" />
          <line x1="220" y1="80" x2="460" y2="320" strokeDasharray="2 5" strokeOpacity="0.06" />
        </g>

        {/* 3. 2 Thin Orbital Rings (1px stroke, 8-12% opacity) */}
        <g transform="rotate(-12 360 180)">
          {/* Outer Orbital Ring */}
          <ellipse
            cx="360"
            cy="180"
            rx="180"
            ry="110"
            fill="none"
            stroke="#111111"
            strokeOpacity="0.09"
            strokeWidth="1"
          />
          {/* Inner Orbital Ring */}
          <ellipse
            cx="360"
            cy="180"
            rx="110"
            ry="68"
            fill="none"
            stroke="#111111"
            strokeOpacity="0.11"
            strokeWidth="1"
            strokeDasharray="4 5"
          />
        </g>

        {/* 4. Thin Curved Lines Connecting Nodes */}
        <g fill="none">
          <path
            d="M 230 120 Q 290 135 360 180"
            stroke="#111111"
            strokeOpacity="0.11"
            strokeWidth="1"
          />
          <path
            d="M 360 180 Q 405 215 440 270"
            stroke="#111111"
            strokeOpacity="0.10"
            strokeWidth="1"
          />
          <path
            d="M 360 180 Q 320 250 280 290"
            stroke="#111111"
            strokeOpacity="0.08"
            strokeWidth="1"
            strokeDasharray="3 4"
          />
          {/* Subtle neon-green active trace accent */}
          <path
            d="M 230 120 Q 290 135 360 180"
            stroke="#C6F20D"
            strokeOpacity="0.30"
            strokeWidth="1"
          />
        </g>

        {/* 5. Soft Radial Glow Behind Largest Main Node */}
        <circle
          cx="360"
          cy="180"
          r="48"
          fill="url(#mainNodeGlow)"
          className="ambient-glow-pulse"
          style={{ transformOrigin: '360px 180px' }}
        />

        {/* 6. Nodes (3-4 neon green #C6F20D nodes) */}
        
        {/* Node 1: Main Highlighted Node (at 360, 180) */}
        <g transform="translate(360, 180)">
          <circle r="12" fill="none" stroke="#111111" strokeOpacity="0.18" strokeWidth="1" />
          <circle r="6" fill="#111111" />
          <circle r="2.8" fill="#C6F20D" />
        </g>

        {/* Node 2: Secondary Node (at 230, 120) */}
        <g transform="translate(230, 120)">
          <circle r="6" fill="none" stroke="#111111" strokeOpacity="0.14" strokeWidth="1" />
          <circle r="3" fill="#111111" />
          <circle r="1.8" fill="#C6F20D" />
        </g>

        {/* Node 3: Secondary Node (at 440, 270) */}
        <g transform="translate(440, 270)">
          <circle r="5" fill="none" stroke="#111111" strokeOpacity="0.14" strokeWidth="1" />
          <circle r="2.5" fill="#111111" />
          <circle r="1.6" fill="#C6F20D" />
        </g>

        {/* Node 4: Minor Node (at 280, 290) */}
        <g transform="translate(280, 290)">
          <circle r="4" fill="none" stroke="#111111" strokeOpacity="0.10" strokeWidth="1" />
          <circle r="2" fill="#111111" />
          <circle r="1.4" fill="#C6F20D" />
        </g>
      </svg>
    </div>
  );
}
