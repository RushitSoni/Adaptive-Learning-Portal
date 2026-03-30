import { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { askChat, fetchHint, addUserMessage, clearChat } from "../app/slices/chatSlice";

export default function ChatPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { messages, loading, error } = useSelector((s) => s.chat);
  const { profile } = useSelector((s) => s.student);
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  const initialTopic = location.state?.topic;

  useEffect(() => {
    if (initialTopic && messages.length === 0) {
      setInput(`Explain ${initialTopic} in Python`);
    }
  }, [initialTopic]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async () => {
    const q = input.trim();
    if (!q || loading) return;
    dispatch(addUserMessage(q));
    setInput("");
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    dispatch(askChat({ question: q, student_id: profile?.student_id, history }));
  };

  const handleHint = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser) dispatch(fetchHint(lastUser.content));
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button style={styles.back} onClick={() => navigate("/home")}>← Home</button>
        <h2 style={styles.title}>💬 Python Tutor</h2>
        <button style={styles.clearBtn} onClick={() => dispatch(clearChat())}>Clear</button>
      </div>

      <div style={styles.messages}>
        {messages.length === 0 && (
          <div style={styles.empty}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🐍</div>
            <div style={{ color: "#94a3b8" }}>Ask any Python question. I'll answer from the syllabus only.</div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{ ...styles.bubble, ...(msg.role === "user" ? styles.userBubble : styles.botBubble) }}>
            <div style={styles.bubbleContent}>
              {msg.role === "assistant" && <span style={styles.avatar}>🤖</span>}
              <div>
                <div style={styles.msgText}>{msg.content}</div>
                {msg.meta && !msg.meta.isHint && (
                  <div style={styles.meta}>
                    Confidence: {Math.round(msg.meta.confidence * 100)}%
                    {msg.meta.topics_used?.length > 0 && ` · ${msg.meta.topics_used.join(", ")}`}
                  </div>
                )}
              </div>
              {msg.role === "user" && <span style={styles.avatar}>👤</span>}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ ...styles.bubble, ...styles.botBubble }}>
            <span style={styles.avatar}>🤖</span>
            <div style={styles.typing}>Thinking...</div>
          </div>
        )}

        {error && <div style={styles.error}>Error: {error}</div>}
        <div ref={bottomRef} />
      </div>

      <div style={styles.inputArea}>
        <button style={styles.hintBtn} onClick={handleHint} disabled={loading}>
          💡 Hint
        </button>
        <input
          style={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask a Python question..."
        />
        <button style={styles.sendBtn} onClick={handleSend} disabled={loading}>
          {loading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: { display: "flex", flexDirection: "column", height: "100vh", background: "#0f0f1a" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid #2a2a4a" },
  title: { color: "#e2e8f0", margin: 0, fontSize: 18 },
  back: { background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 14 },
  clearBtn: { background: "none", border: "1px solid #2a2a4a", color: "#64748b", borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontSize: 13 },
  messages: { flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: 16 },
  empty: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#64748b", textAlign: "center", padding: 40 },
  bubble: { maxWidth: "75%", padding: "12px 16px", borderRadius: 12 },
  userBubble: { alignSelf: "flex-end", background: "#6366f1", color: "#fff" },
  botBubble: { alignSelf: "flex-start", background: "#1a1a2e", border: "1px solid #2a2a4a" },
  bubbleContent: { display: "flex", gap: 10, alignItems: "flex-start" },
  avatar: { fontSize: 18, flexShrink: 0 },
  msgText: { color: "#e2e8f0", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" },
  meta: { color: "#64748b", fontSize: 11, marginTop: 6 },
  typing: { color: "#64748b", fontStyle: "italic", fontSize: 14 },
  error: { color: "#ef4444", fontSize: 13, textAlign: "center" },
  inputArea: { display: "flex", gap: 8, padding: "16px 24px", borderTop: "1px solid #2a2a4a" },
  hintBtn: { padding: "10px 14px", background: "#1a1a2e", border: "1px solid #2a2a4a", color: "#f59e0b", borderRadius: 8, cursor: "pointer", fontSize: 13 },
  input: { flex: 1, padding: "10px 16px", background: "#1a1a2e", border: "1px solid #2a2a4a", color: "#e2e8f0", borderRadius: 8, fontSize: 14, outline: "none" },
  sendBtn: { padding: "10px 20px", background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 },
};