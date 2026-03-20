import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { submitCode } from "../../services/api";

export const runCode = createAsyncThunk(
  "code/runCode",
  async (payload) => {
    const data = await submitCode(payload);
    return data;
  }
);

const codeSlice = createSlice({
  name: "code",
  initialState: {
    result: null,
    loading: false,
    error: null,
  },
  reducers: {},

  extraReducers: (builder) => {
    builder
      .addCase(runCode.pending, (state) => {
        state.loading = true;
      })
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

export default codeSlice.reducer;