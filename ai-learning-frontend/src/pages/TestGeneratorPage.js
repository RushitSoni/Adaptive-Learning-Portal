import { useState } from "react";
import { generateTest } from "../services/testService";

function TestGeneratorPage() {

  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("easy");
  const [numQuestions, setNumQuestions] = useState(6);

  const [testData, setTestData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {

    setLoading(true);

    try {

      const data = await generateTest(topic, difficulty, numQuestions);

      setTestData(data.test);

    } catch (err) {

      alert("Test generation failed");

    }

    setLoading(false);
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
          {testData.mcq && (
            <>
              <h4>MCQ Questions</h4>

              {testData.mcq.map((q, index) => (
                <div key={index}>

                  <p>{q.question}</p>

                  <ul>
                    {q.options.map((opt, i) => (
                      <li key={i}>{opt}</li>
                    ))}
                  </ul>

                </div>
              ))}
            </>
          )}

          {/* Code IO */}
          {testData.code_io && (
            <>
              <h4>Code Output Questions</h4>

              {testData.code_io.map((q, index) => (
                <div key={index}>

                  <pre>{q.code}</pre>

                  <p>What will be the output?</p>

                </div>
              ))}
            </>
          )}

          {/* Coding */}
          {testData.coding && (
            <>
              <h4>Coding Questions</h4>

              {testData.coding.map((q, index) => (
                <div key={index}>

                  <h5>{q.title}</h5>

                  <p>{q.description}</p>

                  <pre>{q.starter_code}</pre>

                </div>
              ))}
            </>
          )}

        </div>

      )}

    </div>
  );
}

export default TestGeneratorPage;