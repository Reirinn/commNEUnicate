import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import * as XLSX from "xlsx";

export default function Attendance() {
  const [attendanceData, setAttendanceData] = useState([]); 
  const [loading, setLoading] = useState(true);

  
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState([]); 
  const [modalTitle, setModalTitle] = useState("");

  useEffect(() => {
    async function fetchAttendance() {
      setLoading(true);
      try {
        const roomsSnap = await getDocs(collection(db, "attendance"));
        const filteredRoomDocs = roomsSnap.docs.filter(doc => doc.id !== "attendaceId");

        const rooms = [];
        for (const roomDoc of filteredRoomDocs) {
          const roomName = roomDoc.id;
          const sessionsRef = collection(db, "attendance", roomName, "sessions");
          const sessionsSnap = await getDocs(query(sessionsRef, orderBy("createdAt", "desc")));

          const sessions = sessionsSnap.docs.map((sessionDoc) => ({
            id: sessionDoc.id,
            createdAt: sessionDoc.data().createdAt?.toDate() || null,
          }));

          rooms.push({ roomName, sessions });
        }

        setAttendanceData(rooms);
      } catch (error) {
        console.error("Error fetching attendance:", error);
      }
      setLoading(false);
    }

    fetchAttendance();
  }, []);

 
  async function fetchSessionUsers(roomName, sessionId) {
    const usersRef = collection(db, "attendance", roomName, "sessions", sessionId, "users");
    const usersSnap = await getDocs(usersRef);
    return usersSnap.docs.map((doc) => doc.data());
  }

  
  async function handleView(roomName, sessionId) {
    const users = await fetchSessionUsers(roomName, sessionId);
    if (users.length === 0) {
      alert("No attendance data found for this session.");
      return;
    }
    setModalTitle(`Attendance for ${roomName} - Session ${sessionId}`);
    setModalData(users);
    setModalOpen(true);
  }

  
  async function handleDownload(roomName, sessionId) {
    const users = await fetchSessionUsers(roomName, sessionId);
    if (users.length === 0) {
      alert("No attendance data found for this session.");
      return;
    }

    const worksheetData = users.map(({ name, email, attendanceStatus, timestamp }) => ({
      Name: name,
      Email: email,
      Status: attendanceStatus,
      Timestamp: timestamp?.toDate?.().toLocaleString() || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

    XLSX.writeFile(workbook, `Attendance_${roomName}_${sessionId}.xlsx`);
  }

  if (loading) return <p>Loading attendance data...</p>;

  if (attendanceData.length === 0) return <p>No attendance records found.</p>;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-center">Attendance Records</h1>
      {attendanceData.map(({ roomName, sessions }) => (
        <div key={roomName} className="mb-8 border p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-3">Meeting: {roomName}</h2>
          {sessions.length === 0 ? (
            <p className="italic text-gray-600">No sessions recorded yet.</p>
          ) : (
            <table className="w-full table-auto border-collapse border border-gray-300">
              <thead>
                <tr>
                  <th className="border border-gray-300 px-4 py-2 text-left">Session Date</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map(({ id, createdAt }) => (
                  <tr key={id} className="hover:bg-gray-100">
                    <td className="border border-gray-300 px-4 py-2">
                      {createdAt ? createdAt.toLocaleString() : "No date"}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 space-x-4">
                      <button
                        onClick={() => handleView(roomName, id)}
                        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDownload(roomName, id)}
                        className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-lg max-w-3xl w-full max-h-[80vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold mb-4">{modalTitle}</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr>
                    <th className="border border-gray-300 px-3 py-1 text-left">Name</th>
                    <th className="border border-gray-300 px-3 py-1 text-left">Email</th>
                    <th className="border border-gray-300 px-3 py-1 text-left">Status</th>
                    <th className="border border-gray-300 px-3 py-1 text-left">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {modalData.map((user, idx) => (
                    <tr key={idx} className="hover:bg-gray-100">
                      <td className="border border-gray-300 px-3 py-1">{user.name || "-"}</td>
                      <td className="border border-gray-300 px-3 py-1">{user.email || "-"}</td>
                      <td className="border border-gray-300 px-3 py-1">{user.attendanceStatus || "-"}</td>
                      <td className="border border-gray-300 px-3 py-1">
                        {user.timestamp?.toDate ? user.timestamp.toDate().toLocaleString() : "-"}
                      </td>
                    </tr>
                  ))}
                  {modalData.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center p-4">
                        No attendance data available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <button
              onClick={() => setModalOpen(false)}
              className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
