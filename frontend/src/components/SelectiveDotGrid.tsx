/**
 * Premium Editorial Dot Accent Components
 * Inspired by Nothing, Linear, and Luxury SaaS aesthetics.
 *
 * Rules:
 * - Uses black dots only (#111111) at 16% opacity (12-18% range) via .dot-accent class.
 * - Dot size: 2px desktop, 1.5px mobile.
 * - Grid spacing: 16px desktop, 12px mobile.
 * - Radial fade masks ensure soft edge falloff.
 * - Placed ONLY in the 5 authorized areas (z-index: 0, content at z-index: 1).
 * - NEVER inside cards, navbar, behind buttons/inputs, or behind body text.
 */

/**
 * 1. Hero Section: Behind the right side of the headline
 */
export function HeroDotAccent({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`dot-accent absolute top-2 right-0 sm:right-6 lg:right-10 w-[280px] sm:w-[380px] lg:w-[460px] h-[160px] sm:h-[190px] z-0 ${className}`}
      style={{
        WebkitMaskImage: 'radial-gradient(circle at 65% 45%, black 25%, transparent 80%)',
        maskImage: 'radial-gradient(circle at 65% 45%, black 25%, transparent 80%)',
      }}
    />
  );
}

/**
 * 2. Between the GitHub connection card and the pipeline cards
 */
export function PipelineDividerDotAccent({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative w-full h-16 sm:h-20 flex items-center justify-center my-1 pointer-events-none ${className}`}
      aria-hidden="true"
    >
      <div
        className="dot-accent w-[280px] sm:w-[380px] lg:w-[440px] h-full z-0"
        style={{
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 85%)',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 85%)',
        }}
      />
    </div>
  );
}

/**
 * 3. Behind the “WHAT ZORQEN CHECKS” heading
 */
export function ChecksHeadingDotAccent({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`dot-accent absolute -top-4 -left-4 sm:-left-6 w-[260px] sm:w-[340px] h-[72px] sm:h-[84px] z-0 ${className}`}
      style={{
        WebkitMaskImage: 'radial-gradient(ellipse at 35% 50%, black 25%, transparent 80%)',
        maskImage: 'radial-gradient(ellipse at 35% 50%, black 25%, transparent 80%)',
      }}
    />
  );
}

/**
 * 4. Bottom-right corner of the page as a subtle accent
 */
export function PageCornerDotAccent({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`dot-accent absolute bottom-0 right-0 w-[240px] sm:w-[320px] lg:w-[380px] h-[240px] sm:h-[320px] lg:h-[380px] z-0 ${className}`}
      style={{
        WebkitMaskImage: 'radial-gradient(circle at 100% 100%, black 25%, transparent 85%)',
        maskImage: 'radial-gradient(circle at 100% 100%, black 25%, transparent 85%)',
      }}
    />
  );
}

/**
 * 5. Behind the empty-state illustration on Repositories
 */
export function EmptyStateIllustrationDotAccent({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`dot-accent absolute -inset-6 sm:-inset-8 rounded-full z-0 ${className}`}
      style={{
        WebkitMaskImage: 'radial-gradient(circle at center, black 35%, transparent 100%)',
        maskImage: 'radial-gradient(circle at center, black 35%, transparent 100%)',
      }}
    />
  );
}
