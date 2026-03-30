import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:8000",
  headers: { "Content-Type": "application/json" },
});

// ── Student ──────────────────────────────────────────────────────────────────
export const createStudent    = (name) => API.post("/student", { name }).then(r => r.data);
export const getStudent       = (id) => API.get(`/student/${id}`).then(r => r.data);
export const getProgress      = (id) => API.get(`/student/${id}/progress`).then(r => r.data);
export const recordQuiz       = (id, topic, score, difficulty) =>
  API.post(`/student/${id}/record-quiz`, { topic, score, difficulty }).then(r => r.data);
export const suggestDifficulty = (id, topic) =>
  API.get(`/student/${id}/suggest-difficulty/${topic}`).then(r => r.data);

// ── Syllabus ─────────────────────────────────────────────────────────────────
export const getSyllabus      = () => API.get("/syllabus").then(r => r.data);
export const getHealth        = () => API.get("/health").then(r => r.data);

// ── Chat ─────────────────────────────────────────────────────────────────────
export const askQuestion      = (question, student_id = null, history = []) =>
  API.post("/chat", { question, student_id, history }).then(r => r.data);

export const getHint          = (question) =>
  API.post("/hint", { question }).then(r => r.data);

export const summariseTopic   = (topic) =>
  API.post("/summarise-topic", { topic }).then(r => r.data);

// ── Test ─────────────────────────────────────────────────────────────────────
export const generateTest     = (topic, difficulty, num_questions) =>
  API.post("/generate-test", { topic, difficulty, num_questions }).then(r => r.data);

export const evaluateObjective = (mcq, code_io, coding = []) =>
  API.post("/evaluate-objective", { mcq, code_io, coding }).then(r => r.data);

// ── Code ─────────────────────────────────────────────────────────────────────
export const submitCode       = (payload) =>
  API.post("/submit-code", payload).then(r => r.data);

export default API;