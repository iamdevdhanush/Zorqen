import type { CSSProperties } from 'react';

/**
 * Charcoal 12x12px dot-grid styles using 1.5px dots (#1A1A1A).
 * Renders selectively to provide subtle depth and hierarchy in alignment with Linear + Figma + Rimowa design language.
 */
const DOT_BASE_STYLE: CSSProperties = {
  backgroundImage: 'radial-gradient(circle, #1A1A1A 0.75px, transparent 0.75px)',
  backgroundSize: '12px 12px',
};

/**
 * 1. Hero background dot-grid (top-right only)
 * - 12x12px spacing, 1.5px charcoal dots (#1A1A1A)
 * - Fades from 25% opacity to 0%
 * - Occupies only upper-right 35% of the hero
 * - Removed on mobile (hidden md:block)
 */
export function HeroDotGrid({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`hidden md:block absolute top-0 right-0 w-[35%] h-full pointer-events-none select-none z-0 ${className}`}
      style={{
        ...DOT_BASE_STYLE,
        maskImage: 'radial-gradient(ellipse at top right, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.12) 45%, rgba(0,0,0,0) 80%)',
        WebkitMaskImage: 'radial-gradient(ellipse at top right, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.12) 45%, rgba(0,0,0,0) 80%)',
      }}
    />
  );
}

/**
 * 2. Module card dot clusters
 * - Tiny cluster behind module badge or corner
 * - Opacity below 12%
 */
export function CardBadgeCluster({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`absolute top-2 right-2 w-16 h-12 pointer-events-none select-none rounded-[16px] z-0 ${className}`}
      style={{
        ...DOT_BASE_STYLE,
        maskImage: 'radial-gradient(circle at center, rgba(0,0,0,0.11) 0%, rgba(0,0,0,0) 70%)',
        WebkitMaskImage: 'radial-gradient(circle at center, rgba(0,0,0,0.11) 0%, rgba(0,0,0,0) 70%)',
      }}
    />
  );
}

export function CardCornerCluster({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`absolute bottom-2 right-2 w-16 h-16 pointer-events-none select-none rounded-br-[22px] z-0 ${className}`}
      style={{
        ...DOT_BASE_STYLE,
        maskImage: 'radial-gradient(circle at bottom right, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0) 70%)',
        WebkitMaskImage: 'radial-gradient(circle at bottom right, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0) 70%)',
      }}
    />
  );
}

/**
 * 3. Status card horizontal dot strip
 * - Behind status badge ("Disconnected")
 * - Does not cover the entire card
 */
export function StatusDotStrip({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`absolute -inset-x-3 -inset-y-1.5 pointer-events-none select-none rounded-full z-0 ${className}`}
      style={{
        ...DOT_BASE_STYLE,
        maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 20%, rgba(0,0,0,0.15) 80%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 20%, rgba(0,0,0,0.15) 80%, transparent 100%)',
      }}
    />
  );
}

/**
 * 4. Success / Validation card radial dot halo
 * - Radial dot halo behind validation / success icon
 * - Denser near icon (18%), fading outward
 */
export function RadialDotHalo({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`absolute -inset-4 pointer-events-none select-none z-0 ${className}`}
      style={{
        ...DOT_BASE_STYLE,
        maskImage: 'radial-gradient(circle at center, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.08) 50%, transparent 80%)',
        WebkitMaskImage: 'radial-gradient(circle at center, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.08) 50%, transparent 80%)',
      }}
    />
  );
}

/**
 * 5. Section dividers
 * - Short dotted separator, maximum width 120px
 */
export function DottedSeparator({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center my-8 sm:my-10 ${className}`} aria-hidden="true">
      <div
        className="h-[12px] w-[120px] max-w-[120px] select-none pointer-events-none"
        style={{
          ...DOT_BASE_STYLE,
          maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.18) 25%, rgba(0,0,0,0.18) 75%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.18) 25%, rgba(0,0,0,0.18) 75%, transparent 100%)',
        }}
      />
    </div>
  );
}
