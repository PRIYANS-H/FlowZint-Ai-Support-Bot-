import os, requests
from sqlalchemy.orm import Session
from sqlalchemy import text

HF_TOKEN  = os.environ.get("HF_TOKEN", "")
EMBED_URL = "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2"
HEADERS   = {"Authorization": f"Bearer {HF_TOKEN}", "Content-Type": "application/json"}

_STOP = {"i","a","an","the","is","it","my","me","to","do","want","in","on","at",
         "for","of","and","or","with","how","what","when","why","can","will",
         "be","have","has","get","this","that","we","you","your","our","us",
         "not","no","am","are","was","were","been","got","did","need","please"}


def _stems(words: set) -> set:
    """Crude 5-char stem so 'damaged'/'damage', 'refund'/'refunds' match."""
    return {w[:5] for w in words}


def embed_query(query: str) -> list[float]:
    resp = requests.post(EMBED_URL, headers=HEADERS, json={"inputs": query, "options": {"wait_for_model": True}}, timeout=10)
    resp.raise_for_status()
    result = resp.json()
    return result[0] if isinstance(result[0], list) else result


def _keyword_search(query: str, db: Session) -> dict:
    """
    Score = fraction of query keyword stems found in the FAQ question.
    Uses only the question (not the long answer) as the search target so
    the denominator stays small and scores are meaningful.
    """
    try:
        rows = db.execute(text("SELECT question, answer, category FROM faqs")).fetchall()
    except Exception:
        return {"answer": None, "conf": 0.18, "cat": "unknown", "self_corrected": False}

    q_words = {w for w in query.lower().split() if len(w) > 2 and w not in _STOP}
    if not q_words:
        return {"answer": None, "conf": 0.18, "cat": "unknown", "self_corrected": False}

    q_stems = _stems(q_words)

    best_score, best_row = 0.0, None
    for row in rows:
        faq_q_words = {w for w in row.question.lower().split() if len(w) > 2 and w not in _STOP}
        faq_stems   = _stems(faq_q_words)
        # Recall: what fraction of my query stems appear in the FAQ question?
        score = len(q_stems & faq_stems) / len(q_stems)
        if score > best_score:
            best_score, best_row = score, row

    if best_row and best_score >= 0.30:
        conf = round(min(0.88, 0.55 + best_score * 0.40), 4)
        return {"answer": best_row.answer, "conf": conf, "cat": best_row.category, "self_corrected": False}
    return {"answer": None, "conf": 0.18, "cat": "unknown", "self_corrected": False}


def retrieve_faq(query: str, db: Session) -> dict:
    """
    Returns: { answer, conf, cat, self_corrected }
    Tries HF vector search first; falls back to word-overlap keyword search.
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
        # HF embed API unreachable on Vercel — use keyword overlap instead
        return _keyword_search(query, db)
