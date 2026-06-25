import { useState, useRef, useEffect, useCallback } from "react";

// ══════════════════════════════════════════════════════════════════════
// DATA — constants.js
// ══════════════════════════════════════════════════════════════════════
const FAQ_KB = [
  { q: "refund policy",   a: "Our refund policy allows returns within 30 days of purchase. You'll receive a full refund to your original payment method within 5–7 business days once we receive the item.", conf: 0.92, cat: "refunds"  },
  { q: "track shipment",  a: "You can track your shipment by visiting our tracking page and entering your order ID. You'll also receive an email with a tracking link once your order ships.", conf: 0.89, cat: "shipping" },
  { q: "cancel order",    a: "Orders can be cancelled within 2 hours of placement. After that, please wait for delivery and use our standard returns process.", conf: 0.87, cat: "orders"   },
  { q: "delivery time",   a: "Standard delivery takes 5–7 business days. Express shipping (2–3 days) is available at checkout for an additional fee.", conf: 0.91, cat: "shipping" },
  { q: "payment methods", a: "We accept all major credit cards, UPI, net banking, and wallets including Paytm and PhonePe.", conf: 0.94, cat: "payments" },
  { q: "contact support", a: "Our support team is available 24/7 via this chat or at support@flowzint.com. Average response time is under 2 hours.", conf: 0.88, cat: "support"  },
  { q: "exchange item",   a: "Exchanges are supported within 14 days of delivery. Visit our returns portal to start an exchange request.", conf: 0.85, cat: "returns"  },
  { q: "account password",a: "To reset your password, click 'Forgot password' on the login page. A reset link will be sent to your registered email.", conf: 0.90, cat: "account"  },
];

const HINGLISH_WORDS    = ["nahi","yaar","mera","abhi","karo","hai","hua","bhai","iska","kyun","aaya","kab","kuch","dekho","bilkul","theek"];
const NEG_WORDS         = ["frustrated","angry","terrible","horrible","worst","disappointed","useless","ridiculous","third time","unresolved","still waiting","never","pathetic","awful","outrageous","unacceptable","disgusting","furious","incompetent"];
const POS_WORDS         = ["thank","great","excellent","perfect","wonderful","happy","love","awesome","fast","resolved","helpful","amazing","appreciate","good"];
const ESCALATE_TRIGGERS = ["third time","never resolved","unacceptable","speak to manager","this is a joke","three times","demanding refund","legal action","consumer forum","chargeback"];
const HINGLISH_NEG      = ["nahi aaya","problem hai","kab aayega","kuch nahi hua","abhi tak nahi"];

const QUICK_MSGS = [
  { label: "Refund policy", text: "What is your refund policy?"                             },
  { label: "Track order",   text: "How do I track my shipment?"                             },
  { label: "Angry",         text: "My order hasn't arrived and I'm really frustrated!"      },
  { label: "Escalation",    text: "This is the third time my issue hasn't been resolved!"   },
  { label: "Hinglish",      text: "Mera order abhi tak nahi aaya yaar"                      },
  { label: "Unknown",       text: "Can I change my delivery address after ordering?"        },
];

const INIT_TICKETS = [
  { id: "#1042", customer: "Rahul M.", issue: "Order not delivered after 12 days",          pri: "high", status: "escalated", trigger: "Drift detection",      ts: "09:14" },
  { id: "#1039", customer: "Sneha P.", issue: "Wrong item shipped",                         pri: "high", status: "open",      trigger: "Frustration keywords", ts: "10:32" },
  { id: "#1035", customer: "Arjun K.", issue: "Refund not processed in 10 days",            pri: "med",  status: "open",      trigger: "Auto-ticket",          ts: "11:05" },
  { id: "#1031", customer: "Divya R.", issue: "App login issue – can't access account",     pri: "low",  status: "resolved",  trigger: "Auto-ticket",          ts: "08:47" },
];

const CLUSTERS = [
  { label: "Delivery delays",       count: 47, pct: 0.85 },
  { label: "Refund not processed",  count: 31, pct: 0.56 },
  { label: "Wrong item received",   count: 18, pct: 0.33 },
  { label: "App login issues",      count: 12, pct: 0.22 },
];

const CHURN_RISKS = [
  { name: "Rahul M.", risk: "high", driver: "3 unresolved tickets",         action: "Priority escalation to senior agent"  },
  { name: "Priya K.", risk: "high", driver: "Sustained negative sentiment", action: "Personalized discount offer"          },
  { name: "Amit S.",  risk: "med",  driver: "Extended inactivity (8 days)", action: "Re-engagement campaign"              },
  { name: "Nisha R.", risk: "med",  driver: "2 escalations this week",      action: "Assign dedicated account manager"    },
];

const HOURLY = [
  { h: "9am",  p: 12, n: 20, g: 8  },
  { h: "10am", p: 18, n: 22, g: 6  },
  { h: "11am", p: 15, n: 25, g: 10 },
  { h: "12pm", p: 22, n: 18, g: 5  },
  { h: "1pm",  p: 19, n: 24, g: 7  },
  { h: "2pm",  p: 25, n: 20, g: 4  },
  { h: "3pm",  p: 21, n: 23, g: 6  },
  { h: "4pm",  p: 28, n: 19, g: 3  },
];

// ══════════════════════════════════════════════════════════════════════
// UTILS — engine.js
// ══════════════════════════════════════════════════════════════════════
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

function calcDrift(history) {
  if (history.length < 2) return { trend: "stable", score: 0.5, label: "Stable", color: "#534AB7" };
  const map  = { positive: 1, neutral: 0, negative: -1 };
  const vals = history.map(h => map[h]);
  const diffs = [];
  for (let i = 1; i < vals.length; i++) diffs.push((vals[i] - vals[i - 1]) * (i + 1));
  const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  if (avg < -0.5) return { trend: "rapidly_degrading", score: 0.08, label: "Rapidly degrading", color: "#E24B4A" };
  if (avg < -0.1) return { trend: "degrading",         score: 0.28, label: "Degrading",         color: "#EF9F27" };
  if (avg >  0.3) return { trend: "improving",         score: 0.88, label: "Improving",          color: "#1D9E75" };
  return              { trend: "stable",            score: 0.5,  label: "Stable",            color: "#534AB7" };
}

function retrieveFAQ(query, selfCorrected = {}) {
  const q        = query.toLowerCase();
  const hinglish = HINGLISH_WORDS.some(h => q.includes(h));
  if (selfCorrected[q]) return { answer: selfCorrected[q], conf: 0.97, self_corrected: true, hinglish };
  let best = null, bestScore = 0;
  FAQ_KB.forEach(f => {
    const words = f.q.split(" ");
    const score = words.filter(w => q.includes(w)).length / words.length;
    if (score > bestScore) { bestScore = score; best = f; }
  });
  if (bestScore > 0.35 && best) return { answer: best.a, conf: best.conf, cat: best.cat, hinglish };
  return { answer: null, conf: 0.18, cat: "unknown", hinglish };
}

function shouldEscalate(text, drift) {
  const t = text.toLowerCase();
  return ESCALATE_TRIGGERS.some(tr => t.includes(tr)) || drift.trend === "rapidly_degrading";
}

let ticketSeq = 1050;
function makeTicket(issue, pri, trigger) {
  ticketSeq++;
  const now = new Date();
  const ts  = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
  return { id: `#${ticketSeq}`, customer: "Current User", issue: issue.length > 52 ? issue.substring(0, 52) + "…" : issue, pri, status: "open", trigger, ts };
}

// ══════════════════════════════════════════════════════════════════════
// HOOK — useChat.js
// ══════════════════════════════════════════════════════════════════════
function useChat() {
  const [messages, setMessages]               = useState([{ role: "bot", text: "Hi! I'm Flowzint, your AI support copilot. How can I help today?", meta: { conf: 0.99 } }]);
  const [input, setInput]                     = useState("");
  const [isTyping, setIsTyping]               = useState(false);
  const [sentHistory, setSentHistory]         = useState([]);
  const [drift, setDrift]                     = useState({ trend: "stable", score: 0.5, label: "Stable", color: "#534AB7" });
  const [lastConf, setLastConf]               = useState(null);
  const [tickets, setTickets]                 = useState(INIT_TICKETS);
  const [selfCorrected, setSelfCorrected]     = useState({});
  const [showCorrection, setShowCorrection]   = useState(false);
  const [correctionInput, setCorrectionInput] = useState("");
  const [lastUserMsg, setLastUserMsg]         = useState("");
  const [toasts, setToasts]                   = useState([]);
  const messagesRef                           = useRef(null);

  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
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
    const newDrift   = calcDrift(newHistory);
    setDrift(newDrift);

    setTimeout(() => {
      setIsTyping(false);
      const result       = retrieveFAQ(text, selfCorrected);
      const escalate     = shouldEscalate(text, newDrift);
      const sustainedNeg = newHistory.filter(s => s === "negative").length >= 2;
      setLastConf(result.conf);

      let botText = "";
      let meta    = { conf: result.conf, hinglish: result.hinglish, self_corrected: result.self_corrected };

      if (escalate) {
        const trigger = newDrift.trend === "rapidly_degrading" ? "Drift detection" : "Frustration keywords";
        const ticket  = makeTicket(text, "high", trigger);
        botText = (result.answer || "I completely understand your frustration and sincerely apologise.") + "\n\nI've escalated this to a senior agent — you'll hear from us within 15 minutes.";
        meta    = { ...meta, escalated: true, ticketId: ticket.id, trigger };
        setTickets(prev => [ticket, ...prev]);
        pushToast(`🎫 ${ticket.id} created — escalated`, "warn");
      } else if (!result.answer) {
        botText = "I don't have a specific answer for that query right now. I've flagged it for review — a support agent will follow up shortly.";
        meta    = { ...meta, fallback: true };
        setShowCorrection(true);
      } else {
        botText = result.answer;
        if (sustainedNeg) {
          const ticket = makeTicket(text, "med", "Sustained negative sentiment");
          meta = { ...meta, ticketId: ticket.id, trigger: "Sustained negative sentiment" };
          setTickets(prev => [ticket, ...prev]);
          pushToast(`🎫 ${ticket.id} created — negative trend`, "warn");
        }
      }
      setMessages(prev => [...prev, { role: "bot", text: botText, meta }]);
    }, 650);
  }, [input, isTyping, sentHistory, selfCorrected, pushToast]);

  const submitCorrection = useCallback(() => {
    const val = correctionInput.trim();
    if (!val) return;
    setSelfCorrected(prev => ({ ...prev, [lastUserMsg.toLowerCase()]: val }));
    setShowCorrection(false);
    setCorrectionInput("");
    setMessages(prev => [...prev, { role: "bot", text: "✓ Answer saved to knowledge base (pending review). Future similar questions will use this answer automatically.", meta: { conf: 0.97, self_corrected: true } }]);
    pushToast("✓ Knowledge base updated", "success");
  }, [correctionInput, lastUserMsg, pushToast]);

  const userMsgCount = messages.filter(m => m.role === "user").length;
  const botOkCount   = messages.filter(m => m.role === "bot" && !m.meta?.fallback && !m.meta?.escalated && m.meta?.conf != null).length;
  const stats = {
    totalConvs:   148 + userMsgCount,
    autoResolved: 112 + botOkCount,
    escalated:    tickets.filter(t => t.trigger !== "Auto-ticket").length,
    churnRisk:    tickets.filter(t => t.pri === "high").length,
  };

  return { messages, input, setInput, isTyping, sentHistory, drift, lastConf, tickets, selfCorrected, showCorrection, correctionInput, setCorrectionInput, toasts, send, submitCorrection, messagesRef, stats };
}

// ══════════════════════════════════════════════════════════════════════
// COMPONENTS — ui.jsx
// ══════════════════════════════════════════════════════════════════════
const C = {
  purple: { bg: "#EEEDFE", text: "#3C3489", border: "#AFA9EC", solid: "#534AB7" },
  green:  { bg: "#EAF3DE", text: "#3B6D11", border: "#9FE1CB" },
  red:    { bg: "#FCEBEB", text: "#A32D2D", border: "#F09595" },
  amber:  { bg: "#FAEEDA", text: "#854F0B", border: "#FAC775" },
  gray:   { bg: "#F1EFE8", text: "#5F5E5A", border: "#D3D1C7" },
};

function Badge({ children, color = "gray" }) {
  const c = C[color] || C.gray;
  return <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 500, background: c.bg, color: c.text, border: `0.5px solid ${c.border}`, whiteSpace: "nowrap" }}>{children}</span>;
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
        <div style={{ height: "100%", width: `${drift.score * 100}%`, borderRadius: 4, background: drift.color, transition: "width 0.45s ease, background 0.45s ease" }} />
      </div>
    </div>
  );
}

function ToastStack({ toasts }) {
  if (!toasts.length) return null;
  const tc = { warn: "#EF9F27", success: "#1D9E75", info: "#534AB7" };
  return (
    <div style={{ position: "absolute", top: 12, right: 12, zIndex: 50, display: "flex", flexDirection: "column", gap: 6, pointerEvents: "none" }}>
      {toasts.map(t => (
        <div key={t.id} style={{ padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500, background: "var(--color-background-primary)", border: `0.5px solid ${tc[t.type] || "#534AB7"}`, color: tc[t.type] || "#534AB7" }}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

function ChatBubble({ msg }) {
  const isBot = msg.role === "bot";
  const m     = msg.meta || {};
  const bubbleBg = !isBot ? C.purple.solid : m.fallback ? C.red.bg : m.escalated ? C.amber.bg : "var(--color-background-secondary)";
  const borderLeft = m.fallback ? `3px solid ${C.red.text}` : m.escalated ? `3px solid ${C.amber.text}` : "none";
  return (
    <div style={{ display: "flex", gap: 10, flexDirection: isBot ? "row" : "row-reverse", alignItems: "flex-start" }}>
      <div style={{ width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, background: isBot ? C.purple.bg : C.green.bg, color: isBot ? C.purple.solid : C.green.text, border: `0.5px solid ${isBot ? C.purple.border : C.green.border}` }}>
        {isBot ? "⚡" : "U"}
      </div>
      <div style={{ maxWidth: "76%" }}>
        <div style={{ padding: "9px 13px", fontSize: 13, lineHeight: 1.58, background: bubbleBg, color: !isBot ? "#fff" : "var(--color-text-primary)", borderLeft, borderRadius: isBot ? "4px 12px 12px 12px" : "12px 4px 12px 12px", whiteSpace: "pre-wrap" }}>
          {msg.text}
        </div>
        {isBot && m.conf != null && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
            <span style={{ fontSize: 11, color: m.conf > 0.7 ? "#3B6D11" : m.conf > 0.5 ? "#854F0B" : "#A32D2D" }}>{Math.round(m.conf * 100)}% conf</span>
            {m.self_corrected && <span style={{ fontSize: 11, color: C.purple.solid }}>✓ self-corrected</span>}
            {m.hinglish        && <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Hinglish</span>}
            {m.ticketId        && <span style={{ fontSize: 11, color: C.amber.text }}>🎫 {m.ticketId} · {m.trigger}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return <div style={{ fontSize: 10, fontWeight: 500, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>{children}</div>;
}

function Panel({ children, style = {} }) {
  return <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 16, background: "var(--color-background-primary)", ...style }}>{children}</div>;
}

// ══════════════════════════════════════════════════════════════════════
// VIEW — ChatView.jsx
// ══════════════════════════════════════════════════════════════════════
function ChatView({ messages, input, setInput, isTyping, sentHistory, drift, lastConf, tickets, showCorrection, correctionInput, setCorrectionInput, send, submitCorrection, messagesRef }) {
  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      {/* Chat panel */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: "0.5px solid var(--color-border-tertiary)" }}>
        {/* Quick chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, padding: "8px 14px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
          <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", lineHeight: "22px" }}>Try:</span>
          {QUICK_MSGS.map(q => (
            <button key={q.label} onClick={() => send(q.text)} style={{ fontSize: 11, padding: "3px 10px", border: "0.5px solid var(--color-border-secondary)", borderRadius: 20, cursor: "pointer", color: "var(--color-text-secondary)", background: "var(--color-background-primary)" }}>
              {q.label}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div ref={messagesRef} style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          {messages.map((m, i) => <ChatBubble key={i} msg={m} />)}
          {isTyping && (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: C.purple.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>⚡</div>
              <div style={{ padding: "8px 13px", borderRadius: "4px 12px 12px 12px", background: "var(--color-background-secondary)", fontSize: 13, color: "var(--color-text-tertiary)", letterSpacing: 2 }}>···</div>
            </div>
          )}
        </div>

        {/* Self-correct banner */}
        {showCorrection && (
          <div style={{ margin: "0 14px 8px", padding: "10px 12px", background: "#EEEDFE", border: "0.5px solid #AFA9EC", borderRadius: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#3C3489", marginBottom: 4 }}>⚠ Low confidence — self-correct triggered</div>
            <div style={{ fontSize: 11, color: "#534AB7", marginBottom: 8 }}>Submit the correct answer to improve future responses.</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={correctionInput} onChange={e => setCorrectionInput(e.target.value)} onKeyDown={e => e.key === "Enter" && submitCorrection()} placeholder="Type the correct answer…"
                style={{ flex: 1, padding: "5px 10px", fontSize: 12, border: "0.5px solid #AFA9EC", borderRadius: 6, background: "var(--color-background-primary)", color: "var(--color-text-primary)", outline: "none" }} />
              <button onClick={submitCorrection} style={{ padding: "5px 12px", background: "#534AB7", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Submit</button>
            </div>
          </div>
        )}

        {/* Input bar */}
        <div style={{ padding: "10px 14px", borderTop: "0.5px solid var(--color-border-tertiary)", display: "flex", gap: 8 }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Type a customer message…"
            style={{ flex: 1, padding: "9px 13px", fontSize: 13, border: "0.5px solid var(--color-border-secondary)", borderRadius: 8, background: "var(--color-background-primary)", color: "var(--color-text-primary)", outline: "none" }} />
          <button onClick={() => send()} style={{ padding: "9px 18px", background: "#534AB7", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer", fontWeight: 500 }}>Send</button>
        </div>
      </div>

      {/* Info panel */}
      <div style={{ width: 210, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <SectionLabel>Sentiment drift</SectionLabel>
          <DriftBar drift={drift} turns={sentHistory.length} />
        </div>
        <div>
          <SectionLabel>Turn history</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {sentHistory.length === 0
              ? <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>No turns yet</span>
              : sentHistory.slice(-7).map((s, i) => (
                <span key={i} style={{ fontSize: 11, padding: "2px 7px", borderRadius: 20, fontWeight: 500, background: s === "positive" ? "#EAF3DE" : s === "negative" ? "#FCEBEB" : "var(--color-background-secondary)", color: s === "positive" ? "#3B6D11" : s === "negative" ? "#A32D2D" : "var(--color-text-secondary)" }}>
                  {s === "positive" ? "↑" : s === "negative" ? "↓" : "→"} {s}
                </span>
              ))
            }
          </div>
        </div>
        <div>
          <SectionLabel>Last confidence</SectionLabel>
          <div style={{ fontSize: 26, fontWeight: 500, color: lastConf == null ? "var(--color-text-tertiary)" : lastConf > 0.7 ? "#1D9E75" : lastConf > 0.5 ? "#EF9F27" : "#E24B4A" }}>
            {lastConf == null ? "—" : `${Math.round(lastConf * 100)}%`}
          </div>
        </div>
        <div>
          <SectionLabel>Recent tickets</SectionLabel>
          {tickets.slice(0, 3).map(t => (
            <div key={t.id} style={{ padding: 10, border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, background: "var(--color-background-secondary)", fontSize: 12, marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: "#534AB7", fontWeight: 500 }}>{t.id}</span>
                <Badge color={t.pri === "high" ? "red" : t.pri === "med" ? "amber" : "green"}>{t.pri}</Badge>
              </div>
              <div style={{ color: "var(--color-text-secondary)", fontSize: 11 }}>{t.issue.length > 36 ? t.issue.substring(0, 36) + "…" : t.issue}</div>
              <div style={{ color: "var(--color-text-tertiary)", fontSize: 10, marginTop: 4 }}>{t.ts}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// VIEW — DashboardView.jsx
// ══════════════════════════════════════════════════════════════════════
function SentimentChart() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !window.Chart) return;
    if (el._chart) el._chart.destroy();
    el._chart = new window.Chart(el, {
      type: "line",
      data: {
        labels: HOURLY.map(h => h.h),
        datasets: [
          { label: "Positive", data: HOURLY.map(h => h.p), borderColor: "#1D9E75", backgroundColor: "rgba(29,158,117,0.07)", fill: true, tension: 0.4, pointRadius: 3, borderWidth: 2 },
          { label: "Neutral",  data: HOURLY.map(h => h.n), borderColor: "#534AB7", backgroundColor: "rgba(83,74,183,0.05)",   fill: true, tension: 0.4, pointRadius: 3, borderWidth: 2 },
          { label: "Negative", data: HOURLY.map(h => h.g), borderColor: "#E24B4A", backgroundColor: "rgba(226,75,74,0.06)",   fill: true, tension: 0.4, pointRadius: 3, borderWidth: 2 },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 11 } } }, y: { grid: { color: "rgba(128,128,128,0.08)" }, ticks: { font: { size: 11 } } } } },
    });
  }, []);
  return <div style={{ position: "relative", height: 160 }}><canvas ref={ref} role="img" aria-label="Hourly sentiment trend">Positive rising 12–28, negative declining 8–3.</canvas></div>;
}

function DashboardView({ stats, selfCorrected }) {
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
      {/* Metrics */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <MetricCard num={stats.totalConvs}   label="Conversations today"  delta="↑ 12% vs yesterday"                                                             deltaUp />
        <MetricCard num={stats.autoResolved} label="Auto-resolved by bot" delta={`${Math.round(stats.autoResolved / Math.max(stats.totalConvs, 1) * 100)}% rate`} deltaUp />
        <MetricCard num={stats.escalated}    label="Escalated to agent"   delta="↑ from drift detection"                                                           deltaUp={false} />
        <MetricCard num={stats.churnRisk}    label="High churn risk"      delta="Needs immediate action"                                                            deltaUp={false} />
      </div>

      {/* Clusters + Churn */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <Panel>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>
            <span style={{ color: "#534AB7" }}>●</span> Emerging issues
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", fontWeight: 400 }}> — unsupervised</span>
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
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}><span style={{ color: "#E24B4A" }}>●</span> Churn risk + action</div>
          {CHURN_RISKS.map(c => (
            <div key={c.name} style={{ padding: "8px 0", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", justifyContent: "space-between", gap: 8 }}>
              <div style={{ fontSize: 12 }}>
                <div style={{ fontWeight: 500 }}>{c.name}</div>
                <div style={{ color: "var(--color-text-secondary)", fontSize: 11, marginTop: 2 }}>Driver: {c.driver}</div>
                <div style={{ color: "#534AB7", fontSize: 11, marginTop: 2 }}>→ {c.action}</div>
              </div>
              <Badge color={c.risk === "high" ? "red" : "amber"}>{c.risk}</Badge>
            </div>
          ))}
        </Panel>
      </div>

      {/* Sparkline */}
      <Panel style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Sentiment trend (today)</div>
          <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
            {[["#1D9E75","Positive"],["#534AB7","Neutral"],["#E24B4A","Negative"]].map(([col, lbl]) => (
              <span key={lbl} style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--color-text-secondary)" }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: col, display: "inline-block" }} />{lbl}
              </span>
            ))}
          </div>
        </div>
        <SentimentChart />
      </Panel>

      {/* Self-corrected KB */}
      <Panel>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>✓ Self-corrected knowledge base</div>
        {Object.keys(selfCorrected).length === 0
          ? <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", lineHeight: 1.6 }}>No corrections yet. When the bot gives a low-confidence answer and an agent submits a correction, it appears here automatically with a pending review flag.</div>
          : Object.entries(selfCorrected).map(([q, a]) => (
            <div key={q} style={{ padding: "8px 10px", background: "#EEEDFE", border: "0.5px solid #AFA9EC", borderRadius: 8, marginBottom: 8, fontSize: 12 }}>
              <div style={{ fontWeight: 500, color: "#3C3489", marginBottom: 2 }}>Q: {q}</div>
              <div style={{ color: "var(--color-text-secondary)", marginBottom: 6 }}>A: {a}</div>
              <Badge color="purple">Pending review</Badge>
            </div>
          ))
        }
      </Panel>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// VIEW — TicketsView.jsx
// ══════════════════════════════════════════════════════════════════════
const STATUS_FILTERS = ["all", "open", "escalated", "resolved"];

function TicketsView({ tickets }) {
  const [filter, setFilter] = useState("all");
  const visible = filter === "all" ? tickets : tickets.filter(t => t.status === filter);
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>
          All tickets
          <span style={{ fontSize: 12, color: "var(--color-text-tertiary)", fontWeight: 400, marginLeft: 8 }}>{visible.length} shown</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {STATUS_FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ fontSize: 11, padding: "4px 12px", borderRadius: 20, cursor: "pointer", border: "0.5px solid var(--color-border-secondary)", background: filter === f ? "#534AB7" : "var(--color-background-primary)", color: filter === f ? "#fff" : "var(--color-text-secondary)", fontWeight: filter === f ? 500 : 400 }}>
              {f}
            </button>
          ))}
        </div>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "9%"  }} /><col style={{ width: "14%" }} /><col style={{ width: "30%" }} />
          <col style={{ width: "11%" }} /><col style={{ width: "12%" }} /><col style={{ width: "18%" }} /><col style={{ width: "6%" }} />
        </colgroup>
        <thead>
          <tr>{["ID","Customer","Issue","Priority","Status","Trigger","Time"].map(h => (
            <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontSize: 10, fontWeight: 500, color: "var(--color-text-tertiary)", borderBottom: "0.5px solid var(--color-border-tertiary)", textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
          ))}</tr>
        </thead>
        <tbody>
          {visible.length === 0
            ? <tr><td colSpan={7} style={{ padding: "20px 10px", textAlign: "center", color: "var(--color-text-tertiary)", fontSize: 13 }}>No tickets match this filter.</td></tr>
            : visible.map(t => (
              <tr key={t.id} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                <td style={{ padding: "10px 10px", color: "#534AB7", fontWeight: 500, fontSize: 12 }}>{t.id}</td>
                <td style={{ padding: "10px 10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.customer}</td>
                <td style={{ padding: "10px 10px", color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.issue}</td>
                <td style={{ padding: "10px 10px" }}><Badge color={t.pri === "high" ? "red" : t.pri === "med" ? "amber" : "green"}>{t.pri}</Badge></td>
                <td style={{ padding: "10px 10px" }}><Badge color={t.status === "escalated" ? "red" : t.status === "resolved" ? "green" : "amber"}>{t.status}</Badge></td>
                <td style={{ padding: "10px 10px", color: "var(--color-text-tertiary)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.trigger}</td>
                <td style={{ padding: "10px 10px", color: "var(--color-text-tertiary)", fontSize: 11 }}>{t.ts}</td>
              </tr>
            ))
          }
        </tbody>
      </table>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// ROOT — App.jsx
// ══════════════════════════════════════════════════════════════════════
const NAV = [
  { id: "chat",      icon: "💬", label: "Live chat"   },
  { id: "dashboard", icon: "📊", label: "Dashboard"   },
  { id: "tickets",   icon: "🎫", label: "Tickets"     },
];
const TITLES = { chat: "Live support chat", dashboard: "Analytics dashboard", tickets: "Ticket management" };

export default function App() {
  const [view, setView] = useState("chat");
  const chat = useChat();
  const openTickets = chat.tickets.filter(t => t.status !== "resolved").length;

  return (
    <div style={{ display: "flex", height: 640, border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden", background: "var(--color-background-primary)", position: "relative" }}>
      <ToastStack toasts={chat.toasts} />

      {/* Sidebar */}
      <div style={{ width: 196, borderRight: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "14px 16px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 15, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>⚡</span> Flowzint
        </div>
        {NAV.map(n => (
          <div key={n.id} onClick={() => setView(n.id)} style={{ padding: "10px 16px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, color: view === n.id ? "var(--color-text-primary)" : "var(--color-text-secondary)", background: view === n.id ? "var(--color-background-primary)" : "transparent", fontWeight: view === n.id ? 500 : 400, borderRight: view === n.id ? "2px solid #534AB7" : "none", transition: "background 0.15s" }}>
            <span>{n.icon}</span>{n.label}
            {n.id === "tickets" && openTickets > 0 && (
              <span style={{ marginLeft: "auto", background: "#534AB7", color: "#fff", fontSize: 10, padding: "1px 6px", borderRadius: 20 }}>{openTickets}</span>
            )}
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ padding: "12px 16px", fontSize: 11, color: "var(--color-text-tertiary)", borderTop: "0.5px solid var(--color-border-tertiary)" }}>
          <div style={{ fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 2 }}>Agent: Priya S.</div>
          <div>Status: <span style={{ color: "#3B6D11" }}>● Online</span></div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "10px 20px", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>{TITLES[view]}</div>
          <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, fontWeight: 500, background: "#EAF3DE", color: "#3B6D11" }}>● Live</span>
        </div>
        {view === "chat"      && <ChatView      {...chat} />}
        {view === "dashboard" && <DashboardView stats={chat.stats} selfCorrected={chat.selfCorrected} />}
        {view === "tickets"   && <TicketsView   tickets={chat.tickets} />}
      </div>
    </div>
  );
}
