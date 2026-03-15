import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { auth, db } from "../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function Footer({ onLogout }) {
  const navigate = useNavigate();
  const now     = new Date();
  const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const [time,      setTime]      = useState(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [displayName, setDisplayName] = useState("");

  /* Live clock */
  useEffect(() => {
    const t = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    }, 30000);
    return () => clearInterval(t);
  }, []);

  /* Fetch name + avatar from Firestore */
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();

          // Show first name from stored `name` field.
          // Fall back to the part before @ in their email if name not set yet.
          if (data.name && data.name.trim()) {
            const firstName = data.name.trim().split(" ")[0];
            setDisplayName(firstName);
          } else {
            const emailFirst = user.email?.split("@")[0] || "Athlete";
            setDisplayName(emailFirst.charAt(0).toUpperCase() + emailFirst.slice(1));
          }

          if (data.avatarUrl) setAvatarUrl(data.avatarUrl);
        } else {
          // No doc yet — use email prefix
          const emailFirst = auth.currentUser?.email?.split("@")[0] || "Athlete";
          setDisplayName(emailFirst.charAt(0).toUpperCase() + emailFirst.slice(1));
        }
      } catch (e) {
        // silently fall back
      }
    };
    fetchProfile();
  }, []);

  const initial = displayName ? displayName[0].toUpperCase() : "A";

  const footerLinks = [
    { to: "/exercises",  label: "Relaxation Exercise" },
    { to: "/routine",    label: "Build Routine"        },
    { to: "/motivation", label: "Keep Notes"           },
    { to: "/chatbot",    label: "AI Chatbot"           },
  ];

  return (
    <footer style={{
      borderTop: "1px solid #e2e8f0",
      paddingTop: "20px",
      marginTop: "8px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: "16px",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>

      {/* Left — quick nav links */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px" }}>
        {footerLinks.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            style={{ color: "#475569", fontSize: "13px", textDecoration: "none", fontWeight: "500", transition: "color 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#3b82f6"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#475569"; }}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {/* Right — Logout · Time · Name + avatar */}
      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>

        {/* Logout */}
        <button
          onClick={onLogout}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: "13px", fontWeight: "600", display: "flex", alignItems: "center", gap: "5px", padding: 0, transition: "opacity 0.15s" }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.75"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Logout
        </button>

        <span style={{ color: "#e2e8f0", fontSize: "18px" }}>|</span>

        {/* Date & Time */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>{time}</div>
          <div style={{ fontSize: "11px", color: "#94a3b8" }}>{dateStr}</div>
        </div>

        <span style={{ color: "#e2e8f0", fontSize: "18px" }}>|</span>

        {/* First name + avatar — clicking goes to /profile */}
        <div
          style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}
          onClick={() => navigate("/profile")}
          title="Go to Profile"
        >
          <div style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>
            {displayName}
          </div>

          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: avatarUrl ? "transparent" : "linear-gradient(135deg, #3b82f6, #6366f1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: "700",
              fontSize: "13px",
              flexShrink: 0,
              overflow: "hidden",
              border: avatarUrl ? "2px solid #e2e8f0" : "none",
              transition: "box-shadow 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.25)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
          >
            {avatarUrl
              ? <img src={avatarUrl} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : initial
            }
          </div>
        </div>

      </div>
    </footer>
  );
}