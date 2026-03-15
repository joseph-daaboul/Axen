import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";

/*
  ─────────────────────────────────────────────────
  AXEN LOGO IMAGE
  Place your logo PNG file at:
    public/axen-logo.png
  That's it — no import needed, just drop the
  file in your project's  public/  folder.
  ─────────────────────────────────────────────────
*/

const navItems = [
  {
    to: "/dashboard", label: "Dashboard",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  },
  {
    to: "/exercises", label: "Exercises",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>,
  },
  {
    to: "/routine", label: "Routine",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  },
  {
    to: "/motivation", label: "Motivation",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  },
  {
    to: "/chatbot", label: "AI Coach",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  },
  {
    to: "/summary", label: "Summary",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  },
  {
    to: "/profile", label: "Profile",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  },
];

/* ── Reusable avatar component ── */
function UserAvatar({ avatarUrl, initial, size = 32, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        background: avatarUrl ? "transparent" : "linear-gradient(135deg, #3b82f6, #6366f1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: "700",
        fontSize: `${Math.round(size * 0.44)}px`,
        flexShrink: 0,
        overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        border: avatarUrl ? "2px solid rgba(255,255,255,0.2)" : "none",
        transition: "opacity 0.15s",
      }}
      title="Go to Profile"
    >
      {avatarUrl
        ? <img src={avatarUrl} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : initial
      }
    </div>
  );
}

/* ── AXEN brand logo mark ── */
function AxenLogo({ size = 34 }) {
  return (
    <img
      src="/axen-logo.png"
      alt="AXEN"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "10px",
        objectFit: "contain",
        flexShrink: 0,
      }}
      onError={(e) => {
        // Fallback to gradient "A" if image not found yet
        e.currentTarget.style.display = "none";
        e.currentTarget.nextSibling.style.display = "flex";
      }}
    />
  );
}

/* ── Fallback "A" block shown if logo image missing ── */
function AxenLogoFallback({ size = 34 }) {
  return (
    <div style={{
      display: "none", // shown via onError above
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: "10px",
      background: "linear-gradient(135deg, #3b82f6, #6366f1)",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: "800",
      color: "#fff",
      fontSize: `${Math.round(size * 0.47)}px`,
      flexShrink: 0,
    }}>A</div>
  );
}

export default function Navbar() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [userEmail,  setUserEmail]  = useState("");
  const [userInitial, setUserInitial] = useState("A");
  const [avatarUrl,  setAvatarUrl]  = useState(null);
  const [menuOpen,   setMenuOpen]   = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const user = auth.currentUser;
      if (!user) return;
      setUserEmail(user.email || "");
      setUserInitial((user.email || "A")[0].toUpperCase());
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists() && snap.data().avatarUrl) {
          setAvatarUrl(snap.data().avatarUrl);
        }
      } catch (e) {
        // silently fail — fallback to initial
      }
    };
    fetchUser();
  }, []);

  const logout = async () => {
    await signOut(auth);
    navigate("/");
  };

  const goToProfile = () => navigate("/profile");

  /* ── Shared brand block used in sidebar + mobile bars ── */
  const BrandBlock = ({ logoSize = 34, textSize = 20 }) => (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <AxenLogo size={logoSize} />
      <AxenLogoFallback size={logoSize} />
      <span style={{ color: "#fff", fontWeight: "800", fontSize: `${textSize}px`, letterSpacing: "2px" }}>AXEN</span>
    </div>
  );

  /* ── User row in sidebar/drawer bottom ── */
  const UserRow = () => (
    <div
      onClick={goToProfile}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "10px 12px",
        borderRadius: "10px",
        background: "rgba(255,255,255,0.05)",
        marginBottom: "8px",
        cursor: "pointer",
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.10)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
      title="Go to Profile"
    >
      <UserAvatar avatarUrl={avatarUrl} initial={userInitial} size={32} />
      <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {userEmail}
      </span>
    </div>
  );

  return (
    <>
      <style>{`
        .axen-sidebar {
          width: 220px;
          min-height: 100vh;
          background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
          display: flex;
          flex-direction: column;
          position: fixed;
          left: 0; top: 0; bottom: 0;
          z-index: 200;
          box-shadow: 4px 0 24px rgba(0,0,0,0.18);
        }
        .axen-topbar { display: none; }
        .axen-bottomnav { display: none; }
        .axen-drawer-overlay { display: none; }

        @media (max-width: 768px) {
          .axen-sidebar { display: none !important; }
          .axen-topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 16px;
            height: 56px;
            background: linear-gradient(90deg, #0f172a, #1e293b);
            position: fixed;
            top: 0; left: 0; right: 0;
            z-index: 200;
            box-shadow: 0 2px 12px rgba(0,0,0,0.2);
          }
          .axen-bottomnav {
            display: flex;
            position: fixed;
            bottom: 0; left: 0; right: 0;
            z-index: 200;
            background: linear-gradient(180deg, #0f172a, #1e293b);
            border-top: 1px solid rgba(255,255,255,0.08);
            height: 60px;
            align-items: stretch;
          }
          .axen-drawer-overlay {
            display: block;
            position: fixed;
            inset: 0;
            z-index: 190;
            background: rgba(0,0,0,0.5);
          }
          .axen-drawer {
            position: fixed;
            top: 0; left: 0; bottom: 0;
            width: 260px;
            background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
            z-index: 300;
            display: flex;
            flex-direction: column;
            box-shadow: 4px 0 24px rgba(0,0,0,0.3);
          }
        }
        .axen-bottomnav-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          text-decoration: none;
          color: rgba(255,255,255,0.45);
          font-size: 10px;
          font-weight: 500;
          transition: color 0.15s;
          padding: 6px 0;
        }
        .axen-bottomnav-item.active { color: #3b82f6; }
        .axen-bottomnav-item:hover { color: rgba(255,255,255,0.85); }
        .axen-hamburger {
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .axen-hamburger span {
          display: block;
          width: 22px;
          height: 2px;
          background: rgba(255,255,255,0.8);
          border-radius: 2px;
        }
        .axen-nav-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 14px;
          border-radius: 10px;
          text-decoration: none;
          font-size: 14px;
          transition: all 0.18s ease;
          border-left: 3px solid transparent;
        }
      `}</style>

      {/* ══ DESKTOP SIDEBAR ══ */}
      <aside className="axen-sidebar">
        {/* Brand – larger logo */}
        <div style={{ padding: "28px 24px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <BrandBlock logoSize={48} textSize={24} />
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: "4px" }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="axen-nav-link"
                style={{
                  color: isActive ? "#fff" : "rgba(255,255,255,0.55)",
                  background: isActive ? "linear-gradient(135deg, rgba(59,130,246,0.25), rgba(99,102,241,0.2))" : "transparent",
                  borderLeft: isActive ? "3px solid #3b82f6" : "3px solid transparent",
                  fontWeight: isActive ? "600" : "400",
                }}
                onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.85)"; } }}
                onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; } }}
              >
                <span style={{ opacity: isActive ? 1 : 0.7 }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User + logout */}
        <div style={{ padding: "16px 12px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <UserRow />
          <button
            onClick={logout}
            style={{ width: "100%", padding: "9px", borderRadius: "8px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "rgba(239,68,68,0.85)", fontSize: "13px", fontWeight: "500", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.2)"; e.currentTarget.style.color = "#ef4444"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; e.currentTarget.style.color = "rgba(239,68,68,0.85)"; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Logout
          </button>
        </div>
      </aside>

      {/* ══ MOBILE TOP BAR ══ */}
      <div className="axen-topbar">
        <BrandBlock logoSize={40} textSize={20} />
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Profile avatar in top bar */}
          <UserAvatar avatarUrl={avatarUrl} initial={userInitial} size={32} onClick={goToProfile} />
          <button className="axen-hamburger" onClick={() => setMenuOpen(true)}>
            <span /><span /><span />
          </button>
        </div>
      </div>

      {/* ══ MOBILE DRAWER ══ */}
      {menuOpen && (
        <>
          <div className="axen-drawer-overlay" onClick={() => setMenuOpen(false)} />
          <div className="axen-drawer">
            <div style={{ padding: "24px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <BrandBlock logoSize={40} textSize={20} />
              <button onClick={() => setMenuOpen(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: "22px", lineHeight: 1 }}>✕</button>
            </div>
            <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: "4px" }}>
              {navItems.map((item) => {
                const isActive = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMenuOpen(false)}
                    style={{ display: "flex", alignItems: "center", gap: "12px", padding: "13px 14px", borderRadius: "10px", textDecoration: "none", color: isActive ? "#fff" : "rgba(255,255,255,0.6)", background: isActive ? "linear-gradient(135deg, rgba(59,130,246,0.25), rgba(99,102,241,0.2))" : "transparent", borderLeft: isActive ? "3px solid #3b82f6" : "3px solid transparent", fontWeight: isActive ? "600" : "400", fontSize: "15px" }}
                  >
                    <span style={{ opacity: isActive ? 1 : 0.7 }}>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div style={{ padding: "16px 12px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <UserRow />
              <button
                onClick={logout}
                style={{ width: "100%", padding: "11px", borderRadius: "8px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: "14px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Logout
              </button>
            </div>
          </div>
        </>
      )}

      {/* ══ MOBILE BOTTOM NAV ══ */}
      <nav className="axen-bottomnav">
        {navItems.slice(0, 5).map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Link key={item.to} to={item.to} className={`axen-bottomnav-item${isActive ? " active" : ""}`}>
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}