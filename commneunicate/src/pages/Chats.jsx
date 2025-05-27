import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  addDoc,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import CreateGroup from "./CreateGroup";

export default function Chats({ userRole }) {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "chats"),
      where("members", "array-contains", currentUser.uid),
      orderBy("lastMessage.timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setChats(chatList);
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!selectedChat) return;

    const q = query(
      collection(db, "chats", selectedChat.id, "messages"),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messageList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(messageList);
    });

    return () => unsubscribe();
  }, [selectedChat]);

  const goToChat = (chat) => {
    setSelectedChat(chat);
    setShowCreateGroup(false);
  };

  const openCreateGroupPane = () => {
    setShowCreateGroup(true);
    setSelectedChat(null);
  };

  const closeCreateGroupPane = () => {
    setShowCreateGroup(false);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (newMessage.trim() === "" || !selectedChat) return;

    try {
      await addDoc(collection(db, "chats", selectedChat.id, "messages"), {
        text: newMessage,
        senderId: currentUser.uid,
        timestamp: new Date(),
      });
      setNewMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex">
      {/* Left Pane: Chat List + Search + Create Group */}
      <div className="w-1/3 bg-white p-4 rounded-lg shadow-lg border border-gray-300 dark:bg-gray-800 dark:border-gray-700 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-400">
            Your Chats
          </h2>
          {userRole === "professor" && (
            <button
              onClick={openCreateGroupPane}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              + Create Group
            </button>
          )}
        </div>

        <button
          onClick={() => setShowSearchModal(true)}
          className="mb-4 w-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded px-3 py-2 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
        >
          🔍 Search
        </button>

        {showSearchModal && (
          <div className="fixed inset-0 bg-gray-700 bg-opacity-50 flex justify-center items-center z-50">
            <div className="p-6 rounded-lg shadow-lg max-w-lg w-full border border-gray-300 bg-white dark:bg-gray-800">
              <h3 className="text-xl font-semibold mb-4 text-blue-700 dark:text-blue-400">
                Search Chats
              </h3>
              <input
                type="text"
                placeholder="Search by name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-3 border rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-300"
              />
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowSearchModal(false)}
                  className="px-4 py-2 rounded border border-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Close
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    // Implement search filtering here if desired
                    setShowSearchModal(false);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Search
                </button>
              </div>
            </div>
          </div>
        )}

        <ul className="space-y-4 overflow-y-auto flex-grow max-h-[calc(100vh-150px)]">
          {chats.length === 0 && <p className="text-gray-600">No chats found.</p>}
          {chats.map((chat) => (
            <li
              key={chat.id}
              onClick={() => goToChat(chat)}
              className="bg-white p-4 rounded shadow cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-700"
            >
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-800 dark:text-gray-300">
                  {chat.isGroup ? chat.name : "Private Chat"}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {chat.lastMessage?.timestamp?.toDate().toLocaleString() ||
                    "No messages"}
                </span>
              </div>
              <p className="text-gray-600 mt-1 dark:text-gray-400">
                {chat.lastMessage?.text || "No messages yet"}
              </p>
            </li>
          ))}
        </ul>
      </div>

      {/* Right Pane: Either Chat Messages or Create Group */}
      <div className="flex-1 bg-white p-6 rounded-lg shadow-lg border border-gray-300 dark:bg-gray-800 dark:border-gray-700 flex flex-col">
        {showCreateGroup ? (
          <CreateGroup
            userRole={userRole}
            userName={auth.currentUser?.displayName || ""}
            onGroupCreated={() => {
              setShowCreateGroup(false);
              // Optional: refresh chats list here
            }}
          />
        ) : selectedChat ? (
          <>
            <h2 className="text-xl font-semibold text-blue-700 dark:text-blue-400">
              {selectedChat.name || "Private Chat"}
            </h2>

            <div className="space-y-4 mt-6 overflow-y-auto flex-grow max-h-[calc(100vh-250px)]">
              {messages.map((message) => (
                <div key={message.id} className="flex items-center space-x-2">
                  <span className="font-medium text-gray-800 dark:text-gray-300">
                    {message.senderId === currentUser.uid ? "You" : "Other"}
                  </span>
                  <p className="text-gray-700 dark:text-gray-300">{message.text}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="mt-6 flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-grow p-3 border rounded"
                placeholder="Type a message..."
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700"
              >
                Send
              </button>
            </form>
          </>
        ) : (
          <p className="text-gray-600 dark:text-gray-400">
            Select a chat to view messages or create a group.
          </p>
        )}
      </div>
    </div>
  );
}
