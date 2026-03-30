import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchProgress, logout } from "../app/slices/studentSlice";

const TREND_ICONS = { improving: "📈", declining: "📉", stable: "➡️" };

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
        <h2 style={styles.title}>📊 My Progress</h2>
        <button style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
      </div>

      <div style={styles.content}>
        {/* Profile card */}
        <div style={styles.profileCard}>
          <div style={styles.avatar}>👤</div>
          <div>
            <div style={styles.name}>{profile.name}</div>
            <div style={styles.statsRow}>
              <span style={styles.stat}>{progress?.total_quizzes ?? 0} quizzes taken</span>
              <span style={styles.stat}>{progress?.topics_completed?.length ?? 0} topics attempted</span>
            </div>
          </div>
        </div>

        {/* Weak areas */}
        {weakAreas.length > 0 && (
          <div style={styles.weakCard}>
            <h3 style={styles.sectionTitle}>⚠️ Needs Attention</h3>
            <div style={styles.weakList}>
              {weakAreas.map((t) => (
                <div key={t} style={styles.weakItem}>
                  <span style={styles.weakTopic}>{t}</span>
                  <button style={styles.practiceBtn} onClick={() => navigate("/test", { state: { topic: t } })}>
                    Practice →
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
                  <span style={styles.trend}>{TREND_ICONS[data.trend]}</span>
                </div>

                <div style={styles.scoreBar}>
                  <div style={{
                    ...styles.scoreFill,
                    width: `${data.avg_score}%`,
                    background: data.avg_score >= 80 ? "#22c55e" : data.avg_score >= 60 ? "#f59e0b" : "#ef4444"
                  }} />
                </div>

                <div style={styles.topicStats}>
                  <div style={styles.statItem}>
                    <div style={styles.statVal}>{data.avg_score}%</div>
                    <div style={styles.statLbl}>avg</div>
                  </div>
                  <div style={styles.statItem}>
                    <div style={styles.statVal}>{data.best_score}%</div>
                    <div style={styles.statLbl}>best</div>
                  </div>
                  <div style={styles.statItem}>
                    <div style={styles.statVal}>{data.attempts}</div>
                    <div style={styles.statLbl}>attempts</div>
                  </div>
                </div>

                <button style={styles.retakeBtn} onClick={() => navigate("/test", { state: { topic } })}>
                  Retake Quiz →
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
  page: { background: "#0f0f1a", minHeight: "100vh" },
  center: { color: "#94a3b8", padding: 60, textAlign: "center" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", borderBottom: "1px solid #2a2a4a" },
  title: { color: "#e2e8f0", margin: 0, fontSize: 18 },
  back: { background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 14 },
  logoutBtn: { padding: "6px 14px", background: "transparent", border: "1px solid #ef4444", color: "#ef4444", borderRadius: 6, cursor: "pointer", fontSize: 13 },
  content: { maxWidth: 860, margin: "32px auto", padding: "0 24px" },
  profileCard: { display: "flex", alignItems: "center", gap: 20, background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 12, padding: 24, marginBottom: 24 },
  avatar: { fontSize: 40 },
  name: { color: "#e2e8f0", fontSize: 22, fontWeight: 700, marginBottom: 6 },
  statsRow: { display: "flex", gap: 20 },
  stat: { color: "#64748b", fontSize: 13 },
  weakCard: { background: "#1c1010", border: "1px solid #7f1d1d", borderRadius: 12, padding: 20, marginBottom: 24 },
  weakList: { display: "flex", flexDirection: "column", gap: 10, marginTop: 12 },
  weakItem: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  weakTopic: { color: "#fca5a5", fontWeight: 600, textTransform: "capitalize" },
  practiceBtn: { padding: "6px 14px", background: "#7f1d1d", color: "#fca5a5", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 },
  sectionTitle: { color: "#94a3b8", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 16px" },
  empty: { color: "#64748b", textAlign: "center", padding: 40 },
  topicGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 },
  topicCard: { background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 10, padding: 16 },
  topicHeader: { display: "flex", justifyContent: "space-between", marginBottom: 10 },
  topicName: { color: "#e2e8f0", fontWeight: 600 },
  trend: { fontSize: 16 },
  scoreBar: { height: 6, background: "#0f0f1a", borderRadius: 3, marginBottom: 14 },
  scoreFill: { height: "100%", borderRadius: 3, transition: "width 0.5s" },
  topicStats: { display: "flex", justifyContent: "space-around", marginBottom: 14 },
  statItem: { textAlign: "center" },
  statVal: { color: "#e2e8f0", fontWeight: 700, fontSize: 16 },
  statLbl: { color: "#64748b", fontSize: 11 },
  retakeBtn: { width: "100%", padding: "7px", background: "#0f0f1a", color: "#6366f1", border: "1px solid #6366f1", borderRadius: 6, cursor: "pointer", fontSize: 13 },
};