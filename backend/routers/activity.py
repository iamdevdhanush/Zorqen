"""ZORQEN — Activity feed router (console contract)"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models.user import User
from routers.deps import get_current_user
from services.activity import list_activity

router = APIRouter(prefix="/activity", tags=["activity"])


@router.get("")
async def get_activity(
    limit: int = 30,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Recent activity feed items (time, text, tone)."""
    return {"activity": await list_activity(db, user_id=current_user.id, limit=limit)}
