import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { askQuestion } from "../../services/api";

export const askChat = createAsyncThunk(
  "chat/askChat",
  async (question) => {
    const data = await askQuestion(question);
    return data;
  }
);

const chatSlice = createSlice({
  name: "chat",
  initialState: {
    answer: null,
    loading: false,
    error: null,
  },
  reducers: {},

  extraReducers: (builder) => {
    builder
      .addCase(askChat.pending, (state) => {
        state.loading = true;
      })
      .addCase(askChat.fulfilled, (state, action) => {
        state.loading = false;
        state.answer = action.payload;
      })
      .addCase(askChat.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export default chatSlice.reducer;