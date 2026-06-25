"""
One-off seeding script: loads data/faqs.csv, calls HF Inference API for embeddings,
stores rows in the faqs table. Run once after DB is initialised.

Usage:
    python -m api.rag.embed_faqs
"""
import os, sys, csv, time, requests
from dotenv import load_dotenv

load_dotenv()

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine, SessionLocal, FAQ, Base

HF_TOKEN  = os.environ.get("HF_TOKEN", "")
EMBED_URL = "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2"
HEADERS   = {"Authorization": f"Bearer {HF_TOKEN}", "Content-Type": "application/json"}
CSV_PATH  = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data", "faqs.csv")


def embed_texts(texts: list[str]) -> list[list[float]]:
    resp = requests.post(EMBED_URL, headers=HEADERS, json={"inputs": texts, "options": {"wait_for_model": True}}, timeout=30)
    resp.raise_for_status()
    return resp.json()


def seed_faqs():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(FAQ).count() > 0:
            print("FAQs already seeded — skipping.")
            return

        with open(CSV_PATH, encoding="utf-8") as f:
            rows = list(csv.DictReader(f))

        batch_size = 10
        for i in range(0, len(rows), batch_size):
            batch  = rows[i : i + batch_size]
            texts  = [r["question"] + " " + r["answer"] for r in batch]
            vectors = embed_texts(texts)
            for row, vec in zip(batch, vectors):
                faq = FAQ(question=row["question"], answer=row["answer"], category=row["category"], embedding=vec)
                db.add(faq)
            db.commit()
            print(f"Seeded {min(i + batch_size, len(rows))} / {len(rows)} FAQs")
            time.sleep(0.5)

        print(f"Done — {len(rows)} FAQs embedded and stored.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_faqs()
