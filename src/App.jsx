import { useState, useEffect } from "react";
import { useChat } from "./hooks/useChat";
import { LandingView } from "./views/LandingView";
import { ChatView } from "./views/ChatView";
import { DashboardView } from "./views/DashboardView";
import { TicketsView } from "./views/TicketsView";
import { ToastStack } from "./components/ui";
import { LoginModal } from "./components/LoginModal";

const NAV = [
  { id: "home",      icon: "ti-home",              label: "Home"       },
  { id: "chat",      icon: "ti-message-circle",    label: "Live chat"  },
  { id: "dashboard", icon: "ti-layout-dashboard",  label: "Dashboard"  },
  { id: "tickets",   icon: "ti-ticket",            label: "Tickets"    },
];

const TITLES = {
  home:      "FlowZint — AI Customer Support Copilot",
  chat:      "Live support chat",
  dashboard: "Analytics dashboard",
  tickets:   "Ticket management",
};

export default function App() {
  const [view, setView]         = useState("home");
  const [agentName, setAgentName] = useState(
    () => localStorage.getItem("fz_agent_name") || ""
  );
  const chat = useChat();

  // Sync agentName when login modal is submitted
  useEffect(() => {
    if (chat.userProfile?.name) {
      setAgentName(chat.userProfile.name);
      localStorage.setItem("fz_agent_name", chat.userProfile.name);
    }
  }, [chat.userProfile]);

  const updateAgentName = (name) => {
    setAgentName(name);
    localStorage.setItem("fz_agent_name", name);
  };

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
        @keyframes fadeUp  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes dotBounce { 0%,80%,100%{transform:scale(0.7);opacity:0.4} 40%{transform:scale(1.1);opacity:1} }
      `}</style>

      <div style={{ display: "flex", flex: 1, border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden", background: "var(--color-background-primary)", position: "relative" }}>
        <ToastStack toasts={chat.toasts} />
        {chat.showLoginModal && <LoginModal onSubmit={chat.submitLogin} onSkip={chat.skipLogin} />}

        {/* Sidebar */}
        <div style={{ width: 196, borderRight: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "14px 16px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: "#534AB7", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="ti ti-bolt" style={{ fontSize: 14, color: "#fff" }} aria-hidden="true" />
            </div>
            Flowzint
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
                <span style={{ marginLeft: "auto", background: "#534AB7", color: "#fff", fontSize: 10, padding: "1px 6px", borderRadius: 20 }}>{openTickets}</span>
              )}
            </div>
          ))}

          <div style={{ flex: 1 }} />

          <div style={{ padding: "10px 14px", borderTop: "0.5px solid var(--color-border-tertiary)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: agentName ? "#534AB7" : "var(--color-border-secondary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <i className="ti ti-user" style={{ fontSize: 13, color: agentName ? "#fff" : "var(--color-text-tertiary)" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: agentName ? "var(--color-text-primary)" : "var(--color-text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {agentName || "Set your name →"}
                </div>
                <div style={{ fontSize: 10, color: "#3B6D11", display: "flex", alignItems: "center", gap: 3, marginTop: 1 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#1D9E75", display: "inline-block" }} /> Online
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {view !== "home" && (
            <div style={{ padding: "9px 20px", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--color-background-primary)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>{TITLES[view]}</div>
                {openTickets > 0 && view !== "tickets" && (
                  <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: "#FCEBEB", color: "#A32D2D", fontWeight: 600 }}>
                    {openTickets} open
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, fontWeight: 500, background: "#EAF3DE", color: "#3B6D11", display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#1D9E75", display: "inline-block" }} /> Live
                </span>
                <button onClick={chat.resetSession} style={{ fontSize: 11, padding: "3px 10px", border: "0.5px solid var(--color-border-secondary)", borderRadius: 20, cursor: "pointer", color: "var(--color-text-secondary)", background: "transparent", display: "flex", alignItems: "center", gap: 4 }}>
                  <i className="ti ti-refresh" style={{ fontSize: 12 }} aria-hidden="true" /> Reset
                </button>
              </div>
            </div>
          )}

          {view === "home"      && <LandingView onStart={setView} />}
          {view === "chat"      && <ChatView {...chat} />}
          {view === "dashboard" && <DashboardView stats={chat.stats} selfCorrected={chat.selfCorrected} tickets={chat.tickets} />}
          {view === "tickets"   && <TicketsView tickets={chat.tickets} resolveTicket={chat.resolveTicket} agentName={agentName} onAgentNameChange={updateAgentName} />}
        </div>
      </div>
    </>
  );
}
