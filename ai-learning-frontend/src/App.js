import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Navbar from "./components/NavigationBar";

import ChatPage from "./pages/ChatPage";
import TestGeneratorPage from "./pages/TestGeneratorPage";
import TestPage from "./pages/TestPage";
import CodeSubmissionPage from "./pages/CodeSubmissionPage";
import ResultPage from "./pages/ResultPage";
import CodeJudge from "./pages/CodeJudge";

function App() {
  return (
    <Router>

      <Navbar />

      <Routes>

        <Route path="/" element={<ChatPage />} />

        <Route path="/generate-test" element={<TestGeneratorPage />} />

        <Route path="/test" element={<TestPage />} />

        <Route path="/submit-code" element={<CodeSubmissionPage />} />

        <Route path="/result" element={<ResultPage />} />
        
        <Route path="/code-judge" element={<CodeJudge />} />
      </Routes>

    </Router>
  );
}

export default App;