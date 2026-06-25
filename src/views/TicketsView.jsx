import React, { useState, useEffect } from "react";
import { Badge } from "../components/ui";

const STATUS_FILTERS = ["all", "open", "escalated", "resolved"];

export function TicketsView({ tickets: localTickets, resolveTicket }) {
  const [filter, setFilter]         = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [notes, setNotes]           = useState({});
  const [apiTickets, setApiTickets] = useState(null);
  const [resolving, setResolving]   = useState(null);

  const fetchApiTickets = () =>
    fetch("/api/tickets")
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (data && Array.isArray(data)) setApiTickets(data); })
      .catch(() => {});

  useEffect(() => { fetchApiTickets(); }, [localTickets]);

  const tickets = apiTickets || localTickets;

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
    <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>

      {/* Header + filters */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>
          All tickets
          <span style={{ fontSize: 12, color: "var(--color-text-tertiary)", fontWeight: 400, marginLeft: 8 }}>
            {visible.length} shown
          </span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {STATUS_FILTERS.map(f => {
            const cnt = countFor(f);
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  fontSize: 11, padding: "4px 12px", borderRadius: 20, cursor: "pointer",
                  border: "0.5px solid var(--color-border-secondary)",
                  background: filter === f ? "#534AB7" : "var(--color-background-primary)",
                  color:      filter === f ? "#fff"     : "var(--color-text-secondary)",
                  fontWeight: filter === f ? 500 : 400, transition: "background 0.15s",
                  display: "flex", alignItems: "center", gap: 5,
                }}
              >
                {f}
                {cnt > 0 && (
                  <span style={{
                    fontSize: 10, padding: "1px 5px", borderRadius: 20, lineHeight: 1.4,
                    background: filter === f ? "rgba(255,255,255,0.25)" : "var(--color-background-secondary)",
                    color: filter === f ? "#fff" : "var(--color-text-tertiary)",
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
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "9%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "28%" }} />
          <col style={{ width: "9%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: "22%" }} />
          <col style={{ width: "7%" }} />
        </colgroup>
        <thead>
          <tr>
            {["ID", "Customer", "Issue", "Priority", "Status", "Trigger", "Time"].map(h => (
              <th key={h} style={{
                textAlign: "left", padding: "8px 10px", fontSize: 10, fontWeight: 500,
                color: "var(--color-text-tertiary)", borderBottom: "0.5px solid var(--color-border-tertiary)",
                textTransform: "uppercase", letterSpacing: 0.5,
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.length === 0 && (
            <tr>
              <td colSpan={7} style={{ padding: "32px 10px", textAlign: "center", color: "var(--color-text-tertiary)", fontSize: 13 }}>
                No tickets match this filter.
              </td>
            </tr>
          )}
          {visible.map(t => (
            <React.Fragment key={t.id}>
              <tr
                onClick={() => toggleRow(t.id)}
                style={{
                  borderBottom: expandedId === t.id ? "none" : "0.5px solid var(--color-border-tertiary)",
                  cursor: "pointer",
                  background: expandedId === t.id
                    ? "var(--color-background-secondary)"
                    : t.status === "resolved" ? "rgba(234,243,222,0.35)" : "transparent",
                  opacity: t.status === "resolved" ? 0.72 : 1,
                  transition: "background 0.15s",
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
                  <td colSpan={7} style={{ padding: "10px 16px 14px", background: "var(--color-background-secondary)" }}>
                    <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>

                      {/* Notes */}
                      <div style={{ flex: 1 }}>
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
                      </div>

                      {/* Actions */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 130, paddingTop: 18 }}>
                        {t.status !== "resolved" ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleResolve(t.id); }}
                            disabled={resolving === t.id}
                            style={{
                              padding: "7px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer",
                              background: resolving === t.id ? "var(--color-background-secondary)" : "#1D9E75",
                              color: resolving === t.id ? "var(--color-text-tertiary)" : "#fff",
                              border: "none", borderRadius: 7, display: "flex", alignItems: "center", gap: 5,
                              transition: "background 0.15s",
                            }}
                          >
                            <i className="ti ti-circle-check" style={{ fontSize: 13 }} />
                            {resolving === t.id ? "Resolving…" : "Mark Resolved"}
                          </button>
                        ) : (
                          <div style={{ fontSize: 12, color: "#3B6D11", display: "flex", alignItems: "center", gap: 5, padding: "7px 0" }}>
                            <i className="ti ti-circle-check-filled" style={{ fontSize: 13 }} /> Resolved
                          </div>
                        )}

                        {t.status === "open" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); }}
                            style={{
                              padding: "7px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer",
                              background: "var(--color-background-primary)", color: "#A32D2D",
                              border: "0.5px solid #F09595", borderRadius: 7, display: "flex", alignItems: "center", gap: 5,
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
