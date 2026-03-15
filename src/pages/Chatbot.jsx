import { useState, useEffect, useRef } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { sendMessageToAI } from "../services/chatbotService";

export default function Chatbot() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([
    {
      sender: "ai",
      text: "Hello! I'm your AI mental performance coach. I'm here to help you with mental training strategies, pre-competition anxiety, focus techniques, and more. How can I support your mental game today?",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, loading]);

  const sendMessage = async () => {
    if (!message.trim() || loading) return;
    const userMsg = { sender: "user", text: message, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    setChat((prev) => [...prev, userMsg]);
    setMessage("");
    setLoading(true);
    try {
      const reply = await sendMessageToAI(message);
      setChat((prev) => [...prev, { sender: "ai", text: reply, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
    } catch {
      setChat((prev) => [...prev, { sender: "ai", text: "Sorry, I'm having trouble responding right now. Please try again.", time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
    } finally { setLoading(false); }
  };

  const handleKeyPress = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  return (
    <>
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
        .axen-chat-page {
          margin-left: 220px;
          min-height: 100vh;
          background: #f8fafc;
          padding: 32px 36px;
          font-family: 'Segoe UI', system-ui, sans-serif;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        }
        .axen-chat-container {
          background: #fff;
          border-radius: 18px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 24px rgba(0,0,0,0.06);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          margin-bottom: 32px;
          flex: 1;
        }
        .axen-chat-messages {
          overflow-y: auto;
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-height: 340px;
          max-height: 460px;
        }
        .axen-chat-input-row {
          padding: 14px 18px;
          border-top: 1px solid #f1f5f9;
          display: flex;
          gap: 10px;
          align-items: center;
        }
        @media (max-width: 768px) {
          .axen-chat-page {
            margin-left: 0;
            padding: 72px 12px 80px;
          }
          .axen-chat-container {
            border-radius: 14px;
          }
          .axen-chat-messages {
            padding: 14px 14px;
            min-height: 280px;
            max-height: calc(100vh - 340px);
          }
          .axen-chat-input-row {
            padding: 10px 12px;
          }
        }
      `}</style>

      <Navbar />
      <div className="axen-chat-page">

        <div style={{ marginBottom: "20px" }}>
          <h1 style={{ fontSize: "clamp(20px, 4vw, 28px)", fontWeight: "800", color: "#0f172a", margin: 0 }}>AI Mental Coach</h1>
          <p style={{ color: "#64748b", marginTop: "6px", fontSize: "14px" }}>Get personalized guidance for your mental training</p>
        </div>

        <div className="axen-chat-container">

          {/* Header */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>🤖</div>
              <div>
                <div style={{ fontWeight: "700", fontSize: "14px", color: "#0f172a" }}>Mental Performance Coach</div>
                <div style={{ fontSize: "11px", color: "#94a3b8" }}>AI-powered • Always available</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 0 2px #d1fae5" }} />
              <span style={{ fontSize: "12px", color: "#10b981", fontWeight: "600" }}>Online</span>
            </div>
          </div>

          {/* Disclaimer */}
          <div style={{ margin: "10px 16px 0", padding: "9px 12px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "10px", fontSize: "11px", color: "#92400e", display: "flex", alignItems: "flex-start", gap: "7px" }}>
            <span style={{ flexShrink: 0 }}>⚠️</span>
            <span><strong>Disclaimer:</strong> This AI provides general guidance only and is not a substitute for professional mental health care.</span>
          </div>

          {/* Messages */}
          <div className="axen-chat-messages">
            {chat.map((msg, index) => (
              <div key={index} style={{ display: "flex", flexDirection: msg.sender === "user" ? "row-reverse" : "row", alignItems: "flex-end", gap: "8px" }}>
                {msg.sender === "ai" && (
                  <div style={{ width: "30px", height: "30px", borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px" }}>🤖</div>
                )}
                <div style={{ maxWidth: "75%" }}>
                  <div style={{ padding: "10px 14px", borderRadius: msg.sender === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: msg.sender === "user" ? "linear-gradient(135deg, #3b82f6, #6366f1)" : "#f1f5f9", color: msg.sender === "user" ? "#fff" : "#0f172a", fontSize: "13px", lineHeight: "1.6", boxShadow: msg.sender === "user" ? "0 4px 12px rgba(59,130,246,0.25)" : "0 1px 4px rgba(0,0,0,0.06)", wordBreak: "break-word" }}>
                    {msg.text}
                  </div>
                  <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "3px", textAlign: msg.sender === "user" ? "right" : "left", padding: "0 4px" }}>{msg.time}</div>
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
                <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", flexShrink: 0 }}>🤖</div>
                <div style={{ padding: "12px 16px", background: "#f1f5f9", borderRadius: "16px 16px 16px 4px", display: "flex", gap: "5px", alignItems: "center" }}>
                  {[0, 1, 2].map((i) => <div key={i} style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#94a3b8", animation: "bounce 1.2s infinite", animationDelay: `${i * 0.2}s` }} />)}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="axen-chat-input-row">
            <input
              style={{ flex: 1, padding: "12px 16px", borderRadius: "50px", border: "1.5px solid #e2e8f0", fontSize: "13px", color: "#0f172a", background: "#f8fafc", outline: "none", transition: "border-color 0.15s", minWidth: 0 }}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={(e) => { e.target.style.borderColor = "#6366f1"; e.target.style.background = "#fff"; }}
              onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.background = "#f8fafc"; }}
              placeholder="Ask about mental training, focus, anxiety..."
              disabled={loading}
            />
            <button onClick={sendMessage} disabled={loading || !message.trim()}
              style={{ width: "44px", height: "44px", borderRadius: "50%", flexShrink: 0, background: loading || !message.trim() ? "#e2e8f0" : "linear-gradient(135deg, #3b82f6, #6366f1)", border: "none", cursor: loading || !message.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: !loading && message.trim() ? "0 4px 12px rgba(99,102,241,0.35)" : "none", transition: "all 0.18s ease" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
}