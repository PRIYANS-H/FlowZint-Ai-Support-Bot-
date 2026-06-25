import os, requests
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import normalize
from sqlalchemy.orm import Session
from sqlalchemy import text

HF_TOKEN  = os.environ.get("HF_TOKEN", "")
EMBED_URL = "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2"
HEADERS   = {"Authorization": f"Bearer {HF_TOKEN}", "Content-Type": "application/json"}

_N_CLUSTERS = 4


def _embed_batch(texts: list[str]) -> list[list[float]]:
    resp = requests.post(EMBED_URL, headers=HEADERS, json={"inputs": texts, "options": {"wait_for_model": True}}, timeout=30)
    resp.raise_for_status()
    return resp.json()


def get_live_clusters(db: Session, min_messages: int = 10) -> list[dict]:
    """
    Pull today's user messages, embed via HF API, run KMeans, return top-N cluster summaries.
    Falls back to an empty list if insufficient data or API is unavailable.
    """
    try:
        rows = db.execute(text("""
            SELECT text FROM messages
            WHERE role = 'user'
              AND ts >= CURRENT_DATE
            ORDER BY ts DESC
            LIMIT 200
        """)).fetchall()

        texts = [r.text for r in rows]
        if len(texts) < min_messages:
            return []

        # Embed in one batch (HF allows up to ~100 inputs; split if needed)
        if len(texts) <= 100:
            vectors = _embed_batch(texts)
        else:
            vectors = []
            for i in range(0, len(texts), 100):
                vectors.extend(_embed_batch(texts[i : i + 100]))

        X = normalize(np.array(vectors, dtype=np.float32))
        n = min(_N_CLUSTERS, len(texts))
        km = KMeans(n_clusters=n, n_init=10, random_state=42)
        labels = km.fit_predict(X)

        clusters = []
        for cid in range(n):
            mask    = labels == cid
            members = [texts[i] for i, m in enumerate(mask) if m]
            if not members:
                continue
            # Pick the member closest to centroid as the representative issue
            centroid   = km.cluster_centers_[cid]
            member_vecs = X[mask]
            dists       = np.linalg.norm(member_vecs - centroid, axis=1)
            rep_idx     = int(np.argmin(dists))
            clusters.append({
                "cluster_id":           cid,
                "count":                len(members),
                "representative_issue": members[rep_idx],
            })

        # Sort by count desc
        clusters.sort(key=lambda c: c["count"], reverse=True)
        return clusters

    except Exception:
        return []
