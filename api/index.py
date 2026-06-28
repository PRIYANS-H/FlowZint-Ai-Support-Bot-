import sys, os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Ensure local modules are importable when running as Vercel Lambda
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text

from database import get_db, create_tables, Message as DBMessage, SentimentLog
from rag.retrieve import retrieve_faq
from rag.self_correct import store_correction, get_pending_reviews
from sentiment.analyze import analyze
from sentiment.drift import get_session_drift
from ticketing.priority import compute_priority, should_create_ticket
from ticketing.create_ticket import create_ticket, get_all_tickets
from churn.predict import predict_churn, get_all_churn_risks
from clustering.live_clusters import get_live_clusters
from llm.groq_generate import generate_answer, summarize_issue, suggest_reply


app = FastAPI(title="Flowzint API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    try:
        create_tables()
    except Exception as e:
        print(f"[startup] DB table creation skipped: {e}")


# ── Request / Response schemas ────────────────────────────────────────

class ChatRequest(BaseModel):
    text:       str
    session_id: str = "default"
    customer:   str = "Current User"

class ChatResponse(BaseModel):
    answer:        str | None
    conf:          float
    cat:           str
    sentiment:     str
    hinglish:      bool
    self_corrected:bool
    escalated:     bool
    fallback:      bool
    drift:         dict
    ticket_id:     str | None = None
    trigger:       str | None = None
    summary:       str | None = None

class CorrectionRequest(BaseModel):
    question:       str
    correct_answer: str
    session_id:     str = "default"


# ── POST /api/chat ────────────────────────────────────────────────────

@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest, db: Session = Depends(get_db)):
    text_in = req.text.strip()

    # 1. Sentiment analysis
    sent_result = analyze(text_in)
    sentiment   = sent_result["sentiment"]
    hinglish    = sent_result["hinglish"]
    escalate    = sent_result["escalate"]

    # 2 & 3. Persist user message + sentiment log
    _db_ok = False
    if db:
        try:
            db.add(DBMessage(session_id=req.session_id, role="user", text=text_in, sentiment=sentiment))
            db.add(SentimentLog(session_id=req.session_id, sentiment=sentiment, score=sent_result.get("conf_sent", 0.65)))
            db.commit()
            _db_ok = True
        except Exception:
            try: db.rollback()
            except Exception: pass

    # 4. Compute drift from full session history
    drift = get_session_drift(req.session_id, db) if _db_ok else {"trend": "stable", "score": 0.5, "label": "Stable", "color": "#534AB7"}

    # 5. RAG retrieval
    if _db_ok:
        try:
            rag = retrieve_faq(text_in, db)
        except Exception:
            rag = {"answer": None, "conf": 0.18, "cat": "unknown", "self_corrected": False}
    else:
        rag = {"answer": None, "conf": 0.18, "cat": "unknown", "self_corrected": False}

    answer         = rag.get("answer")
    conf           = rag.get("conf", 0.18)
    cat            = rag.get("cat", "unknown")
    self_corrected = rag.get("self_corrected", False)

    # 5.5. Always use Groq — FAQ context grounds the answer, making every response
    # feel AI-generated rather than a verbatim database lookup.
    faq_context   = answer if conf >= 0.40 else None
    original_conf = conf
    llm_res = generate_answer(
        query=text_in,
        faq_context=faq_context,
        sentiment=sentiment,
        hinglish=hinglish
    )
    answer = llm_res["answer"]
    if faq_context:
        conf = original_conf   # keep the higher FAQ-based confidence when grounded
    else:
        conf = llm_res["conf"]
        cat  = "llm_generated"

    # 7. Escalation / ticket decision
    priority              = compute_priority(sentiment, drift, escalate, conf)
    create_tkt, trigger   = should_create_ticket(sentiment, drift, escalate, conf)
    ticket_id             = None
    issue_summary         = None

    if create_tkt and _db_ok:
        issue_summary = summarize_issue(text_in)
        tkt_data = create_ticket(
            session_id = req.session_id,
            customer   = req.customer,
            issue      = issue_summary or text_in,
            priority   = priority,
            trigger    = trigger,
            db         = db,
        )
        if tkt_data:
            ticket_id = tkt_data["ticket_id"]

    # 8. Fallback — no answer found
    fallback = answer is None
    if fallback:
        answer = None

    # 9 & 10. Persist bot message + churn score
    if _db_ok:
        try:
            db.add(DBMessage(session_id=req.session_id, role="bot", text=answer or "", sentiment="neutral", cat=cat, conf=conf, escalated=create_tkt and priority == "high"))
            try: predict_churn(req.session_id, req.customer, db)
            except Exception: pass
            db.commit()
        except Exception:
            try: db.rollback()
            except Exception: pass

    return ChatResponse(
        answer         = answer,
        conf           = conf,
        cat            = cat,
        sentiment      = sentiment,
        hinglish       = hinglish,
        self_corrected = self_corrected,
        escalated      = create_tkt and priority == "high",
        fallback       = fallback,
        drift          = drift,
        ticket_id      = ticket_id,
        trigger        = trigger if create_tkt else None,
        summary        = issue_summary,
    )


# ── GET /api/tickets ──────────────────────────────────────────────────

@app.get("/api/tickets")
def tickets_list(db: Session = Depends(get_db)):
    if db is None:
        return []
    return get_all_tickets(db)


# ── POST /api/tickets/{ticket_ref}/suggest-reply ──────────────────────

class SuggestReplyRequest(BaseModel):
    issue:    str
    category: str = "general"
    customer: str = "the customer"

@app.post("/api/tickets/{ticket_ref}/suggest-reply")
def ticket_suggest_reply(ticket_ref: str, req: SuggestReplyRequest):
    reply = suggest_reply(issue=req.issue, category=req.category, customer=req.customer)
    return {"reply": reply}


# ── GET /api/analytics/clusters ──────────────────────────────────────

@app.get("/api/analytics/clusters")
def clusters(db: Session = Depends(get_db)):
    if db is None:
        return []
    return get_live_clusters(db)


# ── GET /api/analytics/churn-risk ────────────────────────────────────

@app.get("/api/analytics/churn-risk")
def churn_risk(db: Session = Depends(get_db)):
    if db is None:
        return []
    return get_all_churn_risks(db)


# ── POST /api/admin/correct-answer ───────────────────────────────────

@app.post("/api/admin/correct-answer")
def correct_answer(req: CorrectionRequest, db: Session = Depends(get_db)):
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    ok = store_correction(req.question, req.correct_answer, db)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to store correction")
    return {"status": "stored"}


# ── GET /api/admin/pending-reviews ───────────────────────────────────

@app.get("/api/admin/pending-reviews")
def pending_reviews(db: Session = Depends(get_db)):
    if db is None:
        return []
    return get_pending_reviews(db)


# ── PATCH /api/tickets/{ref}/resolve ─────────────────────────────────

@app.patch("/api/tickets/{ticket_ref}/resolve")
def resolve_ticket(ticket_ref: str, db: Session = Depends(get_db)):
    if db is None:
        return {"status": "local_only"}
    try:
        db.execute(text("UPDATE tickets SET status = 'resolved' WHERE ticket_ref = :ref"),
                   {"ref": ticket_ref})
        db.commit()
        return {"status": "resolved"}
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Update failed")


# ── GET /api/analytics/drift ─────────────────────────────────────────

@app.get("/api/analytics/drift")
def drift_analytics(session_id: str = "current", db: Session = Depends(get_db)):
    if db is None:
        return {"drift": {"trend": "stable", "score": 0.5, "label": "Stable", "color": "#534AB7"}}
    drift = get_session_drift(session_id, db)
    return {"drift": drift}


# ── GET /api/analytics/sentiment-trend ───────────────────────────────

@app.get("/api/analytics/sentiment-trend")
def sentiment_trend(db: Session = Depends(get_db)):
    if db is None:
        return []
    try:
        rows = db.execute(text("""
            SELECT
                EXTRACT(HOUR FROM ts)::int AS hour,
                sentiment,
                COUNT(*) AS cnt
            FROM sentiment_logs
            WHERE ts >= CURRENT_DATE
            GROUP BY EXTRACT(HOUR FROM ts)::int, sentiment
            ORDER BY hour
        """)).fetchall()

        hourly: dict = {}
        for r in rows:
            h = r.hour
            if h not in hourly:
                if h == 0:    label = "12am"
                elif h < 12:  label = f"{h}am"
                elif h == 12: label = "12pm"
                else:         label = f"{h - 12}pm"
                hourly[h] = {"hour": label, "pos": 0, "neu": 0, "neg": 0}
            if r.sentiment == "positive":
                hourly[h]["pos"] = int(r.cnt)
            elif r.sentiment == "negative":
                hourly[h]["neg"] = int(r.cnt)
            else:
                hourly[h]["neu"] = int(r.cnt)

        return [hourly[k] for k in sorted(hourly.keys())]
    except Exception:
        return []


# ── Health check ─────────────────────────────────────────────────────

@app.get("/api/health")
def health(db: Session = Depends(get_db)):
    db_ok = False
    db_err = None
    if db is not None:
        try:
            db.execute(text("SELECT 1"))
            db_ok = True
        except Exception as e:
            db_err = str(e)

    return {"status": "ok", "db": db_ok, "db_err": db_err}


# ── Mangum adapter for Vercel Lambda ─────────────────────────────────
handler = Mangum(app, lifespan="off")
