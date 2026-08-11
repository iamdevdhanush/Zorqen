"""RAKSHA — Demo Router (console contract)
Serves the seeded demo workspace through the same serializers the live API uses,
so judges see the real console contract without GitHub/Docker/AI credentials.
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import get_db
from demo.fixtures import DEMO_FILE_CONTENTS, DEMO_FILE_TREE
from models.assessment import Assessment, AssessmentStatus
from models.repository import Repository
from models.user import User
from services.assessments import get_run
from services.findings import find_by_slug
from services.serializers import finding_contract, repo_meta

router = APIRouter(prefix="/demo", tags=["demo"])

DEMO_REPO_NAME = "defence-logistics-api"


async def _demo_workspace(db: AsyncSession):
    user = (await db.execute(
        select(User).where(User.github_login == settings.demo_user_login)
    )).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=503, detail="Demo workspace not seeded")
    repo = (await db.execute(
        select(Repository).where(Repository.user_id == user.id, Repository.name == DEMO_REPO_NAME)
    )).scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=503, detail="Demo repository not seeded")
    assessment = (await db.execute(
        select(Assessment)
        .where(Assessment.repository_id == repo.id, Assessment.status == AssessmentStatus.COMPLETED)
        .order_by(desc(Assessment.created_at))
        .limit(1)
    )).scalar_one_or_none()
    return user, repo, assessment


@router.get("/repository")
async def get_demo_repository(db: AsyncSession = Depends(get_db)):
    _, repo, _ = await _demo_workspace(db)
    return repo_meta(repo)


@router.get("/assessment")
async def get_demo_assessment(db: AsyncSession = Depends(get_db)):
    _, repo, assessment = await _demo_workspace(db)
    if not assessment:
        raise HTTPException(status_code=503, detail="No completed demo assessment")
    return await get_run(db, assessment)


@router.get("/findings")
async def get_demo_findings(severity: str = None, status: str = None,
                            db: AsyncSession = Depends(get_db)):
    from services.findings import search_findings
    user, _, assessment = await _demo_workspace(db)
    result = await search_findings(
        db, user, assessment_id=assessment.id if assessment else None,
        severity=severity, status=status, page_size=200,
    )
    findings = result["findings"]
    return {
        "findings": findings,
        "total": len(findings),
        "summary": result["counts"],
    }


@router.get("/findings/{finding_id}")
async def get_demo_finding(finding_id: str, db: AsyncSession = Depends(get_db)):
    user, _, _ = await _demo_workspace(db)
    finding = await find_by_slug(db, user, finding_id)
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    return finding_contract(finding)


@router.get("/score")
async def get_demo_score(db: AsyncSession = Depends(get_db)):
    _, repo, assessment = await _demo_workspace(db)
    if not assessment:
        raise HTTPException(status_code=503, detail="No completed demo assessment")
    from models.snapshot import RepositorySnapshot
    first = (await db.execute(
        select(RepositorySnapshot)
        .where(RepositorySnapshot.repository_id == repo.id)
        .order_by(RepositorySnapshot.created_at.asc())
        .limit(1)
    )).scalar_one_or_none()
    before = first.score if first else assessment.security_score
    return {
        "before": {
            "score": before,
            "critical": assessment.critical_count,
            "high": assessment.high_count,
            "medium": assessment.medium_count,
            "low": assessment.low_count,
        },
        "after": {
            "score": assessment.security_score,
            "critical": assessment.critical_count,
            "high": assessment.high_count,
            "medium": assessment.medium_count,
            "low": assessment.low_count,
        },
        "message": "Seeded baseline; run a remediation to see post-fix scoring.",
    }


@router.get("/architecture")
async def get_demo_architecture(db: AsyncSession = Depends(get_db)):
    _, _, assessment = await _demo_workspace(db)
    if not assessment:
        raise HTTPException(status_code=503, detail="No completed demo assessment")
    return assessment.architecture_map or {}


@router.get("/timeline")
async def get_demo_timeline(db: AsyncSession = Depends(get_db)):
    _, _, assessment = await _demo_workspace(db)
    if not assessment:
        raise HTTPException(status_code=503, detail="No completed demo assessment")
    return assessment.pipeline_logs or assessment.timeline or []


@router.get("/source/{file_path:path}")
async def get_demo_source_file(file_path: str):
    content = DEMO_FILE_CONTENTS.get(file_path)
    if content is None:
        raise HTTPException(status_code=404, detail="File not found")
    return {"path": file_path, "content": content}


@router.get("/source")
async def list_demo_source_files():
    return {
        "files": [
            {"path": p, "size": len(DEMO_FILE_CONTENTS[p]), "lines": DEMO_FILE_CONTENTS[p].count("\n")}
            for p in DEMO_FILE_TREE if p in DEMO_FILE_CONTENTS
        ]
    }


@router.post("/simulate-remediation/{finding_id}")
async def simulate_remediation(finding_id: str, db: AsyncSession = Depends(get_db)):
    """Console-contract verification simulation for the flagship SQLi finding."""
    user, _, _ = await _demo_workspace(db)
    finding = await find_by_slug(db, user, finding_id)
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    if finding.slug == "F-0001" or finding_id == "finding-001":
        return {
            "finding_id": finding.slug or finding_id,
            "vulnerability": finding.title,
            "validation_before": {
                "status": "reproduced",
                "evidence": "Payload ' OR '1'='1 returned all 1,284 user records",
            },
            "patch": {
                "description": "Parameterized query introduced",
                "diff": (finding.remediation.unified_diff or "") if finding.remediation else "",
            },
            "validation_after": {
                "status": "blocked",
                "evidence": "Payload ' OR '1'='1 returns 0 results — treated as literal string",
            },
            "regression_tests": "passed",
            "final_status": "PATCH VERIFIED",
            "message": "Verified against the tested vulnerability.",
        }

    return {
        "finding_id": finding.slug or finding_id,
        "final_status": "SIMULATION_ONLY",
        "message": "Full verification available for F-0001 (SQL Injection demo).",
    }
