"""ZORQEN — Regression tests for security verification claims integrity.

Proves that:
1. A completed scan cannot imply sandbox exploit verification (CONFIRMED)
   without genuine runtime reproduction evidence.
2. An LLM is_exploitable flag alone does NOT promote a finding to CONFIRMED.
3. Patch verification (VALIDATED) requires a genuinely verified remediation.
4. Pipeline steps for completed assessments do not fabricate sandbox completion.
5. Copilot context does not misrepresent unverified findings as CONFIRMED.
"""
import pytest
from datetime import datetime, timezone

from models.assessment import Assessment, AssessmentStatus
from models.finding import Finding, Severity, Confidence, FindingStatus
from models.remediation import Remediation, RemediationStatus
from models.validation_result import ValidationResult
from services.serializers import _validation_state, finding_contract, _steps_from_pipeline_logs
from services.copilot import _validation_label, _finding_evidence


def _make_finding(is_exploitable=True, status="open") -> Finding:
    return Finding(
        id="test-finding-001",
        assessment_id="test-assessment-001",
        title="SQL Injection in auth route",
        file_path="backend/routers/auth.py",
        line_number=42,
        cwe_id="CWE-89",
        cwe_name="SQL Injection",
        severity=Severity.HIGH,
        confidence=Confidence.LIKELY,
        confidence_pct=85,
        status=FindingStatus.OPEN,
        is_exploitable=is_exploitable,
        evidence="SELECT * FROM users WHERE username = " + "'user'",
        ai_reasoning="Direct string interpolation in SQL query",
    )


def test_finding_is_exploitable_alone_does_not_claim_confirmed():
    """An LLM's probabilistic is_exploitable assertion MUST NOT produce CONFIRMED."""
    finding = _make_finding(is_exploitable=True)
    state = _validation_state(finding, validation=None, remediation=None)
    assert state == "STATIC", f"Expected 'STATIC' without sandbox reproduction, got '{state}'"


def test_finding_without_is_exploitable_is_static():
    finding = _make_finding(is_exploitable=False)
    state = _validation_state(finding, validation=None, remediation=None)
    assert state == "STATIC"


def test_finding_confirmed_only_with_real_reproduced_validation():
    finding = _make_finding(is_exploitable=True)
    validation = ValidationResult(
        id="val-001",
        finding_id=finding.id,
        status="reproduced",
        response_evidence="HTTP 500: syntax error at or near 'OR'",
    )
    state = _validation_state(finding, validation=validation, remediation=None)
    assert state == "CONFIRMED"


def test_finding_unvalidated_when_probe_does_not_reproduce():
    finding = _make_finding(is_exploitable=True)
    validation = ValidationResult(
        id="val-002",
        finding_id=finding.id,
        status="not_reproduced",
    )
    state = _validation_state(finding, validation=validation, remediation=None)
    assert state == "UNVALIDATED"


def test_finding_validated_only_with_verified_remediation():
    finding = _make_finding(is_exploitable=False)
    remediation = Remediation(
        id="rem-001",
        finding_id=finding.id,
        status=RemediationStatus.VERIFIED,
        verification_status="verified",
    )
    state = _validation_state(finding, validation=None, remediation=remediation)
    assert state == "VALIDATED"


def test_finding_contract_omits_runtime_without_validation_result():
    finding = _make_finding(is_exploitable=True)
    contract = finding_contract(finding, validation=None, remediation=None)
    assert contract["validation"] == "STATIC"
    assert "runtime" not in contract["evidence"]
    assert "runtime_result" not in contract["evidence"]


def test_completed_assessment_steps_do_not_fabricate_sandbox_step():
    assessment = Assessment(
        id="test-assessment-002",
        repository_id="test-repo-001",
        status=AssessmentStatus.COMPLETED,
        pipeline_logs=[
            {"step": "repository_indexed", "status": "completed", "text": "Repo indexed"},
            {"step": "security_scan", "status": "completed", "text": "Scan complete"},
            {"step": "report_generated", "status": "completed", "text": "Report generated"},
        ],
    )
    steps = _steps_from_pipeline_logs(assessment)
    step_ids = [s["id"] for s in steps]
    # Canonical pipeline steps are the 7 scanner stages; no fake sandbox stage
    assert "sandbox" not in step_ids
    # None of the steps should claim sandbox validation
    for step in steps:
        assert "sandbox" not in step["label"].lower()


def test_copilot_context_does_not_claim_confirmed_without_evidence():
    finding = _make_finding(is_exploitable=True)
    label = _validation_label(finding)
    assert label == "STATIC", f"Copilot expected 'STATIC', got '{label}'"

    ev = _finding_evidence(finding)
    assert ev["validation"] == "STATIC"
    assert ev["probe_result"] is None
    assert "runtime_evidence" not in ev
