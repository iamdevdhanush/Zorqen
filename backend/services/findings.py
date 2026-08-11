"""RAKSHA — Findings service: search, filter, paginate across the user's repos"""
from __future__ import annotations

from typing import List, Optional, Tuple

from sqlalchemy import select, func, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.assessment import Assessment
from models.finding import Finding
from models.repository import Repository
from models.user import User
from services.serializers import finding_contract
from services.scoring import severity_counts

# UI finding statuses -> set of DB statuses
_UI_STATUS = {
    "OPEN": {"open"},
    "REVIEW": {"validating", "validated"},
    "FIX_PENDING": {"fixing"},
    "FIX_APPLIED": {"fixing", "fixed"},
    "VERIFIED": {"fixed", "verified"},
    "DISMISSED": {"dismissed", "false_positive"},
}

_SORTABLE = {
    "severity": Finding.severity,
    "confidence": Finding.confidence_pct,
    "file": Finding.file_path,
    "line": Finding.line_number,
    "created": Finding.created_at,
}


async def search_findings(
    db: AsyncSession,
    user: User,
    *,
    q: Optional[str] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    cwe: Optional[str] = None,
    source_tool: Optional[str] = None,
    assessment_id: Optional[str] = None,
    sort: str = "severity",
    order: str = "desc",
    page: int = 1,
    page_size: int = 50,
) -> dict:
    """Search/filter findings scoped to the user's repositories with pagination."""
    base = (
        select(Finding)
        .options(
            selectinload(Finding.validation_result),
            selectinload(Finding.remediation),
        )
        .join(Assessment, Finding.assessment_id == Assessment.id)
        .join(Repository, Assessment.repository_id == Repository.id)
        .where(Repository.user_id == user.id)
    )

    if assessment_id:
        base = base.where(Finding.assessment_id == assessment_id)
    if severity:
        base = base.where(Finding.severity == severity.lower())
    if status:
        db_statuses = _UI_STATUS.get(status.upper())
        if db_statuses:
            base = base.where(Finding.status.in_(db_statuses))
    if cwe:
        base = base.where(Finding.cwe_id == cwe.upper())
    if source_tool:
        base = base.where(Finding.source_tool == source_tool.lower())
    if q:
        like = f"%{q.strip()}%"
        base = base.where(
            or_(
                Finding.title.ilike(like),
                Finding.file_path.ilike(like),
                Finding.cwe_id.ilike(like),
                Finding.vulnerability_type.ilike(like),
                Finding.endpoint.ilike(like),
            )
        )

    # count (without pagination)
    sub = base.subquery()
    total = (await db.execute(select(func.count()).select_from(sub))).scalar() or 0

    # severity counts across the filtered set
    sev_rows = await db.execute(
        select(sub.c.severity, func.count()).select_from(sub).group_by(sub.c.severity)
    )
    sev_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
    for sev, count in sev_rows.all():
        if sev in sev_counts:
            sev_counts[sev] = count

    sort_col = _SORTABLE.get(sort, Finding.severity)
    order_fn = desc if order != "asc" else lambda c: c.asc()
    page = max(1, page)
    page_size = min(max(1, page_size), 200)
    stmt = base.order_by(order_fn(sort_col)).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    findings: List[Finding] = list(result.scalars().all())

    return {
        "findings": [finding_contract(f) for f in findings],
        "total": total,
        "page": page,
        "page_size": page_size,
        "counts": sev_counts,
        "pages": (total + page_size - 1) // page_size,
    }


async def find_by_slug(db: AsyncSession, user: User, slug: str) -> Optional[Finding]:
    result = await db.execute(
        select(Finding)
        .options(
            selectinload(Finding.validation_result),
            selectinload(Finding.remediation),
        )
        .join(Assessment, Finding.assessment_id == Assessment.id)
        .join(Repository, Assessment.repository_id == Repository.id)
        .where(Repository.user_id == user.id, Finding.slug == slug)
    )
    return result.scalar_one_or_none()
