import React, { useEffect, useRef, useState } from "react";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function FaceRegistration({ user, darkMode, toggleDarkMode }) {
  const videoRef = useRef(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [capturedCount, setCapturedCount] = useState(0);
  const totalImages = 200;
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !user.uid) {
      console.error("❌ User UID is missing, redirecting to signup.");
      navigate("/signup");
    }
  }, [user, navigate]);

  const startVideo = () => {
    if (!videoRef.current || videoRef.current.srcObject) return;
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        videoRef.current.srcObject = stream;
      })
      .catch((err) => console.error("Camera error:", err));
  };

  const captureImages = async () => {
    if (!user || !user.uid) {
      console.error("❌ User UID is missing");
      return;
    }

    setIsCapturing(true);
    setProgress(0);
    setCapturedCount(0);

    const duration = 10000; // 10 seconds
    const captureInterval = duration / totalImages;

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const stream = videoRef.current.srcObject;

    let count = 0;
    let isFinished = false;

    const timer = setInterval(async () => {
      if (!videoRef.current || !context || isFinished) return;

      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const base64Image = canvas.toDataURL("image/jpeg");

      try {
        const response = await fetch("http://localhost:5000/verify-face", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64Image }),
        });

        const result = await response.json();

        if (result.verified) {
          await addDoc(collection(db, "users", user.uid, "face_datasets"), {
            image: base64Image,
            timestamp: new Date(),
          });

          count++;
          setCapturedCount(count);
          setProgress(Math.floor((count / totalImages) * 100));
          console.log(`📸 Saved ${count}/${totalImages}`);

          if (count >= totalImages && !isFinished) {
            isFinished = true;
            clearInterval(timer);
            stream.getTracks().forEach((track) => track.stop());
            alert("✅ Face Images Gathered Successfully! Please Log in.");
            navigate("/");
          }
        } else {
          console.log("⚠️ No face detected. Skipping frame.");
        }
      } catch (e) {
        console.error("❌ Error verifying/saving image:", e);
      }
    }, captureInterval);
  };

  useEffect(() => {
    if (videoRef.current && !isCapturing) {
      startVideo();
    }
  }, [isCapturing]);

  return (
    <div
      className={`flex flex-col items-center justify-center min-h-screen px-4 transition-colors duration-300 ${
        darkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-black"
      }`}
    >
      <div
        className={`relative shadow-xl rounded-2xl p-6 w-full max-w-lg ${
          darkMode ? "bg-gray-800 text-white" : "bg-white text-black"
        }`}
      >
        <div
          className="absolute top-4 right-4 w-14 h-8 flex items-center bg-gray-300 rounded-full p-1 cursor-pointer"
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

        <h2 className="text-2xl font-bold text-center mb-4">Facial Registration</h2>

        <div className="rounded-full overflow-hidden w-64 h-64 mx-auto border-4 border-blue-500">
          <video
            ref={videoRef}
            autoPlay
            muted
            className="object-cover w-full h-full"
            onPlay={startVideo}
          />
        </div>

        {!isCapturing && (
          <button
            onClick={captureImages}
            className="mt-6 w-full py-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50"
          >
            Start Capturing Face Image
          </button>
        )}

        {isCapturing && (
          <div className="mt-6 w-full bg-gray-300 rounded-full h-4">
            <div
              className="bg-green-500 h-4 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}
      </div>
    </div>
  );
}
