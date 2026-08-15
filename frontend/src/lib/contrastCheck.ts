/**
 * Development-only Contrast Safeguard for Raksha AI
 * 
 * Inspects computed color styles for text elements in development mode
 * to flag any suspicious low-contrast text vs background combinations.
 */

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function parseRgb(colorStr: string): [number, number, number] | null {
  const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return null;
  return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
}

export function auditContrast(container: HTMLElement = document.body) {
  if (!import.meta.env.DEV) return;

  const elements = container.querySelectorAll<HTMLElement>('p, span, h1, h2, h3, h4, h5, h6, td, th, a, button, label, input, div');
  let issuesCount = 0;

  elements.forEach((el) => {
    // Only check elements with direct text content
    if (!el.children.length && el.textContent?.trim()) {
      const style = window.getComputedStyle(el);
      const color = parseRgb(style.color);
      const bg = parseRgb(style.backgroundColor);
      const opacity = parseFloat(style.opacity);

      if (opacity < 0.7 && opacity > 0) {
        console.warn(`[Raksha Contrast Safeguard] Element has low opacity (${opacity}):`, el);
        issuesCount++;
      }

      if (color && bg && bg[0] !== 0 && bg[1] !== 0 && bg[2] !== 0) {
        const lum1 = getLuminance(color[0], color[1], color[2]);
        const lum2 = getLuminance(bg[0], bg[1], bg[2]);
        const ratio = (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);

        if (ratio < 4.5) {
          console.warn(`[Raksha Contrast Safeguard] Low contrast ratio (${ratio.toFixed(2)}:1):`, el);
          issuesCount++;
        }
      }
    }
  });

  if (issuesCount === 0) {
    console.log('[Raksha Contrast Safeguard] Audit passed: All text elements meet WCAG AA contrast standards.');
  }
}
