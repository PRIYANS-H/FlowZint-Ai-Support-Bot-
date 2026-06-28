import { useState, useRef, useEffect, useCallback } from "react";
import { detectSentiment, calcDrift, retrieveFAQ, shouldEscalate, makeTicket } from "../utils/engine";
import { INIT_TICKETS } from "../data/constants";

const SESSION_ID = Math.random().toString(36).slice(2, 14);

const INIT_MESSAGES = [
  { role: "bot", text: "Hi! I'm Flowzint, your AI support copilot. How can I help today?", meta: { conf: 0.99 } },
];
const INIT_DRIFT = { trend: "stable", score: 0.5, label: "Stable", color: "#534AB7" };

// What follow-up question to ask when confidence is low
const DETAIL_PROMPTS = [
  "Could you share your **Order ID** so I can look this up for you?",
  "Could you describe the issue in a bit more detail? That'll help me find the right answer.",
  "Do you have a **transaction ID** or **reference number** I can check against?",
];

export function useChat() {
  const [messages, setMessages]               = useState(INIT_MESSAGES);
  const [input, setInput]                     = useState("");
  const [isTyping, setIsTyping]               = useState(false);
  const [sentHistory, setSentHistory]         = useState([]);
  const [drift, setDrift]                     = useState(INIT_DRIFT);
  const [lastConf, setLastConf]               = useState(null);
  const [tickets, setTickets]                 = useState(INIT_TICKETS);
  const [selfCorrected, setSelfCorrected]     = useState({});
  const [showCorrection, setShowCorrection]   = useState(false);
  const [correctionInput, setCorrectionInput] = useState("");
  const [lastUserMsg, setLastUserMsg]         = useState("");
  const [toasts, setToasts]                   = useState([]);
  const [uploadedFile, setUploadedFile]       = useState(null);   // { name, type, dataUrl }
  const [collectingDetails, setCollecting]    = useState(false);  // awaiting order ID / more info
  const [showLoginModal, setShowLoginModal]   = useState(false);
  const [userProfile, setUserProfile]         = useState(null);   // { name, email }
  const messagesRef                           = useRef(null);
  const sustainedNegFired                     = useRef(false);
  const detailPromptIdx                       = useRef(0);

  useEffect(() => {
    if (messagesRef.current)
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages, isTyping]);

  const pushToast = useCallback((text, type = "info") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  // ── JS fallback engine ────────────────────────────────────────────
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
      botText = "I don't have a specific answer for that right now. I've flagged it for review — a support agent will follow up shortly.";
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

  // ── Main send ─────────────────────────────────────────────────────
  const send = useCallback(async (textArg) => {
    const text = (textArg || input).trim();
    if (!text || isTyping) return;

    setInput("");
    setShowCorrection(false);
    setCollecting(false);
    setLastUserMsg(text);

    // Build user message — attach file info if present
    const userMsgObj = uploadedFile
      ? { role: "user", text, meta: { file: uploadedFile } }
      : { role: "user", text };
    setMessages(prev => [...prev, userMsgObj]);
    setIsTyping(true);

    const fileCtx = uploadedFile ? ` [Attached file: ${uploadedFile.name}]` : "";
    setUploadedFile(null);

    try {
      const res = await fetch("/api/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ text: text + fileCtx, session_id: SESSION_ID }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();

      const newDrift = result.drift || INIT_DRIFT;
      setDrift(newDrift);
      setLastConf(result.conf);
      if (result.sentiment) setSentHistory(prev => [...prev, result.sentiment]);

      // Collect details when confidence is low and not yet escalated
      const lowConf = result.conf < 0.60 && !result.escalated && !result.ticket_id;
      if (lowConf && !collectingDetails) {
        const prompt = DETAIL_PROMPTS[detailPromptIdx.current % DETAIL_PROMPTS.length];
        detailPromptIdx.current += 1;
        setCollecting(true);

        const summary = result.answer
          ? result.answer
          : "I found some partial information but need a bit more to give you a precise answer.";

        const combinedText = summary + "\n\n" + prompt;
        const meta = { conf: result.conf, cat: result.cat, hinglish: result.hinglish, self_corrected: result.self_corrected, collectingDetails: true };
        setMessages(prev => [...prev, { role: "bot", text: combinedText, meta }]);
        setIsTyping(false);
        return;
      }

      if (result.ticket_id) {
        const now  = new Date();
        const ts   = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
        const issueText = result.summary || text;
        const newT = {
          id:       result.ticket_id,
          customer: userProfile?.name || "Current User",
          issue:    issueText.length > 52 ? issueText.substring(0, 52) + "…" : issueText,
          pri:      result.escalated ? "high" : "med",
          status:   "open",
          trigger:  result.trigger || "Auto-ticket",
          ts,
        };
        setTickets(prev => [newT, ...prev]);
        const label = result.escalated ? "escalated" : "negative trend";
        pushToast(`Ticket ${result.ticket_id} created — ${label}`, "warn");

        // Show AI summary as a distinct bot message before the main reply
        if (result.summary) {
          setMessages(prev => [...prev, {
            role: "bot",
            text: result.summary,
            meta: { conf: 1.0, cat: "ai_summary", isSummary: true },
          }]);
        }

        // Show login modal whenever a ticket is created (plan: login only when escalating)
        if (!userProfile) {
          setShowLoginModal(true);
        }
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
        dept:           result.cat,
      };

      const botText = result.answer ||
        "I don't have a specific answer for that right now. I've flagged it for review — a support agent will follow up shortly.";

      setMessages(prev => [...prev, { role: "bot", text: botText, meta }]);

    } catch {
      const sent       = detectSentiment(text);
      const newHistory = [...sentHistory, sent];
      setSentHistory(newHistory);
      const newDrift = calcDrift(newHistory);
      setDrift(newDrift);
      runLocalFallback(text, newHistory, newDrift);
    } finally {
      setIsTyping(false);
    }
  }, [input, isTyping, sentHistory, collectingDetails, uploadedFile, runLocalFallback, pushToast]);

  // ── File upload handler ───────────────────────────────────────────
  const handleFileSelect = useCallback((file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedFile({ name: file.name, type: file.type, dataUrl: e.target.result });
      pushToast(`📎 ${file.name} attached`, "info");
    };
    reader.readAsDataURL(file);
  }, [pushToast]);

  const clearFile = useCallback(() => setUploadedFile(null), []);

  // ── Submit correction ─────────────────────────────────────────────
  const submitCorrection = useCallback(async () => {
    const val = correctionInput.trim();
    if (!val) return;

    fetch("/api/admin/correct-answer", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ question: lastUserMsg, correct_answer: val }),
    }).catch(() => {});

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

  // ── Login modal ──────────────────────────────────────────────────
  const submitLogin = useCallback(({ name, email }) => {
    setUserProfile({ name, email });
    setShowLoginModal(false);
    // Patch all tickets that still have the placeholder name
    setTickets(prev => prev.map(t =>
      t.customer === "Current User" ? { ...t, customer: name } : t
    ));
    setMessages(prev => [...prev, {
      role: "bot",
      text: `Thanks ${name}! Your ticket has been assigned and our agent will follow up at ${email || "your registered email"} shortly.`,
      meta: { conf: 1.0, cat: "login_confirmed" },
    }]);
    pushToast(`Welcome, ${name}! Ticket tracking enabled.`, "success");
  }, [pushToast]);

  const skipLogin = useCallback(() => {
    setShowLoginModal(false);
  }, []);

  // ── Resolve ticket ────────────────────────────────────────────────
  const resolveTicket = useCallback((ticketId) => {
    setTickets(prev => prev.map(t =>
      t.id === ticketId ? { ...t, status: "resolved" } : t
    ));
  }, []);

  // ── Reset session ─────────────────────────────────────────────────
  const resetSession = useCallback(() => {
    setMessages(INIT_MESSAGES);
    setInput(""); setIsTyping(false); setSentHistory([]);
    setDrift(INIT_DRIFT); setLastConf(null); setTickets(INIT_TICKETS);
    setSelfCorrected({}); setShowCorrection(false);
    setCorrectionInput(""); setLastUserMsg(""); setToasts([]);
    setUploadedFile(null); setCollecting(false);
    setShowLoginModal(false); setUserProfile(null);
    detailPromptIdx.current = 0;
    sustainedNegFired.current = false;
  }, []);

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
    resolveTicket, uploadedFile, handleFileSelect, clearFile,
    collectingDetails, showLoginModal, submitLogin, skipLogin, userProfile,
  };
}
