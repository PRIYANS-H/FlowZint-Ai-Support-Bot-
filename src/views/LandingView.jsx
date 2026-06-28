const FEATURES = [
  { icon: "ti-brain",          color: "#534AB7", label: "Semantic FAQ Search",    desc: "RAG + pgvector finds answers before escalating" },
  { icon: "ti-mood-smile",     color: "#1D9E75", label: "Sentiment Drift AI",     desc: "Detects frustration in real-time, auto-escalates" },
  { icon: "ti-chart-bar",      color: "#EF9F27", label: "Churn Prediction",       desc: "Flags at-risk customers before they leave" },
  { icon: "ti-users-group",    color: "#E24B4A", label: "Live Issue Clustering",  desc: "Spots emerging problems across all tickets" },
];

const STEPS = [
  { icon: "ti-message-circle", label: "Ask anything"    },
  { icon: "ti-search",         label: "AI searches KB"  },
  { icon: "ti-check",          label: "Instant answer"  },
  { icon: "ti-ticket",         label: "Auto-ticket if needed" },
  { icon: "ti-user-check",     label: "Agent resolves" },
];

export function LandingView({ onStart }) {
  return (
    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", background: "var(--color-background-primary)" }}>

      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg, #1a1560 0%, #534AB7 60%, #7B6FD4 100%)", padding: "52px 40px 44px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
        <div style={{ position: "absolute", bottom: -40, left: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.03)" }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="ti ti-bolt" style={{ fontSize: 20, color: "#fff" }} />
          </div>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: -0.5 }}>FlowZint</span>
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(255,255,255,0.18)", color: "#fff", fontWeight: 500, letterSpacing: 0.5 }}>AI COPILOT</span>
        </div>

        <h1 style={{ fontSize: 32, fontWeight: 700, color: "#fff", margin: "0 0 10px", lineHeight: 1.2, letterSpacing: -0.8 }}>
          AI Customer Support,<br />
          <span style={{ color: "#B8B0FF" }}>Fully Automated.</span>
        </h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.72)", maxWidth: 440, margin: "0 auto 28px", lineHeight: 1.6 }}>
          Resolve queries instantly with semantic search. Auto-create tickets, predict sentiment, detect churn — all in one copilot.
        </p>

        {/* CTAs */}
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => onStart("chat")}
            style={{ padding: "11px 28px", background: "#fff", color: "#534AB7", border: "none", borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 7, boxShadow: "0 4px 16px rgba(0,0,0,0.18)" }}
          >
            <i className="ti ti-message-circle" style={{ fontSize: 16 }} /> Solve a Query
          </button>
          <button
            onClick={() => onStart("tickets")}
            style={{ padding: "11px 28px", background: "rgba(255,255,255,0.12)", color: "#fff", border: "1.5px solid rgba(255,255,255,0.3)", borderRadius: 9, fontSize: 14, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}
          >
            <i className="ti ti-ticket" style={{ fontSize: 16 }} /> Raise a Ticket
          </button>
          <button
            onClick={() => onStart("dashboard")}
            style={{ padding: "11px 28px", background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.85)", border: "1.5px solid rgba(255,255,255,0.15)", borderRadius: 9, fontSize: 14, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}
          >
            <i className="ti ti-chart-bar" style={{ fontSize: 16 }} /> View Analytics
          </button>
        </div>
      </div>

      {/* How it works */}
      <div style={{ padding: "28px 40px 12px" }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: 1, textAlign: "center", marginBottom: 16 }}>How it works</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, flexWrap: "wrap" }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ textAlign: "center", padding: "0 8px" }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#EEEDFE", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px" }}>
                  <i className={`ti ${s.icon}`} style={{ fontSize: 16, color: "#534AB7" }} />
                </div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 500, whiteSpace: "nowrap" }}>{s.label}</div>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ width: 24, height: 1, background: "var(--color-border-tertiary)", flexShrink: 0, margin: "0 2px", marginBottom: 18 }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* AI Features */}
      <div style={{ padding: "16px 40px 32px" }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: 1, textAlign: "center", marginBottom: 16 }}>4 AI Innovations</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{ padding: "16px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, background: "var(--color-background-secondary)", display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: f.color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <i className={`ti ${f.icon}`} style={{ fontSize: 17, color: f.color }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 3 }}>{f.label}</div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer CTA */}
      <div style={{ marginTop: "auto", padding: "20px 40px", borderTop: "0.5px solid var(--color-border-tertiary)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>Built for Hack The Matrix · FinTech Track</span>
        <button
          onClick={() => onStart("chat")}
          style={{ padding: "8px 20px", background: "#534AB7", color: "#fff", border: "none", borderRadius: 7, fontSize: 13, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
        >
          Get Started <i className="ti ti-arrow-right" style={{ fontSize: 13 }} />
        </button>
      </div>
    </div>
  );
}
