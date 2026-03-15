import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { Link, useNavigate } from "react-router-dom";

export default function Login() {
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [error,        setError]        = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/dashboard");
    } catch {
      setError("Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', system-ui, sans-serif; }

        .auth-page {
          min-height: 100vh;
          display: flex;
          background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1d4ed8 100%);
        }

        /* Left panel — brand */
        .auth-brand {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 60px 56px;
          color: #fff;
        }
        @media (max-width: 768px) { .auth-brand { display: none; } }

        /* Right panel — form */
        .auth-form-panel {
          width: 440px;
          flex-shrink: 0;
          background: #fff;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 48px 40px;
          min-height: 100vh;
        }
        @media (max-width: 768px) {
          .auth-page { background: #fff; }
          .auth-form-panel { width: 100%; padding: 40px 24px; }
        }

        .auth-input {
          width: 100%;
          padding: 12px 16px;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          font-size: 14px;
          color: #0f172a;
          background: #f8fafc;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          font-family: 'Segoe UI', system-ui, sans-serif;
        }
        .auth-input:focus {
          border-color: #1d4ed8;
          box-shadow: 0 0 0 3px rgba(29,78,216,0.12);
          background: #fff;
        }
        .auth-input::placeholder { color: #94a3b8; }

        .auth-btn {
          width: 100%;
          padding: 13px;
          background: linear-gradient(135deg, #1e3a8a, #1d4ed8);
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.15s;
          font-family: 'Segoe UI', system-ui, sans-serif;
          letter-spacing: 0.3px;
        }
        .auth-btn:hover:not(:disabled) { opacity: 0.92; transform: translateY(-1px); }
        .auth-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .auth-link {
          color: #1d4ed8;
          text-decoration: none;
          font-weight: 600;
          font-size: 13px;
          transition: opacity 0.15s;
        }
        .auth-link:hover { opacity: 0.75; }

        .feature-item {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          margin-bottom: 20px;
        }
        .feature-icon {
          width: 40px; height: 40px;
          border-radius: 10px;
          background: rgba(255,255,255,0.12);
          display: flex; align-items: center; justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
        }
      `}</style>

      <div className="auth-page">

        {/* ── Left brand panel ── */}
        <div className="auth-brand">
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "48px" }}>
            <img src="/axen-logo.png" alt="AXEN" style={{ width: "44px", height: "44px", borderRadius: "12px", objectFit: "contain" }}
              onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.nextSibling.style.display = "flex"; }}
            />
            <div style={{ display: "none", width: "44px", height: "44px", borderRadius: "12px", background: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "20px" }}>A</div>
            <span style={{ fontWeight: "800", fontSize: "26px", letterSpacing: "3px" }}>AXEN</span>
          </div>

          <h1 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: "800", lineHeight: 1.2, marginBottom: "16px", letterSpacing: "-0.5px" }}>
            Train Your Mind.<br />Elevate Your Game.
          </h1>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "15px", lineHeight: 1.7, maxWidth: "380px", marginBottom: "48px" }}>
            The mental performance platform designed for athletes who want to unlock their full potential through science-backed mental training.
          </p>

          {[
            { icon: "💨", title: "Breathing Exercises", desc: "Calm anxiety and sharpen focus" },
            { icon: "🧘", title: "Mental Routines",     desc: "Build consistent pre-performance habits" },
            { icon: "🏆", title: "Track Progress",      desc: "Visualize your mental fitness growth" },
          ].map((f) => (
            <div key={f.title} className="feature-item">
              <div className="feature-icon">{f.icon}</div>
              <div>
                <div style={{ fontWeight: "700", fontSize: "14px", marginBottom: "2px" }}>{f.title}</div>
                <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "13px" }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Right form panel ── */}
        <div className="auth-form-panel">
          {/* Mobile logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "32px" }}>
            <img src="/axen-logo.png" alt="AXEN" style={{ width: "36px", height: "36px", borderRadius: "10px", objectFit: "contain" }}
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
            <span style={{ fontWeight: "800", fontSize: "20px", color: "#0f172a", letterSpacing: "2px" }}>AXEN</span>
          </div>

          <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a", marginBottom: "6px" }}>Welcome back</h2>
          <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "28px" }}>Sign in to continue your mental training</p>

          {error && (
            <div style={{ background: "#fee2e2", color: "#dc2626", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", fontWeight: "600", marginBottom: "20px", display: "flex", alignItems: "center", gap: "6px" }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Email</label>
              <input className="auth-input" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Password</label>
                <Link to="/forgot" className="auth-link">Forgot password?</Link>
              </div>
              <div style={{ position: "relative" }}>
                <input className="auth-input" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ paddingRight: "52px" }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "12px", fontWeight: "600", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-btn" disabled={loading} style={{ marginTop: "6px" }}>
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: "24px", fontSize: "13px", color: "#64748b" }}>
            Don't have an account?{" "}
            <Link to="/register" className="auth-link">Create one free</Link>
          </div>

          <div style={{ marginTop: "40px", paddingTop: "20px", borderTop: "1px solid #f1f5f9", textAlign: "center" }}>
            <p style={{ fontSize: "11px", color: "#94a3b8" }}>Built for athletes · Mental performance training · AXEN</p>
          </div>
        </div>
      </div>
    </>
  );
}