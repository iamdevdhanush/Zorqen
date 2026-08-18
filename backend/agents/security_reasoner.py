"""RAKSHA — Security Reasoner Agent
Takes structured findings from tools and applies AI reasoning to:
- Determine root cause
- Assess exploitability
- Build attack paths
- Classify confidence
- Generate evidence summaries
"""
from __future__ import annotations

import json
from typing import Dict, Any, List, Optional
from agents.llm_client import LLM_EXTERNAL_ERRORS, llm
import structlog

log = structlog.get_logger()

SYSTEM_PROMPT = """You are RAKSHA's Security Reasoner — a senior application security engineer.

You receive structured evidence about a potential vulnerability and must reason about it carefully.

You MUST return valid JSON with these exact keys:
{
  "confidence": "confirmed|likely|possible|false_positive",
  "confidence_pct": <integer 0-100>,
  "is_exploitable": <true|false>,
  "root_cause": "<1-2 sentence technical root cause>",
  "attack_path": ["step 1", "step 2", "step 3", ...],
  "impact": "<1-2 sentence impact description>",
  "evidence": "<specific evidence from the code that supports this finding>",
  "ai_reasoning": "<2-3 sentences explaining why RAKSHA believes this is or is not a genuine vulnerability>",
  "false_positive_reason": "<null or reason if false positive>"
}

Rules:
- NEVER claim CONFIRMED unless there is direct evidence of unsanitized user input reaching a dangerous operation
- Use LIKELY when the pattern is present but full data flow is unclear
- Use POSSIBLE for architectural concerns or indirect risks
- Use FALSE_POSITIVE if you can determine the code is actually safe
- Be precise and technical — avoid generic descriptions
- Your reasoning should be evidence-backed, not speculative
"""


async def reason_about_finding(
    finding_type: str,
    severity: str,
    file_path: str,
    line_number: int,
    code_snippet: str,
    tool_message: str,
    architecture_context: Dict[str, Any],
    surrounding_code: Optional[str] = None,
) -> Dict[str, Any]:
    """Apply AI reasoning to a single finding. Returns enriched finding data."""

    user_prompt = f"""VULNERABILITY FINDING:
Type: {finding_type}
Severity: {severity}
File: {file_path}
Line: {line_number}

Code snippet:
```
{code_snippet[:800]}
```

Tool message: {tool_message[:500]}

{"Additional context (surrounding code):" + chr(10) + surrounding_code[:600] if surrounding_code else ""}

Architecture context:
- Technologies: {', '.join(architecture_context.get('technologies', []))}
- Has authentication: {architecture_context.get('features', {}).get('authentication', 'unknown')}
- External HTTP calls: {architecture_context.get('features', {}).get('external_http', False)}
- Command execution: {architecture_context.get('features', {}).get('command_execution', False)}

Reason about this finding and return your analysis as JSON."""

    try:
        result = await llm.complete_json(
            system_prompt=SYSTEM_PROMPT,
            user_prompt=user_prompt,
            max_tokens=1024,
        )
        return result
    except LLM_EXTERNAL_ERRORS as e:
        log.error("Security reasoning failed", error=str(e))
        # Return a safe fallback — preserve the scanner's confidence, do NOT
        # fabricate AI confidence.  confidence_pct=0 means "not AI-evaluated".
        return {
            "confidence_pct": 0,
            "is_exploitable": None,
            "ai_reasoning": "AI reasoning unavailable. Scanner finding preserved; manual review required.",
            "false_positive_reason": None,
        }


async def reason_batch(
    findings: List[Dict[str, Any]],
    architecture_context: Dict[str, Any],
) -> List[Dict[str, Any]]:
    """Reason about multiple findings. Returns list with AI enrichment added."""
    enriched = []
    for finding in findings:
        reasoning = await reason_about_finding(
            finding_type=finding.get("vulnerability_type", "Unknown"),
            severity=finding.get("severity", "medium"),
            file_path=finding.get("file_path", ""),
            line_number=finding.get("line_number", 0),
            code_snippet=finding.get("code_snippet", ""),
            tool_message=finding.get("message", finding.get("description", "")),
            architecture_context=architecture_context,
            surrounding_code=finding.get("surrounding_code"),
        )
        enriched.append({**finding, **reasoning})
    return enriched
