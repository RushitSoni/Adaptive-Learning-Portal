import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { createTest, submitTest, clearTest } from "../app/slices/testSlice";
import { submitQuizResult, fetchSuggestedDifficulty } from "../app/slices/studentSlice";
import { clearResult } from "../app/slices/codeJudgeSlice";

/** Wipe every CodeJudge sessionStorage entry (drafts + results + tracking keys). */
function clearAllCodeJudgeStorage() {
  Object.keys(sessionStorage)
    .filter((k) => k.startsWith("cj_"))
    .forEach((k) => sessionStorage.removeItem(k));
}

/*
  NOTE TO BACKEND: This page now auto-generates a quiz immediately on mount
  using the topic from router state. No config dialog is shown.
  The difficulty is auto-fetched from the suggestedDifficulty endpoint.
  num_questions defaults to 6 but can be tweaked via the constant below.
*/
const DEFAULT_NUM_QUESTIONS = 6;

export default function TestPage() {
  const dispatch   = useDispatch();
  const navigate   = useNavigate();
  const location   = useLocation();
  const { testData, result, loading, error, codingScores } = useSelector((s) => s.test);
  const { profile, suggestedDifficulty } = useSelector((s) => s.student);

  const topic = location.state?.topic || "loops";
  // True only when navigating back from CodeJudge — preserves existing quiz
  const fromCodeJudge = location.state?.fromCodeJudge === true;

  /**
   * quizKey — a stable, opaque string that uniquely identifies THIS quiz instance.
   * It is derived from testData so it changes whenever a new quiz is generated.
   * Passed to CodeJudge via navigate state so it can scope all its sessionStorage
   * keys (drafts, last-qid) to the current quiz and auto-clear when quiz changes.
   *
   * Formula: topic + difficulty + number-of-questions + first-question-id
   * This is collision-resistant enough for a single-session app without a real UUID.
   */
  const quizKey = testData
    ? `${topic}_${testData.difficulty}_${(testData.coding?.length ?? 0)}_${testData.coding?.[0]?.id ?? "x"}`
    : null;

  const [mcqAnswers, setMcqAnswers] = useState({});
  const [codeIoAnswers, setCodeIoAnswers] = useState({});
  // Tracks whether the result screen should be shown (guards against Redux result bleed)
  const [showResult, setShowResult] = useState(false);
  // Skip auto-generation only when returning from CodeJudge mid-quiz
  const [hasGenerated, setHasGenerated] = useState(fromCodeJudge);

  // On mount: fresh navigation always clears stale quiz/result.
  // Back from CodeJudge preserves testData so the quiz isn't wiped.
  useEffect(() => {
    if (!fromCodeJudge) {
      // Fresh navigation from Home/Profile — always start a new quiz
      dispatch(clearTest());
      dispatch(clearResult());
      clearAllCodeJudgeStorage();
    }
    setMcqAnswers({});
    setCodeIoAnswers({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Step 1: fetch suggested difficulty as soon as we know the topic
  useEffect(() => {
    if (profile?.student_id && topic) {
      dispatch(fetchSuggestedDifficulty({ student_id: profile.student_id, topic }));
    }
  }, [topic, profile, dispatch]);

  // Step 2: once suggested difficulty comes back, auto-generate the test (only once per mount)
  useEffect(() => {
    if (!hasGenerated && !loading && suggestedDifficulty !== undefined) {
      const difficulty = suggestedDifficulty || "easy";
      dispatch(createTest({ topic, difficulty, num_questions: DEFAULT_NUM_QUESTIONS }));
      setHasGenerated(true);
    }
  }, [suggestedDifficulty]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRegenerate = () => {
    dispatch(clearTest());
    dispatch(clearResult());
    clearAllCodeJudgeStorage();
    setMcqAnswers({});
    setCodeIoAnswers({});
    setShowResult(false);
    setHasGenerated(true);
    const difficulty = suggestedDifficulty || "easy";
    dispatch(createTest({ topic, difficulty, num_questions: DEFAULT_NUM_QUESTIONS }));
  };

  const handleSubmit = async () => {
    // Build FULL arrays — include every question, answered or not.
    // Unanswered MCQ gets selected_answer "" (won't match correct_answer → 0 pts).
    // Unanswered code_io gets user_output "" (won't match expected → 0 pts).
    // This ensures points_possible reflects ALL questions, not just attempted ones.
    const mcq = (testData?.mcq || []).map((q) =>
      mcqAnswers[q.id] ?? { question_id: q.id, selected_answer: "", correct_answer: q.correct_answer }
    );
    const code_io = (testData?.code_io || []).map((q) =>
      codeIoAnswers[q.id] ?? { question_id: q.id, user_output: "", expected_output: q.expected_output }
    );
    const coding  = (testData?.coding || []).map((q, idx) => ({
      question_id:      idx,
      score_percentage: codingScores[idx] ?? 0,
    }));

    const res = await dispatch(submitTest({ mcq, code_io, coding }));

    if (profile?.student_id && res.payload?.percentage !== undefined) {
      dispatch(submitQuizResult({
        student_id: profile.student_id,
        topic,
        difficulty: testData?.difficulty,
        score: res.payload.percentage,
      }));
    }
    // Quiz is done — nuke all CodeJudge state so next quiz starts clean
    dispatch(clearResult());
    clearAllCodeJudgeStorage();
    setShowResult(true);
  };

  const answeredCount = Object.keys(mcqAnswers).length + Object.keys(codeIoAnswers).length;
  const totalAnswerable = (testData?.mcq?.length || 0) + (testData?.code_io?.length || 0);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button style={styles.back} onClick={() => navigate("/home")}>← Home</button>
        <div style={styles.headerCenter}>
          {testData && (
            <>
              <span style={styles.topicPill}>{topic.charAt(0).toUpperCase() + topic.slice(1)}</span>
              <span style={styles.diffPill}>{testData.difficulty}</span>
            </>
          )}
        </div>
        <button style={styles.regenBtn} onClick={handleRegenerate} disabled={loading}>
          {loading ? "Generating..." : "New Quiz"}
        </button>
      </div>

      {/* Loading state */}
      {loading && !testData && (
        <div style={styles.loadingWrap}>
          <div style={styles.loadingCard}>
            <div style={styles.loadingSpinner} />
            <div style={styles.loadingTitle}>Building your quiz</div>
            <div style={styles.loadingMeta}>
              {topic.charAt(0).toUpperCase() + topic.slice(1)} · {suggestedDifficulty || "easy"} · {DEFAULT_NUM_QUESTIONS} questions
            </div>
          </div>
        </div>
      )}

      {error && (
        <div style={styles.errorBanner}>{error}</div>
      )}

      {/* Quiz */}
      {testData && !showResult && (
        <div style={styles.quizWrap}>
          {/* Progress bar */}
          <div style={styles.progressWrap}>
            <div style={styles.progressInfo}>
              <span style={styles.progressLabel}>Answered {answeredCount} of {totalAnswerable} questions</span>
              <span style={styles.progressPct}>{totalAnswerable > 0 ? Math.round(answeredCount / totalAnswerable * 100) : 0}%</span>
            </div>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${totalAnswerable > 0 ? answeredCount / totalAnswerable * 100 : 0}%` }} />
            </div>
          </div>

          {/* MCQ */}
          {testData.mcq?.length > 0 && (
            <section>
              <div style={styles.sectionHeader}>
                <div style={styles.sectionTitle}>Multiple Choice</div>
                <div style={styles.weightTag}>1 pt each</div>
              </div>
              {testData.mcq.map((q) => (
                <div key={q.id} style={styles.questionCard}>
                  <p style={styles.question}>{q.id}. {q.question}</p>
                  <div style={styles.optionsGrid}>
                    {Object.entries(q.options).map(([key, val]) => {
                      const selected = mcqAnswers[q.id]?.selected_answer === key;
                      return (
                        <label key={key} style={{ ...styles.optionLabel, ...(selected ? styles.optionSelected : {}) }}>
                          <input
                            type="radio"
                            name={`mcq_${q.id}`}
                            value={key}
                            style={{ display: "none" }}
                            onChange={() => setMcqAnswers({
                              ...mcqAnswers,
                              [q.id]: { question_id: q.id, selected_answer: key, correct_answer: q.correct_answer }
                            })}
                          />
                          <span style={{ ...styles.optionKey, ...(selected ? styles.optionKeySelected : {}) }}>{key}</span>
                          <span style={styles.optionText}>{val}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* Code IO */}
          {testData.code_io?.length > 0 && (
            <section>
              <div style={styles.sectionHeader}>
                <div style={styles.sectionTitle}>Code Output</div>
                <div style={styles.weightTag}>2 pts each</div>
              </div>
              {testData.code_io.map((q) => (
                <div key={q.id} style={styles.questionCard}>
                  <pre style={styles.code}>{q.code}</pre>
                  <p style={styles.question}>What is the output of this code?</p>
                  <input
                    style={styles.answerInput}
                    placeholder="Type your answer..."
                    onChange={(e) => setCodeIoAnswers({
                      ...codeIoAnswers,
                      [q.id]: { question_id: q.id, user_output: e.target.value, expected_output: q.expected_output }
                    })}
                  />
                </div>
              ))}
            </section>
          )}

          {/* Coding problems */}
          {testData.coding?.length > 0 && (
            <section>
              <div style={styles.sectionHeader}>
                <div style={styles.sectionTitle}>Coding Problems</div>
                <div style={styles.weightTag}>3 pts each</div>
              </div>
              {testData.coding.map((q, idx) => (
                <div key={q.id} style={styles.questionCard}>
                  <p style={styles.question}>{q.question}</p>
                  {codingScores[idx] !== undefined ? (
                    <div style={styles.codingDone}>
                      <div style={styles.codingDoneLeft}>
                        <span style={styles.codingDoneDot} />
                        <span style={styles.codingDoneText}>
                          {codingScores[idx]}% — {(codingScores[idx] / 100 * 3).toFixed(1)} / 3 pts earned
                        </span>
                      </div>
                      <button style={styles.improveBtn}
                        onClick={() => navigate("/code-judge", { state: { question: q, q_id: idx, topic, quizKey } })}>
                        Improve
                      </button>
                    </div>
                  ) : (
                    <div style={styles.codingPending}>
                      <span style={styles.codingPendingText}>Not attempted — scores 0 pts if skipped</span>
                      <button style={styles.solveBtn}
                        onClick={() => navigate("/code-judge", { state: { question: q, q_id: idx, topic, quizKey } })}>
                        Open Editor
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}

          <button style={styles.submitBtn} onClick={handleSubmit} disabled={loading}>
            {loading ? "Evaluating..." : "Submit Quiz"}
          </button>
        </div>
      )}

      {/* Result */}
      {result && showResult && (
        <div style={styles.resultWrap}>
          <div style={styles.resultCard}>
            <div style={styles.resultTop}>
              <div style={styles.scoreRing}>
                <svg viewBox="0 0 120 120" width="120" height="120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#d1fae5" strokeWidth="10" />
                  <circle
                    cx="60" cy="60" r="50" fill="none"
                    stroke={result.percentage >= 80 ? "#10b981" : result.percentage >= 60 ? "#f59e0b" : "#ef4444"}
                    strokeWidth="10"
                    strokeDasharray={`${2 * Math.PI * 50}`}
                    strokeDashoffset={`${2 * Math.PI * 50 * (1 - result.percentage / 100)}`}
                    strokeLinecap="round"
                    transform="rotate(-90 60 60)"
                  />
                </svg>
                <div style={styles.scoreOverlay}>
                  <div style={styles.scoreNum}>{result.percentage}%</div>
                  <div style={styles.scoreLabel}>Score</div>
                </div>
              </div>
              <div style={styles.resultMeta}>
                <div style={styles.resultTitle}>Quiz Complete</div>
                <div style={styles.resultPoints}>{result.points_earned} / {result.points_possible} points</div>
                <div style={styles.resultTopicRow}>
                  <span style={styles.topicPill}>{topic}</span>
                  <span style={styles.diffPill}>{testData?.difficulty}</span>
                </div>
              </div>
            </div>

            {/* Breakdown */}
            <div style={styles.breakdown}>
              <div style={styles.breakdownTitle}>Score Breakdown</div>
              {[
                { label: "Multiple Choice", key: "mcq", pts: "1 pt" },
                { label: "Code Output", key: "code_io", pts: "2 pts" },
                { label: "Coding Problems", key: "coding", pts: "3 pts" },
              ].map(({ label, key, pts }) => {
                const data = result.breakdown?.[key];
                if (!data) return null;
                const pct = data.possible > 0 ? Math.round(data.earned / data.possible * 100) : 0;
                return (
                  <div key={key} style={styles.breakdownRow}>
                    <div style={styles.breakdownLeft}>
                      <span style={styles.breakdownLabel}>{label}</span>
                      <span style={styles.breakdownPts}>{pts} each</span>
                    </div>
                    <div style={styles.breakdownRight}>
                      <div style={styles.miniProgress}>
                        <div style={{ ...styles.miniProgressFill, width: `${pct}%`, background: pct >= 80 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444" }} />
                      </div>
                      <span style={styles.breakdownScore}>{data.earned} / {data.possible}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={styles.resultActions}>
              <button style={styles.ghostBtn} onClick={handleRegenerate}>
                Try Again
              </button>
              <button style={styles.primaryBtn} onClick={() => navigate("/chat", { state: { topic } })}>
                Review with Tutor
              </button>
              <button style={styles.primaryBtn} onClick={() => navigate("/profile")}>
                View Progress
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const styles = {
  page: { background: "#f0faf4", minHeight: "100vh", paddingBottom: 60 },

  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "15px 32px", borderBottom: "1.5px solid #d1fae5",
    background: "#ffffff", boxShadow: "0 1px 6px rgba(16,185,129,0.07)",
  },
  back: { background: "none", border: "none", color: "#059669", cursor: "pointer", fontSize: 14, fontWeight: 600 },
  headerCenter: { display: "flex", gap: 8, alignItems: "center" },
  topicPill: { background: "#d1fae5", color: "#059669", fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 20, textTransform: "capitalize" },
  diffPill: { background: "#f0fdf4", color: "#065f46", fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 20, border: "1.5px solid #a7f3d0", textTransform: "capitalize" },
  regenBtn: {
    padding: "8px 18px", background: "#fff", color: "#059669",
    border: "1.5px solid #a7f3d0", borderRadius: 8, cursor: "pointer",
    fontSize: 13, fontWeight: 700,
  },

  loadingWrap: { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" },
  loadingCard: {
    background: "#ffffff", border: "1.5px solid #d1fae5", borderRadius: 20,
    padding: "52px 60px", textAlign: "center",
    boxShadow: "0 4px 24px rgba(16,185,129,0.10)",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
  },
  loadingSpinner: {
    width: 44, height: 44, borderRadius: "50%",
    border: "4px solid #d1fae5", borderTopColor: "#10b981",
    animation: "spin 0.8s linear infinite",
  },
  loadingTitle: { color: "#064e3b", fontSize: 20, fontWeight: 800 },
  loadingMeta: { color: "#6b7280", fontSize: 14 },

  errorBanner: { background: "#fee2e2", color: "#b91c1c", margin: "20px 32px", padding: "12px 18px", borderRadius: 10, fontSize: 14 },

  quizWrap: { maxWidth: 720, margin: "32px auto", padding: "0 24px" },

  progressWrap: { marginBottom: 28 },
  progressInfo: { display: "flex", justifyContent: "space-between", marginBottom: 8 },
  progressLabel: { color: "#6b7280", fontSize: 13 },
  progressPct: { color: "#059669", fontWeight: 700, fontSize: 13 },
  progressBar: { height: 6, background: "#d1fae5", borderRadius: 3 },
  progressFill: { height: "100%", background: "#10b981", borderRadius: 3, transition: "width 0.4s" },

  sectionHeader: { display: "flex", alignItems: "center", gap: 12, margin: "32px 0 16px" },
  sectionTitle: { color: "#374151", fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" },
  weightTag: { background: "#d1fae5", color: "#059669", fontSize: 11, padding: "3px 10px", borderRadius: 20, fontWeight: 700 },

  questionCard: {
    background: "#ffffff", border: "1.5px solid #e5e7eb",
    borderRadius: 14, padding: "20px 22px", marginBottom: 14,
    boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
  },
  question: { color: "#064e3b", fontSize: 15, margin: "0 0 18px", lineHeight: 1.6, fontWeight: 600 },

  optionsGrid: { display: "flex", flexDirection: "column", gap: 8 },
  optionLabel: {
    display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer",
    padding: "11px 14px", borderRadius: 10,
    border: "1.5px solid #e5e7eb", background: "#fafafa",
    transition: "all 0.15s",
  },
  optionSelected: { border: "1.5px solid #10b981", background: "#f0fdf4" },
  optionKey: {
    width: 26, height: 26, borderRadius: 8,
    background: "#f3f4f6", color: "#6b7280",
    fontWeight: 700, fontSize: 12, flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  optionKeySelected: { background: "#10b981", color: "#fff" },
  optionText: { color: "#374151", fontSize: 14, lineHeight: 1.5, paddingTop: 4 },

  code: {
    background: "#f0fdf4", border: "1.5px solid #a7f3d0",
    color: "#065f46", padding: "14px 18px", borderRadius: 8,
    fontSize: 13, overflowX: "auto", marginBottom: 14, fontFamily: "monospace", lineHeight: 1.7,
  },
  answerInput: {
    width: "100%", padding: "11px 14px",
    background: "#f9fafb", border: "1.5px solid #e5e7eb",
    color: "#064e3b", borderRadius: 8, fontSize: 14, boxSizing: "border-box",
    outline: "none",
  },

  codingDone: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    background: "#f0fdf4", border: "1.5px solid #a7f3d0",
    borderRadius: 10, padding: "12px 16px",
  },
  codingDoneLeft: { display: "flex", alignItems: "center", gap: 10 },
  codingDoneDot: { width: 8, height: 8, borderRadius: "50%", background: "#10b981", flexShrink: 0 },
  codingDoneText: { color: "#059669", fontSize: 13, fontWeight: 700 },
  improveBtn: {
    padding: "7px 16px", background: "#fff", color: "#059669",
    border: "1.5px solid #a7f3d0", borderRadius: 8, cursor: "pointer",
    fontSize: 13, fontWeight: 700,
  },
  codingPending: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    background: "#fffbeb", border: "1.5px solid #fed7aa",
    borderRadius: 10, padding: "12px 16px",
  },
  codingPendingText: { color: "#92400e", fontSize: 13, fontWeight: 600 },
  solveBtn: {
    padding: "9px 18px",
    background: "linear-gradient(135deg, #10b981, #059669)",
    color: "#fff", border: "none", borderRadius: 8,
    cursor: "pointer", fontSize: 13, fontWeight: 700,
  },

  submitBtn: {
    width: "100%", padding: "16px",
    background: "linear-gradient(135deg, #10b981, #059669)",
    color: "#fff", border: "none", borderRadius: 12,
    fontSize: 16, fontWeight: 800, cursor: "pointer", marginTop: 28,
    boxShadow: "0 4px 16px rgba(16,185,129,0.3)",
  },

  // Result
  resultWrap: { display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 24px" },
  resultCard: {
    background: "#ffffff", border: "1.5px solid #d1fae5",
    borderRadius: 20, padding: "40px 44px", maxWidth: 540, width: "100%",
    boxShadow: "0 8px 40px rgba(16,185,129,0.12)",
  },
  resultTop: { display: "flex", alignItems: "center", gap: 28, marginBottom: 32 },
  scoreRing: { position: "relative", flexShrink: 0 },
  scoreOverlay: {
    position: "absolute", inset: 0,
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
  },
  scoreNum: { color: "#064e3b", fontSize: 28, fontWeight: 800 },
  scoreLabel: { color: "#9ca3af", fontSize: 12 },
  resultMeta: { display: "flex", flexDirection: "column", gap: 8 },
  resultTitle: { color: "#064e3b", fontSize: 22, fontWeight: 800 },
  resultPoints: { color: "#6b7280", fontSize: 15 },
  resultTopicRow: { display: "flex", gap: 8, flexWrap: "wrap" },

  breakdown: {
    background: "#f9fafb", border: "1.5px solid #e5e7eb",
    borderRadius: 12, padding: "18px 22px", marginBottom: 28,
  },
  breakdownTitle: { color: "#6b7280", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 16 },
  breakdownRow: { display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 12, marginBottom: 12, borderBottom: "1px solid #e5e7eb" },
  breakdownLeft: { display: "flex", flexDirection: "column", gap: 2 },
  breakdownLabel: { color: "#374151", fontSize: 14, fontWeight: 600 },
  breakdownPts: { color: "#9ca3af", fontSize: 12 },
  breakdownRight: { display: "flex", alignItems: "center", gap: 12 },
  miniProgress: { width: 80, height: 6, background: "#e5e7eb", borderRadius: 3 },
  miniProgressFill: { height: "100%", borderRadius: 3, transition: "width 0.5s" },
  breakdownScore: { color: "#064e3b", fontWeight: 800, fontSize: 14, minWidth: 50, textAlign: "right" },

  resultActions: { display: "flex", flexDirection: "column", gap: 10 },
  ghostBtn: {
    padding: "12px", background: "#fff", color: "#059669",
    border: "1.5px solid #a7f3d0", borderRadius: 10, cursor: "pointer",
    fontSize: 14, fontWeight: 700,
  },
  primaryBtn: {
    padding: "12px",
    background: "linear-gradient(135deg, #10b981, #059669)",
    color: "#fff", border: "none", borderRadius: 10,
    cursor: "pointer", fontWeight: 700, fontSize: 14,
    boxShadow: "0 2px 10px rgba(16,185,129,0.25)",
  },
};