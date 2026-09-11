import React from 'react';

/**
 * AmbientSecurityGraph
 *
 * A subtle, premium cyber security attack-graph visualization for the ZORQEN hero.
 * Inspired by Linear, Vercel, Raycast, and Nothing design language.
 *
 * Rules:
 * - Purely decorative (aria-hidden, pointer-events-none, no interactivity).
 * - Absolutely NO cards, boxes, or fake metrics.
 * - Large concentric rings at 4-8% opacity.
 * - Organic attack graph (15 nodes, organic connections).
 * - One primary active node in neon lime (#C8FF1A) with 2.5px border and soft scanning ripple.
 * - Background warm gray (#ECE9E3 / #E9E7E1) with black strokes (#111111).
 * - Faint grid and tiny anchor dots.
 * - Soft radial fade into the background canvas.
 * - Responsive: desktop 35-40% width, tablet scaled down, mobile hidden.
 * - Respects prefers-reduced-motion.
 */
export default function AmbientSecurityGraph({ className = '' }: { className?: string }) {
  // Focal coordinate for primary neon lime node & concentric rings
  const focal = { x: 320, y: 225 };

  // 15 attack graph nodes with balanced organic network topology
  const nodes = [
    // Primary active node (index 0)
    { id: 'n-core', x: focal.x, y: focal.y, r: 6.5, type: 'primary' },

    // Primary cluster neighbors
    { id: 'n-1', x: 235, y: 175, r: 4, type: 'hollow', pulse: true },
    { id: 'n-2', x: 395, y: 165, r: 3.5, type: 'solid' },
    { id: 'n-3', x: 255, y: 285, r: 4.5, type: 'hollow' },
    { id: 'n-4', x: 380, y: 295, r: 3.5, type: 'hollow', pulse: true },
    { id: 'n-5', x: 325, y: 125, r: 3, type: 'solid' },
    { id: 'n-6', x: 310, y: 335, r: 4, type: 'solid' },

    // Peripheral attack vectors / secondary nodes
    { id: 'n-7', x: 160, y: 130, r: 3, type: 'solid' },
    { id: 'n-8', x: 175, y: 240, r: 3.5, type: 'hollow' },
    { id: 'n-9', x: 195, y: 350, r: 3, type: 'solid' },
    { id: 'n-10', x: 460, y: 120, r: 3, type: 'hollow' },
    { id: 'n-11', x: 470, y: 220, r: 4, type: 'hollow', pulse: true },
    { id: 'n-12', x: 445, y: 340, r: 3.5, type: 'solid' },
    { id: 'n-13', x: 110, y: 205, r: 2.5, type: 'solid' },
    { id: 'n-14', x: 505, y: 280, r: 2.5, type: 'solid' },
  ];

  // Connections forming organic attack paths and dependency relationships
  const edges = [
    // Core incident / active attack vector edges (leading to neon lime node)
    { from: 'n-1', to: 'n-core', style: 'alt' },
    { from: 'n-2', to: 'n-core', style: 'main' },
    { from: 'n-3', to: 'n-core', style: 'main' },
    { from: 'n-4', to: 'n-core', style: 'alt' },
    { from: 'n-5', to: 'n-core', style: 'main' },
    { from: 'n-6', to: 'n-core', style: 'alt' },

    // Intermediate interconnects
    { from: 'n-7', to: 'n-1', style: 'main' },
    { from: 'n-8', to: 'n-1', style: 'alt' },
    { from: 'n-8', to: 'n-3', style: 'main' },
    { from: 'n-9', to: 'n-3', style: 'alt' },
    { from: 'n-9', to: 'n-6', style: 'main' },
    { from: 'n-5', to: 'n-2', style: 'alt' },
    { from: 'n-2', to: 'n-10', style: 'main' },
    { from: 'n-2', to: 'n-11', style: 'alt' },
    { from: 'n-4', to: 'n-11', style: 'main' },
    { from: 'n-4', to: 'n-12', style: 'alt' },
    { from: 'n-6', to: 'n-12', style: 'main' },
    { from: 'n-13', to: 'n-8', style: 'main' },
    { from: 'n-11', to: 'n-14', style: 'alt' },
    { from: 'n-12', to: 'n-14', style: 'main' },
  ];

  // Helper map for fast coordinate lookups
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Tiny scattered anchor dots across the canvas (Linear / Nothing aesthetic)
  const anchorDots = [
    { x: 120, y: 95 },
    { x: 210, y: 75 },
    { x: 380, y: 70 },
    { x: 480, y: 75 },
    { x: 90, y: 310 },
    { x: 140, y: 405 },
    { x: 280, y: 410 },
    { x: 410, y: 415 },
    { x: 500, y: 375 },
    { x: 520, y: 170 },
    { x: 270, y: 160 },
    { x: 360, y: 260 },
  ];

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none relative w-full h-full flex items-center justify-end ${className}`}
      style={{
        WebkitMaskImage: 'radial-gradient(ellipse 72% 70% at 60% 48%, black 30%, rgba(0,0,0,0.7) 60%, transparent 88%)',
        maskImage: 'radial-gradient(ellipse 72% 70% at 60% 48%, black 30%, rgba(0,0,0,0.7) 60%, transparent 88%)',
      }}
    >
      <svg
        viewBox="0 0 580 470"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full max-w-[560px] xl:max-w-[620px] h-auto overflow-visible"
      >
        <defs>
          {/* Faint coordinate grid pattern (strokeOpacity 0.04) */}
          <pattern
            id="cyber-grid-pattern"
            width="34"
            height="34"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 34 0 L 0 0 0 34"
              fill="none"
              stroke="#111111"
              strokeWidth="0.8"
              strokeOpacity="0.04"
            />
          </pattern>

          {/* Very soft neon-lime glow filter for primary active node */}
          <filter id="neon-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4.5" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="11" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── 1. FAINT BACKGROUND GRID ── */}
        <rect
          x="10"
          y="10"
          width="560"
          height="450"
          fill="url(#cyber-grid-pattern)"
        />

        {/* Grid Intersection Crosshairs (very subtle, opacity 0.06) */}
        <g stroke="#111111" strokeOpacity="0.06" strokeWidth="1">
          <path d="M 218 221 v 8 M 222 225 h -8" />
          <path d="M 422 221 v 8 M 426 225 h -8" />
          <path d="M 320 119 v 8 M 324 123 h -8" />
          <path d="M 320 323 v 8 M 324 327 h -8" />
        </g>

        {/* ── 2. LARGE CONCENTRIC RINGS (4%–8% Opacity) ── */}
        <g stroke="#111111">
          {/* Ring 1: innermost radar perimeter */}
          <circle
            cx={focal.x}
            cy={focal.y}
            r="65"
            strokeOpacity="0.08"
            strokeWidth="1.2"
          />
          {/* Ring 2: subtle dashed tier */}
          <circle
            cx={focal.x}
            cy={focal.y}
            r="125"
            strokeOpacity="0.065"
            strokeWidth="1.2"
            strokeDasharray="5 7"
          />
          {/* Ring 3: mid tier */}
          <circle
            cx={focal.x}
            cy={focal.y}
            r="190"
            strokeOpacity="0.05"
            strokeWidth="1"
          />
          {/* Ring 4: wide outer tier */}
          <circle
            cx={focal.x}
            cy={focal.y}
            r="260"
            strokeOpacity="0.04"
            strokeWidth="1"
            strokeDasharray="14 10"
          />
          {/* Ring 5: outer boundary falloff */}
          <circle
            cx={focal.x}
            cy={focal.y}
            r="330"
            strokeOpacity="0.03"
            strokeWidth="0.8"
          />
        </g>

        {/* Concentric Cardinal Tick Marks (Precision Optics) */}
        <g stroke="#111111" strokeOpacity="0.08" strokeWidth="1.2">
          <line x1={focal.x - 70} y1={focal.y} x2={focal.x - 60} y2={focal.y} />
          <line x1={focal.x + 60} y1={focal.y} x2={focal.x + 70} y2={focal.y} />
          <line x1={focal.x} y1={focal.y - 70} x2={focal.x} y2={focal.y - 60} />
          <line x1={focal.x} y1={focal.y + 60} x2={focal.x} y2={focal.y + 70} />

          <line x1={focal.x - 130} y1={focal.y} x2={focal.x - 120} y2={focal.y} />
          <line x1={focal.x + 120} y1={focal.y} x2={focal.x + 130} y2={focal.y} />
          <line x1={focal.x} y1={focal.y - 130} x2={focal.x} y2={focal.y - 120} />
          <line x1={focal.x} y1={focal.y + 120} x2={focal.x} y2={focal.y + 130} />
        </g>

        {/* ── 3. CONNECTION LINES (Thin black strokes, 60–100% opacity subtle fade) ── */}
        <g stroke="#111111" strokeWidth="1.25">
          {edges.map((edge, idx) => {
            const start = nodeMap.get(edge.from);
            const end = nodeMap.get(edge.to);
            if (!start || !end) return null;

            return (
              <line
                key={`edge-${idx}`}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                strokeOpacity={edge.style === 'main' ? '0.38' : '0.24'}
                className={edge.style === 'main' ? 'animate-cyber-edge' : 'animate-cyber-edge-alt'}
              />
            );
          })}
        </g>

        {/* ── 4. SCANNING RIPPLE (Expands from the neon lime node every few seconds) ── */}
        <circle
          cx={focal.x}
          cy={focal.y}
          r="8"
          stroke="#C8FF1A"
          strokeWidth="1.5"
          fill="none"
          className="animate-cyber-ripple"
        />

        {/* Secondary staggered faint ripple */}
        <circle
          cx={focal.x}
          cy={focal.y}
          r="8"
          stroke="#C8FF1A"
          strokeWidth="1"
          fill="none"
          className="animate-cyber-ripple"
          style={{ animationDelay: '1.8s' }}
        />

        {/* ── 5. TINY BLACK DOTS INTEGRATED INTO COMPOSITION ── */}
        <g fill="#111111" opacity="0.32">
          {anchorDots.map((dot, idx) => (
            <circle key={`anchor-${idx}`} cx={dot.x} cy={dot.y} r="1.4" />
          ))}
        </g>

        {/* ── 6. ATTACK GRAPH NODES (12–18 nodes) ── */}
        <g>
          {nodes.map((node) => {
            if (node.type === 'primary') {
              // PRIMARY GLOWING NEON-LIME NODE (#C8FF1A)
              // 2.5px borders, soft glow around active node, neon lime fill
              return (
                <g key={node.id} className="animate-cyber-lime">
                  {/* Subtle ambient halo */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.r + 5}
                    fill="#C8FF1A"
                    fillOpacity="0.18"
                  />
                  {/* Outer ring */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.r + 2.5}
                    stroke="#111111"
                    strokeWidth="1"
                    strokeOpacity="0.4"
                    fill="none"
                    strokeDasharray="2 2"
                  />
                  {/* Primary Node Body: #C8FF1A fill, 2.5px #111111 stroke */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.r}
                    fill="#C8FF1A"
                    stroke="#111111"
                    strokeWidth="2.5"
                    filter="url(#neon-glow)"
                  />
                  {/* Center core pinpoint */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="2.2"
                    fill="#111111"
                  />
                </g>
              );
            }

            if (node.type === 'hollow') {
              // Hollow circular node
              return (
                <circle
                  key={node.id}
                  cx={node.x}
                  cy={node.y}
                  r={node.r}
                  fill="#ECE9E3"
                  stroke="#111111"
                  strokeWidth="2"
                  strokeOpacity="0.75"
                  className={node.pulse ? 'animate-cyber-node' : undefined}
                />
              );
            }

            // Solid black node
            return (
              <circle
                key={node.id}
                cx={node.x}
                cy={node.y}
                r={node.r}
                fill="#111111"
                fillOpacity="0.8"
                className={node.pulse ? 'animate-cyber-node' : undefined}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}
