import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { FaDownload } from "react-icons/fa";

export default function Attendance() {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [userRole, setUserRole] = useState("");
  const [userName, setUserName] = useState("");
  const currentUser = auth.currentUser;

  useEffect(() => {
    const fetchUserData = async () => {
      if (!currentUser) return;
      const userDocRef = doc(db, "users", currentUser.uid);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        setUserRole(userData.role);
        setUserName(userData.firstName);
      }
    };

    fetchUserData();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || !userRole) return;

    const fetchAttendance = async () => {
      try {
        let q;
        if (userRole === "professor") {
          q = query(collection(db, "attendance"), where("professorId", "==", currentUser.uid));
        } else {
          q = query(
            collection(db, "attendance"),
            where("students", "array-contains", currentUser.uid)
          );
        }

        const querySnapshot = await getDocs(q);
        const records = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setAttendanceRecords(records);
      } catch (err) {
        console.error("Error fetching attendance:", err);
      }
    };

    fetchAttendance();
  }, [currentUser, userRole]);

  const groupBySession = () => {
    const groups = {};
    attendanceRecords.forEach((rec) => {
      const dateStr = rec.date ? new Date(rec.date.seconds * 1000).toLocaleDateString() : "Unknown Date";
      const key = `${rec.className} | ${dateStr}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(rec);
    });
    return groups;
  };

  const downloadCSV = (sessionRecords, sessionLabel) => {
    const headers = ["Student Name", "Status"];
    const rows = sessionRecords.map((rec) => {
      if (rec.students && rec.students.length > 0) {
        return rec.students.map((s) => [s.studentName, s.status]);
      }
      return [];
    }).flat();

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Attendance_${sessionLabel.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderStudentTable = () => (
    <table className="min-w-full bg-white dark:bg-gray-800 rounded shadow mx-auto">
      <thead>
        <tr className="text-left border-b border-gray-300 dark:border-gray-700">
          <th className="p-3 text-gray-700 dark:text-gray-300">Class</th>
          <th className="p-3 text-gray-700 dark:text-gray-300">Date</th>
          <th className="p-3 text-gray-700 dark:text-gray-300">Status</th>
        </tr>
      </thead>
      <tbody>
        {attendanceRecords.map((record) => {
          const studentAttendance = record.students.find(
            (student) => student.studentId === currentUser.uid
          );
          return (
            <tr
              key={record.id}
              className="border-b border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
            >
              <td className="p-3 text-gray-800 dark:text-gray-200">{record.className}</td>
              <td className="p-3 text-gray-800 dark:text-gray-200">
                {new Date(record.date.seconds * 1000).toLocaleString()}
              </td>
              <td className="p-3 text-gray-800 dark:text-gray-200">
                {studentAttendance ? studentAttendance.status : "Not Available"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  const renderProfessorTable = () => {
    const grouped = groupBySession();
    return (
      <>
        {Object.entries(grouped).map(([sessionLabel, records]) => (
          <div key={sessionLabel} className="mb-8 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-lg text-gray-700 dark:text-gray-300">{sessionLabel}</h3>
              <button
                onClick={() => downloadCSV(records, sessionLabel)}
                className="flex items-center bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
              >
                <FaDownload className="mr-2" /> Download
              </button>
            </div>
            <table className="min-w-full bg-white dark:bg-gray-800 rounded shadow">
              <thead>
                <tr className="text-left border-b border-gray-300 dark:border-gray-700">
                  <th className="p-3 text-gray-700 dark:text-gray-300">Class</th>
                  <th className="p-3 text-gray-700 dark:text-gray-300">Date</th>
                  <th className="p-3 text-gray-700 dark:text-gray-300">Student Name</th>
                  <th className="p-3 text-gray-700 dark:text-gray-300">Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) =>
                  record.students.map((student) => (
                    <tr
                      key={`${record.id}-${student.studentId}`}
                      className="border-b border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    >
                      <td className="p-3 text-gray-800 dark:text-gray-200">{record.className}</td>
                      <td className="p-3 text-gray-800 dark:text-gray-200">
                        {new Date(record.date.seconds * 1000).toLocaleString()}
                      </td>
                      <td className="p-3 text-gray-800 dark:text-gray-200">{student.studentName}</td>
                      <td className="p-3 text-gray-800 dark:text-gray-200">{student.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ))}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h2 className="text-2xl font-bold mb-6 text-blue-800 dark:text-blue-400 text-center">Attendance</h2>
      {userRole === "professor" && (
        <p className="mb-4 text-gray-600 dark:text-gray-300 max-w-4xl mx-auto text-center">
          Click the download button next to each session to export attendance as CSV.
        </p>
      )}
      {userRole === "student" ? renderStudentTable() : renderProfessorTable()}
    </div>
  );
}
