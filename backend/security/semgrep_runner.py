"""RAKSHA — Semgrep Runner
Async wrapper around the Semgrep CLI.
Parses SARIF output and maps to internal finding format.
"""
from __future__ import annotations

import asyncio
import json
import os
import tempfile
from dataclasses import dataclass
from typing import List, Optional
import structlog

log = structlog.get_logger()

# Semgrep rules to use (OSS, no token required)
SEMGREP_RULESETS = [
    "p/python",
    "p/javascript",
    "p/typescript",
    "p/owasp-top-ten",
    "p/secrets",
    "p/sql-injection",
    "p/xss",
    "p/command-injection",
]

SEVERITY_MAP = {
    "ERROR": "high",
    "WARNING": "medium",
    "INFO": "low",
}


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


async def run_semgrep(repo_path: str, languages: Optional[List[str]] = None) -> List[SemgrepFinding]:
    """Run semgrep on a repository directory. Returns list of findings."""

    # Select rulesets based on detected languages
    rulesets = ["p/owasp-top-ten", "p/secrets"]
    if languages:
        lang_lower = [l.lower() for l in languages]
        if any(l in lang_lower for l in ["python"]):
            rulesets.append("p/python")
        if any(l in lang_lower for l in ["javascript", "typescript", "js", "ts"]):
            rulesets.extend(["p/javascript", "p/typescript", "p/xss"])
        if any(l in lang_lower for l in ["go", "golang"]):
            rulesets.append("p/golang")
        if any(l in lang_lower for l in ["java"]):
            rulesets.append("p/java")
        if any(l in lang_lower for l in ["ruby"]):
            rulesets.append("p/ruby")
    
    if not rulesets:
        rulesets = ["p/owasp-top-ten", "p/secrets"]

    ruleset_args = []
    for rs in rulesets:
        ruleset_args.extend(["--config", rs])

    cmd = [
        "semgrep",
        "--json",
        "--no-git-ignore",
        "--timeout", "60",
        "--max-memory", "512",
        *ruleset_args,
        repo_path,
    ]

    log.info("Running semgrep", cmd=" ".join(cmd))

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=repo_path,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=120)
    except asyncio.TimeoutError:
        log.warning("Semgrep timed out")
        return []
    except FileNotFoundError:
        log.warning("Semgrep not found in PATH, skipping")
        return []

    if not stdout:
        log.warning("Semgrep produced no output", stderr=stderr.decode()[:500])
        return []

    try:
        data = json.loads(stdout.decode())
    except json.JSONDecodeError:
        log.warning("Failed to parse semgrep JSON output")
        return []

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

    log.info("Semgrep completed", findings=len(findings))
    return findings
