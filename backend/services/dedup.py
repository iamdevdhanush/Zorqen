"""ZORQEN — Finding Fingerprinting & Deduplication
Deterministic fingerprinting so the same vulnerability in the same location
always maps to the same stable slug (F-XXXX) across runs.
"""
from __future__ import annotations

import hashlib
from typing import Dict, List, Optional

SEVERITY_RANK = {"critical": 5, "high": 4, "medium": 3, "low": 2, "info": 1}
CONFIDENCE_RANK = {"confirmed": 4, "likely": 3, "possible": 2, "false_positive": 1}


def fingerprint(
    file_path: Optional[str],
    line_number: Optional[int],
    rule_id: Optional[str],
    vulnerability_type: Optional[str],
) -> str:
    """Stable hash over the primary identifying attributes of a finding."""
    key = "|".join(
        [
            (file_path or "").strip().lower(),
            str(line_number or 0),
            (rule_id or "").strip().lower(),
            (vulnerability_type or "").strip().lower(),
        ]
    )
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


def slug_for(file_path: Optional[str], line_number: Optional[int], rule_id: Optional[str],
             vulnerability_type: Optional[str]) -> str:
    """Human-friendly stable id, e.g. F-8F3A2C01 (first 8 hex chars of the fingerprint)."""
    return "F-" + fingerprint(file_path, line_number, rule_id, vulnerability_type)[:8].upper()


def _sort_key(f: Dict) -> tuple:
    return (
        SEVERITY_RANK.get((f.get("severity") or "info").lower(), 0),
        CONFIDENCE_RANK.get((f.get("confidence") or "possible").lower(), 0),
        f.get("confidence_pct") or 0,
    )


def dedupe_findings(raw: List[Dict], *, max_items: Optional[int] = None) -> List[Dict]:
    """Drop exact duplicates (same fingerprint), keeping the highest-signal instance.

    Items gain a deterministic 'slug' key. Order is stable by (severity desc, confidence).
    """
    best: Dict[str, Dict] = {}
    for item in raw:
        fp = fingerprint(
            item.get("file_path"),
            item.get("line_number"),
            item.get("rule_id"),
            item.get("vulnerability_type"),
        )
        item["fingerprint"] = fp
        item["slug"] = slug_for(
            item.get("file_path"),
            item.get("line_number"),
            item.get("rule_id"),
            item.get("vulnerability_type"),
        )
        existing = best.get(fp)
        if existing is None or _sort_key(item) > _sort_key(existing):
            best[fp] = item

    ordered = sorted(best.values(), key=_sort_key, reverse=True)
    return ordered[:max_items] if max_items else ordered
