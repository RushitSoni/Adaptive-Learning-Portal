import { useState, useRef, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { runCode, clearResult } from "../app/slices/codeJudgeSlice";
import { recordCodingScore } from "../app/slices/testSlice";

/**
 * Storage keys scoped to BOTH quiz AND question.
 *
 * quizKey  — opaque string passed from TestPage via location.state.quizKey
 *            Changes whenever a new quiz is generated, so stale drafts/results
 *            from a previous quiz are never confused with the new one.
 *
 * draftKey — per-question draft, scoped inside the quiz.
 *            Reopening the SAME question in the SAME quiz restores the draft.
 *
 * lastKey  — tracks "which (quiz, question) was last active" so we can detect
 *            genuine question changes vs. re-entries.
 */
const draftKey  = (quizKey, q_id) => `cj_draft_${quizKey}_${q_id}`;
const resultKey = (quizKey, q_id) => `cj_result_${quizKey}_${q_id}`;
const lastKey   = (quizKey)       => `cj_last_${quizKey}`;

/**
 * Remove all sessionStorage entries that belong to a specific quiz.
 * Called when we detect the quizKey has changed (i.e. a brand-new quiz loaded).
 */
function clearQuizStorage(oldQuizKey) {
  if (!oldQuizKey) return;
  const prefixes = [`cj_draft_${oldQuizKey}_`, `cj_result_${oldQuizKey}_`];
  Object.keys(sessionStorage)
    .filter((k) => prefixes.some((p) => k.startsWith(p)) || k === `cj_last_${oldQuizKey}`)
    .forEach((k) => sessionStorage.removeItem(k));
}

export default function CodeJudge() {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const location  = useLocation();
  const editorRef = useRef(null);

  const { result, loading, error } = useSelector((s) => s.codeJudge);

  const question = location.state?.question;
  const q_id     = location.state?.q_id ?? 0;

  /**
   * quizKey is generated once per quiz in TestPage and forwarded here.
   * Fallback to "default" keeps old behaviour if TestPage hasn't been updated yet.
   */
  const quizKey = location.state?.quizKey ?? "default";

  // Stable starter code for this question
  const starterCode = question
    ? `def ${question.function_name}(${getParamHint(question)}):\n    # Write your solution here\n    pass`
    : "# No question loaded";

  // ── Code state: restore per-question draft within THIS quiz ──────────────
  const [code, setCode] = useState(() => {
    const saved = sessionStorage.getItem(draftKey(quizKey, q_id));
    return saved !== null ? saved : starterCode;
  });

  const [activeTab, setActiveTab] = useState("problem");

  // Persisted result for this (quizKey, q_id) — loaded by the effect below
  // after identity is confirmed. Never loaded eagerly to avoid stale-quiz bleed.
  const [persistedResult, setPersistedResult] = useState(null);

  // The result to actually display — live Redux wins, then persisted fallback
  const displayResult = result ?? persistedResult;

  /**
   * Detect quiz/question changes and act accordingly:
   *
   *  ┌─────────────────────────────────┬────────────────────────────────────┐
   *  │ Scenario                        │ Action                             │
   *  ├─────────────────────────────────┼────────────────────────────────────┤
   *  │ New quiz (quizKey changed)      │ Clear Redux result + old drafts    │
   *  │                                 │ Reset code to starter              │
   *  ├─────────────────────────────────┼────────────────────────────────────┤
   *  │ Different question, same quiz   │ Clear Redux result                 │
   *  │                                 │ Restore draft (or starter)         │
   *  ├─────────────────────────────────┼────────────────────────────────────┤
   *  │ Same question, same quiz        │ Keep result (student reviewing)    │
   *  │                                 │ Keep code as-is                    │
   *  └─────────────────────────────────┴────────────────────────────────────┘
   */
  useEffect(() => {
    const ACTIVE_QUIZ_KEY = "cj_active_quizkey";
    const prevQuizKey = sessionStorage.getItem(ACTIVE_QUIZ_KEY);
    const prevQId     = sessionStorage.getItem(lastKey(quizKey));

    const quizChanged     = prevQuizKey !== quizKey;
    const questionChanged = prevQId     !== String(q_id);

    if (quizChanged) {
      // Brand-new quiz — wipe old quiz's storage, clear everything
      clearQuizStorage(prevQuizKey);
      dispatch(clearResult());
      setPersistedResult(null);
      setCode(starterCode);
      setActiveTab("problem");
    } else if (questionChanged) {
      // Different question within same quiz — clear stale result, restore draft
      dispatch(clearResult());
      setPersistedResult(null);
      const draft = sessionStorage.getItem(draftKey(quizKey, q_id));
      setCode(draft !== null ? draft : starterCode);
      setActiveTab("problem");
    } else {
      // Same question, same quiz — restore persisted result (student came back to review)
      const saved = sessionStorage.getItem(resultKey(quizKey, q_id));
      if (saved) {
        try { setPersistedResult(JSON.parse(saved)); } catch { /* ignore corrupt data */ }
      }
    }

    sessionStorage.setItem(ACTIVE_QUIZ_KEY, quizKey);
    sessionStorage.setItem(lastKey(quizKey), String(q_id));

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizKey, q_id]);

  // ── Persist code draft to sessionStorage on every change ─────────────────
  useEffect(() => {
    sessionStorage.setItem(draftKey(quizKey, q_id), code);
  }, [code, quizKey, q_id]);

  // ── Reset button: clears draft and resets to starter ─────────────────────
  const handleReset = useCallback(() => {
    sessionStorage.removeItem(draftKey(quizKey, q_id));
    setCode(starterCode);
  }, [quizKey, q_id, starterCode]);

  // ── Submit / run ──────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    dispatch(clearResult());
    setActiveTab("results");

    const formattedTestCases = (question.test_cases || []).map((tc) => ({
      input:    typeof tc.input    === "string" ? tc.input    : String(tc.input    ?? ""),
      expected: typeof tc.expected === "string" ? tc.expected : String(tc.expected ?? ""),
    }));

    const res = await dispatch(
      runCode({
        question_id:   Number(q_id),
        function_name: question.function_name,
        code,
        test_cases:    formattedTestCases,
      })
    );

    if (res.payload?.score_percentage !== undefined) {
      // Persist result so it survives navigation away and back to this question
      sessionStorage.setItem(resultKey(quizKey, q_id), JSON.stringify(res.payload));

      dispatch(
        recordCodingScore({
          question_id:      q_id,
          score_percentage: res.payload.score_percentage,
        })
      );
    }
  };

  // ── Tab key → 4 spaces ───────────────────────────────────────────────────
  const handleTabIndent = (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const start  = e.target.selectionStart;
      const end    = e.target.selectionEnd;
      const newVal = code.substring(0, start) + "    " + code.substring(end);
      setCode(newVal);
      setTimeout(() => {
        editorRef.current.selectionStart = start + 4;
        editorRef.current.selectionEnd   = start + 4;
      }, 0);
    }
  };

  const allPassed  = displayResult && displayResult.passed === displayResult.total;
  const lineCount  = code.split("\n").length;

  const ptsEarned   = displayResult ? parseFloat((displayResult.score_percentage / 100 * 3).toFixed(1)) : 0;
  const ptsPossible = 3;

  return (
    <div style={styles.page}>
      {/* Top bar */}
      <div style={styles.header}>
        <button
          style={styles.back}
          onClick={() =>
            navigate("/test", {
              state: { topic: location.state?.topic, fromCodeJudge: true },
            })
          }
        >
          ← Back to Quiz
        </button>
        <div style={styles.headerCenter}>
          <span style={styles.editorLabel}>Code Editor</span>
          {displayResult && (
            <span style={styles.scorePill}>
              {displayResult.passed}/{displayResult.total} passed · {displayResult.score_percentage}%
            </span>
          )}
        </div>
        <button
          style={{ ...styles.runBtn, opacity: loading ? 0.75 : 1 }}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <>
              <span style={styles.spinner} /> Running...
            </>
          ) : (
            "Run Code"
          )}
        </button>
      </div>

      <div style={styles.layout}>
        {/* Left panel */}
        <div style={styles.leftPanel}>
          <div style={styles.tabs}>
            <button
              style={{ ...styles.tab, ...(activeTab === "problem" ? styles.tabActive : {}) }}
              onClick={() => setActiveTab("problem")}
            >
              Problem
            </button>
            <button
              style={{ ...styles.tab, ...(activeTab === "results" ? styles.tabActive : {}) }}
              onClick={() => setActiveTab("results")}
            >
              Test Results
              {displayResult && (
                <span
                  style={{
                    ...styles.tabBadge,
                    background: allPassed ? "#059669" : "#dc2626",
                  }}
                >
                  {displayResult.passed}/{displayResult.total}
                </span>
              )}
            </button>
          </div>

          <div style={styles.panelContent}>
            {activeTab === "problem" && (
              <>
                <h3 style={styles.problemTitle}>Problem Statement</h3>
                <p style={styles.problemText}>{question?.question || "No question provided."}</p>

                <div style={styles.divider} />

                <div style={styles.sectionLabel}>Function Signature</div>
                <div style={styles.signatureBox}>
                  <code style={styles.signatureCode}>
                    def {question?.function_name}({getParamHint(question)})
                  </code>
                </div>

                <div style={styles.sectionLabel}>
                  Sample Test Cases (showing 3 of {question?.test_cases?.length})
                </div>
                {question?.test_cases?.slice(0, 3).map((tc, i) => (
                  <div key={i} style={styles.testCase}>
                    <div style={styles.testCaseHeader}>Case {i + 1}</div>
                    <div style={styles.tcGrid}>
                      <div style={styles.tcItem}>
                        <div style={styles.tcLabel}>Input</div>
                        <code style={styles.tcCode}>{String(tc.input)}</code>
                      </div>
                      <div style={styles.tcArrow}>→</div>
                      <div style={styles.tcItem}>
                        <div style={styles.tcLabel}>Expected</div>
                        <code style={styles.tcCode}>{String(tc.expected)}</code>
                      </div>
                    </div>
                  </div>
                ))}

                {displayResult && (
                  <div
                    style={{
                      ...styles.savedScore,
                      background: allPassed ? "#d1fae5" : "#fee2e2",
                      border: `1.5px solid ${allPassed ? "#a7f3d0" : "#fecaca"}`,
                    }}
                  >
                    <span style={{ color: allPassed ? "#059669" : "#dc2626", fontWeight: 700 }}>
                      {allPassed ? "All tests passed!" : "Some tests failed"}
                    </span>
                    <span style={{ color: "#6b7280", fontSize: 13 }}>
                      {displayResult.passed} / {displayResult.total} test cases &nbsp;·&nbsp;
                      {ptsEarned} / {ptsPossible} pts
                    </span>
                  </div>
                )}
              </>
            )}

            {activeTab === "results" && (
              <>
                {loading && (
                  <div style={styles.loadingState}>
                    <div style={styles.loadingSpinner} />
                    <div style={styles.loadingText}>Running test cases...</div>
                  </div>
                )}

                {!loading && !displayResult && !error && (
                  <div style={styles.emptyResults}>
                    <div style={styles.emptyResultsIcon} />
                    <div style={styles.emptyResultsText}>Run your code to see results</div>
                    <div style={styles.emptyResultsSub}>
                      Click "Run Code" to execute against all test cases
                    </div>
                  </div>
                )}

                {error && !loading && (
                  <div style={styles.errorBanner}>
                    <div style={styles.errorTitle}>Execution Error</div>
                    <pre style={styles.errorPre}>{error}</pre>
                  </div>
                )}

                {displayResult && !loading && (
                  <>
                    <div style={styles.summaryBar}>
                      <div style={styles.summaryLeft}>
                        <div style={styles.summaryScore}>
                          {displayResult.score_percentage}%
                        </div>
                        <div style={styles.summaryMeta}>
                          <div style={{ color: "#064e3b", fontWeight: 700, fontSize: 15 }}>
                            {displayResult.passed} / {displayResult.total} test cases passed
                          </div>
                          <div style={{ color: "#6b7280", fontSize: 13 }}>
                            {ptsEarned} / {ptsPossible} pts earned
                          </div>
                        </div>
                      </div>

                      <div style={styles.passCountBadge}>
                        <span style={{ color: "#064e3b", fontWeight: 800, fontSize: 15 }}>
                          {displayResult.passed}
                        </span>
                        <span style={{ color: "#9ca3af", fontWeight: 600, fontSize: 13 }}>
                          /{displayResult.total}
                        </span>
                        <span style={{ color: "#9ca3af", fontWeight: 600, fontSize: 12, marginLeft: 2 }}>
                          passed
                        </span>
                      </div>
                    </div>

                    <div style={styles.resultsList}>
                      {displayResult.details?.slice(0, 3).map((r, i) => (
                        <div
                          key={i}
                          style={{
                            ...styles.resultItem,
                            borderLeft: `4px solid ${r.passed ? "#10b981" : "#ef4444"}`,
                          }}
                        >
                          <div style={styles.resultItemHeader}>
                            <div style={styles.resultCaseLabel}>
                              <span
                                style={{
                                  ...styles.resultStatusDot,
                                  background: r.passed ? "#10b981" : "#ef4444",
                                }}
                              />
                              Test Case {i + 1}
                            </div>
                            <span
                              style={{
                                ...styles.resultBadge,
                                background: r.passed ? "#d1fae5" : "#fee2e2",
                                color:      r.passed ? "#059669" : "#dc2626",
                              }}
                            >
                              {r.passed ? "Passed" : "Failed"}
                            </span>
                          </div>

                          <div style={styles.resultGrid}>
                            <div style={styles.resultCell}>
                              <div style={styles.resultCellLabel}>Input</div>
                              <code style={styles.resultCellCode}>{r.input}</code>
                            </div>
                            <div style={styles.resultCell}>
                              <div style={styles.resultCellLabel}>Expected</div>
                              <code style={styles.resultCellCode}>
                                {r.expected !== undefined ? String(r.expected) : "—"}
                              </code>
                            </div>
                            <div style={styles.resultCell}>
                              <div style={styles.resultCellLabel}>Got</div>
                              <code
                                style={{
                                  ...styles.resultCellCode,
                                  color:      r.passed ? "#059669" : "#dc2626",
                                  fontWeight: 600,
                                }}
                              >
                                {r.error
                                  ? r.error.split("\n")[0]
                                  : r.output !== undefined
                                  ? String(r.output)
                                  : "—"}
                              </code>
                            </div>
                          </div>

                          {r.error && (
                            <div style={styles.errorTrace}>
                              <div style={styles.errorTraceLabel}>Error trace</div>
                              <pre style={styles.errorTracePre}>{r.error}</pre>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {displayResult.details?.length > 3 && (
                      <div style={styles.hiddenNote}>
                        + {displayResult.details.length - 3} hidden test case{displayResult.details.length - 3 !== 1 ? "s" : ""} run on submission
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right panel: Code editor */}
        <div style={styles.editorPanel}>
          <div style={styles.editorHeader}>
            <div style={styles.editorMeta}>
              <div style={styles.langBadge}>Python</div>
              <div style={styles.lineCount}>{lineCount} lines</div>
            </div>
            <button style={styles.resetBtn} onClick={handleReset}>
              Reset
            </button>
          </div>

          <div style={styles.editorWrap}>
            <div style={styles.lineNumbers}>
              {Array.from({ length: lineCount }, (_, i) => (
                <div key={i} style={styles.lineNum}>
                  {i + 1}
                </div>
              ))}
            </div>
            <textarea
              ref={editorRef}
              style={styles.codeArea}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={handleTabIndent}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
            />
          </div>

          <div style={styles.statusBar}>
            {displayResult ? (
              <span style={{ color: "#6b7280", fontWeight: 600, fontSize: 12 }}>
                Last run: {displayResult.passed}/{displayResult.total} passed · {ptsEarned}/{ptsPossible} pts
              </span>
            ) : (
              <span style={{ color: "#9ca3af", fontSize: 12 }}>Tab inserts 4 spaces</span>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes pulse  { 0%,100%{opacity:.4} 50%{opacity:1} }
      `}</style>
    </div>
  );
}

function getParamHint(question) {
  const tc = question?.test_cases?.[0];
  if (!tc) return "args";
  try {
    const input = String(tc.input).trim();
    let depth = 0, count = 1;
    for (const ch of input) {
      if ("([{".includes(ch)) depth++;
      else if (")]}".includes(ch)) depth--;
      else if (ch === "," && depth === 0) count++;
    }
    return Array.from({ length: count }, (_, i) => `arg${i + 1}`).join(", ");
  } catch {
    return "args";
  }
}

const styles = {
  page: { background: "#f0faf4", minHeight: "100vh", display: "flex", flexDirection: "column" },

  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "13px 24px", borderBottom: "1.5px solid #d1fae5",
    background: "#ffffff", boxShadow: "0 1px 6px rgba(16,185,129,0.07)", gap: 16,
  },
  back: { background: "none", border: "none", color: "#059669", cursor: "pointer", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap" },
  headerCenter: { display: "flex", alignItems: "center", gap: 12, flex: 1, justifyContent: "center" },
  editorLabel: { color: "#064e3b", fontWeight: 800, fontSize: 16 },
  scorePill: { fontSize: 12, fontWeight: 700, padding: "3px 12px", borderRadius: 20, background: "#f3f4f6", color: "#6b7280", border: "1px solid #e5e7eb" },
  runBtn: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "10px 22px",
    background: "linear-gradient(135deg, #10b981, #059669)",
    color: "#fff", border: "none", borderRadius: 10,
    cursor: "pointer", fontWeight: 700, fontSize: 14,
    boxShadow: "0 2px 10px rgba(16,185,129,0.3)", whiteSpace: "nowrap",
  },
  spinner: {
    width: 14, height: 14, borderRadius: "50%",
    border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff",
    animation: "spin 0.7s linear infinite", display: "inline-block",
  },

  layout: { display: "flex", flex: 1, overflow: "hidden", minHeight: 0 },

  leftPanel: { width: 380, display: "flex", flexDirection: "column", borderRight: "1.5px solid #d1fae5", background: "#ffffff", flexShrink: 0 },
  tabs: { display: "flex", borderBottom: "1.5px solid #d1fae5" },
  tab: {
    flex: 1, padding: "12px 16px", background: "none", border: "none",
    cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#6b7280",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    borderBottom: "2px solid transparent", marginBottom: -1.5,
  },
  tabActive: { color: "#059669", borderBottomColor: "#059669" },
  tabBadge: { fontSize: 11, fontWeight: 700, color: "#fff", padding: "1px 7px", borderRadius: 20 },
  panelContent: { flex: 1, overflowY: "auto", padding: "20px 22px" },

  problemTitle: { color: "#064e3b", fontSize: 16, fontWeight: 800, margin: "0 0 12px" },
  problemText:  { color: "#374151", fontSize: 14, lineHeight: 1.75, marginBottom: 20 },
  divider:      { height: 1, background: "#e5e7eb", margin: "0 0 20px" },
  sectionLabel: { color: "#9ca3af", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 },
  signatureBox: { background: "#f0fdf4", border: "1.5px solid #a7f3d0", borderRadius: 8, padding: "10px 14px", marginBottom: 20 },
  signatureCode: { color: "#059669", fontSize: 13, fontFamily: "monospace", fontWeight: 600 },
  testCase: { background: "#f9fafb", border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "12px 14px", marginBottom: 10 },
  testCaseHeader: { color: "#6b7280", fontSize: 11, fontWeight: 700, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" },
  tcGrid: { display: "flex", alignItems: "center", gap: 10 },
  tcArrow: { color: "#d1d5db", fontSize: 16, flexShrink: 0 },
  tcItem: { flex: 1 },
  tcLabel: { color: "#9ca3af", fontSize: 11, fontWeight: 600, marginBottom: 4 },
  tcCode:  { color: "#064e3b", fontSize: 13, fontFamily: "monospace", fontWeight: 600, wordBreak: "break-all" },
  savedScore: { marginTop: 16, padding: "12px 16px", borderRadius: 10, display: "flex", flexDirection: "column", gap: 4 },

  loadingState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 60, gap: 16 },
  loadingSpinner: { width: 36, height: 36, borderRadius: "50%", border: "3px solid #d1fae5", borderTopColor: "#10b981", animation: "spin 0.8s linear infinite" },
  loadingText: { color: "#059669", fontSize: 14, fontWeight: 600 },
  emptyResults: { display: "flex", flexDirection: "column", alignItems: "center", padding: 60, gap: 10, textAlign: "center" },
  emptyResultsIcon: { width: 48, height: 48, borderRadius: 14, background: "#f0fdf4", border: "1.5px dashed #a7f3d0", marginBottom: 8 },
  emptyResultsText: { color: "#064e3b", fontSize: 15, fontWeight: 700 },
  emptyResultsSub:  { color: "#9ca3af", fontSize: 13 },
  errorBanner: { background: "#fff5f5", border: "1.5px solid #fecaca", borderRadius: 10, padding: "14px 16px" },
  errorTitle:  { color: "#b91c1c", fontWeight: 700, marginBottom: 8, fontSize: 14 },
  errorPre:    { color: "#dc2626", fontSize: 12, fontFamily: "monospace", whiteSpace: "pre-wrap", margin: 0 },

  summaryBar: { borderRadius: 12, padding: "16px 18px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f9fafb", border: "1.5px solid #e5e7eb" },
  summaryLeft: { display: "flex", alignItems: "center", gap: 14 },
  summaryScore: { fontSize: 32, fontWeight: 800, lineHeight: 1, color: "#064e3b" },
  summaryMeta: { display: "flex", flexDirection: "column", gap: 4 },
  passCountBadge: { display: "flex", alignItems: "baseline", gap: 2, flexShrink: 0 },

  resultsList: { display: "flex", flexDirection: "column", gap: 10 },
  hiddenNote: { marginTop: 12, textAlign: "center", color: "#9ca3af", fontSize: 12, fontStyle: "italic" },
  resultItem: { background: "#f9fafb", borderRadius: 10, padding: "14px 16px", border: "1px solid #e5e7eb" },
  resultItemHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  resultCaseLabel: { display: "flex", alignItems: "center", gap: 8, color: "#374151", fontWeight: 700, fontSize: 13 },
  resultStatusDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  resultBadge: { fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20 },
  resultGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 },
  resultCell: { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 10px" },
  resultCellLabel: { color: "#9ca3af", fontSize: 11, fontWeight: 600, marginBottom: 4, textTransform: "uppercase" },
  resultCellCode: { color: "#374151", fontSize: 12, fontFamily: "monospace", wordBreak: "break-all" },
  errorTrace: { marginTop: 10, background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 12px" },
  errorTraceLabel: { color: "#b91c1c", fontSize: 11, fontWeight: 700, marginBottom: 6 },
  errorTracePre: { color: "#dc2626", fontSize: 11, fontFamily: "monospace", whiteSpace: "pre-wrap", margin: 0 },

  editorPanel: { flex: 1, display: "flex", flexDirection: "column", background: "#fafafa", overflow: "hidden" },
  editorHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 18px", borderBottom: "1.5px solid #e5e7eb", background: "#ffffff" },
  editorMeta: { display: "flex", alignItems: "center", gap: 12 },
  langBadge: { background: "#d1fae5", color: "#059669", fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 6 },
  lineCount: { color: "#9ca3af", fontSize: 12 },
  resetBtn: { padding: "5px 14px", background: "#fff", border: "1.5px solid #e5e7eb", color: "#6b7280", borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 600 },
  editorWrap: { display: "flex", flex: 1, overflow: "hidden", fontFamily: "monospace" },
  lineNumbers: { padding: "16px 12px", background: "#f3f4f6", borderRight: "1.5px solid #e5e7eb", display: "flex", flexDirection: "column", gap: 0, userSelect: "none", overflowY: "hidden", flexShrink: 0, minWidth: 48, textAlign: "right" },
  lineNum: { color: "#9ca3af", fontSize: 13, lineHeight: "1.65", height: "1.65em" },
  codeArea: { flex: 1, padding: "16px 20px", background: "#fafafa", color: "#064e3b", border: "none", outline: "none", fontFamily: "monospace", fontSize: 13, lineHeight: "1.65", resize: "none", caretColor: "#059669" },
  statusBar: { padding: "8px 18px", background: "#f0fdf4", borderTop: "1.5px solid #d1fae5", display: "flex", alignItems: "center" },
};