import { memo } from 'react';

interface ZorqenLogoMarkProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  className?: string;
  showText?: boolean;
  textClassName?: string;
}

const SIZE_MAP = {
  sm: 26, // Reduced ~8% from 28
  md: 33, // Reduced ~8% from 36
  lg: 44, // Reduced ~8% from 48
  xl: 59, // Reduced ~8% from 64
};

export const ZorqenLogoMark = memo(function ZorqenLogoMark({
  size = 'md',
  className = '',
  showText = false,
  textClassName = '',
}: ZorqenLogoMarkProps) {
  const pixelSize =
    typeof size === 'number'
      ? Math.round(size * 0.92) // Reduced ~8% for cleaner balance
      : SIZE_MAP[size] || 33;

  return (
    <div className={`inline-flex items-center gap-3.5 sm:gap-4 select-none ${className}`}>
      {/* Refined, Minimal European Cybersecurity Geometric Mark */}
      <svg
        width={pixelSize}
        height={pixelSize}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-200 group-hover:scale-[1.03]"
        shapeRendering="geometricPrecision"
        aria-hidden="true"
      >
        {/* Outer Precision Architectural Shield Contour */}
        <path
          d="M 18 2.5 L 31 8.5 V 19 C 31 26.5 18 33.5 18 33.5 C 18 33.5 5 26.5 5 19 V 8.5 L 18 2.5 Z"
          fill="#111111"
        />
        {/* Inner White Frame Inset */}
        <path
          d="M 18 5 L 28.5 9.8 V 18 C 28.5 24 18 29.8 18 29.8 C 18 29.8 7.5 24 7.5 18 V 9.8 L 18 5 Z"
          fill="#FFFFFF"
        />
        {/* Left Architectural Facet (Midnight Ink #111111) */}
        <path
          d="M 18 6.8 L 9.5 10.8 V 17.5 C 9.5 22.2 18 27.2 18 27.2 V 6.8 Z"
          fill="#111111"
        />
        {/* Right Architectural Facet (Electric Lime Accent #C8F31D) */}
        <path
          d="M 18 6.8 L 26.5 10.8 V 17.5 C 26.5 22.2 18 27.2 18 27.2 V 6.8 Z"
          fill="#C8F31D"
        />
        {/* High-Precision Central Dividing Seam */}
        <line
          x1="18"
          y1="6"
          x2="18"
          y2="28"
          stroke="#111111"
          strokeWidth="1.6"
        />
        {/* Central Cryptographic Validation Rhombus */}
        <path
          d="M 18 13.5 L 21.5 17.5 L 18 21.5 L 14.5 17.5 Z"
          fill="#FFFFFF"
          stroke="#111111"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        {/* Precision Micro Center Point */}
        <circle cx="18" cy="17.5" r="1.1" fill="#111111" />
      </svg>

      {showText && (
        <div className={`leading-tight flex flex-col justify-center select-none ${textClassName}`}>
          {/* Brand Name - Elegant italic cursive/serif style (Bodoni Moda / Cormorant Garamond) */}
          <span
            className="italic font-semibold text-[19px] sm:text-[21px] tracking-[0.02em] text-[#111111] leading-none select-none font-serif"
            style={{ fontFamily: 'var(--font-serif-luxury)' }}
          >
            Zorqen
          </span>
          {/* Italian Descriptor - Exactly preserved as requested */}
          <span className="font-mono text-[9.5px] sm:text-[10px] font-medium tracking-[0.28em] text-[#525252] uppercase mt-1 sm:mt-1.5 whitespace-nowrap">
            CONVALIDA DI SICUREZZA
          </span>
        </div>
      )}
    </div>
  );
});

export default ZorqenLogoMark;
