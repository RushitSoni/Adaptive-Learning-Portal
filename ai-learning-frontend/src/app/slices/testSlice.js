import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { generateTest, evaluateObjective } from "../../services/api";

export const createTest = createAsyncThunk(
  "test/createTest",
  async ({ topic, difficulty, num_questions }) =>
    generateTest(topic, difficulty, num_questions)
);

export const submitTest = createAsyncThunk(
  "test/submitTest",
  async ({ mcq, code_io, coding }) =>
    evaluateObjective(mcq, code_io, coding)
);

const testSlice = createSlice({
  name: "test",
  initialState: {
    testData: null,
    topic: null,
    difficulty: null,
    result: null,
    codingScores: {},    // { question_id: score_percentage } — filled as student solves coding Qs
    loading: false,
    error: null,
  },
  reducers: {
    clearTest(state) {
      state.testData = null;
      state.result = null;
      state.error = null;
      state.codingScores = {};
    },
    recordCodingScore(state, action) {
      // Called from CodeJudge after a successful submission
      const { question_id, score_percentage } = action.payload;
      state.codingScores[question_id] = score_percentage;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createTest.pending,  (state) => { state.loading = true; state.error = null; })
      .addCase(createTest.fulfilled, (state, action) => {
        state.loading  = false;
        state.testData = action.payload.test;
        state.topic    = action.payload.topics_used?.[0];
        state.difficulty = action.payload.test?.difficulty;
        state.codingScores = {};   // reset on new test
      })
      .addCase(createTest.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.error.message;
      })
      .addCase(submitTest.pending,  (state) => { state.loading = true; })
      .addCase(submitTest.fulfilled, (state, action) => {
        state.loading = false;
        state.result  = action.payload;
      })
      .addCase(submitTest.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.error.message;
      });
  },
});

export const { clearTest, recordCodingScore } = testSlice.actions;
export default testSlice.reducer;