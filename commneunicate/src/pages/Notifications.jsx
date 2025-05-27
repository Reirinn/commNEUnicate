import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from "firebase/firestore";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [currentUserRole, setCurrentUserRole] = useState("");

  const currentUser = auth.currentUser;

  useEffect(() => {
    // Fetch the user role from Firestore
    const fetchUserRole = async () => {
      if (!currentUser) return;
      const userDocRef = doc(db, "users", currentUser.uid);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        setCurrentUserRole(userSnap.data().role);  // Set role (student/professor)
      }
    };
    fetchUserRole();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || !currentUserRole) return;

    // Notifications query based on role
    const q = query(
      collection(db, "notifications"),
      where("recipientId", "==", currentUser.uid),  // Filter notifications for this user
      where("role", "==", currentUserRole),  // Filter notifications based on user role
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotifications(notifs);
    });

    return () => unsubscribe();
  }, [currentUser, currentUserRole]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="max-w-4xl w-full bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4 text-center text-blue-800">Notifications</h2>
        {notifications.length === 0 ? (
          <p className="text-gray-600 text-center">You have no notifications.</p>
        ) : (
          <ul className="space-y-4">
            {notifications.map((notif) => (
              <li key={notif.id} className="bg-white p-4 rounded shadow">
                <p className="text-gray-800 font-medium">{notif.message}</p>
                <p className="text-sm text-gray-500">
                  {notif.timestamp?.toDate().toLocaleString() || "Unknown time"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
