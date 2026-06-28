import { useState } from "react";

export function LoginModal({ onSubmit, onSkip }) {
  const [name,  setName]  = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), email: email.trim() });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.45)", display: "flex",
      alignItems: "center", justifyContent: "center",
      animation: "fadeUp 0.2s ease",
    }}>
      <div style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-secondary)",
        borderRadius: 14, padding: "28px 32px", width: 360,
        boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: "#EEEDFE", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="ti ti-user-check" style={{ fontSize: 18, color: "#534AB7" }} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)" }}>Almost there</div>
            <div style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>Login to track your ticket</div>
          </div>
        </div>

        <div style={{ height: "0.5px", background: "var(--color-border-tertiary)", margin: "16px 0" }} />

        <p style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 18, lineHeight: 1.6 }}>
          A support ticket has been created for you. Enter your details so our agent can follow up and you can track progress.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 5 }}>
              Full name <span style={{ color: "#E24B4A" }}>*</span>
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Priya Sharma"
              autoFocus
              style={{
                width: "100%", padding: "9px 12px", fontSize: 13,
                border: "0.5px solid var(--color-border-secondary)", borderRadius: 8,
                background: "var(--color-background-secondary)", color: "var(--color-text-primary)",
                outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 5 }}>
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="e.g. priya@email.com"
              style={{
                width: "100%", padding: "9px 12px", fontSize: 13,
                border: "0.5px solid var(--color-border-secondary)", borderRadius: 8,
                background: "var(--color-background-secondary)", color: "var(--color-text-primary)",
                outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button
              type="submit"
              disabled={!name.trim()}
              style={{
                flex: 1, padding: "10px", background: name.trim() ? "#534AB7" : "var(--color-background-secondary)",
                color: name.trim() ? "#fff" : "var(--color-text-tertiary)",
                border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500,
                cursor: name.trim() ? "pointer" : "default", transition: "background 0.15s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              <i className="ti ti-login" style={{ fontSize: 14 }} /> Continue
            </button>
            <button
              type="button"
              onClick={onSkip}
              style={{
                padding: "10px 16px", background: "transparent", color: "var(--color-text-tertiary)",
                border: "0.5px solid var(--color-border-secondary)", borderRadius: 8,
                fontSize: 13, cursor: "pointer",
              }}
            >
              Skip
            </button>
          </div>
        </form>

        <div style={{ marginTop: 14, fontSize: 11, color: "var(--color-text-tertiary)", textAlign: "center" }}>
          <i className="ti ti-lock" style={{ fontSize: 11, marginRight: 4 }} />
          Your details are only used for ticket tracking
        </div>
      </div>
    </div>
  );
}
