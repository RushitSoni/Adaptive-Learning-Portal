import { useState } from "react";
import { generateTest } from "../services/testService";
import { evaluateObjective } from "../services/evaluateService";
import { Link } from "react-router-dom";


function TestPage() {

  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("easy");
  const [numQuestions, setNumQuestions] = useState(6);

  const [testData, setTestData] = useState(null);
  const [loading, setLoading] = useState(false);

  const [mcqAnswers, setMcqAnswers] = useState({});
  const [codeIoAnswers, setCodeIoAnswers] = useState({});
  const [result, setResult] = useState(null);

  const handleGenerate = async () => {

    setLoading(true);

    try {

      const data = await generateTest(topic, difficulty, numQuestions);

      setTestData(data.test);
      console.log(testData)

    } catch (err) {

      alert("Test generation failed");

    }

    setLoading(false);
  };
  const handleSubmitQuiz = async () => {

    const mcqList = Object.values(mcqAnswers);
    const codeIoList = Object.values(codeIoAnswers);

    try {
      console.log(mcqList)
      const res = await evaluateObjective(mcqList, codeIoList);
      
      setResult(res);
      console.log(result)

    } catch (err) {

      alert("Evaluation failed");

    }

  };
  return (
    <div style={{ padding: "20px" }}>

      <h2>Generate Test</h2>

      <input
        placeholder="Topic (example: recursion)"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
      />

      <br /><br />

      <select
        value={difficulty}
        onChange={(e) => setDifficulty(e.target.value)}
      >
        <option value="easy">Easy</option>
        <option value="medium">Medium</option>
        <option value="hard">Hard</option>
      </select>

      <br /><br />

      <input
        type="number"
        value={numQuestions}
        onChange={(e) => setNumQuestions(e.target.value)}
      />

      <br /><br />

      <button onClick={handleGenerate}>
        Generate Test
      </button>

      {loading && <p>Generating Test...</p>}
      

      {testData && (

        <div style={{ marginTop: "30px" }}>

          <h3>Generated Test</h3>
          
          {/* MCQ */}
          {testData.mcq.map((q, index) => (
            <div key={index}>

              <p>{q.question}</p>

              {q.options.map((opt, i) => (

                <label key={i}>

                  <input
                    type="radio"
                    name={`mcq_${index}`}
                    value={opt}
                    onChange={() =>
                      setMcqAnswers({
                        ...mcqAnswers,
                        [index]: {
                          question_id: index,
                          selected_answer: opt,
                          correct_answer: q.correct_answer
                        }
                      })
                    }
                  />

                  {opt}

                </label>

              ))}

            </div>
          ))}

          {/* Code IO */}
          {testData.code_io.map((q, index) => (

            <div key={index}>

              <pre>{q.code}</pre>

              <input
                placeholder="Your Output"
                onChange={(e) =>
                  setCodeIoAnswers({
                    ...codeIoAnswers,
                    [index]: {
                      question_id: index,
                      user_output: e.target.value,
                      expected_output: q.expected_output
                    }
                  })
                }
              />

            </div>

          ))}

          
         {/* Coding */}
{testData.coding && (
  <>
    <h4>Coding Questions</h4>

    {testData.coding.map((q,index) => (
      <div key={index}>

        <h5>{q.title}</h5>

        <p>{q.description}</p>

        <Link
          to="/code-judge"
          state={{ question: q ,q_id:index}}
        >
          Solve Problem
        </Link>

      </div>
    ))}
  </>
)}

          <button onClick={handleSubmitQuiz}>
          Submit Quiz
          </button>

          {result && (

              <div style={{marginTop: "20px"}}>

                <h3>Result</h3>

                <p>Total Questions: {result.total_questions}</p>

                <p>Score: {result.score}</p>

                <p>Percentage: {result.percentage}%</p>

              </div>

            )}

        </div>

      )}

    </div>
  );
}

export default TestPage;