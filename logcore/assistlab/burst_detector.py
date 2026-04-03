from typing import List, Dict, Any, Optional
import statistics

def detect_volume_bursts(
    volumes: List[float],
    threshold_ratio: float = 1.5,
    min_interval: int = 1
) -> List[Dict[str, float]]:
    """
    Identify indices where volume jumps by threshold_ratio over previous.
    Returns list of dicts: {index, previous, current, ratio}.
    """
    events: List[Dict[str, float]] = []
    last_idx = -min_interval
    for i in range(1, len(volumes)):
        prev, curr = volumes[i - 1], volumes[i]
        ratio = (curr / prev) if prev > 0 else float("inf")
        if ratio >= threshold_ratio and (i - last_idx) >= min_interval:
            events.append({
                "index": float(i),
                "previous": prev,
                "current": curr,
                "ratio": round(ratio, 4),
            })
            last_idx = i
    return events

def summarize_bursts(events: List[Dict[str, float]]) -> Dict[str, Any]:
    """
    Summarize bursts: count, average ratio, maximum ratio, indices of peaks.
    """
    if not events:
        return {"count": 0, "avg_ratio": 0, "max_ratio": 0, "max_indices": []}
    ratios = [e["ratio"] for e in events]
    max_ratio = max(ratios)
    max_indices = [int(e["index"]) for e in events if e["ratio"] == max_ratio]
    return {
        "count": len(events),
        "avg_ratio": round(statistics.mean(ratios), 4),
        "max_ratio": max_ratio,
        "max_indices": max_indices,
    }

def filter_bursts(events: List[Dict[str, float]], min_ratio: float) -> List[Dict[str, float]]:
    """
    Return only bursts with ratio >= min_ratio.
    """
    return [e for e in events if e["ratio"] >= min_ratio]

def get_burst_at(events: List[Dict[str, float]], index: int) -> Optional[Dict[str, float]]:
    """
    Retrieve burst at a given index, if exists.
    """
    for e in events:
        if int(e["index"]) == index:
            return e
    return None
