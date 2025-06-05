import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import { useNavigate, useLocation } from "react-router-dom";
import emailjs from "emailjs-com";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

const MAX_ATTEMPTS = 3;

// Email to name mapping
const userMapping = {
  "joe.dominguez@neu.edu.ph": "Dominguezz",
  "rayleenrae.bitoon@neu.edu.ph": "Rayleen",
  "rylanbitoon53@gmail.com": "Rhys",
  "johnjohan.sanjuan@neu.edu.ph": "Johan",
};

export default function FaceLogin({ darkMode, toggleDarkMode }) {
  const location = useLocation();
  const { userId, userEmail, darkMode: userDarkMode } = location.state || {}; // Destructure userId and userEmail from navigate state

  const [role, setRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [notification, setNotification] = useState(""); // State for notifications
  const [otpExpired, setOtpExpired] = useState(false); // State for OTP expiry
  const [timer, setTimer] = useState(null); // For the timer that counts down 15 minutes
  const navigate = useNavigate();

  // Initialize webcam reference
  const webcamRef = useRef(null);

  // Fetch the user's role from Firestore based on userId
  useEffect(() => {
    if (userId) {
      const fetchUserData = async () => {
        try {
          const userDocRef = doc(db, "users", userId);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setRole(userDoc.data().role);
          }
        } catch (err) {
          console.error("Error fetching user data:", err);
        } finally {
          setRoleLoading(false);
        }
      };

      fetchUserData();
    } else {
      setRoleLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (otpSent) {
      const timerInterval = setInterval(() => {
        setTimer((prevTimer) => {
          if (prevTimer === 0) {
            clearInterval(timerInterval);
            setOtpExpired(true);
          }
          return prevTimer - 1;
        });
      }, 1000);
      return () => clearInterval(timerInterval);
    }
  }, [otpSent]);

  if (roleLoading) return <div>Loading user info...</div>;
  if (!userId || !userEmail) return <div>Please log in first.</div>;

  const storeOtpInFirestore = async (passcode, expireTimestamp) => {
    try {
      const otpDocRef = doc(db, "otp", userId);
      await setDoc(otpDocRef, {
        passcode,
        expireTime: expireTimestamp,
        verified: false,
      });
    } catch (err) {
      console.error("Error storing OTP:", err);
    }
  };

  const sendOtpAndStore = async () => {
    if (!userEmail) {
      console.error("User email is not available.");
      alert("Failed to send OTP. Email is missing.");
      return;
    }

    const passcode = Math.floor(100000 + Math.random() * 900000).toString();
    const expireTimestamp = Date.now() + 15 * 60 * 1000; // 15 minutes expiry

    console.log("Sending OTP to: ", userEmail); // Debugging step

    try {
      await emailjs.send(
        "service_ldb6eiq",
        "template_ok8yvix",
        {
          passcode,
          time: new Date(expireTimestamp).toLocaleTimeString(),
          to_email: userEmail, // Ensure this is populated correctly
        },
        "_t0q6WlQ2rNFR0o_6"
      );
      await storeOtpInFirestore(passcode, expireTimestamp);
      if (!otpSent) {
        setNotification("Too many failed attempts. OTP sent to your email.");
        setOtpSent(true); // Ensure this is shown only once
        setTimer(15 * 60); // 15-minute countdown
      }
    } catch (err) {
      console.error("EmailJS Error:", err);
    }
  };

  const verifyOtpFromFirestore = async () => {
    try {
      const otpDocRef = doc(db, "otp", userId);
      const otpDocSnap = await getDoc(otpDocRef);

      if (!otpDocSnap.exists()) {
        alert("No OTP found. Please request a new one.");
        return false;
      }

      const data = otpDocSnap.data();

      if (data.verified) {
        alert("OTP already used. Please request a new one.");
        return false;
      }

      if (Date.now() > data.expireTime) {
        alert("OTP expired. Please request a new one.");
        return false;
      }

      if (otpInput !== data.passcode) {
        alert("Invalid OTP. Please try again.");
        return false;
      }

      await setDoc(otpDocRef, { ...data, verified: true });
      setNotification("OTP verified successfully!"); // Show the "OTP verified" notification
      setOtpVerified(true);
      setAttempts(0);
      // Redirect to the dashboard immediately after OTP is verified
      navigate("/dashboard");
      return true;
    } catch (err) {
      console.error("OTP verification error:", err);
      alert("Error verifying OTP.");
      return false;
    }
  };

  const compareFaceWithEmail = (recognizedName) => {
    // Check if recognized name matches the email's expected name
    if (userMapping[userEmail] === recognizedName) {
      return true;
    } else {
      return false;
    }
  };

  const verifyFace = async () => {
    if (
      !webcamRef.current ||
      verifying ||
      verified ||
      attempts >= MAX_ATTEMPTS && !otpVerified
    )
      return;

    setVerifying(true);
    const imageSrc = webcamRef.current.getScreenshot();

    try {
      const response = await fetch("http://localhost:5000/verify-face", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageSrc }),
      });

      const result = await response.json();
      setVerifying(false);

      if (result.verified) {
        // If the name recognized by the model is correct for the email
        const isValid = compareFaceWithEmail(result.name);
        if (isValid) {
          setVerified(true);
          alert(`✅ Welcome back, ${result.name}! Role: ${role || "Unknown"}`);
          setTimeout(() => navigate("/dashboard"), 2000);
        } else {
          // If name does not match the expected name for the email, treat as a failed attempt
          alert("❌ Try Again");
          setAttempts((prev) => {
            const next = prev + 1;
            if (next >= MAX_ATTEMPTS && !otpSent) sendOtpAndStore();
            return next;
          });
        }
      } else {
        alert("❌ Face not recognized.");
        setAttempts((prev) => {
          const next = prev + 1;
          if (next >= MAX_ATTEMPTS && !otpSent) sendOtpAndStore();
          return next;
        });
      }
    } catch (error) {
      console.error("Verification Error:", error);
      alert("Verification failed. Please try again.");
      setVerifying(false);
    }
  };

  return (
    <div
      className={`flex flex-col items-center justify-center min-h-screen px-4 transition-colors duration-300 ${
        darkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-black"
      }`}
    >
      {/* Dark mode toggle button fixed top-right */}
      <div
        className="fixed top-8 right-8 w-14 h-8 flex items-center bg-gray-300 rounded-full p-1 cursor-pointer"
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
        Facial Login {role ? `as ${role.charAt(0).toUpperCase() + role.slice(1)}` : ""}
      </h2>

      <div
        className={`relative w-80 h-80 mb-4 rounded-full overflow-hidden border-8 flex items-center justify-center ${
          verified ? "border-green-500" : "border-blue-600"
        }`}
      >
        <Webcam
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          className="object-cover w-full h-full"
        />
      </div>

      <div className="mt-6 flex flex-col space-y-3">
        <button
          onClick={verifyFace}
          disabled={
            verifying ||
            verified ||
            (attempts >= MAX_ATTEMPTS && !otpVerified)
          }
          className={`w-full py-3 rounded transition ${
            verifying || (attempts >= MAX_ATTEMPTS && !otpVerified)
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {verifying
            ? "Verifying..."
            : verified
            ? "Face Verified"
            : attempts >= MAX_ATTEMPTS && !otpVerified
            ? "OTP verification required"
            : "Verify Face"}
        </button>

        {/* Show OTP input if max attempts reached */}
        {attempts >= MAX_ATTEMPTS && !otpVerified && (
          <>
            <input
              type="text"
              maxLength={6}
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value)}
              placeholder="Enter OTP"
              className="w-full p-2 rounded border border-gray-300 text-black"
            />
            <button
              onClick={verifyOtpFromFirestore}
              className="w-full py-2 rounded bg-green-600 hover:bg-green-700 text-white"
              disabled={!otpInput || otpInput.length !== 6}
            >
              Verify OTP
            </button>

            {/* Show resend OTP button after 15 minutes */}
            {otpExpired && !otpVerified && (
              <button
                onClick={sendOtpAndStore}
                className="w-full py-2 mt-4 rounded bg-yellow-500 hover:bg-yellow-600 text-white"
              >
                Resend Code
              </button>
            )}
          </>
        )}
      </div>

      {/* Display notification once for failed attempts or OTP verified */}
      {notification && (
        <div className="mt-4 text-center text-red-500">
          {notification}
        </div>
      )}

      {verified && (
        <p className="mt-4 text-center text-green-500">✅ Face verified successfully!</p>
      )}
      {attempts > 0 && !verified && (
        <p className="mt-4 text-center text-red-500">
          ❗ Attempts: {attempts}/{MAX_ATTEMPTS}
        </p>
      )}
    </div>
  );
}
