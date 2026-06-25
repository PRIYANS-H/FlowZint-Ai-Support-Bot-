import { useState, useRef, useEffect, useCallback } from "react";
import { detectSentiment, calcDrift, retrieveFAQ, shouldEscalate, makeTicket } from "../utils/engine";
import { INIT_TICKETS } from "../data/constants";

// Stable session ID for the lifetime of this browser tab
const SESSION_ID = Math.random().toString(36).slice(2, 14);

const INIT_MESSAGES = [
  { role: "bot", text: "Hi! I'm Flowzint, your AI support copilot. How can I help today?", meta: { conf: 0.99 } },
];
const INIT_DRIFT = { trend: "stable", score: 0.5, label: "Stable", color: "#534AB7" };

export function useChat() {
  const [messages, setMessages]             = useState(INIT_MESSAGES);
  const [input, setInput]                   = useState("");
  const [isTyping, setIsTyping]             = useState(false);
  const [sentHistory, setSentHistory]       = useState([]);
  const [drift, setDrift]                   = useState(INIT_DRIFT);
  const [lastConf, setLastConf]             = useState(null);
  const [tickets, setTickets]               = useState(INIT_TICKETS);
  const [selfCorrected, setSelfCorrected]   = useState({});
  const [showCorrection, setShowCorrection] = useState(false);
  const [correctionInput, setCorrectionInput] = useState("");
  const [lastUserMsg, setLastUserMsg]       = useState("");
  const [toasts, setToasts]                 = useState([]);
  const messagesRef                         = useRef(null);
  const sustainedNegFired                   = useRef(false);

  useEffect(() => {
    if (messagesRef.current)
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages, isTyping]);

  const pushToast = useCallback((text, type = "info") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  // ── JS fallback (used when API is unavailable) ────────────────────
  const runLocalFallback = useCallback((text, newHistory, newDrift) => {
    const result      = retrieveFAQ(text, selfCorrected);
    const escalate    = shouldEscalate(text, newDrift);
    const sustainedNeg = newHistory.filter(s => s === "negative").length >= 2;

    setLastConf(result.conf);
    let botText = "";
    let meta    = { conf: result.conf, hinglish: result.hinglish, self_corrected: result.self_corrected };

    if (escalate) {
      const trigger = newDrift.trend === "rapidly_degrading" ? "Drift detection" : "Frustration keywords";
      const ticket  = makeTicket(text, "high", trigger, tickets.length);
      botText = (result.hinglish ? "Bilkul! " : "") +
        (result.answer || "I completely understand your frustration and sincerely apologise.") +
        "\n\nI've escalated this to a senior agent — you'll hear from us within 15 minutes.";
      meta = { ...meta, escalated: true, ticketId: ticket.id, trigger, cat: result.cat };
      setTickets(prev => [ticket, ...prev]);
      pushToast(`Ticket ${ticket.id} created — escalated`, "warn");
    } else if (!result.answer) {
      botText = "I don't have a specific answer for that query right now. I've flagged it for review — a support agent will follow up shortly.";
      meta    = { ...meta, fallback: true };
      setShowCorrection(true);
    } else {
      botText = (result.hinglish ? "Bilkul! " : "") + result.answer;
      meta    = { ...meta, cat: result.cat };
      if (sustainedNeg && !sustainedNegFired.current) {
        sustainedNegFired.current = true;
        const ticket = makeTicket(text, "med", "Sustained negative sentiment", tickets.length);
        meta = { ...meta, ticketId: ticket.id, trigger: "Sustained negative sentiment" };
        setTickets(prev => [ticket, ...prev]);
        pushToast(`Ticket ${ticket.id} created — negative trend`, "warn");
      }
    }

    setMessages(prev => [...prev, { role: "bot", text: botText, meta }]);
  }, [selfCorrected, tickets, pushToast]);

  // ── Main send — tries API, falls back to JS engine ───────────────
  const send = useCallback(async (textArg) => {
    const text = (textArg || input).trim();
    if (!text || isTyping) return;

    setInput("");
    setShowCorrection(false);
    setLastUserMsg(text);
    setMessages(prev => [...prev, { role: "user", text }]);
    setIsTyping(true);

    try {
      const res = await fetch("/api/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ text, session_id: SESSION_ID }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();

      // Update state from API response
      const newDrift = result.drift || INIT_DRIFT;
      setDrift(newDrift);
      setLastConf(result.conf);
      if (result.sentiment) setSentHistory(prev => [...prev, result.sentiment]);

      // Handle ticket created by backend
      if (result.ticket_id) {
        const now  = new Date();
        const ts   = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
        const newT = {
          id:       result.ticket_id,
          customer: "Current User",
          issue:    text.length > 52 ? text.substring(0, 52) + "…" : text,
          pri:      result.escalated ? "high" : "med",
          status:   "open",
          trigger:  result.trigger || "Auto-ticket",
          ts,
        };
        setTickets(prev => [newT, ...prev]);
        const label = result.escalated ? "escalated" : "negative trend";
        pushToast(`Ticket ${result.ticket_id} created — ${label}`, "warn");
      }

      const fallback = result.fallback || (!result.answer && result.conf < 0.3);
      if (fallback) setShowCorrection(true);

      const meta = {
        conf:           result.conf,
        hinglish:       result.hinglish,
        self_corrected: result.self_corrected,
        cat:            result.cat,
        escalated:      result.escalated,
        ticketId:       result.ticket_id,
        trigger:        result.trigger,
        fallback,
      };

      const botText = result.answer ||
        "I don't have a specific answer for that query right now. I've flagged it for review — a support agent will follow up shortly.";

      setMessages(prev => [...prev, { role: "bot", text: botText, meta }]);

    } catch {
      // API unavailable — run local JS engine as fallback
      const sent       = detectSentiment(text);
      const newHistory = [...sentHistory, sent];
      setSentHistory(newHistory);
      const newDrift = calcDrift(newHistory);
      setDrift(newDrift);
      runLocalFallback(text, newHistory, newDrift);
    } finally {
      setIsTyping(false);
    }
  }, [input, isTyping, sentHistory, runLocalFallback, pushToast]);

  // ── Submit correction ─────────────────────────────────────────────
  const submitCorrection = useCallback(async () => {
    const val = correctionInput.trim();
    if (!val) return;

    // Persist to API (best-effort)
    fetch("/api/admin/correct-answer", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ question: lastUserMsg, correct_answer: val }),
    }).catch(() => {});

    // Immediate local feedback
    setSelfCorrected(prev => ({ ...prev, [lastUserMsg.toLowerCase()]: val }));
    setShowCorrection(false);
    setCorrectionInput("");
    setMessages(prev => [...prev, {
      role: "bot",
      text: "✓ Answer saved to knowledge base (pending review). Future similar questions will use this answer automatically.",
      meta: { conf: 0.97, self_corrected: true },
    }]);
    pushToast("✓ Knowledge base updated", "success");
  }, [correctionInput, lastUserMsg, pushToast]);

  // ── Reset session ─────────────────────────────────────────────────
  const resetSession = useCallback(() => {
    setMessages(INIT_MESSAGES);
    setInput(""); setIsTyping(false); setSentHistory([]);
    setDrift(INIT_DRIFT); setLastConf(null); setTickets(INIT_TICKETS);
    setSelfCorrected({}); setShowCorrection(false);
    setCorrectionInput(""); setLastUserMsg(""); setToasts([]);
    sustainedNegFired.current = false;
  }, []);

  // Stats derived from actual chat state
  const stats = {
    totalConvs:   messages.filter(m => m.role === "user").length,
    autoResolved: messages.filter(m => m.role === "bot" && m.meta?.cat && m.meta.cat !== "unknown" && m.meta.cat !== "self_corrected" && !m.meta?.escalated && !m.meta?.fallback).length,
    escalated:    tickets.filter(t => t.trigger === "Drift detection" || t.trigger === "Frustration keywords").length,
    churnRisk:    tickets.filter(t => t.pri === "high").length,
  };

  return {
    messages, input, setInput, isTyping, sentHistory,
    drift, lastConf, tickets, selfCorrected,
    showCorrection, correctionInput, setCorrectionInput,
    toasts, send, submitCorrection, messagesRef, stats, resetSession,
  };
}