import { Badge, ChatBubble, DriftBar, SectionLabel } from "../components/ui";
import { QUICK_MSGS } from "../data/constants";

export function ChatView({
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
            <button key={q.label} onClick={() => send(q.text)} style={{ fontSize: 11, padding: "3px 10px", border: "0.5px solid var(--color-border-secondary)", borderRadius: 20, cursor: "pointer", color: "var(--color-text-secondary)", background: "var(--color-background-primary)" }}>
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
              <i className="ti ti-alert-triangle" style={{ fontSize: 12, marginRight: 4 }} /> Low confidence — self-correct triggered
            </div>
            <div style={{ fontSize: 11, color: "#534AB7", marginBottom: 8 }}>Submit the correct answer to improve future responses automatically.</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={correctionInput} onChange={e => setCorrectionInput(e.target.value)} onKeyDown={e => e.key === "Enter" && submitCorrection()} placeholder="Type the correct answer…"
                style={{ flex: 1, padding: "5px 10px", fontSize: 12, border: "0.5px solid #AFA9EC", borderRadius: 6, background: "var(--color-background-primary)", color: "var(--color-text-primary)", outline: "none" }} />
              <button onClick={submitCorrection} style={{ padding: "5px 12px", background: "#534AB7", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                <i className="ti ti-check" style={{ fontSize: 12 }} /> Submit
              </button>
            </div>
          </div>
        )}

        <div style={{ padding: "10px 14px", borderTop: "0.5px solid var(--color-border-tertiary)", display: "flex", gap: 8 }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Type a customer message…"
            style={{ flex: 1, padding: "9px 13px", fontSize: 13, border: "0.5px solid var(--color-border-secondary)", borderRadius: 8, background: "var(--color-background-primary)", color: "var(--color-text-primary)", outline: "none" }} />
          <button onClick={() => send()} style={{ padding: "9px 18px", background: "#534AB7", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
            <i className="ti ti-send" style={{ fontSize: 13 }} /> Send
          </button>
        </div>
      </div>

      {/* Right: info panel */}
      <div style={{ width: 218, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 16 }}>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 500, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: 0.6 }}>Sentiment drift</span>
            {isDegrading && (
              <span style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: drift.trend === "rapidly_degrading" ? "#E24B4A" : "#EF9F27", display: "inline-block", animation: "pulseOpacity 1.4s ease-in-out infinite" }} aria-label="Active degradation" />
            )}
          </div>
          <DriftBar drift={drift} turns={sentHistory.length} />
        </div>

        <div>
          <SectionLabel>Turn history</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxHeight: 80, overflowY: "auto" }}>
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
          <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 6 }}>
            {[{ color: "#1D9E75", label: "High ≥70%" }, { color: "#EF9F27", label: "Med 50–70%" }, { color: "#E24B4A", label: "Low <50%" }].map(({ color, label }) => (
              <span key={label} style={{ fontSize: 10, color: "var(--color-text-tertiary)", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />{label}
              </span>
            ))}
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
              <div style={{ color: "var(--color-text-tertiary)", fontSize: 10, marginTop: 3 }}>{t.trigger}</div>
              <div style={{ color: "var(--color-text-tertiary)", fontSize: 10, marginTop: 2 }}>{t.ts}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}