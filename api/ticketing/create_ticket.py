from sqlalchemy.orm import Session
from sqlalchemy import text, func
from datetime import datetime, timezone

# Import via relative path; works when run from api/
from database import Ticket


def create_ticket(
    session_id: str,
    customer: str,
    issue: str,
    priority: str,
    trigger: str,
    db: Session,
) -> dict | None:
    """
    Writes a ticket to Supabase and returns its data.
    ID is derived from the current count so it never relies on module-level state.
    """
    try:
        count      = db.query(func.count(Ticket.id)).scalar() or 0
        ticket_ref = f"#{1050 + count + 1}"

        ticket = Ticket(
            ticket_ref = ticket_ref,
            session_id = session_id,
            customer   = customer,
            issue      = issue[:256],
            priority   = priority,
            status     = "open",
            trigger    = trigger,
        )
        db.add(ticket)
        db.commit()
        db.refresh(ticket)

        now = datetime.now(timezone.utc)
        return {
            "ticket_id": ticket_ref,
            "customer":  customer,
            "issue":     issue[:52] + "…" if len(issue) > 52 else issue,
            "priority":  priority,
            "status":    "open",
            "trigger":   trigger,
            "ts":        f"{now.hour}:{now.minute:02d}",
        }
    except Exception:
        db.rollback()
        return None


def get_all_tickets(db: Session) -> list[dict]:
    """Return all tickets ordered by most recent first."""
    try:
        rows = db.query(Ticket).order_by(Ticket.ts.desc()).limit(200).all()
        return [
            {
                "id":       t.ticket_ref,
                "customer": t.customer,
                "issue":    t.issue,
                "pri":      t.priority,
                "status":   t.status,
                "trigger":  t.trigger,
                "ts":       t.ts.strftime("%H:%M") if t.ts else "",
            }
            for t in rows
        ]
    except Exception:
        return []
