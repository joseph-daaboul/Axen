import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { auth, db } from "../firebase/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

/*
  ─────────────────────────────────────────────────────
  FEEDBACK GUIDE
  ─────────────────────────────────────────────────────
  WHERE FEEDBACK IS STORED:
    Firestore collection: "feedback"
    Each document has:
      - uid:        user's Firebase Auth UID
      - email:      user's email
      - category:   "Bug Report" | "Feature Request" | "General" | "Performance"
      - rating:     1–5 star rating
      - message:    the feedback text
      - createdAt:  Firestore server timestamp

  HOW TO ACCESS FEEDBACK (as admin):
    1. Go to Firebase Console → Firestore Database
    2. Open the "feedback" collection
    3. All submissions appear there in real time

  HOW TO SET UP EMAIL NOTIFICATIONS (optional):
    Use Firebase Extensions → "Trigger Email" extension.
    Point it at the "feedback" collection and it will
    email you every new submission automatically.

  HOW TO ADD THIS PAGE TO YOUR APP:
    1. Add the route to App.js (inside ProtectedRoute):
         <Route path="/feedback" element={<ProtectedRoute><Feedback /></ProtectedRoute>} />
    2. Add a link in the Navbar or Profile page:
         <Link to="/feedback">Send Feedback</Link>
  ─────────────────────────────────────────────────────
*/

const CATEGORIES = ["General", "Bug Report", "Feature Request", "Performance"];

export default function Feedback() {
  const [category, setCategory] = useState("General");
  const [rating,   setRating]   = useState(0);
  const [hovered,  setHovered]  = useState(0);
  const [message,  setMessage]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [sent,     setSent]     = useState(false);
  const [error,    setError]    = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) { setError("Please write your feedback before submitting."); return; }
    if (rating === 0)    { setError("Please select a star rating."); return; }
    setError("");
    setLoading(true);
    try {
      const user = auth.currentUser;
      await addDoc(collection(db, "feedback"), {
        uid:       user?.uid || "anonymous",
        email:     user?.email || "anonymous",
        category,
        rating,
        message:   message.trim(),
        createdAt: serverTimestamp(),
      });
      setSent(true);
    } catch (err) {
      console.error(err);
      setError("Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const { signOut } = await import("firebase/auth");
    const { auth: a } = await import("../firebase/firebase");
    await signOut(a);
    window.location.href = "/";
  };

  return (
    <>
      <style>{`
        .feedback-page {
          margin-left: 220px;
          min-height: 100vh;
          background: #f8fafc;
          padding: 32px 36px;
          font-family: 'Segoe UI', system-ui, sans-serif;
          box-sizing: border-box;
        }
        @media (max-width: 768px) {
          .feedback-page { margin-left: 0; padding: 72px 16px 80px; }
        }
        .fb-card {
          background: #fff;
          border-radius: 20px;
          padding: 36px 32px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 16px rgba(0,0,0,0.06);
          max-width: 560px;
          margin: 0 auto;
        }
        @media (max-width: 480px) { .fb-card { padding: 24px 16px; } }
        .fb-input {
          width: 100%;
          box-sizing: border-box;
          padding: 11px 14px;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          font-size: 14px;
          color: #0f172a;
          background: #f8fafc;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          font-family: 'Segoe UI', system-ui, sans-serif;
        }
        .fb-input:focus { border-color: #1d4ed8; box-shadow: 0 0 0 3px rgba(29,78,216,0.12); background: #fff; }
        .fb-textarea { resize: vertical; min-height: 120px; }
        .fb-btn {
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, #1e3a8a, #1d4ed8);
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.15s;
          font-family: 'Segoe UI', system-ui, sans-serif;
        }
        .fb-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        .fb-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .cat-pill {
          padding: 7px 16px;
          border-radius: 20px;
          border: 1.5px solid #e2e8f0;
          background: #f8fafc;
          font-size: 13px;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          transition: all 0.15s;
          font-family: 'Segoe UI', system-ui, sans-serif;
        }
        .cat-pill.active { background: #1d4ed8; color: #fff; border-color: #1d4ed8; }
        .cat-pill:hover:not(.active) { border-color: #1d4ed8; color: #1d4ed8; }
        .star { font-size: 28px; cursor: pointer; transition: transform 0.1s; line-height: 1; }
        .star:hover { transform: scale(1.15); }
        .field-label { font-size: 12px; font-weight: 700; color: #64748b; display: block; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
      `}</style>

      <Navbar />
      <div className="feedback-page">
        <div style={{ maxWidth: "560px", margin: "0 auto 24px" }}>
          <h1 style={{ fontSize: "clamp(20px, 4vw, 26px)", fontWeight: "800", color: "#0f172a", margin: 0 }}>Send Feedback</h1>
          <p style={{ color: "#64748b", marginTop: "6px", fontSize: "14px" }}>Help us improve AXEN — your feedback goes directly to the team</p>
        </div>

        <div className="fb-card">
          {!sent ? (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

              {/* Category */}
              <div>
                <label className="field-label">Category</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {CATEGORIES.map((c) => (
                    <button key={c} type="button" className={`cat-pill${category === c ? " active" : ""}`} onClick={() => setCategory(c)}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Star rating */}
              <div>
                <label className="field-label">Your Rating</label>
                <div style={{ display: "flex", gap: "6px" }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className="star"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHovered(star)}
                      onMouseLeave={() => setHovered(0)}
                      role="button" aria-label={`${star} stars`}
                    >
                      {star <= (hovered || rating) ? "⭐" : "☆"}
                    </span>
                  ))}
                  {rating > 0 && (
                    <span style={{ fontSize: "13px", color: "#64748b", alignSelf: "center", marginLeft: "6px" }}>
                      {["", "Poor", "Fair", "Good", "Great", "Excellent"][rating]}
                    </span>
                  )}
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="field-label">Your Feedback</label>
                <textarea
                  className="fb-input fb-textarea"
                  placeholder="Tell us what you love, what's broken, or what you'd like to see next…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={1000}
                />
                <div style={{ fontSize: "11px", color: "#94a3b8", textAlign: "right", marginTop: "4px" }}>{message.length}/1000</div>
              </div>

              {error && (
                <div style={{ background: "#fee2e2", color: "#dc2626", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", fontWeight: "600" }}>
                  ⚠️ {error}
                </div>
              )}

              <button type="submit" className="fb-btn" disabled={loading}>
                {loading ? "Submitting…" : "Submit Feedback"}
              </button>
            </form>
          ) : (
            /* Success */
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: "56px", marginBottom: "16px" }}>🎉</div>
              <h3 style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a", marginBottom: "8px" }}>Thank you!</h3>
              <p style={{ fontSize: "14px", color: "#64748b", lineHeight: 1.6, marginBottom: "24px" }}>
                Your feedback has been submitted and sent to the AXEN team. We read every response and use it to make the app better.
              </p>
              <button
                onClick={() => { setSent(false); setMessage(""); setRating(0); setCategory("General"); }}
                style={{ padding: "10px 24px", borderRadius: "10px", border: "1.5px solid #1d4ed8", background: "#fff", color: "#1d4ed8", fontSize: "14px", fontWeight: "700", cursor: "pointer", fontFamily: "'Segoe UI', system-ui, sans-serif" }}
              >
                Send Another
              </button>
            </div>
          )}
        </div>

        <div style={{ maxWidth: "560px", margin: "24px auto 0" }}>
          <Footer onLogout={handleLogout} />
        </div>
      </div>
    </>
  );
}