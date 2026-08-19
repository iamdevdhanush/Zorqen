"""RAKSHA — Security Reasoner Agent
Takes structured findings from tools and applies AI reasoning to:
- Determine root cause
- Assess exploitability
- Build attack paths
- Classify confidence
- Generate evidence summaries

Quota policy: findings are reasoned about in SMALL BATCHES (default 5) with a
single LLM call per batch. Only the bounded finding context (type, file, line,
snippet, tool message) reaches the model — never the whole repository. When the
model is unavailable or a batch fails, the scanner's original confidence is
preserved, confidence_pct stays 0 ("not AI-evaluated"), and an explicit
"AI reasoning unavailable" message is recorded. No AI output is ever fabricated.
"""
from __future__ import annotations

import json
from typing import Dict, Any, List, Optional
from agents.llm_client import LLM_EXTERNAL_ERRORS, ModelNotFoundError, llm
import structlog

log = structlog.get_logger()

SYSTEM_PROMPT = """You are RAKSHA's Security Reasoner — a senior application security engineer.

You receive structured evidence about potential vulnerabilities and must reason about them carefully.

You MUST return valid JSON with this exact shape:
{"findings": [{"index": 1, "confidence": "confirmed|likely|possible|false_positive", "confidence_pct": <integer 0-100>, "is_exploitable": <true|false>, "root_cause": "<1-2 sentence technical root cause>", "attack_path": ["step 1", "step 2", ...], "impact": "<1-2 sentence impact description>", "evidence": "<specific evidence from the code that supports this finding>", "ai_reasoning": "<2-3 sentences explaining why RAKSHA believes this is or is not a genuine vulnerability>", "false_positive_reason": "<null or reason if false positive>"}]}

Rules:
- Answer for EVERY finding index you were given. Never invent findings that were not listed.
- NEVER claim CONFIRMED unless there is direct evidence of unsanitized user input reaching a dangerous operation
- Use LIKELY when the pattern is present but full data flow is unclear
- Use POSSIBLE for architectural concerns or indirect risks
- Use FALSE_POSITIVE if you can determine the code is actually safe
- Be precise and technical — avoid generic descriptions
- Your reasoning should be evidence-backed, not speculative
"""

BATCH_SIZE = 5


def _unavailable_fallback(finding: Dict[str, Any], reason: str = "") -> Dict[str, Any]:
    """AI-unavailable fallback: preserve the scanner's confidence exactly.

    confidence_pct=0 means "not AI-evaluated". No confidence or reasoning is
    fabricated here.
    """
    message = (
        f"AI reasoning unavailable — model '{reason}' not found. Scanner finding "
        "preserved; manual review required."
        if reason
        else "AI reasoning unavailable. Scanner finding preserved; manual review required."
    )
    return {
        **finding,
        "confidence_pct": 0,
        "is_exploitable": None,
        "ai_reasoning": message,
        "false_positive_reason": None,
    }


async def _reason_chunk(
    findings: List[Dict[str, Any]],
    architecture_context: Dict[str, Any],
) -> List[Dict[str, Any]]:
    """Reason about one batch of findings with a single LLM call."""
    numbered = []
    for i, f in enumerate(findings, start=1):
        numbered.append(
            f"{i}. Type: {f.get('vulnerability_type', 'Unknown')}\n"
            f"   Severity: {f.get('severity', 'medium')}\n"
            f"   File: {f.get('file_path', '')}\n"
            f"   Line: {f.get('line_number', 0)}\n"
            f"   Code snippet:\n"
            f"   ```\n{f.get('code_snippet', '')[:800]}\n   ```\n"
            f"   Tool message: {f.get('message', '')[:500]}"
        )

    user_prompt = (
        "FINDINGS TO REASON ABOUT:\n" + "\n\n".join(numbered) +
        "\n\nArchitecture context:\n"
        f"- Technologies: {', '.join(architecture_context.get('technologies', []))}\n"
        f"- Has authentication: {architecture_context.get('features', {}).get('authentication', 'unknown')}\n"
        f"- External HTTP calls: {architecture_context.get('features', {}).get('external_http', False)}\n"
        f"- Command execution: {architecture_context.get('features', {}).get('command_execution', False)}\n"
        "\nReason about each finding and return your analysis as JSON."
    )

    result = await llm.complete_json(
        system_prompt=SYSTEM_PROMPT,
        user_prompt=user_prompt,
        max_tokens=2048,
    )

    parsed = result.get("findings", []) if isinstance(result, dict) else []
    by_index = {int(item.get("index", 0)): item for item in parsed if isinstance(item, dict)}

    enriched = []
    for i, f in enumerate(findings, start=1):
        item = by_index.get(i)
        if item:
            # Keep the scanner's raw fields; merge only the AI reasoning keys.
            enriched.append({
                **f,
                "confidence": item.get("confidence", f.get("confidence", "possible")),
                "confidence_pct": int(item.get("confidence_pct") or 0),
                "is_exploitable": item.get("is_exploitable"),
                "root_cause": item.get("root_cause", ""),
                "attack_path": item.get("attack_path", []),
                "impact": item.get("impact", ""),
                "evidence": item.get("evidence", ""),
                "ai_reasoning": item.get("ai_reasoning", ""),
                "false_positive_reason": item.get("false_positive_reason"),
            })
        else:
            enriched.append(_unavailable_fallback(f))
    return enriched


async def reason_batch(
    findings: List[Dict[str, Any]],
    architecture_context: Dict[str, Any],
    batch_size: int = BATCH_SIZE,
) -> tuple[List[Dict[str, Any]], str]:
    """Reason about findings in small batches.

    Returns ``(enriched, unavailable_reason)``. Each batch is ONE Groq call.
    If the model is not found, remaining batches are NOT attempted (quota
    protection) and the returned reason records the failure.

    The scanner's confidence is preserved whenever AI output is unavailable —
    AI results are never fabricated.
    """
    if not findings:
        return [], ""

    enriched: List[Dict[str, Any]] = []
    unavailable_reason = ""

    for start in range(0, len(findings), batch_size):
        chunk = findings[start:start + batch_size]
        try:
            enriched.extend(await _reason_chunk(chunk, architecture_context))
        except ModelNotFoundError as e:
            if not unavailable_reason:
                unavailable_reason = str(e)
                log.warning(
                    "Groq model unavailable — AI reasoning skipped for remaining findings",
                    model=e.model,
                )
            # Quota protection: no further LLM calls. Remaining findings keep
            # the scanner's confidence via the no-fabrication fallback so no
            # finding is ever silently dropped from the results.
            remaining = findings[start + batch_size:]
            enriched.extend(_unavailable_fallback(f, e.model) for f in chunk)
            enriched.extend(_unavailable_fallback(f, e.model) for f in remaining)
            return enriched, unavailable_reason
        except LLM_EXTERNAL_ERRORS as e:
            log.warning("AI reasoning unavailable for batch", error=str(e))
            enriched.extend(_unavailable_fallback(f) for f in chunk)

    return enriched, unavailable_reason


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
    """Apply AI reasoning to a single finding. Returns enriched finding data.

    Convenience wrapper over reason_batch for a single finding.
    """
    raw = {
        "vulnerability_type": finding_type,
        "severity": severity,
        "file_path": file_path,
        "line_number": line_number,
        "code_snippet": code_snippet,
        "message": tool_message,
        "confidence": "possible",
    }
    enriched, _ = await reason_batch([raw], architecture_context)
    return enriched[0] if enriched else {}
