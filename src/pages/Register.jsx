import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase/firebase";
import { doc, setDoc } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";

export default function Register() {
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [confirm,      setConfirm]      = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error,        setError]        = useState("");
  const [loading,      setLoading]      = useState(false);
  const navigate = useNavigate();

  const register = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 6)  { setError("Password must be at least 6 characters."); return; }

    setLoading(true);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", userCred.user.uid), {
        email,
        createdAt: new Date().toISOString(),
        sessionsCompleted: 0,
        exercisesDone: 0,
        routineStreak: 0,
        exerciseHistory: [],
        routine: {},
        goalEntries: [],
        motivation: { goals: [], strengths: [] },
      });
      navigate("/dashboard");
    } catch (err) {
      if (err.code === "auth/email-already-in-use") setError("This email is already registered.");
      else if (err.code === "auth/invalid-email")   setError("Please enter a valid email address.");
      else if (err.code === "auth/weak-password")   setError("Password is too weak.");
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', system-ui, sans-serif; }
        .auth-page { min-height: 100vh; display: flex; background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1d4ed8 100%); }
        .auth-brand { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 60px 56px; color: #fff; }
        @media (max-width: 768px) { .auth-brand { display: none; } }
        .auth-form-panel { width: 440px; flex-shrink: 0; background: #fff; display: flex; flex-direction: column; justify-content: center; padding: 48px 40px; min-height: 100vh; }
        @media (max-width: 768px) { .auth-page { background: #fff; } .auth-form-panel { width: 100%; padding: 40px 24px; } }
        .auth-input { width: 100%; padding: 12px 16px; border: 1.5px solid #e2e8f0; border-radius: 10px; font-size: 14px; color: #0f172a; background: #f8fafc; outline: none; transition: border-color 0.2s, box-shadow 0.2s; font-family: 'Segoe UI', system-ui, sans-serif; }
        .auth-input:focus { border-color: #1d4ed8; box-shadow: 0 0 0 3px rgba(29,78,216,0.12); background: #fff; }
        .auth-input::placeholder { color: #94a3b8; }
        .auth-btn { width: 100%; padding: 13px; background: linear-gradient(135deg, #1e3a8a, #1d4ed8); color: #fff; border: none; border-radius: 10px; font-size: 15px; font-weight: 700; cursor: pointer; transition: opacity 0.2s, transform 0.15s; font-family: 'Segoe UI', system-ui, sans-serif; letter-spacing: 0.3px; }
        .auth-btn:hover:not(:disabled) { opacity: 0.92; transform: translateY(-1px); }
        .auth-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .auth-link { color: #1d4ed8; text-decoration: none; font-weight: 600; font-size: 13px; transition: opacity 0.15s; }
        .auth-link:hover { opacity: 0.75; }
        label.field-label { font-size: 12px; font-weight: 700; color: #64748b; display: block; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
      `}</style>

      <div className="auth-page">

        {/* ── Brand panel ── */}
        <div className="auth-brand">
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "48px" }}>
            <img src="/axen-logo.png" alt="AXEN" style={{ width: "44px", height: "44px", borderRadius: "12px", objectFit: "contain" }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
            <span style={{ fontWeight: "800", fontSize: "26px", letterSpacing: "3px" }}>AXEN</span>
          </div>
          <h1 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: "800", lineHeight: 1.2, marginBottom: "16px", letterSpacing: "-0.5px" }}>
            Start Your Mental<br />Training Journey.
          </h1>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "15px", lineHeight: 1.7, maxWidth: "380px", marginBottom: "40px" }}>
            Join AXEN and unlock the mental edge that separates good athletes from great ones. It's free to get started.
          </p>
          {[
            { icon: "🎯", text: "Guided breathing & focus exercises" },
            { icon: "📋", text: "Personalised mental training routines" },
            { icon: "📊", text: "Progress tracking & analytics" },
            { icon: "🤖", text: "AI mental performance coach" },
          ].map((f) => (
            <div key={f.text} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", flexShrink: 0 }}>{f.icon}</div>
              <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.8)" }}>{f.text}</span>
            </div>
          ))}
        </div>

        {/* ── Form panel ── */}
        <div className="auth-form-panel">
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "28px" }}>
            <img src="/axen-logo.png" alt="AXEN" style={{ width: "36px", height: "36px", borderRadius: "10px", objectFit: "contain" }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
            <span style={{ fontWeight: "800", fontSize: "20px", color: "#0f172a", letterSpacing: "2px" }}>AXEN</span>
          </div>

          <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a", marginBottom: "6px" }}>Create your account</h2>
          <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "28px" }}>Free forever · No credit card required</p>

          {error && (
            <div style={{ background: "#fee2e2", color: "#dc2626", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", fontWeight: "600", marginBottom: "20px" }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={register} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label className="field-label">Email</label>
              <input className="auth-input" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} />
            </div>

            <div>
              <label className="field-label">Password</label>
              <div style={{ position: "relative" }}>
                <input className="auth-input" type={showPassword ? "text" : "password"} placeholder="Min. 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} style={{ paddingRight: "52px" }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "12px", fontWeight: "600", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div>
              <label className="field-label">Confirm Password</label>
              <input className="auth-input" type={showPassword ? "text" : "password"} placeholder="Repeat password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required disabled={loading} />
            </div>

            <button type="submit" className="auth-btn" disabled={loading} style={{ marginTop: "6px" }}>
              {loading ? "Creating Account…" : "Create Account"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: "24px", fontSize: "13px", color: "#64748b" }}>
            Already have an account?{" "}
            <Link to="/" className="auth-link">Sign in</Link>
          </div>

          <div style={{ marginTop: "32px", paddingTop: "20px", borderTop: "1px solid #f1f5f9", textAlign: "center" }}>
            <p style={{ fontSize: "11px", color: "#94a3b8" }}>By registering you agree to use AXEN for personal mental training · AXEN</p>
          </div>
        </div>
      </div>
    </>
  );
}