import { useState, useEffect } from "react";
import { useChat } from "./hooks/useChat";
import { ChatView } from "./views/ChatView";
import { DashboardView } from "./views/DashboardView";
import { TicketsView } from "./views/TicketsView";
import { ToastStack } from "./components/ui";

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
        @keyframes pulseOpacity { 0%,100%{opacity:1} 50%{opacity:0.25} }
        @keyframes slideIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={{ display: "flex", flex: 1, border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden", background: "var(--color-background-primary)", position: "relative" }}>
        <ToastStack toasts={chat.toasts} />

        {/* Sidebar */}
        <div style={{ width: 196, borderRight: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "14px 16px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 15, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
            <i className="ti ti-bolt" style={{ fontSize: 18, color: "#534AB7" }} aria-hidden="true" /> Flowzint
          </div>

          {NAV.map(n => (
            <div key={n.id} onClick={() => setView(n.id)} style={{ padding: "10px 16px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, color: view === n.id ? "var(--color-text-primary)" : "var(--color-text-secondary)", background: view === n.id ? "var(--color-background-primary)" : "transparent", fontWeight: view === n.id ? 500 : 400, borderRight: view === n.id ? "2px solid #534AB7" : "none", transition: "background 0.15s" }}>
              <i className={`ti ${n.icon}`} style={{ fontSize: 15 }} aria-hidden="true" />
              {n.label}
              {n.id === "tickets" && openTickets > 0 && (
                <span style={{ marginLeft: "auto", background: "#534AB7", color: "#fff", fontSize: 10, padding: "1px 6px", borderRadius: 20 }}>{openTickets}</span>
              )}
            </div>
          ))}

          <div style={{ flex: 1 }} />

          <div style={{ padding: "12px 16px", fontSize: 11, color: "var(--color-text-tertiary)", borderTop: "0.5px solid var(--color-border-tertiary)" }}>
            <div style={{ fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 2 }}>
              <i className="ti ti-user" style={{ fontSize: 11, marginRight: 4 }} />Agent: Priya S.
            </div>
            <div>Status: <span style={{ color: "#3B6D11" }}>● Online</span></div>
          </div>
        </div>

        {/* Main area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "10px 20px", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{TITLES[view]}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, fontWeight: 500, background: "#EAF3DE", color: "#3B6D11" }}>● Live</span>
              <button onClick={chat.resetSession} style={{ fontSize: 11, padding: "3px 10px", border: "0.5px solid var(--color-border-secondary)", borderRadius: 20, cursor: "pointer", color: "var(--color-text-secondary)", background: "var(--color-background-primary)", display: "flex", alignItems: "center", gap: 4 }}>
                <i className="ti ti-refresh" style={{ fontSize: 12 }} aria-hidden="true" /> Reset
              </button>
            </div>
          </div>

          {view === "chat"      && <ChatView {...chat} />}
          {view === "dashboard" && <DashboardView stats={chat.stats} selfCorrected={chat.selfCorrected} tickets={chat.tickets} />}
          {view === "tickets"   && <TicketsView tickets={chat.tickets} resolveTicket={chat.resolveTicket} />}
        </div>
      </div>
    </>
  );
}