def compute_priority(sentiment: str, drift: dict, escalate: bool, conf: float) -> str:
    """
    Returns 'high' | 'med' | 'low'.
    High: explicit escalation signal OR rapidly degrading drift
    Med:  negative sentiment OR degrading drift OR low confidence
    Low:  everything else
    """
    if escalate or drift.get("trend") == "rapidly_degrading":
        return "high"
    if sentiment == "negative" or drift.get("trend") == "degrading" or conf < 0.40:
        return "med"
    return "low"


def should_create_ticket(sentiment: str, drift: dict, escalate: bool, conf: float) -> tuple[bool, str]:
    """
    Returns (create: bool, trigger: str)
    Trigger strings mirror the JS frontend labels so the UI can display them consistently.
    """
    if escalate:
        return True, "Frustration keywords"
    if drift.get("trend") == "rapidly_degrading":
        return True, "Drift detection"
    if sentiment == "negative" and drift.get("trend") == "degrading":
        return True, "Sustained negative sentiment"
    if conf < 0.45:
        return True, "Auto-ticket"
    return False, ""
