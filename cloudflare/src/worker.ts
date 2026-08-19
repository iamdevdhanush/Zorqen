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
 */

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

const API_PREFIXES = ["/api/", "/health"];

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

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