from sqlalchemy.orm import Session
from sqlalchemy import text
from .features import get_session_features
from .recommend import recommend_action

# Weights: how much each factor contributes to the 0–1 risk score
_WEIGHTS = {
    "neg_count":        0.25,
    "ticket_count":     0.20,
    "escalation_count": 0.35,
    "high_pri_count":   0.20,
}
_MAX = {
    "neg_count":        5,
    "ticket_count":     4,
    "escalation_count": 2,
    "high_pri_count":   3,
}


def predict_churn(session_id: str, customer: str, db: Session) -> dict:
    """
    Compute a 0–1 churn risk score and upsert into churn_scores.
    Returns a churn record dict for the API response.
    """
    feat  = get_session_features(session_id, db)
    score = sum(
        _WEIGHTS[k] * min(feat[k] / _MAX[k], 1.0)
        for k in _WEIGHTS
    )
    score = round(score, 4)

    risk_level = "high" if score >= 0.55 else "med" if score >= 0.25 else "low"
    driver, action = recommend_action(feat, risk_level)

    try:
        db.execute(text("""
            INSERT INTO churn_scores (session_id, customer, score, risk_level, driver, action)
            VALUES (:sid, :cust, :score, :risk, :driver, :action)
            ON CONFLICT (session_id) DO UPDATE
            SET score = EXCLUDED.score, risk_level = EXCLUDED.risk_level,
                driver = EXCLUDED.driver, action = EXCLUDED.action, ts = now()
        """), {"sid": session_id, "cust": customer, "score": score, "risk": risk_level,
               "driver": driver, "action": action})
        db.commit()
    except Exception:
        db.rollback()

    return {"name": customer, "risk": risk_level, "score": score, "driver": driver, "action": action}


def get_all_churn_risks(db: Session) -> list[dict]:
    """Return top churn risks across all sessions, ordered by score desc."""
    try:
        rows = db.execute(text("""
            SELECT customer, risk_level, score, driver, action
            FROM churn_scores
            ORDER BY score DESC
            LIMIT 20
        """)).fetchall()
        return [
            {"name": r.customer, "risk": r.risk_level, "score": r.score,
             "driver": r.driver, "action": r.action}
            for r in rows
        ]
    except Exception:
        return []
