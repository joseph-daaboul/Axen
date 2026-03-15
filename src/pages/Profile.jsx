import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { auth, db } from "../firebase/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";

export default function Profile() {
  const [userData,      setUserData]      = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [resetSent,     setResetSent]     = useState(false);
  const [resetError,    setResetError]    = useState("");
  const [saveMsg,       setSaveMsg]       = useState("");
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [form, setForm] = useState({ name: "", dob: "", gender: "" });

  const fileRef  = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) { navigate("/"); return; }

        const docSnap = await getDoc(doc(db, "users", user.uid));
        const data    = docSnap.exists() ? docSnap.data() : {};
        setUserData(data);

        // Fallback name = email prefix if no name saved yet
        const emailFallback = user.email?.split("@")[0] || "Athlete";
        const fallback = emailFallback.charAt(0).toUpperCase() + emailFallback.slice(1);

        setForm({
          name:   data.name   || fallback,
          dob:    data.dob    || "",
          gender: data.gender || "",
        });

        if (data.avatarUrl) setAvatarPreview(data.avatarUrl);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg("");
    try {
      const user = auth.currentUser;
      if (!user) return;
      await updateDoc(doc(db, "users", user.uid), {
        name:   form.name,
        dob:    form.dob,
        gender: form.gender,
        ...(avatarPreview ? { avatarUrl: avatarPreview } : {}),
      });
      setSaveMsg("Profile saved!");
      setTimeout(() => setSaveMsg(""), 2500);
    } catch (err) {
      console.error(err);
      setSaveMsg("Error saving profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    setResetError("");
    setResetSent(false);
    try {
      const user = auth.currentUser;
      if (!user?.email) return;
      await sendPasswordResetEmail(auth, user.email);
      setResetSent(true);
      setTimeout(() => setResetSent(false), 4000);
    } catch (err) {
      setResetError("Failed to send reset email.");
    }
  };

  const handleLogout = async () => {
    const { signOut } = await import("firebase/auth");
    const { auth: a } = await import("../firebase/firebase");
    await signOut(a);
    window.location.href = "/";
  };

  const getInitials = (name) => {
    if (!name) return "A";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  if (loading) return (
    <>
      <Navbar />
      <div className="profile-page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>⏳</div>
          <div style={{ color: "#64748b", fontSize: "16px" }}>Loading profile...</div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <style>{`
        .profile-page {
          margin-left: 220px;
          min-height: 100vh;
          background: #f8fafc;
          padding: 32px 36px;
          font-family: 'Segoe UI', system-ui, sans-serif;
          box-sizing: border-box;
        }
        @media (max-width: 768px) {
          .profile-page { margin-left: 0; padding: 72px 16px 80px; }
        }
        .profile-card {
          background: #fff;
          border-radius: 20px;
          padding: 36px 32px;
          box-shadow: 0 2px 16px rgba(0,0,0,0.07);
          border: 1px solid #f1f5f9;
          max-width: 520px;
          margin: 0 auto;
        }
        @media (max-width: 480px) {
          .profile-card { padding: 24px 16px; border-radius: 16px; }
        }
        .profile-input {
          width: 100%;
          box-sizing: border-box;
          padding: 11px 14px;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          font-size: 14px;
          color: #0f172a;
          background: #f8fafc;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          font-family: 'Segoe UI', system-ui, sans-serif;
        }
        .profile-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
          background: #fff;
        }
        .profile-input::placeholder { color: #94a3b8; }
        .profile-select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 14px center;
          padding-right: 36px;
        }
        .save-btn {
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, #1d4ed8, #2563eb);
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.2s ease, transform 0.15s ease;
          font-family: 'Segoe UI', system-ui, sans-serif;
        }
        .save-btn:hover  { opacity: 0.92; transform: translateY(-1px); }
        .save-btn:active { transform: translateY(0); }
        .reset-btn {
          width: 100%;
          padding: 11px;
          background: #fff;
          color: #ef4444;
          border: 1.5px solid #fecaca;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s ease, border-color 0.2s ease;
          font-family: 'Segoe UI', system-ui, sans-serif;
        }
        .reset-btn:hover { background: #fff5f5; border-color: #ef4444; }
        .avatar-ring {
          width: 96px;
          height: 96px;
          border-radius: 50%;
          background: linear-gradient(135deg, #dbeafe, #bfdbfe);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          font-weight: 800;
          color: #1d4ed8;
          position: relative;
          cursor: pointer;
          margin: 0 auto 8px;
          border: 3px solid #e0eaff;
          overflow: hidden;
          transition: box-shadow 0.2s ease;
        }
        .avatar-ring:hover { box-shadow: 0 0 0 4px rgba(59,130,246,0.2); }
        .avatar-ring img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
        .avatar-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.38);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s ease;
          font-size: 18px;
        }
        .avatar-ring:hover .avatar-overlay { opacity: 1; }
        .label-text {
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
          margin-bottom: 5px;
          display: block;
        }
      `}</style>

      <Navbar />

      <div className="profile-page">
        {/* Page header */}
        <div style={{ maxWidth: "520px", margin: "0 auto 24px" }}>
          <h1 style={{ fontSize: "clamp(20px, 4vw, 26px)", fontWeight: "800", color: "#0f172a", margin: 0 }}>Profile</h1>
          <p style={{ color: "#64748b", marginTop: "6px", fontSize: "14px" }}>Manage your personal information</p>
        </div>

        <div className="profile-card">
          {/* Avatar */}
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <div className="avatar-ring" onClick={() => fileRef.current?.click()}>
              {avatarPreview
                ? <img src={avatarPreview} alt="Avatar" />
                : <span>{getInitials(form.name)}</span>
              }
              <div className="avatar-overlay">📷</div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
            <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "6px" }}>Tap to change photo</div>
            <div style={{ marginTop: "6px", display: "inline-flex", alignItems: "center", gap: "6px", background: "#eff6ff", borderRadius: "8px", padding: "4px 10px" }}>
              <span style={{ fontSize: "12px" }}>🏅</span>
              <span style={{ fontSize: "11px", color: "#3b82f6", fontWeight: "600" }}>
                {userData?.sessionsCompleted || 0} sessions completed
              </span>
            </div>
          </div>

          {/* Form fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "20px" }}>
            <div>
              <label className="label-text">Full Name</label>
              <input className="profile-input" type="text" placeholder="Your name"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label-text">Date of Birth</label>
              <input className="profile-input" type="date"
                value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
            </div>
            <div>
              <label className="label-text">Gender</label>
              <select className="profile-input profile-select"
                value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="non-binary">Non-binary</option>
                <option value="prefer-not">Prefer not to say</option>
              </select>
            </div>
          </div>

          {/* Save */}
          <button className="save-btn" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
          {saveMsg && (
            <div style={{ marginTop: "10px", padding: "10px 14px", borderRadius: "10px", background: saveMsg.includes("Error") ? "#fee2e2" : "#dcfce7", color: saveMsg.includes("Error") ? "#dc2626" : "#16a34a", fontSize: "13px", fontWeight: "600", textAlign: "center" }}>
              {saveMsg.includes("Error") ? "❌" : "✅"} {saveMsg}
            </div>
          )}

          <div style={{ height: "1px", background: "#f1f5f9", margin: "20px 0" }} />

          {/* Reset password */}
          <div>
            <label className="label-text" style={{ marginBottom: "8px" }}>Security</label>
            <button className="reset-btn" onClick={handleResetPassword}>🔒 Reset Password</button>
            {resetSent && (
              <div style={{ marginTop: "8px", fontSize: "12px", color: "#16a34a", fontWeight: "600", textAlign: "center" }}>
                ✅ Reset email sent — check your inbox!
              </div>
            )}
            {resetError && (
              <div style={{ marginTop: "8px", fontSize: "12px", color: "#dc2626", fontWeight: "600", textAlign: "center" }}>
                ❌ {resetError}
              </div>
            )}
          </div>

          {/* Account info */}
          <div style={{ marginTop: "20px", padding: "14px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", marginBottom: "6px" }}>Account Info</div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "13px" }}>📧</span>
              <span style={{ fontSize: "13px", color: "#0f172a", fontWeight: "500" }}>{auth.currentUser?.email}</span>
            </div>
          </div>
        </div>

        {/* Footer component — fetches its own name/avatar from Firestore */}
        <div style={{ maxWidth: "520px", margin: "24px auto 0" }}>
          <Footer onLogout={handleLogout} />
        </div>
      </div>
    </>
  );
}