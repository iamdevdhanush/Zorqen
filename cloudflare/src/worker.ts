/**
 * ZORQEN frontend Worker.
 *
 * Cloudflare is responsible ONLY for the ZORQEN frontend (Workers Static
 * Assets from `frontend/dist`). The FastAPI backend runs on Render and is
 * reached directly by the browser via `VITE_API_URL` — this Worker never
 * proxies `/api` requests and contains no container/backend logic.
 *
 * Responsibilities:
 *  - serve static assets with SPA fallback via the ASSETS binding
 *  - add conservative security headers to responses
 *  - return an explicit JSON 404 for `/api/*` and `/health*` so stale
 *    same-origin API calls fail loudly instead of receiving index.html
 *
 * Cache strategy:
 *  - HTML (index.html and SPA fallbacks):
 *      Cache-Control: public, max-age=0, must-revalidate
 *      → Browser always revalidates with Cloudflare on every navigation.
 *        A new deploy immediately serves the latest index.html.
 *
 *  - Hashed assets (JS chunks, CSS, fonts, hashed images in /assets/*):
 *      Cache-Control: public, max-age=31536000, immutable
 *      → Content-addressed — filename changes on every build. Safe to
 *        cache for 1 year. Stale assets are impossible.
 *
 *  - Public static files without a content hash (favicon, logo, robots.txt,
 *    sitemap.xml, icons.svg, googleXXX.html):
 *      Cache-Control: public, max-age=300
 *      → 5-minute browser TTL — short enough to pick up logo/favicon
 *        updates within minutes, long enough to avoid thrashing.
 */

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

const API_PREFIXES = ["/api/", "/health"];

/**
 * Returns true when the pathname is a Vite-hashed asset.
 * Vite places all hashed chunks under /assets/ with filenames like
 * `index-ByMDR_RU.js` or `index-DOXsyH12.css`.
 */
function isHashedAsset(pathname: string): boolean {
  return pathname.startsWith("/assets/");
}

/**
 * Returns true when the response Content-Type is HTML.
 * The ASSETS binding sets this for index.html and the SPA 200-fallback.
 */
function isHtmlResponse(response: Response): boolean {
  const ct = response.headers.get("Content-Type") ?? "";
  return ct.includes("text/html");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // ── Guard: /api/* and /health* must never be served from static assets ──
    if (API_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
      return new Response(
        JSON.stringify({
          error: "api_not_on_cloudflare",
          detail:
            "The ZORQEN API is hosted on Render. Point VITE_API_URL at the Render backend URL.",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...SECURITY_HEADERS },
        },
      );
    }

    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);

    // ── Cache-Control: apply the correct strategy per asset type ──────────
    if (isHashedAsset(url.pathname)) {
      // Vite content-hashed bundles: safe to cache forever (1 year).
      // The hash in the filename is the cache-busting mechanism — when the
      // source changes, Vite emits a different hash and index.html is
      // updated to reference the new filename.
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
    } else if (isHtmlResponse(response)) {
      // HTML (index.html, SPA 200 fallbacks for all deep routes).
      // Always revalidate so a new deploy is immediately visible.
      // max-age=0 means the browser must check with Cloudflare before
      // serving from cache. must-revalidate prevents stale-while-revalidate
      // from serving the old version while fetching the new one.
      headers.set("Cache-Control", "public, max-age=0, must-revalidate");
    } else {
      // Public static files without content hashes: favicon, logo, robots.txt,
      // sitemap.xml, banner.svg, icons.svg, googleXXX.html, 404.html.
      // 5-minute TTL: quick to update, but avoids per-request Cloudflare hits.
      headers.set("Cache-Control", "public, max-age=300");
    }

    // ── Security headers ──────────────────────────────────────────────────
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      headers.set(name, value);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};