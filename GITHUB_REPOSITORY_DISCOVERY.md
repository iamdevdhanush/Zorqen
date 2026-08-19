# GitHub Repository Discovery

Debug documentation for the RAKSHA GitHub repository discovery pipeline.

Production (single Cloudflare origin): `https://app.raksha.ai`

## Root Cause

Repositories were "missing" because the frontend **never fetched real GitHub
repositories at all**. After GitHub OAuth completed, `signInGithub` in
`frontend/src/store/WorkspaceContext.tsx` hardcoded the state to a single
demo entry:

```ts
setRepos([DEMO_REPO]); // the hardcoded "secureops/defence-logistics-api"
```

The backend endpoint `GET /api/repositories/github` existed and returned live
GitHub data, but `listGitHubRepos()` in `frontend/src/services/api.ts` was
**never called** anywhere in the frontend. The "one repository" shown in the
UI was the demo fixture, not real GitHub data.

Two secondary backend bugs compounded the issue once the endpoint was wired up:

1. `repos[:50]` truncated the response to the first 50 repositories.
2. `list_repos` used `affiliation=owner,collaborator`, silently excluding
   organization-member repositories the user can access, and only fetched
   pages until a short page (no `Link` header handling).
3. The endpoint returned raw GitHub API dicts (snake_case, nested `owner`)
   instead of the frontend `RepoMeta` contract.

## GitHub API Endpoint

`GET https://api.github.com/user/repos` — the **authenticated** user's
repository list. This is the correct endpoint for OAuth-token discovery because
it returns every repository the token can access:

- private repositories owned by the user
- public repositories owned by the user
- organization repositories the user belongs to / has access to
- collaborator repositories

It is intentionally **not** `GET /users/{username}/repos`, which only reflects
public repos and omits the complete authorized set.

Request parameters used by `backend/github/client.py` `list_repos()`:

```
per_page=100
page=<n>
sort=updated
affiliation=owner,collaborator,organization_member
```

## Pagination

GitHub returns repositories in pages (max `per_page=100`). `list_repos()`
fetches pages until the last one:

1. Fetch `page=1` with `per_page=100`.
2. If the response `Link` header contains `rel="last"`, parse the final page
   number and stop there (no wasted empty request).
3. Otherwise keep fetching until a page returns fewer than `per_page` items or
   an empty array.
4. A hard safety cap of 100 pages (~10,000 repos) prevents runaway loops.

Example: an account with 250 accessible repos produces 3 requests
(`100 + 100 + 50`) and returns all 250.

Verified with a mocked httpx client: 3 pages (`100 + 100 + 37`) → 237
repositories returned, no duplication, no infinite loop.

## Permissions

The OAuth flow requests `repo read:user user:email` (backend
`github/oauth.py`). This is the minimum scope set for read-only repository
assessment:

- `repo` — grants read access to the user's public **and private** repositories,
  including collaborator/org repos the user can see.
- `read:user` — reads the authenticated user's profile.
- `user:email` — reads the user's primary email.

No admin, write, or `delete_repo` scopes are requested. RAKSHA never modifies
repositories without explicit review (branch creation only during approved
remediation).

If an authorized repository is missing, verify the GitHub OAuth App still has
the `repo` scope and that the user's access is visible at the GitHub App
settings → "Developer settings" → the RAKSHA OAuth App.

## Backend Endpoint

`GET /api/repositories/github` (router `backend/routers/api.py`, protected by
JWT via `get_current_user`).

- 400 — user has no stored GitHub access token.
- 401 — GitHub auth failed/expired → reconnect GitHub.
- 403 — GitHub rate limit / permission denied.
- 404 — GitHub resource not found.
- 502 — unexpected backend/GitHub error.

Response body (normalized to the frontend `RepoMeta` contract):

```json
{
  "repositories": [
    {
      "id": "123456",
      "name": "api",
      "fullName": "acme/api",
      "owner": "acme",
      "private": true,
      "language": "Python",
      "defaultBranch": "main",
      "commit": null,
      "htmlUrl": "https://github.com/acme/api",
      "updatedAt": "2026-01-01T00:00:00Z",
      "visibility": "private",
      "permissions": { "pull": true },
      "description": "..." 
    }
  ],
  "total": 250,
  "authenticated_user": "iamdevdhanush"
}
```

`commit` is `null` because the repository *list* endpoint does not include the
HEAD commit sha; the UI renders `—` (dash) instead of crashing. The list is
never truncated, never filtered by ownership, and never ordered arbitrarily —
the full authorized set is returned.

Safe diagnostics are logged server-side only (`[GITHUB] authenticated_user=…`,
`[GITHUB] repositories page=1 count=100`, `[GITHUB] repositories summary
total_repositories=… private_repositories=… public_repositories=…`). No token,
secret, or code is ever logged.

## Frontend Flow

```
GitHub OAuth (existing, unchanged)
        │ access token stored server-side on the user row
        ▼
GET /api/repositories/github   (frontend/src/services/api.ts listGitHubRepos)
        │ normalized RepoMeta[]  (backend, all pages, no truncation)
        ▼
WorkspaceContext.refreshRepos()
        │ setRepos(realRepos)   — called on GitHub sign-in, session restore,
        │                         and every visit to the Repositories page
        ▼
RepositoriesPage (frontend/src/pages/RepositoriesPage.tsx)
        │ availableRepos = repos  (when connected)
        │ optional name/owner/language filter, count shown in header
        ▼
Repository cards — one per authorized repository
```

When NOT connected, the page still shows the reference demo specimens
(`DEMO_REPO`, `CYBER_PORTAL`); demo data is never mixed into the connected
list.

## Security

- GitHub OAuth tokens live **only** server-side (`User.github_access_token` in
  Postgres). They are never sent to the browser.
- `GET /api/repositories/github` requires a valid JWT and returns only
  repository metadata — never `access_token`, `refresh_token`, or
  `client_secret`.
- Repository metadata comes straight from GitHub with the user's own token, so
  a user can only ever discover repositories that token can actually access.
- No hardcoded credentials; GitHub secrets come from Render environment
  variables.

## Verification

Run these against the deployed backend (authenticated browser session or the
app itself):

1. **GitHub OAuth still works** — connect GitHub from the sidebar, authorize.
2. **Authenticated username detected** — banner shows `Connected as @iamdevdhanush`
   and the backend logs `[GITHUB] authenticated_user=iamdevdhanush`.
3. **Backend receives multiple repositories**:
   ```bash
   curl -s -H "Authorization: Bearer <JWT>" \
     https://app.raksha.ai/api/repositories/github
   ```
   `total` and `repositories.length` should match the account's accessible repos.
4. **Pagination** — accounts with >100 repos return all of them; backend logs
   show `page=1 count=100`, `page=2 count=…`, etc.
5. **Frontend renders the full list** — the repositories page shows one card
   per repository; the header count equals the backend `total`.
6. **Repository search** — type a repo name in the filter; only matching cards
   remain; clearing the filter restores all.
7. **Private repositories** — appear for the authenticated user when the `repo`
   scope is granted.
8. **Organization repositories** — appear when the user has access
   (`affiliation` includes `organization_member`).
9. **Assess Repository** — clicking Assess on any card still opens the
   repository detail and runs the existing pipeline.
10. **Loaded Target** — the LOADED TARGET chip still marks the current
    repository.
11. **No stale cache** — re-opening the Repositories page while connected
    refreshes from GitHub automatically.

Expected end state: the repository count shown in RAKSHA equals the number of
repositories the authenticated GitHub account can actually access (GitHub's
`GET /user/repos` response is the source of truth).
