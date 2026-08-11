"""RAKSHA — Secret Detector
Scans source files for hardcoded secrets, credentials, and tokens.
Detects and redacts found values before storing them.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import List, Optional


SECRET_PATTERNS = [
    ("AWS Access Key", r"(?i)AKIA[0-9A-Z]{16}", "CWE-798"),
    ("AWS Secret Key", r"(?i)aws.{0,20}['\"]([0-9a-zA-Z/+]{40})['\"]", "CWE-798"),
    ("GitHub Token", r"ghp_[0-9a-zA-Z]{36}", "CWE-798"),
    ("GitHub OAuth Token", r"gho_[0-9a-zA-Z]{36}", "CWE-798"),
    ("GitHub App Token", r"(github_pat_[0-9a-zA-Z_]{82})", "CWE-798"),
    ("Generic API Key", r"(?i)(api[_-]?key|apikey)\s*[=:]\s*['\"]([a-zA-Z0-9_\-]{20,})['\"]", "CWE-798"),
    ("Generic Secret", r"(?i)(secret|password|passwd|pwd)\s*[=:]\s*['\"]([^'\"]{8,})['\"]", "CWE-256"),
    ("Private Key", r"-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----", "CWE-321"),
    ("JWT Token", r"eyJ[a-zA-Z0-9]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}", "CWE-798"),
    ("Stripe Secret Key", r"sk_(live|test)_[0-9a-zA-Z]{24}", "CWE-798"),
    ("Slack Token", r"xox[baprs]-[0-9a-zA-Z-]{10,}", "CWE-798"),
    ("Google API Key", r"AIza[0-9A-Za-z\-_]{35}", "CWE-798"),
    ("Heroku API Key", r"[h|H][e|E][r|R][o|O][k|K][u|U].{0,30}[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}", "CWE-798"),
    ("Database URL with credentials", r"(?i)(postgres|mysql|mongodb|redis):\/\/[^:]+:[^@]+@", "CWE-798"),
    ("Basic Auth in URL", r"https?:\/\/[^:]+:[^@]{4,}@", "CWE-522"),
    ("Hardcoded IP with port", r"(?<!\d)(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?):\d{2,5}(?!\d)", "CWE-798"),
]

# Files to skip entirely
SKIP_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".woff", ".woff2", ".ttf", ".eot", ".mp4", ".zip", ".tar", ".gz", ".bin", ".lock"}
SKIP_FILENAMES = {"package-lock.json", "yarn.lock", "poetry.lock", "Pipfile.lock", "composer.lock"}


@dataclass
class SecretFinding:
    pattern_name: str
    cwe_id: str
    file_path: str
    line_number: int
    line_content: str  # redacted
    redacted_value: str
    confidence: str = "likely"
    severity: str = "critical"


def redact_value(value: str) -> str:
    """Replace secret value with redacted placeholder."""
    if len(value) <= 8:
        return "***REDACTED***"
    return value[:4] + "***REDACTED***" + value[-2:]


def should_skip_file(file_path: str) -> bool:
    import os
    ext = os.path.splitext(file_path)[1].lower()
    name = os.path.basename(file_path)
    if ext in SKIP_EXTENSIONS:
        return True
    if name in SKIP_FILENAMES:
        return True
    # Skip .env files content — but flag their existence
    if name.startswith(".env"):
        return False  # scan them but redact
    return False


def scan_content(content: str, file_path: str) -> List[SecretFinding]:
    """Scan a string of file content for secrets."""
    if should_skip_file(file_path):
        return []

    findings = []
    lines = content.splitlines()

    for i, line in enumerate(lines, start=1):
        for pattern_name, pattern, cwe_id in SECRET_PATTERNS:
            matches = re.findall(pattern, line)
            if matches:
                # Redact the line for display
                redacted_line = line
                for match in matches:
                    if isinstance(match, tuple):
                        for group in match:
                            if group and len(group) > 4:
                                redacted_line = redacted_line.replace(group, redact_value(group))
                    elif isinstance(match, str) and len(match) > 4:
                        redacted_line = redacted_line.replace(match, redact_value(match))

                findings.append(SecretFinding(
                    pattern_name=pattern_name,
                    cwe_id=cwe_id,
                    file_path=file_path,
                    line_number=i,
                    line_content=redacted_line.strip(),
                    redacted_value=f"[{pattern_name} — value redacted]",
                ))
    return findings


def scan_files(files: dict[str, str]) -> List[SecretFinding]:
    """Scan a dict of {file_path: content} for secrets."""
    all_findings = []
    for path, content in files.items():
        all_findings.extend(scan_content(content, path))
    return all_findings
