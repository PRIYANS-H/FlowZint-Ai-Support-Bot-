// ─────────────────────────────────────────────────────────────────────────────
// Flowzint v3 — AI-powered customer support copilot
// Single-file bundled artifact for Claude canvas renderer / hackathon demo
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useRef, useEffect, useCallback } from "react";

// ══════════════════════════════════════════════════════════════════════════════
// DATA — constants.js
// ══════════════════════════════════════════════════════════════════════════════

const FAQ_KB = [
  { q: "refund policy",        a: "Our refund policy allows returns within 30 days of purchase. You'll receive a full refund to your original payment method within 5–7 business days once we receive the item.", conf: 0.92, cat: "refunds"  },
  { q: "track shipment",       a: "You can track your shipment by visiting our tracking page and entering your order ID. You'll also receive an email with a tracking link once your order ships.",               conf: 0.89, cat: "shipping" },
  { q: "cancel order",         a: "Orders can be cancelled within 2 hours of placement. After that, please wait for delivery and use our standard returns process.",                                             conf: 0.87, cat: "orders"  },
  { q: "delivery time",        a: "Standard delivery takes 5–7 business days. Express shipping (2–3 days) is available at checkout for an additional fee.",                                                      conf: 0.91, cat: "shipping" },
  { q: "payment methods",      a: "We accept all major credit cards, UPI, net banking, and wallets including Paytm and PhonePe.",                                                                               conf: 0.94, cat: "payments" },
  { q: "contact support",      a: "Our support team is available 24/7 via this chat or at support@flowzint.com. Average response time is under 2 hours.",                                                       conf: 0.88, cat: "support"  },
  { q: "exchange item",        a: "Exchanges are supported within 14 days of delivery. Visit our returns portal to start an exchange request.",                                                                  conf: 0.85, cat: "returns"  },
  { q: "account password",     a: "To reset your password, click 'Forgot password' on the login page. A reset link will be sent to your registered email.",                                                     conf: 0.90, cat: "account"  },
  { q: "size guide",           a: "Our size guide is available on each product page. If you're between sizes, we recommend sizing up for comfort. Still unsure? Contact support for personalised advice.",       conf: 0.86, cat: "products" },
  { q: "damaged item",         a: "We're sorry to hear that! Please share a photo of the damaged item via chat and we'll arrange a free replacement or full refund within 24 hours.",                            conf: 0.91, cat: "returns"  },
  { q: "loyalty points",       a: "Your loyalty points are visible in your account dashboard. Points can be redeemed at checkout — 100 points = ₹10 discount. Points expire after 12 months.",                  conf: 0.88, cat: "loyalty"  },
  { q: "bulk order",           a: "For bulk or corporate orders of 10+ items, please email bulk@flowzint.com for a custom quote and priority processing with dedicated support.",                                conf: 0.83, cat: "orders"  },
  { q: "international shipping", a: "We ship to 45+ countries. International delivery takes 10–15 business days. Customs duties may apply depending on your destination country.",                              conf: 0.87, cat: "shipping" },
  { q: "warranty",             a: "All products include a 1-year manufacturer warranty. To raise a warranty claim, contact support with your order ID and a description of the issue.",                          conf: 0.90, cat: "products" },
  { q: "promo code",           a: "Enter your promo code at checkout in the 'Discount code' field. Codes are case-sensitive and can only be used once per account.",                                             conf: 0.93, cat: "payments" },
  { q: "app not working",      a: "Try force-closing the app and reopening it. If that doesn't help, clear the app cache in your phone settings or reinstall. Contact support if the issue persists.",           conf: 0.85, cat: "support"  },
];

const HINGLISH_WORDS    = ["nahi", "yaar", "mera", "abhi", "karo", "hai", "hua", "bhai", "iska", "kyun", "aaya", "kab", "kuch", "dekho", "bilkul", "theek"];
const NEG_WORDS         = ["frustrated", "angry", "terrible", "horrible", "worst", "disappointed", "useless", "ridiculous", "third time", "unresolved", "still waiting", "never", "pathetic", "awful", "outrageous", "unacceptable", "disgusting", "furious", "incompetent"];
const POS_WORDS         = ["thank", "great", "excellent", "perfect", "wonderful", "happy", "love", "awesome", "fast", "resolved", "helpful", "amazing", "appreciate", "good"];
const ESCALATE_TRIGGERS = ["third time", "never resolved", "unacceptable", "speak to manager", "this is a joke", "three times", "demanding refund", "legal action", "consumer forum", "chargeback"];
const HINGLISH_NEG      = ["nahi aaya", "problem hai", "kab aayega", "kuch nahi hua", "abhi tak nahi"];

const QUICK_MSGS = [
  { label: "Refund policy", text: "What is your refund policy?" },
  { label: "Track order",   text: "How do I track my shipment?" },
  { label: "Angry",         text: "My order hasn't arrived and I'm really frustrated!" },
  { label: "Escalation",    text: "This is the third time my issue hasn't been resolved!" },
  { label: "Hinglish",      text: "Mera order abhi tak nahi aaya yaar" },
  { label: "Unknown",       text: "Can I change my delivery address after ordering?" },
];

const INIT_TICKETS = [
  { id: "#1042", customer: "Rahul M.",  issue: "Order not delivered after 12 days",   pri: "high", status: "escalated", trigger: "Drift detection",       ts: "09:14" },
  { id: "#1039", customer: "Sneha P.",  issue: "Wrong item shipped",                  pri: "high", status: "open",      trigger: "Frustration keywords",  ts: "10:32" },
  { id: "#1035", customer: "Arjun K.",  issue: "Refund not processed in 10 days",     pri: "med",  status: "open",      trigger: "Auto-ticket",            ts: "11:05" },
  { id: "#1031", customer: "Divya R.",  issue: "App login issue – can't access acct", pri: "low",  status: "resolved",  trigger: "Auto-ticket",            ts: "08:47" },
];

const CLUSTERS = [
  { label: "Delivery delays",       count: 47, pct: 0.85 },
  { label: "Refund not processed",  count: 31, pct: 0.56 },
  { label: "Wrong item received",   count: 18, pct: 0.33 },
  { label: "App login issues",      count: 12, pct: 0.22 },
];

const CHURN_RISKS = [
  { name: "Rahul M.", risk: "high", driver: "3 unresolved tickets",         action: "Priority escalation to senior agent" },
  { name: "Priya K.", risk: "high", driver: "Sustained negative sentiment", action: "Personalized discount offer"          },
  { name: "Amit S.",  risk: "med",  driver: "Extended inactivity (8 days)", action: "Re-engagement campaign"              },
  { name: "Nisha R.", risk: "med",  driver: "2 escalations this week",      action: "Assign dedicated account manager"    },
];

const HOURLY_SENTIMENT = [
  { hour: "9am",  pos: 12, neu: 20, neg: 8  },
  { hour: "10am", pos: 18, neu: 22, neg: 6  },
  { hour: "11am", pos: 15, neu: 25, neg: 10 },
  { hour: "12pm", pos: 22, neu: 18, neg: 5  },
  { hour: "1pm",  pos: 19, neu: 24, neg: 7  },
  { hour: "2pm",  pos: 25, neu: 20, neg: 4  },
  { hour: "3pm",  pos: 21, neu: 23, neg: 6  },
  { hour: "4pm",  pos: 28, neu: 19, neg: 3  },
];

// ══════════════════════════════════════════════════════════════════════════════
// ENGINE — engine.js
// ══════════════════════════════════════════════════════════════════════════════

function detectSentiment(text) {
  const t = text.toLowerCase();
  let score = 0;
  NEG_WORDS.forEach(w    => { if (t.includes(w)) score -= 2; });
  POS_WORDS.forEach(w    => { if (t.includes(w)) score += 2; });
  HINGLISH_NEG.forEach(w => { if (t.includes(w)) score -= 2; });
  if (t.includes("!") && score < 0) score -= 1;
  if (t.includes("??"))              score -= 1;
  return score > 0 ? "positive" : score < -1 ? "negative" : "neutral";
}

// Recency-weighted slope across the full sentiment history
function calcDrift(history) {
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

function retrieveFAQ(query, selfCorrected = {}) {
  const q        = query.toLowerCase();
  const hinglish = HINGLISH_WORDS.some(h => q.includes(h));

  if (selfCorrected[q])
    return { answer: selfCorrected[q], conf: 0.97, self_corrected: true, hinglish };

  let best = null, bestScore = 0;
  FAQ_KB.forEach(f => {
    const words = f.q.split(" ");
    const score = words.filter(w => q.includes(w)).length / words.length;
    if (score > bestScore) { bestScore = score; best = f; }
  });

  if (bestScore > 0.35 && best)
    return { answer: best.a, conf: best.conf, cat: best.cat, hinglish };

  return { answer: null, conf: 0.18, cat: "unknown", hinglish };
}

function shouldEscalate(text, drift) {
  const t = text.toLowerCase();
  return ESCALATE_TRIGGERS.some(tr => t.includes(tr)) || drift.trend === "rapidly_degrading";
}

// Pure — caller passes currentCount to derive the next ID
function makeTicket(issue, pri, trigger, currentCount) {
  const id  = `#${1050 + currentCount + 1}`;
  const now = new Date();
  const ts  = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
  return {
    id, customer: "Current User",
    issue: issue.length > 52 ? issue.substring(0, 52) + "…" : issue,
    pri, status: "open", trigger, ts,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// DESIGN TOKENS & SHARED COMPONENTS — ui.jsx
// ══════════════════════════════════════════════════════════════════════════════

const COLORS = {
  purple: { bg: "#EEEDFE", text: "#3C3489", border: "#AFA9EC", solid: "#534AB7" },
  green:  { bg: "#EAF3DE", text: "#3B6D11", border: "#9FE1CB" },
  red:    { bg: "#FCEBEB", text: "#A32D2D", border: "#F09595" },
  amber:  { bg: "#FAEEDA", text: "#854F0B", border: "#FAC775" },
  gray:   { bg: "#F1EFE8", text: "#5F5E5A", border: "#D3D1C7" },
};

function Badge({ children, color = "gray" }) {
  const c = COLORS[color] || COLORS.gray;
  return (
    <span style={{
      fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 500,
      background: c.bg, color: c.text, border: `0.5px solid ${c.border}`,
      whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
}

function MetricCard({ num, label, delta, deltaUp }) {
  return (
    <div style={{ background: "var(--color-background-secondary)", borderRadius: 10, padding: "14px 16px", flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 28, fontWeight: 500, color: "var(--color-text-primary)", lineHeight: 1.1 }}>{num}</div>
      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 4 }}>{label}</div>
      <div style={{ fontSize: 11, marginTop: 6, color: deltaUp ? "#3B6D11" : "#A32D2D" }}>{delta}</div>
    </div>
  );
}

function DriftBar({ drift, turns }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: drift.color }}>{drift.label}</span>
        <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{turns} turns</span>
      </div>
      <div style={{ height: 7, borderRadius: 4, background: "var(--color-border-tertiary)", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${drift.score * 100}%`, borderRadius: 4,
          background: drift.color, transition: "width 0.45s ease, background 0.45s ease",
        }} />
      </div>
    </div>
  );
}

function ToastStack({ toasts }) {
  if (!toasts.length) return null;
  const typeColor = { warn: "#EF9F27", success: "#1D9E75", info: "#534AB7" };
  return (
    <div style={{ position: "absolute", top: 12, right: 12, zIndex: 50, display: "flex", flexDirection: "column", gap: 6, pointerEvents: "none" }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500,
          background: "var(--color-background-primary)",
          border: `0.5px solid ${typeColor[t.type] || "#534AB7"}`,
          color: typeColor[t.type] || "#534AB7",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          animation: "slideIn 0.2s ease",
        }}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

function ChatBubble({ msg }) {
  const isBot = msg.role === "bot";
  const m     = msg.meta || {};

  const bubbleBg = !isBot
    ? COLORS.purple.solid
    : m.fallback   ? COLORS.red.bg
    : m.escalated  ? COLORS.amber.bg
    : "var(--color-background-secondary)";

  const bubbleColor = !isBot ? "#fff" : "var(--color-text-primary)";
  const borderLeft  = m.fallback  ? `3px solid ${COLORS.red.text}`
                    : m.escalated ? `3px solid ${COLORS.amber.text}`
                    : "none";

  return (
    <div style={{ display: "flex", gap: 10, flexDirection: isBot ? "row" : "row-reverse", alignItems: "flex-start" }}>
      <div style={{
        width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 14, flexShrink: 0,
        background: isBot ? COLORS.purple.bg : COLORS.green.bg,
        color:      isBot ? COLORS.purple.solid : COLORS.green.text,
        border:     `0.5px solid ${isBot ? COLORS.purple.border : COLORS.green.border}`,
      }}>
        {isBot
          ? <i className="ti ti-robot" style={{ fontSize: 14 }} aria-hidden="true" />
          : <i className="ti ti-user"  style={{ fontSize: 14 }} aria-hidden="true" />
        }
      </div>
      <div style={{ maxWidth: "76%" }}>
        <div style={{
          padding: "9px 13px", fontSize: 13, lineHeight: 1.58,
          background: bubbleBg, color: bubbleColor, borderLeft,
          borderRadius: isBot ? "4px 12px 12px 12px" : "12px 4px 12px 12px",
          whiteSpace: "pre-wrap",
        }}>
          {msg.text}
        </div>
        {isBot && m.conf != null && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: m.conf > 0.7 ? "#3B6D11" : m.conf > 0.5 ? "#854F0B" : "#A32D2D" }}>
              {Math.round(m.conf * 100)}% confidence
            </span>
            {m.cat && m.cat !== "unknown" && <Badge color="gray">{m.cat}</Badge>}
            {m.self_corrected && <span style={{ fontSize: 11, color: COLORS.purple.solid }}>✓ Self-corrected</span>}
            {m.hinglish       && <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Hinglish</span>}
            {m.ticketId       && <span style={{ fontSize: 11, color: COLORS.amber.text }}><i className="ti ti-ticket" style={{ fontSize: 11 }} /> {m.ticketId} · {m.trigger}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 500, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>
      {children}
    </div>
  );
}

function Panel({ children, style = {} }) {
  return (
    <div style={{
      border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12,
      padding: 16, background: "var(--color-background-primary)", ...style,
    }}>
      {children}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HOOK — useChat.js
// ══════════════════════════════════════════════════════════════════════════════

const INIT_MESSAGES = [
  { role: "bot", text: "Hi! I'm Flowzint, your AI support copilot. How can I help today?", meta: { conf: 0.99 } },
];
const INIT_DRIFT = { trend: "stable", score: 0.5, label: "Stable", color: "#534AB7" };

function useChat() {
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
    setInput(""); setIsTyping(false); setSentHistory([]);
    setDrift(INIT_DRIFT); setLastConf(null); setTickets(INIT_TICKETS);
    setSelfCorrected({}); setShowCorrection(false);
    setCorrectionInput(""); setLastUserMsg(""); setToasts([]);
    sustainedNegFired.current = false;
  }, []);

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

// ══════════════════════════════════════════════════════════════════════════════
// VIEW — ChatView.jsx
// ══════════════════════════════════════════════════════════════════════════════

function ChatView({
  messages, input, setInput, isTyping, sentHistory,
  drift, lastConf, tickets,
  showCorrection, correctionInput, setCorrectionInput,
  send, submitCorrection, messagesRef,
}) {
  const isDegrading = drift.trend === "rapidly_degrading" || drift.trend === "degrading";

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

      {/* Left: chat panel */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: "0.5px solid var(--color-border-tertiary)" }}>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, padding: "8px 14px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
          <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", lineHeight: "22px" }}>Try:</span>
          {QUICK_MSGS.map(q => (
            <button key={q.label} onClick={() => send(q.text)} style={{
              fontSize: 11, padding: "3px 10px",
              border: "0.5px solid var(--color-border-secondary)", borderRadius: 20, cursor: "pointer",
              color: "var(--color-text-secondary)", background: "var(--color-background-primary)",
            }}>
              {q.label}
            </button>
          ))}
        </div>

        <div ref={messagesRef} style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          {messages.map((m, i) => <ChatBubble key={i} msg={m} />)}
          {isTyping && (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#EEEDFE", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="ti ti-robot" style={{ fontSize: 14, color: "#534AB7" }} aria-hidden="true" />
              </div>
              <div style={{ padding: "8px 13px", borderRadius: "4px 12px 12px 12px", background: "var(--color-background-secondary)", fontSize: 13, color: "var(--color-text-tertiary)" }}>
                <span style={{ letterSpacing: 2 }}>···</span>
              </div>
            </div>
          )}
        </div>

        {showCorrection && (
          <div style={{ margin: "0 14px 8px", padding: "10px 12px", background: "#EEEDFE", border: "0.5px solid #AFA9EC", borderRadius: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#3C3489", marginBottom: 6 }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: 12, marginRight: 4 }} />
              Low confidence — self-correct triggered
            </div>
            <div style={{ fontSize: 11, color: "#534AB7", marginBottom: 8 }}>
              Submit the correct answer to improve future responses automatically.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={correctionInput}
                onChange={e => setCorrectionInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submitCorrection()}
                placeholder="Type the correct answer…"
                style={{
                  flex: 1, padding: "5px 10px", fontSize: 12,
                  border: "0.5px solid #AFA9EC", borderRadius: 6,
                  background: "var(--color-background-primary)", color: "var(--color-text-primary)", outline: "none",
                }}
              />
              <button onClick={submitCorrection} style={{
                padding: "5px 12px", background: "#534AB7", color: "#fff",
                border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 4,
              }}>
                <i className="ti ti-check" style={{ fontSize: 12 }} /> Submit
              </button>
            </div>
          </div>
        )}

        <div style={{ padding: "10px 14px", borderTop: "0.5px solid var(--color-border-tertiary)", display: "flex", gap: 8 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
            placeholder="Type a customer message…"
            style={{
              flex: 1, padding: "9px 13px", fontSize: 13,
              border: "0.5px solid var(--color-border-secondary)", borderRadius: 8,
              background: "var(--color-background-primary)", color: "var(--color-text-primary)", outline: "none",
            }}
          />
          <button onClick={() => send()} style={{
            padding: "9px 18px", background: "#534AB7", color: "#fff",
            border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer", fontWeight: 500,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <i className="ti ti-send" style={{ fontSize: 13 }} /> Send
          </button>
        </div>
      </div>

      {/* Right: info panel */}
      <div style={{ width: 218, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Drift tracker with live pulse */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 500, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: 0.6 }}>
              Sentiment drift
            </span>
            {isDegrading && (
              <span style={{
                width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                background: drift.trend === "rapidly_degrading" ? "#E24B4A" : "#EF9F27",
                display: "inline-block",
                animation: "pulseOpacity 1.4s ease-in-out infinite",
              }} aria-label="Active degradation" />
            )}
          </div>
          <DriftBar drift={drift} turns={sentHistory.length} />
        </div>

        {/* Turn history chips */}
        <div>
          <SectionLabel>Turn history</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxHeight: 80, overflowY: "auto" }}>
            {sentHistory.length === 0
              ? <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>No turns yet</span>
              : sentHistory.slice(-7).map((s, i) => (
                <span key={i} style={{
                  fontSize: 11, padding: "2px 7px", borderRadius: 20, fontWeight: 500,
                  background: s === "positive" ? "#EAF3DE" : s === "negative" ? "#FCEBEB" : "var(--color-background-secondary)",
                  color:      s === "positive" ? "#3B6D11"  : s === "negative" ? "#A32D2D"  : "var(--color-text-secondary)",
                }}>
                  {s === "positive" ? "↑" : s === "negative" ? "↓" : "→"} {s}
                </span>
              ))
            }
          </div>
        </div>

        {/* Confidence meter + threshold legend */}
        <div>
          <SectionLabel>Last confidence</SectionLabel>
          <div style={{
            fontSize: 26, fontWeight: 500,
            color: lastConf == null ? "var(--color-text-tertiary)"
                 : lastConf > 0.7  ? "#1D9E75"
                 : lastConf > 0.5  ? "#EF9F27"
                 : "#E24B4A",
          }}>
            {lastConf == null ? "—" : `${Math.round(lastConf * 100)}%`}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 6 }}>
            {[
              { color: "#1D9E75", label: "High ≥70%" },
              { color: "#EF9F27", label: "Med 50–70%" },
              { color: "#E24B4A", label: "Low <50%" },
            ].map(({ color, label }) => (
              <span key={label} style={{ fontSize: 10, color: "var(--color-text-tertiary)", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Recent tickets with trigger */}
        <div>
          <SectionLabel>Recent tickets</SectionLabel>
          {tickets.slice(0, 3).map(t => (
            <div key={t.id} style={{
              padding: 10, border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8,
              background: "var(--color-background-secondary)", fontSize: 12, marginBottom: 8,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: "#534AB7", fontWeight: 500 }}>{t.id}</span>
                <Badge color={t.pri === "high" ? "red" : t.pri === "med" ? "amber" : "green"}>{t.pri}</Badge>
              </div>
              <div style={{ color: "var(--color-text-secondary)", fontSize: 11 }}>
                {t.issue.length > 36 ? t.issue.substring(0, 36) + "…" : t.issue}
              </div>
              <div style={{ color: "var(--color-text-tertiary)", fontSize: 10, marginTop: 3 }}>{t.trigger}</div>
              <div style={{ color: "var(--color-text-tertiary)", fontSize: 10, marginTop: 2 }}>{t.ts}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VIEW — DashboardView.jsx
// ══════════════════════════════════════════════════════════════════════════════

function SentimentSparkline() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el || !window.Chart) return;
    if (el._chart) el._chart.destroy();

    el._chart = new window.Chart(el, {
      type: "line",
      data: {
        labels: HOURLY_SENTIMENT.map(h => h.hour),
        datasets: [
          { label: "Positive", data: HOURLY_SENTIMENT.map(h => h.pos), borderColor: "#1D9E75", backgroundColor: "rgba(29,158,117,0.07)", fill: true, tension: 0.4, pointRadius: 3, borderWidth: 2 },
          { label: "Neutral",  data: HOURLY_SENTIMENT.map(h => h.neu), borderColor: "#534AB7", backgroundColor: "rgba(83,74,183,0.05)",  fill: true, tension: 0.4, pointRadius: 3, borderWidth: 2 },
          { label: "Negative", data: HOURLY_SENTIMENT.map(h => h.neg), borderColor: "#E24B4A", backgroundColor: "rgba(226,75,74,0.06)",  fill: true, tension: 0.4, pointRadius: 3, borderWidth: 2 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          y: { grid: { color: "rgba(128,128,128,0.08)" }, ticks: { font: { size: 11 } } },
        },
      },
    });
  }, []);

  return (
    <div style={{ position: "relative", height: 160 }}>
      <canvas ref={canvasRef} role="img" aria-label="Hourly sentiment trend" />
    </div>
  );
}

function DashboardView({ stats, selfCorrected, tickets }) {
  const seenDrivers = new Set();
  const liveChurn = (tickets || [])
    .filter(t => t.pri === "high" && t.customer === "Current User")
    .reduce((acc, t) => {
      if (!seenDrivers.has(t.trigger)) {
        seenDrivers.add(t.trigger);
        acc.push({ name: "Current User", risk: "high", driver: t.trigger, action: "Immediate intervention required", live: true });
      }
      return acc;
    }, []);

  const allChurnRisks = [...liveChurn, ...CHURN_RISKS];

  const resolutionRate = stats.totalConvs > 0
    ? `${Math.round(stats.autoResolved / stats.totalConvs * 100)}% resolution rate`
    : "Start chatting to see stats";

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>

      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <MetricCard num={stats.totalConvs}   label="Conversations today"  delta="↑ 12% vs yesterday"    deltaUp />
        <MetricCard num={stats.autoResolved} label="Auto-resolved by bot" delta={resolutionRate}         deltaUp />
        <MetricCard num={stats.escalated}    label="Escalated to agent"   delta="↑ from drift detection" deltaUp={false} />
        <MetricCard num={stats.churnRisk}    label="High churn risk"      delta="Needs immediate action" deltaUp={false} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

        <Panel>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#534AB7" }}>●</span> Emerging issues
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", fontWeight: 400 }}>— unsupervised</span>
          </div>
          {CLUSTERS.map(c => (
            <div key={c.label} style={{ padding: "8px 10px", borderRadius: 8, background: "var(--color-background-secondary)", marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ fontWeight: 500 }}>{c.label}</span>
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{c.count}</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: "var(--color-border-tertiary)", marginTop: 6 }}>
                <div style={{ height: 4, borderRadius: 2, background: "#534AB7", width: `${Math.round(c.pct * 100)}%` }} />
              </div>
            </div>
          ))}
        </Panel>

        <Panel>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#E24B4A" }}>●</span> Churn risk + action
            {liveChurn.length > 0 && (
              <span style={{ fontSize: 10, color: "#534AB7", fontWeight: 400, marginLeft: 4 }}>
                {liveChurn.length} live
              </span>
            )}
          </div>
          {allChurnRisks.map((c, i) => (
            <div key={`${c.name}-${i}`} style={{
              padding: "8px 0", borderBottom: "0.5px solid var(--color-border-tertiary)",
              display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8,
            }}>
              <div style={{ fontSize: 12 }}>
                <div style={{ fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}>
                  {c.name}
                  {c.live && <span style={{ fontSize: 9, color: "#534AB7", border: "0.5px solid #AFA9EC", borderRadius: 3, padding: "1px 4px" }}>live</span>}
                </div>
                <div style={{ color: "var(--color-text-secondary)", marginTop: 2, fontSize: 11 }}>Driver: {c.driver}</div>
                <div style={{ color: "#534AB7", marginTop: 2, fontSize: 11 }}>→ {c.action}</div>
              </div>
              <Badge color={c.live ? "purple" : c.risk === "high" ? "red" : "amber"}>{c.risk}</Badge>
            </div>
          ))}
        </Panel>
      </div>

      <Panel style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Sentiment trend (today)</div>
          <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
            {[["#1D9E75","Positive"],["#534AB7","Neutral"],["#E24B4A","Negative"]].map(([col, lbl]) => (
              <span key={lbl} style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--color-text-secondary)" }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: col, display: "inline-block" }} /> {lbl}
              </span>
            ))}
          </div>
        </div>
        <SentimentSparkline />
      </Panel>

      <Panel>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>
          <i className="ti ti-check" style={{ fontSize: 13, marginRight: 5, color: "#1D9E75" }} />
          Self-corrected knowledge base
        </div>
        {Object.keys(selfCorrected).length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", lineHeight: 1.6 }}>
            No corrections yet. When the bot gives a low-confidence answer and an agent submits a correction,
            it appears here automatically with a pending review flag.
          </div>
        ) : (
          Object.entries(selfCorrected).map(([q, a]) => (
            <div key={q} style={{ padding: "8px 10px", background: "#EEEDFE", border: "0.5px solid #AFA9EC", borderRadius: 8, marginBottom: 8, fontSize: 12 }}>
              <div style={{ fontWeight: 500, color: "#3C3489", marginBottom: 2 }}>Q: {q}</div>
              <div style={{ color: "var(--color-text-secondary)", marginBottom: 6 }}>A: {a}</div>
              <Badge color="purple">Pending review</Badge>
            </div>
          ))
        )}
      </Panel>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VIEW — TicketsView.jsx
// ══════════════════════════════════════════════════════════════════════════════

const STATUS_FILTERS = ["all", "open", "escalated", "resolved"];

function TicketsView({ tickets }) {
  const [filter, setFilter]         = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [notes, setNotes]           = useState({});

  const visible    = filter === "all" ? tickets : tickets.filter(t => t.status === filter);
  const toggleExpand = (id) => setExpandedId(prev => prev === id ? null : id);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>
          All tickets
          <span style={{ fontSize: 12, color: "var(--color-text-tertiary)", fontWeight: 400, marginLeft: 8 }}>{visible.length} shown</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {STATUS_FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              fontSize: 11, padding: "4px 12px", borderRadius: 20, cursor: "pointer",
              border: "0.5px solid var(--color-border-secondary)",
              background: filter === f ? "#534AB7" : "var(--color-background-primary)",
              color:      filter === f ? "#fff"     : "var(--color-text-secondary)",
              fontWeight: filter === f ? 500 : 400, transition: "background 0.15s",
            }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "8%" }} /><col style={{ width: "14%" }} /><col style={{ width: "30%" }} />
          <col style={{ width: "10%" }} /><col style={{ width: "12%" }} /><col style={{ width: "20%" }} />
          <col style={{ width: "6%" }} />
        </colgroup>
        <thead>
          <tr>
            {["ID", "Customer", "Issue", "Priority", "Status", "Trigger", "Time"].map(h => (
              <th key={h} style={{
                textAlign: "left", padding: "8px 10px", fontSize: 10, fontWeight: 500,
                color: "var(--color-text-tertiary)", borderBottom: "0.5px solid var(--color-border-tertiary)",
                textTransform: "uppercase", letterSpacing: 0.5, overflow: "hidden",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ padding: "20px 10px", textAlign: "center", color: "var(--color-text-tertiary)", fontSize: 13 }}>
                No tickets match this filter.
              </td>
            </tr>
          ) : visible.map(t => (
            <React.Fragment key={t.id}>
              <tr
                onClick={() => toggleExpand(t.id)}
                style={{
                  borderBottom: expandedId === t.id ? "none" : "0.5px solid var(--color-border-tertiary)",
                  cursor: "pointer",
                  background: expandedId === t.id ? "var(--color-background-secondary)" : "transparent",
                }}
              >
                <td style={{ padding: "10px 10px", color: "#534AB7", fontWeight: 500, fontSize: 12 }}>{t.id}</td>
                <td style={{ padding: "10px 10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.customer}</td>
                <td style={{ padding: "10px 10px", color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.issue}</td>
                <td style={{ padding: "10px 10px" }}>
                  <Badge color={t.pri === "high" ? "red" : t.pri === "med" ? "amber" : "green"}>{t.pri}</Badge>
                </td>
                <td style={{ padding: "10px 10px" }}>
                  <Badge color={t.status === "escalated" ? "red" : t.status === "resolved" ? "green" : "amber"}>{t.status}</Badge>
                </td>
                <td style={{ padding: "10px 10px", color: "var(--color-text-tertiary)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.trigger}</td>
                <td style={{ padding: "10px 10px", color: "var(--color-text-tertiary)", fontSize: 11 }}>
                  {t.ts}
                  <span style={{ float: "right", fontSize: 10 }}>
                    <i className={`ti ti-chevron-${expandedId === t.id ? "up" : "down"}`} />
                  </span>
                </td>
              </tr>
              {expandedId === t.id && (
                <tr style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                  <td colSpan={7} style={{ padding: "8px 16px 14px", background: "var(--color-background-secondary)" }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 6 }}>
                      <i className="ti ti-notes" style={{ fontSize: 11, marginRight: 4 }} /> Agent notes
                    </div>
                    <textarea
                      value={notes[t.id] || ""}
                      onChange={e => setNotes(prev => ({ ...prev, [t.id]: e.target.value }))}
                      onClick={e => e.stopPropagation()}
                      placeholder="Add notes about this ticket…"
                      rows={3}
                      style={{
                        width: "100%", fontSize: 12, padding: "8px 10px",
                        border: "0.5px solid var(--color-border-secondary)", borderRadius: 6,
                        background: "var(--color-background-primary)", color: "var(--color-text-primary)",
                        resize: "vertical", outline: "none", boxSizing: "border-box", fontFamily: "inherit",
                      }}
                    />
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ROOT — App.jsx
// ══════════════════════════════════════════════════════════════════════════════

const NAV = [
  { id: "chat",      icon: "ti-message-circle",  label: "Live chat"  },
  { id: "dashboard", icon: "ti-layout-dashboard", label: "Dashboard"  },
  { id: "tickets",   icon: "ti-ticket",           label: "Tickets"    },
];

const TITLES = {
  chat:      "Live support chat",
  dashboard: "Analytics dashboard",
  tickets:   "Ticket management",
};

export default function App() {
  const [view, setView] = useState("chat");
  const chat = useChat();

  // Inject Tabler Icons CSS and Chart.js from CDN on first render
  useEffect(() => {
    if (!document.getElementById("tabler-icons-css")) {
      const link = document.createElement("link");
      link.id   = "tabler-icons-css";
      link.rel  = "stylesheet";
      link.href = "https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css";
      document.head.appendChild(link);
    }
    if (!document.getElementById("chartjs-cdn")) {
      const script = document.createElement("script");
      script.id  = "chartjs-cdn";
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
      document.head.appendChild(script);
    }
  }, []);

  const openTickets = chat.tickets.filter(t => t.status !== "resolved").length;

  return (
    <>
      <style>{`
        @keyframes pulseOpacity {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.25; }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{
        display: "flex", height: 640,
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: 12, overflow: "hidden",
        background: "var(--color-background-primary)",
        position: "relative",
      }}>
        <ToastStack toasts={chat.toasts} />

        {/* Sidebar */}
        <div style={{
          width: 196, borderRight: "0.5px solid var(--color-border-tertiary)",
          background: "var(--color-background-secondary)",
          display: "flex", flexDirection: "column", flexShrink: 0,
        }}>
          <div style={{
            padding: "14px 16px", borderBottom: "0.5px solid var(--color-border-tertiary)",
            fontSize: 15, fontWeight: 500, display: "flex", alignItems: "center", gap: 8,
          }}>
            <i className="ti ti-bolt" style={{ fontSize: 18, color: "#534AB7" }} aria-hidden="true" /> Flowzint
          </div>

          {NAV.map(n => (
            <div
              key={n.id}
              onClick={() => setView(n.id)}
              style={{
                padding: "10px 16px", fontSize: 13, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 10,
                color:      view === n.id ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                background: view === n.id ? "var(--color-background-primary)" : "transparent",
                fontWeight: view === n.id ? 500 : 400,
                borderRight: view === n.id ? "2px solid #534AB7" : "none",
                transition: "background 0.15s",
              }}
            >
              <i className={`ti ${n.icon}`} style={{ fontSize: 15 }} aria-hidden="true" />
              {n.label}
              {n.id === "tickets" && openTickets > 0 && (
                <span style={{
                  marginLeft: "auto", background: "#534AB7", color: "#fff",
                  fontSize: 10, padding: "1px 6px", borderRadius: 20,
                }}>
                  {openTickets}
                </span>
              )}
            </div>
          ))}

          <div style={{ flex: 1 }} />

          <div style={{
            padding: "12px 16px", fontSize: 11, color: "var(--color-text-tertiary)",
            borderTop: "0.5px solid var(--color-border-tertiary)",
          }}>
            <div style={{ fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 2 }}>
              <i className="ti ti-user" style={{ fontSize: 11, marginRight: 4 }} />Agent: Priya S.
            </div>
            <div>Status: <span style={{ color: "#3B6D11" }}>● Online</span></div>
          </div>
        </div>

        {/* Main area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Topbar */}
          <div style={{
            padding: "10px 20px", borderBottom: "0.5px solid var(--color-border-tertiary)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{TITLES[view]}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, fontWeight: 500, background: "#EAF3DE", color: "#3B6D11" }}>
                ● Live
              </span>
              <button onClick={chat.resetSession} style={{
                fontSize: 11, padding: "3px 10px",
                border: "0.5px solid var(--color-border-secondary)", borderRadius: 20, cursor: "pointer",
                color: "var(--color-text-secondary)", background: "var(--color-background-primary)",
                display: "flex", alignItems: "center", gap: 4,
              }}>
                <i className="ti ti-refresh" style={{ fontSize: 12 }} aria-hidden="true" /> Reset
              </button>
            </div>
          </div>

          {view === "chat"      && <ChatView {...chat} />}
          {view === "dashboard" && <DashboardView stats={chat.stats} selfCorrected={chat.selfCorrected} tickets={chat.tickets} />}
          {view === "tickets"   && <TicketsView tickets={chat.tickets} />}
        </div>
      </div>
    </>
  );
}