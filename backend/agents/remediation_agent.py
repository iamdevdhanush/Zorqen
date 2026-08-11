"""RAKSHA — Remediation Agent
Generates minimal, safe code patches for confirmed vulnerabilities using Groq.
"""
from __future__ import annotations

import difflib
from typing import Dict, Any, Optional
from agents.llm_client import llm
import structlog

log = structlog.get_logger()

SYSTEM_PROMPT = """You are RAKSHA's Remediation Agent — a senior application security engineer specializing in minimal, safe code fixes.

You receive a vulnerability finding with the vulnerable code and must generate a MINIMAL, targeted fix.

Return valid JSON with these exact keys:
{
  "fixed_code": "<complete fixed version of the vulnerable code snippet>",
  "explanation": "<2-3 sentences explaining what was changed and why it fixes the vulnerability>",
  "risks": "<1-2 sentences on potential side effects or things to test after applying this fix>",
  "fix_type": "parameterized_query|input_validation|output_encoding|auth_check|dependency_update|config_change|other"
}

Principles:
- Make the MINIMAL change needed — don't refactor or restructure unnecessarily  
- Use the same language/framework idioms as the original code
- Prefer well-established secure alternatives (parameterized queries over sanitization, etc.)
- If the fix requires a new import, include it in the fixed_code
- Never introduce new vulnerabilities in the fix
- If you cannot generate a confident fix, set fixed_code to null and explain in the explanation field
"""


async def generate_fix(
    vulnerability_type: str,
    file_path: str,
    code_before: str,
    root_cause: str,
    cwe_id: Optional[str] = None,
    context: Optional[str] = None,
) -> Dict[str, Any]:
    """Generate a remediation patch for a finding."""

    user_prompt = f"""VULNERABILITY TO FIX:
Type: {vulnerability_type}
CWE: {cwe_id or 'N/A'}
File: {file_path}
Root cause: {root_cause}

Vulnerable code:
```
{code_before[:1000]}
```

{"Additional context:" + chr(10) + context[:400] if context else ""}

Generate a minimal, safe fix. Return JSON."""

    try:
        result = await llm.complete_json(
            system_prompt=SYSTEM_PROMPT,
            user_prompt=user_prompt,
            max_tokens=2048,
        )

        fixed_code = result.get("fixed_code")

        # Generate unified diff
        unified_diff = ""
        if fixed_code and code_before:
            diff_lines = list(difflib.unified_diff(
                code_before.splitlines(keepends=True),
                fixed_code.splitlines(keepends=True),
                fromfile=f"a/{file_path}",
                tofile=f"b/{file_path}",
                lineterm="",
            ))
            unified_diff = "\n".join(diff_lines)

        return {
            "code_before": code_before,
            "code_after": fixed_code or code_before,
            "unified_diff": unified_diff,
            "explanation": result.get("explanation", ""),
            "risks": result.get("risks", ""),
            "fix_type": result.get("fix_type", "other"),
            "success": bool(fixed_code),
        }

    except Exception as e:
        log.error("Remediation generation failed", error=str(e))
        return {
            "code_before": code_before,
            "code_after": code_before,
            "unified_diff": "",
            "explanation": f"Failed to generate fix: {str(e)}",
            "risks": "Manual review required.",
            "fix_type": "other",
            "success": False,
        }
