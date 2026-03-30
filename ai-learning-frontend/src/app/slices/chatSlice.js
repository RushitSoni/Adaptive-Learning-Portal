import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { askQuestion, getHint } from "../../services/api";

export const askChat = createAsyncThunk(
  "chat/askChat",
  async ({ question, student_id, history }) =>
    askQuestion(question, student_id, history)
);

export const fetchHint = createAsyncThunk(
  "chat/fetchHint",
  async (question) => getHint(question)
);

const chatSlice = createSlice({
  name: "chat",
  initialState: {
    messages: [],   // [{ role: "user"|"assistant", content, meta? }]
    loading: false,
    error: null,
  },
  reducers: {
    clearChat(state) {
      state.messages = [];
      state.error = null;
    },
    addUserMessage(state, action) {
      state.messages.push({ role: "user", content: action.payload });
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(askChat.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(askChat.fulfilled, (state, action) => {
        state.loading = false;
        state.messages.push({
          role: "assistant",
          content: action.payload.answer,
          meta: {
            confidence: action.payload.confidence,
            topics_used: action.payload.topics_used,
            faithful: action.payload.faithful,
          },
        });
      })
      .addCase(askChat.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(fetchHint.fulfilled, (state, action) => {
        state.loading = false;
        state.messages.push({
          role: "assistant",
          content: `💡 Hint: ${action.payload.hint}`,
          meta: { isHint: true },
        });
      });
  },
});

export const { clearChat, addUserMessage } = chatSlice.actions;
export default chatSlice.reducer;