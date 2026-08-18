"""RAKSHA — Assessment model"""
from __future__ import annotations
import uuid
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import String, DateTime, Boolean, Text, Integer, Float, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from core.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class AssessmentStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class AssessmentStep(str, Enum):
    REPOSITORY_CONNECTED = "repository_connected"
    REPOSITORY_INDEXED = "repository_indexed"
    ARCHITECTURE_GENERATED = "architecture_generated"
    SECURITY_SCAN = "security_scan"
    AI_REASONING = "ai_reasoning"
    VALIDATION = "validation"
    FIX_GENERATED = "fix_generated"
    FIX_APPLIED = "fix_applied"
    PATCH_VERIFIED = "patch_verified"


class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    repository_id: Mapped[str] = mapped_column(String(36), ForeignKey("repositories.id"), index=True)

    # Human-readable run number (display id "#A-0241")
    run_number: Mapped[int] = mapped_column(Integer, default=0, index=True)

    # Target
    branch: Mapped[str] = mapped_column(String(255), default="main")
    commit_sha: Mapped[str] = mapped_column(String(64), nullable=True)
    commit_message: Mapped[str] = mapped_column(Text, nullable=True)

    # Status
    status: Mapped[str] = mapped_column(String(50), default=AssessmentStatus.PENDING)
    current_step: Mapped[str] = mapped_column(String(100), nullable=True)
    progress_pct: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[str] = mapped_column(Text, nullable=True)

    # Scores
    security_score: Mapped[float] = mapped_column(Float, nullable=True)
    score_change: Mapped[float] = mapped_column(Float, nullable=True)  # delta from previous

    # Summary counts
    critical_count: Mapped[int] = mapped_column(Integer, default=0)
    high_count: Mapped[int] = mapped_column(Integer, default=0)
    medium_count: Mapped[int] = mapped_column(Integer, default=0)
    low_count: Mapped[int] = mapped_column(Integer, default=0)
    info_count: Mapped[int] = mapped_column(Integer, default=0)
    secrets_count: Mapped[int] = mapped_column(Integer, default=0)
    dependency_count: Mapped[int] = mapped_column(Integer, default=0)

    # Architecture map
    architecture_map: Mapped[dict] = mapped_column(JSON, nullable=True)

    # Timeline steps with timestamps
    timeline: Mapped[list] = mapped_column(JSON, default=list)

    # Rich pipeline log lines [{step, status, timestamp, source, text, tone}]
    pipeline_logs: Mapped[list] = mapped_column(JSON, default=list)

    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    repository: Mapped["Repository"] = relationship("Repository", back_populates="assessments")
    findings: Mapped[list["Finding"]] = relationship("Finding", back_populates="assessment", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Assessment {self.id} {self.status}>"
