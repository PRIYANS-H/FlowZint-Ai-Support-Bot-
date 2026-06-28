// ── Design tokens ───────────────────────────────────────────────────
export const COLORS = {
  purple: { bg: "#EEEDFE", text: "#3C3489", border: "#AFA9EC", solid: "#534AB7" },
  green:  { bg: "#EAF3DE", text: "#3B6D11", border: "#9FE1CB" },
  red:    { bg: "#FCEBEB", text: "#A32D2D", border: "#F09595" },
  amber:  { bg: "#FAEEDA", text: "#854F0B", border: "#FAC775" },
  gray:   { bg: "#F1EFE8", text: "#5F5E5A", border: "#D3D1C7" },
};

export function Badge({ children, color = "gray" }) {
  const c = COLORS[color] || COLORS.gray;
  return (
    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 500, background: c.bg, color: c.text, border: `0.5px solid ${c.border}`, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

export function MetricCard({ num, label, delta, deltaUp }) {
  return (
    <div style={{ background: "var(--color-background-secondary)", borderRadius: 10, padding: "14px 16px", flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 28, fontWeight: 500, color: "var(--color-text-primary)", lineHeight: 1.1 }}>{num}</div>
      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 4 }}>{label}</div>
      <div style={{ fontSize: 11, marginTop: 6, color: deltaUp ? "#3B6D11" : "#A32D2D" }}>{delta}</div>
    </div>
  );
}

export function DriftBar({ drift, turns }) {
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

export function ToastStack({ toasts }) {
  if (!toasts.length) return null;
  const typeColor = { warn: "#EF9F27", success: "#1D9E75", info: "#534AB7" };
  return (
    <div style={{ position: "absolute", top: 12, right: 12, zIndex: 50, display: "flex", flexDirection: "column", gap: 6, pointerEvents: "none" }}>
      {toasts.map(t => (
        <div key={t.id} style={{ padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500, background: "var(--color-background-primary)", border: `0.5px solid ${typeColor[t.type] || "#534AB7"}`, color: typeColor[t.type] || "#534AB7", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", animation: "slideIn 0.2s ease" }}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

export function ChatBubble({ msg }) {
  const isBot = msg.role === "bot";
  const m     = msg.meta || {};

  const bubbleBg    = !isBot ? COLORS.purple.solid : m.isSummary ? "#EAF3DE" : m.fallback ? COLORS.red.bg : m.escalated ? COLORS.amber.bg : m.collectingDetails ? "#FFF8EC" : "var(--color-background-secondary)";
  const bubbleColor = !isBot ? "#fff" : "var(--color-text-primary)";
  const borderLeft  = m.isSummary ? `3px solid #1D9E75` : m.fallback ? `3px solid ${COLORS.red.text}` : m.escalated ? `3px solid ${COLORS.amber.text}` : m.collectingDetails ? `3px solid #EF9F27` : "none";

  // Parse bold **text** in bot messages
  const renderText = (text) => {
    if (!text) return null;
    const parts = text.split(/\*\*(.+?)\*\*/g);
    return parts.map((p, i) =>
      i % 2 === 1 ? <strong key={i}>{p}</strong> : p
    );
  };

  return (
    <div style={{ display: "flex", gap: 10, flexDirection: isBot ? "row" : "row-reverse", alignItems: "flex-start" }}>
      <div style={{ width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, background: isBot ? COLORS.purple.bg : COLORS.green.bg, color: isBot ? COLORS.purple.solid : COLORS.green.text, border: `0.5px solid ${isBot ? COLORS.purple.border : COLORS.green.border}` }}>
        {isBot ? <i className="ti ti-robot" style={{ fontSize: 14 }} aria-hidden="true" /> : <i className="ti ti-user" style={{ fontSize: 14 }} aria-hidden="true" />}
      </div>

      <div style={{ maxWidth: "76%" }}>
        {/* File attachment preview (user side) */}
        {!isBot && m.file && (
          <div style={{ marginBottom: 6, display: "flex", justifyContent: "flex-end" }}>
            {m.file.type?.startsWith("image/") ? (
              <img src={m.file.dataUrl} alt={m.file.name} style={{ maxWidth: 180, maxHeight: 120, borderRadius: 8, objectFit: "cover", border: "0.5px solid var(--color-border-tertiary)" }} />
            ) : (
              <div style={{ padding: "6px 10px", background: COLORS.purple.bg, border: `0.5px solid ${COLORS.purple.border}`, borderRadius: 7, fontSize: 11, color: COLORS.purple.solid, display: "flex", alignItems: "center", gap: 5 }}>
                <i className="ti ti-file" style={{ fontSize: 13 }} /> {m.file.name}
              </div>
            )}
          </div>
        )}

        {m.isSummary && (
          <div style={{ fontSize: 10, fontWeight: 600, color: "#3B6D11", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 3, display: "flex", alignItems: "center", gap: 4 }}>
            <i className="ti ti-sparkles" style={{ fontSize: 11 }} /> AI Issue Summary
          </div>
        )}
        <div style={{ padding: "9px 13px", fontSize: 13, lineHeight: 1.58, background: bubbleBg, color: bubbleColor, borderLeft, borderRadius: isBot ? "4px 12px 12px 12px" : "12px 4px 12px 12px", whiteSpace: "pre-wrap" }}>
          {renderText(msg.text)}
        </div>

        {/* Bot meta row */}
        {isBot && m.conf != null && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: m.conf > 0.7 ? "#3B6D11" : m.conf > 0.5 ? "#854F0B" : "#A32D2D" }}>
              {Math.round(m.conf * 100)}% confidence
            </span>
            {m.cat && m.cat !== "unknown" && m.cat !== "self_corrected" && m.cat !== "llm_generated" && (
              <Badge color="gray">{m.cat}</Badge>
            )}
            {m.self_corrected && <span style={{ fontSize: 11, color: COLORS.purple.solid }}>✓ Self-corrected</span>}
            {m.hinglish       && <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>🇮🇳 Hinglish</span>}
          </div>
        )}

        {/* Escalation / ticket card */}
        {isBot && m.ticketId && (
          <div style={{ marginTop: 8, padding: "9px 12px", background: COLORS.amber.bg, border: `0.5px solid ${COLORS.amber.border}`, borderRadius: 8, fontSize: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <i className="ti ti-ticket" style={{ fontSize: 13, color: COLORS.amber.text }} />
              <span style={{ fontWeight: 600, color: COLORS.amber.text }}>Ticket {m.ticketId} created</span>
              <Badge color="red">High Priority</Badge>
            </div>
            <div style={{ color: "var(--color-text-secondary)", display: "flex", gap: 10, flexWrap: "wrap" }}>
              {m.dept && m.dept !== "unknown" && m.dept !== "llm_generated" && (
                <span><i className="ti ti-building" style={{ fontSize: 11, marginRight: 3 }} />Dept: <strong>{m.dept}</strong></span>
              )}
              {m.trigger && (
                <span><i className="ti ti-zap" style={{ fontSize: 11, marginRight: 3 }} />Trigger: {m.trigger}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 500, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>
      {children}
    </div>
  );
}

export function Panel({ children, style = {} }) {
  return (
    <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 16, background: "var(--color-background-primary)", ...style }}>
      {children}
    </div>
  );
}