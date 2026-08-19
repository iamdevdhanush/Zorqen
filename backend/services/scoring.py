"""ZORQEN — Deterministic Security Scoring
Pure functions: identical inputs always produce identical outputs.
"""
from __future__ import annotations

from typing import Iterable, Mapping, Optional

SEVERITY_WEIGHTS = {
    "critical": 25,
    "high": 10,
    "medium": 5,
    "low": 2,
    "info": 0,
}

CONFIDENCE_FACTORS = {
    "confirmed": 1.0,
    "likely": 0.7,
    "possible": 0.4,
    "false_positive": 0.0,
}

# Statuses that no longer count toward the penalty (they are resolved)
RESOLVED_STATUSES = {"dismissed", "fixed", "false_positive", "verified"}

# Score bands used by the console contract
RISK_LOW = 80
RISK_MODERATE = 60


def confidence_factor(confidence: Optional[str]) -> float:
    """Map a confidence label to a deterministic factor."""
    return CONFIDENCE_FACTORS.get((confidence or "").lower(), 0.5)


def severity_weight(severity: Optional[str]) -> int:
    return SEVERITY_WEIGHTS.get((severity or "info").lower(), 0)


def finding_penalty(severity: Optional[str], confidence: Optional[str], status: Optional[str] = None) -> float:
    """Penalty contributed by a single finding (0 when resolved)."""
    if status and status.lower() in RESOLVED_STATUSES:
        return 0.0
    return severity_weight(severity) * confidence_factor(confidence)


def calculate_security_score(
    findings: Iterable[Mapping],
    *,
    round_to: int = 1,
) -> float:
    """Security posture score: 100 minus the weighted penalty for active findings.

    Deterministic: ordering of findings never changes the result.
    """
    penalty = 0.0
    for finding in findings:
        penalty += finding_penalty(
            finding.get("severity"),
            finding.get("confidence"),
            finding.get("status"),
        )
    score = max(0.0, min(100.0, 100.0 - penalty))
    return round(score, round_to)


def risk_level(score: float) -> str:
    """Map a score to a risk tier label."""
    if score >= RISK_LOW:
        return "LOW RISK"
    if score >= RISK_MODERATE:
        return "MODERATE RISK"
    return "HIGH RISK"


def severity_counts(findings: Iterable[Mapping]) -> dict:
    counts = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
    for finding in findings:
        sev = (finding.get("severity") or "info").lower()
        if sev in counts:
            counts[sev] += 1
    return counts


def summarize_findings(findings: Iterable[Mapping]) -> dict:
    """Aggregate counts + score for an assessment summary block."""
    items = list(findings)
    counts = severity_counts(items)
    active = [f for f in items if (f.get("status") or "open").lower() not in RESOLVED_STATUSES]
    return {
        "score": calculate_security_score(items),
        "critical": counts["critical"],
        "high": counts["high"],
        "medium": counts["medium"],
        "low": counts["low"],
        "info": counts["info"],
        "secrets": sum(
            1 for f in items
            if "secret" in (f.get("source_tool") or "").lower()
        ),
        "dependencies": sum(
            1 for f in items
            if (f.get("source_tool") or "").lower() in {"trivy", "dependency"}
        ),
        "total": len(items),
        "active": len(active),
    }
