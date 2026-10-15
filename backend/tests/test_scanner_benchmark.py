"""ZORQEN — Scanner Benchmark & Detection Validation Tests

Covers:
1. Controlled corpus evaluation for SQL injection, command injection, path traversal,
   safe alternatives, and commented-out code.
2. Precision and recall measurement across vulnerable and safe fixtures.
3. Source attribution integrity: regex-based checks explicitly labeled 'custom_regex'.
4. Semgrep runner contract: CLI invocation, timeout handling, OS exception handling,
   and structured JSON parsing.
"""
import json
import os
import pytest
from pathlib import Path
from unittest.mock import AsyncMock, patch, MagicMock

from security.custom_checks import scan_file, CustomFinding
from security.semgrep_runner import (
    SemgrepError,
    SemgrepFinding,
    run_semgrep,
    _find_semgrep_bin,
    _pick_rulesets,
)

FIXTURES_DIR = Path(__file__).parent / "fixtures" / "scanner_corpus"


def _read_fixture(filename: str) -> str:
    path = FIXTURES_DIR / filename
    return path.read_text(encoding="utf-8")


def test_sql_injection_vuln_detected():
    code = _read_fixture("sql_injection_vuln.py")
    findings = scan_file("sql_injection_vuln.py", code)
    assert len(findings) >= 3
    for f in findings:
        assert f.cwe_id == "CWE-89"
        assert f.source_tool == "custom_regex"
        assert "Regex Heuristic" in f.vulnerability_type


def test_sql_injection_safe_no_false_positives():
    code = _read_fixture("sql_injection_safe.py")
    findings = scan_file("sql_injection_safe.py", code)
    assert len(findings) == 0, f"Expected 0 findings on safe SQL, got: {[f.description for f in findings]}"


def test_command_injection_vuln_detected():
    code = _read_fixture("command_injection_vuln.py")
    findings = scan_file("command_injection_vuln.py", code)
    assert len(findings) >= 3
    for f in findings:
        assert f.cwe_id == "CWE-78"
        assert f.source_tool == "custom_regex"


def test_command_injection_safe_no_false_positives():
    code = _read_fixture("command_injection_safe.py")
    findings = scan_file("command_injection_safe.py", code)
    assert len(findings) == 0, f"Expected 0 findings on safe command execution, got: {[f.description for f in findings]}"


def test_path_traversal_vuln_detected():
    code = _read_fixture("path_traversal_vuln.py")
    findings = scan_file("path_traversal_vuln.py", code)
    assert len(findings) >= 2
    for f in findings:
        assert f.cwe_id == "CWE-22"
        assert f.source_tool == "custom_regex"


def test_path_traversal_safe_no_false_positives():
    code = _read_fixture("path_traversal_safe.py")
    findings = scan_file("path_traversal_safe.py", code)
    assert len(findings) == 0, f"Expected 0 findings on safe path operations, got: {[f.description for f in findings]}"


def test_commented_out_code_no_false_positives():
    code = _read_fixture("commented_out_code.py")
    findings = scan_file("commented_out_code.py", code)
    assert len(findings) == 0, f"Expected 0 findings on commented-out code, got: {[f.description for f in findings]}"


def test_benchmark_metrics_summary():
    """Evaluate overall precision, recall, and false positive rates over the test corpus."""
    vuln_files = ["sql_injection_vuln.py", "command_injection_vuln.py", "path_traversal_vuln.py"]
    safe_files = ["sql_injection_safe.py", "command_injection_safe.py", "path_traversal_safe.py", "commented_out_code.py"]

    true_positives = 0
    false_negatives = 0
    false_positives = 0
    true_negatives = 0

    for vf in vuln_files:
        code = _read_fixture(vf)
        findings = scan_file(vf, code)
        if len(findings) > 0:
            true_positives += len(findings)
        else:
            false_negatives += 1

    for sf in safe_files:
        code = _read_fixture(sf)
        findings = scan_file(sf, code)
        if len(findings) == 0:
            true_negatives += 1
        else:
            false_positives += len(findings)

    # All expected vulnerabilities detected
    assert true_positives >= 8
    assert false_negatives == 0
    # Zero false positives on safe and commented code
    assert false_positives == 0
    assert true_negatives == 4

    precision = true_positives / (true_positives + false_positives)
    recall = true_positives / (true_positives + false_negatives)
    assert precision == 1.0
    assert recall == 1.0


@pytest.mark.asyncio
async def test_semgrep_runner_parses_json_output():
    """Verify structured output parsing when Semgrep returns valid JSON."""
    fake_json = json.dumps({
        "results": [
            {
                "check_id": "python.lang.security.injection.sql.sql-injection",
                "path": "app/db.py",
                "start": {"line": 42, "col": 5},
                "end": {"line": 42, "col": 45},
                "extra": {
                    "message": "User data in SQL query",
                    "severity": "ERROR",
                    "lines": "cursor.execute(query)",
                    "metadata": {
                        "cwe": ["89"],
                        "owasp": ["A03:2021"],
                    },
                },
            }
        ]
    }).encode("utf-8")

    mock_proc = MagicMock()
    mock_proc.communicate = AsyncMock(return_value=(fake_json, b""))
    mock_proc.returncode = 1

    with patch("asyncio.create_subprocess_exec", new=AsyncMock(return_value=mock_proc)):
        findings = await run_semgrep("/fake/path", languages=["python"])
        assert len(findings) == 1
        f = findings[0]
        assert f.rule_id == "python.lang.security.injection.sql.sql-injection"
        assert f.severity == "high"
        assert f.cwe == "CWE-89"
        assert f.file_path == "app/db.py"
        assert f.line_start == 42
        assert f.source_tool == "semgrep"


@pytest.mark.asyncio
async def test_semgrep_runner_os_incompatible_raises():
    """Verify that OSError (e.g. WinError 193 ELF binary on Windows) raises SemgrepError with kind='os_incompatible'."""
    with patch("asyncio.create_subprocess_exec", side_effect=OSError("[WinError 193] %1 is not a valid Win32 application")):
        with pytest.raises(SemgrepError) as exc_info:
            await run_semgrep("/fake/path")
        assert exc_info.value.kind == "os_incompatible"
        assert "cannot execute on this host architecture" in str(exc_info.value)


@pytest.mark.asyncio
async def test_semgrep_runner_timeout_raises():
    mock_proc = MagicMock()
    mock_proc.communicate = AsyncMock(side_effect=TimeoutError())
    mock_proc.kill = MagicMock()
    mock_proc.wait = AsyncMock()

    with patch("asyncio.create_subprocess_exec", new=AsyncMock(return_value=mock_proc)):
        with pytest.raises(SemgrepError) as exc_info:
            await run_semgrep("/fake/path")
        assert exc_info.value.kind == "timeout"
