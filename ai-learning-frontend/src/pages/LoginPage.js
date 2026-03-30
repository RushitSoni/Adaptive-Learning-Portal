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
      <div style={styles.card}>
        <div style={styles.logo}>🐍</div>
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
          {loading ? "Setting up..." : "Start Learning →"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh", display: "flex", alignItems: "center",
    justifyContent: "center", background: "#0f0f1a",
  },
  card: {
    background: "#1a1a2e", border: "1px solid #2a2a4a",
    borderRadius: 16, padding: "48px 40px", width: 380,
    textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
  },
  logo: { fontSize: 56, marginBottom: 12 },
  title: { color: "#e2e8f0", fontSize: 28, fontWeight: 700, margin: "0 0 8px" },
  sub: { color: "#94a3b8", fontSize: 14, marginBottom: 32 },
  input: {
    width: "100%", padding: "12px 16px", borderRadius: 8,
    border: "1px solid #2a2a4a", background: "#0f0f1a",
    color: "#e2e8f0", fontSize: 16, marginBottom: 16,
    outline: "none", boxSizing: "border-box",
  },
  btn: {
    width: "100%", padding: "13px", borderRadius: 8,
    background: "#6366f1", color: "#fff", border: "none",
    fontSize: 16, fontWeight: 600, cursor: "pointer",
  },
};