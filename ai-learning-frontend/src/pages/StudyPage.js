import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { summariseTopic } from "../services/api";
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

  // Fetch full .md content from backend
  useEffect(() => {
    if (!topic) { navigate("/home"); return; }

    const fetchContent = async () => {
      setLoading(true);
      try {
        const res = await API.get(`/syllabus/${topic}`);
        setContent(res.data.content);

        // Parse ## headings for sidebar nav
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

  // Scroll to section when sidebar item clicked
  const handleSectionClick = (section) => {
    setActiveSection(section);
    const el = document.getElementById(`section-${section.replace(/\s+/g, "-")}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (loading) return <div style={styles.center}>Loading {topic}...</div>;
  if (error)   return <div style={styles.center} >{error}</div>;

  return (
    <div style={styles.page}>

      {/* Top bar */}
      <div style={styles.topbar}>
        <button style={styles.back} onClick={() => navigate("/home")}>← Home</button>
        <div style={styles.topbarCenter}>
          <span style={styles.topicBadge}>{topic?.charAt(0).toUpperCase() + topic?.slice(1)}</span>
          <span style={styles.topbarTitle}>Study Material</span>
        </div>
        <div style={styles.topbarActions}>
          <button style={styles.quizBtn} onClick={() => navigate("/test", { state: { topic } })}>
            Take Quiz 🎯
          </button>
          <button style={styles.chatBtn} onClick={() => navigate("/chat", { state: { topic } })}>
            Ask Tutor 💬
          </button>
        </div>
      </div>

      <div style={styles.layout}>

        {/* Sidebar — section nav */}
        <div style={styles.sidebar}>
          <div style={styles.sidebarTitle}>Sections</div>
          {sections.map((s) => (
            <button
              key={s}
              style={{
                ...styles.sidebarItem,
                ...(activeSection === s ? styles.sidebarItemActive : {})
              }}
              onClick={() => handleSectionClick(s)}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Main content */}
        <div style={styles.content}>
          <ReactMarkdown
            components={{
              // Add id anchors to ## headings for scroll-to
              h2: ({ children }) => {
                const text = String(children);
                const id = `section-${text.replace(/\s+/g, "-")}`;
                return (
                  <h2 id={id} style={styles.h2}>
                    {children}
                  </h2>
                );
              },
              h1: ({ children }) => <h1 style={styles.h1}>{children}</h1>,
              h3: ({ children }) => <h3 style={styles.h3}>{children}</h3>,
              p:  ({ children }) => <p style={styles.p}>{children}</p>,
              ul: ({ children }) => <ul style={styles.ul}>{children}</ul>,
              li: ({ children }) => <li style={styles.li}>{children}</li>,
              code: ({ inline, children }) =>
                inline
                  ? <code style={styles.inlineCode}>{children}</code>
                  : <pre style={styles.codeBlock}><code style={{ color: "#a5f3fc" }}>{children}</code></pre>,
              strong: ({ children }) => <strong style={{ color: "#e2e8f0" }}>{children}</strong>,
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
  page: { background: "#0f0f1a", minHeight: "100vh", display: "flex", flexDirection: "column" },
  center: { color: "#94a3b8", padding: 60, textAlign: "center", background: "#0f0f1a", minHeight: "100vh" },

  topbar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "14px 28px", borderBottom: "1px solid #2a2a4a", flexShrink: 0,
  },
  back: { background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 14 },
  topbarCenter: { display: "flex", alignItems: "center", gap: 10 },
  topicBadge: {
    background: "#312e81", color: "#a5b4fc", fontSize: 12, fontWeight: 600,
    padding: "3px 10px", borderRadius: 20, textTransform: "capitalize",
  },
  topbarTitle: { color: "#94a3b8", fontSize: 15 },
  topbarActions: { display: "flex", gap: 10 },
  quizBtn: {
    padding: "8px 16px", background: "#1a1a2e", color: "#f59e0b",
    border: "1px solid #f59e0b", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600,
  },
  chatBtn: {
    padding: "8px 16px", background: "#6366f1", color: "#fff",
    border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600,
  },

  layout: { display: "flex", flex: 1, overflow: "hidden" },

  sidebar: {
    width: 220, padding: "24px 16px", borderRight: "1px solid #2a2a4a",
    overflowY: "auto", flexShrink: 0,
  },
  sidebarTitle: {
    color: "#64748b", fontSize: 11, fontWeight: 600,
    textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12,
  },
  sidebarItem: {
    display: "block", width: "100%", textAlign: "left",
    padding: "8px 12px", marginBottom: 4, borderRadius: 6,
    background: "transparent", border: "none", color: "#94a3b8",
    cursor: "pointer", fontSize: 13, lineHeight: 1.4,
  },
  sidebarItemActive: {
    background: "#1e1b4b", color: "#a5b4fc", fontWeight: 600,
  },

  content: {
    flex: 1, overflowY: "auto", padding: "40px 60px", maxWidth: 860,
  },

  // Markdown element styles
  h1: { color: "#e2e8f0", fontSize: 26, fontWeight: 700, marginBottom: 8, marginTop: 0 },
  h2: {
    color: "#a5b4fc", fontSize: 20, fontWeight: 600,
    marginTop: 40, marginBottom: 12, paddingBottom: 8,
    borderBottom: "1px solid #2a2a4a",
  },
  h3: { color: "#cbd5e1", fontSize: 16, fontWeight: 600, marginTop: 24, marginBottom: 8 },
  p:  { color: "#94a3b8", fontSize: 15, lineHeight: 1.8, marginBottom: 16 },
  ul: { paddingLeft: 24, marginBottom: 16 },
  li: { color: "#94a3b8", fontSize: 15, lineHeight: 1.8, marginBottom: 6 },
  inlineCode: {
    background: "#1e293b", color: "#f472b6", padding: "2px 6px",
    borderRadius: 4, fontSize: 13, fontFamily: "monospace",
  },
  codeBlock: {
    background: "#0d1117", border: "1px solid #2a2a4a", borderRadius: 8,
    padding: "16px 20px", overflowX: "auto", marginBottom: 20, marginTop: 8,
    fontSize: 13, fontFamily: "monospace", lineHeight: 1.6,
  },
  table: { borderCollapse: "collapse", width: "100%", marginBottom: 20 },
  th: { background: "#1e293b", color: "#e2e8f0", padding: "10px 14px", textAlign: "left", fontSize: 13, border: "1px solid #2a2a4a" },
  td: { color: "#94a3b8", padding: "9px 14px", fontSize: 13, border: "1px solid #2a2a4a" },
};