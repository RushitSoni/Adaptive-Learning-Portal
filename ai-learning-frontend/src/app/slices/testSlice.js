import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { generateTest } from "../../services/api";

export const createTest = createAsyncThunk(
  "test/createTest",
  async (payload) => {
    const data = await generateTest(payload);
    return data;
  }
);

const testSlice = createSlice({
  name: "test",
  initialState: {
    test: null,
    loading: false,
    error: null,
  },
  reducers: {},

  extraReducers: (builder) => {
    builder
      .addCase(createTest.pending, (state) => {
        state.loading = true;
      })
      .addCase(createTest.fulfilled, (state, action) => {
        state.loading = false;
        state.test = action.payload;
      })
      .addCase(createTest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export default testSlice.reducer;