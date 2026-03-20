export const generateTest = async (topic, difficulty, num_questions) => {

  const response = await fetch("http://127.0.0.1:8000/generate-test", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      topic,
      difficulty,
      num_questions
    })
  });

  if (!response.ok) {
    throw new Error("Failed to generate test");
  }

  return response.json();
};