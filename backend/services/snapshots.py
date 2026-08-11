"""RAKSHA — Snapshots service: score time-series + recording"""
from __future__ import annotations

from typing import Optional

from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from models.repository import Repository
from models.snapshot import RepositorySnapshot, SnapshotSource

MAX_POINTS = 60


async def score_history(db: AsyncSession, repository_id: str, *, limit: int = MAX_POINTS) -> list:
    """Score points ordered oldest→newest for the overview chart."""
    result = await db.execute(
        select(RepositorySnapshot)
        .where(RepositorySnapshot.repository_id == repository_id)
        .order_by(desc(RepositorySnapshot.created_at))
        .limit(limit)
    )
    points = list(reversed(result.scalars().all()))
    return [
        {
            "date": p.created_at.isoformat() if p.created_at else None,
            "score": p.score,
            "source": p.source,
        }
        for p in points
    ]


async def record_snapshot(
    db: AsyncSession,
    *,
    repository_id: str,
    score: float,
    source: str = SnapshotSource.SCAN,
    assessment_id: Optional[str] = None,
    critical: int = 0,
    high: int = 0,
    medium: int = 0,
    low: int = 0,
) -> RepositorySnapshot:
    snapshot = RepositorySnapshot(
        repository_id=repository_id,
        assessment_id=assessment_id,
        score=score,
        source=source,
        critical_count=critical,
        high_count=high,
        medium_count=medium,
        low_count=low,
    )
    db.add(snapshot)
    await db.commit()
    await db.refresh(snapshot)
    return snapshot
