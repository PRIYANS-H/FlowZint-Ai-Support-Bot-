import os, requests
import numpy as np
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


def _l2_normalize(X: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(X, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return X / norms


def _kmeans(X: np.ndarray, k: int, n_init: int = 10, max_iter: int = 100) -> tuple:
    """Pure numpy KMeans — no scipy/scikit-learn required."""
    rng = np.random.default_rng(42)
    best_labels, best_centers, best_inertia = None, None, float("inf")

    for _ in range(n_init):
        centers = X[rng.choice(len(X), k, replace=False)].copy()
        labels = np.zeros(len(X), dtype=int)

        for _ in range(max_iter):
            dists  = np.linalg.norm(X[:, np.newaxis, :] - centers[np.newaxis, :, :], axis=2)
            new_labels = np.argmin(dists, axis=1)
            new_centers = np.array([
                X[new_labels == i].mean(axis=0) if (new_labels == i).any() else centers[i]
                for i in range(k)
            ])
            if np.array_equal(new_labels, labels) or np.allclose(centers, new_centers, atol=1e-4):
                labels = new_labels
                centers = new_centers
                break
            labels, centers = new_labels, new_centers

        inertia = float(sum(
            np.sum(np.linalg.norm(X[labels == i] - centers[i], axis=1) ** 2)
            for i in range(k) if (labels == i).any()
        ))
        if inertia < best_inertia:
            best_inertia, best_labels, best_centers = inertia, labels.copy(), centers.copy()

    return best_labels, best_centers


def get_live_clusters(db: Session, min_messages: int = 10) -> list[dict]:
    """
    Pull today's user messages, embed via HF API, run KMeans, return cluster summaries.
    Falls back to empty list if insufficient data or API unavailable.
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

        if len(texts) <= 100:
            vectors = _embed_batch(texts)
        else:
            vectors = []
            for i in range(0, len(texts), 100):
                vectors.extend(_embed_batch(texts[i : i + 100]))

        X = _l2_normalize(np.array(vectors, dtype=np.float32))
        k = min(_N_CLUSTERS, len(texts))
        labels, centers = _kmeans(X, k)

        clusters = []
        for cid in range(k):
            mask    = labels == cid
            members = [texts[i] for i, m in enumerate(mask) if m]
            if not members:
                continue
            member_vecs = X[mask]
            dists       = np.linalg.norm(member_vecs - centers[cid], axis=1)
            rep_idx     = int(np.argmin(dists))
            clusters.append({
                "cluster_id":           cid,
                "count":                len(members),
                "representative_issue": members[rep_idx],
            })

        clusters.sort(key=lambda c: c["count"], reverse=True)
        return clusters

    except Exception:
        return []
