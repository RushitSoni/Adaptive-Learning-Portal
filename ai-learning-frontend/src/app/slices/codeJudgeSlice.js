import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { submitCode } from "../../services/api";

export const runCode = createAsyncThunk(
  "codeJudge/runCode",
  async (payload) => submitCode(payload)
);

const codeJudgeSlice = createSlice({
  name: "codeJudge",
  initialState: { result: null, loading: false, error: null },
  reducers: {
    clearResult(state) { state.result = null; state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(runCode.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(runCode.fulfilled, (state, action) => {
        state.loading = false;
        state.result = action.payload;
      })
      .addCase(runCode.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export const { clearResult } = codeJudgeSlice.actions;
export default codeJudgeSlice.reducer;