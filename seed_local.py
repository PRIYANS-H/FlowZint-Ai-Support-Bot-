"""
Local seeding script — uses sentence-transformers directly (no HF API needed).
Run once: python seed_local.py

The deployed Vercel function still uses the HF Inference API; this is only for
local/CI seeding where the API subdomain may be unreachable.
"""
import os, sys, csv, time
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "api"))

from database import engine, SessionLocal, FAQ, Base
from sentence_transformers import SentenceTransformer

CSV_PATH = os.path.join(os.path.dirname(__file__), "data", "faqs.csv")
MODEL    = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing = db.query(FAQ).count()
        if existing > 0:
            print(f"Already have {existing} FAQs — clearing and re-seeding.")
            db.query(FAQ).delete()
            db.commit()

        with open(CSV_PATH, encoding="utf-8") as f:
            rows = list(csv.DictReader(f))

        print(f"Embedding {len(rows)} FAQs with local model...")
        texts = [r["question"] + " " + r["answer"] for r in rows]

        batch_size = 32
        all_vecs = []
        for i in range(0, len(texts), batch_size):
            batch_vecs = MODEL.encode(texts[i:i + batch_size], show_progress_bar=False).tolist()
            all_vecs.extend(batch_vecs)
            print(f"  Encoded {min(i + batch_size, len(texts))} / {len(rows)}")

        for row, vec in zip(rows, all_vecs):
            db.add(FAQ(question=row["question"], answer=row["answer"], category=row["category"], embedding=vec))

        db.commit()
        print(f"\nDone — {len(rows)} FAQs seeded into Supabase pgvector.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
