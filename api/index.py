import sys, os

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


app = FastAPI(title="Flowzint API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    create_tables()


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

class CorrectionRequest(BaseModel):
    question:       str
    correct_answer: str
    session_id:     str = "default"


# ── POST /api/chat ────────────────────────────────────────────────────

@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest, db: Session = Depends(get_db)):
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    text_in = req.text.strip()

    # 1. Sentiment analysis
    sent_result = analyze(text_in)
    sentiment   = sent_result["sentiment"]
    hinglish    = sent_result["hinglish"]
    escalate    = sent_result["escalate"]

    # 2. Persist user message
    user_msg = DBMessage(
        session_id = req.session_id,
        role       = "user",
        text       = text_in,
        sentiment  = sentiment,
    )
    db.add(user_msg)

    # 3. Log sentiment for drift tracking
    sl = SentimentLog(session_id=req.session_id, sentiment=sentiment, score=sent_result.get("conf_sent", 0.65))
    db.add(sl)
    db.commit()

    # 4. Compute drift from full session history
    drift = get_session_drift(req.session_id, db)

    # 5. RAG retrieval
    try:
        rag = retrieve_faq(text_in, db)
    except Exception:
        rag = {"answer": None, "conf": 0.18, "cat": "unknown", "self_corrected": False}

    answer         = rag.get("answer")
    conf           = rag.get("conf", 0.18)
    cat            = rag.get("cat", "unknown")
    self_corrected = rag.get("self_corrected", False)

    # 6. Hinglish prefix
    if answer and hinglish:
        answer = "Bilkul! " + answer

    # 7. Escalation / ticket decision
    priority              = compute_priority(sentiment, drift, escalate, conf)
    create_tkt, trigger   = should_create_ticket(sentiment, drift, escalate, conf)
    ticket_id             = None

    if create_tkt:
        tkt_data = create_ticket(
            session_id = req.session_id,
            customer   = req.customer,
            issue      = text_in,
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

    # 9. Persist bot message
    bot_msg = DBMessage(
        session_id = req.session_id,
        role       = "bot",
        text       = answer or "",
        sentiment  = "neutral",
        cat        = cat,
        conf       = conf,
        escalated  = create_tkt and priority == "high",
    )
    db.add(bot_msg)

    # 10. Update churn score in background (non-blocking)
    try:
        predict_churn(req.session_id, req.customer, db)
    except Exception:
        pass

    db.commit()

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
    )


# ── GET /api/tickets ──────────────────────────────────────────────────

@app.get("/api/tickets")
def tickets_list(db: Session = Depends(get_db)):
    if db is None:
        return []
    return get_all_tickets(db)


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


# ── Health check ─────────────────────────────────────────────────────

@app.get("/api/health")
def health(db: Session = Depends(get_db)):
    db_ok = False
    if db is not None:
        try:
            db.execute(text("SELECT 1"))
            db_ok = True
        except Exception:
            pass
    return {"status": "ok", "db": db_ok}


# ── Mangum adapter for Vercel Lambda ─────────────────────────────────
handler = Mangum(app, lifespan="off")
