"""RAKSHA — Remediation model"""
from __future__ import annotations
import uuid
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import String, DateTime, Boolean, Text, Integer, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from core.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class RemediationStatus(str, Enum):
    PENDING = "pending"
    GENERATED = "generated"
    APPROVED = "approved"
    BRANCH_CREATED = "branch_created"
    PR_CREATED = "pr_created"
    VERIFYING = "verifying"
    VERIFIED = "verified"
    VERIFICATION_FAILED = "verification_failed"
    REJECTED = "rejected"


class Remediation(Base):
    __tablename__ = "remediations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    finding_id: Mapped[str] = mapped_column(String(36), ForeignKey("findings.id"), unique=True, index=True)

    status: Mapped[str] = mapped_column(String(50), default=RemediationStatus.PENDING)

    # Generated patch
    file_path: Mapped[str] = mapped_column(Text, nullable=True)
    code_before: Mapped[str] = mapped_column(Text, nullable=True)
    code_after: Mapped[str] = mapped_column(Text, nullable=True)
    unified_diff: Mapped[str] = mapped_column(Text, nullable=True)
    explanation: Mapped[str] = mapped_column(Text, nullable=True)
    risks: Mapped[str] = mapped_column(Text, nullable=True)

    # GitHub integration
    branch_name: Mapped[str] = mapped_column(String(255), nullable=True)
    commit_sha: Mapped[str] = mapped_column(String(64), nullable=True)
    pr_number: Mapped[int] = mapped_column(Integer, nullable=True)
    pr_url: Mapped[str] = mapped_column(Text, nullable=True)

    # Verification
    verification_status: Mapped[str] = mapped_column(String(50), nullable=True)
    verification_evidence: Mapped[str] = mapped_column(Text, nullable=True)
    regression_passed: Mapped[bool] = mapped_column(Boolean, nullable=True)
    verified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    finding: Mapped["Finding"] = relationship("Finding", back_populates="remediation")

    def __repr__(self) -> str:
        return f"<Remediation {self.status}>"
