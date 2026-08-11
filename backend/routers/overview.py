"""RAKSHA — Overview dashboard router (console contract)"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models.user import User
from routers.deps import get_current_user
from services.overview import overview as build_overview

router = APIRouter(prefix="/overview", tags=["overview"])


@router.get("")
async def get_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Dashboard aggregate: health, score series, top issues, recent activity."""
    return await build_overview(db, current_user)
