"""RAKSHA — Contract Serializers
Single source of truth for the JSON shapes the frontend console consumes.
Backend ↔ Frontend contract version: 1.0 (console "Security Operations" UI).
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Union

from models.assessment import Assessment, AssessmentStatus
from models.finding import Finding
from models.remediation import Remediation
from models.repository import Repository
from models.validation_result import ValidationResult

# ── The 7 canonical pipeline steps rendered by the console ───────────────────

PIPELINE_STEPS: List[Dict[str, str]] = [
    {"id": "index", "label": "Repository indexed"},
    {"id": "architecture", "label": "Architecture analyzed"},
    {"id": "dependencies", "label": "Dependencies analyzed"},
    {"id": "static", "label": "Static analysis completed"},
    {"id": "secrets", "label": "Secrets scan completed"},
    {"id": "reasoning", "label": "AI reasoning completed"},
    {"id": "validation", "label": "Sandbox validation unavailable"},
]

LANGUAGE_BY_EXT = {
    ".py": "python", ".pyw": "python",
    ".js": "javascript", ".jsx": "javascript", ".mjs": "javascript",
    ".ts": "typescript", ".tsx": "typescript",
    ".go": "go", ".java": "java", ".rb": "ruby", ".php": "php",
    ".cs": "csharp", ".cpp": "cpp", ".c": "c", ".rs": "rust",
    ".sh": "bash", ".bash": "bash", ".json": "json", ".yaml": "yaml",
    ".yml": "yaml", ".toml": "toml", ".ini": "ini", ".sql": "sql",
    ".html": "html", ".css": "css", ".md": "markdown",
}


def _fmt_time(dt: Union[datetime, str, None]) -> Optional[str]:
    if not dt:
        return None
    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt)
        except ValueError:
            return None
    return dt.astimezone().strftime("%H:%M:%S")


def _fmt_duration(started: Optional[datetime], completed: Optional[datetime]) -> Optional[str]:
    if not started:
        return None
    end = completed or datetime.now(timezone.utc)
    seconds = max(1, int((end - started).total_seconds()))
    return f"{seconds}s"


def _lang(path: Optional[str]) -> str:
    if not path:
        return "python"
    from pathlib import Path
    return LANGUAGE_BY_EXT.get(Path(path).suffix.lower(), "python")


def _run_id(assessment: Assessment) -> str:
    if assessment.run_number:
        return f"#{assessment.run_number:04d}"
    return f"#{assessment.id[:4].upper()}"


def _status_to_ui(status: str) -> str:
    return {
        "open": "OPEN",
        "validating": "REVIEW",
        "validated": "REVIEW",
        "fixing": "FIX_PENDING",
        "fixed": "VERIFIED",
        "verified": "VERIFIED",
        "dismissed": "DISMISSED",
        "false_positive": "DISMISSED",
    }.get((status or "open").lower(), "OPEN")


def _validation_state(finding: Finding, validation: Optional[ValidationResult],
                      remediation: Optional[Remediation]) -> str:
    if validation:
        if validation.status == "reproduced":
            return "CONFIRMED"
        if validation.status in {"not_reproduced", "inconclusive"}:
            return "UNVALIDATED"
    if remediation and remediation.verification_status == "verified":
        return "VALIDATED"
    if finding.is_exploitable:
        return "CONFIRMED"
    return "STATIC"


def _category(finding: Finding) -> str:
    tool = (finding.source_tool or "").lower()
    if "secret" in tool:
        return "secret"
    if tool in {"trivy", "dependency"}:
        return "dependency"
    return "application"


def _code_block(finding: Finding) -> Dict[str, Any]:
    snippet = (finding.code_snippet or "").rstrip()
    snippet_lines = snippet.splitlines() if snippet else []
    line = finding.line_number or 1
    start_line = max(1, line - len(snippet_lines) + 1) if snippet_lines else line
    vuln_line = line - start_line + 1 if snippet_lines else 1
    return {
        "language": finding.language or _lang(finding.file_path),
        "snippet": snippet,
        "vuln_line": vuln_line,
        "start_line": start_line,
    }


def _evidence_block(finding: Finding, validation: Optional[ValidationResult]) -> Dict[str, Any]:
    evidence: Dict[str, Any] = {
        "static_analysis": finding.evidence or "",
        "ai_reasoning": finding.ai_reasoning or "",
    }
    if validation and validation.response_evidence:
        evidence["runtime"] = validation.response_evidence
        evidence["runtime_result"] = (
            "REPRODUCED" if validation.status == "reproduced" else "NOT_REPRODUCED"
        )
    return evidence


def _risk_label(raw: Optional[str]) -> str:
    text = (raw or "").lower()
    if "low" in text or "minor" in text:
        return "Low"
    if "high" in text or "major" in text or "severe" in text:
        return "High"
    return "Medium"


def remediation_contract(r: Optional[Remediation], finding: Finding) -> Optional[Dict[str, Any]]:
    if not r:
        return None
    branch = r.branch_name or f"raksha/fix/{((finding.cwe_id or 'vuln')).lower()}"
    return {
        "branch": branch,
        "diff_before": r.code_before or "",
        "diff_after": r.code_after or "",
        "explanation": r.explanation or "",
        "why_this_fix": r.explanation or "",
        "risk": _risk_label(r.risks),
        "regression_tests": 0,
        "regression_passed": 0,
    }


def finding_contract(finding: Finding, validation: Optional[ValidationResult] = None,
                     remediation: Optional[Remediation] = None) -> Dict[str, Any]:
    validation = validation or finding.validation_result
    remediation = remediation or finding.remediation
    contract: Dict[str, Any] = {
        "id": finding.slug or finding.id,
        "severity": (finding.severity or "info").lower(),
        "title": finding.title,
        "file_path": finding.file_path or "",
        "line_number": finding.line_number or 1,
        "cwe_id": finding.cwe_id or "N/A",
        "cwe_name": finding.cwe_name or "",
        "confidence_pct": finding.confidence_pct or 0,
        "validation": _validation_state(finding, validation, remediation),
        "status": _status_to_ui(finding.status),
        "source_tool": finding.source_tool or "semgrep",
        "category": _category(finding),
        "root_cause": finding.root_cause or "",
        "impact": finding.impact or "",
        "attack_path": finding.attack_path or [],
        "evidence": _evidence_block(finding, validation),
        "code": _code_block(finding),
    }
    if finding.endpoint:
        contract["endpoint"] = finding.endpoint
    rem = remediation_contract(remediation, finding)
    if rem:
        contract["remediation"] = rem
    return contract


def repo_meta(repo: Repository) -> Dict[str, Any]:
    commit = (repo.head_commit or "")[:7]
    return {
        "id": repo.id,
        "name": repo.name,
        "owner": repo.owner,
        "private": repo.is_private,
        "language": repo.language or "Unknown",
        "defaultBranch": repo.default_branch or "main",
        "commit": commit,
        "githubRepoId": repo.github_repo_id,
    }


def _steps_from_pipeline_logs(assessment: Assessment) -> List[Dict[str, str]]:
    """Derive the 7 step states from the most recent pipeline_logs entries.

    The orchestrator emits its own internal step names; those are aliased to the
    canonical console steps. Steps the pipeline never reached stay 'pending' —
    notably SANDBOX VALIDATION, which RAKSHA does not run.
    """
    STEP_ALIASES = {
        "repository_indexed": "index",
        "architecture_generated": "architecture",
        "security_scan": "static",
        "secrets": "secrets",
        "dependencies": "dependencies",
        "ai_reasoning": "reasoning",
    }
    latest: Dict[str, str] = {}
    for entry in assessment.pipeline_logs or []:
        step = entry.get("step")
        if step:
            step = STEP_ALIASES.get(step, step)
        if step and entry.get("status"):
            latest[step] = entry["status"]
    if assessment.status == AssessmentStatus.COMPLETED:
        for step in latest:
            if step != "validation":  # Sandbox is never run
                latest[step] = "completed"
    steps = []
    for step in PIPELINE_STEPS:
        state = latest.get(step["id"])
        if step["id"] == "validation":
            # Sandbox validation is not implemented — always show as unavailable
            status = "unavailable"
        elif state in {"completed", "running", "failed"}:
            status = state
        else:
            status = "pending"
        steps.append({"id": step["id"], "label": step["label"], "status": status})
    return steps


def _logs_from_pipeline(assessment: Assessment) -> List[Dict[str, Any]]:
    logs = []
    for entry in assessment.pipeline_logs or []:
        if not entry.get("text"):
            continue
        logs.append({
            "time": _fmt_time(entry.get("timestamp")) or "—",
            "source": entry.get("source", "raksha"),
            "text": entry["text"],
            "tone": entry.get("tone", "info"),
        })
    if not logs and assessment.timeline:
        for entry in assessment.timeline:
            logs.append({
                "time": "—",
                "source": "raksha",
                "text": f"{entry.get('step', 'pipeline')} {entry.get('status', '')}".strip(),
                "tone": "info",
            })
    return logs


def _architecture_contract(assessment: Assessment) -> Optional[Dict[str, Any]]:
    """Deterministic architecture summary for the console attack map."""
    arch_map = assessment.architecture_map or {}
    if not arch_map:
        return None
    intel = arch_map.get("repo_intel") or {}
    layers = arch_map.get("layers") or {}
    features = arch_map.get("features") or {}
    routes = intel.get("routes") or []
    inputs = intel.get("input_sources") or []
    sinks = intel.get("sinks") or []
    flows = [k for k, v in (features or {}).items() if v]
    return {
        "files": intel.get("file_count", 0),
        "routes": len(routes),
        "topRoutes": routes[:8],
        "inputs": len(inputs),
        "sinks": len(sinks),
        "flows": flows,
        "secrets": assessment.secrets_count or 0,
        "languages": intel.get("languages") or {},
        "primaryLanguage": intel.get("primary_language")
        or arch_map.get("primary_language")
        or "Unknown",
        "frameworks": intel.get("frameworks") or [],
        "dependencies": len(intel.get("dependencies") or []),
        "summary": arch_map.get("ai_summary") or "",
        "layers": layers,
        "securityNotes": arch_map.get("security_notes") or [],
    }


def run_contract(assessment: Assessment, repository: Optional[Repository] = None,
                 findings: Optional[List[Finding]] = None) -> Dict[str, Any]:
    repo = repository or assessment.repository
    contract: Dict[str, Any] = {
        "id": _run_id(assessment),
        "repoId": assessment.repository_id,
        "repo": repo.name if repo else "unknown",
        "commit": (assessment.commit_sha or (repo.head_commit if repo else None) or "")[:7],
        "branch": assessment.branch or "main",
        "status": _run_status(assessment),
        "steps": _steps_from_pipeline_logs(assessment),
        "logs": _logs_from_pipeline(assessment),
        "findings": [finding_contract(f) for f in (findings or [])],
    }
    if assessment.error_message:
        contract["errorMessage"] = assessment.error_message
    architecture = _architecture_contract(assessment)
    if architecture:
        contract["architecture"] = architecture
    started = _fmt_time(assessment.started_at)
    if started:
        contract["startedAt"] = started
    duration = _fmt_duration(assessment.started_at, assessment.completed_at)
    if duration:
        contract["duration"] = duration
    if assessment.security_score is not None:
        contract["score"] = assessment.security_score
    return contract


def _run_status(assessment: Assessment) -> str:
    if assessment.status == AssessmentStatus.COMPLETED:
        return "COMPLETED"
    if assessment.status == AssessmentStatus.FAILED:
        return "FAILED"
    if assessment.status in {AssessmentStatus.PENDING}:
        return "IDLE"
    return "RUNNING"


def activity_contract(entry) -> Dict[str, Any]:
    detail = entry.detail or ""
    tone = "info"
    lowered = detail.lower()
    if "critical" in lowered or "error" in lowered or "failed" in lowered:
        tone = "err"
    elif "warn" in lowered or "secret" in lowered or "vulnerab" in lowered:
        tone = "warn"
    elif "complete" in lowered or "passed" in lowered or "verified" in lowered:
        tone = "ok"
    return {
        "time": _fmt_time(entry.created_at) or "—",
        "text": detail,
        "tone": tone,
    }
