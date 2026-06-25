import os, re, requests

HF_TOKEN   = os.environ.get("HF_TOKEN", "")
SENT_URL   = "https://api-inference.huggingface.co/models/cardiffnlp/twitter-xlm-roberta-base-sentiment-multilingual"
HEADERS    = {"Authorization": f"Bearer {HF_TOKEN}", "Content-Type": "application/json"}

HINGLISH_WORDS  = ["nahi", "yaar", "mera", "abhi", "karo", "hai", "hua", "bhai", "iska", "kyun", "aaya", "kab", "kuch", "dekho", "bilkul", "theek"]
NEG_WORDS       = ["frustrated", "angry", "terrible", "horrible", "worst", "disappointed", "useless", "ridiculous", "third time", "unresolved", "still waiting", "never", "pathetic", "awful", "outrageous", "unacceptable", "disgusting", "furious", "incompetent"]
POS_WORDS       = ["thank", "great", "excellent", "perfect", "wonderful", "happy", "love", "awesome", "fast", "resolved", "helpful", "amazing", "appreciate", "good"]
ESCALATE_WORDS  = ["third time", "never resolved", "unacceptable", "speak to manager", "this is a joke", "three times", "demanding refund", "legal action", "consumer forum", "chargeback"]

_LABEL_MAP = {
    "positive": "positive",
    "neutral":  "neutral",
    "negative": "negative",
    "label_0":  "negative",
    "label_1":  "neutral",
    "label_2":  "positive",
}


def analyze(text: str) -> dict:
    """
    Returns: { sentiment, conf, hinglish, escalate }
    Tries HF Inference API; falls back to keyword scoring on any error.
    """
    t          = text.lower()
    hinglish   = any(w in t for w in HINGLISH_WORDS)
    escalate   = any(w in t for w in ESCALATE_WORDS)

    # HF Inference API
    try:
        resp = requests.post(
            SENT_URL,
            headers=HEADERS,
            json={"inputs": text, "options": {"wait_for_model": True}},
            timeout=15,
        )
        if resp.status_code == 200:
            results = resp.json()
            # Response is [[{label, score}, ...]] or [{label, score}, ...]
            items = results[0] if isinstance(results[0], list) else results
            best  = max(items, key=lambda x: x["score"])
            sent  = _LABEL_MAP.get(best["label"].lower(), "neutral")
            return {"sentiment": sent, "conf_sent": round(best["score"], 4), "hinglish": hinglish, "escalate": escalate}
    except Exception:
        pass

    # Keyword fallback
    score = 0
    for w in NEG_WORDS:
        if w in t: score -= 2
    for w in POS_WORDS:
        if w in t: score += 2
    if "!" in text and score < 0: score -= 1
    if "??" in text:               score -= 1

    sent = "positive" if score > 0 else "negative" if score < -1 else "neutral"
    return {"sentiment": sent, "conf_sent": 0.65, "hinglish": hinglish, "escalate": escalate}
