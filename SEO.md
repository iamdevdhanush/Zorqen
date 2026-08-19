# ZORQEN — SEO Guide

Production site: **https://app.zorqen.ai**

ZORQEN is an SPA (React + Vite). Public SEO pages are statically built and client-rendered, so
technical SEO is handled through route-level metadata, static robots/sitemap, and a hard-404
strategy. This document is the source of truth for the marketing pages and their upkeep.

## 1. Objective

Rank ZORQEN for the primary and secondary intents below **without redesigning the approved UI**.
The console's visual language (layout, colors, typography, hard shadows, lime accent, protocol-tag
labels, mono type) is reused verbatim by the public pages so marketing feels like the product.

### Primary intents
| Intent | Target page |
| --- | --- |
| "AI code security" | `/ai-code-security` |
| "AI security scanner" | `/ai-vulnerability-scanner` |
| "AI generated code security / is AI-generated code secure?" | `/ai-generated-code-security` |
| "AI application security" | `/ai-application-security` |
| "vibe-coded app security" | `/vibe-coded-app-security` |
| ZORQEN product / how it works | `/docs` |

### Secondary / informational
- AI code review security, AI security scanner for GitHub repos, vulnerabilities in AI-written
  code, security of LLM-generated code, AI appsec platform.

## 2. Route table — indexability

| Route | Visibility | Why |
| --- | --- | --- |
| `/ai-code-security` | **index, follow** | Flagship marketing page (canonical home for marketing). |
| `/ai-vulnerability-scanner` | **index, follow** | Scanner intent. |
| `/ai-generated-code-security` | **index, follow** | Informational intent. |
| `/ai-application-security` | **index, follow** | Informational intent. |
| `/vibe-coded-app-security` | **index, follow** | Trending-intent page. |
| `/docs` | **index, follow** | Product documentation. |
| `/` (console) | **noindex, nofollow** | Private authenticated workspace. |
| `/repos`, `/repos/:id` | **noindex** + robots Disallow | Private workspace. |
| `/assessments`, `/assessments/:id` | **noindex** + robots Disallow | Private workspace. |
| `/findings`, `/findings/:id` | **noindex** + robots Disallow | Private workspace. |
| `/remediation/:id`, `/verification/:id` | **noindex** + robots Disallow | Private workspace. |
| `/settings` | **noindex** + robots Disallow | Private workspace. |
| `/auth/*` | **noindex** + robots Disallow | OAuth flow. |
| anything unknown | Hard 404 via `404.html` (Vercel) / client-side branded 404 | Invalid URLs must not look like valid pages. |

Implementation: `frontend/public/robots.txt` blocks the private paths; every public page renders a
`<Seo>` component; the console shell (`AppShell`) renders `<Seo noIndex>` so all private routes are
robot-noindex regardless of `robots.txt` (robots.txt is not a security boundary).

## 3. Technical SEO

- **Canonical URLs**: `<Seo canonicalPath>` builds `origin + path` and strips the trailing slash.
  Update `index.html`'s static canonical + sitemap + JSON-LD if the production domain ever changes.
- **`index.html` head** (applies to every route before the client renders): title, meta description,
  author, `theme-color #C5F82A`, default robots, canonical, `favicon.svg` + `apple-touch-icon`,
  Open Graph defaults, Twitter Card, font preconnects, and a `@graph` JSON-LD
  (Organization + WebSite).
- **Route-level**: each public page sets its own `<title>`, description, robots, canonical, OG/Twitter,
  and page-specific JSON-LD (`WebPage`, `SoftwareApplication`, `Article`, `FAQPage`) via `Seo.tsx`
  (upserts existing tags, manages `script[data-jsonld]` nodes).
- **Sitemap**: `frontend/public/sitemap.xml` — only the 6 public URLs.
- **robots.txt**: `frontend/public/robots.txt` — allows `/`, disallows private paths, declares the sitemap.
- **Hard 404s**: `frontend/vercel.json` rewrites only the known SPA routes to `index.html`. Unknown
  URLs resolve to `frontend/public/404.html` with a 404 status (noindex, links home). In-app unknown
  routes hit `frontend/src/pages/NotFoundPage.tsx` (soft 404, noindex, branded).

### Known limitation (documented, not engineered around)
Public pages are client-rendered. Google renders JS, so pages are indexable, but the initial HTML
contains no per-route content. A future SSR/prerender step (e.g. `react-snap` or a build-time render)
would improve time-to-content and non-JS crawlers. Do **not** remove `robots.txt`/`noindex` guards
until that exists.

## 4. Content rules (enforced)

- No fake numbers, ratings, statistics, or testimonials.
- No claims beyond what the product does: static analysis (Semgrep OWASP Top Ten + `p/secrets`
  rulesets), custom checks, secret detection, dependency manifest review, repo intel, Groq AI
  reasoning, confidence scoring, validation state, and generated patch diffs.
- The VALIDATE stage ("sandbox probes") mirrors the approved console self-description
  ("scans run in isolated sandboxes"); the console is a client-side demo and the backend runs a
  single worker. Revisit the marketing copy if production behavior diverges.
- Every page links to the console (`/`) and to sibling public pages (internal linking + crawl paths).

## 5. Search Console & Bing steps (post-deploy)

1. Verify `https://app.zorqen.ai` in Google Search Console (DNS or HTML-tag method) and
   Bing Webmaster Tools.
2. Submit `https://app.zorqen.ai/sitemap.xml`.
3. Submit the URL prefix in each GSC property for the 6 public pages individually.
4. After 1–2 weeks, run the URL Inspection Tool on `/ai-code-security` and request indexing.
5. Monitor "Pages → not indexed → noindexed" to confirm only private routes are excluded.

## 6. Growth plan (future content)

- `/how-zorqen-detects-secrets` — the secret detection ruleset and history scan.
- `/owasp-top-ten-ai-code-checker` — OWASP mapping content.
- `/saas-ai-code-security` — SaaS/AI products angle.
- `/security-review-checklist-ai-code` — downloadable checklist (link magnet).
- Blog-style articles at `/docs/guides/*` using the same `Article` JSON-LD pattern.

## 7. Maintenance checklist

- [ ] New public route? Add lazy route in `src/App.tsx`, `<Seo>` on the page, sitemap entry,
      `vercel.json` rewrite, and a `robots.txt` allow (default allows).
- [ ] New console route? It inherits `AppShell`'s `noIndex`; add a `robots.txt` Disallow.
- [ ] Production domain changed? Update `index.html`, sitemap, JSON-LD, and `Seo.tsx` base.
- [ ] After any public page content change: `npm run build`, `npm run lint`, re-submit URL in GSC.
