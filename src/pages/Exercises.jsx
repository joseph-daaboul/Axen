import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";

const exercises = [
  { id: "box-breathing", title: "Box Breathing", description: "4-4-4-4 breathing pattern to calm your nervous system and improve focus before competition.", duration: "5 minutes", icon: "💨", iconBg: "linear-gradient(135deg, #3b82f6, #1d4ed8)" },
  { id: "relaxation", title: "2 Minute Relaxation", description: "Quick progressive muscle relaxation to release tension and reset your mental state.", duration: "2 minutes", icon: "✨", iconBg: "linear-gradient(135deg, #10b981, #059669)" },
  { id: "focus-reset", title: "Focus Reset", description: "Mindfulness exercise to regain concentration and mental clarity during training.", duration: "3 minutes", icon: "🎯", iconBg: "linear-gradient(135deg, #f59e0b, #d97706)" },
  { id: "visualisation", title: "Performance Visualisation", description: "Guided mental imagery to visualize success and build pre-competition confidence.", duration: "3 minutes", icon: "🏆", iconBg: "linear-gradient(135deg, #8b5cf6, #6d28d9)" },
];

const whyPoints = [
  "Manage pre-competition anxiety and stress",
  "Improve focus and concentration during training",
  "Recover mentally between high-intensity sessions",
  "Build mental resilience and confidence",
];

/* ─────────────────────────────────────────────
   Exercise type config (for history panel)
───────────────────────────────────────────── */
const EX_CONFIG = {
  "box-breathing":  { label: "Box Breathing",            emoji: "💨", color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" },
  "relaxation":     { label: "2 Min Relaxation",          emoji: "✨", color: "#10b981", bg: "#f0fdf4", border: "#bbf7d0" },
  "focus-reset":    { label: "Focus Reset",               emoji: "🎯", color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
  "visualisation":  { label: "Performance Visualisation", emoji: "🏆", color: "#8b5cf6", bg: "#f5f3ff", border: "#ddd6fe" },
};

/* ─────────────────────────────────────────────
   Exercise Card
───────────────────────────────────────────── */
function ExerciseCard({ exercise, onStart }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#fff",
        borderRadius: "16px",
        padding: "20px",
        border: "1px solid #e2e8f0",
        boxShadow: hovered ? "0 8px 32px rgba(0,0,0,0.12)" : "0 2px 12px rgba(0,0,0,0.05)",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        transition: "all 0.2s ease",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: exercise.iconBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
        {exercise.icon}
      </div>
      <div>
        <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", margin: "0 0 5px" }}>{exercise.title}</h3>
        <p style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.5", margin: 0 }}>{exercise.description}</p>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: "4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#94a3b8", fontSize: "12px" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          {exercise.duration}
        </div>
        <button
          onClick={onStart}
          style={{ padding: "8px 18px", borderRadius: "50px", background: "linear-gradient(135deg, #1e3a8a, #1d4ed8)", color: "#fff", border: "none", fontSize: "13px", fontWeight: "600", cursor: "pointer", boxShadow: "0 4px 12px rgba(29,78,216,0.3)", transition: "box-shadow 0.18s ease" }}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 6px 16px rgba(29,78,216,0.45)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 4px 12px rgba(29,78,216,0.3)"; }}
        >
          Start
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Exercise History Panel
   • Last 7 days: 4 type cards with count
   • Full history table, last 10 + "Show All"
───────────────────────────────────────────── */
function ExerciseHistoryPanel({ exerciseHistory }) {
  const [showAll, setShowAll] = useState(false);

  /* Last 7 days count per type */
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
  const last7 = (exerciseHistory || []).filter((ex) => {
    const d = new Date(ex.timestamp || ex.date);
    return d >= sevenDaysAgo;
  });
  const countByType = {};
  last7.forEach((ex) => {
    const key = ex.exerciseId || "unknown";
    countByType[key] = (countByType[key] || 0) + 1;
  });

  /* Sorted history — newest first */
  const sorted    = [...(exerciseHistory || [])].reverse();
  const displayed = showAll ? sorted : sorted.slice(0, 10);

  if (!exerciseHistory || exerciseHistory.length === 0) return null;

  return (
    <>
      {/* ── Last 7 Days ── */}
      <div style={{ background: "#fff", borderRadius: "16px", padding: "24px 28px", border: "1px solid #e2e8f0", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", marginBottom: "24px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a", margin: "0 0 4px" }}>
          Last 7 Days Exercises
        </h2>
        <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 20px" }}>
          A snapshot of your recent activity across all exercise types
        </p>

        <div
          className="ex-7day-grid"
          style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px" }}
        >
          {Object.entries(EX_CONFIG).map(([exId, cfg]) => {
            const count = countByType[exId] || 0;
            return (
              <div
                key={exId}
                style={{
                  background: cfg.bg,
                  border: `1px solid ${cfg.border}`,
                  borderRadius: "14px",
                  padding: "18px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {/* Emoji visual */}
                <div style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "13px",
                  background: "#fff",
                  border: `1px solid ${cfg.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                }}>
                  {cfg.emoji}
                </div>

                {/* Exercise name */}
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a", lineHeight: "1.3" }}>
                  {cfg.label}
                </div>

                {/* Count */}
                <div style={{ display: "flex", alignItems: "baseline", gap: "5px" }}>
                  <span style={{ fontSize: "28px", fontWeight: "900", color: cfg.color, lineHeight: 1 }}>
                    {count}
                  </span>
                  <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "600" }}>
                    {count === 1 ? "time" : "times"}
                  </span>
                </div>

                {/* Mini progress bar */}
                <div style={{ height: "4px", borderRadius: "99px", background: "#e2e8f0", overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${Math.min(count * 20, 100)}%`,
                    background: cfg.color,
                    borderRadius: "99px",
                    transition: "width 0.5s ease",
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── History Table ── */}
      <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", marginBottom: "32px", overflow: "hidden" }}>
        {/* Table header */}
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #f1f5f9" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a", margin: "0 0 2px" }}>Exercise History</h2>
          <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>Your complete exercise log</p>
        </div>

        {/* Column headers */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "44px 1fr 150px 110px",
          padding: "10px 24px",
          background: "#f8fafc",
          borderBottom: "1px solid #e2e8f0",
        }}>
          {["#", "Exercise Name", "Date", "Time"].map((h) => (
            <span key={h} style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.7px" }}>
              {h}
            </span>
          ))}
        </div>

        {/* Rows */}
        <div>
          {displayed.map((ex, i) => {
            const cfg     = EX_CONFIG[ex.exerciseId] || { emoji: "💪", color: "#64748b", bg: "#f8fafc", border: "#e2e8f0" };
            const ts      = ex.timestamp ? new Date(ex.timestamp) : null;
            const dateStr = ts
              ? ts.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : (ex.date || "—");
            const timeStr = ts
              ? ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "—";

            return (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "44px 1fr 150px 110px",
                  padding: "12px 24px",
                  borderBottom: i < displayed.length - 1 ? "1px solid #f1f5f9" : "none",
                  alignItems: "center",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#f8fafc"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                {/* Sl No */}
                <span style={{ fontSize: "13px", color: "#cbd5e1", fontWeight: "700" }}>
                  {i + 1}
                </span>

                {/* Exercise name + icon */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "9px",
                    background: cfg.bg,
                    border: `1px solid ${cfg.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "15px",
                    flexShrink: 0,
                  }}>
                    {cfg.emoji}
                  </div>
                  <span style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a" }}>
                    {ex.exerciseName || cfg.label}
                  </span>
                </div>

                {/* Date */}
                <span style={{ fontSize: "13px", color: "#64748b" }}>{dateStr}</span>

                {/* Time */}
                <span style={{ fontSize: "13px", color: "#94a3b8" }}>{timeStr}</span>
              </div>
            );
          })}
        </div>

        {/* Show All / Show Less */}
        {sorted.length > 10 && (
          <div style={{ padding: "14px 24px", borderTop: "1px solid #f1f5f9", textAlign: "center" }}>
            <button
              onClick={() => setShowAll((v) => !v)}
              style={{
                background: "transparent",
                border: "1.5px solid #e2e8f0",
                borderRadius: "50px",
                padding: "9px 28px",
                fontSize: "13px",
                fontWeight: "700",
                color: "#1d4ed8",
                cursor: "pointer",
                transition: "all 0.18s ease",
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#eff6ff"; e.currentTarget.style.borderColor = "#bfdbfe"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
            >
              {showAll ? "Show Less ↑" : `Show All ${sorted.length} Records ↓`}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────
   Main Exercises Page
───────────────────────────────────────────── */
export default function Exercises() {
  const navigate = useNavigate();
  const [exerciseHistory, setExerciseHistory] = useState(null);

  /* Fetch user's exercise history */
  useEffect(() => {
    if (!auth.currentUser) return;
    const fetchHistory = async () => {
      try {
        const userRef  = doc(db, "users", auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setExerciseHistory(userSnap.data().exerciseHistory || []);
        } else {
          setExerciseHistory([]);
        }
      } catch (e) {
        console.error(e);
        setExerciseHistory([]);
      }
    };
    fetchHistory();
  }, []);

  return (
    <>
      <style>{`
        .axen-ex-page {
          margin-left: 220px;
          min-height: 100vh;
          background: #f8fafc;
          padding: 32px 36px;
          font-family: 'Segoe UI', system-ui, sans-serif;
          box-sizing: border-box;
        }
        .axen-ex-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 18px;
          margin-bottom: 24px;
        }
        .ex-7day-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }
        @media (max-width: 768px) {
          .axen-ex-page  { margin-left: 0; padding: 72px 16px 80px; }
          .axen-ex-grid  { grid-template-columns: 1fr; gap: 14px; }
          .ex-7day-grid  { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (min-width: 480px) and (max-width: 768px) {
          .axen-ex-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>

      <Navbar />
      <div className="axen-ex-page">

        {/* ── Page heading ── */}
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ fontSize: "clamp(22px, 4vw, 28px)", fontWeight: "800", color: "#0f172a", margin: 0 }}>
            Mental Exercises
          </h1>
          <p style={{ color: "#64748b", marginTop: "6px", fontSize: "14px" }}>
            Choose an exercise to begin your mental training session
          </p>
        </div>

        {/* ── Exercise cards grid ── */}
        <div className="axen-ex-grid">
          {exercises.map((ex) => (
            <ExerciseCard key={ex.id} exercise={ex} onStart={() => navigate(`/exercise/${ex.id}`)} />
          ))}
        </div>

        {/* ── Why Mental Exercises ── */}
        <div style={{ background: "#fff", borderRadius: "16px", padding: "24px 28px", border: "1px solid #e2e8f0", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", marginBottom: "24px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a", margin: "0 0 8px" }}>Why Mental Exercises?</h2>
          <p style={{ color: "#64748b", fontSize: "13px", marginBottom: "16px" }}>
            Mental exercises are essential for peak athletic performance. They help you:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {whyPoints.map((point, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0, background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span style={{ fontSize: "13px", color: "#374151" }}>{point}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── History Panel (Last 7 Days + Table) ── */}
        <ExerciseHistoryPanel exerciseHistory={exerciseHistory} />

        <Footer />
      </div>
    </>
  );
}