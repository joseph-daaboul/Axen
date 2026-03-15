import { useEffect, useState, useRef } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { auth, db } from "../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";

/* ─────────────────────────────────────────────
   COLOUR PALETTE
───────────────────────────────────────────── */
const C = {
  blue:    "#1d4ed8",
  blueL:   "#3b82f6",
  green:   "#10b981",
  greenL:  "#34d399",
  amber:   "#f59e0b",
  red:     "#ef4444",
  purple:  "#8b5cf6",
  bg:      "#f8fafc",
  card:    "#ffffff",
  border:  "#e2e8f0",
  text:    "#0f172a",
  muted:   "#64748b",
  light:   "#94a3b8",
};

/* ─────────────────────────────────────────────
   EXERCISE TYPE CONFIG
───────────────────────────────────────────── */
const EXERCISE_TYPES = [
  { id: "box-breathing",  label: "Box Breath",  color: "#3b82f6" },
  { id: "relaxation",     label: "Relaxation",  color: "#10b981" },
  { id: "focus-reset",    label: "Focus Reset", color: "#f59e0b" },
  { id: "visualisation",  label: "Visualise",   color: "#8b5cf6" },
];
const TOTAL_COLOR = "#334155";

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function card(extra = {}) {
  return {
    background: C.card,
    borderRadius: "16px",
    padding: "24px",
    border: `1px solid ${C.border}`,
    boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
    marginBottom: "24px",
    ...extra,
  };
}

function CardHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <h3 style={{ fontSize: "16px", fontWeight: "700", color: C.text, margin: 0 }}>{title}</h3>
      {subtitle && <p style={{ fontSize: "12px", color: C.muted, margin: "4px 0 0" }}>{subtitle}</p>}
    </div>
  );
}

function toLocaleKey(val) {
  if (!val) return null;
  if (val && typeof val === "object" && typeof val.toDate === "function") {
    return val.toDate().toLocaleDateString();
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? String(val) : d.toLocaleDateString();
}

/* ─────────────────────────────────────────────
   CLUSTERED BAR CHART

   Layout per day:
   ┌─────────────────────────────┐
   │  sep │ B  R  F  V  T │ gap │
   └─────────────────────────────┘

   • sep  = 1 px solid vertical line (full chart height) — divides days
   • bars  = 5 bars with NO gap between them (touching)
   • gap   = inter-cluster breathing room on the right side only

   The separator is rendered as a full-height absolutely-positioned
   element that spans from top to bottom of the chart area.
───────────────────────────────────────────── */
function ClusteredBarChart({ exerciseHistory, joinDate }) {
  const chartH   = 160;
  const barW     = 9;          // each bar width
  const numBars  = EXERCISE_TYPES.length + 1; // 4 types + 1 total
  const sepW     = 1;          // separator line width
  const rightGap = 10;         // space between clusters (right side)
  // Total cluster width = sep + (5 bars touching) + rightGap
  const barsW    = numBars * barW;
  const clusterW = sepW + barsW + rightGap;

  /* Build date range: joinDate → today */
  const start = joinDate ? new Date(joinDate) : new Date(Date.now() - 29 * 86400000);
  const today = new Date();
  const dates = [];
  for (let d = new Date(start); d <= today; d = new Date(d.getTime() + 86400000)) {
    dates.push(new Date(d));
  }

  /* Aggregate exercises: locale key → { exerciseId: count } */
  const byDate = {};
  (exerciseHistory || []).forEach((ex) => {
    const key  = toLocaleKey(ex.timestamp || ex.date);
    if (!key) return;
    const type = ex.exerciseId || "unknown";
    if (!byDate[key]) byDate[key] = {};
    byDate[key][type] = (byDate[key][type] || 0) + 1;
  });

  const data = dates.map((d) => {
    const key    = d.toLocaleDateString();
    const counts = byDate[key] || {};
    const total  = Object.values(counts).reduce((s, v) => s + v, 0);
    const label  = d.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
    return { label, counts, total };
  });

  const maxVal = Math.max(...data.map((d) => d.total), 1);
  const totalW = data.length * clusterW + 28; // +28 = y-axis offset

  return (
    <div>
      {/* Legend */}
      <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", marginBottom: "14px" }}>
        {EXERCISE_TYPES.map((t) => (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: t.color }} />
            <span style={{ fontSize: "10px", color: C.muted, fontWeight: "600" }}>{t.label}</span>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: TOTAL_COLOR }} />
          <span style={{ fontSize: "10px", color: C.muted, fontWeight: "600" }}>Total</span>
        </div>
      </div>

      <div style={{ display: "flex" }}>
        {/* Y-axis label */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "18px", flexShrink: 0 }}>
          <span style={{ fontSize: "9px", color: C.light, fontWeight: "600", transform: "rotate(-90deg)", whiteSpace: "nowrap", letterSpacing: "0.5px" }}>
            Count
          </span>
        </div>

        {/* Scrollable chart body */}
        <div style={{ overflowX: "auto", flex: 1 }}>
          <div style={{ width: `${Math.max(totalW, 300)}px`, minWidth: "100%" }}>

            {/* ── Bar + separator area ── */}
            <div style={{ position: "relative", height: `${chartH}px`, marginBottom: "4px" }}>

              {/* Horizontal gridlines */}
              {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
                <div key={frac} style={{
                  position: "absolute", left: 0, right: 0,
                  top: `${(1 - frac) * chartH}px`,
                  borderTop: `1px dashed ${frac === 0 ? C.border : "rgba(226,232,240,0.55)"}`,
                  display: "flex", alignItems: "flex-start",
                }}>
                  <span style={{ fontSize: "9px", color: C.light, paddingRight: "4px", lineHeight: 1, marginTop: "-5px", minWidth: "26px", textAlign: "right" }}>
                    {frac > 0 ? Math.round(maxVal * frac) : ""}
                  </span>
                </div>
              ))}

              {/* Cluster row */}
              <div style={{ display: "flex", alignItems: "flex-end", height: "100%", paddingLeft: "28px" }}>
                {data.map((day, i) => (
                  <div
                    key={i}
                    style={{
                      position: "relative",
                      width: `${clusterW}px`,
                      flexShrink: 0,
                      height: "100%",
                      display: "flex",
                      alignItems: "flex-end",
                    }}
                  >
                    {/* ── Full-height vertical separator (left edge of every cluster) ── */}
                    <div style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${sepW}px`,
                      background: "rgba(148,163,184,0.45)",
                    }} />

                    {/* ── 5 bars — no gap between them ── */}
                    <div style={{
                      display: "flex",
                      alignItems: "flex-end",
                      gap: 0,                        // ← bars touch each other
                      paddingLeft: `${sepW}px`,      // start right after separator
                    }}>
                      {EXERCISE_TYPES.map((t) => {
                        const val = day.counts[t.id] || 0;
                        const h   = val > 0 ? Math.max((val / maxVal) * chartH, 4) : 0;
                        return (
                          <div
                            key={t.id}
                            title={`${day.label} · ${t.label}: ${val}`}
                            style={{
                              width:        `${barW}px`,
                              height:       `${h}px`,
                              background:   t.color,
                              borderRadius: "2px 2px 0 0",
                              opacity:      val > 0 ? 1 : 0,
                              transition:   "height 0.35s ease",
                              cursor:       val > 0 ? "pointer" : "default",
                              flexShrink:   0,
                            }}
                            onMouseEnter={(e) => { if (val > 0) e.currentTarget.style.opacity = "0.7"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.opacity = val > 0 ? "1" : "0"; }}
                          />
                        );
                      })}

                      {/* Total bar — same width, slightly darker, no gap */}
                      {(() => {
                        const val = day.total;
                        const h   = val > 0 ? Math.max((val / maxVal) * chartH, 4) : 0;
                        return (
                          <div
                            title={`${day.label} · Total: ${val}`}
                            style={{
                              width:        `${barW}px`,
                              height:       `${h}px`,
                              background:   TOTAL_COLOR,
                              borderRadius: "2px 2px 0 0",
                              opacity:      val > 0 ? 0.85 : 0,
                              transition:   "height 0.35s ease",
                              flexShrink:   0,
                            }}
                          />
                        );
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* X-axis date labels */}
            <div style={{ display: "flex", paddingLeft: "28px" }}>
              {data.map((day, i) => (
                <div
                  key={i}
                  style={{
                    width:        `${clusterW}px`,
                    flexShrink:   0,
                    textAlign:    "center",
                    fontSize:     "8px",
                    color:        day.total > 0 ? C.muted : "#d1d5db",
                    fontWeight:   day.total > 0 ? "700" : "500",
                    overflow:     "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace:   "nowrap",
                    paddingTop:   "3px",
                    paddingLeft:  `${sepW}px`,
                  }}
                >
                  {day.label}
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   GOALS BAR CHART
───────────────────────────────────────────── */
function GoalsBarChart({ goalEntries, joinDate }) {
  const chartH = 140;
  const barW   = 32;
  const colW   = barW + 16;

  const start = joinDate ? new Date(joinDate) : new Date(Date.now() - 29 * 86400000);
  const today = new Date();
  const dates = [];
  for (let d = new Date(start); d <= today; d = new Date(d.getTime() + 86400000)) {
    dates.push(new Date(d));
  }

  const byDate = {};
  (goalEntries || []).filter((e) => e.status === "Completed").forEach((e) => {
    const raw = e.date ?? e.completedAt ?? e.updatedAt ?? e.timestamp ?? null;
    const key = toLocaleKey(raw);
    if (!key) return;
    byDate[key] = (byDate[key] || 0) + 1;
  });

  const data = dates.map((d) => {
    const key   = d.toLocaleDateString();
    const value = byDate[key] || 0;
    const label = d.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
    return { label, value };
  });

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const totalW = data.length * colW + 28;

  return (
    <div style={{ display: "flex" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "18px", flexShrink: 0 }}>
        <span style={{ fontSize: "9px", color: C.light, fontWeight: "600", transform: "rotate(-90deg)", whiteSpace: "nowrap", letterSpacing: "0.5px" }}>
          Goals Completed
        </span>
      </div>
      <div style={{ overflowX: "auto", flex: 1 }}>
        <div style={{ width: `${Math.max(totalW, 300)}px`, minWidth: "100%" }}>
          <div style={{ position: "relative", height: `${chartH}px`, marginBottom: "4px" }}>
            {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
              <div key={frac} style={{ position: "absolute", left: 0, right: 0, top: `${(1 - frac) * chartH}px`, borderTop: `1px dashed ${frac === 0 ? C.border : "rgba(226,232,240,0.6)"}`, display: "flex", alignItems: "flex-start" }}>
                <span style={{ fontSize: "9px", color: C.light, paddingRight: "4px", lineHeight: 1, marginTop: "-5px", minWidth: "24px", textAlign: "right" }}>
                  {frac > 0 ? Math.round(maxVal * frac) : ""}
                </span>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "flex-end", height: "100%", paddingLeft: "28px", gap: `${colW - barW}px` }}>
              {data.map((d, i) => {
                const h = d.value > 0 ? Math.max((d.value / maxVal) * chartH, 4) : 0;
                return (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                    {d.value > 0 && <span style={{ fontSize: "8px", color: C.muted, fontWeight: "700" }}>{d.value}</span>}
                    <div title={`${d.label}: ${d.value} completed`}
                      style={{ width: `${barW}px`, height: `${h}px`, background: `linear-gradient(180deg, ${C.purple}bb, ${C.purple})`, borderRadius: "4px 4px 0 0", opacity: d.value > 0 ? 1 : 0, transition: "height 0.4s ease", cursor: d.value > 0 ? "pointer" : "default" }}
                      onMouseEnter={(e) => { if (d.value > 0) e.currentTarget.style.opacity = "0.7"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = d.value > 0 ? "1" : "0"; }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ display: "flex", paddingLeft: "28px", gap: `${colW - barW}px` }}>
            {data.map((d, i) => (
              <div key={i} style={{ width: `${barW}px`, textAlign: "center", fontSize: "8px", color: d.value > 0 ? C.muted : "#d1d5db", fontWeight: d.value > 0 ? "700" : "500", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {d.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   HEATMAP — half page width, centred
───────────────────────────────────────────── */
function Heatmap({ exerciseHistory }) {
  const [tooltip,    setTooltip]    = useState(null);
  const [containerW, setContainerW] = useState(0);
  const containerRef = useRef(null);

  const WEEK    = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const jsToCol = (day) => (day === 0 ? 6 : day - 1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setContainerW(entries[0].contentRect.width);
    });
    ro.observe(el);
    setContainerW(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  const cellGap     = 6;
  const targetWidth = containerW > 0 ? containerW * 0.5 : 0;
  const rawCellSize = targetWidth > 0 ? (targetWidth - 6 * cellGap) / 7 : 28;
  const cellSize    = Math.min(Math.max(Math.floor(rawCellSize), 20), 52);

  const getColor = (count, max) => {
    if (count === 0) return "#e2e8f0";
    const r = count / max;
    if (r < 0.25) return "#86efac";
    if (r < 0.5)  return "#34d399";
    if (r < 0.75) return "#10b981";
    return "#059669";
  };

  const days = [];
  for (let i = 29; i >= 0; i--) {
    const date  = new Date(Date.now() - i * 86400000);
    const raw   = date.toLocaleDateString();
    const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const count = (exerciseHistory || []).filter((ex) =>
      toLocaleKey(ex.timestamp || ex.date) === raw
    ).length;
    days.push({ label, raw, count, col: jsToCol(date.getDay()) });
  }

  const maxCount = Math.max(...days.map((d) => d.count), 1);
  const firstCol = days[0].col;
  const numRows  = Math.ceil((firstCol + days.length) / 7);
  const columns  = Array.from({ length: 7 }, () => []);
  days.forEach((day, i) => {
    const row = Math.floor((firstCol + i) / 7);
    columns[day.col].push({ ...day, row });
  });

  const gridW = 7 * cellSize + 6 * cellGap;

  return (
    <div ref={containerRef} style={{ width: "100%" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>

        {/* Day labels */}
        <div style={{ display: "flex", gap: `${cellGap}px`, width: `${gridW}px`, marginBottom: "6px" }}>
          {WEEK.map((label) => (
            <div key={label} style={{ width: `${cellSize}px`, flexShrink: 0, textAlign: "center", fontSize: Math.max(cellSize * 0.38, 9) + "px", color: C.muted, fontWeight: "700" }}>
              {label}
            </div>
          ))}
        </div>

        {/* Cell grid */}
        <div style={{ display: "flex", gap: `${cellGap}px` }}>
          {WEEK.map((label, colIdx) => {
            const colDays = columns[colIdx];
            const slots   = Array(numRows).fill(null);
            colDays.forEach((d) => { slots[d.row] = d; });
            return (
              <div key={label} style={{ display: "flex", flexDirection: "column", gap: `${cellGap}px` }}>
                {slots.map((day, rowIdx) => (
                  <div
                    key={rowIdx}
                    onMouseEnter={(e) => {
                      if (!day) return;
                      const r = e.currentTarget.getBoundingClientRect();
                      setTooltip({ day, x: r.left, y: r.top });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    style={{
                      width:        `${cellSize}px`,
                      height:       `${cellSize}px`,
                      borderRadius: `${Math.max(cellSize * 0.2, 4)}px`,
                      background:   day ? getColor(day.count, maxCount) : "#f1f5f9",
                      cursor:       day ? "pointer" : "default",
                      transition:   "transform 0.12s ease, box-shadow 0.12s ease",
                      flexShrink:   0,
                      boxShadow:    day && day.count > 0 ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
                    }}
                    onMouseOver={(e) => {
                      if (day) {
                        e.currentTarget.style.transform  = "scale(1.15)";
                        e.currentTarget.style.boxShadow = "0 3px 10px rgba(0,0,0,0.18)";
                      }
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform  = "scale(1)";
                      e.currentTarget.style.boxShadow = day && day.count > 0 ? "0 1px 4px rgba(0,0,0,0.10)" : "none";
                    }}
                  />
                ))}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "14px" }}>
          <span style={{ fontSize: "11px", color: C.light, marginRight: "2px" }}>Less</span>
          {["#e2e8f0", "#86efac", "#34d399", "#10b981", "#059669"].map((c) => (
            <div key={c} style={{ width: `${Math.round(cellSize * 0.75)}px`, height: `${Math.round(cellSize * 0.75)}px`, borderRadius: `${Math.max(cellSize * 0.15, 3)}px`, background: c }} />
          ))}
          <span style={{ fontSize: "11px", color: C.light, marginLeft: "2px" }}>More</span>
        </div>
      </div>

      {tooltip && (
        <div style={{ position: "fixed", left: tooltip.x + 14, top: tooltip.y - 52, background: C.text, color: "#fff", borderRadius: "9px", padding: "7px 12px", fontSize: "12px", pointerEvents: "none", zIndex: 999, whiteSpace: "nowrap", boxShadow: "0 4px 18px rgba(0,0,0,0.28)" }}>
          <div style={{ fontWeight: "700" }}>{tooltip.day.label}</div>
          <div style={{ color: "#94a3b8", fontSize: "11px", marginTop: "2px" }}>
            {tooltip.day.count} session{tooltip.day.count !== 1 ? "s" : ""}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   SUMMARY PAGE
───────────────────────────────────────────── */
export default function Summary() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const docRef  = doc(db, "users", auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        setData(
          docSnap.exists()
            ? docSnap.data()
            : {
                sessionsCompleted: 0,
                exercisesDone: 0,
                exerciseHistory: [],
                routine: {},
                goalEntries: [],
                createdAt: new Date().toISOString(),
              }
        );
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const calculateStreak = () => {
    if (!data?.exerciseHistory?.length) return 0;
    const sorted    = [...new Set(data.exerciseHistory.map((ex) => toLocaleKey(ex.timestamp || ex.date)))].sort().reverse();
    const today     = new Date().toLocaleDateString();
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();
    if (sorted[0] !== today && sorted[0] !== yesterday) return 0;
    let streak = 0, cur = new Date();
    for (let i = 0; i < sorted.length; i++) {
      if (sorted.includes(new Date(cur).toLocaleDateString())) {
        streak++;
        cur = new Date(cur.getTime() - 86400000);
      } else break;
    }
    return streak;
  };

  const buildRoutine7Days = () => {
    const days  = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d       = new Date(today.getTime() - i * 86400000);
      const dayName = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][d.getDay()];
      const label   = d.toLocaleDateString("en-US", { weekday: "short" });
      const items   = Object.entries(data?.routine || {})
        .filter(([key]) => key.startsWith(dayName))
        .map(([, val]) => val);
      const total   = items.length;
      const done    = items.filter((v) => v.status === "done").length;
      const notDone = items.filter((v) => v.status === "not-done").length;
      const pending = total - done - notDone;
      days.push({ label, dayName, total, done, notDone, pending });
    }
    return days;
  };

  const handleLogout = async () => {
    const { signOut } = await import("firebase/auth");
    const { auth: a } = await import("../firebase/firebase");
    await signOut(a);
    window.location.href = "/";
  };

  if (loading) return (
    <>
      <Navbar />
      <div style={{ marginLeft: "220px", minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>⏳</div>
          <div style={{ color: C.muted, fontSize: "16px" }}>Loading your summary...</div>
        </div>
      </div>
    </>
  );

  const streak   = calculateStreak();
  const routine7 = buildRoutine7Days();

  const totalDone    = routine7.reduce((s, d) => s + d.done, 0);
  const totalNotDone = routine7.reduce((s, d) => s + d.notDone, 0);
  const totalPending = routine7.reduce((s, d) => s + d.pending, 0);
  const totalRoutine = totalDone + totalNotDone + totalPending;
  const completionPct = totalRoutine > 0 ? Math.round((totalDone / totalRoutine) * 100) : 0;

  const completedGoalsTotal = (data?.goalEntries || []).filter((e) => e.status === "Completed").length;
  const inProgressGoals     = (data?.goalEntries || []).filter((e) => e.status === "In Progress").length;

  const joinDate = data?.createdAt || null;

  return (
    <>
      <style>{`
        .summary-page {
          margin-left: 220px;
          min-height: 100vh;
          background: ${C.bg};
          padding: 32px 36px;
          font-family: 'Segoe UI', system-ui, sans-serif;
          box-sizing: border-box;
        }
        @media (max-width: 768px) {
          .summary-page { margin-left: 0; padding: 72px 16px 80px; }
          .summary-stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      <Navbar />
      <div className="summary-page">

        {/* ── Header ── */}
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ fontSize: "clamp(22px, 4vw, 28px)", fontWeight: "800", color: C.text, margin: 0 }}>
            Performance Summary
          </h1>
          <p style={{ color: C.muted, marginTop: "6px", fontSize: "14px" }}>
            Track your mental training progress and statistics
          </p>
        </div>

        {/* ── Stat cards ── */}
        <div
          className="summary-stat-grid"
          style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}
        >
          {[
            { icon: "📊", value: data?.sessionsCompleted || 0, label: "Total Sessions",  sub: "+sessions recorded",                       accent: C.blue   },
            { icon: "🔥", value: streak,                       label: "Current Streak",  sub: streak > 0 ? "Keep it up!" : "Start today!", accent: "#f97316" },
            { icon: "💪", value: data?.exercisesDone || 0,    label: "Exercises Done",  sub: "All time",                                  accent: C.green  },
            { icon: "🎯", value: completedGoalsTotal,          label: "Goals Completed", sub: `${inProgressGoals} in progress`,            accent: C.purple },
          ].map((c) => (
            <div
              key={c.label}
              style={{ background: C.card, borderRadius: "16px", padding: "20px", border: `1px solid ${C.border}`, boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <span style={{ fontSize: "13px", color: C.muted, fontWeight: "500" }}>{c.label}</span>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: c.accent + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>
                  {c.icon}
                </div>
              </div>
              <div style={{ fontSize: "32px", fontWeight: "800", color: C.text, lineHeight: 1, marginBottom: "4px" }}>{c.value}</div>
              <div style={{ fontSize: "12px", color: c.accent, fontWeight: "600" }}>{c.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Clustered Exercise Chart ── */}
        <div style={card()}>
          <CardHeader
            title="Exercise Summary & Breakdown"
            subtitle="Sessions per day by type since you joined — scroll to see full history"
          />
          {data?.exerciseHistory?.length > 0 ? (
            <ClusteredBarChart exerciseHistory={data.exerciseHistory} joinDate={joinDate} />
          ) : (
            <div style={{ textAlign: "center", padding: "40px 0", color: C.light }}>
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>📊</div>
              <div style={{ fontSize: "13px" }}>No exercise data yet</div>
            </div>
          )}
        </div>

        {/* ── Last 7 Days Routine Completion ── */}
        <div style={card()}>
          <CardHeader title="Last 7 Days Routine Completion" subtitle="Daily routine task completion status" />

          <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
            {[
              { label: "Completed",  value: totalDone,          bg: "#dcfce7", color: "#16a34a" },
              { label: "Missed",     value: totalNotDone,        bg: "#fee2e2", color: "#dc2626" },
              { label: "Pending",    value: totalPending,        bg: "#f1f5f9", color: C.muted   },
              { label: "Completion", value: `${completionPct}%`, bg: "#eff6ff", color: C.blue    },
            ].map((b) => (
              <div key={b.label} style={{ background: b.bg, borderRadius: "10px", padding: "10px 16px", textAlign: "center", minWidth: "80px" }}>
                <div style={{ fontSize: "20px", fontWeight: "800", color: b.color }}>{b.value}</div>
                <div style={{ fontSize: "11px", color: C.muted, marginTop: "2px" }}>{b.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px" }}>
            {routine7.map((d, i) => {
              const hasData = d.total > 0;
              return (
                <div key={i} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "11px", fontWeight: "700", color: C.muted, marginBottom: "6px" }}>{d.label}</div>
                  <div style={{
                    borderRadius: "10px",
                    padding: "10px 4px",
                    background: hasData ? "#f8fafc" : "transparent",
                    border: hasData ? `1px solid ${C.border}` : "1px dashed #e2e8f0",
                  }}>
                    {hasData ? (
                      <>
                        <div style={{ fontSize: "13px", fontWeight: "800", color: "#16a34a" }}>{d.done}</div>
                        <div style={{ fontSize: "9px", color: C.light }}>done</div>
                        {d.notDone > 0 && <div style={{ fontSize: "11px", fontWeight: "700", color: "#dc2626", marginTop: "4px" }}>{d.notDone} ✗</div>}
                        {d.pending > 0 && <div style={{ fontSize: "9px", color: C.muted }}>{d.pending} pend.</div>}
                      </>
                    ) : (
                      <div style={{ fontSize: "11px", color: "#cbd5e1" }}>—</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Goals Completed Chart ── */}
        <div style={card()}>
          <CardHeader
            title="Goals Completed"
            subtitle="Completed goal entries since you joined — scroll to see full history"
          />
          {data?.goalEntries?.length > 0 && data.goalEntries.some((e) => e.status === "Completed") ? (
            <GoalsBarChart goalEntries={data.goalEntries} joinDate={joinDate} />
          ) : (
            <div style={{ textAlign: "center", padding: "40px 0", color: C.light }}>
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>🎯</div>
              <div style={{ fontSize: "13px" }}>No completed goals yet</div>
              <div style={{ fontSize: "12px", color: C.light, marginTop: "4px" }}>
                Mark goals as "Completed" in the Motivation page
              </div>
            </div>
          )}
        </div>

        {/* ── 30-Day Heatmap ── */}
        <div style={card()}>
          <CardHeader title="30-Day Activity Heatmap" subtitle="Your daily training consistency" />
          <Heatmap exerciseHistory={data?.exerciseHistory} />
        </div>

        {/* ── Recent Exercises ── */}
        {data?.exerciseHistory?.length > 0 && (
          <div style={card()}>
            <CardHeader title="Recent Exercises" subtitle="Your last 10 completed sessions" />
            <div style={{ display: "flex", flexDirection: "column" }}>
              {data.exerciseHistory.slice(-10).reverse().map((ex, i) => {
                const iconMap = {
                  "box-breathing": "💨",
                  "relaxation":    "🧘",
                  "focus-reset":   "🎯",
                  "visualisation": "🏆",
                };
                const icon = iconMap[ex.exerciseId] || "💪";
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 0",
                      borderBottom: i < 9 ? `1px solid #f1f5f9` : "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>
                        {icon}
                      </div>
                      <div>
                        <div style={{ fontWeight: "600", fontSize: "14px", color: C.text }}>{ex.exerciseName}</div>
                        <div style={{ fontSize: "11px", color: C.light }}>{ex.date}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: "11px", color: C.light }}>
                      {ex.timestamp
                        ? new Date(ex.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <Footer onLogout={handleLogout} />
      </div>
    </>
  );
}