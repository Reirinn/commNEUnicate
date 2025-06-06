import React, { useEffect, useState } from "react";
import { collection, getDocs, addDoc, serverTimestamp, query, where } from "firebase/firestore";
import { db, auth } from "../firebase"; 

export default function CreateGroup({ userRole, userName, userSubjects = [], userSection = "", onGroupCreated }) {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [groupPhotoURL, setGroupPhotoURL] = useState(null); 
  const [showCreateForm, setShowCreateForm] = useState(true);  
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
            .filter(u => u.id !== currentUser.uid && u.role === "student"); 
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

  const handleGroupPhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
     
      const reader = new FileReader();
      reader.onloadend = () => {
        setGroupPhotoURL(reader.result); 
      };
      reader.readAsDataURL(file);
    }
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
          timestamp: serverTimestamp()
        },
        photoURL: groupPhotoURL || ""  
      };

      
      const groupDocRef = await addDoc(collection(db, "groups"), {
        groupName: groupName,
        admin: currentUser.uid,
        members: [...selected, currentUser.uid],
        createdAt: serverTimestamp(),
        photoURL: groupPhotoURL || "" 
      });

      alert("Group chat created!");
      setGroupName("");
      setSelected([]);
      setGroupPhotoURL(null); 
      if (onGroupCreated) onGroupCreated(groupDocRef.id);

      
      setShowCreateForm(false);
    } catch (err) {
      console.error("Error creating group:", err);
      alert("Failed to create group.");
    }
  };

  const handleCancel = () => {
    
    setShowCreateForm(false); 
  };

  if (!showCreateForm) {
    return null; 
  }

  return (
    <div className="min-h-full flex flex-col justify-center items-center p-6 bg-white dark:bg-gray-900">
      <div className="w-full max-w-md">
        <h2 className="text-2xl font-bold text-black mb-6 text-center">
          Create Group Chat
        </h2>

        <input
          type="text"
          placeholder="Group Name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          className="w-full mb-6 p-3 border rounded text-black dark:bg-gray-700 dark:text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Group Photo Upload */}
        <div className="mb-6">
          <label htmlFor="groupPhoto" className="block mb-2 text-black dark:text-white">Choose Group Photo:</label>
          <input
            type="file"
            id="groupPhoto"
            accept="image/*"  
            onChange={handleGroupPhotoUpload}
            className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
          />
          {groupPhotoURL && (
            <div className="mt-4">
              <img src={groupPhotoURL} alt="Group Photo Preview" className="w-full h-auto rounded-lg" />
            </div>
          )}
        </div>

        <h3 className="text-lg font-semibold mb-4 text-black">Select Members:</h3>

        {/* User List */}
        <ul className="overflow-y-auto max-h-64 space-y-2 border rounded border-gray-300 p-2 bg-white">
          {users.length === 0 && (
            <li className="text-gray-500 text-center p-4">
              No users found for your subject and section.
            </li>
          )}

          {users.map((user) => (
            <li
              key={user.id}
              onClick={() => toggleUser(user.id)}
              className={`cursor-pointer p-3 rounded flex justify-between items-center transition ${
                selected.includes(user.id)
                  ? "bg-blue-100 text-blue-800"
                  : "hover:bg-gray-100 text-black"
              }`}
            >
              <span>
                {user.firstName} {user.lastName} ({user.role})
              </span>
            </li>
          ))}
        </ul>

        {/* Buttons */}
        <button
          onClick={handleCreateGroup}
          className="mt-6 bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 w-full"
          disabled={!groupName.trim() || selected.length === 0}
        >
          Create Group
        </button>

        <button
          onClick={handleCancel}
          className="mt-2 bg-gray-600 text-white px-6 py-3 rounded hover:bg-gray-700 w-full"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}