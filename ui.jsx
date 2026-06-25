// ── Design tokens ───────────────────────────────────────────────────
export const COLORS = {
  purple: { bg: "#EEEDFE", text: "#3C3489", border: "#AFA9EC", solid: "#534AB7" },
  green:  { bg: "#EAF3DE", text: "#3B6D11", border: "#9FE1CB" },
  red:    { bg: "#FCEBEB", text: "#A32D2D", border: "#F09595" },
  amber:  { bg: "#FAEEDA", text: "#854F0B", border: "#FAC775" },
  gray:   { bg: "#F1EFE8", text: "#5F5E5A", border: "#D3D1C7" },
};

// ── Badge ────────────────────────────────────────────────────────────
export function Badge({ children, color = "gray" }) {
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

// ── Metric card ──────────────────────────────────────────────────────
export function MetricCard({ num, label, delta, deltaUp }) {
  return (
    <div style={{ background: "var(--color-background-secondary)", borderRadius: 10, padding: "14px 16px", flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 28, fontWeight: 500, color: "var(--color-text-primary)", lineHeight: 1.1 }}>{num}</div>
      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 4 }}>{label}</div>
      <div style={{ fontSize: 11, marginTop: 6, color: deltaUp ? "#3B6D11" : "#A32D2D" }}>{delta}</div>
    </div>
  );
}

// ── Drift bar ────────────────────────────────────────────────────────
export function DriftBar({ drift, turns }) {
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

// ── Toast notification ───────────────────────────────────────────────
export function ToastStack({ toasts }) {
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

// ── Chat bubble ──────────────────────────────────────────────────────
export function ChatBubble({ msg }) {
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
      {/* Avatar */}
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

      {/* Content */}
      <div style={{ maxWidth: "76%" }}>
        <div style={{
          padding: "9px 13px", fontSize: 13, lineHeight: 1.58,
          background: bubbleBg, color: bubbleColor, borderLeft,
          borderRadius: isBot ? "4px 12px 12px 12px" : "12px 4px 12px 12px",
          whiteSpace: "pre-wrap",
        }}>
          {msg.text}
        </div>
        {/* Meta row */}
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

// ── Section header ───────────────────────────────────────────────────
export function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 500, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>
      {children}
    </div>
  );
}

// ── Panel card ───────────────────────────────────────────────────────
export function Panel({ children, style = {} }) {
  return (
    <div style={{
      border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12,
      padding: 16, background: "var(--color-background-primary)", ...style,
    }}>
      {children}
    </div>
  );
}