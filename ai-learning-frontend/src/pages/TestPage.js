import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { createTest, submitTest, clearTest } from "../app/slices/testSlice";
import { submitQuizResult, fetchSuggestedDifficulty } from "../app/slices/studentSlice";

const TOPICS = ["loops","recursion","exceptions","functions","oop","variables","lists","dictionaries","strings","modules"];

export default function TestPage() {
  const dispatch   = useDispatch();
  const navigate   = useNavigate();
  const location   = useLocation();
  const { testData, result, loading, error, codingScores } = useSelector((s) => s.test);
  const { profile, suggestedDifficulty } = useSelector((s) => s.student);

  const [topic, setTopic]             = useState(location.state?.topic || "loops");
  const [difficulty, setDifficulty]   = useState("easy");
  const [numQuestions, setNumQuestions] = useState(6);
  const [mcqAnswers, setMcqAnswers]   = useState({});
  const [codeIoAnswers, setCodeIoAnswers] = useState({});

  useEffect(() => {
    if (profile?.student_id && topic)
      dispatch(fetchSuggestedDifficulty({ student_id: profile.student_id, topic }));
  }, [topic, profile, dispatch]);

  useEffect(() => {
    setDifficulty(suggestedDifficulty || "easy");
  }, [suggestedDifficulty]);

  const handleGenerate = () => {
    dispatch(clearTest());
    setMcqAnswers({});
    setCodeIoAnswers({});
    dispatch(createTest({ topic, difficulty, num_questions: parseInt(numQuestions) }));
  };

  const handleSubmit = async () => {
    const mcq     = Object.values(mcqAnswers);
    const code_io = Object.values(codeIoAnswers);

    // Build coding array from scores saved in Redux by CodeJudge
    const coding = (testData?.coding || []).map((q, idx) => ({
      question_id:      idx,
      score_percentage: codingScores[idx] ?? 0,   // 0 if not attempted
    }));

    const res = await dispatch(submitTest({ mcq, code_io, coding }));

    if (profile?.student_id && res.payload?.percentage !== undefined) {
      dispatch(submitQuizResult({
        student_id: profile.student_id,
        topic, difficulty,
        score: res.payload.percentage,
      }));
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button style={styles.back} onClick={() => navigate("/home")}>← Home</button>
        <h2 style={styles.title}>🎯 Quiz Generator</h2>
        <span />
      </div>

      {/* Config */}
      {!testData && (
        <div style={styles.configCard}>
          <h3 style={styles.configTitle}>Configure your quiz</h3>

          <label style={styles.label}>Topic</label>
          <select style={styles.select} value={topic} onChange={(e) => setTopic(e.target.value)}>
            {TOPICS.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>

          <label style={styles.label}>
            Difficulty
            {suggestedDifficulty && <span style={styles.suggestion}> (suggested: {suggestedDifficulty})</span>}
          </label>
          <select style={styles.select} value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>

          <label style={styles.label}>Number of questions</label>
          <input type="number" min={3} max={12} style={styles.input}
            value={numQuestions} onChange={(e) => setNumQuestions(e.target.value)} />

          <button style={styles.primaryBtn} onClick={handleGenerate} disabled={loading}>
            {loading ? "Generating..." : "Generate Quiz"}
          </button>
          {error && <div style={styles.error}>{error}</div>}
        </div>
      )}

      {/* Quiz */}
      {testData && !result && (
        <div style={styles.quizWrap}>
          <div style={styles.quizHeader}>
            <div style={styles.quizMeta}>{testData.topic} · {testData.difficulty}</div>
            <button style={styles.ghostBtn} onClick={() => dispatch(clearTest())}>← Regenerate</button>
          </div>

          {/* MCQ — 1 pt each */}
          {testData.mcq?.length > 0 && (
            <section>
              <h3 style={styles.sectionTitle}>
                📝 Multiple Choice
                <span style={styles.weightTag}>1 pt each</span>
              </h3>
              {testData.mcq.map((q) => (
                <div key={q.id} style={styles.questionCard}>
                  <p style={styles.question}>{q.id}. {q.question}</p>
                  {Object.entries(q.options).map(([key, val]) => (
                    <label key={key} style={styles.optionLabel}>
                      <input type="radio" name={`mcq_${q.id}`} value={key}
                        onChange={() => setMcqAnswers({
                          ...mcqAnswers,
                          [q.id]: { question_id: q.id, selected_answer: key, correct_answer: q.correct_answer }
                        })} />
                      <span style={styles.optionText}><strong>{key}.</strong> {val}</span>
                    </label>
                  ))}
                </div>
              ))}
            </section>
          )}

          {/* Code IO — 2 pts each */}
          {testData.code_io?.length > 0 && (
            <section>
              <h3 style={styles.sectionTitle}>
                💻 Code Output
                <span style={styles.weightTag}>2 pts each</span>
              </h3>
              {testData.code_io.map((q) => (
                <div key={q.id} style={styles.questionCard}>
                  <pre style={styles.code}>{q.code}</pre>
                  <p style={styles.question}>What is the output?</p>
                  <input style={styles.answerInput} placeholder="Your answer..."
                    onChange={(e) => setCodeIoAnswers({
                      ...codeIoAnswers,
                      [q.id]: { question_id: q.id, user_output: e.target.value, expected_output: q.expected_output }
                    })} />
                </div>
              ))}
            </section>
          )}

          {/* Coding — 3 pts each */}
          {testData.coding?.length > 0 && (
            <section>
              <h3 style={styles.sectionTitle}>
                🔧 Coding Problems
                <span style={styles.weightTag}>3 pts each</span>
              </h3>
              {testData.coding.map((q, idx) => (
                <div key={q.id} style={styles.questionCard}>
                  <p style={styles.question}>{q.question}</p>
                  <div style={styles.codingStatus}>
                    {codingScores[idx] !== undefined
                      ? <span style={styles.scoredBadge}>✅ Scored: {codingScores[idx]}% → {(codingScores[idx] / 100 * 3).toFixed(1)} / 3 pts</span>
                      : <span style={styles.unsolvedBadge}>⚠️ Not attempted — will score 0 pts</span>
                    }
                  </div>
                  <button style={styles.solveBtn}
                    onClick={() => navigate("/code-judge", { state: { question: q, q_id: idx } })}>
                    {codingScores[idx] !== undefined ? "Improve Solution →" : "Open Editor →"}
                  </button>
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
      {result && (
        <div style={styles.resultCard}>
          <div style={styles.scoreCircle}>
            <div style={styles.scoreNum}>{result.percentage}%</div>
            <div style={styles.scoreLabel}>Final Score</div>
          </div>

          <div style={styles.pointsTotal}>
            {result.points_earned} / {result.points_possible} points
          </div>

          {/* Breakdown */}
          <div style={styles.breakdown}>
            <div style={styles.breakdownTitle}>Score Breakdown</div>

            <div style={styles.breakdownRow}>
              <span style={styles.breakdownLabel}>📝 MCQ</span>
              <span style={styles.breakdownSub}>× {result.breakdown?.mcq?.weight} pt each</span>
              <span style={styles.breakdownScore}>
                {result.breakdown?.mcq?.earned} / {result.breakdown?.mcq?.possible}
              </span>
            </div>

            <div style={styles.breakdownRow}>
              <span style={styles.breakdownLabel}>💻 Code Output</span>
              <span style={styles.breakdownSub}>× {result.breakdown?.code_io?.weight} pts each</span>
              <span style={styles.breakdownScore}>
                {result.breakdown?.code_io?.earned} / {result.breakdown?.code_io?.possible}
              </span>
            </div>

            <div style={styles.breakdownRow}>
              <span style={styles.breakdownLabel}>🔧 Coding</span>
              <span style={styles.breakdownSub}>× {result.breakdown?.coding?.weight} pts each</span>
              <span style={styles.breakdownScore}>
                {result.breakdown?.coding?.earned} / {result.breakdown?.coding?.possible}
              </span>
            </div>
          </div>

          <div style={styles.resultActions}>
            <button style={styles.ghostBtn} onClick={() => { dispatch(clearTest()); setMcqAnswers({}); setCodeIoAnswers({}); }}>
              Try Again
            </button>
            <button style={styles.primaryBtn} onClick={() => navigate("/chat", { state: { topic } })}>
              Review with Tutor 💬
            </button>
            <button style={styles.primaryBtn} onClick={() => navigate("/profile")}>
              View Progress
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { background: "#0f0f1a", minHeight: "100vh", paddingBottom: 60 },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", borderBottom: "1px solid #2a2a4a" },
  title: { color: "#e2e8f0", margin: 0, fontSize: 18 },
  back: { background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 14 },
  configCard: { maxWidth: 480, margin: "40px auto", background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 12, padding: 32 },
  configTitle: { color: "#e2e8f0", margin: "0 0 24px", fontSize: 18 },
  label: { display: "block", color: "#94a3b8", fontSize: 13, marginBottom: 6, marginTop: 16 },
  suggestion: { color: "#6366f1", fontSize: 12 },
  select: { width: "100%", padding: "10px 12px", background: "#0f0f1a", border: "1px solid #2a2a4a", color: "#e2e8f0", borderRadius: 8, fontSize: 14 },
  input: { width: "100%", padding: "10px 12px", background: "#0f0f1a", border: "1px solid #2a2a4a", color: "#e2e8f0", borderRadius: 8, fontSize: 14, boxSizing: "border-box" },
  primaryBtn: { marginTop: 12, width: "100%", padding: "12px", background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer" },
  ghostBtn: { padding: "8px 16px", background: "transparent", color: "#94a3b8", border: "1px solid #2a2a4a", borderRadius: 8, cursor: "pointer", fontSize: 13 },
  error: { color: "#ef4444", marginTop: 12, fontSize: 13 },
  quizWrap: { maxWidth: 700, margin: "32px auto", padding: "0 24px" },
  quizHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  quizMeta: { color: "#6366f1", fontWeight: 600, textTransform: "capitalize" },
  sectionTitle: { display: "flex", alignItems: "center", gap: 10, color: "#94a3b8", fontSize: 14, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", margin: "32px 0 16px" },
  weightTag: { background: "#312e81", color: "#a5b4fc", fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 600, textTransform: "none", letterSpacing: 0 },
  questionCard: { background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 10, padding: 20, marginBottom: 16 },
  question: { color: "#e2e8f0", fontSize: 15, margin: "0 0 16px", lineHeight: 1.5 },
  optionLabel: { display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10, cursor: "pointer" },
  optionText: { color: "#cbd5e1", fontSize: 14 },
  code: { background: "#0f0f1a", color: "#a5f3fc", padding: "12px 16px", borderRadius: 6, fontSize: 13, overflowX: "auto", marginBottom: 12 },
  answerInput: { width: "100%", padding: "8px 12px", background: "#0f0f1a", border: "1px solid #2a2a4a", color: "#e2e8f0", borderRadius: 6, fontSize: 14, boxSizing: "border-box" },
  codingStatus: { marginBottom: 10 },
  scoredBadge: { color: "#22c55e", fontSize: 13 },
  unsolvedBadge: { color: "#f59e0b", fontSize: 13 },
  solveBtn: { padding: "8px 16px", background: "#6366f1", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 },
  submitBtn: { width: "100%", padding: "14px", background: "#22c55e", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 24 },
  resultCard: { maxWidth: 500, margin: "60px auto", background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 16, padding: 40, textAlign: "center" },
  scoreCircle: { width: 120, height: 120, borderRadius: "50%", background: "#0f0f1a", border: "4px solid #6366f1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" },
  scoreNum: { color: "#6366f1", fontSize: 28, fontWeight: 700 },
  scoreLabel: { color: "#64748b", fontSize: 12 },
  pointsTotal: { color: "#94a3b8", fontSize: 14, marginBottom: 24 },
  breakdown: { background: "#0f0f1a", border: "1px solid #2a2a4a", borderRadius: 10, padding: "16px 20px", marginBottom: 24, textAlign: "left" },
  breakdownTitle: { color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 },
  breakdownRow: { display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid #1e293b" },
  breakdownLabel: { color: "#e2e8f0", fontSize: 14, flex: 1 },
  breakdownSub: { color: "#475569", fontSize: 12 },
  breakdownScore: { color: "#a5b4fc", fontWeight: 700, fontSize: 14, minWidth: 60, textAlign: "right" },
  resultActions: { display: "flex", flexDirection: "column", gap: 10 },
};