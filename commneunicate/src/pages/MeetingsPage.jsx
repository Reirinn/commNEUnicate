import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {
  collection,
  addDoc,
  query,
  serverTimestamp,
  doc,
  deleteDoc,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { FaTrash } from "react-icons/fa";

const sectionOptions = ["4BSCS-1", "4BSCS-2"];

export default function MeetingsPage({
  userRole,
  userName,
  darkMode,
  onSelectMeeting,
  userSubjects = [],
  userSection = "",
}) {
  const [meetings, setMeetings] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [section, setSection] = useState("");
  const [schedule, setSchedule] = useState("");
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) return;

    const q = query(collection(db, "meetings"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        let allMeetings = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        if (userRole === "professor") {
          allMeetings = allMeetings.filter(
            (m) => m.createdByUid === currentUser.uid
          );
        } else if (userRole === "student") {
          allMeetings = allMeetings.filter(
            (m) => userSubjects.includes(m.subject) && m.section === userSection
          );
        }

        setMeetings(allMeetings);
      },
      (error) => {
        console.error("Error listening to meetings:", error);
      }
    );

    return () => unsubscribe();
  }, [currentUser, userRole, userSubjects, userSection]);

  const generateJitsiRoomName = (subject, section) => {
    const cleanSubject = subject.replace(/\s+/g, "").toLowerCase();
    const cleanSection = section.replace(/\s+/g, "").toLowerCase();
    return `${cleanSubject}-${cleanSection}-${Math.random()
      .toString(36)
      .substring(2, 8)}`;
  };

  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    if (!subject || !section || !schedule) return;

    const roomName = generateJitsiRoomName(subject, section);

    try {
      await addDoc(collection(db, "meetings"), {
        subject,
        section,
        schedule,
        meetingLink: `https://meet.jit.si/${roomName}`,
        roomName,
        createdByUid: currentUser.uid,
        createdByName: userName,
        createdAt: serverTimestamp(),
      });

      setSubject("");
      setSection("");
      setSchedule("");
      setShowForm(false);
    } catch (err) {
      console.error("Error creating meeting:", err);
    }
  };

  const handleJoin = (roomName) => {
    if (onSelectMeeting) {
      onSelectMeeting(roomName);
    } else {
      window.open(`https://meet.jit.si/${roomName}`, "_blank");
    }
  };

  const handleDeleteMeeting = async (meetingId) => {
    try {
      await deleteDoc(doc(db, "meetings", meetingId));
    } catch (error) {
      console.error("Error deleting meeting:", error);
    }
  };

  
  const bgClass = darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-black";
  const tableBgClass = darkMode ? "bg-gray-800" : "bg-white";
  const borderColor = darkMode ? "border-gray-700" : "border-gray-300";
  const hoverBgClass = darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100";
  const buttonJoinClass =
    "bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700";
  const buttonDeleteClass =
    "bg-red-600 text-white px-4 py-1 rounded hover:bg-red-700 ml-6";
  const createBtnClass = darkMode
    ? "bg-blue-700 text-white hover:bg-blue-800"
    : "bg-blue-600 text-white hover:bg-blue-700";

 
  const modalBgClass = darkMode ? "bg-gray-800 text-white" : "bg-white text-black";
  const modalInputClass = darkMode
    ? "bg-gray-700 text-white border border-gray-600 placeholder-gray-400 p-3 rounded w-full mb-4"
    : "bg-white text-black border border-gray-300 placeholder-gray-600 p-3 rounded w-full mb-4";

  const modalButtonCancelClass = darkMode
    ? "px-4 py-2 rounded border border-gray-600 hover:bg-gray-700"
    : "px-4 py-2 rounded border border-gray-300 hover:bg-gray-100";

  const modalButtonSubmitClass = darkMode
    ? "bg-blue-700 hover:bg-blue-800 text-white px-6 py-3 rounded"
    : "bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded";

  return (
    <div className={`min-h-screen p-6 transition-colors duration-300 ${bgClass}`}>
      <h1 className="text-3xl font-bold mb-6 text-center text-blue-700 dark:text-blue-400">
        Meetings
      </h1>

      <div className="overflow-x-auto">
        <table className={`min-w-full rounded shadow ${tableBgClass}`}>
          <thead>
            <tr className={`text-left border-b ${borderColor}`}>
              <th className="p-3">Subject</th>
              <th className="p-3">{userRole === "professor" ? "Section" : "Professor"}</th>
              <th className="p-3">Schedule</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {meetings.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center p-4 text-gray-600 dark:text-gray-400">
                  No meetings to show.
                </td>
              </tr>
            ) : (
              meetings.map((m) => (
                <tr
                  key={m.id}
                  className={`border-b ${borderColor} ${hoverBgClass} cursor-pointer`}
                >
                  <td className="p-3">{m.subject}</td>
                  <td className="p-3">{userRole === "professor" ? m.section : m.createdByName}</td>
                  <td className="p-3">{m.schedule}</td>
                  <td className="p-3 text-center space-x-2">
                    <button onClick={() => handleJoin(m.roomName)} className={buttonJoinClass}>
                      Join
                    </button>
                    {userRole === "professor" && (
                      <button
                        onClick={() => handleDeleteMeeting(m.id)}
                        className={buttonDeleteClass}
                        title="Delete Meeting"
                      >
                        <FaTrash />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {userRole === "professor" && (
        <div className="fixed bottom-8 right-8">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className={`px-6 py-3 rounded-full shadow hover:shadow-lg transition ${createBtnClass}`}
            >
              + Create Meeting
            </button>
          ) : (
            <form onSubmit={handleCreateMeeting} className={`p-6 rounded shadow-lg max-w-sm space-y-4 ${modalBgClass}`}>
              <h2 className="text-xl font-semibold text-blue-700 dark:text-blue-400">
                Create New Meeting
              </h2>

              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className={modalInputClass}
              >
                <option value="">Select Subject</option>
                {userSubjects.map((subj) => (
                  <option key={subj} value={subj}>
                    {subj}
                  </option>
                ))}
              </select>

              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                required
                className={modalInputClass}
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
                className={modalInputClass}
              />

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className={modalButtonCancelClass}
                >
                  Cancel
                </button>
                <button type="submit" className={modalButtonSubmitClass}>
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