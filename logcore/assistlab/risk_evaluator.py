import math
from typing import Dict, Any

def calculate_risk_score(price_change_pct: float, liquidity_usd: float, flags_mask: int) -> float:
    """
    Compute a 0–100 risk score.
    - price_change_pct: percent change over period (e.g. +5.0 for +5%)
    - liquidity_usd: total liquidity in USD
    - flags_mask: integer bitmask of risk flags; each set bit adds a penalty
    """
    # volatility component (max 50)
    vol_score = min(abs(price_change_pct) / 10, 1) * 50

    # liquidity component: more liquidity = lower risk, up to 30
    if liquidity_usd > 0:
        liq_score = max(0.0, 30 - (math.log10(liquidity_usd) * 5))
    else:
        liq_score = 30.0

    # flag penalty: 5 points per bit set
    flag_count = bin(flags_mask).count("1")
    flag_score = flag_count * 5

    raw_score = vol_score + liq_score + flag_score
    return min(round(raw_score, 2), 100.0)

def breakdown_risk(price_change_pct: float, liquidity_usd: float, flags_mask: int) -> Dict[str, Any]:
    """
    Detailed breakdown of all components contributing to risk score.
    """
    vol_score = min(abs(price_change_pct) / 10, 1) * 50
    liq_score = max(0.0, 30 - (math.log10(liquidity_usd) * 5)) if liquidity_usd > 0 else 30.0
    flag_count = bin(flags_mask).count("1")
    flag_score = flag_count * 5
    raw_score = vol_score + liq_score + flag_score
    final = min(round(raw_score, 2), 100.0)

    return {
        "volatility_component": round(vol_score, 2),
        "liquidity_component": round(liq_score, 2),
        "flag_penalty": flag_score,
        "flag_count": flag_count,
        "final_score": final,
    }

def classify_risk(score: float) -> str:
    """
    Classify the numeric risk score into categories.
    """
    if score < 20:
        return "very low"
    elif score < 40:
        return "low"
    elif score < 60:
        return "moderate"
    elif score < 80:
        return "high"
    return "critical"

def safe_risk_eval(price_change_pct: float, liquidity_usd: float, flags_mask: int) -> Dict[str, Any]:
    """
    Compute score, breakdown, and classification in one call.
    """
    score = calculate_risk_score(price_change_pct, liquidity_usd, flags_mask)
    return {
        "score": score,
        "classification": classify_risk(score),
        "details": breakdown_risk(price_change_pct, liquidity_usd, flags_mask),
    }
