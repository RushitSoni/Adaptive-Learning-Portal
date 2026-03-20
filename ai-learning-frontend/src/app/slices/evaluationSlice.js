import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { evaluateObjective } from "../../services/api";

export const evaluateTest = createAsyncThunk(
  "evaluation/evaluateTest",
  async (payload) => {
    const data = await evaluateObjective(payload);
    return data;
  }
);

const evaluationSlice = createSlice({
  name: "evaluation",
  initialState: {
    result: null,
    loading: false,
    error: null,
  },
  reducers: {},

  extraReducers: (builder) => {
    builder
      .addCase(evaluateTest.pending, (state) => {
        state.loading = true;
      })
      .addCase(evaluateTest.fulfilled, (state, action) => {
        state.loading = false;
        state.result = action.payload;
      })
      .addCase(evaluateTest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export default evaluationSlice.reducer;