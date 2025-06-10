import React, { useEffect, useState, useRef } from "react";
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
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

const storage = getStorage();

export default function Chats({ userRole, darkMode }) {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [userProfiles, setUserProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState(null); 
  const [fileUrl, setFileUrl] = useState(""); 
  const [uploading, setUploading] = useState(false); 
  const [fileProgress, setFileProgress] = useState(0); 

  const fileInputRef = useRef(null); 

  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) return;

    setLoading(true);

    const privateChatsQuery = query(
      collection(db, "chats"),
      where("members", "array-contains", currentUser.uid),
      orderBy("lastMessage.timestamp", "desc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(privateChatsQuery, async (snapshot) => {
      const privateChats = snapshot.docs.map((doc) => ({
        id: doc.id,
        isGroup: false,
        ...doc.data(),
      }));

      const userIds = new Set();
      privateChats.forEach((chat) => {
        chat.members.forEach((uid) => {
          if (uid !== currentUser.uid) userIds.add(uid);
        });
      });

      const userMap = {};
      await Promise.all(
        Array.from(userIds).map(async (uid) => {
          const userDoc = await getDoc(doc(db, "users", uid));
          if (userDoc.exists()) userMap[uid] = userDoc.data();
        })
      );

      setUserProfiles(userMap);
      setChats(privateChats);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      return;
    }

    const messagesCollection = collection(db, "chats", selectedChat.id, "messages");
    const q = query(messagesCollection, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [selectedChat]);

  
  const resetFileState = () => {
    setFile(null);
    setFileUrl("");
    setUploading(false);
    setFileProgress(0);
  };

  const goToChat = (chat) => {
    setSelectedChat(chat);
    resetFileState(); 
  };

  
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    
    setFile(selectedFile);
    setFileUrl(URL.createObjectURL(selectedFile)); 

    
    const fileRef = ref(storage, `chats/${selectedChat.id}/${selectedFile.name}`);
    const uploadTask = uploadBytesResumable(fileRef, selectedFile);

    
    setUploading(true);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setFileProgress(progress);
      },
      (error) => {
        console.error("File upload failed", error);
        setUploading(false);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref());
        setFileUrl(downloadURL); 
        setUploading(false); 
      }
    );
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !file) return;

    try {
      const messageData = {
        text: newMessage,
        senderId: currentUser.uid,
        timestamp: serverTimestamp(),
      };

      
      if (fileUrl) {
        messageData.fileUrl = fileUrl;
        messageData.fileName = file.name;
        setFile(null); 
      }

      
      await addDoc(collection(db, "chats", selectedChat.id, "messages"), messageData);
      const chatDocRef = doc(db, "chats", selectedChat.id);
      await updateDoc(chatDocRef, {
        lastMessage: {
          text: newMessage || `Sent a file: ${file.name}`,
          timestamp: serverTimestamp(),
        },
      });

      setNewMessage("");
      resetFileState(); 
    } catch (error) {
      console.error("Error sending message:", error);
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
      (doc) => doc.data().members.includes(targetUid)
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

  const bgClass = darkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-black";
  const paneBgClass = darkMode ? "bg-gray-800" : "bg-white";
  const inputBgClass = darkMode ? "bg-gray-700 text-white border-gray-600" : "bg-white text-black border-gray-300";
  const buttonBgClass = darkMode ? "bg-blue-700 hover:bg-blue-800" : "bg-blue-600 hover:bg-blue-700";
  const textLightDarkClass = darkMode ? "text-gray-300" : "text-gray-700";

  return (
    <div className={`min-h-screen flex ${bgClass}`}>
      {/* Left Pane */}
      <div className={`w-1/3 p-4 border-r border-gray-600 ${paneBgClass}`}>
        <div className="flex justify-between mb-4">
          <h2 className={`text-xl font-bold ${darkMode ? "text-blue-400" : "text-blue-800"}`}>Your Chats</h2>
        </div>

        <button
          onClick={() => setShowSearchModal(true)}
          className={`w-full px-3 py-2 mb-4 rounded ${inputBgClass} hover:${buttonBgClass} cursor-pointer transition`}
        >
          🔍 Search
        </button>

        {/* Search Modal */}
        {showSearchModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
            <div className={`p-6 rounded shadow-lg w-full max-w-md ${paneBgClass}`}>
              <div className="flex justify-between items-center mb-3">
                <h3 className={`text-lg font-semibold ${darkMode ? "text-blue-300" : "text-blue-700"}`}>
                  Search Users
                </h3>
                <button
                  className={`${textLightDarkClass} hover:text-white`}
                  onClick={() => setShowSearchModal(false)}
                >
                  ✖
                </button>
              </div>
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Name or email"
                  className={`flex-1 px-3 py-2 rounded border ${inputBgClass}`}
                />
                <button
                  type="submit"
                  className={`px-3 py-2 rounded text-white ${buttonBgClass}`}
                >
                  Search
                </button>
              </form>
              <div className="mt-4 max-h-64 overflow-y-auto space-y-2">
                {searchResults.map((userDoc) => {
                  const user = userDoc.data();
                  return (
                    <div
                      key={userDoc.id}
                      className={`flex justify-between items-center p-2 rounded hover:${darkMode ? "bg-blue-700" : "bg-blue-100"} cursor-pointer`}
                    >
                      <div>
                        <p className={`${darkMode ? "text-white" : "text-black"}`}>
                          {user.firstName} {user.lastName}
                        </p>
                        <p className={`${darkMode ? "text-gray-300" : "text-gray-600"} text-xs`}>
                          {user.email}
                        </p>
                      </div>
                      <button
                        className={`text-sm px-3 py-1 rounded text-white ${buttonBgClass} hover:${buttonBgClass}`}
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

        {/* Chat List */}
        <ul className="overflow-y-auto max-h-[calc(100vh-180px)] space-y-2">
          {loading && (
            <p className={`${darkMode ? "text-gray-300" : "text-gray-700"}`}>Loading chats...</p>
          )}
          {!loading && chats.length === 0 && (
            <p className={`${darkMode ? "text-gray-300" : "text-gray-700"}`}>No chats found.</p>
          )}
          {chats.map((chat) => {
            const partnerUid = chat.members.find((uid) => uid !== currentUser.uid);
            const partner = userProfiles[partnerUid] || {};
            return (
              <li
                key={chat.id}
                onClick={() => goToChat(chat)}
                className={`p-3 rounded cursor-pointer hover:${darkMode ? "bg-blue-700" : "bg-blue-100"} ${
                  selectedChat?.id === chat.id
                    ? darkMode
                      ? "bg-blue-600"
                      : "bg-blue-200"
                    : paneBgClass
                }`}
              >
                <div className="flex items-center space-x-3">
                  <img
                    src={partner.photoURL || "/default-avatar.png"}
                    alt="avatar"
                    className="w-8 h-8 rounded-full"
                  />
                  <div>
                    <p className={`${darkMode ? "text-white" : "text-black"} font-semibold`}>
                      {partner.firstName} {partner.lastName}
                    </p>
                    <p className={`${darkMode ? "text-gray-300" : "text-gray-600"} text-xs`}>
                      {chat.lastMessage?.text || ""}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Chat Box */}
      <div className={`w-2/3 p-6 flex flex-col ${paneBgClass}`}>
        {selectedChat ? (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-xl font-semibold ${darkMode ? "text-blue-400" : "text-blue-800"}`}>
                {userProfiles[selectedChat.members.find((uid) => uid !== currentUser.uid)]?.firstName || ""}{" "}
                {userProfiles[selectedChat.members.find((uid) => uid !== currentUser.uid)]?.lastName || ""}
              </h2>
            </div>

            <div className={`flex-grow overflow-y-auto mb-4 p-3 rounded shadow-inner ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`mb-2 ${msg.senderId === currentUser.uid ? "text-right" : "text-left"}`}
                >
                  <div
                    className={`inline-block px-3 py-2 rounded text-sm ${
                      msg.senderId === currentUser.uid
                        ? darkMode
                          ? "bg-blue-600 text-white"
                          : "bg-blue-200 text-black"
                        : darkMode
                        ? "bg-gray-600 text-white"
                        : "bg-gray-200 text-black"
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* If there's a file URL, display it inside the bubble */}
                  {msg.fileUrl && (
                     <div className="mt-2">
                        {msg.fileUrl.includes("image") ? (
                          <img
                             src={msg.fileUrl}
                             alt={msg.fileName}
                             className="max-w-xs max-h-40 object-contain rounded-lg"
                          />
                        ) : (
                          <a
                            href={msg.fileUrl}
                            download={msg.fileName}  
                            className={`text-sm ${darkMode ? "text-blue-300" : "text-blue-600"}`}
                          >
                           📁 {msg.fileName}  
                          </a>
                        )}
                    </div>
                    )}
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className={`flex-grow p-2 rounded border ${inputBgClass}`}
              />
              {/* File input with a button to trigger the file picker */}
              <input
                type="file"
                accept="image/*, .pdf, .docx, .txt, .xlsx, .xls, .keras, .ipynb, .csv, .zip, .rar, .7z, .tar, .gz, .mp3, .wav, .mp4, .avi, .mov, .json, .xml, .py, .html, .js, .css, .md, .psd, .ai, .epub, .mobi, .db"
                onChange={handleFileChange}
                className="hidden"
                ref={fileInputRef}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current.click()}
                className={`px-4 py-2 rounded text-white ${buttonBgClass}`}
              >
                📎 Attach File
              </button>
              {/* Show file preview */}
              {file && (
                <div className="mt-2">
                  {file.type.includes("image") ? (
                    <img
                      src={fileUrl}
                      alt={file.name}
                      className="max-w-xs max-h-40 object-contain"
                    />
                  ) : (
                    <p>{file.name}</p>
                  )}
                </div>
              )}
              <button
                type="submit"
                className={`px-4 py-2 rounded text-white ${buttonBgClass}`}
              >
                Send
              </button>
            </form>

            {/* File upload progress */}
            {uploading && (
              <div className="mt-2">
                <progress value={fileProgress} max="100" className="w-full"></progress>
              </div>
            )}
          </>
        ) : (
          <p className={`${darkMode ? "text-gray-300" : "text-gray-700"} text-center mt-20`}>
            Select a chat to start messaging
          </p>
        )}
      </div>
    </div>
  );
}
