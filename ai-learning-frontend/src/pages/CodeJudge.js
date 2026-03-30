import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { runCode, clearResult } from "../app/slices/codeJudgeSlice";
import { recordCodingScore } from "../app/slices/testSlice";

export default function CodeJudge() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { result, loading, error } = useSelector((s) => s.codeJudge);
  const location = useLocation();

  const question = location.state?.question;
  const q_id     = location.state?.q_id ?? 0;

  const starterCode = question
    ? `def ${question.function_name}(${getParamHint(question)}):\n    # Write your solution here\n    pass`
    : "# No question loaded";

  const [code, setCode] = useState(starterCode);

  const handleSubmit = async () => {
    dispatch(clearResult());
    const res = await dispatch(runCode({
      question_id:   q_id,
      function_name: question.function_name,
      code,
      test_cases:    question.test_cases,
    }));

    // Save coding score back to testSlice so TestPage can include it in final evaluation
    if (res.payload?.score_percentage !== undefined) {
      dispatch(recordCodingScore({
        question_id:       q_id,
        score_percentage:  res.payload.score_percentage,
      }));
    }
  };

  const allPassed = result && result.passed === result.total;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button style={styles.back} onClick={() => navigate(-1)}>← Back to Quiz</button>
        <h2 style={styles.title}>🔧 Code Editor</h2>
        <span />
      </div>

      <div style={styles.layout}>
        {/* Left: problem */}
        <div style={styles.problem}>
          <h3 style={styles.problemTitle}>Problem</h3>
          <p style={styles.problemText}>{question?.question || "No question provided."}</p>

          <h4 style={styles.subTitle}>Function signature</h4>
          <code style={styles.signature}>def {question?.function_name}(...)</code>

          <h4 style={styles.subTitle}>Test cases</h4>
          {question?.test_cases?.map((tc, i) => (
            <div key={i} style={styles.testCase}>
              <div style={styles.tcRow}>
                <span style={styles.tcLabel}>Input:</span>
                <code style={styles.tcCode}>{tc.input}</code>
              </div>
              <div style={styles.tcRow}>
                <span style={styles.tcLabel}>Expected:</span>
                <code style={styles.tcCode}>{tc.expected}</code>
              </div>
            </div>
          ))}

          {/* Show saved score if already attempted */}
          {result && (
            <div style={{ ...styles.savedScore, background: allPassed ? "#14532d" : "#450a0a" }}>
              Score saved: {result.score_percentage}%
              {" "}(contributes {Math.round(result.score_percentage / 100 * 3 * 10) / 10} / 3 pts)
            </div>
          )}
        </div>

        {/* Right: editor */}
        <div style={styles.editor}>
          <textarea
            style={styles.codeArea}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
          />

          <button style={styles.runBtn} onClick={handleSubmit} disabled={loading}>
            {loading ? "Running..." : "▶ Run Code"}
          </button>

          {error && <div style={styles.error}>Error: {error}</div>}

          {result && (
            <div style={styles.results}>
              <div style={{ ...styles.resultSummary, background: allPassed ? "#14532d" : "#450a0a" }}>
                {allPassed ? "✅" : "❌"} {result.passed} / {result.total} tests passed
                · {result.score_percentage}%
              </div>

              {result.details?.map((r, i) => (
                <div key={i} style={{ ...styles.testResult, borderColor: r.passed ? "#22c55e" : "#ef4444" }}>
                  <div style={styles.tcRow}>
                    <span style={styles.tcLabel}>Input:</span>
                    <code style={styles.tcCode}>{r.input}</code>
                  </div>
                  <div style={styles.tcRow}>
                    <span style={styles.tcLabel}>Expected:</span>
                    <code style={styles.tcCode}>{r.expected !== undefined ? String(r.expected) : "—"}</code>
                  </div>
                  <div style={styles.tcRow}>
                    <span style={styles.tcLabel}>Got:</span>
                    <code style={{ ...styles.tcCode, color: r.passed ? "#22c55e" : "#ef4444" }}>
                      {r.error ? r.error.split("\n")[0] : r.output !== undefined ? String(r.output) : "—"}
                    </code>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getParamHint(question) {
  const tc = question?.test_cases?.[0];
  if (!tc) return "args";
  try {
    const input = tc.input.trim();
    let depth = 0, count = 1;
    for (const ch of input) {
      if ("([{".includes(ch)) depth++;
      else if (")]}".includes(ch)) depth--;
      else if (ch === "," && depth === 0) count++;
    }
    return Array.from({ length: count }, (_, i) => `arg${i + 1}`).join(", ");
  } catch { return "args"; }
}

const styles = {
  page: { background: "#0f0f1a", minHeight: "100vh", display: "flex", flexDirection: "column" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", borderBottom: "1px solid #2a2a4a" },
  title: { color: "#e2e8f0", margin: 0, fontSize: 17 },
  back: { background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 14 },
  layout: { display: "flex", flex: 1, gap: 0 },
  problem: { width: 340, padding: 24, borderRight: "1px solid #2a2a4a", overflowY: "auto" },
  problemTitle: { color: "#e2e8f0", margin: "0 0 12px", fontSize: 16 },
  problemText: { color: "#cbd5e1", fontSize: 14, lineHeight: 1.6, marginBottom: 20 },
  subTitle: { color: "#94a3b8", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", margin: "16px 0 8px" },
  signature: { display: "block", background: "#0f0f1a", color: "#a5f3fc", padding: "8px 12px", borderRadius: 6, fontSize: 13 },
  testCase: { background: "#0f0f1a", border: "1px solid #2a2a4a", borderRadius: 6, padding: "10px 12px", marginBottom: 8 },
  savedScore: { marginTop: 16, padding: "8px 12px", borderRadius: 6, color: "#fff", fontSize: 13, fontWeight: 600 },
  tcRow: { display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 4 },
  tcLabel: { color: "#64748b", fontSize: 12, minWidth: 60 },
  tcCode: { color: "#fbbf24", fontSize: 12, fontFamily: "monospace" },
  editor: { flex: 1, display: "flex", flexDirection: "column", padding: 24, gap: 12 },
  codeArea: { flex: 1, minHeight: 320, background: "#0d1117", color: "#e2e8f0", border: "1px solid #2a2a4a", borderRadius: 8, padding: 16, fontFamily: "monospace", fontSize: 14, resize: "vertical", outline: "none" },
  runBtn: { padding: "12px", background: "#22c55e", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: "pointer" },
  error: { color: "#ef4444", fontSize: 13 },
  results: { display: "flex", flexDirection: "column", gap: 8 },
  resultSummary: { padding: "10px 14px", borderRadius: 8, color: "#fff", fontWeight: 600, fontSize: 14 },
  testResult: { background: "#1a1a2e", border: "1px solid", borderRadius: 8, padding: "10px 14px" },
};