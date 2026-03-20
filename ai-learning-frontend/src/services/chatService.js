export const askTutor = async (question) => {
  const response = await fetch("http://127.0.0.1:8000/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      question: question
    })
  });

  if (!response.ok) {
    throw new Error("Server error");
  }

  return response.json();
};