import { configureStore } from "@reduxjs/toolkit";

import chatReducer from "./slices/chatSlice";
import testReducer from "./slices/testSlice";
import evaluationReducer from "./slices/evaluationSlice";
import codeReducer from "./slices/codeSlice";
import codeJudgeReducer from "./slices/codeJudgeSlice";
const store = configureStore({
  reducer: {
    chat: chatReducer,
    test: testReducer,
    evaluation: evaluationReducer,
    code: codeReducer,
    codeJudge: codeJudgeReducer
  },
});

export default store;