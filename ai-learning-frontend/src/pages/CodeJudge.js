import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { submitCode } from "../app/slices/codeJudgeSlice";
import { useLocation } from "react-router-dom";

function CodeJudge() {

  const dispatch = useDispatch();
  const { result, loading } = useSelector((state) => state.codeJudge);
  console.log(result)
  const location = useLocation();
  const question = location.state?.question;
  const q_id = location.state?.q_id;
  console.log(question)
  const [code, setCode] = useState(question?.starter_code);

  const handleSubmit = () => {

    const payload = {
      question_id: q_id,
      function_name: question.function_name,
      code: code,
      test_cases: question.test_cases
      // test_cases: question.test_cases.map(tc => ({
      //   input: tc.input,
      //   expected: tc.expected_output
      // }))
    };

    console.log("Submitting:", payload);

    dispatch(submitCode(payload));
  };

  return (
    <div style={{ padding: "20px" }}>

      <h2>{question?.title}</h2>

      <p>{question?.description}</p>

      <h3>Code Editor</h3>

      <textarea
        rows="12"
        cols="80"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />

      <br /><br />

      <button onClick={handleSubmit}>
        Run Code
      </button>

      {loading && <p>Running tests...</p>}

      {result && (
        <div style={{ marginTop: "20px" }}>

          <h3>Result</h3>

          <p>
            Passed: {result.passed} / {result.total}
          </p>

          <p>
            Score: {result.score_percentage}%
          </p>

          <h4>Test Case Details</h4>

          {result.details?.map((r, i) => (
            <div key={i} style={{ marginBottom: "10px" }}>
              <div>Input: {r.input}</div>
              <div>Expected: {r.expected}</div>
              <div>Status: {r.passed ? "✅ Passed" : "❌ Failed"}</div>
            </div>
          ))}

        </div>
      )}
    </div>
  );
}

export default CodeJudge;