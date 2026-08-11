"""RAKSHA — Assessment service: run creation, resolution, contract building"""
from __future__ import annotations

from typing import Optional

import structlog
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.assessment import Assessment, AssessmentStatus
from models.finding import Finding
from models.repository import Repository
from models.user import User
from services.serializers import run_contract

log = structlog.get_logger()


def display_to_run_number(ref: str) -> Optional[int]:
    """Map a console route ref like '0241' or 'A-0241' to a run_number."""
    candidate = ref
    if candidate.upper().startswith("A-"):
        candidate = candidate[2:]
    try:
        return int(candidate)
    except ValueError:
        return None


async def resolve_assessment(db: AsyncSession, ref: str) -> Optional[Assessment]:
    """Resolve a console ref (UUID or '#A-xxxx' style) to an Assessment row."""
    cleaned = ref.lstrip("#")
    run_number = display_to_run_number(cleaned)
    if run_number is not None:
        result = await db.execute(
            select(Assessment).where(Assessment.run_number == run_number)
        )
        return result.scalar_one_or_none()
    return await db.get(Assessment, cleaned)


async def get_next_run_number(db: AsyncSession) -> int:
    result = await db.execute(select(Assessment).order_by(desc(Assessment.run_number)).limit(1))
    last = result.scalar_one_or_none()
    return (last.run_number if last and last.run_number else 240) + 1


async def create_assessment(
    db: AsyncSession,
    repository: Repository,
    *,
    branch: str = "main",
    commit_sha: Optional[str] = None,
    user: Optional[User] = None,
) -> Assessment:
    """Create a new RUNNING assessment with the next run number."""
    assessment = Assessment(
        repository_id=repository.id,
        branch=branch or repository.default_branch or "main",
        commit_sha=commit_sha,
        status=AssessmentStatus.RUNNING,
        run_number=await get_next_run_number(db),
        pipeline_logs=[{
            "step": "index",
            "status": "running",
            "timestamp": None,
            "source": "raksha",
            "text": f"assessment queued · {repository.name}@{branch or 'main'}",
            "tone": "info",
        }],
    )
    db.add(assessment)
    await db.commit()
    await db.refresh(assessment)
    return assessment


async def list_user_runs(db: AsyncSession, user: User, *, limit: int = 50) -> list:
    """All assessments across the user's repositories, newest first."""
    result = await db.execute(
        select(Assessment, Repository)
        .join(Repository, Assessment.repository_id == Repository.id)
        .where(Repository.user_id == user.id)
        .order_by(desc(Assessment.created_at))
        .limit(limit)
    )
    rows = result.all()
    runs = []
    for assessment, repo in rows:
        findings = await _findings_for(db, assessment.id)
        runs.append(run_contract(assessment, repo, findings))
    return runs


async def get_run(db: AsyncSession, assessment: Assessment, *, with_findings: bool = True) -> dict:
    repo = await db.get(Repository, assessment.repository_id)
    findings = await _findings_for(db, assessment.id) if with_findings else []
    return run_contract(assessment, repo, findings)


async def _findings_for(db: AsyncSession, assessment_id: str) -> list:
    result = await db.execute(
        select(Finding)
        .options(
            selectinload(Finding.validation_result),
            selectinload(Finding.remediation),
        )
        .where(Finding.assessment_id == assessment_id)
        .order_by(desc(Finding.severity))
    )
    return list(result.scalars().all())
