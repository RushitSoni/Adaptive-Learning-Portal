import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { registerStudent } from "../app/slices/studentSlice";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    if (!name.trim()) return;
    setLoading(true);
    await dispatch(registerStudent(name.trim()));
    setLoading(false);
    navigate("/home");
  };

  return (
    <div style={styles.page}>
      <div style={styles.bgPattern} />
      <div style={styles.card}>
        <div style={styles.logoWrap}>
          <div style={styles.logo}>Py</div>
        </div>
        <h1 style={styles.title}>Python Tutor</h1>
        <p style={styles.sub}>Adaptive learning — doubt solving, quizzes, code</p>
        <input
          style={styles.input}
          placeholder="Enter your name to begin"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleStart()}
        />
        <button
          style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }}
          onClick={handleStart}
          disabled={loading}
        >
          {loading ? "Setting up..." : "Start Learning"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh", display: "flex", alignItems: "center",
    justifyContent: "center", background: "#f0faf4", position: "relative", overflow: "hidden",
  },
  bgPattern: {
    position: "absolute", inset: 0,
    backgroundImage: "radial-gradient(circle at 20% 20%, #bbf7d0 0%, transparent 50%), radial-gradient(circle at 80% 80%, #d1fae5 0%, transparent 50%)",
    pointerEvents: "none",
  },
  card: {
    position: "relative", zIndex: 1,
    background: "#ffffff", border: "1px solid #bbf7d0",
    borderRadius: 20, padding: "52px 44px", width: 400,
    textAlign: "center", boxShadow: "0 8px 40px rgba(16,185,129,0.12)",
  },
  logoWrap: {
    display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  logo: {
    width: 64, height: 64, borderRadius: 16,
    background: "linear-gradient(135deg, #10b981, #059669)",
    color: "#fff", fontWeight: 800, fontSize: 22,
    display: "flex", alignItems: "center", justifyContent: "center",
    letterSpacing: "-1px",
    boxShadow: "0 4px 16px rgba(16,185,129,0.35)",
  },
  title: { color: "#064e3b", fontSize: 28, fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.5px" },
  sub: { color: "#6b7280", fontSize: 14, marginBottom: 32, lineHeight: 1.5 },
  input: {
    width: "100%", padding: "13px 16px", borderRadius: 10,
    border: "1.5px solid #a7f3d0", background: "#f0fdf4",
    color: "#064e3b", fontSize: 15, marginBottom: 14,
    outline: "none", boxSizing: "border-box",
    transition: "border-color 0.2s",
  },
  btn: {
    width: "100%", padding: "14px", borderRadius: 10,
    background: "linear-gradient(135deg, #10b981, #059669)",
    color: "#fff", border: "none",
    fontSize: 15, fontWeight: 700, cursor: "pointer",
    boxShadow: "0 4px 16px rgba(16,185,129,0.3)",
    letterSpacing: "0.02em",
  },
};
