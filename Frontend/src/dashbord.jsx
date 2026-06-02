import { useEffect, useState } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:5000"); // Point to backend

export function YellowOwlChat({ activeFile, sectionId, userId }) {
  const [message, setMessage] = useState("");
  const [aiStatus, setAiStatus] = useState("idle");
  const [chatLog, setChatLog] = useState([]);

  useEffect(() => {
    // 1. Listen for system notifications
    socket.on("chat:status", (data) => {
      setAiStatus(data.message || data.status);
    });

    // 2. Listen for the processed multi-agent outcome
    socket.on("chat:receive-response", (response) => {
      if (response.success) {
        setChatLog((prev) => [...prev, {
          role: "assistant",
          text: response.message,
          code: response.codeBlock,
          language: response.language
        }]);
        setAiStatus("idle");
      }
    });

    return () => {
      socket.off("chat:status");
      socket.off("chat:receive-response");
    };
  }, []);

  // OPTIONAL: Automatically sync code structure as user edits code (Debounced)
  useEffect(() => {
    if (!activeFile) return;
    const timer = setTimeout(() => {
      socket.emit("editor:sync-code", { currentFile: activeFile });
    }, 1000); // 1-second typing debounce delay

    return () => clearTimeout(timer);
  }, [activeFile]);

  const handleSend = () => {
    if (!message.trim()) return;

    // Push local UI view instance immediately
    setChatLog((prev) => [...prev, { role: "user", text: message }]);

    // Submit live snapshot payload down the socket pipe
    socket.emit("chat:submit-message", {
      userId,
      sectionId,
      message,
      currentFile: activeFile // Snaps current code string directly from the state
    });

    setMessage("");
  };

  return (
    <div className="chat-container">
      <div className="status-indicator">Owl Status: {aiStatus}</div>
      {/* Map and render chatLog arrays here */}
      <input value={message} onChange={(e) => setMessage(e.target.value)} />
      <button onClick={handleSend}>Query Agents</button>
    </div>
  );
}