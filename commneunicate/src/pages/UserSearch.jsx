import React, { useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db, auth } from "../firebase";
import { useNavigate } from "react-router-dom";


export default function UserSearch() {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const navigate = useNavigate();


  const handleSearch = async (e) => {
    e.preventDefault();
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", ">=", searchTerm));
    const snapshot = await getDocs(q);
    const filtered = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((user) =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    setResults(filtered);
  };


  const handleStartChat = (otherUserId) => {
    // Navigate to a chat page or handle chat creation logic later
    navigate("/chats");
  };


  return (
    <div className="p-6 bg-white min-h-screen">
      <h2 className="text-2xl font-bold mb-4 text-blue-700">Search Users</h2>
      <form onSubmit={handleSearch} className="mb-4">
        <input
          type="text"
          placeholder="Search by name or email"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 border rounded mb-2"
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Search</button>
      </form>


      {results.length === 0 ? (
        <p className="text-gray-600">No results found.</p>
      ) : (
        <ul className="space-y-3">
          {results.map((user) => (
            <li key={user.id} className="border p-3 rounded shadow">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">{user.firstName} {user.lastName}</p>
                  <p className="text-sm text-gray-600">{user.email}</p>
                  <p className="text-sm text-gray-500 italic">Role: {user.role}</p>
                </div>
                {user.id !== auth.currentUser?.uid && (
                  <button
                    onClick={() => handleStartChat(user.id)}
                    className="bg-green-500 text-white px-3 py-1 rounded"
                  >
                    Start Chat
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}