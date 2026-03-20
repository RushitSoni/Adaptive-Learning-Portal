import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

export const askQuestion = async (question) => {
  const response = await API.post("/chat", {
    question: question,
  });
  return response.data;
};

export const generateTest = async (data) => {
  const response = await API.post("/generate-test", data);
  return response.data;
};

export const evaluateObjective = async (data) => {
  const response = await API.post("/evaluate-objective", data);
  return response.data;
};

export const submitCode = async (data) => {
  const response = await API.post("/submit-code", data);
  return response.data;
};

export default API;