import React, { useEffect, useRef, useState } from "react";
import axios from "axios";

export default function JitsiMeeting({ roomName, userName, userEmail, userRole }) {
  const jitsiContainerRef = useRef(null);
  const apiRef = useRef(null);
  const [attendance, setAttendance] = useState([]);
  const [meetingStarted, setMeetingStarted] = useState(false); // Track if professor has joined
  const [trackingStatus, setTrackingStatus] = useState(""); // State to show tracking status message
  const [isMeetingEnded, setIsMeetingEnded] = useState(false); // Track if meeting is ended

  const recognizedUsers = {
    "joe.dominguez@neu.edu.ph": "Dominguezz",
    "johnjohan.sanjuan@neu.edu.ph": "Johan",
    "rayleenrae.bitoon@neu.edu.ph": "Rayleen",
    "rylanbitoon53@gmail.com": "Rhys"
  };

  // Function to send video feed to Flask server for facial recognition
  const sendVideoToFlask = (videoElement) => {
    const canvas = document.createElement("canvas");
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    // Convert canvas image to base64
    const imageBase64 = canvas.toDataURL("image/jpeg");

    // Send image to Flask for recognition
    axios
      .post("http://localhost:5000/verify-face", { image: imageBase64 })
      .then((response) => {
        const { verified, name, message } = response.data;
        const timestamp = new Date().toISOString();

        if (verified) {
          setAttendance((prev) => [
            ...prev,
            { name, email: userEmail, timestamp, status: "Present" },
          ]);
        } else {
          setAttendance((prev) => [
            ...prev,
            { name: message, email: userEmail, timestamp, status: "Not Recognized" },
          ]);
        }
      })
      .catch((error) => {
        console.error("Error during face recognition:", error);
      });
  };

  // Start the facial recognition process
  const startFacialRecognition = () => {
    if (apiRef.current) {
      const participants = apiRef.current.getParticipantsInfo(); // Get participants info
      participants.forEach((participant) => {
        // Skip the professor
        if (participant.role !== "professor") {
          const videoElement = apiRef.current.getParticipantVideoElement(participant.id);

          if (videoElement) {
            sendVideoToFlask(videoElement);
          }
        }
      });
    }
  };

  useEffect(() => {
    if (!roomName) return;

    // Check if Jitsi Meet API is available
    if (!window.JitsiMeetExternalAPI) {
      console.error("JitsiMeetExternalAPI not loaded");
      return;
    }

    const domain = "meet.jit.si";
    const options = {
      roomName: roomName.replace(/\s/g, ""),
      parentNode: jitsiContainerRef.current,
      width: "100%",
      height: "100%",
      userInfo: { displayName: userName, email: userEmail },
      interfaceConfigOverwrite: { SHOW_JITSI_WATERMARK: false },
      configOverwrite: { startWithAudioMuted: true, startWithVideoMuted: true },
    };

    // Initialize Jitsi meeting
    apiRef.current = new window.JitsiMeetExternalAPI(domain, options);

    apiRef.current.addEventListener("videoConferenceJoined", () => {
      if (userRole === "professor") {
        setMeetingStarted(true);
        setTrackingStatus("Tracking attendance..."); // Show tracking message when professor joins
        // Start facial recognition for students every 2 minutes
        const interval = setInterval(() => {
          startFacialRecognition(); // Start facial recognition for all students
        }, 120000);  // 2 minutes in milliseconds

        // Clear the interval when the component unmounts
        return () => clearInterval(interval);
      }
    });

    // Monitor when the professor ends the call (meeting ends)
    apiRef.current.addEventListener("videoConferenceLeft", () => {
      if (userRole === "professor") {
        setIsMeetingEnded(true); // Mark meeting as ended
        setTrackingStatus("Please proceed to the attendance tab to get attendance records.");
      }
    });

    return () => {
      if (apiRef.current) {
        apiRef.current.dispose();
      }
    };
  }, [roomName, userName, userEmail, userRole]);

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      {/* Jitsi Meeting Embed */}
      <div ref={jitsiContainerRef} style={{ height: "80vh", width: "100%" }} />

      {/* Display tracking status */}
      {meetingStarted && !isMeetingEnded && (
        <div style={{ marginTop: "20px" }}>
          <p>{trackingStatus}</p>
        </div>
      )}

      {/* Show message when the professor ends the meeting */}
      {isMeetingEnded && (
        <div style={{ marginTop: "20px", fontSize: "18px", color: "green" }}>
          <p>{trackingStatus}</p>
        </div>
      )}
    </div>
  );
}
