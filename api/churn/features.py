from sqlalchemy.orm import Session
from sqlalchemy import text


def get_session_features(session_id: str, db: Session) -> dict:
    """
    Extract churn-relevant signals for a session from the DB.
    Returns counts used by predict.py to compute a weighted risk score.
    """
    try:
        neg = db.execute(text("""
            SELECT COUNT(*) FROM sentiment_logs
            WHERE session_id = :sid AND sentiment = 'negative'
        """), {"sid": session_id}).scalar() or 0

        tickets = db.execute(text("""
            SELECT COUNT(*) FROM tickets WHERE session_id = :sid
        """), {"sid": session_id}).scalar() or 0

        escalations = db.execute(text("""
            SELECT COUNT(*) FROM tickets
            WHERE session_id = :sid AND status = 'escalated'
        """), {"sid": session_id}).scalar() or 0

        high_pri = db.execute(text("""
            SELECT COUNT(*) FROM tickets
            WHERE session_id = :sid AND priority = 'high'
        """), {"sid": session_id}).scalar() or 0

        total_turns = db.execute(text("""
            SELECT COUNT(*) FROM messages
            WHERE session_id = :sid AND role = 'user'
        """), {"sid": session_id}).scalar() or 0

        return {
            "neg_count":        int(neg),
            "ticket_count":     int(tickets),
            "escalation_count": int(escalations),
            "high_pri_count":   int(high_pri),
            "total_turns":      int(total_turns),
        }
    except Exception:
        return {"neg_count": 0, "ticket_count": 0, "escalation_count": 0, "high_pri_count": 0, "total_turns": 0}
