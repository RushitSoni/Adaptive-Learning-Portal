import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getSyllabus } from "../../services/api";

export const fetchSyllabus = createAsyncThunk(
  "syllabus/fetch",
  async () => getSyllabus()
);

const syllabusSlice = createSlice({
  name: "syllabus",
  initialState: {
    topics: [],   // [{ topic: "loops", sections: ["What is a Loop?", ...] }]
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSyllabus.pending, (state) => { state.loading = true; })
      .addCase(fetchSyllabus.fulfilled, (state, action) => {
        state.loading = false;
        state.topics = action.payload.topics;
      })
      .addCase(fetchSyllabus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export default syllabusSlice.reducer;