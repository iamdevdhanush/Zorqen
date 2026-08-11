"""RAKSHA — Async GitHub API Client"""
from __future__ import annotations

import base64
import httpx
from typing import Optional, List, Dict, Any
from core.config import settings


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
        async with httpx.AsyncClient(base_url=self.BASE, timeout=30) as client:
            resp = await client.get(path, headers=self._headers, params=params)
            resp.raise_for_status()
            return resp.json()

    async def get_user(self) -> dict:
        return await self._get("/user")

    async def list_repos(self, per_page: int = 100) -> List[dict]:
        repos = []
        page = 1
        while True:
            page_data = await self._get(
                "/user/repos",
                params={"per_page": per_page, "page": page, "sort": "updated", "affiliation": "owner,collaborator"},
            )
            if not page_data:
                break
            repos.extend(page_data)
            if len(page_data) < per_page:
                break
            page += 1
        return repos

    async def get_repo(self, owner: str, repo: str) -> dict:
        return await self._get(f"/repos/{owner}/{repo}")

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
