import React, { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { db } from "../firebase";
import { doc, setDoc } from "firebase/firestore"; // Import necessary Firestore functions

export default function Meetings() {
  const location = useLocation();
  const { roomName, userName, userEmail, subject, section, professor } = location.state || {}; // Retrieve passed props
  const [isTracking, setIsTracking] = useState(false);
  const [attendance, setAttendance] = useState([]); // Track the attendance of students
  const [isProfessor, setIsProfessor] = useState(false); // Check if the user is a professor
  const jitsiContainerRef = useRef(null);
  const apiRef = useRef(null);  // Reference for Jitsi API

  // Check if the current user is the professor
  useEffect(() => {
    if (userName === professor) {
      setIsProfessor(true); // Set to true if the user is the professor
    }
  }, [userName, professor]);

  // Initialize Jitsi meeting interface
  useEffect(() => {
    if (!roomName) return;

    if (!window.JitsiMeetExternalAPI) {
      console.error("JitsiMeetExternalAPI not loaded");
      return;
    }

    if (apiRef.current) {
      apiRef.current.dispose();
    }

    const domain = "meet.jit.si";
    const options = {
      roomName: roomName.replace(/\s/g, ""), // Clean up room name to avoid issues with spaces
      parentNode: jitsiContainerRef.current,
      width: "100%",
      height: "100%",
      userInfo: {
        displayName: userName || "Guest",
        email: userEmail || "",
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        DEFAULT_BACKGROUND: "#000000",
        LOBBY_ENABLED: false,  // Disable lobby
      },
      configOverwrite: {
        enableUserRolesBasedOnToken: false,
        enableLobby: false,  // Disable lobby
        startWithAudioMuted: true,
        startWithVideoMuted: true,
      },
    };

    apiRef.current = new window.JitsiMeetExternalAPI(domain, options);

    return () => {
      if (apiRef.current) apiRef.current.dispose();
    };
  }, [roomName, userName, userEmail]);

  // Start attendance tracking
  const startTracking = () => {
    setIsTracking(true);
    setAttendance([]); // Clear previous attendance data
  };

  // Stop attendance tracking
  const stopTracking = async () => {
    setIsTracking(false);
    // Store attendance data in Firestore under the specific meeting room
    if (roomName) {
      const meetingRef = doc(db, "meetings", roomName);
      await setDoc(meetingRef, { attendance }, { merge: true });
    }
  };

  // Handle face recognition callback
  const onStudentRecognized = (studentName) => {
    // Add recognized student to the attendance list if not already added
    if (!attendance.includes(studentName)) {
      setAttendance((prev) => [...prev, studentName]);
    }
  };

  return (
    <div className="min-h-screen p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">
        {subject} - {section} with Prof. {professor}
      </h1>

      {/* Jitsi Meeting Component */}
      <div
        ref={jitsiContainerRef}
        style={{
          height: "80vh",
          width: "100%",
          borderRadius: 8,
          overflow: "hidden",
          backgroundColor: "#000",
        }}
      />
      
      {/* Only show attendance buttons when the user is the professor */}
      {isProfessor && (
        <div className="fixed bottom-8 right-8 space-y-4">
          <button
            onClick={startTracking}
            className="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Start Tracking Attendance
          </button>
          <button
            onClick={stopTracking}
            className="px-6 py-3 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Stop Tracking Attendance
          </button>
        </div>
      )}

      {/* Displaying the tracked attendance */}
      {isTracking && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-2">Attendance:</h2>
          <ul>
            {attendance.length > 0 ? (
              attendance.map((student, index) => (
                <li key={index} className="text-lg text-gray-700">
                  {student}
                </li>
              ))
            ) : (
              <p className="text-gray-500">No students have entered yet.</p>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
