"""In-memory retrieval metrics for health and diagnostics."""
from __future__ import annotations

from collections import deque
from statistics import mean
from threading import Lock
from time import time
from typing import Any


class RetrievalMetrics:
    def __init__(self, maxlen: int = 250):
        self._events: deque[dict[str, Any]] = deque(maxlen=maxlen)
        self._lock = Lock()

    def record(self, event: dict[str, Any]) -> None:
        with self._lock:
            self._events.append({"timestamp": time(), **event})

    def snapshot(self) -> dict[str, Any]:
        with self._lock:
            events = list(self._events)

        if not events:
            return {"count": 0, "avg_latency_ms": 0, "p95_latency_ms": 0, "recent": []}

        latencies = sorted(float(event.get("total_latency_ms", 0)) for event in events)
        p95_index = min(len(latencies) - 1, int(len(latencies) * 0.95))
        return {
            "count": len(events),
            "avg_latency_ms": round(mean(latencies), 2),
            "p95_latency_ms": round(latencies[p95_index], 2),
            "avg_candidates": round(mean(float(event.get("candidate_count", 0)) for event in events), 2),
            "avg_final_chunks": round(mean(float(event.get("final_count", 0)) for event in events), 2),
            "recent": events[-10:],
        }


retrieval_metrics = RetrievalMetrics()
