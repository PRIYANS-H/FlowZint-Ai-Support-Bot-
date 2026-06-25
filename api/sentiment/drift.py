"""
Python port of the JS calcDrift() — identical recency-weighted slope math.
Operates on a list of sentiment strings pulled from the DB for this session.
"""
from sqlalchemy.orm import Session
from sqlalchemy import text


DRIFT_CONFIG = {
    "rapidly_degrading": {"trend": "rapidly_degrading", "score": 0.08, "label": "Rapidly degrading", "color": "#E24B4A"},
    "degrading":         {"trend": "degrading",         "score": 0.28, "label": "Degrading",         "color": "#EF9F27"},
    "improving":         {"trend": "improving",         "score": 0.88, "label": "Improving",          "color": "#1D9E75"},
    "stable":            {"trend": "stable",            "score": 0.5,  "label": "Stable",             "color": "#534AB7"},
}


def calc_drift(history: list[str]) -> dict:
    """Accepts list of 'positive'|'neutral'|'negative' strings."""
    if len(history) < 2:
        return DRIFT_CONFIG["stable"]

    _map = {"positive": 1, "neutral": 0, "negative": -1}
    vals = [_map.get(h, 0) for h in history]

    diffs = [(vals[i] - vals[i - 1]) * (i + 1) for i in range(1, len(vals))]
    avg   = sum(diffs) / len(diffs)

    if avg < -0.5: return DRIFT_CONFIG["rapidly_degrading"]
    if avg < -0.1: return DRIFT_CONFIG["degrading"]
    if avg >  0.3: return DRIFT_CONFIG["improving"]
    return DRIFT_CONFIG["stable"]


def get_session_drift(session_id: str, db: Session) -> dict:
    """Pull recent sentiment history from DB and compute drift."""
    try:
        rows = db.execute(text("""
            SELECT sentiment FROM sentiment_logs
            WHERE session_id = :sid
            ORDER BY ts ASC
            LIMIT 20
        """), {"sid": session_id}).fetchall()
        history = [r.sentiment for r in rows]
        return calc_drift(history)
    except Exception:
        return DRIFT_CONFIG["stable"]
