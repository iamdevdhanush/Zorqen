"""RAKSHA — GitHub OAuth utilities"""
from __future__ import annotations

import httpx
from typing import Optional
from core.config import settings


GITHUB_OAUTH_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_API_USER = "https://api.github.com/user"

GITHUB_SCOPES = "repo read:user user:email"


def get_oauth_redirect_url(state: str) -> str:
    """Build GitHub OAuth authorization URL."""
    params = {
        "client_id": settings.github_client_id,
        "redirect_uri": settings.github_redirect_uri,
        "scope": GITHUB_SCOPES,
        "state": state,
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return f"{GITHUB_OAUTH_URL}?{query}"


async def exchange_code_for_token(code: str) -> Optional[str]:
    """Exchange OAuth code for access token."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            GITHUB_TOKEN_URL,
            data={
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code": code,
                "redirect_uri": settings.github_redirect_uri,
            },
            headers={"Accept": "application/json"},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("access_token")


async def get_github_user(access_token: str) -> dict:
    """Fetch authenticated GitHub user profile."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            GITHUB_API_USER,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github+json",
            },
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()
