import { useRef } from "react";
import { Badge, ChatBubble, DriftBar, SectionLabel } from "../components/ui";
import { QUICK_MSGS } from "../data/constants";

export function ChatView({
  messages, input, setInput, isTyping, sentHistory,
  drift, lastConf, tickets,
  showCorrection, correctionInput, setCorrectionInput,
  send, submitCorrection, messagesRef,
  uploadedFile, handleFileSelect, clearFile,
  collectingDetails,
}) {
  const fileInputRef = useRef(null);
  const isDegrading  = drift.trend === "rapidly_degrading" || drift.trend === "degrading";

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

      {/* Left: chat panel */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: "0.5px solid var(--color-border-tertiary)" }}>

        {/* Quick messages */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, padding: "8px 14px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
          <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", lineHeight: "22px" }}>Try:</span>
          {QUICK_MSGS.map(q => (
            <button key={q.label} onClick={() => send(q.text)} style={{ fontSize: 11, padding: "3px 10px", border: "0.5px solid var(--color-border-secondary)", borderRadius: 20, cursor: "pointer", color: "var(--color-text-secondary)", background: "var(--color-background-primary)" }}>
              {q.label}
            </button>
          ))}
        </div>

        {/* Collect details banner */}
        {collectingDetails && (
          <div style={{ margin: "0 14px", marginTop: 8, padding: "8px 12px", background: "#FFF8EC", border: "0.5px solid #FAC775", borderRadius: 8, display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <i className="ti ti-info-circle" style={{ fontSize: 14, color: "#854F0B", flexShrink: 0 }} />
            <span style={{ color: "#854F0B" }}>Providing more details (like your Order ID) will help get a precise answer.</span>
          </div>
        )}

        {/* Messages */}
        <div ref={messagesRef} style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          {messages.map((m, i) => <ChatBubble key={i} msg={m} />)}
          {isTyping && (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#EEEDFE", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <i className="ti ti-robot" style={{ fontSize: 14, color: "#534AB7" }} aria-hidden="true" />
              </div>
              <div style={{ padding: "10px 14px", borderRadius: "4px 12px 12px 12px", background: "var(--color-background-secondary)", display: "flex", gap: 4, alignItems: "center" }}>
                {[0, 1, 2].map(i => (
                  <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#534AB7", opacity: 0.6, display: "inline-block", animation: `dotBounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Self-correction box */}
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

        {/* File preview strip */}
        {uploadedFile && (
          <div style={{ margin: "0 14px 6px", padding: "7px 10px", background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: 7, display: "flex", alignItems: "center", gap: 8 }}>
            {uploadedFile.type?.startsWith("image/") ? (
              <img src={uploadedFile.dataUrl} alt="preview" style={{ width: 36, height: 36, borderRadius: 5, objectFit: "cover", border: "0.5px solid var(--color-border-tertiary)" }} />
            ) : (
              <div style={{ width: 36, height: 36, borderRadius: 5, background: "#EEEDFE", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="ti ti-file" style={{ fontSize: 18, color: "#534AB7" }} />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{uploadedFile.name}</div>
              <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Ready to send with your message</div>
            </div>
            <button onClick={clearFile} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", padding: 2 }}>
              <i className="ti ti-x" style={{ fontSize: 14 }} />
            </button>
          </div>
        )}

        {/* Input row */}
        <div style={{ padding: "10px 14px", borderTop: "0.5px solid var(--color-border-tertiary)", display: "flex", gap: 8, alignItems: "center" }}>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx"
            style={{ display: "none" }}
            onChange={e => { handleFileSelect(e.target.files?.[0]); e.target.value = ""; }}
          />

          {/* Attach button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Attach file or screenshot"
            style={{
              width: 36, height: 36, borderRadius: 8, border: "0.5px solid var(--color-border-secondary)",
              background: uploadedFile ? "#EEEDFE" : "var(--color-background-primary)",
              color: uploadedFile ? "#534AB7" : "var(--color-text-tertiary)",
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0,
            }}
          >
            <i className="ti ti-paperclip" style={{ fontSize: 15 }} />
          </button>

          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
            placeholder={collectingDetails ? "Share your Order ID or more details…" : "Type a customer message…"}
            style={{ flex: 1, padding: "9px 13px", fontSize: 13, border: "0.5px solid var(--color-border-secondary)", borderRadius: 8, background: "var(--color-background-primary)", color: "var(--color-text-primary)", outline: "none" }}
          />
          <button onClick={() => send()} style={{ padding: "9px 18px", background: "#534AB7", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
            <i className="ti ti-send" style={{ fontSize: 13 }} /> Send
          </button>
        </div>
      </div>

      {/* Right: info panel */}
      <div style={{ width: 224, overflowY: "auto", padding: "14px 12px", display: "flex", flexDirection: "column", gap: 12, background: "var(--color-background-secondary)" }}>

        {/* Sentiment drift */}
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 9, padding: "11px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: 0.6 }}>Sentiment Drift</span>
            {isDegrading && (
              <span style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: drift.trend === "rapidly_degrading" ? "#E24B4A" : "#EF9F27", animation: "pulseOpacity 1.4s ease-in-out infinite" }} />
            )}
          </div>
          <DriftBar drift={drift} turns={sentHistory.length} />
        </div>

        {/* Turn history */}
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 9, padding: "11px 12px" }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>Turn History</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {sentHistory.length === 0
              ? <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>No turns yet</span>
              : sentHistory.slice(-8).map((s, i) => (
                <span key={i} style={{
                  fontSize: 10, padding: "2px 7px", borderRadius: 20, fontWeight: 600,
                  background: s === "positive" ? "#EAF3DE" : s === "negative" ? "#FCEBEB" : "var(--color-background-secondary)",
                  color:      s === "positive" ? "#3B6D11" : s === "negative" ? "#A32D2D" : "var(--color-text-secondary)",
                }}>
                  {s === "positive" ? "↑" : s === "negative" ? "↓" : "→"}
                </span>
              ))
            }
          </div>
        </div>

        {/* Confidence */}
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 9, padding: "11px 12px" }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>Last Confidence</div>
          {lastConf == null ? (
            <div style={{ fontSize: 22, fontWeight: 600, color: "var(--color-text-tertiary)" }}>—</div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
                <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: lastConf > 0.7 ? "#1D9E75" : lastConf > 0.5 ? "#EF9F27" : "#E24B4A" }}>
                  {Math.round(lastConf * 100)}
                </div>
                <div style={{ fontSize: 13, color: "var(--color-text-tertiary)", fontWeight: 500 }}>%</div>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: "var(--color-border-tertiary)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${lastConf * 100}%`, borderRadius: 3, background: lastConf > 0.7 ? "#1D9E75" : lastConf > 0.5 ? "#EF9F27" : "#E24B4A", transition: "width 0.4s ease" }} />
              </div>
              <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", marginTop: 5 }}>
                {lastConf > 0.7 ? "High — KB match" : lastConf > 0.5 ? "Med — partial match" : "Low — LLM fallback"}
              </div>
            </>
          )}
        </div>

        {/* Recent tickets */}
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 9, padding: "11px 12px" }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>Recent Tickets</div>
          {tickets.length === 0
            ? <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>No tickets yet</span>
            : tickets.slice(0, 3).map(t => (
              <div key={t.id} style={{ padding: "8px 10px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 7, background: "var(--color-background-secondary)", marginBottom: 7 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                  <span style={{ color: "#534AB7", fontWeight: 600, fontSize: 11 }}>{t.id}</span>
                  <Badge color={t.pri === "high" ? "red" : t.pri === "med" ? "amber" : "green"}>{t.pri}</Badge>
                </div>
                <div style={{ color: "var(--color-text-secondary)", fontSize: 11, lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                  {t.issue}
                </div>
                <div style={{ color: "var(--color-text-tertiary)", fontSize: 10, marginTop: 3 }}>{t.trigger}</div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}
