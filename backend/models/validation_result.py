"""ZORQEN — ValidationResult model"""
from __future__ import annotations
import uuid
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import String, DateTime, Boolean, Text, Integer, Float, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from core.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class ValidationStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    REPRODUCED = "reproduced"
    NOT_REPRODUCED = "not_reproduced"
    INCONCLUSIVE = "inconclusive"
    ERROR = "error"


class ValidationResult(Base):
    __tablename__ = "validation_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    finding_id: Mapped[str] = mapped_column(String(36), ForeignKey("findings.id"), unique=True, index=True)

    status: Mapped[str] = mapped_column(String(50), default=ValidationStatus.PENDING)
    sandbox_id: Mapped[str] = mapped_column(String(255), nullable=True)
    confidence_pct: Mapped[int] = mapped_column(Integer, nullable=True)

    # Test details
    test_type: Mapped[str] = mapped_column(String(100), nullable=True)
    test_payload: Mapped[str] = mapped_column(Text, nullable=True)  # redacted safe probe
    http_response_code: Mapped[int] = mapped_column(Integer, nullable=True)
    response_evidence: Mapped[str] = mapped_column(Text, nullable=True)

    # Sandbox info
    sandbox_image: Mapped[str] = mapped_column(String(255), nullable=True)
    sandbox_created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    sandbox_destroyed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    error_message: Mapped[str] = mapped_column(Text, nullable=True)
    raw_output: Mapped[str] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    finding: Mapped["Finding"] = relationship("Finding", back_populates="validation_result")

    def __repr__(self) -> str:
        return f"<ValidationResult {self.status}>"
