"""ZORQEN — RepositorySnapshot model
Time-series snapshots of repository security posture, powering the overview score chart.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Integer, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class SnapshotSource(str):
    BASELINE = "baseline"      # pre-computed historical baseline (seeded)
    SCAN = "scan"              # produced by an assessment pipeline run
    REMEDIATION = "remediation"  # post-fix score point


class RepositorySnapshot(Base):
    __tablename__ = "repository_snapshots"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    repository_id: Mapped[str] = mapped_column(String(36), ForeignKey("repositories.id"), index=True)
    assessment_id: Mapped[str] = mapped_column(String(36), ForeignKey("assessments.id"), nullable=True)

    score: Mapped[float] = mapped_column(Float)
    source: Mapped[str] = mapped_column(String(30), default=SnapshotSource.SCAN)

    critical_count: Mapped[int] = mapped_column(Integer, default=0)
    high_count: Mapped[int] = mapped_column(Integer, default=0)
    medium_count: Mapped[int] = mapped_column(Integer, default=0)
    low_count: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)

    repository: Mapped["Repository"] = relationship("Repository", back_populates="snapshots")

    def __repr__(self) -> str:
        return f"<RepositorySnapshot {self.score} {self.source}>"
