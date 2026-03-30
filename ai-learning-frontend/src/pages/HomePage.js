import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchSyllabus } from "../app/slices/syllabusSlice";
import { fetchProgress } from "../app/slices/studentSlice";

const TOPIC_ICONS = {
  loops: "🔄", recursion: "♾️", exceptions: "⚠️", functions: "⚡",
  oop: "🧩", variables: "📦", lists: "📋", dictionaries: "📚",
  strings: "🔤", modules: "🧰",
};

export default function HomePage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { topics, loading } = useSelector((s) => s.syllabus);
  const { profile, progress } = useSelector((s) => s.student);

  useEffect(() => {
    dispatch(fetchSyllabus());
    if (profile?.student_id) dispatch(fetchProgress(profile.student_id));
  }, [dispatch, profile]);

  const getTopicScore = (topic) => {
    const tp = progress?.topic_progress?.[topic];
    if (!tp) return null;
    return tp;
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "#22c55e";
    if (score >= 60) return "#f59e0b";
    return "#ef4444";
  };

  if (loading) return <div style={styles.center}>Loading syllabus...</div>;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Welcome back, {profile?.name} 👋</h1>
          <p style={styles.sub}>Choose a topic to learn, quiz yourself, or ask the tutor.</p>
        </div>
        <div style={styles.headerActions}>
          <button style={styles.ghostBtn} onClick={() => navigate("/profile")}>
            My Progress
          </button>
          <button style={styles.primaryBtn} onClick={() => navigate("/chat")}>
            Ask Tutor 💬
          </button>
        </div>
      </div>

      <div style={styles.grid}>
        {topics.map(({ topic, sections }) => {
          const tp = getTopicScore(topic);
          return (
            <div key={topic} style={styles.card}>
              <div style={styles.cardTop}>
                <span style={styles.icon}>{TOPIC_ICONS[topic] || "📖"}</span>
                <div>
                  <div style={styles.topicName}>{topic.charAt(0).toUpperCase() + topic.slice(1)}</div>
                  <div style={styles.sectionCount}>{sections.length} sections</div>
                </div>
                {tp && (
                  <div style={{ ...styles.scoreBadge, color: getScoreColor(tp.avg_score) }}>
                    {tp.avg_score}%
                  </div>
                )}
              </div>

              {tp && (
                <div style={styles.progressBar}>
                  <div style={{ ...styles.progressFill, width: `${tp.avg_score}%`, background: getScoreColor(tp.avg_score) }} />
                </div>
              )}

              <div style={styles.sections}>
                {sections.slice(0, 3).map((s, i) => (
                  <span key={i} style={styles.sectionTag}>{s}</span>
                ))}
                {sections.length > 3 && <span style={styles.sectionTag}>+{sections.length - 3} more</span>}
              </div>

              <div style={styles.cardActions}>
                <button style={styles.actionBtn} onClick={() => navigate("/study", { state: { topic } })}>
                  Study 📖
                </button>
                <button style={styles.actionBtnPrimary} onClick={() =>
                  navigate("/test", { state: { topic } })
                }>
                  Quiz 🎯
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  page: { padding: "32px 40px", background: "#0f0f1a", minHeight: "100vh" },
  center: { color: "#94a3b8", padding: 40, textAlign: "center" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 },
  title: { color: "#e2e8f0", fontSize: 24, fontWeight: 700, margin: "0 0 4px" },
  sub: { color: "#64748b", fontSize: 14, margin: 0 },
  headerActions: { display: "flex", gap: 12 },
  primaryBtn: { padding: "10px 20px", background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 },
  ghostBtn: { padding: "10px 20px", background: "transparent", color: "#94a3b8", border: "1px solid #2a2a4a", borderRadius: 8, cursor: "pointer" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 },
  card: { background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 12, padding: 20 },
  cardTop: { display: "flex", alignItems: "center", gap: 12, marginBottom: 12 },
  icon: { fontSize: 28 },
  topicName: { color: "#e2e8f0", fontWeight: 600, fontSize: 16 },
  sectionCount: { color: "#64748b", fontSize: 12 },
  scoreBadge: { marginLeft: "auto", fontWeight: 700, fontSize: 16 },
  progressBar: { height: 4, background: "#2a2a4a", borderRadius: 2, marginBottom: 12 },
  progressFill: { height: "100%", borderRadius: 2, transition: "width 0.5s" },
  sections: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 },
  sectionTag: { background: "#0f0f1a", color: "#64748b", fontSize: 11, padding: "3px 8px", borderRadius: 4, border: "1px solid #2a2a4a" },
  cardActions: { display: "flex", gap: 8 },
  actionBtn: { flex: 1, padding: "8px", background: "transparent", color: "#94a3b8", border: "1px solid #2a2a4a", borderRadius: 6, cursor: "pointer", fontSize: 13 },
  actionBtnPrimary: { flex: 1, padding: "8px", background: "#6366f1", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 },
};