import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

export const submitCode = createAsyncThunk(
  "codeJudge/submitCode",
  async (payload) => {
    const res = await fetch("http://127.0.0.1:8000/submit-code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    return await res.json();
  }
);

const codeJudgeSlice = createSlice({
  name: "codeJudge",
  initialState: {
    result: null,
    loading: false
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitCode.pending, (state) => {
        state.loading = true;
      })
      .addCase(submitCode.fulfilled, (state, action) => {
        state.loading = false;
        state.result = action.payload;
      });
  }
});

export default codeJudgeSlice.reducer;