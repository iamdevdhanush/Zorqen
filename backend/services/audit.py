"""ZORQEN — Audit log helper (activity feed + compliance trail)"""
from __future__ import annotations

from typing import Optional

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from models.audit_log import AuditLog

log = structlog.get_logger()


async def record_audit(
    db: AsyncSession,
    *,
    user_id: Optional[str],
    action: str,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    detail: Optional[str] = None,
    extra: Optional[dict] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> Optional[AuditLog]:
    """Persist an audit entry. Never raises — failures are logged only."""
    try:
        entry = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            detail=detail,
            extra=extra or {},
            ip_address=ip_address,
            user_agent=user_agent,
        )
        db.add(entry)
        await db.commit()
        return entry
    except Exception as e:  # pragma: no cover - defensive
        log.warning("audit_record_failed", action=action, error=str(e))
        return None
