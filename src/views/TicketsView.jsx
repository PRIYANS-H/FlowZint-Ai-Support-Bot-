import React, { useState, useEffect } from "react";
import { Badge } from "../components/ui";

const STATUS_FILTERS = ["all", "open", "escalated", "resolved"];

const PRI_COLOR = { high: "#E24B4A", med: "#EF9F27", low: "#1D9E75" };

async function fetchSuggestedReply(ticket) {
  const res = await fetch(`/api/tickets/${encodeURIComponent(ticket.id)}/suggest-reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ issue: ticket.issue, category: ticket.trigger || "general", customer: ticket.customer }),
  });
  if (!res.ok) throw new Error("failed");
  const data = await res.json();
  return data.reply;
}

export function TicketsView({ tickets: localTickets, resolveTicket, agentName = "", onAgentNameChange }) {
  const [filter, setFilter]         = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [notes, setNotes]           = useState({});
  const [apiTickets, setApiTickets] = useState(null);
  const [resolving, setResolving]   = useState(null);
  const [suggesting, setSuggesting] = useState(null);
  const [hoveredId, setHoveredId]   = useState(null);

  const fetchApiTickets = () =>
    fetch("/api/tickets")
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (data && Array.isArray(data)) setApiTickets(data); })
      .catch(() => {});

  useEffect(() => { fetchApiTickets(); }, [localTickets]);

  const resolvedName = agentName || localStorage.getItem("fz_agent_name") || "";

  const localIdSet = new Set(localTickets.map(t => t.id));
  const apiExtras  = (apiTickets || []).filter(
    t => !localIdSet.has(t.id) && t.customer !== "Current User"
  );
  const rawTickets = [...localTickets, ...apiExtras];
  const tickets    = resolvedName
    ? rawTickets.map(t => t.customer === "Current User" ? { ...t, customer: resolvedName } : t)
    : rawTickets;

  const countFor = (f) =>
    f === "all" ? tickets.length : tickets.filter(t => t.status === f).length;

  const visible   = filter === "all" ? tickets : tickets.filter(t => t.status === filter);
  const toggleRow = (id) => setExpandedId(prev => (prev === id ? null : id));

  const handleResolve = async (ticketId) => {
    setResolving(ticketId);
    resolveTicket && resolveTicket(ticketId);
    try {
      await fetch(`/api/tickets/${encodeURIComponent(ticketId)}/resolve`, { method: "PATCH" });
      await fetchApiTickets();
    } catch {}
    setResolving(null);
    setExpandedId(null);
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>All Tickets</div>
            <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 1 }}>{visible.length} shown</div>
          </div>
          {/* Agent name pill */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "5px 12px", borderRadius: 20,
            border: resolvedName ? "0.5px solid #AFA9EC" : "0.5px solid var(--color-border-secondary)",
            background: resolvedName ? "#EEEDFE" : "var(--color-background-secondary)",
          }}>
            <i className="ti ti-user-circle" style={{ fontSize: 13, color: resolvedName ? "#534AB7" : "var(--color-text-tertiary)" }} />
            <input
              value={resolvedName}
              onChange={e => {
                localStorage.setItem("fz_agent_name", e.target.value);
                onAgentNameChange?.(e.target.value);
              }}
              placeholder="Your name…"
              style={{
                fontSize: 12, border: "none", outline: "none",
                background: "transparent",
                color: resolvedName ? "#3C3489" : "var(--color-text-secondary)",
                fontWeight: resolvedName ? 500 : 400,
                width: 100,
              }}
            />
          </div>
        </div>

        {/* Status filter pills */}
        <div style={{ display: "flex", gap: 5 }}>
          {STATUS_FILTERS.map(f => {
            const cnt    = countFor(f);
            const active = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  fontSize: 11, padding: "5px 13px", borderRadius: 20, cursor: "pointer",
                  border: active ? "0.5px solid #534AB7" : "0.5px solid var(--color-border-secondary)",
                  background: active ? "#534AB7" : "var(--color-background-primary)",
                  color:      active ? "#fff"    : "var(--color-text-secondary)",
                  fontWeight: active ? 600 : 400,
                  display: "flex", alignItems: "center", gap: 5,
                  transition: "all 0.15s",
                }}
              >
                <span style={{ textTransform: "capitalize" }}>{f}</span>
                {cnt > 0 && (
                  <span style={{
                    fontSize: 10, padding: "0px 5px", borderRadius: 10, minWidth: 16, textAlign: "center", lineHeight: 1.6,
                    background: active ? "rgba(255,255,255,0.22)" : f === "escalated" ? "#FCEBEB" : f === "resolved" ? "#EAF3DE" : "var(--color-background-secondary)",
                    color:      active ? "#fff"                   : f === "escalated" ? "#A32D2D" : f === "resolved" ? "#3B6D11"  : "var(--color-text-secondary)",
                    fontWeight: 600,
                  }}>
                    {cnt}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "9%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "27%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "22%" }} />
            <col style={{ width: "7%" }} />
          </colgroup>
          <thead>
            <tr style={{ background: "var(--color-background-secondary)" }}>
              {["ID", "Customer", "Issue", "Priority", "Status", "Trigger", "Time"].map(h => (
                <th key={h} style={{
                  textAlign: "left", padding: "9px 12px", fontSize: 10, fontWeight: 600,
                  color: "var(--color-text-tertiary)", borderBottom: "0.5px solid var(--color-border-tertiary)",
                  textTransform: "uppercase", letterSpacing: 0.6,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: "40px 12px", textAlign: "center", color: "var(--color-text-tertiary)", fontSize: 13 }}>
                  <i className="ti ti-inbox" style={{ fontSize: 28, display: "block", marginBottom: 8, opacity: 0.4 }} />
                  No tickets match this filter.
                </td>
              </tr>
            )}
            {visible.map((t, idx) => {
              const isExpanded = expandedId === t.id;
              const isHovered  = hoveredId  === t.id;
              const isResolved = t.status   === "resolved";
              return (
                <React.Fragment key={t.id}>
                  <tr
                    onClick={() => toggleRow(t.id)}
                    onMouseEnter={() => setHoveredId(t.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{
                      borderBottom: isExpanded ? "none" : "0.5px solid var(--color-border-tertiary)",
                      cursor: "pointer",
                      background: isExpanded
                        ? "var(--color-background-secondary)"
                        : isHovered
                          ? "var(--color-background-secondary)"
                          : isResolved ? "rgba(234,243,222,0.25)" : "transparent",
                      opacity: isResolved ? 0.75 : 1,
                      transition: "background 0.12s",
                    }}
                  >
                    <td style={{ padding: "11px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: PRI_COLOR[t.pri] || "#999", flexShrink: 0 }} />
                        <span style={{ color: "#534AB7", fontWeight: 600, fontSize: 12 }}>{t.id}</span>
                      </div>
                    </td>
                    <td style={{ padding: "11px 12px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.customer}</td>
                    <td style={{ padding: "11px 12px", color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.issue}</td>
                    <td style={{ padding: "11px 12px" }}>
                      <Badge color={t.pri === "high" ? "red" : t.pri === "med" ? "amber" : "green"}>{t.pri}</Badge>
                    </td>
                    <td style={{ padding: "11px 12px" }}>
                      <Badge color={t.status === "escalated" ? "red" : t.status === "resolved" ? "green" : "amber"}>{t.status}</Badge>
                    </td>
                    <td style={{ padding: "11px 12px", color: "var(--color-text-tertiary)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.trigger}</td>
                    <td style={{ padding: "11px 12px", color: "var(--color-text-tertiary)", fontSize: 11 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        {t.ts}
                        <i className={`ti ti-chevron-${isExpanded ? "up" : "down"}`} style={{ fontSize: 12, marginLeft: 4, opacity: 0.5 }} />
                      </div>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                      <td colSpan={7} style={{ padding: "0", background: "var(--color-background-secondary)" }}>
                        <div style={{ display: "flex", gap: 0 }}>

                          {/* Left: ticket info card */}
                          <div style={{ width: 200, flexShrink: 0, padding: "14px 16px", borderRight: "0.5px solid var(--color-border-tertiary)", display: "flex", flexDirection: "column", gap: 10 }}>
                            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: 0.6 }}>Ticket info</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                              {[
                                { label: "Customer", val: t.customer, icon: "ti-user" },
                                { label: "Trigger",  val: t.trigger,  icon: "ti-zap" },
                                { label: "Time",     val: t.ts,       icon: "ti-clock" },
                              ].map(row => (
                                <div key={row.label} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                                  <span style={{ fontSize: 10, color: "var(--color-text-tertiary)", display: "flex", alignItems: "center", gap: 3 }}>
                                    <i className={`ti ${row.icon}`} style={{ fontSize: 10 }} /> {row.label}
                                  </span>
                                  <span style={{ fontSize: 12, color: "var(--color-text-primary)", fontWeight: 500, paddingLeft: 2 }}>{row.val}</span>
                                </div>
                              ))}
                            </div>
                            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 2 }}>
                              <Badge color={t.pri === "high" ? "red" : t.pri === "med" ? "amber" : "green"}>{t.pri} priority</Badge>
                              <Badge color={t.status === "escalated" ? "red" : t.status === "resolved" ? "green" : "amber"}>{t.status}</Badge>
                            </div>
                          </div>

                          {/* Center: reply */}
                          <div style={{ flex: 1, padding: "14px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
                                <i className="ti ti-notes" style={{ fontSize: 12 }} /> Agent reply
                              </div>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setSuggesting(t.id);
                                  try {
                                    const reply = await fetchSuggestedReply(t);
                                    setNotes(prev => ({ ...prev, [t.id]: reply }));
                                  } catch {}
                                  setSuggesting(null);
                                }}
                                disabled={suggesting === t.id}
                                style={{
                                  fontSize: 11, padding: "4px 12px", borderRadius: 20,
                                  cursor: suggesting === t.id ? "default" : "pointer",
                                  background: suggesting === t.id ? "var(--color-background-primary)" : "#EEEDFE",
                                  color:      suggesting === t.id ? "var(--color-text-tertiary)"      : "#534AB7",
                                  border: "0.5px solid #AFA9EC",
                                  display: "flex", alignItems: "center", gap: 5,
                                  fontWeight: 500,
                                  transition: "all 0.15s",
                                }}
                              >
                                <i className="ti ti-sparkles" style={{ fontSize: 11 }} />
                                {suggesting === t.id ? "Generating…" : "AI Suggest Reply"}
                              </button>
                            </div>
                            <textarea
                              value={notes[t.id] || ""}
                              onChange={e => setNotes(prev => ({ ...prev, [t.id]: e.target.value }))}
                              onClick={e => e.stopPropagation()}
                              placeholder="Type your reply or click 'AI Suggest Reply'…"
                              rows={4}
                              style={{
                                width: "100%", fontSize: 12, padding: "9px 11px", lineHeight: 1.55,
                                border: "0.5px solid var(--color-border-secondary)", borderRadius: 7,
                                background: "var(--color-background-primary)", color: "var(--color-text-primary)",
                                resize: "vertical", outline: "none", boxSizing: "border-box", fontFamily: "inherit",
                              }}
                            />
                          </div>

                          {/* Right: actions */}
                          <div style={{ width: 140, flexShrink: 0, padding: "14px 14px", borderLeft: "0.5px solid var(--color-border-tertiary)", display: "flex", flexDirection: "column", gap: 8, justifyContent: "flex-start" }}>
                            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 2 }}>Actions</div>
                            {t.status !== "resolved" ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleResolve(t.id); }}
                                disabled={resolving === t.id}
                                style={{
                                  padding: "8px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                                  background: resolving === t.id ? "var(--color-background-primary)" : "#1D9E75",
                                  color: resolving === t.id ? "var(--color-text-tertiary)" : "#fff",
                                  border: "none", borderRadius: 7,
                                  display: "flex", alignItems: "center", gap: 5,
                                  transition: "background 0.15s", width: "100%",
                                }}
                              >
                                <i className="ti ti-circle-check" style={{ fontSize: 13 }} />
                                {resolving === t.id ? "Resolving…" : "Mark Resolved"}
                              </button>
                            ) : (
                              <div style={{ fontSize: 12, color: "#3B6D11", display: "flex", alignItems: "center", gap: 5, padding: "8px 0", fontWeight: 500 }}>
                                <i className="ti ti-circle-check-filled" style={{ fontSize: 13 }} /> Resolved
                              </div>
                            )}
                            {t.status === "open" && (
                              <button
                                onClick={(e) => { e.stopPropagation(); }}
                                style={{
                                  padding: "8px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer",
                                  background: "var(--color-background-primary)", color: "#A32D2D",
                                  border: "0.5px solid #F09595", borderRadius: 7,
                                  display: "flex", alignItems: "center", gap: 5, width: "100%",
                                  transition: "background 0.15s",
                                }}
                              >
                                <i className="ti ti-alert-triangle" style={{ fontSize: 13 }} /> Escalate
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
