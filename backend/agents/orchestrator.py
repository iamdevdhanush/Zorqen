"""RAKSHA — Assessment Orchestrator
Controls the full DETECT → REASON → VALIDATE → REMEDIATE → VERIFY pipeline.
"""
from __future__ import annotations

import asyncio
import os
import shutil
import tempfile
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List

import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.database import AsyncSessionLocal
from models.assessment import Assessment, AssessmentStatus
from models.finding import Finding, Severity, Confidence, FindingStatus
from models.repository import Repository
from models.user import User
from agents.architecture_analyst import analyze_architecture
from agents.security_reasoner import reason_about_finding
from security.repo_intel import analyze_repository
from security.semgrep_runner import run_semgrep
from security.secret_detector import scan_files as scan_secrets
from security.custom_checks import scan_files as custom_scan
from github.client import GitHubClient

log = structlog.get_logger()

SEVERITY_WEIGHTS = {
    "critical": 25,
    "high": 10,
    "medium": 5,
    "low": 2,
    "info": 0,
}

IMPORTANT_EXTENSIONS = {
    ".py", ".js", ".ts", ".jsx", ".tsx", ".go", ".java", ".rb", ".php",
    ".env", ".yaml", ".yml", ".json", ".toml", ".ini", ".cfg", ".conf",
    "Dockerfile", "docker-compose.yml",
}

MAX_FILES_TO_ANALYZE = 100
MAX_FILE_SIZE = 100_000  # 100KB


def utcnow():
    return datetime.now(timezone.utc)


async def _update_assessment(
    assessment_id: str,
    step: str,
    progress: int,
    status: str = AssessmentStatus.RUNNING,
    **kwargs,
):
    """Update assessment status and timeline in DB."""
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

        # Update timeline
        timeline = assessment.timeline or []
        timeline.append({
            "step": step,
            "status": log_status,
            "timestamp": utcnow().isoformat(),
        })
        assessment.timeline = timeline

        # Update pipeline log with the real step record
        pipeline_log = assessment.pipeline_logs or []
        pipeline_log.append({
            "step": step,
            "status": log_status,
            "progress": progress,
            "timestamp": utcnow().isoformat(),
            "source": "orchestrator",
            "text": f"{step.replace('_', ' ')} — {progress}%",
            "tone": "err" if log_status == "failed" else "info",
        })
        assessment.pipeline_logs = pipeline_log

        for k, v in kwargs.items():
            setattr(assessment, k, v)

        await db.commit()
        log.info("Assessment updated", step=step, progress=progress)


def _calculate_security_score(findings: List[Finding]) -> float:
    """Score = 100 - weighted penalty for findings."""
    penalty = 0
    for finding in findings:
        if finding.status == FindingStatus.FALSE_POSITIVE:
            continue
        weight = SEVERITY_WEIGHTS.get(finding.severity, 0)
        # Reduce penalty for non-confirmed findings
        conf_factor = {
            "confirmed": 1.0,
            "likely": 0.7,
            "possible": 0.4,
            "false_positive": 0.0,
        }.get(finding.confidence, 0.5)
        penalty += weight * conf_factor

    score = max(0, min(100, 100 - penalty))
    return round(score, 1)


async def run_assessment(assessment_id: str, access_token: Optional[str] = None):
    """
    Main assessment pipeline. Runs in background.
    Steps:
    1. Load assessment + repository from DB
    2. Clone/fetch repository files
    3. Architecture analysis
    4. Security scanning (Semgrep + custom + secret detection)
    5. AI reasoning
    6. Save findings
    7. Calculate score
    """
    log.info("Starting assessment", assessment_id=assessment_id)

    try:
        async with AsyncSessionLocal() as db:
            assessment = await db.get(Assessment, assessment_id)
            if not assessment:
                log.error("Assessment not found", id=assessment_id)
                return
            repository = await db.get(Repository, assessment.repository_id)
            if not repository:
                return
            user = await db.get(User, repository.user_id)

        # Determine GitHub token
        gh_token = access_token or (user.github_access_token if user else None)

        # Transition PENDING → RUNNING immediately so the UI shows the correct state.
        # This is the canonical place where RUNNING begins — not at creation time.
        await _update_assessment(assessment_id, "index", 5, status=AssessmentStatus.RUNNING,
                                 started_at=utcnow())

        # ── Step 1: Repository Indexed ──────────────────────────────────────
        await _update_assessment(assessment_id, "repository_indexed", 10)

        file_tree: List[str] = []
        file_contents: Dict[str, str] = {}
        tmp_dir: Optional[str] = None

        if gh_token and repository.clone_url:
            # Fetch files via GitHub API
            file_tree, file_contents = await _fetch_repo_files(
                repository.owner,
                repository.name,
                assessment.branch,
                assessment.commit_sha or assessment.branch,
                gh_token,
            )
        else:
            await _update_assessment(assessment_id, "failed", 0, status=AssessmentStatus.FAILED,
                                     error_message="No GitHub access token available. Re-connect your GitHub account and retry.")
            return

        # ── Step 2: Architecture Analysis ───────────────────────────────────
        await _update_assessment(assessment_id, "architecture_generated", 25)

        arch_map = await analyze_architecture(file_tree, file_contents, repository.name)

        # Deterministic repository intelligence — the real attack-map source.
        intel = analyze_repository(file_tree, file_contents, repository.name)
        intel_summary = intel.to_dict()
        arch_map["repo_intel"] = intel_summary
        arch_map["primary_language"] = intel.primary_language

        await _update_assessment(assessment_id, "architecture_generated", 30,
                                 architecture_map=arch_map)

        # ── Step 3: Security Scan ────────────────────────────────────────────
        await _update_assessment(assessment_id, "security_scan", 40)

        all_raw_findings: List[Dict[str, Any]] = []

        # 3a. Custom checks
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

        # 3b. Secret detection
        secret_findings = scan_secrets(file_contents)
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

        # 3c. Semgrep (if tmp_dir available — write files to temp, then scan)
        if tmp_dir is None and file_contents:
            tmp_dir = tempfile.mkdtemp(prefix="raksha_scan_")
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
            except Exception as e:
                log.warning("Semgrep scan failed", error=str(e))

        # Record secrets + dependency analysis as completed pipeline steps
        await _update_assessment(assessment_id, "secrets", 50)
        await _update_assessment(assessment_id, "dependencies", 55)

        # ── Step 4: AI Reasoning ─────────────────────────────────────────────
        await _update_assessment(assessment_id, "ai_reasoning", 65)

        enriched_findings = []
        for raw in all_raw_findings[:50]:  # Cap at 50 to avoid token limits
            try:
                reasoning = await reason_about_finding(
                    finding_type=raw.get("vulnerability_type", "Unknown"),
                    severity=raw.get("severity", "medium"),
                    file_path=raw.get("file_path", ""),
                    line_number=raw.get("line_number", 0),
                    code_snippet=raw.get("code_snippet", ""),
                    tool_message=raw.get("message", ""),
                    architecture_context=arch_map,
                )
                enriched_findings.append({**raw, **reasoning})
            except Exception as e:
                log.warning("Reasoning failed for finding", error=str(e))
                enriched_findings.append({
                    **raw,
                    "confidence": raw.get("confidence", "possible"),
                    "confidence_pct": 50,
                    "is_exploitable": False,
                    "root_cause": raw.get("message", ""),
                    "attack_path": [],
                    "impact": "Manual assessment required.",
                    "evidence": raw.get("code_snippet", ""),
                    "ai_reasoning": "AI reasoning unavailable.",
                    "false_positive_reason": None,
                })

        # ── Step 5: Save Findings ────────────────────────────────────────────
        await _update_assessment(assessment_id, "security_scan", 80)

        score_data = await _save_findings(assessment_id, enriched_findings, arch_map)
        score_data["dependencies"] = len(intel.dependencies)

        # ── Step 6: Complete ─────────────────────────────────────────────────
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

        log.info("Assessment completed", assessment_id=assessment_id, score=score_data["score"])

    except Exception as e:
        log.error("Assessment pipeline failed", assessment_id=assessment_id, error=str(e))
        await _update_assessment(
            assessment_id, "failed", 0,
            status=AssessmentStatus.FAILED,
            error_message=str(e)[:500],
        )
    finally:
        if tmp_dir and os.path.exists(tmp_dir):
            shutil.rmtree(tmp_dir, ignore_errors=True)


async def _fetch_repo_files(
    owner: str, repo: str, branch: str, ref: str, token: str
) -> tuple[List[str], Dict[str, str]]:
    """Fetch important source files from GitHub API."""
    client = GitHubClient(token)

    try:
        tree_data = await client.get_tree(owner, repo, ref, recursive=True)
    except Exception:
        tree_data = await client.get_tree(owner, repo, branch, recursive=True)

    all_paths = [item["path"] for item in tree_data.get("tree", []) if item.get("type") == "blob"]
    file_tree = all_paths

    # Filter to important files
    important_paths = [
        p for p in all_paths
        if any(p.endswith(ext) for ext in IMPORTANT_EXTENSIONS)
        or os.path.basename(p) in {"Dockerfile", ".env", "docker-compose.yml"}
    ][:MAX_FILES_TO_ANALYZE]

    file_contents: Dict[str, str] = {}
    tasks = [client.get_file_content(owner, repo, path, ref) for path in important_paths]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    for path, content in zip(important_paths, results):
        if isinstance(content, str) and len(content) <= MAX_FILE_SIZE:
            file_contents[path] = content

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
    """Persist enriched findings to DB and return score summary."""
    counts = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0, "secrets": 0, "dependencies": 0}
    db_findings = []

    for ef in enriched:
        severity = ef.get("severity", "medium")
        confidence_raw = ef.get("confidence", "possible")
        confidence_pct = ef.get("confidence_pct", 50)

        # Filter out false positives
        if confidence_raw == "false_positive":
            continue

        finding = Finding(
            assessment_id=assessment_id,
            title=ef.get("vulnerability_type", "Unknown Vulnerability"),
            vulnerability_type=ef.get("vulnerability_type", "Unknown"),
            severity=severity,
            confidence=confidence_raw,
            confidence_pct=confidence_pct,
            status=FindingStatus.OPEN,
            cwe_id=ef.get("cwe_id"),
            cwe_name=_cwe_name(ef.get("cwe_id")),
            owasp_category=ef.get("owasp_category"),
            file_path=ef.get("file_path"),
            line_number=ef.get("line_number"),
            code_snippet=ef.get("code_snippet", "")[:2000],
            root_cause=ef.get("root_cause", ""),
            attack_path=ef.get("attack_path", []),
            impact=ef.get("impact", ""),
            evidence=ef.get("evidence", ""),
            ai_reasoning=ef.get("ai_reasoning", ""),
            is_exploitable=ef.get("is_exploitable", False),
            source_tool=ef.get("source_tool", "unknown"),
            rule_id=ef.get("rule_id"),
        )
        db_findings.append(finding)

        counts[severity] = counts.get(severity, 0) + 1
        if "secret" in ef.get("source_tool", "").lower():
            counts["secrets"] += 1

    async with AsyncSessionLocal() as db:
        for finding in db_findings:
            db.add(finding)
        await db.commit()

    # Calculate score
    total_penalty = sum(
        SEVERITY_WEIGHTS.get(sev, 0) * count
        for sev, count in counts.items()
        if sev in SEVERITY_WEIGHTS
    )
    score = round(max(0, min(100, 100 - total_penalty)), 1)

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
