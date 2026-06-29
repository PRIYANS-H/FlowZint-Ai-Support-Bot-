import { useEffect, useRef, useState } from "react";
import { MetricCard, Panel, Badge } from "../components/ui";
import { CLUSTERS, CHURN_RISKS, HOURLY_SENTIMENT } from "../data/constants";

function SentimentSparkline({ data }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    let tid;
    const tryDraw = () => {
      const el = canvasRef.current;
      if (!el) return;
      if (!window.Chart) { tid = setTimeout(tryDraw, 200); return; }
      if (el._chart) el._chart.destroy();
      el._chart = new window.Chart(el, {
        type: "line",
        data: {
          labels: data.map(h => h.hour),
          datasets: [
            { label: "Positive", data: data.map(h => h.pos), borderColor: "#1D9E75", backgroundColor: "rgba(29,158,117,0.07)", fill: true, tension: 0.4, pointRadius: 3, borderWidth: 2 },
            { label: "Neutral",  data: data.map(h => h.neu), borderColor: "#534AB7", backgroundColor: "rgba(83,74,183,0.05)",  fill: true, tension: 0.4, pointRadius: 3, borderWidth: 2 },
            { label: "Negative", data: data.map(h => h.neg), borderColor: "#E24B4A", backgroundColor: "rgba(226,75,74,0.06)",  fill: true, tension: 0.4, pointRadius: 3, borderWidth: 2 },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 11 } } },
            y: { grid: { color: "rgba(128,128,128,0.08)" }, ticks: { font: { size: 11 } } },
          },
        }
      });
    };
    tryDraw();
    return () => clearTimeout(tid);
  }, [data]);
  return (
    <div style={{ position: "relative", height: 160 }}>
      <canvas ref={canvasRef} role="img" aria-label="Hourly sentiment trend" />
    </div>
  );
}

export function DashboardView({ stats, selfCorrected, tickets, agentName = "" }) {
  const [apiClusters, setApiClusters]       = useState(null);
  const [apiChurnList, setApiChurnList]     = useState(null);
  const [pendingKB, setPendingKB]           = useState(null);
  const [liveSentiment, setLiveSentiment]   = useState(null);

  // Fetch live data from backend; fall back to seed constants on error
  useEffect(() => {
    fetch("/api/analytics/clusters")
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (data && Array.isArray(data) && data.length > 0) setApiClusters(data); })
      .catch(() => {});

    fetch("/api/analytics/churn-risk")
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (data && Array.isArray(data) && data.length > 0) setApiChurnList(data); })
      .catch(() => {});

    fetch("/api/admin/pending-reviews")
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (data && Array.isArray(data)) setPendingKB(data); })
      .catch(() => {});

    fetch("/api/analytics/sentiment-trend")
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (data && Array.isArray(data) && data.length > 0) setLiveSentiment(data); })
      .catch(() => {});
  }, []);

  // Map API cluster shape → display shape; fall back to seed CLUSTERS
  const clusters = apiClusters
    ? apiClusters.map(c => ({
        label: c.representative_issue
          ? c.representative_issue.substring(0, 32) + (c.representative_issue.length > 32 ? "…" : "")
          : "Issue cluster",
        count: c.count,
        pct:   Math.min(1, c.count / 50),
      }))
    : CLUSTERS;

  // Live churn entries — resolve "Current User" to the agent name, skip if still anonymous
  const resolvedName = agentName || localStorage.getItem("fz_agent_name") || "";
  const seenNames    = new Set();
  const liveChurn    = (tickets || [])
    .filter(t => t.pri === "high")
    .reduce((acc, t) => {
      const name = t.customer === "Current User" ? resolvedName : t.customer;
      if (!name || seenNames.has(name)) return acc;
      seenNames.add(name);
      acc.push({ name, risk: "high", driver: t.trigger || "High-priority ticket", action: "Immediate intervention required", live: true });
      return acc;
    }, []);

  // API churn list — drop "Current User" rows; fall back to seed data if nothing real remains
  const filteredApiChurn = apiChurnList
    ? apiChurnList.filter(c => c.name && c.name !== "Current User")
    : null;

  const sentimentData = liveSentiment || HOURLY_SENTIMENT;
  const churnList     = (filteredApiChurn && filteredApiChurn.length > 0) ? filteredApiChurn : CHURN_RISKS;
  const allChurnRisks = [...liveChurn, ...churnList];

  // KB panel: merge API pending reviews with local selfCorrected
  const localKBEntries   = Object.entries(selfCorrected);
  const apiKBEntries     = pendingKB ? pendingKB.map(r => [r.question, r.answer]) : [];
  const allKBEntries     = [...apiKBEntries, ...localKBEntries];
  const uniqueKB         = [...new Map(allKBEntries).entries()];

  const resolutionRate = stats.totalConvs > 0
    ? `${Math.round(stats.autoResolved / stats.totalConvs * 100)}% resolution rate`
    : "Start chatting to see stats";

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>

      {/* Live metrics */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <MetricCard num={stats.totalConvs}   label="Conversations today"  delta="↑ 12% vs yesterday"    deltaUp />
        <MetricCard num={stats.autoResolved} label="Auto-resolved by bot" delta={resolutionRate}         deltaUp />
        <MetricCard num={stats.escalated}    label="Escalated to agent"   delta="↑ from drift detection" deltaUp={false} />
        <MetricCard num={stats.churnRisk}    label="High churn risk"      delta="Needs immediate action" deltaUp={false} />
      </div>

      {/* Clusters + Churn */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

        <Panel>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#534AB7" }}>●</span> Emerging issues
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", fontWeight: 400 }}>
              {apiClusters ? "— live KMeans" : "— unsupervised"}
            </span>
          </div>
          {clusters.map((c, i) => (
            <div key={i} style={{ padding: "8px 10px", borderRadius: 8, background: "var(--color-background-secondary)", marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ fontWeight: 500 }}>{c.label}</span>
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{c.count}</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: "var(--color-border-tertiary)", marginTop: 6 }}>
                <div style={{ height: 4, borderRadius: 2, background: "#534AB7", width: `${Math.round(c.pct * 100)}%` }} />
              </div>
            </div>
          ))}
        </Panel>

        <Panel>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#E24B4A" }}>●</span> Churn risk + action
            {liveChurn.length > 0 && (
              <span style={{ fontSize: 10, color: "#534AB7", fontWeight: 400, marginLeft: 4 }}>{liveChurn.length} live</span>
            )}
          </div>
          {allChurnRisks.map((c, i) => (
            <div key={i} style={{ padding: "8px 0", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div style={{ fontSize: 12 }}>
                <div style={{ fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}>
                  {c.name}
                  {c.live && <span style={{ fontSize: 9, color: "#534AB7", border: "0.5px solid #AFA9EC", borderRadius: 3, padding: "1px 4px" }}>live</span>}
                </div>
                <div style={{ color: "var(--color-text-secondary)", marginTop: 2, fontSize: 11 }}>Driver: {c.driver}</div>
                <div style={{ color: "#534AB7", marginTop: 2, fontSize: 11 }}>→ {c.action}</div>
              </div>
              <Badge color={c.live ? "purple" : c.risk === "high" ? "red" : "amber"}>{c.risk}</Badge>
            </div>
          ))}
        </Panel>
      </div>

      {/* Sparkline */}
      <Panel style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Sentiment trend (today)</div>
          <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
            {[["#1D9E75","Positive"],["#534AB7","Neutral"],["#E24B4A","Negative"]].map(([col, lbl]) => (
              <span key={lbl} style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--color-text-secondary)" }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: col, display: "inline-block" }} /> {lbl}
              </span>
            ))}
          </div>
        </div>
        <SentimentSparkline data={sentimentData} />
      </Panel>

      {/* Self-corrected KB — merges API pending reviews + local state */}
      <Panel>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>
          <i className="ti ti-check" style={{ fontSize: 13, marginRight: 5, color: "#1D9E75" }} />
          Self-corrected knowledge base
        </div>
        {uniqueKB.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", lineHeight: 1.6 }}>
            No corrections yet. When the bot gives a low-confidence answer and an agent submits a correction,
            it appears here automatically with a pending review flag.
          </div>
        ) : (
          uniqueKB.map(([q, a]) => (
            <div key={q} style={{ padding: "8px 10px", background: "#EEEDFE", border: "0.5px solid #AFA9EC", borderRadius: 8, marginBottom: 8, fontSize: 12 }}>
              <div style={{ fontWeight: 500, color: "#3C3489", marginBottom: 2 }}>Q: {q}</div>
              <div style={{ color: "var(--color-text-secondary)", marginBottom: 6 }}>A: {a}</div>
              <Badge color="purple">Pending review</Badge>
            </div>
          ))
        )}
      </Panel>
    </div>
  );
}