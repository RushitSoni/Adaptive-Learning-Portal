import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchSyllabus } from "../app/slices/syllabusSlice";
import { fetchProgress } from "../app/slices/studentSlice";

const TOPIC_ICONS = {
  loops: "LP", recursion: "RC", exceptions: "EX", functions: "FN",
  oop: "OO", variables: "VR", lists: "LS", dictionaries: "DC",
  strings: "ST", modules: "MD",
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
    if (score >= 80) return "#059669";
    if (score >= 60) return "#d97706";
    return "#dc2626";
  };

  const getScoreBg = (score) => {
    if (score >= 80) return "#d1fae5";
    if (score >= 60) return "#fef3c7";
    return "#fee2e2";
  };

  if (loading) return <div style={styles.center}>Loading syllabus...</div>;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Welcome back, {profile?.name}</h1>
          <p style={styles.sub}>Choose a topic to learn, quiz yourself, or ask the tutor.</p>
        </div>
        <div style={styles.headerActions}>
          <button style={styles.ghostBtn} onClick={() => navigate("/profile")}>
            My Progress
          </button>
          <button style={styles.primaryBtn} onClick={() => navigate("/chat")}>
            Ask Tutor
          </button>
        </div>
      </div>

      <div style={styles.grid}>
        {topics.map(({ topic, sections }) => {
          const tp = getTopicScore(topic);
          return (
            <div key={topic} style={styles.card}>
              <div style={styles.cardTop}>
                <div style={styles.iconBadge}>{TOPIC_ICONS[topic] || topic.slice(0,2).toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div style={styles.topicName}>{topic.charAt(0).toUpperCase() + topic.slice(1)}</div>
                  <div style={styles.sectionCount}>{sections.length} sections</div>
                </div>
                {tp && (
                  <div style={{ ...styles.scoreBadge, color: getScoreColor(tp.avg_score), background: getScoreBg(tp.avg_score) }}>
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
                  Study
                </button>
                <button style={styles.actionBtnPrimary} onClick={() => navigate("/test", { state: { topic } })}>
                  Quiz
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
  page: { padding: "32px 40px", background: "#f0faf4", minHeight: "100vh" },
  center: { color: "#6b7280", padding: 40, textAlign: "center", background: "#f0faf4", minHeight: "100vh" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 36 },
  title: { color: "#064e3b", fontSize: 26, fontWeight: 800, margin: "0 0 4px", letterSpacing: "-0.5px" },
  sub: { color: "#6b7280", fontSize: 14, margin: 0 },
  headerActions: { display: "flex", gap: 12, alignItems: "center" },
  primaryBtn: {
    padding: "10px 22px",
    background: "linear-gradient(135deg, #10b981, #059669)",
    color: "#fff", border: "none", borderRadius: 10,
    cursor: "pointer", fontWeight: 700, fontSize: 14,
    boxShadow: "0 2px 10px rgba(16,185,129,0.25)",
  },
  ghostBtn: {
    padding: "10px 22px", background: "#ffffff", color: "#059669",
    border: "1.5px solid #a7f3d0", borderRadius: 10, cursor: "pointer",
    fontWeight: 600, fontSize: 14,
  },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 20 },
  card: {
    background: "#ffffff", border: "1.5px solid #d1fae5",
    borderRadius: 16, padding: 22,
    boxShadow: "0 2px 12px rgba(16,185,129,0.07)",
    transition: "box-shadow 0.2s, transform 0.2s",
  },
  cardTop: { display: "flex", alignItems: "center", gap: 14, marginBottom: 14 },
  iconBadge: {
    width: 44, height: 44, borderRadius: 12,
    background: "linear-gradient(135deg, #d1fae5, #a7f3d0)",
    color: "#059669", fontWeight: 800, fontSize: 12,
    display: "flex", alignItems: "center", justifyContent: "center",
    letterSpacing: "0.05em", flexShrink: 0,
  },
  topicName: { color: "#064e3b", fontWeight: 700, fontSize: 16 },
  sectionCount: { color: "#9ca3af", fontSize: 12, marginTop: 2 },
  scoreBadge: {
    fontWeight: 700, fontSize: 14,
    padding: "3px 10px", borderRadius: 20,
  },
  progressBar: { height: 5, background: "#d1fae5", borderRadius: 3, marginBottom: 14 },
  progressFill: { height: "100%", borderRadius: 3, transition: "width 0.5s" },
  sections: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18 },
  sectionTag: {
    background: "#f0fdf4", color: "#059669", fontSize: 11,
    padding: "3px 9px", borderRadius: 6, border: "1px solid #d1fae5", fontWeight: 500,
  },
  cardActions: { display: "flex", gap: 8 },
  actionBtn: {
    flex: 1, padding: "9px", background: "#f9fafb", color: "#374151",
    border: "1.5px solid #e5e7eb", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600,
  },
  actionBtnPrimary: {
    flex: 1, padding: "9px",
    background: "linear-gradient(135deg, #10b981, #059669)",
    color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700,
  },
};