"""
api/llm/groq_generate.py

Calls Groq REST API directly (no SDK) to avoid httpx connection issues in
Vercel's Python Lambda environment. Uses the requests library which works
reliably for outbound HTTPS in serverless.
"""
import os, requests
from dotenv import load_dotenv

load_dotenv()

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

SYSTEM_PROMPT = """You are Flowzint, an AI customer support assistant for an Indian
e-commerce platform. You are helpful, concise, and professional.

Rules:
- Keep answers under 3 sentences
- If the customer seems frustrated, acknowledge it first
- For refunds/orders always ask for the order ID if not provided
- Never make up specific policies — if unsure, say you'll connect them to an agent
- Respond in the same language the customer uses (English or Hinglish)
"""


def generate_answer(
    query: str,
    faq_context: str | None = None,
    sentiment: str = "neutral",
    hinglish: bool = False,
) -> dict:
    try:
        key = os.environ.get("GROQ_API_KEY", "")
        if not key:
            raise ValueError("GROQ_API_KEY not set")

        if faq_context:
            user_msg = (
                f"Customer query: {query}\n\n"
                f"Relevant policy context (use this to ground your answer):\n{faq_context}\n\n"
                "Answer the customer's query based on the context above. "
                "Be concise and helpful."
            )
        else:
            user_msg = (
                f"Customer query: {query}\n\n"
                "Answer helpfully. If you cannot give a specific answer, "
                "acknowledge the issue and say a support agent will follow up."
            )

        if sentiment == "negative":
            user_msg += "\n\nNote: The customer seems frustrated. Acknowledge their concern warmly before answering."

        resp = requests.post(
            GROQ_URL,
            headers={
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "llama-3.1-8b-instant",
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user",   "content": user_msg},
                ],
                "max_tokens": 150,
                "temperature": 0.3,
            },
            timeout=15,
        )
        resp.raise_for_status()
        answer = resp.json()["choices"][0]["message"]["content"].strip()
        conf = 0.75 if faq_context else 0.55
        return {"answer": answer, "groq_used": True, "conf": conf}

    except Exception:
        return {
            "answer": "I'm looking into this for you. Please hold on while I connect you with a support agent who can help.",
            "groq_used": False,
            "conf": 0.30,
        }
