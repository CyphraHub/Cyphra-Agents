import math
from typing import List, Dict

def compute_shannon_entropy(addresses: List[str]) -> float:
    """
    Compute Shannon entropy (bits) of an address sequence.
    """
    if not addresses:
        return 0.0
    freq: Dict[str, int] = {}
    for a in addresses:
        freq[a] = freq.get(a, 0) + 1
    total = len(addresses)
    entropy = 0.0
    for count in freq.values():
        p = count / total
        entropy -= p * math.log2(p)
    return round(entropy, 4)

def normalized_entropy(addresses: List[str]) -> float:
    """
    Normalize entropy score between 0.0 and 1.0 based on maximum possible entropy.
    """
    if not addresses:
        return 0.0
    unique_count = len(set(addresses))
    max_entropy = math.log2(unique_count) if unique_count > 1 else 1.0
    raw_entropy = compute_shannon_entropy(addresses)
    return round(raw_entropy / max_entropy, 4) if max_entropy > 0 else 0.0

def entropy_distribution(addresses: List[str]) -> Dict[str, float]:
    """
    Return probability distribution of addresses contributing to entropy.
    """
    if not addresses:
        return {}
    total = len(addresses)
    return {a: round(count / total, 4) for a, count in {a: addresses.count(a) for a in set(addresses)}.items()}

def is_high_entropy(addresses: List[str], threshold: float = 0.8) -> bool:
    """
    Check if normalized entropy exceeds given threshold.
    """
    return normalized_entropy(addresses) >= threshold
