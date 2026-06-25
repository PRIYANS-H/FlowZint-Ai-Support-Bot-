RECOMMENDATIONS = {
    "escalation":   "Priority escalation to senior agent",
    "high_tickets": "Assign dedicated account manager",
    "neg_sentiment":"Personalised discount offer — ₹200 voucher",
    "unresolved":   "Re-engagement campaign with expedited resolution",
    "general":      "Proactive outreach within 24 hours",
}


def recommend_action(features: dict, risk_level: str) -> tuple[str, str]:
    """
    Returns (driver: str, action: str) based on the most prominent feature.
    """
    if features["escalation_count"] >= 1:
        return "Multiple escalations", RECOMMENDATIONS["escalation"]
    if features["high_pri_count"] >= 2:
        return f"{features['high_pri_count']} high-priority tickets", RECOMMENDATIONS["high_tickets"]
    if features["neg_count"] >= 3:
        return "Sustained negative sentiment", RECOMMENDATIONS["neg_sentiment"]
    if features["ticket_count"] >= 2:
        return f"{features['ticket_count']} unresolved tickets", RECOMMENDATIONS["unresolved"]
    return "Recent negative interaction", RECOMMENDATIONS["general"]
