import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  writeBatch,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db, auth } from "../firebase";

const SECTIONS = ["4BSCS-1", "4BSCS-2"];

export default function Notifications({ darkMode }) {
  const [notifications, setNotifications] = useState([]);
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [professorSubjects, setProfessorSubjects] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    section: "",
    subject: "",
    announcement: "",
  });
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [senderNames, setSenderNames] = useState({});

  const currentUser = auth.currentUser;

  
  useEffect(() => {
    const fetchUserRoleAndSubjects = async () => {
      if (!currentUser) return;
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setCurrentUserRole(data.role);
        if (data.role === "professor" && Array.isArray(data.subjects)) {
          setProfessorSubjects(data.subjects);
        } else {
          setProfessorSubjects([]);
        }
      }
    };
    fetchUserRoleAndSubjects();
  }, [currentUser]);

  
  useEffect(() => {
    if (!currentUser || !currentUserRole) return;
    setLoading(true);

    const q = query(
      collection(db, "notifications"),
      where("recipientId", "==", currentUser.uid),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setNotifications(docs);
        setUnreadCount(docs.filter((n) => !n.read).length);

      
        const senderIds = [...new Set(docs.map((n) => n.senderId).filter((id) => id))];
        senderIds.forEach(async (uid) => {
          if (!senderNames[uid]) {
            const userDoc = await getDoc(doc(db, "users", uid));
            if (userDoc.exists()) {
              setSenderNames((prev) => ({
                ...prev,
                [uid]: `${userDoc.data().firstName} ${userDoc.data().lastName}`,
              }));
            }
          }
        });
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, currentUserRole, senderNames]);

  
  const markAsRead = async (notifId) => {
    const notifDoc = doc(db, "notifications", notifId);
    try {
      await updateDoc(notifDoc, { read: true });
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
  };

  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  
  const handleNotifyClick = async (e) => {
    e.preventDefault();

    if (!formData.section || !formData.subject || !formData.announcement.trim()) {
      alert("Please fill all fields.");
      return;
    }

    try {
      const usersRef = collection(db, "users");
      const q = query(
        usersRef,
        where("role", "==", "student"),
        where("yearAndSection", "==", formData.section),
        where("subjects", "array-contains", formData.subject)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        alert("No students found for the selected section and subject.");
        return;
      }

      const batch = writeBatch(db);
      const timestamp = serverTimestamp();

      snapshot.docs.forEach((studentDoc) => {
        const notifRef = doc(collection(db, "notifications"));
        batch.set(notifRef, {
          recipientId: studentDoc.id,
          role: "student",
          message: formData.announcement,
          section: formData.section,
          subject: formData.subject,
          read: false,
          timestamp,
          senderId: currentUser.uid,
        });
      });

      const professorNotifRef = doc(collection(db, "notifications"));
      batch.set(professorNotifRef, {
        recipientId: currentUser.uid,
        role: "professor",
        message: `[Announcement] ${formData.announcement}`,
        section: formData.section,
        subject: formData.subject,
        read: true,
        timestamp,
        senderId: currentUser.uid,
      });

      await batch.commit();
      alert("Announcement sent successfully!");
      setShowForm(false);
      setFormData({ section: "", subject: "", announcement: "" });
    } catch (error) {
      console.error("Error sending announcement:", error);
      alert("Failed to send announcement.");
    }
  };

  const bgClass = darkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-black";
  const paneBgClass = darkMode ? "bg-gray-800" : "bg-white";
  const inputClass = darkMode
    ? "bg-gray-700 text-white border border-gray-600 placeholder-gray-400"
    : "bg-white text-black border border-gray-300 placeholder-gray-600";
  const buttonClass = darkMode
    ? "bg-blue-700 hover:bg-blue-800 text-white"
    : "bg-blue-600 hover:bg-blue-700 text-white";
  const unreadHighlight = darkMode ? "bg-blue-700" : "bg-blue-200";

  return (
    <div className={`min-h-screen p-6 ${bgClass} flex flex-col items-center`}>
      <div className={`max-w-4xl w-full ${paneBgClass} rounded-lg shadow-lg p-6`}>
        <h2 className="text-2xl font-bold text-center text-blue-600 dark:text-blue-400 mb-6">
          Notifications{" "}
          {unreadCount > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-red-600 text-white text-sm">
              {unreadCount}
            </span>
          )}
        </h2>

        {/* Notifications List */}
        {loading ? (
          <p className="text-center text-gray-500">Loading notifications...</p>
        ) : notifications.length === 0 ? (
          <p className="text-center text-gray-500">You have no notifications.</p>
        ) : (
          <>
            <ul className="space-y-4 max-h-[60vh] overflow-y-auto">
              {notifications.map((notif) => (
                <li
                  key={notif.id}
                  className={`p-4 rounded cursor-pointer transition ${
                    notif.read ? paneBgClass : unreadHighlight
                  }`}
                  title={notif.read ? "Read" : "Unread"}
                  onClick={() => setSelectedNotification(notif)}
                >
                  <p className="font-semibold">
                    <span className="mr-2 text-indigo-500 font-bold">
                      [{notif.subject || "No Subject"}]
                    </span>
                    {notif.message}
                  </p>
                  <p className="text-sm text-gray-400">
                    {currentUserRole === "professor"
                      ? notif.section || "No Section"
                      : senderNames[notif.senderId] || "Loading sender..."}
                  </p>
                  <p className="text-sm text-gray-400">
                    {notif.timestamp?.toDate().toLocaleString() || "Unknown time"}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Fixed create announcement button on bottom right */}
      {currentUserRole === "professor" && !showForm && (
        <button
          onClick={() => setShowForm(true)}
          className={`fixed bottom-6 right-6 px-5 py-3 rounded-full shadow-lg text-lg font-semibold ${buttonClass} z-50`}
          aria-label="Create Announcement"
        >
          + Create Announcement
        </button>
      )}

      {/* Announcement Form Modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="announcement-form-title"
        >
          <form
            onSubmit={handleNotifyClick}
            className={`p-6 rounded-lg shadow-lg max-w-md w-full mx-4
              ${darkMode ? "bg-gray-800 text-white" : "bg-white text-black"}`}
          >
            <h3
              id="announcement-form-title"
              className={`text-lg font-semibold mb-4 ${
                darkMode ? "text-white" : "text-gray-900"
              }`}
            >
              Create Announcement
            </h3>

            <label className={`block mb-1 font-semibold ${darkMode ? "text-white" : "text-black"}`} htmlFor="section">
              Section
            </label>
            <select
              id="section"
              name="section"
              value={formData.section}
              onChange={handleChange}
              className={`w-full p-2 rounded mb-4
                ${darkMode ? "bg-gray-700 text-white border border-gray-600 placeholder-gray-400" : "bg-white text-black border border-gray-300 placeholder-gray-600"}`}
              required
            >
              <option value="" disabled>
                Select Section
              </option>
              {SECTIONS.map((section) => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))}
            </select>

            <label className={`block mb-1 font-semibold ${darkMode ? "text-white" : "text-black"}`} htmlFor="subject">
              Subject
            </label>
            <select
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              className={`w-full p-2 rounded mb-4
                ${darkMode ? "bg-gray-700 text-white border border-gray-600 placeholder-gray-400" : "bg-white text-black border border-gray-300 placeholder-gray-600"}`}
              required
            >
              <option value="" disabled>
                Select Subject
              </option>
              {professorSubjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>

            <label className={`block mb-1 font-semibold ${darkMode ? "text-white" : "text-black"}`} htmlFor="announcement">
              Announcement
            </label>
            <textarea
              id="announcement"
              name="announcement"
              value={formData.announcement}
              onChange={handleChange}
              rows={4}
              placeholder="Type your announcement here..."
              className={`w-full p-2 rounded resize-none mb-4
                ${darkMode ? "bg-gray-700 text-white border border-gray-600 placeholder-gray-400" : "bg-white text-black border border-gray-300 placeholder-gray-600"}`}
              required
            />

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className={`px-4 py-2 rounded border
                  ${darkMode ? "border-gray-600 hover:bg-gray-700 text-white" : "border-gray-400 hover:bg-gray-200 text-black"}`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`${darkMode ? "bg-blue-700 hover:bg-blue-800 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"} px-6 py-2 rounded`}
              >
                Notify
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Notification Detail Modal */}
      {selectedNotification && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="notification-detail-title"
        >
          <div
            className={`p-6 rounded-lg shadow-lg max-w-md w-full mx-4
              ${darkMode ? "bg-gray-800 text-white" : "bg-white text-black"}`}
          >
            <h3
              id="notification-detail-title"
              className={`text-lg font-semibold mb-2 ${
                darkMode ? "text-white" : "text-gray-900"
              }`}
            >
              Announcement Details
            </h3>
            <p className="mb-4">
              <span className="font-bold text-indigo-500 mr-2">
                [{selectedNotification.subject || "No Subject"}]
              </span>
              {selectedNotification.message}
            </p>
            <p className="text-sm text-gray-400 mb-4">
              {currentUserRole === "professor"
                ? `Section: ${selectedNotification.section || "No Section"}`
                : `Sent by: ${senderNames[selectedNotification.senderId] || "Loading sender..."}`}
            </p>
            <p className="text-sm text-gray-400 mb-6">
              {selectedNotification.timestamp?.toDate().toLocaleString() || "Unknown time"}
            </p>
            <button
              onClick={() => {
                markAsRead(selectedNotification.id);
                setSelectedNotification(null);
              }}
              className="px-6 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
