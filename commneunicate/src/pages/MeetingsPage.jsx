import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

export default function MeetingsPage({
  userRole,
  userName,
  photoURL,
  darkMode, // For styling from parent
  onSelectMeeting, // Function to call on Join click to open Jitsi in Dashboard right pane
}) {
  const [meetings, setMeetings] = useState([]);
  const [showForm, setShowForm] = useState(false);

  // Form states
  const [subject, setSubject] = useState("");
  const [section, setSection] = useState("");
  const [schedule, setSchedule] = useState("");

  // Sample subjects & sections
  const subjectOptions = [
    "Introduction to Programming",
    "Data Analytics",
    "Data Structures and Algorithms",
    "Human-Computer Interaction",
    "Application Development",
  ];
  const sectionOptions = ["4BSCS-1", "4BSCS-2"];

  // Fetch meetings filtered by user role and subjects/section
  const fetchMeetings = async () => {
    try {
      const q = query(collection(db, "meetings"));
      const querySnapshot = await getDocs(q);
      let allMeetings = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      if (userRole === "professor") {
        // Only meetings created by this professor
        allMeetings = allMeetings.filter(
          (m) => m.createdByUid === auth.currentUser.uid
        );
      } else {
        // Student: filter by subjects and section
        // TODO: Fetch actual student subjects & section dynamically
        const userSubjects = userRole === "student" ? ["English", "Math"] : [];
        const userSection = userRole === "student" ? "4BSCS-1" : "";

        allMeetings = allMeetings.filter(
          (m) =>
            userSubjects.includes(m.subject) &&
            (m.section === userSection || m.section === "")
        );
      }

      setMeetings(allMeetings);
    } catch (err) {
      console.error("Error fetching meetings:", err);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  // Generate unique Jitsi room name
  const generateJitsiRoomName = (subject, section) =>
    `${subject}-${section}-${Math.random().toString(36).substring(2, 8)}`;

  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    if (!subject || !section || !schedule) return;

    const roomName = generateJitsiRoomName(subject, section);
    const meetingLink = `https://meet.jit.si/${roomName}`;

    try {
      await addDoc(collection(db, "meetings"), {
        subject,
        section,
        schedule,
        meetingLink,
        roomName,
        createdByUid: auth.currentUser.uid,
        createdByName: userName,
        createdAt: serverTimestamp(),
      });

      setSubject("");
      setSection("");
      setSchedule("");
      setShowForm(false);
      fetchMeetings();
    } catch (err) {
      console.error("Error creating meeting:", err);
    }
  };

  // On join, call parent's onSelectMeeting with roomName to embed meeting
  const handleJoin = (roomName) => {
    if (onSelectMeeting) {
      onSelectMeeting(roomName);
    } else {
      // fallback: open in new tab
      window.open(`https://meet.jit.si/${roomName}`, "_blank");
    }
  };

  return (
    <div
      className={`min-h-screen p-6 transition-colors duration-300 ${
        darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-black"
      }`}
    >
      <h1 className="text-3xl font-bold mb-6 text-center text-blue-700 dark:text-blue-400">
        Meetings
      </h1>

      {/* Meeting Table */}
      <div className="overflow-x-auto">
        <table
          className={`min-w-full rounded shadow ${
            darkMode ? "bg-gray-800" : "bg-white"
          }`}
        >
          <thead>
            <tr
              className={`text-left border-b ${
                darkMode ? "border-gray-700" : "border-gray-300"
              }`}
            >
              <th className="p-3">Subject</th>
              {userRole === "professor" ? (
                <th className="p-3">Section</th>
              ) : (
                <th className="p-3">Professor</th>
              )}
              <th className="p-3">Schedule</th>
              <th className="p-3 text-center"></th>
            </tr>
          </thead>
          <tbody>
            {meetings.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="text-center p-4 text-gray-600 dark:text-gray-400"
                >
                  No meetings to show.
                </td>
              </tr>
            ) : (
              meetings.map((m) => (
                <tr
                  key={m.id}
                  className={`border-b ${
                    darkMode ? "border-gray-700" : "border-gray-300"
                  } hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer`}
                >
                  <td className="p-3">{m.subject}</td>
                  <td className="p-3">
                    {userRole === "professor" ? m.section : m.createdByName}
                  </td>
                  <td className="p-3">{m.schedule}</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleJoin(m.roomName)}
                      className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700"
                    >
                      Join
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Meeting button and form for Professors */}
      {userRole === "professor" && (
        <div className="fixed bottom-8 right-8">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-full shadow hover:bg-blue-700 transition"
            >
              + Create Meeting
            </button>
          ) : (
            <form
              onSubmit={handleCreateMeeting}
              className="bg-white dark:bg-gray-800 p-6 rounded shadow-lg max-w-sm space-y-4"
            >
              <h2 className="text-xl font-semibold text-blue-700 dark:text-blue-400">
                Create New Meeting
              </h2>

              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className="w-full p-3 border rounded"
              >
                <option value="">Select Subject</option>
                {subjectOptions.map((subj) => (
                  <option key={subj} value={subj}>
                    {subj}
                  </option>
                ))}
              </select>

              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                required
                className="w-full p-3 border rounded"
              >
                <option value="">Select Section</option>
                {sectionOptions.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Schedule (e.g. Mon 2-4PM)"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                required
                className="w-full p-3 border rounded"
              />

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded border border-gray-400 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
