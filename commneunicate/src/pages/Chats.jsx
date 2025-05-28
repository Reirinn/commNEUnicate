import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  serverTimestamp,
  limit,
  startAfter
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
  const [searchResults, setSearchResults] = useState([]);
  const [userProfiles, setUserProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastVisible, setLastVisible] = useState(null);

  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) return;

    setLoading(true); // Show loading indicator

    const q = query(
      collection(db, "chats"),
      where("members", "array-contains", currentUser.uid),
      orderBy("lastMessage.timestamp", "desc"),
      limit(10) // Load 10 chats initially
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const userIds = new Set();
      chatList.forEach((chat) => {
        chat.members.forEach((uid) => {
          if (uid !== currentUser.uid) userIds.add(uid);
        });
      });

      const userMap = {};
      for (let uid of userIds) {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) userMap[uid] = userDoc.data();
      }

      setUserProfiles(userMap);
      setChats(chatList);  // Set chats after loading
      setLastVisible(snapshot.docs[snapshot.docs.length - 1]);  // Get last document for pagination
      setLoading(false);   // Hide loading indicator
    });

    return () => unsubscribe();
  }, [currentUser]);

  const loadMoreChats = async () => {
    if (!lastVisible) return;

    const q = query(
      collection(db, "chats"),
      where("members", "array-contains", currentUser.uid),
      orderBy("lastMessage.timestamp", "desc"),
      startAfter(lastVisible),
      limit(10)
    );

    const snapshot = await getDocs(q);
    const chatList = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    setChats((prevChats) => [...prevChats, ...chatList]);  // Append new chats
    setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
  };

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

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (newMessage.trim() === "" || !selectedChat) return;

    try {
      await addDoc(collection(db, "chats", selectedChat.id, "messages"), {
        text: newMessage,
        senderId: currentUser.uid,
        timestamp: serverTimestamp(),
      });

      const chatDocRef = doc(db, "chats", selectedChat.id);
      await updateDoc(chatDocRef, {
        lastMessage: {
          text: newMessage,
          timestamp: serverTimestamp(),
        },
      });

      setNewMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);

    const matches = snapshot.docs
      .filter((doc) => {
        const data = doc.data();
        const fullName = `${data.firstName} ${data.lastName}`.toLowerCase();
        return (
          fullName.includes(searchTerm.toLowerCase()) ||
          data.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
      })
      .filter((doc) => doc.id !== currentUser.uid);

    setSearchResults(matches);
  };

  const startPrivateChat = async (targetUid, user) => {
    const q = query(
      collection(db, "chats"),
      where("members", "array-contains", currentUser.uid)
    );
    const snapshot = await getDocs(q);
    const existing = snapshot.docs.find(
      (doc) => doc.data().members.includes(targetUid) && !doc.data().isGroup
    );

    if (existing) {
      setSelectedChat({ id: existing.id, ...existing.data() });
      setShowSearchModal(false);
      return;
    }

    const newChatRef = await addDoc(collection(db, "chats"), {
      members: [currentUser.uid, targetUid],
      isGroup: false,
      lastMessage: { text: "", timestamp: serverTimestamp() },
    });

    setSelectedChat({
      id: newChatRef.id,
      members: [currentUser.uid, targetUid],
      isGroup: false,
    });
    setShowSearchModal(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Pane: Chat List */}
      <div className="w-1/3 p-4 bg-white border-r border-gray-300 dark:bg-gray-900 dark:border-gray-700">
        <div className="flex justify-between mb-4">
          <h2 className="text-xl font-bold text-blue-800 dark:text-blue-400">Your Chats</h2>
          {userRole === "professor" && (
            <button
              className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
              onClick={openCreateGroupPane}
            >
              + Create Group
            </button>
          )}
        </div>

        <button
          onClick={() => setShowSearchModal(true)}
          className="w-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 px-3 py-2 rounded mb-4 hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          🔍 Search
        </button>

        {showSearchModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-lg w-full max-w-md">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300">
                  Search Users
                </h3>
                <button onClick={() => setShowSearchModal(false)}>✖</button>
              </div>
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Name or email"
                  className="flex-1 px-3 py-2 rounded border bg-white dark:bg-gray-900 dark:text-white"
                />
                <button type="submit" className="bg-blue-600 text-white px-3 py-2 rounded">
                  Search
                </button>
              </form>
              <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                {searchResults.map((userDoc) => {
                  const user = userDoc.data();
                  return (
                    <div
                      key={userDoc.id}
                      className="flex justify-between items-center p-2 rounded hover:bg-blue-50 dark:hover:bg-gray-700"
                    >
                      <div>
                        <p>{user.firstName} {user.lastName}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                      <button
                        className="text-sm bg-blue-600 text-white px-3 py-1 rounded"
                        onClick={() => startPrivateChat(userDoc.id, user)}
                      >
                        Chat
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <ul className="space-y-2 overflow-y-auto max-h-[calc(100vh-200px)]">
          {loading && <p>Loading chats...</p>}
          {chats.length === 0 && !loading && <p>No chats found.</p>}
          {chats.map((chat) => {
            const partnerUid = chat.members.find((uid) => uid !== currentUser.uid);
            const partner = userProfiles[partnerUid] || {};
            return (
              <li
                key={chat.id}
                onClick={() => goToChat(chat)}
                className="p-3 bg-gray-100 dark:bg-gray-800 rounded hover:bg-blue-100 dark:hover:bg-gray-700 cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <img
                    src={partner.photoURL || "/default-avatar.png"}
                    alt="avatar"
                    className="w-8 h-8 rounded-full"
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-300">
                      {partner.firstName} {partner.lastName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{chat.lastMessage?.text}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Chat Box */}
      <div className="w-2/3 p-6 bg-gray-50 dark:bg-gray-950 flex flex-col">
        {showCreateGroup && <CreateGroup currentUser={currentUser} />}
        {selectedChat && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-blue-700 dark:text-blue-400">
                {userProfiles[selectedChat.members.find((uid) => uid !== currentUser.uid)]?.firstName}{" "}
                {userProfiles[selectedChat.members.find((uid) => uid !== currentUser.uid)]?.lastName}
              </h2>
            </div>

            <div className="flex-grow overflow-y-auto mb-4 p-3 bg-white dark:bg-gray-900 rounded shadow">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`mb-2 ${msg.senderId === currentUser.uid ? "text-right" : "text-left"}`}
                >
                  <div
                    className={`inline-block px-3 py-2 rounded text-sm ${
                      msg.senderId === currentUser.uid
                        ? "bg-blue-200 dark:bg-blue-700 text-black dark:text-white"
                        : "bg-gray-200 dark:bg-gray-600 text-black dark:text-white"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-grow p-2 rounded border bg-white dark:bg-gray-800 dark:text-white"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Send
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
