"""ZORQEN — Assessment service: run creation, resolution, contract building"""
from __future__ import annotations

import asyncio
from typing import Optional, Tuple

import structlog
from sqlalchemy import select, desc
from sqlalchemy.exc import IntegrityError, OperationalError
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
    """Resolve a console ref (UUID or '#A-xxxx' style) to an Assessment row.

    Uses ORDER BY created_at DESC + LIMIT 1 when resolving by run_number so that
    even if duplicate run_number rows exist (pre-unique-constraint data), exactly
    one row is returned deterministically (the most recent).
    """
    cleaned = ref.lstrip("#")
    run_number = display_to_run_number(cleaned)
    if run_number is not None:
        result = await db.execute(
            select(Assessment)
            .where(Assessment.run_number == run_number)
            .order_by(desc(Assessment.created_at))
            .limit(1)
        )
        return result.scalar_one_or_none()
    return await db.get(Assessment, cleaned)


async def get_next_run_number(db: AsyncSession, *, retries: int = 5) -> int:
    """Return the next unused run_number, retrying on IntegrityError (race-safe).

    The unique index on run_number catches collisions; on conflict we simply
    re-read the current max and try again.
    """
    for attempt in range(retries):
        result = await db.execute(
            select(Assessment).order_by(desc(Assessment.run_number)).limit(1)
        )
        last = result.scalar_one_or_none()
        candidate = (last.run_number if last and last.run_number else 0) + 1
        return candidate  # caller will handle IntegrityError on insert
    raise RuntimeError(f"Failed to allocate run_number after {retries} attempts")


async def _find_active_assessment(
    db: AsyncSession, repository_id: str
) -> Optional[Assessment]:
    """Return the newest PENDING/RUNNING assessment for a repository, if any."""
    result = await db.execute(
        select(Assessment).where(
            Assessment.repository_id == repository_id,
            Assessment.status.in_([AssessmentStatus.PENDING, AssessmentStatus.RUNNING]),
        ).order_by(desc(Assessment.created_at)).limit(1)
    )
    return result.scalar_one_or_none()


def _is_run_number_conflict(exc: IntegrityError) -> bool:
    """True when the IntegrityError is the run_number uniqueness violation.

    Distinguishes the run_number unique index from the one-active-per-repository
    partial unique index so the caller can decide whether to re-allocate the
    run number or return an existing active assessment.
    """
    orig = exc.orig
    # PostgreSQL: the constraint name is reported via exc.orig.diag.
    diag = getattr(orig, "diag", None)
    if diag is not None:
        constraint = getattr(diag, "constraint_name", None)
        if constraint:
            return "run_number" in str(constraint)
    # SQLite: the failure message names the unique column or index.
    message = str(getattr(orig, "message", orig) or exc)
    return "run_number" in message


async def create_assessment(
    db: AsyncSession,
    repository: Repository,
    *,
    branch: str = "main",
    commit_sha: Optional[str] = None,
    user: Optional[User] = None,
) -> Tuple[Assessment, bool]:
    """Create a new assessment with the next run number.

    Returns ``(assessment, created)`` where ``created`` is True only when this
    call actually inserted a brand-new row. When an active (PENDING or RUNNING)
    assessment already exists for this repository — including one created by a
    concurrent request that won the race — the existing row is returned with
    ``created=False``.

    Idempotency is enforced at two levels:

    1. Application level: an active assessment is looked up first and returned.
    2. Database level: a partial unique index on ``repository_id`` WHERE the
       status is PENDING/RUNNING rejects a second concurrent INSERT. That
       IntegrityError is caught here and converted into a "return existing"
       result — never a duplicate row and never a duplicate worker.
    """
    existing = await _find_active_assessment(db, repository.id)
    if existing:
        log.info(
            "Returning existing active assessment",
            assessment_id=existing.id,
            run_number=existing.run_number,
            repository_id=repository.id,
            status=existing.status,
            existing=True,
            worker_started=False,
        )
        return existing, False

    def _new_assessment() -> Assessment:
        return Assessment(
            repository_id=repository.id,
            branch=branch or repository.default_branch or "main",
            commit_sha=commit_sha,
            status=AssessmentStatus.PENDING,
            run_number=0,  # allocated below via get_next_run_number
            pipeline_logs=[{
                "step": "index",
                "status": "pending",
                "timestamp": None,
                "source": "zorqen",
                "text": f"assessment queued · {repository.name}@{branch or 'main'}",
                "tone": "info",
            }],
        )

    assessment = _new_assessment()
    for attempt in range(5):
        assessment.run_number = await get_next_run_number(db)
        db.add(assessment)
        try:
            await db.commit()
            await db.refresh(assessment)
            log.info(
                "Assessment created",
                assessment_id=assessment.id,
                run_number=assessment.run_number,
                repository_id=repository.id,
                status=assessment.status,
                existing=False,
                worker_started=False,
            )
            return assessment, True
        except IntegrityError as exc:
            await db.rollback()
            if not _is_run_number_conflict(exc):
                # The one-active-per-repository partial unique index rejected the
                # INSERT — another request created (or already had) an active
                # assessment while we were between the lookup and the commit.
                # Return that existing assessment; the caller must NOT launch a
                # worker.
                active = await _find_active_assessment(db, repository.id)
                if active:
                    log.info(
                        "Returning existing active assessment (race)",
                        assessment_id=active.id,
                        run_number=active.run_number,
                        repository_id=repository.id,
                        status=active.status,
                        existing=True,
                        worker_started=False,
                    )
                    return active, False
                # No active row found but the insert was rejected — retry with a
                # fresh run_number (e.g. the conflict was a stale duplicate row).
                assessment = _new_assessment()
                continue
            # run_number collision with a completed/failed run — re-allocate and
            # retry with a fresh object (the previous one is unusable after rollback).
            assessment = _new_assessment()
        except OperationalError:
            # e.g. SQLite "database is locked" under heavy concurrency.
            await db.rollback()
            assessment = _new_assessment()
            await asyncio.sleep(0.05 * (attempt + 1))
    raise RuntimeError(f"Failed to allocate a unique assessment after 5 attempts")


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
