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
from core.security import create_access_token, decode_access_token
from github.oauth import (
    get_oauth_redirect_url,
    exchange_code_for_token,
    get_github_user,
    get_token_scopes,
    missing_required_scopes,
)
from models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])

# In-memory state store (use Redis in production)
_oauth_states: dict[str, str] = {}


def _set_auth_cookie(response: Response, token: str) -> None:
    """Set JWT in secure HttpOnly cookie."""
    # Cookie settings for production security
    secure = not settings.is_development
    samesite = "lax" if settings.is_development else "none"
    response.set_cookie(
        key="raksha_token",
        value=token,
        httponly=True,
        secure=secure,
        samesite=samesite,
        max_age=settings.jwt_expire_hours * 3600,
        path="/",
    )


def _clear_auth_cookie(response: Response) -> None:
    """Clear the auth cookie."""
    response.delete_cookie(key="raksha_token", path="/", secure=not settings.is_development, samesite="lax" if settings.is_development else "none")


@router.get("/github")
async def github_login(request: Request):
    """Redirect user to GitHub OAuth authorization page."""
    if not settings.github_configured:
        raise HTTPException(
            status_code=503,
            detail=(
                "GitHub OAuth is not configured. Set GITHUB_CLIENT_ID and "
                "GITHUB_CLIENT_SECRET to enable sign-in."
            ),
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
    response: Response = None,
    db: AsyncSession = Depends(get_db),
):
    """Handle GitHub OAuth callback, create/update user, issue JWT in secure cookie."""
    if error:
        return RedirectResponse(url=f"{settings.frontend_url}/auth/callback?error={error}")

    if not code or not state:
        return RedirectResponse(url=f"{settings.frontend_url}/auth/callback?error=missing_params")

    if state not in _oauth_states:
        return RedirectResponse(url=f"{settings.frontend_url}/auth/callback?error=invalid_state")
    del _oauth_states[state]

    try:
        access_token = await exchange_code_for_token(code)
        if not access_token:
            return RedirectResponse(url=f"{settings.frontend_url}/auth/callback?error=token_exchange_failed")

        github_user = await get_github_user(access_token)

        # Fail fast when the token was granted with fewer scopes than the
        # application requires — otherwise private-repo scanning fails later
        # with cryptic GitHub 403s mid-assessment.
        granted_scopes = await get_token_scopes(access_token)
        if granted_scopes:  # only enforceable when GitHub reports scopes
            missing = missing_required_scopes(granted_scopes)
            if missing:
                return RedirectResponse(
                    url=(
                        f"{settings.frontend_url}/auth/callback"
                        f"?error=insufficient_scope&missing={','.join(missing)}"
                    )
                )
    except Exception as e:
        return RedirectResponse(url=f"{settings.frontend_url}/auth/callback?error=github_api_error")

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
        )
        user.set_github_token(access_token)
        db.add(user)
    else:
        user.github_login = github_user["login"]
        user.github_name = github_user.get("name")
        user.github_email = github_user.get("email")
        user.github_avatar_url = github_user.get("avatar_url")
        user.set_github_token(access_token)

    await db.commit()
    await db.refresh(user)

    # Issue JWT
    jwt_token = create_access_token(
        {"sub": user.id, "login": user.github_login},
        expires_delta=timedelta(hours=settings.jwt_expire_hours),
    )

    # Redirect to frontend WITHOUT token in URL — token is in secure HttpOnly cookie
    resp = RedirectResponse(url=f"{settings.frontend_url}/auth/callback")
    _set_auth_cookie(resp, jwt_token)
    return resp


@router.post("/logout")
async def logout(response: Response):
    """Clear authentication cookie."""
    _clear_auth_cookie(response)
    return {"ok": True, "message": "Logged out"}


@router.get("/token")
async def get_token_from_cookie(request: Request, response: Response):
    """Get JWT from secure cookie for frontend to store in localStorage.
    
    Frontend calls this after OAuth redirect to retrieve the token.
    """
    token = request.cookies.get("raksha_token")
    if not token:
        raise HTTPException(status_code=401, detail="No authentication cookie")
    # Validate token
    payload = decode_access_token(token)
    if not payload:
        _clear_auth_cookie(response)
        raise HTTPException(status_code=401, detail="Invalid token")
    return {"token": token}


@router.get("/me")
async def get_current_user_info(request: Request, db: AsyncSession = Depends(get_db)):
    """Return current authenticated user info."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        # Try cookie as fallback
        token = request.cookies.get("raksha_token")
        if not token:
            raise HTTPException(status_code=401, detail="Not authenticated")
    else:
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
    }
