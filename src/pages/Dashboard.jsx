import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { auth, db } from "../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";

/* ─────────────────────────────────────────────
   CAROUSEL
───────────────────────────────────────────── */
const carouselSlides = [
  { bg: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)",               emoji: "🧠", title: "Train Your Mind",    subtitle: "Mental strength is the foundation of athletic excellence" },
  { bg: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",  emoji: "🎯", title: "Find Your Focus",    subtitle: "Sharpen concentration with proven mental exercises" },
  { bg: "linear-gradient(135deg, #0d1b2a 0%, #1b4332 100%)",               emoji: "💪", title: "Build Resilience",   subtitle: "Bounce back stronger from every setback" },
  { bg: "linear-gradient(135deg, #1a0533 0%, #3b0764 100%)",               emoji: "🏆", title: "Achieve Greatness",  subtitle: "Champions are made through consistent mental training" },
];

function ImageCarousel() {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setCurrent((p) => (p + 1) % carouselSlides.length), 3500);
    return () => clearInterval(interval);
  }, []);
  const slide = carouselSlides[current];
  return (
    <div style={{ borderRadius: "16px", overflow: "hidden", height: "280px", position: "relative", background: slide.bg, transition: "background 0.8s ease", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", textAlign: "center" }}>
      <div style={{ position: "absolute", width: "180px", height: "180px", borderRadius: "50%", background: "rgba(255,255,255,0.04)", top: "-30px", right: "-30px" }} />
      <div style={{ position: "absolute", width: "120px", height: "120px", borderRadius: "50%", background: "rgba(255,255,255,0.04)", bottom: "10px", left: "-20px" }} />
      <div style={{ fontSize: "52px", marginBottom: "12px", filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.4))" }}>{slide.emoji}</div>
      <h2 style={{ color: "#fff", fontSize: "22px", fontWeight: "800", margin: "0 0 8px", letterSpacing: "-0.5px" }}>{slide.title}</h2>
      <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "13px", maxWidth: "260px", lineHeight: "1.5", margin: "0 0 16px" }}>{slide.subtitle}</p>
      <div style={{ display: "flex", gap: "8px" }}>
        {carouselSlides.map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)} style={{ width: i === current ? "24px" : "8px", height: "8px", borderRadius: "4px", background: i === current ? "#3b82f6" : "rgba(255,255,255,0.35)", border: "none", cursor: "pointer", transition: "all 0.3s ease", padding: 0 }} />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ACTIVITY HEATMAP
   
   Approach: render 7 COLUMN divs side by side
   using flexbox. Each column div contains:
     - 1 label div at the top
     - N cell divs below
   
   Because label and cells are in the same column
   div, alignment is physically impossible to break.
   No grid math, no offset calculation needed.
───────────────────────────────────────────── */
function ActivityHeatmap({ exerciseHistory }) {
  const [tooltip, setTooltip] = useState(null);

  // Mon=0 ... Sun=6  (our display order)
  const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // JS getDay(): Sun=0,Mon=1,...,Sat=6  →  our col index: Mon=0,...,Sun=6
  const jsToCol = (d) => (d === 0 ? 6 : d - 1);

  const getColor = (count, max) => {
    if (count === 0) return "#e2e8f0";
    const r = count / max;
    if (r < 0.25) return "#86efac";
    if (r < 0.5)  return "#34d399";
    if (r < 0.75) return "#10b981";
    return "#059669";
  };

  // Build last 30 days
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const date    = new Date(Date.now() - i * 86400000);
    const raw     = date.toLocaleDateString();
    const label   = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const count   = exerciseHistory?.filter((ex) => ex.date === raw).length || 0;
    days.push({ label, raw, count, col: jsToCol(date.getDay()) });
  }

  const maxCount = Math.max(...days.map((d) => d.count), 1);

  // Distribute days into 7 column arrays, preserving order within each column
  const columns = Array.from({ length: 7 }, () => []);
  // We need to place days in rows. Find the row of each day:
  // row = Math.floor((leadingNulls + index) / 7) ... but simpler:
  // just track a "slot index" = leadingNulls + dayIndex, row = Math.floor(slot/7)
  const firstCol    = days[0].col;
  days.forEach((day, i) => {
    const slot = firstCol + i;
    const row  = Math.floor(slot / 7);
    columns[day.col].push({ ...day, row });
  });

  // How many rows total?
  const totalSlots = firstCol + days.length;
  const numRows    = Math.ceil(totalSlots / 7);

  const currentStreak = (() => {
    let s = 0;
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].count > 0) s++; else break;
    }
    return s;
  })();
  const monthlyTotal = days.reduce((s, d) => s + d.count, 0);

  return (
    <div>
      {/* Stats */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <span style={{ fontSize: "14px" }}>🔥</span>
          <span style={{ fontWeight: "700", fontSize: "14px", color: "#0f172a" }}>{currentStreak}d streak</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <span style={{ fontWeight: "700", fontSize: "14px", color: "#0f172a" }}>{monthlyTotal}</span>
          <span style={{ fontSize: "11px", color: "#94a3b8" }}>sessions this month</span>
        </div>
      </div>

      {/* 7-column layout: each column = label + cells stacked vertically */}
      <div style={{ display: "flex", gap: "3px", position: "relative" }}>
        {WEEK.map((dayLabel, colIdx) => {
          const colDays = columns[colIdx];
          // Build an array of numRows slots, fill with day data or null
          const slots = Array(numRows).fill(null);
          colDays.forEach((d) => { slots[d.row] = d; });

          return (
            <div key={dayLabel} style={{ flex: 1, display: "flex", flexDirection: "column", gap: "3px" }}>
              {/* Day label — same width as cells, guaranteed */}
              <div style={{ textAlign: "center", fontSize: "9px", color: "#94a3b8", fontWeight: "600", height: "14px", lineHeight: "14px" }}>
                {dayLabel}
              </div>

              {/* Cell slots */}
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
                    width: "100%",
                    aspectRatio: "1",
                    borderRadius: "3px",
                    background: day ? getColor(day.count, maxCount) : "transparent",
                    cursor: day ? "pointer" : "default",
                    transition: "transform 0.12s ease",
                    maxHeight: "18px",
                  }}
                  onMouseOver={(e) => { if (day) e.currentTarget.style.transform = "scale(1.2)"; }}
                  onMouseOut={(e)  => { e.currentTarget.style.transform = "scale(1)"; }}
                />
              ))}
            </div>
          );
        })}

        {tooltip && (
          <div style={{ position: "fixed", left: tooltip.x + 10, top: tooltip.y - 44, background: "#0f172a", color: "#fff", borderRadius: "8px", padding: "5px 9px", fontSize: "11px", pointerEvents: "none", zIndex: 999, whiteSpace: "nowrap", boxShadow: "0 4px 16px rgba(0,0,0,0.25)" }}>
            <div style={{ fontWeight: "600" }}>{tooltip.day.label}</div>
            <div style={{ color: "#94a3b8" }}>{tooltip.day.count} session{tooltip.day.count !== 1 ? "s" : ""}</div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "8px", justifyContent: "flex-end" }}>
        <span style={{ fontSize: "10px", color: "#94a3b8" }}>Less</span>
        {["#e2e8f0", "#86efac", "#34d399", "#10b981", "#059669"].map((c) => (
          <div key={c} style={{ width: "10px", height: "10px", borderRadius: "2px", background: c }} />
        ))}
        <span style={{ fontSize: "10px", color: "#94a3b8" }}>More</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   TODAY'S ROUTINE
───────────────────────────────────────────── */
function TodaysRoutine({ routineData }) {
  const days      = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const todayName = days[new Date().getDay()];
  const todayItems = Object.entries(routineData || {})
    .filter(([key]) => key.startsWith(todayName))
    .map(([key, val]) => ({ key, ...val }))
    .sort((a, b) => a.time.localeCompare(b.time));

  const activityIcons = { meditation: "🧘", breathing: "💨", visuali: "🎯", run: "🏃", exercise: "💪", yoga: "🌿", warm: "🔥", cool: "❄️", sleep: "😴", stretch: "🤸", mental: "🧠", evening: "🌙", morning: "☀️" };
  const getIcon = (activity = "") => { const lower = activity.toLowerCase(); for (const [key, icon] of Object.entries(activityIcons)) { if (lower.includes(key)) return icon; } return "⚡"; };
  const getBorderColor = (s) => s === "done" ? "#10b981" : s === "not-done" ? "#ef4444" : "#3b82f6";
  const getStatusBadge = (s) => s === "done" ? { bg: "#dcfce7", color: "#16a34a", label: "Done" } : s === "not-done" ? { bg: "#fee2e2", color: "#dc2626", label: "Missed" } : { bg: "#eff6ff", color: "#3b82f6", label: "Pending" };

  if (todayItems.length === 0) return (
    <div style={{ textAlign: "center", padding: "28px 16px", background: "#f8fafc", borderRadius: "12px", border: "2px dashed #e2e8f0" }}>
      <div style={{ fontSize: "32px", marginBottom: "8px" }}>📅</div>
      <div style={{ color: "#64748b", fontSize: "14px" }}>No routine scheduled for today.</div>
      <Link to="/routine" style={{ display: "inline-block", marginTop: "10px", color: "#3b82f6", fontSize: "13px", fontWeight: "600", textDecoration: "none" }}>+ Add routine →</Link>
    </div>
  );

  return (
    <div style={{ display: "flex", gap: "14px", overflowX: "auto", paddingBottom: "8px" }}>
      {todayItems.map((item) => {
        const badge = getStatusBadge(item.status);
        return (
          <div key={item.key}
            style={{ flexShrink: 0, width: "140px", background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0", borderTop: `4px solid ${getBorderColor(item.status)}`, boxShadow: "0 2px 10px rgba(0,0,0,0.06)", padding: "14px 12px", display: "flex", flexDirection: "column", gap: "10px", transition: "transform 0.15s ease, box-shadow 0.15s ease" }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)";    e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.06)"; }}
          >
            <div style={{ background: "#f8fafc", borderRadius: "10px", padding: "8px 10px", textAlign: "center", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a", letterSpacing: "-0.5px", lineHeight: 1 }}>{item.time}</div>
            </div>
            <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "linear-gradient(135deg, #eff6ff, #dbeafe)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", margin: "0 auto" }}>{getIcon(item.activity)}</div>
            <div style={{ fontSize: "12px", fontWeight: "600", color: "#0f172a", textAlign: "center", lineHeight: "1.4", wordBreak: "break-word" }}>{item.activity}</div>
            <div style={{ padding: "3px 8px", borderRadius: "20px", background: badge.bg, color: badge.color, fontSize: "10px", fontWeight: "700", textAlign: "center", alignSelf: "center" }}>{badge.label}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────
   DASHBOARD
───────────────────────────────────────────── */
export default function Dashboard() {
  const [userData, setUserData] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [userName, setUserName] = useState("Athlete");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const snap = await getDoc(doc(db, "users", user.uid));
        const data = snap.exists() ? snap.data() : {};
        if (data.name && data.name.trim()) {
          setUserName(data.name.trim().split(" ")[0]);
        } else {
          const e = user.email?.split("@")[0] || "Athlete";
          setUserName(e.charAt(0).toUpperCase() + e.slice(1));
        }
        setUserData({ sessionsCompleted: 0, exercisesDone: 0, exerciseHistory: [], routine: {}, ...data });
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const calculateStreak = () => {
    if (!userData?.exerciseHistory?.length) return 0;
    const sorted    = [...new Set(userData.exerciseHistory.map((ex) => ex.date))].sort().reverse();
    const today     = new Date().toLocaleDateString();
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();
    if (sorted[0] !== today && sorted[0] !== yesterday) return 0;
    let streak = 0, cur = new Date();
    for (let i = 0; i < sorted.length; i++) {
      if (sorted.includes(new Date(cur).toLocaleDateString())) { streak++; cur = new Date(cur.getTime() - 86400000); } else break;
    }
    return streak;
  };

  const getGreeting = () => { const h = new Date().getHours(); if (h < 12) return "Good morning"; if (h < 17) return "Good afternoon"; return "Good evening"; };

  const handleLogout = async () => {
    const { signOut } = await import("firebase/auth");
    const { auth: a } = await import("../firebase/firebase");
    await signOut(a);
    window.location.href = "/";
  };

  if (loading) return (
    <>
      <Navbar />
      <div className="axen-page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center" }}><div style={{ fontSize: "36px", marginBottom: "12px" }}>⏳</div><div style={{ color: "#64748b", fontSize: "16px" }}>Loading your dashboard...</div></div>
      </div>
    </>
  );

  const streak = calculateStreak();

  return (
    <>
      <style>{`
        .axen-page { margin-left: 220px; min-height: 100vh; background: #f8fafc; padding: 32px 36px; font-family: 'Segoe UI', system-ui, sans-serif; box-sizing: border-box; }
        .axen-top-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
        .axen-stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
        .axen-quick-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
        @media (max-width: 768px) {
          .axen-page { margin-left: 0; padding: 72px 16px 80px; }
          .axen-top-grid { grid-template-columns: 1fr; }
          .axen-stats-grid { grid-template-columns: repeat(3, 1fr); gap: 10px; }
          .axen-quick-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
        }
        @media (max-width: 480px) {
          .axen-stats-grid { gap: 8px; }
          .axen-stat-card { padding: 12px 10px !important; }
          .axen-card { padding: 16px !important; }
          .axen-stat-value { font-size: 22px !important; }
          .axen-quick-card { padding: 14px !important; }
        }
        .axen-card { background: #fff; border-radius: 16px; padding: 20px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); border: 1px solid #f1f5f9; margin-bottom: 20px; }
        .axen-stat-card { background: #fff; border-radius: 14px; padding: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); border: 1px solid #f1f5f9; display: flex; flex-direction: column; gap: 4px; }
        .axen-quick-card { border-radius: 14px; padding: 18px; cursor: pointer; transition: transform 0.18s ease, box-shadow 0.18s ease; text-decoration: none; display: block; }
        .axen-quick-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.18); }
      `}</style>

      <Navbar />
      <div className="axen-page">

        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "clamp(20px, 4vw, 26px)", fontWeight: "800", color: "#0f172a", margin: 0 }}>{getGreeting()}, {userName}! 👋</h1>
          <p style={{ color: "#64748b", marginTop: "6px", fontSize: "14px" }}>Ready to train your mind today?</p>
        </div>

        <div className="axen-top-grid">
          <ImageCarousel />
          <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#eff6ff", borderRadius: "8px", padding: "5px 10px", marginBottom: "12px", width: "fit-content" }}>
              <span style={{ fontSize: "13px" }}>🧠</span>
              <span style={{ color: "#3b82f6", fontSize: "11px", fontWeight: "600" }}>Mental Training Platform</span>
            </div>
            <h2 style={{ fontSize: "clamp(16px, 3vw, 20px)", fontWeight: "800", color: "#0f172a", marginBottom: "8px" }}>About AXEN</h2>
            <p style={{ color: "#64748b", fontSize: "13px", lineHeight: "1.6", marginBottom: "12px" }}>AXEN is your personal mental training platform designed for athletes who want to elevate their mental game.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[{ icon: "🎯", text: "Improve Focus with visualization techniques" }, { icon: "😌", text: "Manage Anxiety with breathing practices" }, { icon: "📋", text: "Build Routines for mental & physical training" }, { icon: "📈", text: "Track Progress with detailed insights" }].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <span style={{ fontSize: "13px", flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ fontSize: "12px", color: "#475569", lineHeight: "1.5" }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="axen-stats-grid">
          {[
            { icon: "📊", value: userData?.sessionsCompleted || 0, label: "Sessions",   accent: "#3b82f6" },
            { icon: "💪", value: userData?.exercisesDone     || 0, label: "Exercises",  accent: "#10b981" },
            { icon: "🔥", value: streak,                           label: "Day Streak", accent: "#f59e0b" },
          ].map((card) => (
            <div key={card.label} className="axen-stat-card">
              <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: card.accent + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", marginBottom: "4px" }}>{card.icon}</div>
              <div className="axen-stat-value" style={{ fontSize: "26px", fontWeight: "800", color: "#0f172a", lineHeight: 1 }}>{card.value}</div>
              <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "500" }}>{card.label}</div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: "20px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", marginBottom: "12px" }}>Quick Access</h2>
          <div className="axen-quick-grid">
            {[
              { to: "/exercises",  icon: "🧘", label: "Start Exercise", desc: "Begin a training session", gradient: "linear-gradient(135deg, #1d4ed8, #2563eb)" },
              { to: "/routine",    icon: "📋", label: "Build Routine",  desc: "Create daily routine",     gradient: "linear-gradient(135deg, #059669, #10b981)" },
              { to: "/motivation", icon: "⭐", label: "Motivation",     desc: "Track goals & strengths",  gradient: "linear-gradient(135deg, #d97706, #f59e0b)" },
              { to: "/chatbot",    icon: "🤖", label: "AI Coach",       desc: "Get personalised help",    gradient: "linear-gradient(135deg, #7c3aed, #8b5cf6)" },
            ].map((card) => (
              <Link key={card.to} to={card.to} className="axen-quick-card" style={{ background: card.gradient }}>
                <div style={{ fontSize: "26px", marginBottom: "8px" }}>{card.icon}</div>
                <div style={{ color: "#fff", fontWeight: "700", fontSize: "14px", marginBottom: "4px" }}>{card.label}</div>
                <div style={{ color: "rgba(255,255,255,0.72)", fontSize: "11px", lineHeight: "1.4" }}>{card.desc}</div>
              </Link>
            ))}
          </div>
        </div>

        <div className="axen-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h2 style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", margin: 0 }}>Today's Routine</h2>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "3px" }}>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
            </div>
            <Link to="/routine" style={{ fontSize: "12px", color: "#3b82f6", fontWeight: "600", textDecoration: "none" }}>Show more →</Link>
          </div>
          <TodaysRoutine routineData={userData?.routine} />
        </div>

        <div className="axen-card" style={{ marginBottom: "32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div>
              <h2 style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", margin: 0 }}>30 Day Activity</h2>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "3px" }}>Your training heatmap</div>
            </div>
            <Link to="/summary" style={{ fontSize: "12px", color: "#3b82f6", fontWeight: "600", textDecoration: "none" }}>Analytics →</Link>
          </div>
          <ActivityHeatmap exerciseHistory={userData?.exerciseHistory} />
        </div>

        <Footer onLogout={handleLogout} />
      </div>
    </>
  );
}