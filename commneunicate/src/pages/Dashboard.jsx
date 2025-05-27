import React, { useEffect, useState } from "react";
import {
  FaUsers,
  FaComments,
  FaBell,
  FaCalendarAlt,
  FaSignOutAlt,
} from "react-icons/fa";
import { MdEmojiPeople, MdStars, MdMood } from "react-icons/md";
import { db, auth } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";

// Import your components for right pane pages
import Chats from "./Chats";
import Notifications from "./Notifications";
import MeetingsPage from "./MeetingsPage";
import Attendance from "./Attendance";
import CreateGroup from "./CreateGroup";

export default function Dashboard({ darkMode, toggleDarkMode }) {
  const [userRole, setUserRole] = useState("");
  const [userName, setUserName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [email, setEmail] = useState("");
  const [activePane, setActivePane] = useState("welcome");
  const [loading, setLoading] = useState(true);

  // For CreateGroup display toggle inside Chats pane
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  // For demo purpose: userSubjects and userSection - you can fetch/set this properly
  const [userSubjects, setUserSubjects] = useState([]);
  const [userSection, setUserSection] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setEmail(currentUser.email || "");
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserRole(data.role);
          setUserName(data.firstName);
          setPhotoURL(data.photoURL);
          // Set userSubjects and userSection if available for CreateGroup filtering
          setUserSubjects(data.subjects || []);
          setUserSection(data.section || "");
        } else {
          console.warn("User document not found");
          setUserRole("");
          setUserName("");
          setPhotoURL("");
        }
      } else {
        navigate("/");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          darkMode ? "text-white bg-gray-900" : "text-gray-700 bg-gray-100"
        }`}
      >
        Loading user information...
      </div>
    );
  }

  const avatarSrc = photoURL || auth.currentUser?.photoURL || null;

  // Callback when group created: close CreateGroup pane and maybe refresh Chats
  const handleGroupCreated = (newGroupId) => {
    setIsCreatingGroup(false);
    setActivePane("chats");
    // optionally you can pass newGroupId to Chats component for opening the new chat
  };

  const renderContent = () => {
    switch (activePane) {
      case "chats":
        return isCreatingGroup ? (
          <CreateGroup
            userRole={userRole}
            userName={userName}
            userSubjects={userSubjects}
            userSection={userSection}
            onGroupCreated={handleGroupCreated}
          />
        ) : (
          <Chats
            userRole={userRole}
            onCreateGroupClick={() => setIsCreatingGroup(true)}
          />
        );

      case "notifications":
        return <Notifications />;

      case "meetings":
        return <MeetingsPage userRole={userRole} userName={userName} />;

      case "attendance":
        return <Attendance />;

      default:
        return (
          <div
            className={`rounded-lg shadow-lg p-14 max-w-3xl mx-auto text-center flex flex-col items-center justify-center min-h-[60vh] ${
              darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"
            }`}
          >
            <div className="flex space-x-6 mb-6 text-5xl">
              <MdEmojiPeople
                className="animate-bounce"
                style={{ color: darkMode ? "#fbb6ce" : "#ec4899" }}
              />
              <MdStars
                className="animate-pulse"
                style={{ color: darkMode ? "#facc15" : "#eab308" }}
              />
              <MdMood
                className="animate-bounce"
                style={{ color: darkMode ? "#2dd4bf" : "#14b8a6" }}
              />
            </div>
            <h2 className="text-4xl font-extrabold mb-4 text-blue-700">
              Welcome, {userName}!
            </h2>
            <p className="text-xl mb-8 max-w-xl">
              You are logged in as a{" "}
              <span className="font-semibold">
                {userRole === "professor" ? "Professor" : "Student"}
              </span>
              .
            </p>
            <p
              className={`text-gray-600 italic max-w-xl ${
                darkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Select a section on the left sidebar to get started.
            </p>
          </div>
        );
    }
  };

  const sidebarBtnClasses = (pane) =>
    `flex items-center space-x-4 p-4 rounded cursor-pointer transition-colors duration-200 hover:bg-blue-100 ${
      activePane === pane ? "bg-blue-200 font-semibold shadow" : ""
    }`;

  return (
    <div
      className={`min-h-screen flex ${
        darkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-800"
      }`}
    >
      {/* Left Sidebar */}
      <aside
        className={`w-56 ${
          darkMode ? "bg-gray-800" : "bg-white"
        } shadow flex flex-col items-start py-10 px-6 space-y-6 sticky top-0 h-screen`}
      >
        {/* User avatar and greeting */}
        <div className="flex items-center space-x-4 mb-10 w-full px-2">
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt="Avatar"
              title={userName}
              className="rounded-full"
              style={{
                width: 64,
                height: 64,
                objectFit: "cover",
                border: "2px solid #3b82f6",
              }}
            />
          ) : (
            <div
              style={{ width: 64, height: 64 }}
              className="rounded-full bg-gray-300"
            />
          )}
          <div className="flex items-center">
            {/* Lighter color for dark mode */}
            <p
              className={`font-semibold ${
                darkMode ? "text-gray-300" : "text-gray-700"
              } text-lg`}
            >
              Hi, {userName}!
            </p>
          </div>
        </div>

        {/* Sidebar Buttons */}
        <button
          onClick={() => {
            setActivePane("chats");
            setIsCreatingGroup(false);
          }}
          className={sidebarBtnClasses("chats")}
          aria-label="Chats"
        >
          <FaComments className="text-3xl text-green-600" />
          <span className="text-lg select-none">Chats</span>
        </button>

        <button
          onClick={() => {
            setActivePane("notifications");
            setIsCreatingGroup(false);
          }}
          className={sidebarBtnClasses("notifications")}
          aria-label="Notifications"
        >
          <FaBell className="text-3xl text-yellow-500" />
          <span className="text-lg select-none">Notifications</span>
        </button>

        <button
          onClick={() => {
            setActivePane("meetings");
            setIsCreatingGroup(false);
          }}
          className={sidebarBtnClasses("meetings")}
          aria-label="Meetings"
        >
          <FaCalendarAlt className="text-3xl text-blue-600" />
          <span className="text-lg select-none">Meetings</span>
        </button>

        <button
          onClick={() => {
            setActivePane("attendance");
            setIsCreatingGroup(false);
          }}
          className={sidebarBtnClasses("attendance")}
          aria-label="Attendance Logs"
        >
          <FaUsers className="text-3xl text-purple-600" />
          <span className="text-lg select-none">Attendance</span>
        </button>

        {/* Spacer */}
        <div className="flex-grow" />

        {/* Logout Icon Button */}
        <button
          onClick={() => auth.signOut().then(() => navigate("/"))}
          className="flex items-center space-x-3 text-red-600 hover:text-red-700 transition w-full px-3 py-3 rounded hover:bg-red-100"
          aria-label="Logout"
        >
          <FaSignOutAlt className="text-2xl" />
          <span className="font-semibold select-none text-lg">Logout</span>
        </button>
      </aside>

      {/* Right Content Pane */}
      <main className="flex-1 p-8 overflow-auto relative">
        {/* Dark/Light toggle on top right */}
        <div className="absolute top-6 right-6">
          <div
            className="relative w-14 h-8 flex items-center bg-gray-300 rounded-full p-1 cursor-pointer select-none"
            onClick={toggleDarkMode}
          >
            <div
              className={`bg-white w-6 h-6 rounded-full shadow-md transform duration-300 ease-in-out flex items-center justify-center text-xs ${
                darkMode ? "translate-x-6" : "translate-x-0"
              }`}
            >
              {darkMode ? <span className="text-gray-800">🌙</span> : <span>☀️</span>}
            </div>
          </div>
        </div>

        {renderContent()}
      </main>
    </div>
  );
}
