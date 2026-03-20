import { useState } from "react";
import { askTutor } from "../services/chatService";

function ChatPage() {

  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {

    if (!question) return;

    setLoading(true);

    try {

      const data = await askTutor(question);

      setResponse(data);

    } catch (err) {

      alert("Error contacting server");

    }

    setLoading(false);
  };

  return (
    <div style={{ padding: "20px" }}>

      <h2>Python AI Tutor</h2>

      <textarea
        rows="4"
        style={{ width: "100%" }}
        placeholder="Ask your Python question..."
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />

      <br /><br />

      <button onClick={handleAsk}>
        Ask Tutor
      </button>

      {loading && <p>Thinking...</p>}

      {response && (

        <div style={{ marginTop: "20px" }}>

          <h3>Answer</h3>
          <p>{response.answer}</p>

          <h4>Confidence</h4>
          <p>{response.confidence}</p>

          <h4>Topics Used</h4>
          <ul>
            {response.topics_used.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>

        </div>

      )}

    </div>
  );
}

export default ChatPage;