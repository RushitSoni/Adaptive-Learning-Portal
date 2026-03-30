import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { createStudent, getProgress, recordQuiz, suggestDifficulty } from "../../services/api";

// ── Thunks ────────────────────────────────────────────────────────────────────

export const registerStudent = createAsyncThunk(
  "student/register",
  async (name) => createStudent(name)
);

export const fetchProgress = createAsyncThunk(
  "student/fetchProgress",
  async (student_id) => getProgress(student_id)
);

export const submitQuizResult = createAsyncThunk(
  "student/submitQuizResult",
  async ({ student_id, topic, score, difficulty }) =>
    recordQuiz(student_id, topic, score, difficulty)
);

export const fetchSuggestedDifficulty = createAsyncThunk(
  "student/fetchSuggestedDifficulty",
  async ({ student_id, topic }) => suggestDifficulty(student_id, topic)
);



// ── Slice ────────────────────────────────────────────────────────────────────

const stored = localStorage.getItem("student");
const initialStudent = stored ? JSON.parse(stored) : null;

const studentSlice = createSlice({
  name: "student",
  initialState: {
    profile: initialStudent,        // { student_id, name }
    progress: null,                 // full progress summary
    suggestedDifficulty: "easy",
    loading: false,
    error: null,
  },
  reducers: {
    logout(state) {
      state.profile = null;
      state.progress = null;
      localStorage.removeItem("student");
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerStudent.fulfilled, (state, action) => {
        state.profile = action.payload;
        localStorage.setItem("student", JSON.stringify(action.payload));
      })
      .addCase(fetchProgress.pending, (state) => { state.loading = true; })
      .addCase(fetchProgress.fulfilled, (state, action) => {
        state.loading = false;
        state.progress = action.payload;
      })
      .addCase(fetchProgress.rejected, (state) => { state.loading = false; })
      .addCase(fetchSuggestedDifficulty.fulfilled, (state, action) => {
        state.suggestedDifficulty = action.payload.suggested_difficulty;
      });
  },
});

export const { logout } = studentSlice.actions;
export default studentSlice.reducer;