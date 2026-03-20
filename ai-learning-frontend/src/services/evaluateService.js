export const evaluateObjective = async (mcq, code_io) => {

  console.log({
      mcq,
      code_io
    })

  const response = await fetch("http://127.0.0.1:8000/evaluate-objective", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      mcq,
      code_io
    })
  });

  if (!response.ok) {
    throw new Error("Evaluation failed");
  }

  return response.json();
};