"""ZORQEN — In-process assessment event bus for live SSE progress.

The orchestrator publishes progress events after every database write, so the
database remains the single source of truth and the event stream is a
fire-and-forget notification layer. If no client is subscribed, events are
dropped — polling against the API still reflects the same state.
"""
from __future__ import annotations

import asyncio
from typing import Any, Dict, Optional, Set

import structlog

log = structlog.get_logger()


class AssessmentEventBus:
    """Fan-out bus: assessment_id -> set of subscriber queues."""

    def __init__(self) -> None:
        self._subscribers: Dict[str, Set[asyncio.Queue]] = {}

    def subscribe(self, assessment_id: str) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue(maxsize=200)
        self._subscribers.setdefault(assessment_id, set()).add(queue)
        return queue

    def unsubscribe(self, assessment_id: str, queue: asyncio.Queue) -> None:
        subscribers = self._subscribers.get(assessment_id)
        if not subscribers:
            return
        subscribers.discard(queue)
        if not subscribers:
            self._subscribers.pop(assessment_id, None)

    async def publish(self, assessment_id: str, event: Dict[str, Any]) -> None:
        subscribers = self._subscribers.get(assessment_id)
        if not subscribers:
            return
        for queue in list(subscribers):
            try:
                queue.put_nowait(event)
            except asyncio.QueueFull:
                # Slow consumer — drop the oldest event so the stream stays live.
                try:
                    queue.get_nowait()
                    queue.put_nowait(event)
                except (asyncio.QueueEmpty, asyncio.QueueFull):
                    pass

    def subscriber_count(self, assessment_id: str) -> int:
        return len(self._subscribers.get(assessment_id, set()))


event_bus = AssessmentEventBus()


async def publish_progress(
    assessment_id: str,
    *,
    stage: str,
    progress: int,
    status: str = "running",
    message: Optional[str] = None,
    file: Optional[str] = None,
    files_scanned: Optional[int] = None,
    total_files: Optional[int] = None,
    eta_seconds: Optional[int] = None,
    extra: Optional[Dict[str, Any]] = None,
) -> None:
    """Publish a canonical progress event for the console.

    Shape: {"type": "progress", "stage": "Dependencies Scanned",
            "progress": 45, ...telemetry}
    """
    event: Dict[str, Any] = {
        "type": "progress",
        "stage": stage,
        "progress": progress,
        "status": status,
    }
    if message:
        event["message"] = message
    if file:
        event["file"] = file
    if files_scanned is not None:
        event["filesScanned"] = files_scanned
    if total_files is not None:
        event["totalFiles"] = total_files
    if eta_seconds is not None:
        event["etaSeconds"] = eta_seconds
    if extra:
        event.update(extra)
    await event_bus.publish(assessment_id, event)