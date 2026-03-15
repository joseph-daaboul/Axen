import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { auth, db } from "../firebase/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

const QUOTES = [
  { text: "The mind is the athlete. The body is simply the means it uses.", author: "Sports Psychology Principle" },
  { text: "I am prepared, confident and ready to perform.", author: "Athlete's Mantra" },
  { text: "Champions aren't made in gyms. Champions are made from something inside them.", author: "Muhammad Ali" },
  { text: "Mental toughness is doing the right thing for the team when it's not the best thing for you.", author: "Bill Belichick" },
];

const STATUS_CONFIG = {
  "In Progress": { bg: "#fef9c3", color: "#ca8a04", dot: "#eab308" },
  "Completed":   { bg: "#dcfce7", color: "#16a34a", dot: "#22c55e" },
  "Not Started": { bg: "#f1f5f9", color: "#64748b", dot: "#94a3b8" },
  "On Hold":     { bg: "#fee2e2", color: "#dc2626", dot: "#ef4444" },
};

export default function Motivation() {
  const [savedData, setSavedData] = useState({ goals: [], strengths: [] });
  const [goalEntries, setGoalEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingEntry, setSavingEntry] = useState(false);
  const [userName, setUserName] = useState("Athlete");
  const [quoteIdx] = useState(() => Math.floor(Math.random() * QUOTES.length));

  const [showStrengthModal, setShowStrengthModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newStrength, setNewStrength] = useState("");
  const [newGoal, setNewGoal] = useState("");
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [entryForm, setEntryForm] = useState({ goal: "", strength: "", status: "In Progress", dueDate: "", notes: "" });

  useEffect(() => { loadMotivation(); }, []);

  const loadMotivation = async () => {
    try {
      if (!auth.currentUser) { setLoading(false); return; }
      const emailName = auth.currentUser.email?.split("@")[0] || "Athlete";
      setUserName(emailName.charAt(0).toUpperCase() + emailName.slice(1));
      const docSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.motivation) setSavedData(data.motivation);
        if (data.goalEntries) setGoalEntries(data.goalEntries);
      }
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  // Returns true if ANY entry for this goal text has status "Completed"
  const isGoalCompleted = (goalText) =>
    goalEntries.some((e) => e.goal === goalText && e.status === "Completed");

  // ── Add Strength ──
  const addStrength = async () => {
    if (!newStrength.trim()) return;
    setSaving(true);
    try {
      const updated = { ...savedData, strengths: [...(savedData.strengths || []), newStrength.trim()] };
      await setDoc(doc(db, "users", auth.currentUser.uid), { motivation: updated }, { merge: true });
      setSavedData(updated);
      setNewStrength("");
      setShowStrengthModal(false);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  // ── Add Goal: saves to goals list AND auto-creates a Keep Notes entry ──
  const addGoal = async () => {
    if (!newGoal.trim()) return;
    setSaving(true);
    try {
      const goalText = newGoal.trim();
      const updatedMotivation = { ...savedData, goals: [...(savedData.goals || []), goalText] };
      const autoEntry = {
        id: Date.now().toString(),
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        goal: goalText,
        strength: "",
        status: "In Progress",
        dueDate: "",
        notes: "",
      };
      const updatedEntries = [autoEntry, ...goalEntries];
      // Single atomic write for both
      await setDoc(
        doc(db, "users", auth.currentUser.uid),
        { motivation: updatedMotivation, goalEntries: updatedEntries },
        { merge: true }
      );
      setSavedData(updatedMotivation);
      setGoalEntries(updatedEntries);
      setNewGoal("");
      setShowGoalModal(false);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  // ── Delete strength / goal chip ──
  const deleteItem = async (type, index) => {
    if (type === "strength") {
      const strengthText = (savedData.strengths || [])[index];
      const usedInNotes = goalEntries.some((e) => e.strength === strengthText);
      if (usedInNotes) {
        alert(`"${strengthText}" is used in Keep Notes and cannot be deleted. Remove it from the table entries first.`);
        return;
      }
    }
    const newD = { ...savedData };
    if (type === "strength") {
      newD.strengths = newD.strengths.filter((_, i) => i !== index);
    } else {
      newD.goals = newD.goals.filter((_, i) => i !== index);
    }
    await setDoc(doc(db, "users", auth.currentUser.uid), { motivation: newD }, { merge: true });
    setSavedData(newD);
  };

  // ── Goal entries (Keep Notes table) ──
  const openNewEntry = () => {
    setEditingEntry(null);
    setEntryForm({ goal: savedData.goals?.[0] || "", strength: "", status: "In Progress", dueDate: "", notes: "" });
    setShowEntryModal(true);
  };
  const openEditEntry = (entry) => {
    setEditingEntry(entry.id);
    setEntryForm({ goal: entry.goal, strength: entry.strength || "", status: entry.status, dueDate: entry.dueDate || "", notes: entry.notes || "" });
    setShowEntryModal(true);
  };
  const saveEntry = async () => {
    if (!entryForm.goal.trim()) { alert("Please enter a goal"); return; }
    setSavingEntry(true);
    try {
      // If a strength was typed and it's not already in the list, auto-add it
      const typedStrength = entryForm.strength.trim();
      const existingStrengths = savedData.strengths || [];
      const isNewStrength = typedStrength && !existingStrengths.includes(typedStrength);
      const updatedStrengths = isNewStrength ? [...existingStrengths, typedStrength] : existingStrengths;
      const updatedMotivation = isNewStrength
        ? { ...savedData, strengths: updatedStrengths }
        : savedData;

      let updatedEntries;
      if (editingEntry) {
        updatedEntries = goalEntries.map((e) => e.id === editingEntry ? { ...e, ...entryForm } : e);
      } else {
        const newEntry = {
          id: Date.now().toString(),
          date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          ...entryForm,
        };
        updatedEntries = [newEntry, ...goalEntries];
      }

      // Single write covering both goalEntries and (if needed) updated strengths list
      await setDoc(
        doc(db, "users", auth.currentUser.uid),
        { goalEntries: updatedEntries, ...(isNewStrength ? { motivation: updatedMotivation } : {}) },
        { merge: true }
      );
      setGoalEntries(updatedEntries);
      if (isNewStrength) setSavedData(updatedMotivation);
      setShowEntryModal(false);
    } catch (e) { alert(e.message); }
    finally { setSavingEntry(false); }
  };
  const deleteEntry = async (id) => {
    if (!window.confirm("Delete this entry?")) return;
    const updated = goalEntries.filter((e) => e.id !== id);
    await setDoc(doc(db, "users", auth.currentUser.uid), { goalEntries: updated }, { merge: true });
    setGoalEntries(updated);
  };

  // Cycle status; goal chip re-renders automatically via isGoalCompleted()
  const cycleStatus = async (entry) => {
    const statuses = Object.keys(STATUS_CONFIG);
    const next = statuses[(statuses.indexOf(entry.status) + 1) % statuses.length];
    const updated = goalEntries.map((e) => e.id === entry.id ? { ...e, status: next } : e);
    await setDoc(doc(db, "users", auth.currentUser.uid), { goalEntries: updated }, { merge: true });
    setGoalEntries(updated);
  };

  const handleLogout = async () => {
    const { signOut } = await import("firebase/auth");
    const { auth: a } = await import("../firebase/firebase");
    await signOut(a);
    window.location.href = "/";
  };

  const quote = QUOTES[quoteIdx];

  if (loading) return (
    <>
      <Navbar />
      <div style={{ marginLeft: "220px", minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}><div style={{ fontSize: "36px", marginBottom: "12px" }}>⏳</div><div style={{ color: "#64748b" }}>Loading...</div></div>
      </div>
    </>
  );

  return (
    <>
      <style>{`
        .mot-page {
          margin-left: 220px;
          min-height: 100vh;
          background: #f8fafc;
          padding: 32px 36px;
          font-family: 'Segoe UI', system-ui, sans-serif;
          box-sizing: border-box;
        }
        @media (max-width: 768px) {
          .mot-page { margin-left: 0; padding: 72px 16px 80px; }
          .mot-two-col { grid-template-columns: 1fr !important; }
        }
        .section-card {
          background: #fff;
          border-radius: 18px;
          padding: 24px;
          border: 1px solid #f1f5f9;
          box-shadow: 0 2px 14px rgba(0,0,0,0.06);
        }
        .section-header {
          display: flex; align-items: center;
          justify-content: space-between;
          margin-bottom: 18px;
        }
        .section-icon {
          width: 40px; height: 40px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; flex-shrink: 0;
        }
        .item-chip {
          display: flex; align-items: center; gap: 10px;
          padding: 11px 16px; border-radius: 12px;
          margin-bottom: 8px; font-size: 14px; font-weight: 500;
          color: #1e293b; position: relative;
          transition: background 0.15s;
        }
        .item-chip:hover .chip-del { opacity: 1; }
        .chip-del {
          opacity: 0; background: none; border: none;
          color: #ef4444; cursor: pointer; font-size: 14px;
          padding: 0 4px; transition: opacity 0.15s;
          margin-left: auto; flex-shrink: 0;
        }
        .completed-badge {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 2px 8px; border-radius: 20px;
          background: #dcfce7; color: #16a34a;
          font-size: 10px; font-weight: 700; flex-shrink: 0;
        }
        .add-circle-btn {
          width: 34px; height: 34px; border-radius: 50%;
          border: none; color: #fff; font-size: 20px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; line-height: 1; flex-shrink: 0;
          transition: opacity 0.18s, transform 0.15s;
        }
        .add-circle-btn:hover { opacity: 0.85; transform: scale(1.08); }
        .quote-banner {
          background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 60%, #6366f1 100%);
          border-radius: 18px; padding: 32px 36px;
          text-align: center; margin-bottom: 28px;
          position: relative; overflow: hidden;
        }
        .quote-banner::before {
          content: ''; position: absolute;
          width: 200px; height: 200px; border-radius: 50%;
          background: rgba(255,255,255,0.06); top: -60px; right: -40px;
        }
        .quote-banner::after {
          content: ''; position: absolute;
          width: 130px; height: 130px; border-radius: 50%;
          background: rgba(255,255,255,0.04); bottom: -40px; left: 60px;
        }
        /* Modal */
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(15,23,42,0.45);
          z-index: 1000; display: flex; align-items: center;
          justify-content: center; padding: 16px; backdrop-filter: blur(4px);
        }
        .modal-box {
          background: #fff; border-radius: 20px; padding: 28px;
          width: 100%; max-width: 460px;
          box-shadow: 0 24px 60px rgba(0,0,0,0.16);
          animation: modalIn 0.2s ease;
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .modal-input {
          width: 100%; box-sizing: border-box; padding: 10px 13px;
          border: 1.5px solid #e2e8f0; border-radius: 9px;
          font-size: 14px; color: #0f172a; background: #f8fafc; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          font-family: 'Segoe UI', system-ui, sans-serif;
        }
        .modal-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.12); background: #fff; }
        textarea.modal-input { resize: vertical; min-height: 80px; }
        /* Table */
        .goal-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .goal-table th {
          padding: 11px 14px; text-align: left; font-weight: 700;
          color: #64748b; font-size: 11px; text-transform: uppercase;
          letter-spacing: 0.05em; border-bottom: 1.5px solid #f1f5f9;
          background: #f8fafc; white-space: nowrap;
        }
        .goal-table td { padding: 12px 14px; border-bottom: 1px solid #f8fafc; vertical-align: middle; }
        .goal-table tr:hover td { background: #fafbff; }
        .status-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 10px; border-radius: 20px;
          font-size: 11px; font-weight: 700; cursor: pointer;
          transition: opacity 0.15s; white-space: nowrap; border: none;
          font-family: 'Segoe UI', system-ui, sans-serif;
        }
        .status-badge:hover { opacity: 0.8; }
        .tbl-btn {
          width: 28px; height: 28px; border-radius: 7px; border: none;
          cursor: pointer; font-size: 13px;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s;
        }
        @media (max-width: 600px) {
          .goal-table th:nth-child(3), .goal-table td:nth-child(3),
          .goal-table th:nth-child(4), .goal-table td:nth-child(4) { display: none; }
        }
      `}</style>

      <Navbar />
      <div className="mot-page">

        {/* Header */}
        <div style={{ marginBottom: "26px" }}>
          <h1 style={{ fontSize: "clamp(20px,4vw,28px)", fontWeight: "800", color: "#0f172a", margin: 0 }}>Motivation Center</h1>
          <p style={{ color: "#64748b", marginTop: "6px", fontSize: "14px" }}>Track your strengths and goals to stay motivated</p>
        </div>

        {/* Strengths + Goals */}
        <div className="mot-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>

          {/* Strengths */}
          <div className="section-card">
            <div className="section-header">
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div className="section-icon" style={{ background: "linear-gradient(135deg, #059669, #10b981)" }}>⚡</div>
                <span style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>Your Strengths</span>
              </div>
              <button className="add-circle-btn" style={{ background: "linear-gradient(135deg, #059669, #10b981)" }}
                onClick={() => { setNewStrength(""); setShowStrengthModal(true); }}>+</button>
            </div>
            {(savedData.strengths || []).length === 0 ? (
              <div style={{ textAlign: "center", padding: "28px 12px", background: "#f8fafc", borderRadius: "12px", border: "2px dashed #e2e8f0" }}>
                <div style={{ fontSize: "28px", marginBottom: "8px" }}>💪</div>
                <div style={{ fontSize: "13px", color: "#94a3b8" }}>No strengths added yet</div>
              </div>
            ) : (
              (savedData.strengths || []).map((s, i) => (
                <div key={i} className="item-chip" style={{ background: "#f0fdf4" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e", flexShrink: 0, display: "inline-block" }} />
                  <span style={{ flex: 1 }}>{s}</span>
                  <button className="chip-del" onClick={() => deleteItem("strength", i)}>✕</button>
                </div>
              ))
            )}
          </div>

          {/* Goals — completed ones show strikethrough + ✓ Done badge */}
          <div className="section-card">
            <div className="section-header">
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div className="section-icon" style={{ background: "linear-gradient(135deg, #ea580c, #f97316)" }}>🎯</div>
                <span style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>Your Goals</span>
              </div>
              <button className="add-circle-btn" style={{ background: "linear-gradient(135deg, #ea580c, #f97316)" }}
                onClick={() => { setNewGoal(""); setShowGoalModal(true); }}>+</button>
            </div>
            {(savedData.goals || []).length === 0 ? (
              <div style={{ textAlign: "center", padding: "28px 12px", background: "#f8fafc", borderRadius: "12px", border: "2px dashed #e2e8f0" }}>
                <div style={{ fontSize: "28px", marginBottom: "8px" }}>🎯</div>
                <div style={{ fontSize: "13px", color: "#94a3b8" }}>No goals added yet</div>
              </div>
            ) : (
              (savedData.goals || []).map((g, i) => {
                const completed = isGoalCompleted(g);
                return (
                  <div key={i} className="item-chip"
                    style={{ background: completed ? "#f0fdf4" : "#fff7ed", opacity: completed ? 0.85 : 1 }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: completed ? "#22c55e" : "#f97316", flexShrink: 0, display: "inline-block" }} />
                    <span style={{
                      flex: 1,
                      textDecoration: completed ? "line-through" : "none",
                      color: completed ? "#94a3b8" : "#1e293b",
                    }}>{g}</span>
                    {completed && <span className="completed-badge">✓ Done</span>}
                    <button className="chip-del" onClick={() => deleteItem("goal", i)}>✕</button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quote banner */}
        <div className="quote-banner">
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: "32px", marginBottom: "10px", opacity: 0.6 }}>"</div>
            <p style={{ color: "#fff", fontSize: "clamp(15px,2.5vw,19px)", fontWeight: "700", fontStyle: "italic", margin: "0 0 10px", lineHeight: 1.5 }}>{quote.text}</p>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "13px", margin: 0 }}>— {quote.author}</p>
          </div>
        </div>

        {/* Keep Notes Table */}
        <div className="section-card" style={{ marginBottom: "32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", margin: 0 }}>Keep Notes</h2>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "3px" }}>Goals auto-appear here · click status to cycle · edit to add details</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "11px", color: "#94a3b8" }}>{new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
              <button onClick={openNewEntry} style={{ display: "flex", alignItems: "center", gap: "7px", padding: "8px 16px", background: "linear-gradient(135deg, #1d4ed8, #3b82f6)", color: "#fff", border: "none", borderRadius: "9px", fontSize: "13px", fontWeight: "700", cursor: "pointer", boxShadow: "0 4px 12px rgba(29,78,216,0.25)", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
                <span style={{ fontSize: "15px" }}>+</span> Add Entry
              </button>
            </div>
          </div>

          {goalEntries.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 16px", background: "#f8fafc", borderRadius: "14px", border: "2px dashed #e2e8f0" }}>
              <div style={{ fontSize: "36px", marginBottom: "10px" }}>📋</div>
              <div style={{ color: "#64748b", fontSize: "14px", fontWeight: "600" }}>No entries yet</div>
              <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "4px" }}>Add a goal above — it will automatically appear here</div>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="goal-table">
                <thead>
                  <tr>
                    <th style={{ width: "100px" }}>Date</th>
                    <th>Goal</th>
                    <th>Strength Applied</th>
                    <th style={{ width: "120px" }}>Due Date</th>
                    <th style={{ width: "130px" }}>Status</th>
                    <th>Notes</th>
                    <th style={{ width: "70px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {goalEntries.map((entry) => {
                    const sc = STATUS_CONFIG[entry.status] || STATUS_CONFIG["Not Started"];
                    const isCompleted = entry.status === "Completed";
                    return (
                      <tr key={entry.id}>
                        <td style={{ color: "#64748b", fontSize: "12px", whiteSpace: "nowrap" }}>{entry.date}</td>
                        <td style={{ maxWidth: "180px" }}>
                          <span style={{ fontWeight: "600", color: isCompleted ? "#94a3b8" : "#0f172a", textDecoration: isCompleted ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                            {entry.goal}
                          </span>
                        </td>
                        <td style={{ color: "#475569", maxWidth: "140px" }}>
                          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {entry.strength || <span style={{ color: "#cbd5e1" }}>—</span>}
                          </div>
                        </td>
                        <td style={{ color: "#64748b", fontSize: "12px", whiteSpace: "nowrap" }}>
                          {entry.dueDate || <span style={{ color: "#cbd5e1" }}>—</span>}
                        </td>
                        <td>
                          <button className="status-badge" onClick={() => cycleStatus(entry)}
                            style={{ background: sc.bg, color: sc.color }} title="Click to cycle status">
                            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: sc.dot, flexShrink: 0 }} />
                            {entry.status}
                          </button>
                        </td>
                        <td style={{ color: "#475569", maxWidth: "200px" }}>
                          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {entry.notes || <span style={{ color: "#cbd5e1" }}>—</span>}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "5px" }}>
                            <button className="tbl-btn" onClick={() => openEditEntry(entry)}
                              style={{ background: "#eff6ff" }}
                              onMouseOver={(e) => e.currentTarget.style.background = "#dbeafe"}
                              onMouseOut={(e) => e.currentTarget.style.background = "#eff6ff"}
                              title="Edit">✏️</button>
                            <button className="tbl-btn" onClick={() => deleteEntry(entry.id)}
                              style={{ background: "#f1f5f9" }}
                              onMouseOver={(e) => e.currentTarget.style.background = "#fee2e2"}
                              onMouseOut={(e) => e.currentTarget.style.background = "#f1f5f9"}
                              title="Delete">🗑</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Footer userName={userName} onLogout={handleLogout} />
      </div>

      {/* ── Add Strength Modal ── */}
      {showStrengthModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowStrengthModal(false); }}>
          <div className="modal-box" style={{ maxWidth: "380px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a", margin: 0 }}>Add Strength</h2>
              <button onClick={() => setShowStrengthModal(false)} style={{ width: "28px", height: "28px", borderRadius: "7px", border: "none", background: "#f1f5f9", cursor: "pointer", fontSize: "16px" }}>×</button>
            </div>
            <input className="modal-input" placeholder="e.g. Strong mental resilience" value={newStrength}
              onChange={(e) => setNewStrength(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addStrength(); }} autoFocus />
            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button onClick={() => setShowStrengthModal(false)} style={{ flex: 1, padding: "10px", borderRadius: "9px", border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: "13px", fontWeight: "600", cursor: "pointer", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>Cancel</button>
              <button onClick={addStrength} disabled={saving} style={{ flex: 1, padding: "10px", borderRadius: "9px", border: "none", background: "linear-gradient(135deg, #059669, #10b981)", color: "#fff", fontSize: "13px", fontWeight: "700", cursor: "pointer", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>Add</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Goal Modal ── */}
      {showGoalModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowGoalModal(false); }}>
          <div className="modal-box" style={{ maxWidth: "380px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a", margin: 0 }}>Add Goal</h2>
              <button onClick={() => setShowGoalModal(false)} style={{ width: "28px", height: "28px", borderRadius: "7px", border: "none", background: "#f1f5f9", cursor: "pointer", fontSize: "16px" }}>×</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#eff6ff", borderRadius: "8px", padding: "7px 10px", marginBottom: "14px" }}>
              <span style={{ fontSize: "13px" }}>💡</span>
              <span style={{ fontSize: "11px", color: "#3b82f6", fontWeight: "600" }}>This goal will automatically appear in Keep Notes</span>
            </div>
            <input className="modal-input" placeholder="e.g. Win the championship" value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addGoal(); }} autoFocus />
            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button onClick={() => setShowGoalModal(false)} style={{ flex: 1, padding: "10px", borderRadius: "9px", border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: "13px", fontWeight: "600", cursor: "pointer", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>Cancel</button>
              <button onClick={addGoal} disabled={saving} style={{ flex: 1, padding: "10px", borderRadius: "9px", border: "none", background: "linear-gradient(135deg, #ea580c, #f97316)", color: "#fff", fontSize: "13px", fontWeight: "700", cursor: saving ? "not-allowed" : "pointer", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
                {saving ? "Saving..." : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Entry Modal ── */}
      {showEntryModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowEntryModal(false); }}>
          <div className="modal-box">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "17px", fontWeight: "800", color: "#0f172a", margin: 0 }}>{editingEntry ? "Edit Entry" : "New Entry"}</h2>
              <button onClick={() => setShowEntryModal(false)} style={{ width: "30px", height: "30px", borderRadius: "8px", border: "none", background: "#f1f5f9", cursor: "pointer", fontSize: "16px" }}>×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "13px" }}>
              <div>
                <label style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", display: "block", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Goal *</label>
                {savedData.goals?.length > 0 ? (
                  <select className="modal-input" value={entryForm.goal} onChange={(e) => setEntryForm({ ...entryForm, goal: e.target.value })}>
                    <option value="">Select a goal...</option>
                    {savedData.goals.map((g, i) => <option key={i} value={g}>{g}</option>)}
                    <option value="__custom__">Enter custom goal...</option>
                  </select>
                ) : null}
                {(savedData.goals?.length === 0 || entryForm.goal === "__custom__") && (
                  <input className="modal-input" style={{ marginTop: savedData.goals?.length > 0 ? "6px" : "0" }}
                    placeholder="Type your goal..."
                    value={entryForm.goal === "__custom__" ? "" : entryForm.goal}
                    onChange={(e) => setEntryForm({ ...entryForm, goal: e.target.value })} autoFocus />
                )}
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", display: "block", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Strength Applied</label>
                {savedData.strengths?.length > 0 ? (
                  <select className="modal-input" value={entryForm.strength} onChange={(e) => setEntryForm({ ...entryForm, strength: e.target.value })}>
                    <option value="">Select a strength...</option>
                    {savedData.strengths.map((s, i) => <option key={i} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <input className="modal-input" placeholder="e.g. Determination" value={entryForm.strength}
                    onChange={(e) => setEntryForm({ ...entryForm, strength: e.target.value })} />
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", display: "block", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</label>
                  <select className="modal-input" value={entryForm.status} onChange={(e) => setEntryForm({ ...entryForm, status: e.target.value })}>
                    {Object.keys(STATUS_CONFIG).map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", display: "block", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Due Date</label>
                  <input className="modal-input" type="date" value={entryForm.dueDate}
                    onChange={(e) => setEntryForm({ ...entryForm, dueDate: e.target.value })} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", display: "block", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Notes</label>
                <textarea className="modal-input" placeholder="How did the session go? What did you notice?"
                  value={entryForm.notes} onChange={(e) => setEntryForm({ ...entryForm, notes: e.target.value })} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "22px" }}>
              <button onClick={() => setShowEntryModal(false)} style={{ flex: 1, padding: "11px", borderRadius: "10px", border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>Cancel</button>
              <button onClick={saveEntry} disabled={savingEntry} style={{ flex: 2, padding: "11px", borderRadius: "10px", border: "none", background: savingEntry ? "#94a3b8" : "linear-gradient(135deg, #1d4ed8, #3b82f6)", color: "#fff", fontSize: "14px", fontWeight: "700", cursor: savingEntry ? "not-allowed" : "pointer", boxShadow: "0 4px 12px rgba(29,78,216,0.25)", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
                {savingEntry ? "Saving..." : editingEntry ? "Update Entry" : "Save Entry"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}