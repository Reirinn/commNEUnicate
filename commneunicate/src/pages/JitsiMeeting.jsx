import React, { useEffect, useRef, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import axios from "axios";

export default function JitsiMeeting({ roomName, userName, userEmail, userRole }) {
  const jitsiRef = useRef(null);
  const [tracking, setTracking] = useState(false);
  const [intervalId, setIntervalId] = useState(null);
  const [trackingMessage, setTrackingMessage] = useState("");
  const sessionIdRef = useRef(null);

  const knownEmails = new Set([
    "joe.dominguez@neu.edu.ph",
    "johnjohan.sanjuan@neu.edu.ph",
    "rayleenrae.bitoon@neu.edu.ph",
    "rylanbitoon53@gmail.com",
  ]);

  useEffect(() => {
    if (!roomName || !userName || !userEmail || !userRole) return;

    const domain = "meet.jit.si";
    const options = {
      roomName,
      parentNode: jitsiRef.current,
      userInfo: {
        displayName: userName,
      },
      configOverwrite: {
        disableDeepLinking: true,
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        TOOLBAR_BUTTONS: ["microphone", "camera", "chat", "raisehand", "hangup"],
      },
    };

    const api = new window.JitsiMeetExternalAPI(domain, options);

    api.addEventListener("videoConferenceJoined", () => {
      console.log("Joined room:", roomName);
      if (userRole === "student") {
        console.log("🔍 Student joined — attendance tracking will begin.");
        createSessionAndStartTracking();
      } else {
        console.log("👨‍🏫 Professor joined — no tracking.");
      }
    });

    return () => {
      api.dispose();
      stopAutoTracking();
    };
  }, [roomName, userName, userEmail, userRole]);

  const createSessionDoc = async () => {
    try {
      const sessionsRef = collection(db, "attendance", roomName, "sessions");
      const sessionDocRef = await addDoc(sessionsRef, {
        createdAt: serverTimestamp(),
      });
      console.log("Created session doc:", sessionDocRef.id);
      return sessionDocRef.id;
    } catch (error) {
      console.error("Failed to create session doc:", error);
      return null;
    }
  };

  const createSessionAndStartTracking = async () => {
    const id = await createSessionDoc();
    if (!id) {
      console.error("Could not create session, aborting tracking");
      return;
    }
    sessionIdRef.current = id;
    startAutoTracking();
  };

  const startAutoTracking = () => {
    if (intervalId) {
      console.log("Tracking already running");
      return;
    }

    setTracking(true);
    setTrackingMessage("📸 Attendance Tracking in progress...");
    forceOpenCameraAndTrack();

    const id = setInterval(() => {
      setTracking(true);
      setTrackingMessage("📸 Attendance Tracking in progress...");
      forceOpenCameraAndTrack();
    }, 120000); // every 2 minutes

    setIntervalId(id);
  };

  const stopAutoTracking = () => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
      setTracking(false);
      setTrackingMessage("");
      console.log("Stopped attendance tracking.");
    }
  };

  const forceOpenCameraAndTrack = () => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        const video = document.createElement("video");
        video.srcObject = stream;
        video.play();
        video.style.display = "none";
        document.body.appendChild(video);

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        let alreadyLogged = false;

        const captureLoop = setInterval(async () => {
          if (alreadyLogged) return;

          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = canvas.toDataURL("image/jpeg");

          try {
            const response = await axios.post("http://localhost:5000/verify-face", {
              image: imageData,
              roomName,
            });

            const recognizedFaces = response.data.faces;
            const usersColRef = collection(
              db,
              "attendance",
              roomName,
              "sessions",
              sessionIdRef.current,
              "users"
            );

            let userStatus = "In meeting but not recognized"; // default

            if (recognizedFaces && recognizedFaces.length > 0) {
              const matchedFace = recognizedFaces.find(
                (face) => face.email === userEmail
              );

              if (matchedFace) {
                userStatus = "Present";
                console.log("✅ Recognized and email matched — Present");
              } else if (knownEmails.has(userEmail)) {
                userStatus = "In meeting but not properly recognized";
                console.log("⚠️ Recognized someone else — not properly recognized");
              } else {
                userStatus = "In meeting but not recognized";
                console.log("❌ Recognized but email mismatch — not recognized");
              }
            } else if (knownEmails.has(userEmail)) {
              userStatus = "In meeting but not properly recognized";
              console.log("⚠️ No recognition — not properly recognized");
            } else {
              userStatus = "In meeting but not recognized";
              console.log("❌ No recognition — not recognized");
            }

            await addDoc(usersColRef, {
              email: userEmail,
              name: userName,
              attendanceStatus: userStatus,
              timestamp: serverTimestamp(),
            });

            alreadyLogged = true;
          } catch (error) {
            console.error("Recognition error:", error);
          }
        }, 3000); // every 3s

        setTimeout(() => {
          clearInterval(captureLoop);
          stream.getTracks().forEach(track => track.stop());
          video.remove();
          setTracking(false);
          setTrackingMessage("");
          console.log("🛑 Stopped tracking for this cycle.");
        }, 15000); // stop after 15s
      })
      .catch((err) => {
        console.error("Camera access error:", err);
      });
  };

  return (
    <div className="p-4">
      {tracking && (
        <div className="text-lg font-semibold mb-2 text-center text-yellow-600">
          {trackingMessage}
        </div>
      )}
      <div ref={jitsiRef} style={{ height: "80vh", width: "100%" }}></div>
    </div>
  );
}
