import {
  FAQ_KB, HINGLISH_WORDS, NEG_WORDS, POS_WORDS,
  ESCALATE_TRIGGERS, HINGLISH_NEG,
} from "../data/constants";

// ── Sentiment detection (JS fallback — used when API is unavailable) ─
export function detectSentiment(text) {
  const t = text.toLowerCase();
  let score = 0;
  NEG_WORDS.forEach(w    => { if (t.includes(w)) score -= 2; });
  POS_WORDS.forEach(w    => { if (t.includes(w)) score += 2; });
  HINGLISH_NEG.forEach(w => { if (t.includes(w)) score -= 2; });
  if (t.includes("!") && score < 0) score -= 1;
  if (t.includes("??"))              score -= 1;
  return score > 0 ? "positive" : score < -1 ? "negative" : "neutral";
}

// ── Drift calculation — recency-weighted slope ───────────────────────
export function calcDrift(history) {
  if (history.length < 2)
    return { trend: "stable", score: 0.5, label: "Stable", color: "#534AB7" };

  const map  = { positive: 1, neutral: 0, negative: -1 };
  const vals = history.map(h => map[h]);
  const diffs = [];
  for (let i = 1; i < vals.length; i++)
    diffs.push((vals[i] - vals[i - 1]) * (i + 1));
  const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;

  if (avg < -0.5) return { trend: "rapidly_degrading", score: 0.08, label: "Rapidly degrading", color: "#E24B4A" };
  if (avg < -0.1) return { trend: "degrading",         score: 0.28, label: "Degrading",         color: "#EF9F27" };
  if (avg >  0.3) return { trend: "improving",         score: 0.88, label: "Improving",         color: "#1D9E75" };
  return               { trend: "stable",            score: 0.5,  label: "Stable",            color: "#534AB7" };
}

// ── FAQ retrieval (word-overlap — JS fallback only) ──────────────────
export function retrieveFAQ(query, selfCorrected = {}) {
  const q        = query.toLowerCase();
  const hinglish = HINGLISH_WORDS.some(h => q.includes(h));

  if (selfCorrected[q])
    return { answer: selfCorrected[q], conf: 0.97, self_corrected: true, hinglish };

  let best = null, bestScore = 0;
  FAQ_KB.forEach(f => {
    // Boost Hinglish entries when the query is Hinglish
    const hinglishBoost = hinglish && f.hinglish ? 0.15 : 0;
    const words = f.q.split(" ");
    const score = words.filter(w => q.includes(w)).length / words.length + hinglishBoost;
    if (score > bestScore) { bestScore = score; best = f; }
  });

  if (bestScore > 0.30 && best)
    return { answer: best.a, conf: best.conf, cat: best.cat, hinglish: hinglish || !!best.hinglish };

  return { answer: null, conf: 0.18, cat: "unknown", hinglish };
}

export function shouldEscalate(text, drift) {
  const t = text.toLowerCase();
  return ESCALATE_TRIGGERS.some(tr => t.includes(tr)) || drift.trend === "rapidly_degrading";
}

// Pure — caller passes currentCount to derive ID (no module-level state)
export function makeTicket(issue, pri, trigger, currentCount) {
  const id  = `#${1050 + currentCount + 1}`;
  const now = new Date();
  const ts  = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
  return { id, customer: "Current User", issue: issue.length > 52 ? issue.substring(0, 52) + "…" : issue, pri, status: "open", trigger, ts };
}