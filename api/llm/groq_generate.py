"""
api/llm/groq_generate.py

Groq LLM integration — used when RAG retrieval confidence is insufficient.
Model: llama-3.1-8b-instant (fastest, free tier, ~200 tokens/s)

Three modes:
  1. conf >= 0.70  → return FAQ answer directly (no LLM call, instant)
  2. conf 0.40–0.70 → LLM generates answer GROUNDED in the retrieved FAQ context
  3. conf < 0.40   → LLM generates freely from system prompt + flags for review

This is what makes Flowzint an "AI copilot" not just a search system.
"""
import os
from groq import Groq

_client = None

def _get_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=os.environ["GROQ_API_KEY"])
    return _client


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
    """
    Generate a response using Groq LLM.

    Args:
        query:       The customer's message
        faq_context: Best-matching FAQ answer from pgvector (may be None)
        sentiment:   Current sentiment — used to soften tone if negative
        hinglish:    If True, acknowledge in Hinglish style

    Returns:
        { answer: str, groq_used: True, conf: float }
    """
    try:
        client = _get_client()

        # Build user message with optional FAQ context
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

        # Add tone guidance for frustrated customers
        if sentiment == "negative":
            user_msg += "\n\nNote: The customer seems frustrated. Acknowledge their concern warmly before answering."

        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": user_msg},
            ],
            max_tokens=150,
            temperature=0.3,      # low temp = more consistent, professional answers
        )

        answer = response.choices[0].message.content.strip()

        # Confidence depends on whether we had FAQ context to ground the answer
        conf = 0.75 if faq_context else 0.55

        return {"answer": answer, "groq_used": True, "conf": conf}

    except Exception as e:
        # Never let LLM failure break the chat — return a safe fallback
        return {
            "answer": "I'm looking into this for you. Please hold on while I connect you with a support agent who can help.",
            "groq_used": False,
            "conf": 0.30,
        }