import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import API from "../services/api";

export default function StudyPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const topic = location.state?.topic;

  const [sections, setSections] = useState([]);
  const [activeSection, setActiveSection] = useState(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!topic) { navigate("/home"); return; }

    const fetchContent = async () => {
      setLoading(true);
      try {
        const res = await API.get(`/syllabus/${topic}`);
        setContent(res.data.content);
        const headings = [...res.data.content.matchAll(/^## (.+)/gm)]
          .map((m) => m[1].trim());
        setSections(headings);
        setActiveSection(headings[0] || null);
      } catch (e) {
        setError("Could not load content for this topic.");
      }
      setLoading(false);
    };

    fetchContent();
  }, [topic, navigate]);

  const handleSectionClick = (section) => {
    setActiveSection(section);
    const el = document.getElementById(`section-${section.replace(/\s+/g, "-")}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (loading) return <div style={styles.center}>Loading {topic}...</div>;
  if (error) return <div style={styles.center}>{error}</div>;

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <button style={styles.back} onClick={() => navigate("/home")}>← Home</button>
        <div style={styles.topbarCenter}>
          <span style={styles.topicBadge}>{topic?.charAt(0).toUpperCase() + topic?.slice(1)}</span>
          <span style={styles.topbarTitle}>Study Material</span>
        </div>
        <div style={styles.topbarActions}>
          <button style={styles.quizBtn} onClick={() => navigate("/test", { state: { topic } })}>
            Take Quiz
          </button>
          <button style={styles.chatBtn} onClick={() => navigate("/chat", { state: { topic } })}>
            Ask Tutor
          </button>
        </div>
      </div>

      <div style={styles.layout}>
        <div style={styles.sidebar}>
          <div style={styles.sidebarTitle}>Sections</div>
          {sections.map((s) => (
            <button
              key={s}
              style={{ ...styles.sidebarItem, ...(activeSection === s ? styles.sidebarItemActive : {}) }}
              onClick={() => handleSectionClick(s)}
            >
              {s}
            </button>
          ))}
        </div>

        <div style={styles.content}>
          <ReactMarkdown
            components={{
              h2: ({ children }) => {
                const text = String(children);
                const id = `section-${text.replace(/\s+/g, "-")}`;
                return <h2 id={id} style={styles.h2}>{children}</h2>;
              },
              h1: ({ children }) => <h1 style={styles.h1}>{children}</h1>,
              h3: ({ children }) => <h3 style={styles.h3}>{children}</h3>,
              p: ({ children }) => <p style={styles.p}>{children}</p>,
              ul: ({ children }) => <ul style={styles.ul}>{children}</ul>,
              li: ({ children }) => <li style={styles.li}>{children}</li>,
              code: ({ inline, children }) =>
                inline
                  ? <code style={styles.inlineCode}>{children}</code>
                  : <pre style={styles.codeBlock}><code style={{ color: "#064e3b" }}>{children}</code></pre>,
              strong: ({ children }) => <strong style={{ color: "#064e3b" }}>{children}</strong>,
              table: ({ children }) => <table style={styles.table}>{children}</table>,
              th: ({ children }) => <th style={styles.th}>{children}</th>,
              td: ({ children }) => <td style={styles.td}>{children}</td>,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { background: "#f0faf4", minHeight: "100vh", display: "flex", flexDirection: "column" },
  center: { color: "#6b7280", padding: 60, textAlign: "center", background: "#f0faf4", minHeight: "100vh" },
  topbar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "14px 28px", borderBottom: "1.5px solid #d1fae5",
    background: "#ffffff", flexShrink: 0,
    boxShadow: "0 1px 6px rgba(16,185,129,0.07)",
  },
  back: { background: "none", border: "none", color: "#059669", cursor: "pointer", fontSize: 14, fontWeight: 600 },
  topbarCenter: { display: "flex", alignItems: "center", gap: 10 },
  topicBadge: {
    background: "#d1fae5", color: "#059669", fontSize: 12, fontWeight: 700,
    padding: "4px 12px", borderRadius: 20, textTransform: "capitalize",
  },
  topbarTitle: { color: "#6b7280", fontSize: 15 },
  topbarActions: { display: "flex", gap: 10 },
  quizBtn: {
    padding: "8px 18px", background: "#fff",
    color: "#059669", border: "1.5px solid #a7f3d0",
    borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700,
  },
  chatBtn: {
    padding: "8px 18px",
    background: "linear-gradient(135deg, #10b981, #059669)",
    color: "#fff", border: "none",
    borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700,
  },
  layout: { display: "flex", flex: 1, overflow: "hidden" },
  sidebar: {
    width: 230, padding: "24px 14px",
    borderRight: "1.5px solid #d1fae5",
    overflowY: "auto", flexShrink: 0, background: "#ffffff",
  },
  sidebarTitle: {
    color: "#9ca3af", fontSize: 11, fontWeight: 700,
    textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12,
    paddingLeft: 10,
  },
  sidebarItem: {
    display: "block", width: "100%", textAlign: "left",
    padding: "9px 12px", marginBottom: 3, borderRadius: 8,
    background: "transparent", border: "none", color: "#6b7280",
    cursor: "pointer", fontSize: 13, lineHeight: 1.4, fontWeight: 500,
  },
  sidebarItemActive: {
    background: "#d1fae5", color: "#059669", fontWeight: 700,
  },
  content: { flex: 1, overflowY: "auto", padding: "44px 64px", maxWidth: 860, background: "#ffffff" },
  h1: { color: "#064e3b", fontSize: 28, fontWeight: 800, marginBottom: 8, marginTop: 0, letterSpacing: "-0.5px" },
  h2: {
    color: "#059669", fontSize: 20, fontWeight: 700,
    marginTop: 44, marginBottom: 14, paddingBottom: 10,
    borderBottom: "2px solid #d1fae5",
  },
  h3: { color: "#065f46", fontSize: 16, fontWeight: 700, marginTop: 28, marginBottom: 10 },
  p: { color: "#374151", fontSize: 15, lineHeight: 1.85, marginBottom: 18 },
  ul: { paddingLeft: 24, marginBottom: 18 },
  li: { color: "#374151", fontSize: 15, lineHeight: 1.8, marginBottom: 6 },
  inlineCode: {
    background: "#d1fae5", color: "#065f46",
    padding: "2px 7px", borderRadius: 5,
    fontSize: 13, fontFamily: "monospace", fontWeight: 600,
  },
  codeBlock: {
    background: "#f0fdf4", border: "1.5px solid #a7f3d0",
    borderRadius: 10, padding: "18px 22px",
    overflowX: "auto", marginBottom: 22, marginTop: 10,
    fontSize: 13, fontFamily: "monospace", lineHeight: 1.7,
  },
  table: { borderCollapse: "collapse", width: "100%", marginBottom: 22 },
  th: { background: "#d1fae5", color: "#064e3b", padding: "11px 16px", textAlign: "left", fontSize: 13, fontWeight: 700, border: "1px solid #a7f3d0" },
  td: { color: "#374151", padding: "10px 16px", fontSize: 13, border: "1px solid #e5e7eb" },
};
