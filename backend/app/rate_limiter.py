import time
import threading
from collections import deque
from typing import Deque, Dict


class SlidingWindowRateLimiter:
    """
    A lightweight, thread-safe, in-memory sliding window rate limiter.

    For each client key (typically the source IP), a deque of request
    timestamps is maintained. On every check, timestamps older than the
    configured window are evicted from the left of the deque, and the
    request is allowed only if the remaining count is below the limit.

    This is O(1) amortized per request and requires no external
    dependencies (e.g. Redis), making it ideal for a single-instance
    Hetzner Cloud deployment.
    """

    def __init__(self, max_requests: int, window_seconds: float) -> None:
        self._max_requests = max_requests
        self._window_seconds = window_seconds
        self._hits: Dict[str, Deque[float]] = {}
        self._lock = threading.Lock()

    def is_allowed(self, key: str) -> bool:
        now = time.monotonic()
        window_start = now - self._window_seconds

        with self._lock:
            timestamps = self._hits.setdefault(key, deque())

            while timestamps and timestamps[0] < window_start:
                timestamps.popleft()

            if len(timestamps) >= self._max_requests:
                return False

            timestamps.append(now)
            return True

    def remaining(self, key: str) -> int:
        now = time.monotonic()
        window_start = now - self._window_seconds
        with self._lock:
            timestamps = self._hits.get(key)
            if not timestamps:
                return self._max_requests
            while timestamps and timestamps[0] < window_start:
                timestamps.popleft()
            return max(0, self._max_requests - len(timestamps))

    def retry_after(self, key: str) -> float:
        with self._lock:
            timestamps = self._hits.get(key)
            if not timestamps:
                return 0.0
            oldest = timestamps[0]
            return max(0.0, self._window_seconds - (time.monotonic() - oldest))

    def cleanup(self) -> None:
        """Periodically drop empty entries to bound memory usage."""
        now = time.monotonic()
        window_start = now - self._window_seconds
        with self._lock:
            stale_keys = []
            for key, timestamps in self._hits.items():
                while timestamps and timestamps[0] < window_start:
                    timestamps.popleft()
                if not timestamps:
                    stale_keys.append(key)
            for key in stale_keys:
                del self._hits[key]
