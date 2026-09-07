import { memo } from 'react';

interface ZorqenLogoMarkProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  className?: string;
  showText?: boolean;
  textClassName?: string;
}

const SIZE_MAP = {
  sm: 28,
  md: 36,
  lg: 48,
  xl: 64,
};

export const ZorqenLogoMark = memo(function ZorqenLogoMark({
  size = 'md',
  className = '',
  showText = false,
  textClassName = '',
}: ZorqenLogoMarkProps) {
  const pixelSize = typeof size === 'number' ? size : SIZE_MAP[size] || 36;

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Crisp geometric ZORQEN Emblem */}
      <svg
        width={pixelSize}
        height={pixelSize}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        shapeRendering="geometricPrecision"
        aria-hidden="true"
      >
        {/* Outer Shadow Box offset */}
        <rect x="5" y="5" width="30" height="30" rx="6" fill="#111111" />
        {/* Main Panel Box */}
        <rect
          x="3"
          y="3"
          width="30"
          height="30"
          rx="6"
          fill="#FFFFFF"
          stroke="#111111"
          strokeWidth="1.75"
        />

        {/* Shield Outer Path */}
        <path
          d="M 18 9.5 L 26.5 12.5 V 20.5 C 26.5 26 18 29.5 18 29.5 C 18 29.5 9.5 26 9.5 20.5 V 12.5 Z"
          fill="#111111"
        />
        {/* Inner Acid Lime Shield Accent */}
        <path
          d="M 18 12 L 24 14.1 V 19.8 C 24 23.8 18 26.4 18 26.4 C 18 26.4 12 23.8 12 19.8 V 14.1 Z"
          fill="#C8F31D"
          stroke="#111111"
          strokeWidth="1.2"
        />
        {/* Sharp Security Validation Checkmark */}
        <path
          d="M 15.5 19 L 17.5 21 L 21 16.5"
          fill="none"
          stroke="#111111"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {showText && (
        <div className={`leading-tight flex flex-col justify-center ${textClassName}`}>
          <div className="font-extrabold text-[15px] sm:text-[16px] tracking-tight text-[#111111] leading-none flex items-center gap-1.5 font-sans">
            ZORQEN
          </div>
          <div className="font-mono text-[8px] sm:text-[8.5px] font-extrabold tracking-[0.18em] text-[#4A4A4A] uppercase mt-1">
            SECURITY VALIDATION
          </div>
        </div>
      )}
    </div>
  );
});

export default ZorqenLogoMark;
