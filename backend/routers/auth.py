"""RAKSHA — Authentication Router (GitHub OAuth)"""
from __future__ import annotations

import secrets
from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.config import settings
from core.database import get_db
from core.security import create_access_token
from github.oauth import get_oauth_redirect_url, exchange_code_for_token, get_github_user
from models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])

# In-memory state store (use Redis in production)
_oauth_states: dict[str, str] = {}


@router.get("/github")
async def github_login(request: Request):
    """Redirect user to GitHub OAuth authorization page."""
    if not settings.github_configured:
        raise HTTPException(
            status_code=503,
            detail="GitHub OAuth is not configured. Use Demo Mode instead.",
        )
    state = secrets.token_urlsafe(32)
    _oauth_states[state] = "pending"
    redirect_url = get_oauth_redirect_url(state)
    return RedirectResponse(url=redirect_url)


@router.get("/github/callback")
async def github_callback(
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Handle GitHub OAuth callback, create/update user, issue JWT."""
    if error:
        return RedirectResponse(url=f"{settings.frontend_url}?error={error}")

    if not code or not state:
        return RedirectResponse(url=f"{settings.frontend_url}?error=missing_params")

    if state not in _oauth_states:
        return RedirectResponse(url=f"{settings.frontend_url}?error=invalid_state")
    del _oauth_states[state]

    try:
        access_token = await exchange_code_for_token(code)
        if not access_token:
            return RedirectResponse(url=f"{settings.frontend_url}?error=token_exchange_failed")

        github_user = await get_github_user(access_token)
    except Exception as e:
        return RedirectResponse(url=f"{settings.frontend_url}?error=github_api_error")

    # Create or update user
    result = await db.execute(select(User).where(User.github_id == github_user["id"]))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            github_id=github_user["id"],
            github_login=github_user["login"],
            github_name=github_user.get("name"),
            github_email=github_user.get("email"),
            github_avatar_url=github_user.get("avatar_url"),
            github_access_token=access_token,
        )
        db.add(user)
    else:
        user.github_login = github_user["login"]
        user.github_name = github_user.get("name")
        user.github_email = github_user.get("email")
        user.github_avatar_url = github_user.get("avatar_url")
        user.github_access_token = access_token

    await db.commit()
    await db.refresh(user)

    # Issue JWT
    jwt_token = create_access_token(
        {"sub": user.id, "login": user.github_login},
        expires_delta=timedelta(hours=settings.jwt_expire_hours),
    )

    # Redirect to frontend with token
    return RedirectResponse(
        url=f"{settings.frontend_url}/auth/callback?token={jwt_token}"
    )


@router.post("/demo-login")
async def demo_login(db: AsyncSession = Depends(get_db)):
    """Create/retrieve a demo user and issue a JWT. No GitHub required."""
    result = await db.execute(select(User).where(User.github_login == "demo-user"))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            github_id=999999,
            github_login="demo-user",
            github_name="RAKSHA Demo",
            github_email="demo@raksha.ai",
            github_avatar_url="",
            is_demo=True,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    jwt_token = create_access_token(
        {"sub": user.id, "login": user.github_login, "is_demo": True},
    )
    return {"access_token": jwt_token, "token_type": "bearer", "is_demo": True}


@router.get("/me")
async def get_current_user_info(request: Request, db: AsyncSession = Depends(get_db)):
    """Return current authenticated user info."""
    from core.security import decode_access_token
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth[7:]
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = await db.get(User, payload["sub"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": user.id,
        "github_login": user.github_login,
        "github_name": user.github_name,
        "github_email": user.github_email,
        "github_avatar_url": user.github_avatar_url,
        "is_demo": user.is_demo,
    }
