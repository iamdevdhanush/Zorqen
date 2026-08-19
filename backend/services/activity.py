"""ZORQEN — Activity feed service: audit log → console activity contract"""
from __future__ import annotations

from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from models.audit_log import AuditLog
from services.serializers import activity_contract


async def list_activity(db: AsyncSession, *, user_id=None, limit: int = 30) -> list:
    stmt = select(AuditLog).order_by(desc(AuditLog.created_at)).limit(limit)
    if user_id:
        stmt = stmt.where(AuditLog.user_id == user_id)
    result = await db.execute(stmt)
    entries = result.scalars().all()
    return [activity_contract(e) for e in entries]
