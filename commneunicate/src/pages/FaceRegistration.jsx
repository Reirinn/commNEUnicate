import React, { useRef, useState } from "react";
import Webcam from "react-webcam";
import { useNavigate } from "react-router-dom";

export default function FaceRegistration({ user, darkMode, toggleDarkMode }) {
  const webcamRef = useRef(null);
  const [capturing, setCapturing] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  const fakeCapture = () => {
    setCapturing(true);
    setTimeout(() => {
      setCapturing(false);
      setDone(true);
      setTimeout(() => {
        alert("🎉 Account successfully created! Please login.");
        navigate("/");
      }, 2000);
    }, 1500);
  };

  return (
    <div className={`${darkMode ? "bg-gray-900 text-white" : "bg-gradient-to-br from-gray-100 to-blue-200 text-gray-900"} flex flex-col items-center justify-center min-h-screen p-6 transition-colors duration-300 relative`}>
      {/* Dark mode toggle button fixed top-right */}
      <div
        className="fixed top-8 right-8 w-14 h-8 flex items-center bg-gray-300 rounded-full p-1 cursor-pointer z-50"
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

      <h2 className={`${darkMode ? "text-blue-400" : "text-blue-800"} text-2xl font-bold mb-4`}>
        Facial Registration
      </h2>

      <div
        className={`relative w-80 h-80 mb-4 rounded-full overflow-hidden border-8 flex items-center justify-center ${
          done ? "border-green-500" : "border-blue-600"
        }`}
      >
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 border-[10px] border-white rounded-full" />
      </div>

      <button
        onClick={fakeCapture}
        disabled={capturing || done}
        className="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 disabled:opacity-50 transition"
      >
        {capturing ? "Scanning..." : done ? "✅ Done" : "Start Face Scan"}
      </button>

      {done && (
        <p className="text-green-600 mt-4 font-medium">
          ✅ Facial dataset captured successfully!
        </p>
      )}
    </div>
  );
}
