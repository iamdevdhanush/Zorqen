"""ZORQEN — Async GitHub API Client"""
from __future__ import annotations

import base64
import re
import httpx
import structlog
from typing import Optional, List, Dict, Any
from core.config import settings

log = structlog.get_logger()


class GitHubClient:
    BASE = "https://api.github.com"

    def __init__(self, access_token: str):
        self.access_token = access_token
        self._headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }

    async def _get(self, path: str, params: Optional[dict] = None) -> Any:
        # follow_redirects=True: GitHub answers renamed/transferred repositories
        # with 301 Moved Permanently (Location points at the canonical resource,
        # e.g. /repositories/{id}). Without redirect following the 301 is raised
        # as an error and every repo endpoint breaks against a renamed repo.
        async with httpx.AsyncClient(base_url=self.BASE, timeout=30, follow_redirects=True) as client:
            resp = await client.get(path, headers=self._headers, params=params)
            resp.raise_for_status()
            return resp.json()

    async def get_user(self) -> dict:
        return await self._get("/user")

    async def list_repos(self, per_page: int = 100) -> List[dict]:
        """Fetch every repository the authenticated user can access.

        Uses the authenticated endpoint GET /user/repos — NOT /users/{login}/repos,
        which only reflects public repos and does not cover the complete set of
        repositories the token can reach (private, collaborator, organization).

        Pagination: page-by-page with per_page=100. The Link header rel="last"
        is honored when present so the final page is detected without a wasted
        request; an empty page is the fallback terminator. A hard page cap
        (100 pages) prevents runaway loops against a misbehaving API.

        `affiliation` explicitly includes owner, collaborator, and
        organization_member repositories so repositories the user is authorized
        to access are never dropped.
        """
        repos: List[dict] = []
        page = 1
        last_page: Optional[int] = None
        async with httpx.AsyncClient(base_url=self.BASE, timeout=30, follow_redirects=True) as client:
            while True:
                params = {
                    "per_page": per_page,
                    "page": page,
                    "sort": "updated",
                    "affiliation": "owner,collaborator,organization_member",
                }
                log.info("[GITHUB] fetching repositories", page=page)
                resp = await client.get("/user/repos", headers=self._headers, params=params)
                resp.raise_for_status()
                page_data = resp.json()
                if not page_data:
                    break
                repos.extend(page_data)
                log.info("[GITHUB] repositories page", page=page, count=len(page_data))

                if last_page is None:
                    match = re.search(
                        r'<[^>]*[?&]page=(\d+)>;\s*rel="last"',
                        resp.headers.get("Link", ""),
                    )
                    if match:
                        last_page = int(match.group(1))

                if last_page is not None and page >= last_page:
                    break
                if len(page_data) < per_page:
                    break
                page += 1
                if page > 100:
                    log.warning("[GITHUB] pagination safety cap reached", page=page)
                    break
        return repos

    @staticmethod
    def normalize_repo(raw: dict, zorqen_id: str | None = None) -> dict:
        """Map a GitHub /user/repos item to the frontend RepoMeta contract.

        Preserves the fields the UI reads (id, name, owner, private, language,
        defaultBranch, commit) plus the full GitHub metadata (fullName, htmlUrl,
        updatedAt, visibility, permissions, description). The list endpoint does
        not include the HEAD commit sha, so `commit` is null and the UI renders
        a dash rather than crashing. No token data is ever included.

        When zorqen_id is provided, it is included as `zorqenId` so the frontend
        can use the ZORQEN internal UUID for database operations (assessments,
        findings) while keeping the GitHub integer ID for navigation.
        """
        owner = (raw.get("owner") or {}).get("login", "")
        result = {
            "id": str(raw.get("id") or ""),
            "name": raw.get("name") or "",
            "fullName": raw.get("full_name") or f"{owner}/{raw.get('name') or ''}",
            "owner": owner,
            "private": bool(raw.get("private")),
            "language": raw.get("language") or "Unknown",
            "defaultBranch": raw.get("default_branch") or "main",
            "commit": None,
            "htmlUrl": raw.get("html_url"),
            "updatedAt": raw.get("updated_at"),
            "visibility": raw.get("visibility"),
            "permissions": raw.get("permissions"),
            "description": raw.get("description"),
        }
        if zorqen_id:
            result["zorqenId"] = zorqen_id
        return result

    async def get_repo(self, owner: str, repo: str) -> dict:
        return await self._get(f"/repos/{owner}/{repo}")

    async def get_languages(self, owner: str, repo: str) -> Dict[str, int]:
        """Return the language byte breakdown from the GitHub languages API."""
        return await self._get(f"/repos/{owner}/{repo}/languages")

    async def list_branches(self, owner: str, repo: str) -> List[dict]:
        return await self._get(f"/repos/{owner}/{repo}/branches", params={"per_page": 100})

    async def list_commits(self, owner: str, repo: str, branch: str = "main", per_page: int = 20) -> List[dict]:
        return await self._get(
            f"/repos/{owner}/{repo}/commits",
            params={"sha": branch, "per_page": per_page},
        )

    async def get_tree(self, owner: str, repo: str, sha: str, recursive: bool = True) -> dict:
        params = {"recursive": "1"} if recursive else {}
        return await self._get(f"/repos/{owner}/{repo}/git/trees/{sha}", params=params)

    async def resolve_commit_sha(self, owner: str, repo: str, ref: str) -> str:
        """Resolve a branch/tag/SHA to the full 40-char commit SHA.

        Raises httpx.HTTPStatusError (404) when the ref does not exist.
        """
        data = await self._get(f"/repos/{owner}/{repo}/commits/{ref}")
        sha = data.get("sha")
        if not sha:
            raise httpx.HTTPStatusError(
                "Commit response missing sha",
                request=None,
                response=None,
            )
        return sha

    async def get_file_content(self, owner: str, repo: str, path: str, ref: str = "main") -> Optional[str]:
        try:
            data = await self._get(f"/repos/{owner}/{repo}/contents/{path}", params={"ref": ref})
            if isinstance(data, dict) and data.get("encoding") == "base64":
                return base64.b64decode(data["content"]).decode("utf-8", errors="replace")
        except httpx.HTTPStatusError:
            return None
        return None

    async def create_branch(self, owner: str, repo: str, branch_name: str, from_sha: str) -> dict:
        async with httpx.AsyncClient(base_url=self.BASE, timeout=30) as client:
            resp = await client.post(
                f"/repos/{owner}/{repo}/git/refs",
                headers=self._headers,
                json={"ref": f"refs/heads/{branch_name}", "sha": from_sha},
            )
            resp.raise_for_status()
            return resp.json()

    async def create_or_update_file(
        self, owner: str, repo: str, path: str, message: str, content: str, branch: str, sha: Optional[str] = None
    ) -> dict:
        payload: Dict[str, Any] = {
            "message": message,
            "content": base64.b64encode(content.encode()).decode(),
            "branch": branch,
        }
        if sha:
            payload["sha"] = sha
        async with httpx.AsyncClient(base_url=self.BASE, timeout=30) as client:
            resp = await client.put(
                f"/repos/{owner}/{repo}/contents/{path}",
                headers=self._headers,
                json=payload,
            )
            resp.raise_for_status()
            return resp.json()

    async def create_pull_request(
        self, owner: str, repo: str, title: str, head: str, base: str, body: str
    ) -> dict:
        async with httpx.AsyncClient(base_url=self.BASE, timeout=30) as client:
            resp = await client.post(
                f"/repos/{owner}/{repo}/pulls",
                headers=self._headers,
                json={"title": title, "head": head, "base": base, "body": body},
            )
            resp.raise_for_status()
            return resp.json()

    async def get_rate_limit(self) -> dict:
        return await self._get("/rate_limit")
