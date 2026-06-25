import { useState, useRef, useEffect, useCallback } from "react";
import { detectSentiment, calcDrift, retrieveFAQ, shouldEscalate, makeTicket } from "../utils/engine";
import { INIT_TICKETS } from "../data/constants";

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

  const send = useCallback((textArg) => {
    const text = (textArg || input).trim();
    if (!text || isTyping) return;
    setInput("");
    setShowCorrection(false);
    setLastUserMsg(text);

    setMessages(prev => [...prev, { role: "user", text }]);
    setIsTyping(true);

    const sent       = detectSentiment(text);
    const newHistory = [...sentHistory, sent];
    setSentHistory(newHistory);
    const newDrift = calcDrift(newHistory);
    setDrift(newDrift);

    setTimeout(() => {
      setIsTyping(false);
      const result      = retrieveFAQ(text, selfCorrected);
      const escalate    = shouldEscalate(text, newDrift);
      const sustainedNeg = newHistory.filter(s => s === "negative").length >= 2;

      setLastConf(result.conf);

      let botText = "";
      let meta    = { conf: result.conf, hinglish: result.hinglish, self_corrected: result.self_corrected };

      if (escalate) {
        const trigger = newDrift.trend === "rapidly_degrading" ? "Drift detection" : "Frustration keywords";
        const ticket  = makeTicket(text, "high", trigger, tickets.length);
        const prefix  = result.hinglish ? "Bilkul! " : "";
        botText = prefix +
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
    }, 650);
  }, [input, isTyping, sentHistory, selfCorrected, tickets, pushToast]);

  const submitCorrection = useCallback(() => {
    const val = correctionInput.trim();
    if (!val) return;
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

  const resetSession = useCallback(() => {
    setMessages(INIT_MESSAGES);
    setInput("");
    setIsTyping(false);
    setSentHistory([]);
    setDrift(INIT_DRIFT);
    setLastConf(null);
    setTickets(INIT_TICKETS);
    setSelfCorrected({});
    setShowCorrection(false);
    setCorrectionInput("");
    setLastUserMsg("");
    setToasts([]);
    sustainedNegFired.current = false;
  }, []);

  // Stats derived from actual chat state — no hardcoded offsets
  const stats = {
    totalConvs:   messages.filter(m => m.role === "user").length,
    autoResolved: messages.filter(m => m.role === "bot" && m.meta?.cat && m.meta.cat !== "unknown" && !m.meta?.escalated && !m.meta?.fallback).length,
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