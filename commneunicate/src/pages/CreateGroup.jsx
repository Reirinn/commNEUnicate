import React, { useEffect, useState } from "react";
import { collection, getDocs, addDoc, serverTimestamp, query, where } from "firebase/firestore";
import { db, auth } from "../firebase";

const CreateGroup = ({ userRole, userName, userSubjects = [], userSection = "", onGroupCreated }) => {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [showCreateGroup, setShowCreateGroup] = useState(true);  // Use state to control modal visibility
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) return;

    const fetchUsers = async () => {
      try {
        let usersList = [];

        if (userRole === "professor") {
          const usersRef = collection(db, "users");
          const q = query(usersRef, where("role", "==", "student"));
          const querySnapshot = await getDocs(q);

          usersList = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(u =>
              u.id !== currentUser.uid &&
              u.section === userSection &&
              u.subjects?.some(s => userSubjects.includes(s))
            );
        } else {
          const usersRef = collection(db, "users");
          const querySnapshot = await getDocs(usersRef);
          usersList = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(u => u.id !== currentUser.uid);
        }

        setUsers(usersList);
      } catch (err) {
        console.error("Error fetching users for group:", err);
      }
    };

    fetchUsers();
  }, [currentUser, userRole, userSubjects, userSection]);

  const toggleUser = (uid) => {
    setSelected((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selected.length === 0) {
      alert("Group name and at least one member are required.");
      return;
    }

    try {
      const newGroup = {
        name: groupName,
        members: [...selected, currentUser.uid],
        isGroup: true,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        lastMessage: {
          sender: "",
          text: "Group created.",
          timestamp: serverTimestamp(),
        },
      };

      const docRef = await addDoc(collection(db, "chats"), newGroup);

      alert("Group chat created!");
      setGroupName("");
      setSelected([]);
      if (onGroupCreated) onGroupCreated(docRef.id);
      setShowCreateGroup(false);  // Close the modal after group creation
    } catch (err) {
      console.error("Error creating group:", err);
      alert("Failed to create group.");
    }
  };

  const handleCancel = () => {
    setShowCreateGroup(false);  // Close the modal when Cancel is clicked
  };

  if (!showCreateGroup) return null; // Return null to hide the modal when it's canceled

  return (
    <div className="min-h-full flex flex-col justify-center items-center p-6 bg-white dark:bg-gray-900">
      <div className="w-full max-w-md">
        <h2 className="text-2xl font-bold text-blue-700 dark:text-blue-400 mb-6 text-center">
          Create Group Chat
        </h2>

        <input
          type="text"
          placeholder="Group Name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          className="w-full mb-6 p-3 border rounded dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <h3 className="text-lg font-semibold mb-4 dark:text-gray-200">Select Members:</h3>

        <ul className="overflow-y-auto max-h-64 space-y-2 border rounded border-gray-300 dark:border-gray-700 p-2 bg-white dark:bg-gray-800">
          {users.length === 0 && (
            <li className="text-gray-500 dark:text-gray-400 text-center p-4">
              No users found for your subject and section.
            </li>
          )}

          {users.map((user) => (
            <li
              key={user.id}
              onClick={() => toggleUser(user.id)}
              className={`cursor-pointer p-3 rounded flex justify-between items-center transition ${
                selected.includes(user.id)
                  ? "bg-blue-100 dark:bg-blue-600 text-blue-800 dark:text-blue-200"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
              }`}
            >
              <span>
                {user.firstName} {user.lastName}
              </span>
              <span className="text-sm font-semibold">
                {selected.includes(user.id) ? "✓ Selected" : ""}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex justify-between mt-6">
          <button
            onClick={handleCancel}  // Attach the cancel button to close modal
            className="bg-gray-400 text-white px-6 py-3 rounded hover:bg-gray-500 w-full"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateGroup}
            className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 w-full ml-4"
            disabled={!groupName.trim() || selected.length === 0}
          >
            Create Group
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateGroup;
