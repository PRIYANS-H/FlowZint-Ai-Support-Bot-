import os, requests
from sqlalchemy.orm import Session
from sqlalchemy import text

HF_TOKEN  = os.environ.get("HF_TOKEN", "")
EMBED_URL = "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2"
HEADERS   = {"Authorization": f"Bearer {HF_TOKEN}", "Content-Type": "application/json"}


def embed_query(query: str) -> list[float]:
    resp = requests.post(EMBED_URL, headers=HEADERS, json={"inputs": query, "options": {"wait_for_model": True}}, timeout=10)
    resp.raise_for_status()
    result = resp.json()
    return result[0] if isinstance(result[0], list) else result


def _fts_fallback(query: str, db: Session) -> dict:
    """PostgreSQL full-text search when HF embedding API is unreachable."""
    try:
        row = db.execute(text("""
            SELECT question, answer, category,
                   ts_rank(
                       to_tsvector('english', question || ' ' || answer),
                       plainto_tsquery('english', :q)
                   ) AS rank
            FROM faqs
            WHERE to_tsvector('english', question || ' ' || answer)
                  @@ plainto_tsquery('english', :q)
            ORDER BY rank DESC
            LIMIT 1
        """), {"q": query}).fetchone()

        if row and row.rank > 0:
            return {"answer": row.answer, "conf": 0.62, "cat": row.category, "self_corrected": False}
    except Exception:
        pass
    return {"answer": None, "conf": 0.18, "cat": "unknown", "self_corrected": False}


def retrieve_faq(query: str, db: Session) -> dict:
    """
    Returns: { answer, conf, cat, self_corrected }
    Searches self_corrections first (conf=0.97 override), then faqs.
    Falls back to PostgreSQL full-text search if HF embedding API is unavailable.
    """
    try:
        emb     = embed_query(query)
        emb_str = str(emb)

        # 1. Check self-corrections first
        sc_row = db.execute(text("""
            SELECT answer, category,
                   1 - (embedding <=> :emb::vector) AS sim
            FROM self_corrections
            ORDER BY embedding <=> :emb::vector
            LIMIT 1
        """), {"emb": emb_str}).fetchone()

        if sc_row and sc_row.sim >= 0.92:
            return {"answer": sc_row.answer, "conf": 0.97, "cat": sc_row.category, "self_corrected": True}

        # 2. Main FAQ vector search
        row = db.execute(text("""
            SELECT question, answer, category,
                   1 - (embedding <=> :emb::vector) AS sim
            FROM faqs
            ORDER BY embedding <=> :emb::vector
            LIMIT 1
        """), {"emb": emb_str}).fetchone()

        if row and row.sim >= 0.40:
            conf = round(0.50 + (row.sim - 0.40) * (0.49 / 0.60), 4)
            return {"answer": row.answer, "conf": conf, "cat": row.category, "self_corrected": False}

        return {"answer": None, "conf": 0.18, "cat": "unknown", "self_corrected": False}

    except Exception:
        # HF API unreachable — fall back to full-text search
        return _fts_fallback(query, db)
