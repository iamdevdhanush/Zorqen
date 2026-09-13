/**
 * Premium Editorial Dot Accent Components
 * Inspired by Nothing, Linear, and Luxury SaaS aesthetics.
 *
 * Rules:
 * - Uses black dots only (#111111) at 16% opacity via .dot-accent class.
 * - Dot size: 2px desktop, 1.5px mobile.
 * - Grid spacing: 16px desktop, 12px mobile.
 * - Radial fade masks ensure soft edge falloff.
 * - Placed ONLY in the authorized areas (z-index: 0, content at z-index: 1).
 * - NEVER inside cards, navbar, behind buttons/inputs, or behind body text.
 */

/**
 * Hero Cluster 1 — Large cluster behind the upper-right area of the hero.
 * Desktop only; disappears gracefully on mobile.
 */
export function HeroDotUpperRight({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`dot-accent hidden md:block absolute top-0 right-[-16px] w-[420px] lg:w-[560px] h-[280px] lg:h-[360px] z-0 pointer-events-none select-none ${className}`}
      style={{
        WebkitMaskImage: 'radial-gradient(ellipse at 75% 30%, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 38%, transparent 72%)',
        maskImage: 'radial-gradient(ellipse at 75% 30%, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 38%, transparent 72%)',
      }}
    />
  );
}

/**
 * Hero Cluster 2 — Small faded cluster behind the GitHub connection card.
 * Stays behind the card; never overlaps the card interior.
 */
export function HeroDotGithubCard({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`dot-accent hidden sm:block absolute left-[30%] w-[260px] sm:w-[320px] lg:w-[380px] h-[80px] z-0 pointer-events-none select-none ${className}`}
      style={{
        WebkitMaskImage: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.55) 0%, transparent 75%)',
        maskImage: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.55) 0%, transparent 75%)',
      }}
    />
  );
}

/**
 * Hero Cluster 3 — Soft faded cluster near the transition into the next section.
 * Signals visual breathing room before the pipeline cards.
 */
export function HeroDotTransition({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`dot-accent hidden sm:block w-[200px] sm:w-[280px] lg:w-[340px] h-[48px] sm:h-[56px] z-0 pointer-events-none select-none mx-auto sm:mx-0 ${className}`}
      style={{
        WebkitMaskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,0.40) 0%, transparent 80%)',
        maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,0.40) 0%, transparent 80%)',
      }}
    />
  );
}

/**
 * Legacy: Behind the "WHAT ZORQEN CHECKS" heading
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
 * Bottom-right corner of the page as a subtle accent
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
 * Behind the empty-state illustration on Repositories
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

/**
 * Faint Dotted Texture (6–8% Opacity) — Top Right Corner
 */
export function HeroCornerDotsTopRight({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`hero-corner-dots absolute top-0 right-0 w-[280px] sm:w-[380px] lg:w-[480px] h-[240px] sm:h-[320px] lg:h-[400px] z-0 pointer-events-none select-none ${className}`}
      style={{
        WebkitMaskImage: 'radial-gradient(ellipse at 100% 0%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 38%, transparent 72%)',
        maskImage: 'radial-gradient(ellipse at 100% 0%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 38%, transparent 72%)',
      }}
    />
  );
}

/**
 * Faint Dotted Texture (6–8% Opacity) — Bottom Left Corner
 */
export function HeroCornerDotsBottomLeft({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`hero-corner-dots absolute bottom-0 left-0 w-[240px] sm:w-[320px] lg:w-[420px] h-[200px] sm:h-[260px] lg:h-[340px] z-0 pointer-events-none select-none ${className}`}
      style={{
        WebkitMaskImage: 'radial-gradient(ellipse at 0% 100%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 38%, transparent 72%)',
        maskImage: 'radial-gradient(ellipse at 0% 100%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 38%, transparent 72%)',
      }}
    />
  );
}

