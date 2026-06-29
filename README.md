<div align="center">
  <h1>FlowZint — AI Customer Support Copilot</h1>
  <p><strong>RAG chatbot · auto-ticketing · sentiment drift · churn prediction · live clustering</strong></p>

  <p>
    <img src="https://img.shields.io/badge/React-18-blue?style=flat-square&logo=react" alt="React" />
    <img src="https://img.shields.io/badge/FastAPI-Vercel-009688?style=flat-square&logo=fastapi" alt="FastAPI" />
    <img src="https://img.shields.io/badge/Groq-llama--3.1--8b--instant-f43f5e?style=flat-square" alt="Groq" />
    <img src="https://img.shields.io/badge/Supabase-pgvector-3ECF8E?style=flat-square&logo=supabase" alt="Supabase" />
    <img src="https://img.shields.io/badge/AI-Groq%20Powered-f43f5e?style=flat-square" alt="AI Powered by Groq" />
  </p>
</div>

---

## What it does

FlowZint is a full-stack AI customer support copilot built for the **Hack The Matrix — FinTech Track**. A support agent opens the chat, a customer sends a message, and the system:

1. Searches the FAQ knowledge base using **semantic + keyword retrieval**
2. Returns a confident answer instantly — or generates one with **Groq llama-3.1-8b**
3. Tracks the conversation's **sentiment drift** in real time
4. Auto-creates a ticket when frustration is detected or confidence is too low
5. Generates a 2-sentence **AI issue summary** when escalating
6. Prompts the customer for their name/email to track the ticket
7. Gives the agent a one-click **AI suggested reply** in the ticket view

---

## 4 AI Innovations

### 1. Conversation Drift Detector
Every chat turn is scored by a multilingual sentiment model. A **recency-weighted slope** across session history classifies the trajectory as *Stable / Degrading / Rapidly degrading / Improving*. When drift crosses the threshold the bot escalates automatically — before the customer has to ask. A live colour-coded bar updates on every turn.

### 2. Self-Correcting Confidence Loop
When RAG retrieval confidence is below 0.40 the bot shows a fallback and exposes an inline correction field. The agent's correction is embedded and upserted into a `self_corrections` pgvector table. On the next semantically similar query, retrieval checks corrections first (threshold 0.97) so the new answer is returned immediately. Pending reviews appear in the Dashboard.

### 3. Auto-Generated Issue Clusters
At dashboard load, all of today's user messages are batch-embedded and fed into **KMeans** (scikit-learn). The cluster count is dynamic (2–6 based on message volume). The representative phrase for each cluster is the message closest to its centroid — no predefined categories. The "Emerging issues" panel updates on every load.

### 4. Retention Action Recommender
After each session, a feature vector `[neg_count, ticket_count, escalation_count, high_priority_count]` is computed from the DB and converted to a weighted churn score. The top-contributing factor maps to a specific recommended action (e.g. *"Offer priority callback within 2 hours"*). The Dashboard shows customer name, risk level, driver, and action.

---

## Architecture

```
React (Vite) ──────────────────────────────────── Vercel CDN
      │ /api/*
FastAPI + Mangum ──────────────────────────────── Vercel Serverless
      │
      ├── api/rag/retrieve.py        keyword search → FAQ answer (primary path)
      ├── api/llm/groq_generate.py   Groq llama-3.1-8b-instant
      │                                 · answer generation (grounded by FAQ context)
      │                                 · 2-sentence issue summary on escalation
      │                                 · AI suggested reply for agents
      ├── api/sentiment/             keyword scoring + HF multilingual model (fallback)
      ├── api/ticketing/             priority scoring + Supabase write
      ├── api/churn/                 churn feature extraction + recommender
      └── api/clustering/            live KMeans on today's messages
      │
Supabase PostgreSQL + pgvector
      tables: faqs · tickets · messages · self_corrections
```

**Every response goes through Groq.** The FAQ knowledge base grounds the answer when confidence is high; Groq generates freely when it isn't. This means every reply feels natural and context-aware rather than a verbatim DB lookup.

**JS fallback engine** (`src/utils/engine.js`): word-overlap FAQ matching + Hinglish boost runs entirely in the browser if the API is unreachable — the demo never goes dark.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Chart.js, Tabler Icons |
| Backend | FastAPI, Mangum (Vercel serverless adapter) |
| Database | Supabase PostgreSQL + pgvector |
| **LLM** | **Groq `llama-3.1-8b-instant`** — answers, issue summaries, agent reply suggestions |
| FAQ Retrieval | Stem-based keyword search over pgvector FAQ table |
| Sentiment | Keyword scoring with HuggingFace multilingual model fallback |
| Embeddings | HuggingFace `all-MiniLM-L6-v2` (one-time FAQ seeding only) |
| Clustering | scikit-learn KMeans |
| Deployment | Vercel (frontend + serverless functions) |

---

## Project structure

```
flowzint/
├── src/
│   ├── App.jsx                   root layout + sidebar + nav
│   ├── views/
│   │   ├── LandingView.jsx       hero + how-it-works + feature cards
│   │   ├── ChatView.jsx          live chat panel + sentiment sidebar
│   │   ├── DashboardView.jsx     analytics, clusters, churn table
│   │   └── TicketsView.jsx       agent ticket management + AI suggest reply
│   ├── hooks/useChat.js          all chat state + API calls
│   ├── components/
│   │   ├── ui.jsx                Badge, ChatBubble, DriftBar, Toast…
│   │   └── LoginModal.jsx        customer name/email capture on escalation
│   ├── data/constants.js         INIT_TICKETS, FAQ_KB, QUICK_MSGS, seed data
│   └── utils/engine.js           JS fallback FAQ engine
├── api/
│   ├── index.py                  FastAPI app + all route handlers
│   ├── database.py               SQLAlchemy models (FAQ, Ticket, Message…)
│   ├── rag/                      embed_faqs · retrieve · self_correct
│   ├── llm/                      groq_generate (answer · summary · suggest)
│   ├── sentiment/                analyze · drift
│   ├── ticketing/                priority · create_ticket
│   ├── churn/                    features · predict · recommend
│   └── clustering/               live_clusters
├── data/faqs.csv                 knowledge base source (70+ Q&A pairs)
├── seed_local.py                 one-shot DB seeder (local, no HF API needed)
├── requirements.txt
├── vercel.json
└── vite.config.js
```

---

## Local setup

**Prerequisites:** Node 18+, Python 3.10+, a Supabase project, a Groq API key.

```bash
# 1. Clone
git clone https://github.com/PRIYANS-H/FlowZint-Ai-Support-Bot-.git
cd FlowZint-Ai-Support-Bot-

# 2. Create .env with:
#    SUPABASE_DB_URL=<connection pooler URL from Supabase dashboard>
#    GROQ_API_KEY=<your Groq key from console.groq.com>
#    HF_TOKEN=<optional — only needed to re-seed FAQ embeddings>

# 3. Install dependencies
npm install
pip install -r requirements.txt

# 4. Seed FAQ embeddings into Supabase (run once)
python seed_local.py

# 5. Start both servers
npm run dev                      # frontend  → http://localhost:5173
uvicorn api.index:app --reload   # backend   → http://localhost:8000
```

> Vite proxies `/api/*` to `localhost:8000` — both servers must run together. `GROQ_API_KEY` is the only required AI credential; the app works without `HF_TOKEN` (sentiment falls back to keyword scoring, embeddings are only needed for re-seeding).

---

## API routes

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/chat` | Main chat — RAG + sentiment + drift + Groq |
| GET | `/api/tickets` | All tickets from DB |
| PATCH | `/api/tickets/{ref}/resolve` | Mark ticket resolved |
| POST | `/api/tickets/{ref}/suggest-reply` | AI-generated agent reply for a ticket |
| GET | `/api/analytics/clusters` | Live KMeans issue clusters |
| GET | `/api/analytics/churn-risk` | Churn scores + recommended actions |
| GET | `/api/analytics/drift` | Drift trend for a session |
| GET | `/api/analytics/sentiment-trend` | Hourly sentiment counts (today) |
| POST | `/api/admin/correct-answer` | Submit correction → pgvector |
| GET | `/api/admin/pending-reviews` | Unreviewed self-corrections |
| GET | `/api/health` | DB connectivity check |

---

<div align="center">
  Built for <strong>Hack The Matrix — FinTech Track</strong>
</div>
