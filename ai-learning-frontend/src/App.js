import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

import LoginPage    from "./pages/LoginPage";
import HomePage     from "./pages/HomePage";
import ChatPage     from "./pages/ChatPage";
import TestPage     from "./pages/TestPage";
import CodeJudge    from "./pages/CodeJudge";
import ProfilePage  from "./pages/ProfilePage";
import StudyPage from "./pages/StudyPage";

function RequireAuth({ children }) {
  const { profile } = useSelector((s) => s.student);
  return profile ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"          element={<LoginPage />} />
        <Route path="/home"      element={<RequireAuth><HomePage /></RequireAuth>} />
        <Route path="/chat"      element={<RequireAuth><ChatPage /></RequireAuth>} />
        <Route path="/test"      element={<RequireAuth><TestPage /></RequireAuth>} />
        <Route path="/code-judge" element={<RequireAuth><CodeJudge /></RequireAuth>} />
        <Route path="/profile"   element={<RequireAuth><ProfilePage /></RequireAuth>} />
        <Route path="*"          element={<Navigate to="/home" replace />} />
        <Route path="/study" element={<RequireAuth><StudyPage /></RequireAuth>} />
      </Routes>
    </BrowserRouter>
  );
}