import os, requests
from sqlalchemy.orm import Session
from sqlalchemy import text

HF_TOKEN  = os.environ.get("HF_TOKEN", "")
EMBED_URL = "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2"
HEADERS   = {"Authorization": f"Bearer {HF_TOKEN}", "Content-Type": "application/json"}


def _embed(text_str: str) -> list[float]:
    resp = requests.post(EMBED_URL, headers=HEADERS, json={"inputs": text_str, "options": {"wait_for_model": True}}, timeout=20)
    resp.raise_for_status()
    result = resp.json()
    return result[0] if isinstance(result[0], list) else result


def store_correction(question: str, answer: str, db: Session) -> bool:
    """Embed the correction and upsert into self_corrections."""
    try:
        emb     = _embed(question + " " + answer)
        emb_str = str(emb)

        # Upsert: if same question already corrected, update it
        existing = db.execute(text("""
            SELECT id FROM self_corrections
            WHERE 1 - (embedding <=> :emb::vector) > 0.96
            LIMIT 1
        """), {"emb": emb_str}).fetchone()

        if existing:
            db.execute(text("""
                UPDATE self_corrections SET answer = :answer, reviewed = false WHERE id = :id
            """), {"answer": answer, "id": existing.id})
        else:
            db.execute(text("""
                INSERT INTO self_corrections (question, answer, embedding, category, reviewed)
                VALUES (:q, :a, :emb::vector, 'self_corrected', false)
            """), {"q": question, "a": answer, "emb": emb_str})

        db.commit()
        return True
    except Exception:
        db.rollback()
        return False


def get_pending_reviews(db: Session) -> list[dict]:
    """Return corrections not yet reviewed by an admin."""
    try:
        rows = db.execute(text("""
            SELECT id, question, answer, ts
            FROM self_corrections
            WHERE reviewed = false
            ORDER BY ts DESC
            LIMIT 50
        """)).fetchall()
        return [{"id": r.id, "question": r.question, "answer": r.answer, "ts": str(r.ts)} for r in rows]
    except Exception:
        return []
