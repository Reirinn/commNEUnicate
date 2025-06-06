import React, { useEffect, useRef, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  doc,
  setDoc,
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
    }, 120000); 

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

        const recognizedEmails = new Set();

        const captureLoop = setInterval(async () => {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = canvas.toDataURL("image/jpeg");

          try {
            const response = await axios.post("https://flask-b1tryl19cnn1.onrender.com/verify-face", {
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

            if (!recognizedFaces || recognizedFaces.length === 0) {
              if (knownEmails.has(userEmail)) {
                await addDoc(usersColRef, {
                  email: userEmail,
                  name: userName,
                  attendanceStatus: "In meeting but not properly recognized",
                  timestamp: serverTimestamp(),
                });
                console.log("Logged: In meeting but not properly recognized");
              } else {
                await addDoc(usersColRef, {
                  email: userEmail,
                  name: userName,
                  attendanceStatus: "In meeting but not recognized",
                  timestamp: serverTimestamp(),
                });
                console.log("Logged: In meeting but not recognized");
              }
            } else {
              let userRecognized = false;

              for (const face of recognizedFaces) {
                if (face.email === userEmail) {
                  userRecognized = true;
                  if (!recognizedEmails.has(face.email)) {
                    recognizedEmails.add(face.email);
                    await addDoc(usersColRef, {
                      email: face.email,
                      name: face.name,
                      attendanceStatus: "Present",
                      timestamp: serverTimestamp(),
                    });
                    console.log("Logged: Present");
                  }
                }
              }

              if (!userRecognized) {
                if (knownEmails.has(userEmail)) {
                  await addDoc(usersColRef, {
                    email: userEmail,
                    name: userName,
                    attendanceStatus: "In meeting but not properly recognized",
                    timestamp: serverTimestamp(),
                  });
                  console.log("Logged: In meeting but not properly recognized");
                } else {
                  await addDoc(usersColRef, {
                    email: userEmail,
                    name: userName,
                    attendanceStatus: "In meeting but not recognized",
                    timestamp: serverTimestamp(),
                  });
                  console.log("Logged: In meeting but not recognized");
                }
              }
            }
          } catch (error) {
            console.error("Recognition error:", error);
          }
        }, 3000); 

        setTimeout(() => {
          clearInterval(captureLoop);
          stream.getTracks().forEach(track => track.stop());
          video.remove();
          setTracking(false);
          setTrackingMessage("");
          console.log("Stopped attendance tracking for this session.");
        }, 15000);
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
