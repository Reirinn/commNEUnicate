import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { db, auth } from "../firebase";
import {
  collection,
  doc,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  updateDoc
} from "firebase/firestore";


export default function ChatRoom() {
  const { chatId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);


  const currentUser = auth.currentUser;


  useEffect(() => {
    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("timestamp"));


    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });


    return () => unsubscribe();
  }, [chatId]);


  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;


    const messageRef = collection(db, "chats", chatId, "messages");
    await addDoc(messageRef, {
      sender: currentUser.uid,
      text: newMessage,
      timestamp: serverTimestamp()
    });


    const chatDocRef = doc(db, "chats", chatId);
    await updateDoc(chatDocRef, {
      lastMessage: {
        sender: currentUser.uid,
        text: newMessage,
        timestamp: serverTimestamp()
      }
    });


    setNewMessage("");
  };


  return (
    <div className="min-h-screen bg-white p-4">
      <h2 className="text-2xl font-bold mb-4 text-blue-700">Chat Room</h2>
      <div className="h-[60vh] overflow-y-scroll border rounded p-4 bg-gray-50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`mb-3 p-2 rounded max-w-[75%] ${
              msg.sender === currentUser.uid ? "bg-blue-200 ml-auto" : "bg-gray-300"
            }`}
          >
            <p className="text-sm">{msg.text}</p>
            <p className="text-xs text-right text-gray-600">
              {msg.timestamp?.toDate().toLocaleTimeString() || "..."}
            </p>
          </div>
        ))}
        <div ref={messagesEndRef}></div>
      </div>


      <form onSubmit={handleSend} className="mt-4 flex">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-grow p-2 border rounded-l"
          placeholder="Type your message..."
        />
        <button type="submit" className="bg-blue-600 text-white px-4 rounded-r">
          Send
        </button>
      </form>
    </div>
  );
}