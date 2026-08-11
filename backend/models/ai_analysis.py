"""RAKSHA — AIAnalysis model
Tracks AI/LLM usage per assessment & finding for billing transparency and cost control.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Integer, Float, Boolean, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class AIAnalysis(Base):
    __tablename__ = "ai_analyses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    assessment_id: Mapped[str] = mapped_column(String(36), ForeignKey("assessments.id"), nullable=True, index=True)
    finding_id: Mapped[str] = mapped_column(String(36), ForeignKey("findings.id"), nullable=True)

    kind: Mapped[str] = mapped_column(String(50), default="reasoning")  # reasoning | copilot | fix | architecture
    provider: Mapped[str] = mapped_column(String(30), default="groq")
    model: Mapped[str] = mapped_column(String(100), nullable=True)

    prompt_tokens: Mapped[int] = mapped_column(Integer, default=0)
    completion_tokens: Mapped[int] = mapped_column(Integer, default=0)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    cost_estimate: Mapped[float] = mapped_column(Float, nullable=True)

    success: Mapped[bool] = mapped_column(Boolean, default=True)
    error_message: Mapped[str] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    def __repr__(self) -> str:
        return f"<AIAnalysis {self.kind} {self.provider} {self.prompt_tokens}+{self.completion_tokens}>"
