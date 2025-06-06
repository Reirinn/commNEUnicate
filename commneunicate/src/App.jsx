import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import SignUpForm from "./pages/SignUpForm";
import FaceRegistration from "./pages/FaceRegistration";
import FaceLogin from "./pages/FaceLogin";
import Dashboard from "./pages/Dashboard";
import Chats from "./pages/Chats";
import ChatRoom from "./pages/ChatRoom";
import CreateGroup from "./pages/CreateGroup";
import UserSearch from "./pages/UserSearch";
import Notifications from "./pages/Notifications";
import MeetingsPage from "./pages/MeetingsPage";
import Attendance from "./pages/Attendance";

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const toggleDarkMode = () => setDarkMode(prev => !prev);
  
  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={<HomePage darkMode={darkMode} toggleDarkMode={toggleDarkMode} setDarkMode={setDarkMode} />}
        />
        <Route path="/signup" element={<SignUpForm darkMode={darkMode} toggleDarkMode={toggleDarkMode} />} />
        <Route path="/face-registration" element={<FaceRegistration darkMode={darkMode} toggleDarkMode={toggleDarkMode} />} />
        <Route path="/face-login" element={<FaceLogin darkMode={darkMode} toggleDarkMode={toggleDarkMode} />} />
        <Route path="/dashboard" element={<Dashboard darkMode={darkMode} toggleDarkMode={toggleDarkMode} />} />
        <Route path="/chats" element={<Chats darkMode={darkMode} toggleDarkMode={toggleDarkMode} />} />
        <Route path="/chat/:chatId" element={<ChatRoom darkMode={darkMode} toggleDarkMode={toggleDarkMode} />} />
        <Route path="/create-group" element={<CreateGroup darkMode={darkMode} toggleDarkMode={toggleDarkMode} />} />
        <Route path="/search" element={<UserSearch darkMode={darkMode} toggleDarkMode={toggleDarkMode} />} />
        <Route path="/notifications" element={<Notifications darkMode={darkMode} toggleDarkMode={toggleDarkMode} />} />
        <Route path="/meetings" element={<MeetingsPage darkMode={darkMode} toggleDarkMode={toggleDarkMode} />} />
        <Route path="/attendance" element={<Attendance darkMode={darkMode} toggleDarkMode={toggleDarkMode} />} />
        <Route path="*" element={<HomePage darkMode={darkMode} toggleDarkMode={toggleDarkMode} setDarkMode={setDarkMode} />} />
      </Routes>
    </Router>
  );
}

export default App;
