"""ZORQEN — Finding model"""
from __future__ import annotations
import uuid
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import String, DateTime, Boolean, Text, Integer, Float, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from core.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class Confidence(str, Enum):
    CONFIRMED = "confirmed"
    LIKELY = "likely"
    POSSIBLE = "possible"
    FALSE_POSITIVE = "false_positive"


class FindingStatus(str, Enum):
    OPEN = "open"
    VALIDATING = "validating"
    VALIDATED = "validated"
    FIXING = "fixing"
    FIXED = "fixed"
    DISMISSED = "dismissed"
    FALSE_POSITIVE = "false_positive"


class Finding(Base):
    __tablename__ = "findings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    assessment_id: Mapped[str] = mapped_column(String(36), ForeignKey("assessments.id"), index=True)

    # Classification
    title: Mapped[str] = mapped_column(String(512))
    vulnerability_type: Mapped[str] = mapped_column(String(255))
    severity: Mapped[str] = mapped_column(String(50))
    confidence: Mapped[str] = mapped_column(String(50))
    confidence_pct: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(50), default=FindingStatus.OPEN)

    # Standards
    cwe_id: Mapped[str] = mapped_column(String(20), nullable=True)
    cwe_name: Mapped[str] = mapped_column(String(255), nullable=True)
    owasp_category: Mapped[str] = mapped_column(String(100), nullable=True)

    # Location
    file_path: Mapped[str] = mapped_column(Text, nullable=True)
    line_number: Mapped[int] = mapped_column(Integer, nullable=True)
    line_end: Mapped[int] = mapped_column(Integer, nullable=True)
    code_snippet: Mapped[str] = mapped_column(Text, nullable=True)

    # Stable, deterministic human id (e.g. "F-0001") from the dedup fingerprint
    slug: Mapped[str] = mapped_column(String(64), nullable=True, index=True)
    endpoint: Mapped[str] = mapped_column(String(255), nullable=True)
    language: Mapped[str] = mapped_column(String(50), nullable=True)

    # AI Reasoning
    root_cause: Mapped[str] = mapped_column(Text, nullable=True)
    attack_path: Mapped[list] = mapped_column(JSON, nullable=True)  # list of step strings
    impact: Mapped[str] = mapped_column(Text, nullable=True)
    evidence: Mapped[str] = mapped_column(Text, nullable=True)
    ai_reasoning: Mapped[str] = mapped_column(Text, nullable=True)
    is_exploitable: Mapped[bool] = mapped_column(Boolean, nullable=True)

    # Source tool
    source_tool: Mapped[str] = mapped_column(String(100), nullable=True)  # semgrep, trivy, custom, ai
    rule_id: Mapped[str] = mapped_column(String(255), nullable=True)

    # Extra data
    extra: Mapped[dict] = mapped_column(JSON, default=dict)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    assessment: Mapped["Assessment"] = relationship("Assessment", back_populates="findings")
    validation_result: Mapped["ValidationResult"] = relationship("ValidationResult", back_populates="finding", uselist=False, cascade="all, delete-orphan")
    remediation: Mapped["Remediation"] = relationship("Remediation", back_populates="finding", uselist=False, cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Finding {self.severity} {self.title}>"
