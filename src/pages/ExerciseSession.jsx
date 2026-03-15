import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { exercises } from "../data/exercises";
import { auth, db } from "../firebase/firebase";
import { doc, runTransaction } from "firebase/firestore";

/* ─────────────────────────────────────────────
   ALARM SOUND
   Place: public/sounds/alarm.mp3  (MP3 or OGG)
───────────────────────────────────────────── */
function playAlarm() {
  const audio = new Audio("/sounds/alarm.mp3");
  audio.play().catch(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const beep = (freq, start, dur) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.6, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur + 0.05);
      };
      beep(880, 0, 0.4);
      beep(660, 0.45, 0.4);
      beep(880, 0.9, 0.6);
    } catch (e) {
      console.warn("Could not play alarm:", e);
    }
  });
}

/* ─────────────────────────────────────────────
   FIRESTORE SAVE
───────────────────────────────────────────── */
async function saveExercise(id, exercise) {
  if (!auth.currentUser) return;
  const userRef = doc(db, "users", auth.currentUser.uid);
  await runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(userRef);
    const entry = {
      exerciseId: id,
      exerciseName: exercise.title,
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleDateString(),
    };
    if (!userDoc.exists()) {
      transaction.set(userRef, {
        exercisesDone: 1,
        sessionsCompleted: 1,
        exerciseHistory: [entry],
        routineStreak: 0,
        routine: {},
        motivation: { goals: [], strengths: [] },
      });
    } else {
      const d = userDoc.data();
      transaction.update(userRef, {
        exercisesDone: (d.exercisesDone || 0) + 1,
        sessionsCompleted: (d.sessionsCompleted || 0) + 1,
        exerciseHistory: [...(d.exerciseHistory || []), entry],
      });
    }
  });
}

/* ─────────────────────────────────────────────
   THEME
───────────────────────────────────────────── */
const theme = {
  bg: "linear-gradient(135deg, #1a3a8f 0%, #1e4fd8 50%, #2563eb 100%)",
  white: "#ffffff",
  whiteAlpha20: "rgba(255,255,255,0.20)",
  whiteAlpha10: "rgba(255,255,255,0.10)",
  whiteAlpha60: "rgba(255,255,255,0.60)",
  green: "#22c55e",
  font: "'Segoe UI', system-ui, sans-serif",
};

const pageStyle = {
  marginLeft: "220px",
  minHeight: "100vh",
  background: theme.bg,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: theme.font,
  padding: "32px 24px",
  boxSizing: "border-box",
};

const glassCard = {
  background: theme.whiteAlpha10,
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.25)",
  borderRadius: "20px",
  padding: "28px 32px",
  maxWidth: "560px",
  width: "100%",
  color: theme.white,
};

const btnBase = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "12px 28px",
  borderRadius: "50px",
  border: "none",
  fontSize: "15px",
  fontWeight: "700",
  cursor: "pointer",
  transition: "all 0.2s ease",
  letterSpacing: "0.3px",
};

const startBtn = { ...btnBase, background: theme.white, color: "#1e3a8a", boxShadow: "0 4px 16px rgba(0,0,0,0.2)" };
const pauseBtn = { ...btnBase, background: theme.whiteAlpha20, color: theme.white, border: "1.5px solid rgba(255,255,255,0.4)" };
const stopBtn  = { ...btnBase, background: "rgba(239,68,68,0.15)", color: "#fca5a5", border: "1.5px solid rgba(239,68,68,0.4)" };

/* ─────────────────────────────────────────────
   INSTRUCTION SCREEN
───────────────────────────────────────────── */
function InstructionScreen({ title, subtitle, points, onStart, startLabel }) {
  return (
    <div style={pageStyle} className="ex-session-page">
      <div style={glassCard}>
        <h2 style={{ fontSize: "26px", fontWeight: "800", color: theme.white, margin: "0 0 4px", textAlign: "center" }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ fontSize: "13px", color: theme.whiteAlpha60, textAlign: "center", margin: "0 0 20px" }}>
            {subtitle}
          </p>
        )}
        <div style={{ background: theme.whiteAlpha10, borderRadius: "14px", padding: "20px 24px", marginBottom: "24px" }}>
          <p style={{ fontSize: "12px", fontWeight: "700", color: "rgba(255,255,255,0.7)", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>
            Instructions
          </p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
            {points.map((pt, i) => (
              <li key={i} style={{ display: "flex", gap: "10px", fontSize: "14px", color: "rgba(255,255,255,0.85)", lineHeight: "1.5" }}>
                <span style={{ color: theme.green, flexShrink: 0 }}>✓</span>
                {pt}
              </li>
            ))}
          </ul>
        </div>
        <div style={{ textAlign: "center" }}>
          <button style={startBtn} onClick={onStart}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            {startLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   CONTROLS BAR
───────────────────────────────────────────── */
function Controls({ paused, onPause, onStop }) {
  return (
    <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
      <button style={pauseBtn} onClick={onPause}>
        {paused
          ? <><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>Resume</>
          : <><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>Pause</>
        }
      </button>
      <button style={stopBtn} onClick={onStop}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h12v12H6z" /></svg>
        Stop
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   BOX BREATHING

   MENTAL MODEL:
   ─────────────
   The square has 4 corners (0–3) and 4 sides (0–3).
   "side" = the side the ball is CURRENTLY TRAVELLING ALONG.

   corner positions (ball destination):
     0 = top-left      1 = top-right
     3 = bottom-left   2 = bottom-right

   side → label mapping (side = the side being crossed right now):
     side 0: top    (ball moving right,  corner 0→1) → INHALE
     side 1: right  (ball moving down,   corner 1→2) → HOLD
     side 2: bottom (ball moving left,   corner 2→3) → EXHALE
     side 3: left   (ball moving up,     corner 3→0) → HOLD

   On Start:
     • ball is at corner 0 (top-left), side 0 activates (Inhale, top highlighted)
     • immediately transition ball to corner 1 (top-right) over 4 s
     • after 4 s → ball at corner 1, side 1 activates (Hold, right highlighted)
     • repeat...

   So:  ballCorner = DESTINATION corner (where ball is heading / has just arrived)
        activeSide = side the ball just travelled = (ballCorner - 1 + 4) % 4
═══════════════════════════════════════════════ */

// Corner pixel positions [topFrac, leftFrac] × BOX_SIZE
const CORNERS = [
  [0, 0],  // 0: top-left
  [0, 1],  // 1: top-right
  [1, 1],  // 2: bottom-right
  [1, 0],  // 3: bottom-left
];

// Which side is being travelled when arriving at each corner
// arrive at corner 1 → came from corner 0 along the TOP side (side 0 = Inhale)
// arrive at corner 2 → came from corner 1 along the RIGHT side (side 1 = Hold)
// arrive at corner 3 → came from corner 2 along the BOTTOM side (side 2 = Exhale)
// arrive at corner 0 → came from corner 3 along the LEFT side (side 3 = Hold)
const CORNER_TO_SIDE = [3, 0, 1, 2]; // CORNER_TO_SIDE[destinationCorner] = activeSide

const SIDE_PHASES = ["Inhale", "Hold", "Exhale", "Hold"];
const SIDE_DESC   = [
  "Breathe in slowly…",
  "Hold your breath…",
  "Breathe out slowly…",
  "Hold your breath…",
];

const BOX  = 300; // px — inner square side length
const BALL = 40;  // px — ball diameter
const WRAP = BOX + BALL; // container size (ball centred on corners)

function BoxBreathing({ exercise, id }) {
  const navigate = useNavigate();
  const [started,  setStarted]  = useState(false);
  const [paused,   setPaused]   = useState(false);
  const [timeLeft, setTimeLeft] = useState(exercise.duration);
  // ballCorner: the corner the ball is currently AT (or heading to)
  // Starts at 1 because on mount we immediately transition from 0→1
  const [ballCorner, setBallCorner] = useState(0);
  const [activeSide, setActiveSide] = useState(0); // 0=top/Inhale
  const [cycle,      setCycle]      = useState(1);

  const pausedRef     = useRef(false);
  const intervalRef   = useRef(null);
  pausedRef.current   = paused;

  /* ── Countdown ── */
  useEffect(() => {
    if (!started) return;
    const t = setInterval(() => {
      if (pausedRef.current) return;
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(t); handleComplete(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [started]);

  /* ── Ball movement ──
     We want the ball to START MOVING immediately when started=true.
     Strategy: use a setTimeout for the very first move (fires at t=0, i.e. next
     animation frame), then setInterval every 4000 ms for subsequent moves.
     This means the ball begins transitioning to corner 1 instantly.
  ── */
  useEffect(() => {
    if (!started) return;

    function advance() {
      if (pausedRef.current) return;
      setBallCorner((prev) => {
        const next = (prev + 1) % 4;
        const side = CORNER_TO_SIDE[next];
        setActiveSide(side);
        if (next === 0) setCycle((c) => c + 1);
        return next;
      });
    }

    // Immediate first move (tiny delay so React has rendered the starting position)
    const firstMove = setTimeout(advance, 50);

    // Then repeat every 4 s
    intervalRef.current = setInterval(advance, 4000);

    return () => {
      clearTimeout(firstMove);
      clearInterval(intervalRef.current);
    };
  }, [started]);

  const handleComplete = useCallback(async () => {
    try { await saveExercise(id, exercise); } catch (e) { console.error(e); }
    alert("🎉 Box Breathing completed!");
    navigate("/exercises");
  }, [id, exercise, navigate]);

  const handleStop = () => {
    if (window.confirm("Stop exercise? Progress will not be saved.")) navigate("/exercises");
  };

  /* ── Pre-start ── */
  if (!started) {
    return (
      <InstructionScreen
        title="Box Breathing"
        subtitle="4-4-4-4 breathing pattern"
        points={[
          "Follow the white ball as it travels around the square",
          "Each side of the square takes exactly 4 seconds",
          "Top side (→): Inhale slowly through your nose",
          "Right side (↓): Hold your breath",
          "Bottom side (←): Exhale slowly through your mouth",
          "Left side (↑): Hold your breath again",
          "Repeat the cycle until the timer ends",
        ]}
        onStart={() => setStarted(true)}
        startLabel="Start Box Breathing"
      />
    );
  }

  /* ── Ball pixel position ── */
  const [topFrac, leftFrac] = CORNERS[ballCorner];
  const ballTop  = topFrac  * BOX; // 0 or BOX
  const ballLeft = leftFrac * BOX; // 0 or BOX

  /*
    Side highlight segments — draw 4 border segments as absolutely-positioned divs
    so we can highlight exactly one side at a time.
    activeSide: 0=top, 1=right, 2=bottom, 3=left
  */
  const borderR = 14; // border-radius of the square
  const segStyle = (side) => {
    const active = side === activeSide;
    const base = {
      position: "absolute",
      background: active ? "rgba(255,255,255,0.90)" : "rgba(255,255,255,0.22)",
      transition: "background 0.4s ease",
      borderRadius: "4px",
    };
    switch (side) {
      case 0: return { ...base, top: 0, left: borderR, right: borderR, height: "3px" };             // top
      case 1: return { ...base, top: borderR, right: 0, bottom: borderR, width: "3px" };             // right
      case 2: return { ...base, bottom: 0, left: borderR, right: borderR, height: "3px" };           // bottom
      case 3: return { ...base, top: borderR, left: 0, bottom: borderR, width: "3px" };              // left
      default: return base;
    }
  };

  // Corner dots
  const cornerDotStyle = (ci) => ({
    position: "absolute",
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.35)",
    zIndex: 5,
    ...(ci === 0 ? { top: "-5px",        left: "-5px" }        : {}),
    ...(ci === 1 ? { top: "-5px",        right: "-5px" }       : {}),
    ...(ci === 2 ? { bottom: "-5px",     right: "-5px" }       : {}),
    ...(ci === 3 ? { bottom: "-5px",     left: "-5px" }        : {}),
  });

  // Side text labels
  const sideLabelStyle = (side) => {
    const active = side === activeSide;
    const base = {
      position: "absolute",
      fontSize: "11px",
      fontWeight: "700",
      letterSpacing: "0.8px",
      textTransform: "uppercase",
      whiteSpace: "nowrap",
      color: active ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.20)",
      transition: "color 0.4s ease",
      pointerEvents: "none",
      zIndex: 4,
    };
    switch (side) {
      case 0: return { ...base, top: "10px",  left: "50%", transform: "translateX(-50%)" };
      case 1: return { ...base, top: "50%",   right: "10px", transform: "translateY(-50%) rotate(90deg)" };
      case 2: return { ...base, bottom: "10px", left: "50%", transform: "translateX(-50%)" };
      case 3: return { ...base, top: "50%",   left: "10px", transform: "translateY(-50%) rotate(-90deg)" };
      default: return base;
    }
  };

  const sideTexts = ["Inhale →", "Hold ↓", "Exhale ←", "Hold ↑"];

  return (
    <div style={pageStyle} className="ex-session-page">
      <style>{`
        @media (max-width: 768px) {
          .ex-session-page { margin-left: 0 !important; padding-top: 72px !important; }
        }
        @keyframes bb-glow {
          0%,100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.45), 0 4px 20px rgba(255,255,255,0.2); }
          50%      { box-shadow: 0 0 0 12px rgba(255,255,255,0), 0 4px 32px rgba(255,255,255,0.45); }
        }
        .bb-ball { animation: bb-glow 2s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <h2 style={{ fontSize: "28px", fontWeight: "800", color: theme.white, margin: "0 0 2px", textAlign: "center" }}>
        Box Breathing
      </h2>
      <p style={{ fontSize: "13px", color: theme.whiteAlpha60, margin: "0 0 6px", textAlign: "center" }}>
        Cycle {cycle}
      </p>

      {/* Timer */}
      <div style={{ fontSize: "54px", fontWeight: "900", color: theme.white, letterSpacing: "-2px", margin: "0 0 20px", textAlign: "center" }}>
        {timeLeft}s
      </div>

      {/* ── Square Box ── */}
      <div style={{ position: "relative", width: `${WRAP}px`, height: `${WRAP}px`, flexShrink: 0, margin: "0 auto 24px" }}>

        {/* Inner square: starts at BALL/2 offset so ball centres on corners */}
        <div style={{
          position: "absolute",
          top:    `${BALL / 2}px`,
          left:   `${BALL / 2}px`,
          width:  `${BOX}px`,
          height: `${BOX}px`,
          borderRadius: `${borderR}px`,
          background: "rgba(255,255,255,0.06)",
          backdropFilter: "blur(6px)",
        }}>
          {/* Highlighted side segments */}
          {[0, 1, 2, 3].map((s) => (
            <div key={s} style={segStyle(s)} />
          ))}

          {/* Corner dots */}
          {[0, 1, 2, 3].map((ci) => (
            <div key={ci} style={cornerDotStyle(ci)} />
          ))}

          {/* Side text labels */}
          {[0, 1, 2, 3].map((s) => (
            <div key={s} style={sideLabelStyle(s)}>{sideTexts[s]}</div>
          ))}
        </div>

        {/* Moving ball — positioned relative to the WRAP container */}
        <div
          className="bb-ball"
          style={{
            position: "absolute",
            width:  `${BALL}px`,
            height: `${BALL}px`,
            borderRadius: "50%",
            background: "#ffffff",
            // ballTop/ballLeft are fractions of BOX; add BALL/2 offset to align with inner square
            top:  `${ballTop}px`,
            left: `${ballLeft}px`,
            transition: `top 4000ms linear, left 4000ms linear`,
            zIndex: 10,
          }}
        />
      </div>

      {/* Phase label */}
      <div style={{ textAlign: "center", marginBottom: "22px" }}>
        <div style={{ fontSize: "34px", fontWeight: "800", color: theme.white, marginBottom: "4px" }}>
          {SIDE_PHASES[activeSide]}
        </div>
        <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.60)" }}>
          {paused ? "Paused — resume when ready" : SIDE_DESC[activeSide]}
        </div>
      </div>

      <Controls paused={paused} onPause={() => setPaused((p) => !p)} onStop={handleStop} />

      <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "12px", marginTop: "20px", textAlign: "center", maxWidth: "360px" }}>
        Focus on the ball and breathe along with its movement around the box. Each side lasts 4 seconds.
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   2 MINUTE RELAXATION
═══════════════════════════════════════════════ */
function Relaxation({ exercise, id }) {
  const navigate = useNavigate();
  const [started,  setStarted]  = useState(false);
  const [paused,   setPaused]   = useState(false);
  const [timeLeft, setTimeLeft] = useState(exercise.duration);
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  const handleComplete = useCallback(async () => {
    playAlarm();
    try { await saveExercise(id, exercise); } catch (e) { console.error(e); }
    alert("🎉 Relaxation completed! Great job.");
    navigate("/exercises");
  }, [id, exercise, navigate]);

  useEffect(() => {
    if (!started) return;
    const t = setInterval(() => {
      if (pausedRef.current) return;
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(t); handleComplete(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [started, handleComplete]);

  const handleStop = () => {
    if (window.confirm("Stop relaxation? This session will not be recorded.")) navigate("/exercises");
  };

  const pct  = exercise.duration > 0 ? ((exercise.duration - timeLeft) / exercise.duration) * 100 : 0;
  const r    = 80;
  const circ = 2 * Math.PI * r;

  if (!started) {
    return (
      <InstructionScreen
        title="2 Minute Relaxation"
        points={[
          "Find a comfortable seated or lying position",
          "Close your eyes gently",
          "Take a deep breath in through your nose",
          "Exhale slowly through your mouth",
          "Let your body relax completely",
          "Focus on releasing tension from each muscle",
          "An alarm will sound when the session ends",
        ]}
        onStart={() => setStarted(true)}
        startLabel="Start Relaxation"
      />
    );
  }

  return (
    <div style={pageStyle} className="ex-session-page">
      <style>{`
        @media (max-width: 768px) { .ex-session-page { margin-left: 0 !important; padding-top: 72px !important; } }
        @keyframes relax-glow {
          0%,100% { box-shadow: 0 0 40px 8px rgba(255,255,255,0.08); }
          50%      { box-shadow: 0 0 80px 20px rgba(255,255,255,0.18); }
        }
        .relax-circle { animation: relax-glow 4s ease-in-out infinite; }
      `}</style>

      <h2 style={{ fontSize: "28px", fontWeight: "800", color: theme.white, margin: "0 0 4px", textAlign: "center" }}>
        2 Minute Relaxation
      </h2>
      <p style={{ fontSize: "13px", color: theme.whiteAlpha60, textAlign: "center", margin: "0 0 20px" }}>
        {paused ? "Paused" : "Relax… Eyes closed… Breathe naturally…"}
      </p>

      <div style={{ position: "relative", width: "200px", height: "200px", margin: "0 auto 24px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="200" height="200" style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}>
          <circle cx="100" cy="100" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="8" />
          <circle cx="100" cy="100" r={r} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="8"
            strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ}
            strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s linear" }} />
        </svg>
        <div className="relax-circle" style={{ width: "140px", height: "140px", borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
          <div style={{ fontSize: "36px", fontWeight: "900", color: theme.white }}>{timeLeft}s</div>
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", marginTop: "2px" }}>remaining</div>
        </div>
      </div>

      <div style={{ fontSize: "52px", marginBottom: "20px", textAlign: "center" }}>🧘</div>
      <Controls paused={paused} onPause={() => setPaused((p) => !p)} onStop={handleStop} />
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", marginTop: "20px", textAlign: "center" }}>
        An alarm will sound when your session is complete.
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   FOCUS RESET
═══════════════════════════════════════════════ */
function FocusReset({ exercise, id }) {
  const navigate = useNavigate();
  const [started,  setStarted]  = useState(false);
  const [paused,   setPaused]   = useState(false);
  const [timeLeft, setTimeLeft] = useState(exercise.duration);
  const [phase,    setPhase]    = useState("inhale");
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  const handleComplete = useCallback(async () => {
    try { await saveExercise(id, exercise); } catch (e) { console.error(e); }
    alert("🎉 Focus Reset completed!");
    navigate("/exercises");
  }, [id, exercise, navigate]);

  useEffect(() => {
    if (!started) return;
    const t = setInterval(() => {
      if (pausedRef.current) return;
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(t); handleComplete(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [started, handleComplete]);

  useEffect(() => {
    if (!started) return;
    const t = setInterval(() => {
      if (pausedRef.current) return;
      setPhase((p) => (p === "inhale" ? "exhale" : "inhale"));
    }, 5000);
    return () => clearInterval(t);
  }, [started]);

  const handleStop = () => {
    if (window.confirm("Stop exercise? This session will not be recorded.")) navigate("/exercises");
  };

  if (!started) {
    return (
      <InstructionScreen
        title="Focus Reset"
        points={[
          "Sit comfortably with your back straight",
          "Place one hand on your chest, one on your belly",
          "Inhale slowly for 5 seconds through your nose",
          "Exhale slowly for 5 seconds through your mouth",
          "Focus only on your breathing",
          "Let thoughts pass without judgment",
        ]}
        onStart={() => setStarted(true)}
        startLabel="Start Focus Reset"
      />
    );
  }

  const isInhale = phase === "inhale";

  return (
    <div style={pageStyle} className="ex-session-page">
      <style>{`
        @media (max-width: 768px) { .ex-session-page { margin-left: 0 !important; padding-top: 72px !important; } }
        @keyframes fr-in  { 0% { transform: scale(0.85); opacity: 0.7; } 100% { transform: scale(1.45); opacity: 1; } }
        @keyframes fr-out { 0% { transform: scale(1.45); opacity: 1;   } 100% { transform: scale(0.85); opacity: 0.7; } }
        .fr-in  { animation: fr-in  5s ease-in-out forwards; }
        .fr-out { animation: fr-out 5s ease-in-out forwards; }
      `}</style>

      <h2 style={{ fontSize: "28px", fontWeight: "800", color: theme.white, margin: "0 0 4px", textAlign: "center" }}>Focus Reset</h2>
      <p style={{ fontSize: "13px", color: theme.whiteAlpha60, textAlign: "center", margin: "0 0 20px" }}>
        {paused ? "Paused" : "Follow the circle's rhythm"}
      </p>

      <div style={{ position: "relative", width: "220px", height: "220px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
        <div style={{ position: "absolute", inset: "-16px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.12)", transition: "transform 5s ease-in-out", transform: isInhale ? "scale(1.2)" : "scale(0.85)" }} />
        <div style={{ position: "absolute", inset: "-4px",  borderRadius: "50%", border: "2px solid rgba(255,255,255,0.22)", transition: "transform 5s ease-in-out", transform: isInhale ? "scale(1.15)" : "scale(0.88)" }} />
        <div key={phase} className={isInhale ? "fr-in" : "fr-out"}
          style={{ width: "130px", height: "130px", borderRadius: "50%", background: "#ffffff", boxShadow: "0 0 60px rgba(255,255,255,0.3)" }} />
      </div>

      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <div style={{ fontSize: "32px", fontWeight: "800", color: theme.white, marginBottom: "4px" }}>
          {paused ? "Paused" : isInhale ? "Inhale (5s)" : "Exhale (5s)"}
        </div>
        <div style={{ fontSize: "52px", fontWeight: "900", color: theme.white, letterSpacing: "-2px", margin: "8px 0 4px" }}>{timeLeft}s</div>
        <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)" }}>
          {isInhale ? "Breathe in through your nose" : "Breathe out through your mouth"}
        </div>
      </div>

      <Controls paused={paused} onPause={() => setPaused((p) => !p)} onStop={handleStop} />
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", marginTop: "20px", textAlign: "center" }}>
        Focus on the circle and breathe along with its expansion and contraction. Each phase lasts 5 seconds.
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   PERFORMANCE VISUALISATION
═══════════════════════════════════════════════ */
function Visualisation({ exercise, id }) {
  const navigate = useNavigate();
  const [started,  setStarted]  = useState(false);
  const [paused,   setPaused]   = useState(false);
  const [timeLeft, setTimeLeft] = useState(exercise.duration);
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  const handleComplete = useCallback(async () => {
    playAlarm();
    try { await saveExercise(id, exercise); } catch (e) { console.error(e); }
    alert("🎉 Performance Visualisation completed!");
    navigate("/exercises");
  }, [id, exercise, navigate]);

  useEffect(() => {
    if (!started) return;
    const t = setInterval(() => {
      if (pausedRef.current) return;
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(t); handleComplete(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [started, handleComplete]);

  const handleStop = () => {
    if (window.confirm("Stop exercise? This session will not be recorded.")) navigate("/exercises");
  };

  const pct  = exercise.duration > 0 ? ((exercise.duration - timeLeft) / exercise.duration) * 100 : 0;
  const r    = 80;
  const circ = 2 * Math.PI * r;

  if (!started) {
    return (
      <InstructionScreen
        title="Performance Visualisation"
        points={[
          "Find a quiet, comfortable place to sit or lie down",
          "Close your eyes and take three deep breaths",
          "Visualize yourself performing at your peak",
          "See yourself executing skills perfectly",
          "Feel the confidence and success in your body",
          "Imagine the crowd, the atmosphere, the victory",
          "Hold this image clearly for the full 3 minutes",
          "An alarm will sound when the session ends",
        ]}
        onStart={() => setStarted(true)}
        startLabel="Start Visualisation"
      />
    );
  }

  return (
    <div style={{ ...pageStyle, background: "linear-gradient(160deg, #1e0a4e 0%, #2d1580 50%, #3730a3 100%)" }} className="ex-session-page">
      <style>{`
        @media (max-width: 768px) { .ex-session-page { margin-left: 0 !important; padding-top: 72px !important; } }
        @keyframes vis-star { 0%,100%{opacity:.3;transform:scale(.9)} 50%{opacity:1;transform:scale(1.1)} }
        .vs1 { animation: vis-star 2.5s ease-in-out infinite; }
        .vs2 { animation: vis-star 2.5s ease-in-out infinite; animation-delay:.8s; }
        .vs3 { animation: vis-star 2.5s ease-in-out infinite; animation-delay:1.6s; }
      `}</style>

      <h2 style={{ fontSize: "28px", fontWeight: "800", color: theme.white, margin: "0 0 4px", textAlign: "center" }}>Performance Visualisation</h2>
      <p style={{ fontSize: "13px", color: theme.whiteAlpha60, textAlign: "center", margin: "0 0 16px" }}>
        {paused ? "Paused" : "See it… Feel it… Believe it…"}
      </p>

      <div style={{ display: "flex", gap: "20px", marginBottom: "16px" }}>
        <span className="vs1" style={{ fontSize: "32px" }}>✨</span>
        <span className="vs2" style={{ fontSize: "32px" }}>🏆</span>
        <span className="vs3" style={{ fontSize: "32px" }}>⭐</span>
      </div>

      <div style={{ position: "relative", width: "200px", height: "200px", margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="200" height="200" style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}>
          <circle cx="100" cy="100" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="8" />
          <circle cx="100" cy="100" r={r} fill="none" stroke="rgba(167,139,250,0.9)" strokeWidth="8"
            strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ}
            strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s linear" }} />
        </svg>
        <div style={{ width: "140px", height: "140px", borderRadius: "50%", background: "rgba(139,92,246,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", border: "1px solid rgba(167,139,250,0.3)" }}>
          <div style={{ fontSize: "36px", fontWeight: "900", color: theme.white }}>{timeLeft}s</div>
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", marginTop: "2px" }}>remaining</div>
        </div>
      </div>

      <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: "14px", padding: "16px 24px", maxWidth: "380px", width: "100%", marginBottom: "20px" }}>
        {[
          "You performing at your absolute best",
          "Every movement executed perfectly",
          "Achieving your goals with confidence",
          "The feeling of victory and success",
        ].map((line, i) => (
          <div key={i} style={{ fontSize: "13px", color: "rgba(255,255,255,0.75)", padding: "5px 0", display: "flex", gap: "8px" }}>
            <span style={{ color: "#a78bfa" }}>✦</span> {line}
          </div>
        ))}
      </div>

      <Controls paused={paused} onPause={() => setPaused((p) => !p)} onStop={handleStop} />
      <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "12px", marginTop: "20px", textAlign: "center" }}>
        Keep your eyes closed. An alarm will sound when your session is complete.
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN ROUTER
═══════════════════════════════════════════════ */
export default function ExerciseSession() {
  const { id } = useParams();
  const navigate = useNavigate();
  const exercise = exercises.find((e) => e.id === id);

  if (!exercise) {
    return (
      <div style={pageStyle}>
        <Navbar />
        <div style={{ color: "#fff", textAlign: "center" }}>
          <h2>Exercise not found</h2>
          <button style={startBtn} onClick={() => navigate("/exercises")}>Back to Exercises</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      {id === "box-breathing" && <BoxBreathing  exercise={exercise} id={id} />}
      {id === "relaxation"    && <Relaxation    exercise={exercise} id={id} />}
      {id === "focus-reset"   && <FocusReset    exercise={exercise} id={id} />}
      {id === "visualisation" && <Visualisation exercise={exercise} id={id} />}
    </>
  );
}