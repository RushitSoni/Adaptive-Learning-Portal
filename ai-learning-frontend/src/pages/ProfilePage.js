import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchProgress, logout } from "../app/slices/studentSlice";

const TREND_ICONS = { improving: "↑", declining: "↓", stable: "→" };
const TREND_COLORS = { improving: "#059669", declining: "#dc2626", stable: "#d97706" };

export default function ProfilePage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { profile, progress, loading } = useSelector((s) => s.student);

  useEffect(() => {
    if (profile?.student_id) dispatch(fetchProgress(profile.student_id));
  }, [profile, dispatch]);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/");
  };

  if (loading) return <div style={styles.center}>Loading progress...</div>;
  if (!profile) { navigate("/"); return null; }

  const tp = progress?.topic_progress || {};
  const weakAreas = progress?.weak_areas || [];

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button style={styles.back} onClick={() => navigate("/home")}>← Home</button>
        <h2 style={styles.title}>My Progress</h2>
        <button style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
      </div>

      <div style={styles.content}>
        {/* Profile card */}
        <div style={styles.profileCard}>
          <div style={styles.avatar}>{profile.name?.[0]?.toUpperCase()}</div>
          <div>
            <div style={styles.name}>{profile.name}</div>
            <div style={styles.statsRow}>
              <span style={styles.stat}>{progress?.total_quizzes ?? 0} quizzes taken</span>
              <span style={styles.statDot} />
              <span style={styles.stat}>{progress?.topics_completed?.length ?? 0} topics attempted</span>
            </div>
          </div>
        </div>

        {/* Weak areas */}
        {weakAreas.length > 0 && (
          <div style={styles.weakCard}>
            <h3 style={styles.sectionTitle}>Needs Attention</h3>
            <div style={styles.weakList}>
              {weakAreas.map((t) => (
                <div key={t} style={styles.weakItem}>
                  <span style={styles.weakTopic}>{t.charAt(0).toUpperCase() + t.slice(1)}</span>
                  <button style={styles.practiceBtn} onClick={() => navigate("/test", { state: { topic: t } })}>
                    Practice
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Topic breakdown */}
        <h3 style={styles.sectionTitle}>Topic Progress</h3>
        {Object.keys(tp).length === 0 ? (
          <div style={styles.empty}>No quiz history yet. Take a quiz to see your progress here.</div>
        ) : (
          <div style={styles.topicGrid}>
            {Object.entries(tp).map(([topic, data]) => (
              <div key={topic} style={styles.topicCard}>
                <div style={styles.topicHeader}>
                  <span style={styles.topicName}>{topic.charAt(0).toUpperCase() + topic.slice(1)}</span>
                  <span style={{ ...styles.trend, color: TREND_COLORS[data.trend] || "#6b7280" }}>
                    {TREND_ICONS[data.trend] || "→"} {data.trend}
                  </span>
                </div>

                <div style={styles.scoreBar}>
                  <div style={{
                    ...styles.scoreFill,
                    width: `${data.avg_score}%`,
                    background: data.avg_score >= 80 ? "#10b981" : data.avg_score >= 60 ? "#f59e0b" : "#ef4444"
                  }} />
                </div>

                <div style={styles.topicStats}>
                  <div style={styles.statItem}>
                    <div style={styles.statVal}>{data.avg_score}%</div>
                    <div style={styles.statLbl}>avg</div>
                  </div>
                  <div style={styles.statDivider} />
                  <div style={styles.statItem}>
                    <div style={styles.statVal}>{data.best_score}%</div>
                    <div style={styles.statLbl}>best</div>
                  </div>
                  <div style={styles.statDivider} />
                  <div style={styles.statItem}>
                    <div style={styles.statVal}>{data.attempts}</div>
                    <div style={styles.statLbl}>attempts</div>
                  </div>
                </div>

                <button style={styles.retakeBtn} onClick={() => navigate("/test", { state: { topic } })}>
                  Retake Quiz
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { background: "#f0faf4", minHeight: "100vh" },
  center: { color: "#6b7280", padding: 60, textAlign: "center", background: "#f0faf4", minHeight: "100vh" },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "16px 32px", borderBottom: "1.5px solid #d1fae5",
    background: "#ffffff", boxShadow: "0 1px 6px rgba(16,185,129,0.07)",
  },
  title: { color: "#064e3b", margin: 0, fontSize: 18, fontWeight: 800 },
  back: { background: "none", border: "none", color: "#059669", cursor: "pointer", fontSize: 14, fontWeight: 600 },
  logoutBtn: {
    padding: "6px 16px", background: "transparent",
    border: "1.5px solid #fca5a5", color: "#dc2626",
    borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600,
  },
  content: { maxWidth: 900, margin: "36px auto", padding: "0 28px" },
  profileCard: {
    display: "flex", alignItems: "center", gap: 20,
    background: "#ffffff", border: "1.5px solid #d1fae5",
    borderRadius: 16, padding: 28, marginBottom: 24,
    boxShadow: "0 2px 12px rgba(16,185,129,0.07)",
  },
  avatar: {
    width: 56, height: 56, borderRadius: 16,
    background: "linear-gradient(135deg, #10b981, #059669)",
    color: "#fff", fontWeight: 800, fontSize: 22,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  name: { color: "#064e3b", fontSize: 22, fontWeight: 800, marginBottom: 6 },
  statsRow: { display: "flex", alignItems: "center", gap: 10 },
  stat: { color: "#6b7280", fontSize: 13 },
  statDot: { width: 4, height: 4, borderRadius: "50%", background: "#d1d5db" },
  weakCard: {
    background: "#fff8f8", border: "1.5px solid #fecaca",
    borderRadius: 14, padding: 22, marginBottom: 28,
  },
  weakList: { display: "flex", flexDirection: "column", gap: 10, marginTop: 12 },
  weakItem: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  weakTopic: { color: "#b91c1c", fontWeight: 700, fontSize: 14 },
  practiceBtn: {
    padding: "6px 16px", background: "#fef2f2",
    color: "#b91c1c", border: "1.5px solid #fca5a5",
    borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600,
  },
  sectionTitle: { color: "#374151", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 18px" },
  empty: { color: "#9ca3af", textAlign: "center", padding: 48, background: "#fff", borderRadius: 12, border: "1.5px dashed #d1fae5" },
  topicGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 16 },
  topicCard: {
    background: "#ffffff", border: "1.5px solid #d1fae5",
    borderRadius: 14, padding: 20,
    boxShadow: "0 2px 10px rgba(16,185,129,0.06)",
  },
  topicHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  topicName: { color: "#064e3b", fontWeight: 700, fontSize: 15 },
  trend: { fontSize: 12, fontWeight: 700 },
  scoreBar: { height: 6, background: "#f0fdf4", borderRadius: 3, marginBottom: 16, border: "1px solid #d1fae5" },
  scoreFill: { height: "100%", borderRadius: 3, transition: "width 0.5s" },
  topicStats: { display: "flex", justifyContent: "space-around", marginBottom: 16, alignItems: "center" },
  statItem: { textAlign: "center" },
  statVal: { color: "#064e3b", fontWeight: 800, fontSize: 17 },
  statLbl: { color: "#9ca3af", fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, height: 28, background: "#e5e7eb" },
  retakeBtn: {
    width: "100%", padding: "8px",
    background: "#f0fdf4", color: "#059669",
    border: "1.5px solid #a7f3d0", borderRadius: 8,
    cursor: "pointer", fontSize: 13, fontWeight: 700,
  },
};