from typing import List, Tuple, Dict, Any
import statistics

def generate_activity_heatmap(
    timestamps: List[int],
    counts: List[int],
    buckets: int = 10,
    normalize: bool = True
) -> List[float]:
    """
    Bucket activity counts into 'buckets' time intervals,
    returning either raw counts or normalized [0.0–1.0].
    - timestamps: list of epoch ms timestamps
    - counts: list of integer counts per timestamp
    """
    if not timestamps or not counts or len(timestamps) != len(counts):
        return []

    t_min, t_max = min(timestamps), max(timestamps)
    span = t_max - t_min or 1
    bucket_size = span / buckets

    agg = [0] * buckets
    for t, c in zip(timestamps, counts):
        idx = min(buckets - 1, int((t - t_min) / bucket_size))
        agg[idx] += c

    if normalize:
        m = max(agg) or 1
        return [round(val / m, 4) for val in agg]
    return agg

def summarize_heatmap(values: List[float]) -> Dict[str, Any]:
    """
    Summarize heatmap values with statistics.
    Returns total, mean, median, stdev, max_bucket index.
    """
    if not values:
        return {"total": 0, "mean": 0, "median": 0, "stdev": 0, "max_bucket": None}
    return {
        "total": sum(values),
        "mean": round(statistics.mean(values), 4),
        "median": round(statistics.median(values), 4),
        "stdev": round(statistics.pstdev(values), 4) if len(values) > 1 else 0,
        "max_bucket": max(range(len(values)), key=lambda i: values[i]),
    }

def heatmap_as_pairs(values: List[float]) -> List[Tuple[int, float]]:
    """
    Convert heatmap list into (bucket_index, value) pairs.
    """
    return list(enumerate(values))

def merge_heatmaps(*maps: List[List[float]]) -> List[float]:
    """
    Merge multiple heatmaps by summing bucket values elementwise.
    """
    if not maps:
        return []
    length = max(len(m) for m in maps)
    merged = [0.0] * length
    for m in maps:
        for i, v in enumerate(m):
            merged[i] += v
    return [round(v, 4) for v in merged]
