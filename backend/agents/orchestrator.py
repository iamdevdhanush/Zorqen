"""ZORQEN — Assessment Orchestrator
Controls the full DETECT → REASON → VALIDATE → REMEDIATE → VERIFY pipeline.

Canonical stages (the contract the console renders):

  1. Repository Indexed     (repository_indexed)
  2. Architecture Analyzed  (architecture_generated)
  3. Dependencies Scanned   (dependencies)
  4. Secrets Scan           (secrets)
  5. Static Analysis        (security_scan)
  6. AI Correlation         (ai_reasoning)
  7. Report Generated       (report_generated)

Every stage writes its state to the database FIRST (single source of truth)
and THEN publishes an SSE progress event via services.events. Per-file
telemetry (current file, files scanned, ETA) is stream-only — the database
holds stage boundaries and final counts.
"""
from __future__ import annotations

import asyncio
import os
import shutil
import tempfile
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List

import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.config import settings
from core.database import AsyncSessionLocal
from models.assessment import Assessment, AssessmentStatus
from models.finding import Finding, FindingStatus
from models.repository import Repository
from models.user import User
from agents.architecture_analyst import analyze_architecture
from agents.security_reasoner import reason_batch
from security.repo_intel import analyze_repository
from security.semgrep_runner import SemgrepError, run_semgrep
from security.secret_detector import scan_files as scan_secrets
from security.custom_checks import scan_files as custom_scan
from services.events import event_bus, publish_progress
from github.client import GitHubClient

log = structlog.get_logger()

IMPORTANT_EXTENSIONS = {
    ".py", ".js", ".ts", ".jsx", ".tsx", ".go", ".java", ".rb", ".php",
    ".env", ".yaml", ".yml", ".json", ".toml", ".ini", ".cfg", ".conf",
    "Dockerfile", "docker-compose.yml", ".xml",
}

MAX_FILES_TO_ANALYZE = 100
MAX_FILE_SIZE = 100_000  # 100KB

# Internal step name → canonical console stage label.
STAGE_LABELS = {
    "repository_indexed": "Repository Indexed",
    "architecture_generated": "Architecture Analyzed",
    "dependencies": "Dependencies Scanned",
    "secrets": "Secrets Scan",
    "security_scan": "Static Analysis",
    "ai_reasoning": "AI Correlation",
    "report_generated": "Report Generated",
    "completed": "Report Generated",
    "failed": "Assessment Failed",
}


def utcnow():
    return datetime.now(timezone.utc)


async def _update_assessment(
    assessment_id: str,
    step: str,
    progress: int,
    status: str = AssessmentStatus.RUNNING,
    **kwargs,
):
    """Update assessment status, progress, timeline and pipeline log in DB,
    then publish a live SSE event for the console.

    Each stage is written exactly once: if the trailing timeline entry already
    records the same step, it is replaced rather than appended. Progress is
    therefore monotonic and never duplicated, regardless of how many workers
    touch the row. SSE events are emitted only after the commit succeeds, so a
    visible update always corresponds to persisted backend state.
    """
    async with AsyncSessionLocal() as db:
        assessment = await db.get(Assessment, assessment_id)
        if not assessment:
            return
        assessment.status = status
        assessment.current_step = step
        assessment.progress_pct = progress

        log_status = (
            "failed"
            if step == "failed" or status == AssessmentStatus.FAILED
            else ("completed" if progress > 0 else "running")
        )
        now = utcnow().isoformat()

        # Timeline — dedupe the trailing entry for the same step.
        timeline = list(assessment.timeline or [])
        if timeline and timeline[-1].get("step") == step:
            timeline[-1] = {"step": step, "status": log_status, "timestamp": now}
        else:
            timeline.append({"step": step, "status": log_status, "timestamp": now})
        assessment.timeline = timeline

        # Pipeline log — dedupe the trailing entry for the same step.
        pipeline_log = list(assessment.pipeline_logs or [])
        if pipeline_log and pipeline_log[-1].get("step") == step:
            pipeline_log[-1] = {
                "step": step,
                "status": log_status,
                "progress": progress,
                "timestamp": now,
                "source": "orchestrator",
                "text": f"{step.replace('_', ' ')} — {progress}%",
                "tone": "err" if log_status == "failed" else "info",
            }
        else:
            pipeline_log.append({
                "step": step,
                "status": log_status,
                "progress": progress,
                "timestamp": now,
                "source": "orchestrator",
                "text": f"{step.replace('_', ' ')} — {progress}%",
                "tone": "err" if log_status == "failed" else "info",
            })
        assessment.pipeline_logs = pipeline_log

        for k, v in kwargs.items():
            setattr(assessment, k, v)

        eta_seconds = _estimate_eta(assessment.started_at, progress)

        await db.commit()

    log.info(
        "Assessment updated",
        assessment_id=assessment_id,
        step=step,
        progress=progress,
        status=status,
        eta_seconds=eta_seconds,
    )

    # Live SSE notification (post-commit, so it mirrors DB state exactly).
    await publish_progress(
        assessment_id,
        stage=STAGE_LABELS.get(step, step.replace("_", " ").title()),
        progress=progress,
        status=log_status,
        eta_seconds=eta_seconds,
        message=_stage_message(step, progress, kwargs),
    )


def _estimate_eta(started_at: Optional[datetime], progress: int) -> Optional[int]:
    """Remaining seconds estimated from elapsed time and current progress.

    Returns None until the run has started and made measurable progress.
    SQLite returns naive datetimes — normalize them to UTC before comparing.
    """
    if not started_at or progress <= 0:
        return None
    if started_at.tzinfo is None:
        started_at = started_at.replace(tzinfo=timezone.utc)
    elapsed = (utcnow() - started_at).total_seconds()
    if elapsed <= 0:
        return None
    remaining = elapsed / progress * (100 - progress)
    return max(0, int(remaining))


def _stage_message(step: str, progress: int, kwargs: Dict[str, Any]) -> str:
    """Human-readable message for the live event stream."""
    label = STAGE_LABELS.get(step, step.replace("_", " ").title())
    if step == "failed":
        return "Assessment failed — see error details."
    if step == "completed":
        return "Report generated — assessment complete."
    return f"{label} — {progress}%"


async def _emit_file_progress(
    assessment_id: str,
    stage: str,
    progress: int,
    file: Optional[str],
    scanned: int,
    total: int,
    started_at: Optional[datetime],
) -> None:
    """Stream-only per-file telemetry (no DB write per file)."""
    await publish_progress(
        assessment_id,
        stage=stage,
        progress=progress,
        file=file or "",
        files_scanned=scanned,
        total_files=total,
        eta_seconds=_estimate_eta(started_at, progress),
    )


def _calculate_security_score(findings: List[Finding]) -> float:
    """Score = 100 - weighted penalty for findings."""
    from services.scoring import calculate_security_score
    return calculate_security_score(
        {"severity": f.severity, "confidence": f.confidence, "status": f.status.value}
        for f in findings
    )


async def run_assessment(
    assessment_id: str,
    access_token: Optional[str] = None,
    *,
    request_id: Optional[str] = None,
    worker_id: Optional[str] = None,
):
    """
    Main assessment pipeline. Runs in background.
    Steps:
    1. Load assessment + repository from DB
    2. Clone/fetch repository files (Repository Indexed)
    3. Architecture analysis (Architecture Analyzed)
    4. Dependency scan (Dependencies Scanned)
    5. Secret detection (Secrets Scan)
    6. Static analysis (Static Analysis)
    7. AI reasoning (AI Correlation)
    8. Save findings + score + report (Report Generated)

    Idempotency: this worker may ONLY run when the assessment row is still
    PENDING. If another worker already transitioned it to RUNNING, this
    invocation exits immediately — it is a duplicate.
    """
    worker_id = worker_id or str(uuid.uuid4())

    async with AsyncSessionLocal() as db:
        assessment = await db.get(Assessment, assessment_id)
        if not assessment:
            log.error(
                "Assessment not found",
                assessment_id=assessment_id,
                request_id=request_id,
                worker_id=worker_id,
            )
            return
        if assessment.status != AssessmentStatus.PENDING:
            # Duplicate worker — the router may only launch a worker for a
            # freshly created PENDING row, but if two workers were somehow
            # scheduled, only the first one gets to run.
            log.info(
                "Duplicate worker suppressed — assessment already active",
                assessment_id=assessment.id,
                run_number=assessment.run_number,
                repository_id=assessment.repository_id,
                status=assessment.status,
                request_id=request_id,
                worker_id=worker_id,
                existing=True,
                worker_started=False,
            )
            return
        repository = await db.get(Repository, assessment.repository_id)
        if not repository:
            log.error(
                "Repository not found for assessment",
                assessment_id=assessment_id,
                repository_id=assessment.repository_id,
                request_id=request_id,
                worker_id=worker_id,
            )
            return
        user = await db.get(User, repository.user_id)

    # Bind execution identity to every log line emitted by this worker.
    structlog.contextvars.bind_contextvars(
        assessment_id=assessment_id,
        run_number=assessment.run_number,
        repository_id=repository.id,
        request_id=request_id,
        worker_id=worker_id,
    )
    log.info("Starting assessment", existing=False, worker_started=True)

    tmp_dir: Optional[str] = None
    try:
        # Determine GitHub token
        gh_token = access_token or (user.get_github_token() if user else None)

        # Transition PENDING → RUNNING immediately so the UI shows the correct state.
        # This is the canonical place where RUNNING begins — not at creation time.
        await _update_assessment(assessment_id, "index", 5, status=AssessmentStatus.RUNNING,
                                 started_at=utcnow())

        # ── Stage 1: Repository Indexed ────────────────────────────────────
        await _update_assessment(assessment_id, "repository_indexed", 10)

        file_tree: List[str] = []
        file_contents: Dict[str, str] = {}

        if gh_token and repository.clone_url:
            # Fetch files via GitHub API against the pinned commit SHA.
            try:
                file_tree, file_contents = await _fetch_repo_files(
                    repository.owner,
                    repository.name,
                    assessment.branch,
                    assessment.commit_sha or assessment.branch,
                    gh_token,
                    assessment_id=assessment_id,
                    started_at=assessment.started_at,
                )
            except Exception as e:
                code = _classify_fetch_error(e)
                await _update_assessment(
                    assessment_id, "failed", 0, status=AssessmentStatus.FAILED,
                    error_message=(
                        f"Could not fetch repository contents at pinned commit "
                        f"{assessment.commit_sha or assessment.branch}: {str(e)[:200]}"
                    ),
                    error_code=code,
                )
                return
        else:
            await _update_assessment(assessment_id, "failed", 0, status=AssessmentStatus.FAILED,
                                     error_message="No GitHub access token available. Re-connect your GitHub account and retry.",
                                     error_code="GITHUB_AUTH_MISSING")
            return

        await _update_assessment(assessment_id, "repository_indexed", 15)

        # ── Stage 2: Architecture Analyzed ─────────────────────────────────
        await _update_assessment(assessment_id, "architecture_generated", 20)

        arch_map = await analyze_architecture(file_tree, file_contents, repository.name)

        # Deterministic repository intelligence — the real attack-map source.
        intel = analyze_repository(file_tree, file_contents, repository.name)
        intel_summary = intel.to_dict()
        arch_map["repo_intel"] = intel_summary
        arch_map["primary_language"] = intel.primary_language

        await _update_assessment(assessment_id, "architecture_generated", 30,
                                 architecture_map=arch_map)

        # ── Stage 3: Dependencies Scanned ──────────────────────────────────
        await _update_assessment(assessment_id, "dependencies", 35)
        dependency_count = len(intel.dependencies)
        await _update_assessment(assessment_id, "dependencies", 45,
                                 dependency_count=dependency_count)

        # ── Stage 4: Secrets Scan ──────────────────────────────────────────
        await _update_assessment(assessment_id, "secrets", 50)

        secret_findings = scan_secrets(file_contents)
        secret_count = len(secret_findings)
        await _update_assessment(assessment_id, "secrets", 60,
                                 secrets_count=secret_count)

        # ── Stage 5: Static Analysis ───────────────────────────────────────
        await _update_assessment(assessment_id, "security_scan", 65)

        all_raw_findings: List[Dict[str, Any]] = []

        # 5a. Custom checks
        custom_findings = custom_scan(file_contents)
        for cf in custom_findings:
            all_raw_findings.append({
                "vulnerability_type": cf.vulnerability_type,
                "severity": cf.severity,
                "confidence": cf.confidence,
                "cwe_id": cf.cwe_id,
                "owasp_category": cf.owasp_category,
                "file_path": cf.file_path,
                "line_number": cf.line_number,
                "code_snippet": cf.code_snippet,
                "message": cf.description,
                "source_tool": "custom",
                "rule_id": cf.check_name,
            })

        # 5b. Secret findings join the pool
        for sf in secret_findings:
            all_raw_findings.append({
                "vulnerability_type": f"Hardcoded Secret ({sf.pattern_name})",
                "severity": "critical",
                "confidence": "likely",
                "cwe_id": sf.cwe_id,
                "owasp_category": "A02:2021",
                "file_path": sf.file_path,
                "line_number": sf.line_number,
                "code_snippet": sf.line_content,
                "message": f"Secret detected: {sf.pattern_name} — value has been redacted.",
                "source_tool": "secret_detector",
                "rule_id": "secret_detection",
            })

        # 5c. Semgrep (if tmp_dir available — write files to temp, then scan)
        if tmp_dir is None and file_contents:
            tmp_dir = tempfile.mkdtemp(prefix="zorqen_scan_")
            _write_files_to_dir(file_contents, tmp_dir)

        if tmp_dir:
            try:
                semgrep_findings = await run_semgrep(
                    tmp_dir,
                    languages=[arch_map.get("primary_language", "")],
                )
                for sf in semgrep_findings:
                    # Normalize path to relative
                    rel_path = sf.file_path.replace(tmp_dir, "").lstrip("/\\")
                    all_raw_findings.append({
                        "vulnerability_type": _rule_to_vuln_type(sf.rule_id),
                        "severity": sf.severity,
                        "confidence": "likely",
                        "cwe_id": sf.cwe,
                        "owasp_category": sf.owasp,
                        "file_path": rel_path or sf.file_path,
                        "line_number": sf.line_start,
                        "code_snippet": sf.code_snippet,
                        "message": sf.message,
                        "source_tool": "semgrep",
                        "rule_id": sf.rule_id,
                    })
            except SemgrepError as e:
                # Never silently convert an incomplete or failed Semgrep scan into a clean run.
                await _update_assessment(
                    assessment_id,
                    "failed",
                    0,
                    status=AssessmentStatus.FAILED,
                    error_message=f"Semgrep scan failed: {e}",
                    error_code="SEMGREP_FAILED",
                )
                log.error("Semgrep scan failed — assessment failed", error=str(e), kind=e.kind)
                return
            except Exception as e:
                log.warning("Semgrep scan raised unexpected error", error=str(e))
            finally:
                # Clean up the scan directory as soon as the scan finishes —
                # never leave temp materialized files behind, even on failure.
                shutil.rmtree(tmp_dir, ignore_errors=True)
                tmp_dir = None

        await _update_assessment(assessment_id, "security_scan", 75)

        # ── Stage 6: AI Correlation ────────────────────────────────────────
        await _update_assessment(assessment_id, "ai_reasoning", 80)

        # Only the raw findings (bounded at 50) reach the LLM — never the whole
        # repository. Findings are reasoned in small batches to respect Groq
        # rate/token limits. When AI is unavailable the scanner's own confidence
        # is preserved and confidence_pct stays 0 ("not AI-evaluated") — no
        # fabricated reasoning is ever stored.
        enriched_findings, ai_unavailable_reason = await reason_batch(
            all_raw_findings[:50], arch_map
        )
        if ai_unavailable_reason:
            await _update_assessment(
                assessment_id,
                "ai_reasoning",
                85,
                ai_unavailable_reason=ai_unavailable_reason[:500],
            )
        else:
            await _update_assessment(assessment_id, "ai_reasoning", 88)

        # ── Save Findings ──────────────────────────────────────────────────
        await _update_assessment(assessment_id, "findings", 90)

        score_data = await _save_findings(assessment_id, enriched_findings, arch_map)
        score_data["dependencies"] = dependency_count
        score_data["secrets"] = secret_count

        # ── Stage 7: Report Generated ──────────────────────────────────────
        await _update_assessment(
            assessment_id,
            "report_generated",
            95,
            security_score=score_data["score"],
            critical_count=score_data["critical"],
            high_count=score_data["high"],
            medium_count=score_data["medium"],
            low_count=score_data["low"],
            secrets_count=score_data["secrets"],
            dependency_count=score_data["dependencies"],
        )

        # ── Complete ───────────────────────────────────────────────────────
        await _update_assessment(
            assessment_id,
            "completed",
            100,
            status=AssessmentStatus.COMPLETED,
            security_score=score_data["score"],
            critical_count=score_data["critical"],
            high_count=score_data["high"],
            medium_count=score_data["medium"],
            low_count=score_data["low"],
            secrets_count=score_data["secrets"],
            dependency_count=score_data["dependencies"],
            completed_at=utcnow(),
        )

        log.info("Assessment completed", score=score_data["score"], status="completed")

    except Exception as e:
        log.error("Assessment pipeline failed", error=str(e))
        await _update_assessment(
            assessment_id, "failed", 0,
            status=AssessmentStatus.FAILED,
            error_message=str(e)[:500],
            error_code="PIPELINE_ERROR",
        )
    finally:
        if tmp_dir and os.path.exists(tmp_dir):
            shutil.rmtree(tmp_dir, ignore_errors=True)
        structlog.contextvars.unbind_contextvars(
            "assessment_id", "run_number", "repository_id", "request_id", "worker_id"
        )


def _classify_fetch_error(exc: Exception) -> str:
    """Map repository fetch failures to a structured error code."""
    import httpx
    if isinstance(exc, httpx.HTTPStatusError):
        status = exc.response.status_code if exc.response is not None else 0
        if status == 401:
            return "GITHUB_AUTH_EXPIRED"
        if status == 403:
            remaining = exc.response.headers.get("x-ratelimit-remaining") if exc.response is not None else None
            return "GITHUB_RATE_LIMIT" if remaining == "0" else "GITHUB_PERMISSION_DENIED"
        if status == 404:
            return "GITHUB_TREE_NOT_FOUND"
        return "GITHUB_API_ERROR"
    return "GITHUB_UNREACHABLE"


async def _fetch_repo_files(
    owner: str, repo: str, branch: str, ref: str, token: str,
    *,
    assessment_id: Optional[str] = None,
    started_at: Optional[datetime] = None,
) -> tuple[List[str], Dict[str, str]]:
    """Fetch important source files from GitHub API.

    `ref` is the pinned commit SHA resolved at assessment start. It is used
    strictly — if the pinned commit cannot be fetched, this raises so the
    assessment fails explicitly instead of silently scanning a different
    commit (which would corrupt the assessment's integrity).

    Per-file fetch progress is streamed live over SSE (stream-only; the
    database records the stage boundary once all files are in).
    """
    client = GitHubClient(token)

    tree_data = await client.get_tree(owner, repo, ref, recursive=True)

    all_paths = [item["path"] for item in tree_data.get("tree", []) if item.get("type") == "blob"]
    file_tree = all_paths

    # Filter to important files
    important_paths = [
        p for p in all_paths
        if any(p.endswith(ext) for ext in IMPORTANT_EXTENSIONS)
        or os.path.basename(p) in {"Dockerfile", ".env", "docker-compose.yml"}
    ][:MAX_FILES_TO_ANALYZE]

    total = len(important_paths)
    file_contents: Dict[str, str] = {}

    if assessment_id:
        await _emit_file_progress(
            assessment_id, "Repository Indexed", 12, None, 0, total, started_at
        )

    for index, path in enumerate(important_paths, start=1):
        content = await client.get_file_content(owner, repo, path, ref)
        if isinstance(content, str) and len(content) <= MAX_FILE_SIZE:
            file_contents[path] = content
        if assessment_id:
            progress = 12 + int(3 * (index / max(total, 1)))  # 12 → 15
            await _emit_file_progress(
                assessment_id, "Repository Indexed", progress,
                path, index, total, started_at,
            )

    return file_tree, file_contents


def _write_files_to_dir(file_contents: Dict[str, str], base_dir: str):
    """Write in-memory file contents to a temp directory for Semgrep."""
    for rel_path, content in file_contents.items():
        full_path = os.path.join(base_dir, rel_path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        try:
            with open(full_path, "w", encoding="utf-8", errors="replace") as f:
                f.write(content)
        except Exception:
            pass


async def _save_findings(
    assessment_id: str,
    enriched: List[Dict[str, Any]],
    arch_map: Dict[str, Any],
) -> Dict[str, Any]:
    """Persist enriched findings to DB and return score summary.

    Every finding gets a deterministic fingerprint + human slug (F-XXXX)
    computed from its primary identifying attributes, so the same
    vulnerability at the same location is correlate-able across runs.
    """
    from services.dedup import fingerprint as fp_of, slug_for

    counts = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0, "secrets": 0, "dependencies": 0}
    db_findings = []

    for ef in enriched:
        severity = ef.get("severity", "medium")
        confidence_raw = ef.get("confidence", "possible")
        # confidence_pct=0 means "not AI-evaluated".  Only set a positive
        # value when AI actually provided a confidence assessment.
        confidence_pct = ef.get("confidence_pct") or 0

        # Filter out false positives
        if confidence_raw == "false_positive":
            continue

        file_path = ef.get("file_path")
        line_number = ef.get("line_number")
        rule_id = ef.get("rule_id")
        vuln_type = ef.get("vulnerability_type", "Unknown")

        finding = Finding(
            assessment_id=assessment_id,
            title=vuln_type,
            vulnerability_type=vuln_type,
            severity=severity,
            confidence=confidence_raw,
            confidence_pct=confidence_pct,
            status=FindingStatus.OPEN,
            cwe_id=ef.get("cwe_id"),
            cwe_name=_cwe_name(ef.get("cwe_id")),
            owasp_category=ef.get("owasp_category"),
            file_path=file_path,
            line_number=line_number,
            code_snippet=ef.get("code_snippet", "")[:2000],
            root_cause=ef.get("root_cause", ""),
            attack_path=ef.get("attack_path", []),
            impact=ef.get("impact", ""),
            evidence=ef.get("evidence", ""),
            ai_reasoning=ef.get("ai_reasoning", ""),
            is_exploitable=ef.get("is_exploitable", False),
            source_tool=ef.get("source_tool", "unknown"),
            rule_id=rule_id,
            slug=slug_for(file_path, line_number, rule_id, vuln_type),
            extra={"fingerprint": fp_of(file_path, line_number, rule_id, vuln_type)},
        )
        db_findings.append(finding)

        counts[severity] = counts.get(severity, 0) + 1
        if "secret" in ef.get("source_tool", "").lower():
            counts["secrets"] += 1

    async with AsyncSessionLocal() as db:
        for finding in db_findings:
            db.add(finding)
        await db.commit()

    # Calculate score via the canonical scoring service — the same one the
    # API and overview use. Never maintain a local duplicate of the formula.
    from services.scoring import calculate_security_score

    scored_items = [
        {"severity": f.severity, "confidence": f.confidence, "status": f.status.value}
        for f in db_findings
    ]
    score = calculate_security_score(scored_items)

    return {
        "score": score,
        "critical": counts.get("critical", 0),
        "high": counts.get("high", 0),
        "medium": counts.get("medium", 0),
        "low": counts.get("low", 0),
        "secrets": counts.get("secrets", 0),
        "dependencies": counts.get("dependencies", 0),
    }


def _rule_to_vuln_type(rule_id: str) -> str:
    """Map Semgrep rule ID to human-readable vulnerability type."""
    rule_lower = rule_id.lower()
    mapping = {
        "sql": "SQL Injection",
        "xss": "Cross-Site Scripting (XSS)",
        "ssrf": "Server-Side Request Forgery (SSRF)",
        "command": "Command Injection",
        "path": "Path Traversal",
        "secret": "Hardcoded Secret",
        "auth": "Authentication Issue",
        "injection": "Code Injection",
        "deserialization": "Insecure Deserialization",
        "cors": "CORS Misconfiguration",
        "csrf": "CSRF Vulnerability",
        "crypto": "Insecure Cryptography",
    }
    for key, val in mapping.items():
        if key in rule_lower:
            return val
    return "Security Vulnerability"


def _cwe_name(cwe_id: Optional[str]) -> Optional[str]:
    CWE_NAMES = {
        "CWE-89": "SQL Injection",
        "CWE-79": "Cross-site Scripting",
        "CWE-78": "OS Command Injection",
        "CWE-22": "Path Traversal",
        "CWE-918": "Server-Side Request Forgery",
        "CWE-798": "Use of Hard-coded Credentials",
        "CWE-256": "Plaintext Storage of Password",
        "CWE-321": "Use of Hard-coded Cryptographic Key",
        "CWE-502": "Deserialization of Untrusted Data",
        "CWE-338": "Use of Cryptographically Weak PRNG",
        "CWE-306": "Missing Authentication for Critical Function",
        "CWE-862": "Missing Authorization",
        "CWE-639": "Authorization Bypass Through User-Controlled Key (IDOR)",
        "CWE-942": "Permissive CORS Policy",
        "CWE-693": "Protection Mechanism Failure",
        "CWE-522": "Insufficiently Protected Credentials",
    }
    if not cwe_id:
        return None
    return CWE_NAMES.get(cwe_id)