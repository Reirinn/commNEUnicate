import React, { useState, useEffect } from "react";
import { FcGoogle } from "react-icons/fc";
import { auth, provider, db } from "../firebase";
import { signInWithPopup } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import SignUpForm from "./SignUpForm";
import { useNavigate } from "react-router-dom";

export default function HomePage({ darkMode, toggleDarkMode }) {
  const [role, setRole] = useState(null);
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState("login");
  const navigate = useNavigate();

  const handleAuth = async (action) => {
    try {
      const result = await signInWithPopup(auth, provider);
      const loggedUser = result.user;

      // Temporarily disable institutional email restriction for testing
      /*
      if (!loggedUser.email.endsWith("@neu.edu.ph")) {
        alert("Only institutional @neu.edu.ph emails are allowed.");
        await auth.signOut();
        return;
      }
      */

      const userDocRef = doc(db, "users", loggedUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (action === "signup" && userDoc.exists()) {
        alert("Account already exists. Please log in.");
        return;
      }

      if (action === "login" && !userDoc.exists()) {
        alert("No account found. Please sign up first.");
        return;
      }

      setUser(loggedUser);
      setMode(action);
    } catch (error) {
      console.error("Authentication error:", error);
      alert("Authentication failed. Please try again.");
    }
  };

  useEffect(() => {
    if (user && mode === "login") {
      navigate("/face-login");
    }
  }, [user, mode, navigate]);

  if (user && mode === "signup") {
    return <SignUpForm user={user} role={role} darkMode={darkMode} toggleDarkMode={toggleDarkMode} />;
  }

  return (
    <div
      className={`${darkMode ? "bg-gray-900 text-white" : "bg-blue-50 text-gray-800"} min-h-screen flex flex-col items-center justify-center px-4 transition-colors duration-300 bg-[url('/background-pattern.svg')] bg-cover`}
    >
      <div className={`shadow-xl rounded-2xl p-10 w-full max-w-2xl text-center ${darkMode ? "bg-gray-800" : "bg-white"}`}>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold text-blue-600">commNEUnicate</h1>
          {/* Dark mode toggle button */}
          <div
            className="relative w-14 h-8 flex items-center bg-gray-300 rounded-full p-1 cursor-pointer"
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

        <p className="mb-8">A secure and intelligent platform for New Era University students and professors.</p>

        {!role ? (
          <div className="flex justify-center space-x-6 mb-8">
            <button
              onClick={() => setRole("student")}
              className="px-6 py-3 bg-blue-700 text-white rounded-full text-lg hover:bg-blue-800 transition"
            >
              Student
            </button>
            <button
              onClick={() => setRole("professor")}
              className="px-6 py-3 bg-green-600 text-white rounded-full text-lg hover:bg-green-700 transition"
            >
              Professor
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {mode === "login" && (
              <>
                <h3 className="text-lg font-semibold mb-2">
                  Login as {role.charAt(0).toUpperCase() + role.slice(1)}
                </h3>
                <button
                  onClick={() => handleAuth("login")}
                  className="flex items-center justify-center w-full border border-blue-500 text-blue-700 py-3 rounded-full hover:bg-blue-100 transition"
                >
                  <FcGoogle className="mr-3 text-xl" /> Continue with Google
                </button>
                <p className="text-sm mt-4">
                  Don't have an account?{" "}
                  <button onClick={() => setMode("signup")} className="text-blue-600 underline">
                    Sign Up
                  </button>
                </p>
              </>
            )}

            {mode === "signup" && (
              <>
                <h3 className="text-lg font-semibold mb-2">
                  Sign Up as {role.charAt(0).toUpperCase() + role.slice(1)}
                </h3>
                <button
                  onClick={() => handleAuth("signup")}
                  className="flex items-center justify-center w-full border border-green-500 text-green-700 py-3 rounded-full hover:bg-green-100 transition"
                >
                  <FcGoogle className="mr-3 text-xl" /> Continue with Google
                </button>
                <p className="text-sm mt-4">
                  Already have an account?{" "}
                  <button onClick={() => setMode("login")} className="text-blue-600 underline">
                    Log In
                  </button>
                </p>
              </>
            )}

            <div className="pt-4">
              <button onClick={() => setRole(null)} className="text-sm underline hover:text-blue-600">
                ← Change Role
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
