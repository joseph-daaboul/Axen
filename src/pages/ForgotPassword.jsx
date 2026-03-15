import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { Link } from "react-router-dom";

export default function ForgotPassword() {
  const [email,   setEmail]   = useState("");
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch (err) {
      if (err.code === "auth/user-not-found")  setError("No account found with this email.");
      else if (err.code === "auth/invalid-email") setError("Please enter a valid email address.");
      else setError("Something went wrong. Please try again.");
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
        .auth-btn { width: 100%; padding: 13px; background: linear-gradient(135deg, #1e3a8a, #1d4ed8); color: #fff; border: none; border-radius: 10px; font-size: 15px; font-weight: 700; cursor: pointer; transition: opacity 0.2s, transform 0.15s; font-family: 'Segoe UI', system-ui, sans-serif; }
        .auth-btn:hover:not(:disabled) { opacity: 0.92; transform: translateY(-1px); }
        .auth-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .auth-link { color: #1d4ed8; text-decoration: none; font-weight: 600; font-size: 13px; }
        .auth-link:hover { opacity: 0.75; }
      `}</style>

      <div className="auth-page">

        {/* ── Brand panel ── */}
        <div className="auth-brand">
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "48px" }}>
            <img src="/axen-logo.png" alt="AXEN" style={{ width: "44px", height: "44px", borderRadius: "12px", objectFit: "contain" }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
            <span style={{ fontWeight: "800", fontSize: "26px", letterSpacing: "3px" }}>AXEN</span>
          </div>
          <h1 style={{ fontSize: "clamp(28px, 4vw, 38px)", fontWeight: "800", lineHeight: 1.25, marginBottom: "16px" }}>
            Reset your<br />password.
          </h1>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "15px", lineHeight: 1.7, maxWidth: "340px" }}>
            No worries — it happens! Enter your email and we'll send you a secure link to reset your password and get back to training.
          </p>
          <div style={{ marginTop: "48px", padding: "20px 24px", background: "rgba(255,255,255,0.08)", borderRadius: "14px", maxWidth: "340px" }}>
            <div style={{ fontSize: "28px", marginBottom: "8px" }}>🔐</div>
            <div style={{ fontWeight: "700", fontSize: "14px", marginBottom: "4px" }}>Secure reset link</div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", lineHeight: 1.5 }}>The link expires in 1 hour for your security. Check your spam folder if you don't see it.</div>
          </div>
        </div>

        {/* ── Form panel ── */}
        <div className="auth-form-panel">
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "28px" }}>
            <img src="/axen-logo.png" alt="AXEN" style={{ width: "36px", height: "36px", borderRadius: "10px", objectFit: "contain" }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
            <span style={{ fontWeight: "800", fontSize: "20px", color: "#0f172a", letterSpacing: "2px" }}>AXEN</span>
          </div>

          {!sent ? (
            <>
              {/* Back arrow */}
              <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#64748b", textDecoration: "none", fontSize: "13px", fontWeight: "600", marginBottom: "24px" }}>
                ← Back to Sign In
              </Link>

              <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a", marginBottom: "6px" }}>Forgot your password?</h2>
              <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "28px" }}>Enter your email and we'll send you a reset link.</p>

              {error && (
                <div style={{ background: "#fee2e2", color: "#dc2626", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", fontWeight: "600", marginBottom: "20px" }}>
                  ⚠️ {error}
                </div>
              )}

              <form onSubmit={handleReset} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Email address</label>
                  <input className="auth-input" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} />
                </div>
                <button type="submit" className="auth-btn" disabled={loading}>
                  {loading ? "Sending…" : "Send Reset Link"}
                </button>
              </form>

              <div style={{ textAlign: "center", marginTop: "24px", fontSize: "13px", color: "#64748b" }}>
                Remember it now? <Link to="/" className="auth-link">Sign in</Link>
              </div>
            </>
          ) : (
            /* Success state */
            <div style={{ textAlign: "center" }}>
              <div style={{ width: "72px", height: "72px", borderRadius: "20px", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", margin: "0 auto 20px" }}>✅</div>
              <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a", marginBottom: "10px" }}>Check your email</h2>
              <p style={{ fontSize: "14px", color: "#64748b", lineHeight: 1.6, marginBottom: "8px" }}>
                We've sent a password reset link to:
              </p>
              <p style={{ fontSize: "15px", fontWeight: "700", color: "#1d4ed8", marginBottom: "28px" }}>{email}</p>
              <p style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "32px" }}>
                Didn't receive it? Check your spam folder or{" "}
                <button onClick={() => { setSent(false); setError(""); }} style={{ background: "none", border: "none", color: "#1d4ed8", fontWeight: "600", cursor: "pointer", fontSize: "13px", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
                  try again
                </button>
                .
              </p>
              <Link to="/" className="auth-btn" style={{ display: "block", padding: "13px", textAlign: "center", textDecoration: "none", fontSize: "15px", fontWeight: "700", color: "#fff", background: "linear-gradient(135deg, #1e3a8a, #1d4ed8)", borderRadius: "10px" }}>
                Back to Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}