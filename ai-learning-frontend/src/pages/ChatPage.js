import { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { askChat, fetchHint, addUserMessage, clearChat } from "../app/slices/chatSlice";

export default function ChatPage() {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const location  = useLocation();
  const { messages, loading, error } = useSelector((s) => s.chat);
  const { profile } = useSelector((s) => s.student);
  const [input, setInput]         = useState("");
  const [hintLoading, setHintLoading] = useState(false);
  const bottomRef = useRef(null);

  const initialTopic = location.state?.topic;

  // Pre-fill input when arriving from a topic link.
  // Tracks lastTopic so a Clear → same topic re-entry still works.
  const lastTopicRef = useRef(null);
  useEffect(() => {
    if (initialTopic && initialTopic !== lastTopicRef.current) {
      lastTopicRef.current = initialTopic;
      setInput(`Explain ${initialTopic} in Python`);
    }
  }, [initialTopic]);

  // Scroll to bottom whenever messages change or either loader is active
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, hintLoading]);

  const handleSend = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");

    // Build history from current messages BEFORE dispatching the new user turn,
    // then manually append the new user message so the backend receives the
    // complete context including the current question.
    const history = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: q },
    ];

    dispatch(addUserMessage(q));
    dispatch(askChat({ question: q, student_id: profile?.student_id, history }));
  };

  const handleHint = async () => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser || hintLoading) return;
    setHintLoading(true);
    try {
      await dispatch(fetchHint(lastUser.content));
    } finally {
      setHintLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button style={styles.back} onClick={() => navigate("/home")}>← Home</button>
        <h2 style={styles.title}>Python Tutor</h2>
        <button style={styles.clearBtn} onClick={() => dispatch(clearChat())}>Clear chat</button>
      </div>

      <div style={styles.messages}>
        {messages.length === 0 && (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>Py</div>
            <div style={styles.emptyText}>Ask any Python question.</div>
            <div style={styles.emptySubtext}>I'll answer from the syllabus only.</div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{ ...styles.bubbleRow, justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}
          >
            {msg.role === "assistant" && <div style={styles.botAvatar}>AI</div>}
            <div style={{ ...styles.bubble, ...(msg.role === "user" ? styles.userBubble : styles.botBubble) }}>
              <div style={styles.msgText}>{msg.content}</div>
              {msg.meta && !msg.meta.isHint && (
                <div style={styles.meta}>
                  Confidence: {Math.round(msg.meta.confidence * 100)}%
                  {msg.meta.topics_used?.length > 0 && ` · ${msg.meta.topics_used.join(", ")}`}
                </div>
              )}
            </div>
            {msg.role === "user" && (
              <div style={styles.userAvatar}>{profile?.name?.[0]?.toUpperCase() || "U"}</div>
            )}
          </div>
        ))}

        {/* Main chat loading indicator */}
        {loading && (
          <div style={{ ...styles.bubbleRow, justifyContent: "flex-start" }}>
            <div style={styles.botAvatar}>AI</div>
            <div style={{ ...styles.bubble, ...styles.botBubble }}>
              <div style={styles.typingDots}>
                <span style={styles.dot} />
                <span style={{ ...styles.dot, animationDelay: "0.15s" }} />
                <span style={{ ...styles.dot, animationDelay: "0.3s" }} />
              </div>
            </div>
          </div>
        )}

        {/* Hint loading indicator — separate from main chat loader */}
        {hintLoading && (
          <div style={{ ...styles.bubbleRow, justifyContent: "flex-start" }}>
            <div style={styles.botAvatar}>AI</div>
            <div style={{ ...styles.bubble, ...styles.botBubble }}>
              <div style={{ ...styles.meta, marginTop: 0 }}>Getting hint…</div>
            </div>
          </div>
        )}

        {error && <div style={styles.error}>Error: {error}</div>}
        <div ref={bottomRef} />
      </div>

      <div style={styles.inputArea}>
        <button
          style={{
            ...styles.hintBtn,
            opacity: hintLoading || messages.length === 0 ? 0.5 : 1,
            cursor:  hintLoading || messages.length === 0 ? "not-allowed" : "pointer",
          }}
          onClick={handleHint}
          disabled={hintLoading || messages.length === 0}
        >
          {hintLoading ? "…" : "Hint"}
        </button>
        <input
          style={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Ask a Python question..."
        />
        <button
          style={{
            ...styles.sendBtn,
            opacity: loading || !input.trim() ? 0.75 : 1,
            cursor:  loading || !input.trim() ? "not-allowed" : "pointer",
          }}
          onClick={handleSend}
          disabled={loading || !input.trim()}
        >
          {loading ? "..." : "Send"}
        </button>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40%            { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  page: { display: "flex", flexDirection: "column", height: "100vh", background: "#f0faf4" },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "16px 28px", borderBottom: "1.5px solid #d1fae5",
    background: "#ffffff", boxShadow: "0 1px 6px rgba(16,185,129,0.07)",
  },
  title:    { color: "#064e3b", margin: 0, fontSize: 17, fontWeight: 800, letterSpacing: "-0.3px" },
  back:     { background: "none", border: "none", color: "#059669", cursor: "pointer", fontSize: 14, fontWeight: 600 },
  clearBtn: {
    background: "none", border: "1.5px solid #a7f3d0",
    color: "#059669", borderRadius: 8, padding: "5px 14px",
    cursor: "pointer", fontSize: 13, fontWeight: 600,
  },
  messages: {
    flex: 1, overflowY: "auto", padding: "28px 24px",
    display: "flex", flexDirection: "column", gap: 14,
  },
  empty: {
    flex: 1, display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    textAlign: "center", padding: 60, gap: 10,
  },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 18,
    background: "linear-gradient(135deg, #10b981, #059669)",
    color: "#fff", fontWeight: 800, fontSize: 20,
    display: "flex", alignItems: "center", justifyContent: "center",
    marginBottom: 8, boxShadow: "0 4px 16px rgba(16,185,129,0.25)",
  },
  emptyText:    { color: "#064e3b", fontSize: 18, fontWeight: 700 },
  emptySubtext: { color: "#9ca3af", fontSize: 14 },
  bubbleRow:    { display: "flex", alignItems: "flex-end", gap: 10 },
  botAvatar: {
    width: 32, height: 32, borderRadius: 10,
    background: "linear-gradient(135deg, #10b981, #059669)",
    color: "#fff", fontWeight: 800, fontSize: 11,
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  userAvatar: {
    width: 32, height: 32, borderRadius: 10,
    background: "#064e3b",
    color: "#fff", fontWeight: 800, fontSize: 13,
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  bubble:     { maxWidth: "72%", padding: "12px 16px", borderRadius: 14 },
  userBubble: {
    background: "linear-gradient(135deg, #10b981, #059669)",
    color: "#fff", borderBottomRightRadius: 4,
    boxShadow: "0 2px 10px rgba(16,185,129,0.2)",
  },
  botBubble: {
    background: "#ffffff", border: "1.5px solid #d1fae5",
    borderBottomLeftRadius: 4, boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },
  msgText: { fontSize: 14, lineHeight: 1.65, whiteSpace: "pre-wrap" },
  meta:    { color: "#9ca3af", fontSize: 11, marginTop: 6 },
  typingDots: { display: "flex", gap: 5, alignItems: "center", padding: "4px 0" },
  // Each dot gets the bounce animation — delay is applied inline per span
  dot: {
    width: 7, height: 7, borderRadius: "50%",
    background: "#a7f3d0",
    display: "inline-block",
    animation: "bounce 1s ease-in-out infinite",
  },
  error: { color: "#dc2626", fontSize: 13, textAlign: "center" },
  inputArea: {
    display: "flex", gap: 8, padding: "16px 24px",
    borderTop: "1.5px solid #d1fae5", background: "#ffffff",
  },
  hintBtn: {
    padding: "10px 16px", background: "#f0fdf4",
    border: "1.5px solid #a7f3d0", color: "#059669",
    borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700,
    transition: "opacity 0.15s",
  },
  input: {
    flex: 1, padding: "11px 16px",
    background: "#f9fafb", border: "1.5px solid #d1fae5",
    color: "#064e3b", borderRadius: 10, fontSize: 14, outline: "none",
  },
  sendBtn: {
    padding: "10px 22px",
    background: "linear-gradient(135deg, #10b981, #059669)",
    color: "#fff", border: "none", borderRadius: 10,
    cursor: "pointer", fontWeight: 700, fontSize: 14,
    boxShadow: "0 2px 10px rgba(16,185,129,0.25)",
    transition: "opacity 0.15s",
  },
};