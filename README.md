<div align="center">
  <h1>FlowZint — AI Customer Support Copilot</h1>
  <p><strong>4 research-grade innovations on top of a production RAG chatbot</strong></p>

  <p>
    <img src="https://img.shields.io/badge/React-18-blue?style=flat-square&logo=react" alt="React" />
    <img src="https://img.shields.io/badge/FastAPI-Vercel-009688?style=flat-square&logo=fastapi" alt="FastAPI" />
    <img src="https://img.shields.io/badge/Groq-llama--3.1--8b-f43f5e?style=flat-square" alt="Groq" />
    <img src="https://img.shields.io/badge/Supabase-pgvector-3ECF8E?style=flat-square&logo=supabase" alt="Supabase" />
    <img src="https://img.shields.io/badge/HuggingFace-Inference_API-FFD21E?style=flat-square" alt="HuggingFace" />
  </p>
</div>

---

## The 4 Innovations

### 1. Conversation Drift Detector
Every chat turn is scored by a multilingual HuggingFace sentiment model. A **recency-weighted slope** across the session history classifies the trajectory as *Stable / Degrading / Rapidly degrading / Improving*. When drift crosses the degrading threshold the bot automatically escalates to a human ticket — before the customer has to ask. A live colour-coded bar is visible in the chat UI on every turn.

### 2. Self-Correcting Confidence Loop
When the RAG retrieval confidence is below 0.40 the bot returns a fallback and exposes an inline correction field. The agent's correction is embedded with `all-MiniLM-L6-v2` (via HuggingFace Inference API) and upserted into a `self_corrections` pgvector table with `reviewed=false`. On the next semantically similar query, retrieval checks `self_corrections` first (threshold 0.97) so the corrected answer is returned immediately. The pending reviews panel in the Dashboard shows every unreviewed correction.

### 3. Auto-Generated Issue Clusters
At dashboard load, all of today's user messages are batch-embedded and fed into **KMeans** (scikit-learn). The cluster count is dynamic (2–6 based on message volume). The representative phrase for each cluster is the message closest to its centroid — no predefined categories, no keyword lists. The "Emerging issues" panel updates with every page load.

### 4. Retention Action Recommender
After each chat turn, a feature vector `[neg_count, ticket_count, escalation_count, high_priority_count]` is computed from the session DB and converted to a weighted churn score. The top-contributing factor maps to a specific recommended action (e.g. *"Offer priority callback within 2 hours"*). The Dashboard shows customer name, risk level, driver, and recommended action together.

---

## Architecture

```
React (Vite) → Vercel CDN
      ↓ /api/*
FastAPI (Mangum) → Vercel Serverless (1 GB, 30 s)
      ↓
Supabase PostgreSQL + pgvector
      ↓
HuggingFace Inference API   — embeddings + sentiment
Groq llama-3.1-8b-instant   — response generation
```

**JS Fallback Engine** (`src/utils/engine.js`): word-overlap FAQ matching with Hinglish boost runs entirely in the browser when the API is unavailable — the demo never goes dark.

**Hinglish support**: cardiffnlp multilingual sentiment model + 30-word regex keyword set + Hinglish FAQ entries in pgvector. Groq generates natively mixed-language replies.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Chart.js |
| Backend | FastAPI, Mangum (Vercel adapter) |
| Database | Supabase PostgreSQL + pgvector extension |
| Embeddings | HuggingFace `sentence-transformers/all-MiniLM-L6-v2` |
| Sentiment | HuggingFace `cardiffnlp/twitter-xlm-roberta-base-sentiment-multilingual` |
| LLM | Groq `llama-3.1-8b-instant` |
| Clustering | scikit-learn KMeans |
| Deployment | Vercel (frontend + serverless functions) |

---

## Local Setup

**Prerequisites:** Node 18+, Python 3.10+, Supabase project, Groq key, HF token.

```bash
# 1. Clone
git clone https://github.com/PRIYANS-H/FlowZint-Ai-Support-Bot-.git
cd FlowZint-Ai-Support-Bot-

# 2. Environment
cp .env.example .env
# Edit .env and fill SUPABASE_DB_URL, GROQ_API_KEY, HF_TOKEN

# 3. Install
npm install
pip install -r requirements.txt

# 4. Seed FAQ embeddings into Supabase (run once)
python -m api.rag.embed_faqs

# 5. Run
npm run dev                          # frontend  → http://localhost:5173
uvicorn api.index:app --reload       # backend   → http://localhost:8000
```

---

## API Routes

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/chat` | Main chat — RAG + sentiment + drift + Groq |
| GET | `/api/tickets` | All tickets from DB |
| PATCH | `/api/tickets/{ref}/resolve` | Mark ticket resolved |
| GET | `/api/analytics/clusters` | Live KMeans clusters |
| GET | `/api/analytics/churn-risk` | Churn scores + actions |
| GET | `/api/analytics/drift` | Drift for a session |
| GET | `/api/analytics/sentiment-trend` | Hourly sentiment counts (today) |
| POST | `/api/admin/correct-answer` | Submit a correction → pgvector |
| GET | `/api/admin/pending-reviews` | Unreviewed corrections |
| GET | `/api/health` | DB connectivity check |

---

<div align="center">
  Built for <strong>Hack The Matrix — FinTech Track</strong>
</div>
