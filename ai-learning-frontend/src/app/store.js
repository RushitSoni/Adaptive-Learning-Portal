import { configureStore } from "@reduxjs/toolkit";

import studentReducer   from "./slices/studentSlice";
import syllabusReducer  from "./slices/syllabusSlice";
import chatReducer      from "./slices/chatSlice";
import testReducer      from "./slices/testSlice";
import codeJudgeReducer from "./slices/codeJudgeSlice";

const store = configureStore({
  reducer: {
    student:   studentReducer,
    syllabus:  syllabusReducer,
    chat:      chatReducer,
    test:      testReducer,
    codeJudge: codeJudgeReducer,
  },
});

export default store;