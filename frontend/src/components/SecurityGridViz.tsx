
export default function SecurityGridViz() {
  return (
    <div className="relative w-full h-[380px] sm:h-[440px] lg:h-[480px] rounded-[24px] bg-white/70 border-2 border-[#111111] shadow-hard overflow-hidden flex items-center justify-center select-none group transition-all duration-200 hover:shadow-hard-lg">
      
      {/* SVG Security Grid Network */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 500 480"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Layered Dot Grid Pattern (8% opacity) */}
          <pattern
            id="securityGridDots"
            x="0"
            y="0"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="12" cy="12" r="1.5" fill="#111111" fillOpacity="0.08" />
          </pattern>

          {/* Blueprint Grid Lines Pattern (10% opacity) */}
          <pattern
            id="securityBlueprintLines"
            x="0"
            y="0"
            width="80"
            height="80"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 80 0 L 0 0 0 80"
              fill="none"
              stroke="#111111"
              strokeWidth="1"
              strokeOpacity="0.10"
              strokeDasharray="4 4"
            />
          </pattern>
        </defs>

        {/* Layer 1: Dot Grid (8%) */}
        <rect width="500" height="480" fill="url(#securityGridDots)" />

        {/* Layer 2: Blueprint Lines (10%) */}
        <rect width="500" height="480" fill="url(#securityBlueprintLines)" />

        {/* Subtle Radial Axis Crosshairs & Radar Rings (10% opacity) */}
        <line x1="250" y1="30" x2="250" y2="450" stroke="#111111" strokeOpacity="0.10" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="30" y1="240" x2="470" y2="240" stroke="#111111" strokeOpacity="0.10" strokeWidth="1" strokeDasharray="3 3" />
        <circle cx="250" cy="240" r="100" stroke="#111111" strokeOpacity="0.10" strokeWidth="1" fill="none" />
        <circle cx="250" cy="240" r="180" stroke="#111111" strokeOpacity="0.08" strokeWidth="1" fill="none" strokeDasharray="6 6" />

        {/* Subtle Connecting Lines between Vulnerability Nodes (10% opacity) */}
        <g stroke="#111111" strokeOpacity="0.10" strokeWidth="1.5">
          <line x1="110" y1="130" x2="200" y2="190" />
          <line x1="200" y1="190" x2="280" y2="150" />
          <line x1="280" y1="150" x2="390" y2="110" />
          <line x1="200" y1="190" x2="160" y2="310" />
          <line x1="160" y1="310" x2="260" y2="350" />
          <line x1="260" y1="350" x2="380" y2="320" />
          <line x1="280" y1="150" x2="260" y2="350" strokeDasharray="4 4" />
          <line x1="390" y1="110" x2="380" y2="320" />
        </g>

        {/* Highlighted Vector Rays */}
        <g stroke="#C8F31D" strokeWidth="1.5" strokeOpacity="0.5">
          <line x1="200" y1="190" x2="280" y2="150" />
          <line x1="280" y1="150" x2="380" y2="320" />
        </g>

        {/* Floating Vulnerability Nodes */}
        {/* Node 1 */}
        <g transform="translate(110, 130)">
          <circle r="4" fill="#111111" fillOpacity="0.3" />
          <circle r="8" stroke="#111111" strokeOpacity="0.15" strokeWidth="1" fill="none" />
        </g>

        {/* Node 2 */}
        <g transform="translate(390, 110)">
          <circle r="4" fill="#111111" fillOpacity="0.4" />
          <circle r="9" stroke="#111111" strokeOpacity="0.15" strokeWidth="1" fill="none" />
        </g>

        {/* Node 3 */}
        <g transform="translate(200, 190)">
          <circle r="5" fill="#111111" fillOpacity="0.5" />
          <circle r="11" stroke="#111111" strokeOpacity="0.2" strokeWidth="1" fill="none" />
        </g>

        {/* Node 4 */}
        <g transform="translate(160, 310)">
          <circle r="4" fill="#111111" fillOpacity="0.3" />
          <circle r="8" stroke="#111111" strokeOpacity="0.15" strokeWidth="1" fill="none" />
        </g>

        {/* Node 5 */}
        <g transform="translate(380, 320)">
          <circle r="5" fill="#111111" fillOpacity="0.5" />
          <circle r="12" stroke="#111111" strokeOpacity="0.2" strokeWidth="1" fill="none" />
        </g>

        {/* Node 6 */}
        <g transform="translate(260, 350)">
          <circle r="4" fill="#111111" fillOpacity="0.3" />
          <circle r="9" stroke="#111111" strokeOpacity="0.15" strokeWidth="1" fill="none" />
        </g>

        {/* Small Neon-Green Pulse Points */}
        <g transform="translate(200, 190)">
          <circle r="3" fill="#C8F31D" />
        </g>
        <g transform="translate(380, 320)">
          <circle r="3" fill="#C8F31D" />
        </g>

        {/* ONE LARGER HIGHLIGHTED NODE (100% Opacity) */}
        <g transform="translate(280, 150)">
          <circle r="20" fill="#C8F31D" fillOpacity="0.2" className="animate-ping" style={{ animationDuration: '2.5s' }} />
          <circle r="24" stroke="#C8F31D" strokeWidth="1.5" strokeOpacity="0.7" fill="none" />
          <circle r="15" fill="#111111" />
          <circle r="7" fill="#C8F31D" />
        </g>
      </svg>

      {/* Floating Tactical Labels */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-[8px] bg-white border-2 border-[#111111] shadow-hard-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-[#C8F31D] animate-pulse border border-[#111111]" />
          <span className="mono text-[10.5px] font-extrabold tracking-wider text-[#111111] uppercase">
            SECURITY NETWORK // ACTIVE
          </span>
        </div>
        <div className="px-2.5 py-1 rounded-[8px] bg-[#111111] text-[#C8F31D] mono text-[10.5px] font-extrabold tracking-wider">
          TARGET_NODE::0x8F
        </div>
      </div>

      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none text-[11px] mono font-bold text-[#111111]/70">
        <span>AST THREAT GRAPH</span>
        <span className="flex items-center gap-1.5 text-[#111111]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#111111]" /> 153 AST NODES
        </span>
      </div>
    </div>
  );
}
