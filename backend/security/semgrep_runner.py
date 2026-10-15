"""ZORQEN — Semgrep Runner
Async wrapper around the Semgrep CLI.
Parses SARIF output and maps to internal finding format.

Failure policy: a real Semgrep failure (timeout, binary missing, unparsable
output) RAISES SemgrepError so the orchestrator can mark the assessment
FAILED with an explicit reason. A timeout is never silently converted into a
successful (empty) scan.
"""
from __future__ import annotations

import asyncio
import json
import os
import uuid
from dataclasses import dataclass
from typing import List, Optional
import structlog

log = structlog.get_logger()

# Semgrep rules to use (OSS, no token required).
# owasp-top-ten + secrets are always on; language-specific rulesets are added
# based on the detected primary language. Kept intentionally small so a single
# worker can finish on a low-memory host without re-downloading dozens of rule
# packs on every run.
SEMGREP_RULESETS = [
    "p/owasp-top-ten",
    "p/secrets",
]

SEVERITY_MAP = {
    "ERROR": "high",
    "WARNING": "medium",
    "INFO": "low",
}


class SemgrepError(RuntimeError):
    """A real Semgrep execution failure. The assessment must report this."""

    def __init__(self, reason: str, kind: str = "error"):
        super().__init__(reason)
        self.kind = kind


@dataclass
class SemgrepFinding:
    rule_id: str
    message: str
    severity: str
    file_path: str
    line_start: int
    line_end: int
    code_snippet: str
    cwe: Optional[str] = None
    owasp: Optional[str] = None
    source_tool: str = "semgrep"


def _pick_rulesets(languages: Optional[List[str]]) -> List[str]:
    """Language-aware ruleset selection for a single process."""
    rulesets = list(SEMGREP_RULESETS)  # owasp-top-ten + secrets always
    if languages:
        lang_lower = [l.lower() for l in languages]
        if any(l in lang_lower for l in ["python"]):
            rulesets.append("p/python")
        if any(l in lang_lower for l in ["javascript", "typescript", "js", "ts"]):
            rulesets.append("p/javascript")
        if any(l in lang_lower for l in ["go", "golang"]):
            rulesets.append("p/golang")
        if any(l in lang_lower for l in ["java"]):
            rulesets.append("p/java")
        if any(l in lang_lower for l in ["ruby"]):
            rulesets.append("p/ruby")
    return rulesets


import shutil
import sys
from pathlib import Path

def _find_semgrep_bin() -> str:
    """Resolve the semgrep executable path across environments."""
    which = shutil.which("semgrep")
    if which:
        return which
    scripts_dir = Path(sys.prefix) / ("Scripts" if sys.platform == "win32" else "bin")
    candidate = scripts_dir / ("semgrep.exe" if sys.platform == "win32" else "semgrep")
    if candidate.exists():
        return str(candidate)
    return "semgrep"


async def run_semgrep(repo_path: str, languages: Optional[List[str]] = None) -> List[SemgrepFinding]:
    """Run semgrep on a repository directory. Returns list of findings.

    Raises SemgrepError on any real execution failure.
    """
    run_id = uuid.uuid4().hex[:8]
    rulesets = _pick_rulesets(languages)
    semgrep_bin = _find_semgrep_bin()

    ruleset_args = []
    for rs in rulesets:
        ruleset_args.extend(["--config", rs])

    cmd = [
        semgrep_bin,
        "--json",
        "--no-git-ignore",
        "--timeout", "60",
        "--max-memory", "512",
        "--metrics", "off",
        "--jobs", str(max(1, (os.cpu_count() or 1) // 2)),
        "--optimizations", "all",
        *ruleset_args,
        repo_path,
    ]

    log.info(
        "Running semgrep",
        semgrep_run_id=run_id,
        rulesets=rulesets,
        target=repo_path,
        cmd=" ".join(cmd),
    )

    proc = None
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=repo_path,
        )
        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=120)
        except (asyncio.TimeoutError, TimeoutError):
            proc.kill()
            try:
                await proc.wait()
            except Exception:
                pass
            log.error(
                "Semgrep timed out",
                semgrep_run_id=run_id,
                timeout_seconds=120,
                rulesets=rulesets,
            )
            raise SemgrepError(
                "Semgrep exceeded the 120s execution budget for this repository "
                "and was terminated. The scan did not complete.",
                kind="timeout",
            )
    except FileNotFoundError:
        log.error("Semgrep binary not found in PATH", semgrep_run_id=run_id)
        raise SemgrepError(
            "Semgrep binary not found in PATH or environment — cannot run static analysis.",
            kind="not_installed",
        )
    except OSError as e:
        log.error("Semgrep OS execution failed", semgrep_run_id=run_id, error=str(e))
        raise SemgrepError(
            f"Semgrep cannot execute on this host architecture: {e}. "
            "(Semgrep engine requires Linux container/WSL runtime environment on Windows hosts).",
            kind="os_incompatible",
        )

    if not stdout:
        stderr_text = (stderr or b"").decode(errors="replace")[:500]
        log.error(
            "Semgrep produced no output",
            semgrep_run_id=run_id,
            stderr=stderr_text,
        )
        raise SemgrepError(
            f"Semgrep exited without producing results (code {proc.returncode if proc else 'N/A'}): {stderr_text}",
            kind="empty_output",
        )

    try:
        data = json.loads(stdout.decode())
    except json.JSONDecodeError as e:
        stderr_text = (stderr or b"").decode(errors="replace")[:500]
        log.error(
            "Failed to parse semgrep JSON output",
            semgrep_run_id=run_id,
            error=str(e),
            stderr=stderr_text,
        )
        raise SemgrepError(
            f"Semgrep returned unparsable output: {stderr_text}",
            kind="bad_json",
        )

    findings = []
    for result in data.get("results", []):
        severity_raw = result.get("extra", {}).get("severity", "WARNING")
        severity = SEVERITY_MAP.get(severity_raw.upper(), "medium")

        # Extract CWE and OWASP from metadata
        metadata = result.get("extra", {}).get("metadata", {})
        cwe_list = metadata.get("cwe", [])
        owasp_list = metadata.get("owasp", [])
        cwe = cwe_list[0] if cwe_list else None
        owasp = owasp_list[0] if owasp_list else None

        # Normalize CWE format
        if cwe and not cwe.startswith("CWE-"):
            cwe = f"CWE-{cwe}"

        findings.append(SemgrepFinding(
            rule_id=result.get("check_id", "unknown"),
            message=result.get("extra", {}).get("message", ""),
            severity=severity,
            file_path=result.get("path", ""),
            line_start=result.get("start", {}).get("line", 0),
            line_end=result.get("end", {}).get("line", 0),
            code_snippet=result.get("extra", {}).get("lines", "")[:500],
            cwe=cwe,
            owasp=owasp,
        ))

    log.info("Semgrep completed", semgrep_run_id=run_id, findings=len(findings))
    return findings
