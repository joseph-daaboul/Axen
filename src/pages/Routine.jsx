import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { auth, db } from "../firebase/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TIME_SLOTS = [
  "05:00","06:00","07:00","08:00","09:00","10:00","11:00","12:00",
  "13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00",
  "21:00","22:00","23:00","00:00"
];

const ACTIVITY_ICONS = {
  meditation: "🧘", breathing: "💨", visuali: "🎯", run: "🏃",
  exercise: "💪", yoga: "🌿", warm: "🔥", cool: "❄️",
  sleep: "😴", stretch: "🤸", mental: "🧠", evening: "🌙",
  morning: "☀️", reflection: "💭", gratitude: "🙏", focus: "🎯"
};
const getIcon = (activity = "") => {
  const lower = activity.toLowerCase();
  for (const [key, icon] of Object.entries(ACTIVITY_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return "⚡";
};

const getTodayName = () => {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[new Date().getDay()];
};

/**
 * Returns the ISO date string (YYYY-MM-DD) of the most recent Monday.
 * This is used as the "week key" to namespace statuses per week.
 */
const getWeekStart = () => {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon … 6=Sat
  const diff = day === 0 ? 6 : day - 1; // days since Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split("T")[0]; // "YYYY-MM-DD"
};

/**
 * Given a day name ("Monday"…"Sunday") and a time slot ("07:00"),
 * returns true if that slot has already passed in the current week.
 */
const isSlotPassed = (dayName, timeSlot) => {
  const dayIndex = DAYS.indexOf(dayName); // 0=Mon … 6=Sun
  const now = new Date();
  const currentDayIndex = now.getDay() === 0 ? 6 : now.getDay() - 1; // 0=Mon…6=Sun

  if (dayIndex < currentDayIndex) return true; // earlier day this week
  if (dayIndex > currentDayIndex) return false; // later day this week

  // Same day — compare times
  const [slotH, slotM] = timeSlot.split(":").map(Number);
  const slotMinutes = slotH * 60 + slotM;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return slotMinutes < nowMinutes;
};

export default function Routine() {
  const [view, setView] = useState("daily");
  const [day, setDay] = useState("Monday");
  const [timeSlot, setTimeSlot] = useState("07:00");
  const [activity, setActivity] = useState("");

  /**
   * routineData  : { "Monday-07:00": { day, time, activity }, … }
   *   — permanent activity definitions, NO status here
   *
   * weekStatus   : { "Monday-07:00": "done" | "not-done" | "pending", … }
   *   — statuses for the CURRENT week only
   *
   * Both are stored in Firestore under the user doc:
   *   routine      → routineData
   *   routineStatus/<weekStart> → weekStatus
   */
  const [routineData, setRoutineData] = useState({});
  const [weekStatus, setWeekStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [userName, setUserName] = useState("Athlete");

  const weekStart = getWeekStart();

  useEffect(() => { loadRoutine(); }, []);

  /* ─── Load routine + current-week statuses from Firestore ─── */
  const loadRoutine = async () => {
    try {
      if (!auth.currentUser) { setLoading(false); return; }
      const emailName = auth.currentUser.email?.split("@")[0] || "Athlete";
      setUserName(emailName.charAt(0).toUpperCase() + emailName.slice(1));

      const docSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
      const userData = docSnap.exists() ? docSnap.data() : {};

      // Routine definitions (no status field used here)
      const loadedRoutine = userData.routine || {};
      // Strip any legacy `status` fields so the old data doesn't interfere
      const cleanRoutine = {};
      Object.entries(loadedRoutine).forEach(([k, v]) => {
        const { status, ...rest } = v; // eslint-disable-line no-unused-vars
        cleanRoutine[k] = rest;
      });

      // Current-week statuses
      const allStatuses = userData.routineStatus || {};
      const currentWeekStatuses = allStatuses[weekStart] || {};

      setRoutineData(cleanRoutine);

      // Auto-mark passed, unmarked slots as "not-done"
      const autoUpdated = autoMarkMissed(cleanRoutine, currentWeekStatuses);
      setWeekStatus(autoUpdated);

      // Persist auto-marks if anything changed
      if (Object.keys(autoUpdated).length !== Object.keys(currentWeekStatuses).length ||
          Object.entries(autoUpdated).some(([k, v]) => currentWeekStatuses[k] !== v)) {
        await persistStatus(cleanRoutine, autoUpdated, false);
      }
    } catch (error) {
      console.error("Error loading routine:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * For every activity that:
   *   1. Has no status yet this week (not in currentStatuses)
   *   2. Its time slot has already passed
   * → set status to "not-done" automatically.
   */
  const autoMarkMissed = (routine, currentStatuses) => {
    const updated = { ...currentStatuses };
    Object.keys(routine).forEach((key) => {
      const { day: d, time: t } = routine[key];
      if (!updated[key] && isSlotPassed(d, t)) {
        updated[key] = "not-done";
      }
    });
    return updated;
  };

  /* ─── Persist helpers ─── */

  /**
   * Persists routineData (definitions) and weekStatus to Firestore.
   * Also records the week's completion snapshot into
   * routineWeeklyHistory so Summary's last-7-days query stays accurate.
   *
   * @param {object} routineDef   - activity definitions
   * @param {object} statusMap    - current week status map
   * @param {boolean} saveRoutineDef - whether to re-save the definitions (only needed on add/delete)
   */
  const persistStatus = async (routineDef, statusMap, saveRoutineDef = true) => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    // Build the merged "routine" object that Summary.jsx reads.
    // We inject the current-week status back so Summary's buildRoutine7Days
    // still works exactly as before (it reads routine[key].status).
    const routineWithStatus = {};
    Object.entries(routineDef).forEach(([k, v]) => {
      routineWithStatus[k] = { ...v, status: statusMap[k] || "pending" };
    });

    const payload = {
      // Keep the merged routine so the Summary page works without any changes
      routine: routineWithStatus,
      // Store statuses separately, keyed by week, for proper weekly resets
      [`routineStatus.${weekStart}`]: statusMap,
    };

    if (saveRoutineDef) {
      // Also save clean definitions (without status) for future loads
      payload.routineDefinitions = routineDef;
    }

    await setDoc(doc(db, "users", uid), payload, { merge: true });
  };

  /* ─── Add activity ─── */
  const saveRoutine = async () => {
    if (!activity.trim()) { alert("Please enter an activity"); return; }
    setSaving(true);
    try {
      if (!auth.currentUser) { alert("Please log in again"); setSaving(false); return; }
      const key = `${day}-${timeSlot}`;
      const newDef = { day, time: timeSlot, activity };
      const updatedRoutine = { ...routineData, [key]: newDef };

      // New activity starts as pending (or not-done if slot already passed)
      const initialStatus = isSlotPassed(day, timeSlot) ? "not-done" : "pending";
      const updatedStatus = { ...weekStatus, [key]: initialStatus };

      setRoutineData(updatedRoutine);
      setWeekStatus(updatedStatus);
      await persistStatus(updatedRoutine, updatedStatus, true);

      setActivity("");
      setShowAddModal(false);
    } catch (error) {
      alert("Error saving: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  /* ─── Update status ─── */
  const updateStatus = async (key, status) => {
    try {
      if (!auth.currentUser) return;
      const updatedStatus = { ...weekStatus, [key]: status };
      setWeekStatus(updatedStatus);
      await persistStatus(routineData, updatedStatus, false);
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  /* ─── Delete activity ─── */
  const deleteActivity = async (key) => {
    if (!window.confirm("Delete this activity?")) return;
    try {
      if (!auth.currentUser) return;
      const updatedRoutine = { ...routineData };
      delete updatedRoutine[key];
      const updatedStatus = { ...weekStatus };
      delete updatedStatus[key];

      setRoutineData(updatedRoutine);
      setWeekStatus(updatedStatus);
      await persistStatus(updatedRoutine, updatedStatus, true);
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  /* ─── Derived helpers ─── */

  // Returns merged item for table/list rendering
  const getCellData = (d, t) => {
    const key = `${d}-${t}`;
    const def = routineData[key];
    if (!def) return null;
    return { ...def, status: weekStatus[key] || "pending", key };
  };

  const todayName = getTodayName();
  const todayItems = Object.keys(routineData)
    .filter((k) => k.startsWith(todayName))
    .map((k) => ({ key: k, ...routineData[k], status: weekStatus[k] || "pending" }))
    .sort((a, b) => a.time.localeCompare(b.time));

  const doneCount = todayItems.filter((i) => i.status === "done").length;
  const totalCount = todayItems.length;

  const handleLogout = async () => {
    const { signOut } = await import("firebase/auth");
    const { auth: a } = await import("../firebase/firebase");
    await signOut(a);
    window.location.href = "/";
  };

  if (loading) return (
    <>
      <Navbar />
      <div style={{ marginLeft: "220px", minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>⏳</div>
          <div style={{ color: "#64748b", fontSize: "16px" }}>Loading routine...</div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <style>{`
        .routine-page {
          margin-left: 220px;
          min-height: 100vh;
          background: #f8fafc;
          padding: 32px 36px;
          font-family: 'Segoe UI', system-ui, sans-serif;
          box-sizing: border-box;
        }
        @media (max-width: 768px) {
          .routine-page {
            margin-left: 0;
            padding: 72px 16px 80px;
          }
          .add-form-grid {
            grid-template-columns: 1fr 1fr !important;
          }
          .add-form-grid > div:last-child {
            grid-column: 1 / -1;
          }
          .view-toggle { width: 100%; }
          .progress-banner { flex-direction: column !important; gap: 12px !important; }
        }
        @media (max-width: 480px) {
          .add-form-grid {
            grid-template-columns: 1fr !important;
          }
        }

        .toggle-wrap {
          display: inline-flex;
          background: #fff;
          border-radius: 12px;
          border: 1.5px solid #e2e8f0;
          padding: 4px;
          gap: 4px;
        }
        .toggle-btn {
          padding: 8px 18px;
          border-radius: 9px;
          border: none;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: 'Segoe UI', system-ui, sans-serif;
        }
        .toggle-btn.active {
          background: linear-gradient(135deg, #1d4ed8, #2563eb);
          color: #fff;
          box-shadow: 0 4px 12px rgba(29,78,216,0.3);
        }
        .toggle-btn.inactive {
          background: transparent;
          color: #64748b;
        }
        .toggle-btn.inactive:hover { background: #f1f5f9; color: #0f172a; }

        .progress-banner {
          background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%);
          border-radius: 18px;
          padding: 28px 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          position: relative;
          overflow: hidden;
        }
        .progress-banner::before {
          content: '';
          position: absolute;
          width: 220px; height: 220px;
          border-radius: 50%;
          background: rgba(255,255,255,0.07);
          top: -60px; right: -40px;
        }
        .progress-banner::after {
          content: '';
          position: absolute;
          width: 140px; height: 140px;
          border-radius: 50%;
          background: rgba(255,255,255,0.05);
          bottom: -50px; right: 80px;
        }

        .activity-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          border-radius: 12px;
          background: #fff;
          border: 1.5px solid #f1f5f9;
          margin-bottom: 10px;
          transition: box-shadow 0.18s ease, border-color 0.18s ease;
          cursor: default;
        }
        .activity-row:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.08);
          border-color: #e2e8f0;
        }
        .activity-row.done {
          background: #f0fdf4;
          border-color: #bbf7d0;
        }
        .activity-row.done .activity-name {
          text-decoration: line-through;
          color: #94a3b8 !important;
        }

        .check-box {
          width: 22px; height: 22px;
          border-radius: 6px;
          border: 2px solid #cbd5e1;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.18s ease;
        }
        .check-box.checked {
          background: linear-gradient(135deg, #059669, #10b981);
          border-color: #059669;
        }
        .check-box:hover { border-color: #3b82f6; }

        .add-activity-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 18px;
          background: linear-gradient(135deg, #059669, #10b981);
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.2s ease, transform 0.15s ease;
          font-family: 'Segoe UI', system-ui, sans-serif;
          box-shadow: 0 4px 12px rgba(5,150,105,0.3);
        }
        .add-activity-btn:hover { opacity: 0.9; transform: translateY(-1px); }

        .modal-overlay {
          position: fixed; inset: 0;
          background: rgba(15,23,42,0.45);
          z-index: 1000;
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
          backdrop-filter: blur(4px);
        }
        .modal-box {
          background: #fff;
          border-radius: 20px;
          padding: 28px;
          width: 100%;
          max-width: 440px;
          box-shadow: 0 24px 60px rgba(0,0,0,0.18);
          animation: modalIn 0.22s ease;
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .modal-input {
          width: 100%; box-sizing: border-box;
          padding: 10px 13px;
          border: 1.5px solid #e2e8f0;
          border-radius: 9px;
          font-size: 14px;
          color: #0f172a;
          background: #f8fafc;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          font-family: 'Segoe UI', system-ui, sans-serif;
        }
        .modal-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
          background: #fff;
        }

        .builder-table { border-collapse: collapse; width: 100%; font-size: 12px; }
        .builder-table th {
          padding: 11px 10px;
          font-weight: 700; color: #475569;
          border-bottom: 1.5px solid #e2e8f0;
          background: #f8fafc;
          white-space: nowrap;
        }
        .builder-table td {
          padding: 8px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: top;
        }
        .builder-table tr:hover td { background: #fafbff; }
        .status-pill {
          display: inline-block;
          padding: 2px 7px; border-radius: 20px;
          font-size: 10px; font-weight: 700;
        }
        .cell-action-btn {
          font-size: 10px; padding: 2px 6px; border-radius: 4px;
          border: none; cursor: pointer; font-weight: 600;
          transition: opacity 0.15s;
        }
        .cell-action-btn:hover { opacity: 0.8; }

        .progress-bar-track {
          height: 8px; border-radius: 4px;
          background: rgba(255,255,255,0.25);
          margin-top: 10px; overflow: hidden;
        }
        .progress-bar-fill {
          height: 100%; border-radius: 4px;
          background: #fff;
          transition: width 0.6s ease;
        }
      `}</style>

      <Navbar />
      <div className="routine-page">

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ fontSize: "clamp(20px, 4vw, 28px)", fontWeight: "800", color: "#0f172a", margin: 0 }}>
              {view === "daily" ? "Daily Routine" : "Routine Builder"}
            </h1>
            <p style={{ color: "#64748b", marginTop: "6px", fontSize: "14px" }}>
              {view === "daily"
                ? "Build and track your mental training routine"
                : "Schedule your full weekly training plan"
              }
            </p>
          </div>

          {/* View Toggle */}
          <div className="toggle-wrap">
            <button className={`toggle-btn ${view === "daily" ? "active" : "inactive"}`} onClick={() => setView("daily")}>
              <span>☀️</span> Daily
            </button>
            <button className={`toggle-btn ${view === "builder" ? "active" : "inactive"}`} onClick={() => setView("builder")}>
              <span>📅</span> Weekly Table
            </button>
          </div>
        </div>

        {/* ─────────────── DAILY VIEW ─────────────── */}
        {view === "daily" && (
          <>
            {/* Progress Banner */}
            <div className="progress-banner">
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                  Today's Progress · {todayName}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                  <span style={{ fontSize: "clamp(36px,6vw,52px)", fontWeight: "900", color: "#fff", lineHeight: 1 }}>
                    {doneCount}/{totalCount}
                  </span>
                  <div>
                    <div style={{ color: "#fff", fontWeight: "700", fontSize: "15px" }}>Activities completed</div>
                    <div style={{ color: "rgba(255,255,255,0.72)", fontSize: "12px" }}>
                      {totalCount === 0 ? "Add your first activity below"
                        : doneCount === totalCount ? "🎉 All done — great work!"
                        : `${totalCount - doneCount} remaining`}
                    </div>
                  </div>
                </div>
                {totalCount > 0 && (
                  <div className="progress-bar-track" style={{ width: "clamp(160px, 30vw, 260px)" }}>
                    <div className="progress-bar-fill" style={{ width: `${totalCount ? (doneCount / totalCount) * 100 : 0}%` }} />
                  </div>
                )}
              </div>
              <div style={{ position: "relative", zIndex: 1, textAlign: "right" }}>
                <div style={{ fontSize: "48px", filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.2))" }}>
                  {doneCount === totalCount && totalCount > 0 ? "🏆" : "🎯"}
                </div>
                <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "11px", marginTop: "4px" }}>
                  {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </div>
              </div>
            </div>

            {/* Activities Card */}
            <div style={{ background: "#fff", borderRadius: "18px", padding: "24px", border: "1px solid #f1f5f9", boxShadow: "0 2px 16px rgba(0,0,0,0.06)", marginBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", flexWrap: "wrap", gap: "10px" }}>
                <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", margin: 0 }}>Your Activities</h2>
                <button className="add-activity-btn" onClick={() => { setDay(todayName); setShowAddModal(true); }}>
                  <span style={{ fontSize: "16px", lineHeight: 1 }}>+</span> Add Activity
                </button>
              </div>

              {todayItems.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 16px", background: "#f8fafc", borderRadius: "14px", border: "2px dashed #e2e8f0" }}>
                  <div style={{ fontSize: "40px", marginBottom: "10px" }}>📅</div>
                  <div style={{ color: "#64748b", fontSize: "14px", fontWeight: "600" }}>No activities for {todayName}</div>
                  <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "4px" }}>Click "Add Activity" to get started</div>
                </div>
              ) : (
                todayItems.map((item) => {
                  const isDone = item.status === "done";
                  return (
                    <div key={item.key} className={`activity-row${isDone ? " done" : ""}`}>
                      {/* Checkbox */}
                      <div
                        className={`check-box${isDone ? " checked" : ""}`}
                        onClick={() => updateStatus(item.key, isDone ? "pending" : "done")}
                      >
                        {isDone && <span style={{ color: "#fff", fontSize: "13px", fontWeight: "800" }}>✓</span>}
                      </div>

                      {/* Icon */}
                      <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: isDone ? "#dcfce7" : "linear-gradient(135deg, #eff6ff, #dbeafe)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>
                        {getIcon(item.activity)}
                      </div>

                      {/* Name */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="activity-name" style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {item.activity}
                        </div>
                        {item.status === "not-done" && (
                          <span style={{ fontSize: "10px", color: "#dc2626", fontWeight: "700" }}>Missed</span>
                        )}
                      </div>

                      {/* Time */}
                      <div style={{ fontSize: "13px", fontWeight: "700", color: "#475569", flexShrink: 0 }}>{item.time}</div>

                      {/* Actions */}
                      <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                        {!isDone && (
                          <button
                            onClick={() => updateStatus(item.key, "not-done")}
                            title="Mark missed"
                            style={{ width: "28px", height: "28px", borderRadius: "7px", background: "#fee2e2", border: "none", cursor: "pointer", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}
                            onMouseOver={(e) => e.currentTarget.style.background = "#fecaca"}
                            onMouseOut={(e) => e.currentTarget.style.background = "#fee2e2"}
                          >✗</button>
                        )}
                        <button
                          onClick={() => deleteActivity(item.key)}
                          title="Delete"
                          style={{ width: "28px", height: "28px", borderRadius: "7px", background: "#f1f5f9", border: "none", cursor: "pointer", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}
                          onMouseOver={(e) => e.currentTarget.style.background = "#fee2e2"}
                          onMouseOut={(e) => e.currentTarget.style.background = "#f1f5f9"}
                        >🗑</button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Day selector quick strip */}
            <div style={{ background: "#fff", borderRadius: "14px", padding: "16px 20px", border: "1px solid #f1f5f9", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", marginBottom: "24px" }}>
              <div style={{ fontSize: "12px", fontWeight: "600", color: "#94a3b8", marginBottom: "10px" }}>OTHER DAYS</div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {DAYS.map((d) => {
                  const keys = Object.keys(routineData).filter((k) => k.startsWith(d));
                  const count = keys.length;
                  const doneC = keys.filter((k) => weekStatus[k] === "done").length;
                  const isToday = d === todayName;
                  return (
                    <div key={d} style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
                      padding: "8px 12px", borderRadius: "10px", cursor: "default",
                      background: isToday ? "#eff6ff" : "#f8fafc",
                      border: isToday ? "1.5px solid #bfdbfe" : "1.5px solid #f1f5f9",
                      minWidth: "56px"
                    }}>
                      <span style={{ fontSize: "11px", fontWeight: "700", color: isToday ? "#1d4ed8" : "#64748b" }}>{d.slice(0, 3)}</span>
                      <span style={{ fontSize: "10px", color: "#94a3b8" }}>{count > 0 ? `${doneC}/${count}` : "—"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ─────────────── BUILDER / TABLE VIEW ─────────────── */}
        {view === "builder" && (
          <>
            {/* Add form */}
            <div style={{ background: "#fff", borderRadius: "16px", padding: "22px 24px", border: "1px solid #e2e8f0", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", marginBottom: "14px" }}>Add New Activity</h2>
              <div className="add-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr auto", gap: "12px", alignItems: "end" }}>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: "600", color: "#64748b", display: "block", marginBottom: "5px" }}>Day</label>
                  <select style={{ width: "100%", padding: "9px 11px", borderRadius: "8px", border: "1.5px solid #e2e8f0", fontSize: "13px", color: "#0f172a", background: "#f8fafc", outline: "none", fontFamily: "'Segoe UI', system-ui, sans-serif" }} value={day} onChange={(e) => setDay(e.target.value)}>
                    {DAYS.map((d) => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: "600", color: "#64748b", display: "block", marginBottom: "5px" }}>Time</label>
                  <select style={{ width: "100%", padding: "9px 11px", borderRadius: "8px", border: "1.5px solid #e2e8f0", fontSize: "13px", color: "#0f172a", background: "#f8fafc", outline: "none", fontFamily: "'Segoe UI', system-ui, sans-serif" }} value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)}>
                    {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: "600", color: "#64748b", display: "block", marginBottom: "5px" }}>Activity</label>
                  <input
                    style={{ width: "100%", padding: "9px 11px", borderRadius: "8px", border: "1.5px solid #e2e8f0", fontSize: "13px", color: "#0f172a", background: "#f8fafc", outline: "none", boxSizing: "border-box", fontFamily: "'Segoe UI', system-ui, sans-serif" }}
                    placeholder="e.g. Morning Meditation"
                    value={activity}
                    onChange={(e) => setActivity(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveRoutine(); }}
                  />
                </div>
                <button
                  onClick={saveRoutine}
                  disabled={saving}
                  style={{ padding: "9px 22px", borderRadius: "8px", background: saving ? "#94a3b8" : "linear-gradient(135deg, #1d4ed8, #3b82f6)", color: "#fff", border: "none", fontSize: "13px", fontWeight: "700", cursor: saving ? "not-allowed" : "pointer", whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(29,78,216,0.25)", fontFamily: "'Segoe UI', system-ui, sans-serif" }}
                >
                  {saving ? "Saving..." : "Add"}
                </button>
              </div>
            </div>

            {/* Table */}
            <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", overflow: "hidden", marginBottom: "32px" }}>
              <div style={{ overflowX: "auto" }}>
                <table className="builder-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "14px 16px", position: "sticky", left: 0, background: "#f8fafc", zIndex: 10 }}>Day / Time</th>
                      {TIME_SLOTS.map((t) => <th key={t} style={{ minWidth: "118px", textAlign: "center" }}>{t}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS.map((d, di) => {
                      const isToday = d === todayName;
                      const rowBg = isToday ? "#fafbff" : di % 2 === 0 ? "#fff" : "#fafafa";
                      return (
                        <tr key={d}>
                          <td style={{ padding: "12px 16px", fontWeight: "700", color: isToday ? "#1d4ed8" : "#0f172a", borderBottom: "1px solid #f1f5f9", position: "sticky", left: 0, background: rowBg, zIndex: 5, whiteSpace: "nowrap" }}>
                            {d} {isToday && <span style={{ fontSize: "10px", background: "#eff6ff", color: "#3b82f6", borderRadius: "6px", padding: "1px 6px", marginLeft: "6px" }}>Today</span>}
                          </td>
                          {TIME_SLOTS.map((time) => {
                            const cellData = getCellData(d, time);
                            const key = `${d}-${time}`;
                            const cellBg = cellData?.status === "done" ? "#f0fdf4" : cellData?.status === "not-done" ? "#fef2f2" : rowBg;
                            return (
                              <td key={time} style={{ padding: "7px", borderBottom: "1px solid #f1f5f9", background: cellBg }}>
                                {cellData ? (
                                  <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                      <span style={{ fontSize: "13px" }}>{getIcon(cellData.activity)}</span>
                                      <span style={{ fontSize: "11px", fontWeight: "600", color: "#0f172a", lineHeight: "1.3", wordBreak: "break-word" }}>{cellData.activity}</span>
                                    </div>
                                    <span className="status-pill" style={{
                                      background: cellData.status === "done" ? "#dcfce7" : cellData.status === "not-done" ? "#fee2e2" : "#eff6ff",
                                      color: cellData.status === "done" ? "#16a34a" : cellData.status === "not-done" ? "#dc2626" : "#3b82f6"
                                    }}>
                                      {cellData.status === "done" ? "Done" : cellData.status === "not-done" ? "Missed" : "Pending"}
                                    </span>
                                    <div style={{ display: "flex", gap: "3px" }}>
                                      <button className="cell-action-btn" onClick={() => updateStatus(key, "done")} style={{ background: "#16a34a", color: "#fff" }}>✓</button>
                                      <button className="cell-action-btn" onClick={() => updateStatus(key, "not-done")} style={{ background: "#dc2626", color: "#fff" }}>✗</button>
                                      <button className="cell-action-btn" onClick={() => deleteActivity(key)} style={{ background: "#64748b", color: "#fff" }}>🗑</button>
                                    </div>
                                  </div>
                                ) : (
                                  <span style={{ color: "#e2e8f0", fontSize: "12px" }}>—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        <Footer userName={userName} onLogout={handleLogout} />
      </div>

      {/* Add Activity Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}>
          <div className="modal-box">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "17px", fontWeight: "800", color: "#0f172a", margin: 0 }}>Add Activity</h2>
              <button onClick={() => setShowAddModal(false)} style={{ width: "30px", height: "30px", borderRadius: "8px", border: "none", background: "#f1f5f9", cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", display: "block", marginBottom: "5px" }}>Day</label>
                <select className="modal-input" value={day} onChange={(e) => setDay(e.target.value)}>
                  {DAYS.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", display: "block", marginBottom: "5px" }}>Time</label>
                <select className="modal-input" value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)}>
                  {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", display: "block", marginBottom: "5px" }}>Activity Name</label>
                <input
                  className="modal-input"
                  placeholder="e.g. Morning Meditation"
                  value={activity}
                  onChange={(e) => setActivity(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveRoutine(); }}
                  autoFocus
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "22px" }}>
              <button onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: "11px", borderRadius: "10px", border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
                Cancel
              </button>
              <button onClick={saveRoutine} disabled={saving} style={{ flex: 1, padding: "11px", borderRadius: "10px", border: "none", background: saving ? "#94a3b8" : "linear-gradient(135deg, #059669, #10b981)", color: "#fff", fontSize: "14px", fontWeight: "700", cursor: saving ? "not-allowed" : "pointer", boxShadow: "0 4px 12px rgba(5,150,105,0.28)", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
                {saving ? "Saving..." : "Save Activity"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}