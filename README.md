<div align="center">
  <h1>🤖 FlowZint AI Support Bot</h1>
  <p><strong>Intelligent Customer Support Engine powered by Generative AI & Advanced Analytics</strong></p>

  <p>
    <img src="https://img.shields.io/badge/React-18-blue?style=flat-square&logo=react" alt="React" />
    <img src="https://img.shields.io/badge/Vite-5.4-purple?style=flat-square&logo=vite" alt="Vite" />
    <img src="https://img.shields.io/badge/FastAPI-0.103-009688?style=flat-square&logo=fastapi" alt="FastAPI" />
    <img src="https://img.shields.io/badge/Groq-LLM-f43f5e?style=flat-square" alt="Groq" />
  </p>
</div>

<br />

## 🌟 Overview

**FlowZint** is a next-generation AI customer support platform designed to revolutionize how businesses interact with their users. Far beyond a standard FAQ bot, FlowZint leverages the blazingly fast Groq LLM and robust RAG (Retrieval-Augmented Generation) architectures to provide accurate, dynamic, and context-aware responses. 

It proactively monitors user sentiment, identifies session drift (customer frustration), automatically escalates complex issues to human agents via intelligent ticketing, and predicts customer churn risks in real-time.

## 🚀 Key Features

- **🧠 Advanced RAG Chatbot:** Powered by Groq LLM, providing instant, accurate answers by retrieving domain-specific FAQs.
- **🗣️ Hinglish Support:** Automatically detects conversational context and provides native-feeling responses (e.g., *"Bilkul!"*).
- **🎭 Sentiment & Drift Analysis:** Tracks user emotions throughout the session. If the sentiment drifts negatively, the bot detects frustration.
- **🎫 Smart Ticketing System:** Automatically generates and prioritizes tickets when issues are complex or users become frustrated.
- **📉 Churn Risk Prediction:** Analyzes session metrics continuously in the background to flag at-risk customers on the dashboard.
- **📊 Topic Clustering:** Groups real-time customer queries into clusters for deeper analytics.
- **🔄 Admin Self-Correction:** An intuitive feedback loop where admins can correct bot answers, feeding right back into the intelligence layer.

## 🛠️ Technology Stack

### Frontend
* **React 18** (Vite for fast tooling)
* Highly interactive Dashboard & Ticketing views (`ChatView`, `DashboardView`, `TicketsView`).

### Backend
* **FastAPI** (High-performance API routing)
* **SQLAlchemy** (Database ORM)
* **Vercel Serverless** deployment ready (`Mangum` adapter integrated)
* Custom Python modules for: `churn`, `clustering`, `rag`, `sentiment`, and `ticketing`.

## 📦 Getting Started

### Prerequisites
* **Node.js** (v18+ recommended)
* **Python** 3.9+
* API keys for Groq LLM (Set in `.env`)

### Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/PRIYANS-H/FlowZint-Ai-Support-Bot-.git
   cd FlowZint-Ai-Support-Bot-
   ```

2. **Install Frontend Dependencies:**
   ```bash
   npm install
   ```

3. **Install Backend Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the Development Server:**
   Start the Vite frontend:
   ```bash
   npm run dev
   ```
   Start the FastAPI backend (example using uvicorn):
   ```bash
   uvicorn api.index:app --reload
   ```

## 📸 Platform Views
* **Client Chat Interface:** A sleek, minimal chat window where users interact with the AI.
* **Admin Dashboard:** Real-time analytics, sentiment trends, and churn risk monitoring.
* **Ticketing Desk:** Prioritized, auto-generated tickets with emotional context included.

## 🤝 Contributing
Contributions are always welcome! Feel free to open an issue or submit a pull request if you have ideas on how to improve FlowZint.

---
<div align="center">
  <i>Built with ❤️ to redefine Customer Support.</i>
</div>
