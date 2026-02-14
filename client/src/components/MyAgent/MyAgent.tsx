import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import styles from "./MyAgent.module.css";
import ReactMarkdown from "react-markdown";

interface ContextItem {
  id: string;
  file_name: string;
  source_type: "audio" | "pdf";
  public_url: string;
}

export default function MyAgent() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<
    { role: "user" | "ai"; text: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [availableContext, setAvailableContext] = useState<ContextItem[]>([]);

  // Responsive State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Auto-scroll reference
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Fetch context items
  useEffect(() => {
    const fetchContext = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const response = await fetch("http://localhost:3000/context", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAvailableContext(data);
      }
    };
    fetchContext();
  }, []);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setInput("");
    setIsLoading(true);

    // Close sidebar on mobile when sending a message to focus on chat
    setIsSidebarOpen(false);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const response = await fetch("http://localhost:3000/chat/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await response.json();
      setMessages((prev) => [...prev, { role: "ai", text: data.reply }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "Sorry, I ran into an error." },
      ]);
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    if (window.confirm("Clear conversation?")) setMessages([]);
  };

  return (
    <div className={styles.pageWrapper}>
      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div
          className={styles.overlay}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ""}`}
      >
        <div className={styles.sidebarHeader}>
          <h3>Agent Knowledge</h3>
          <button
            className={styles.mobileOnly}
            onClick={() => setIsSidebarOpen(false)}
          >
            ✕
          </button>
        </div>
        <button className={styles.clearBtn} onClick={clearChat}>
          Clear Chat
        </button>
        <p className={styles.sidebarSubtitle}>Files being used for context:</p>

        <div className={styles.sourceList}>
          {availableContext.map((item) => (
            <div key={item.id} className={styles.sourceItem}>
              <span>{item.source_type === "audio" ? "🎤" : "📄"}</span>
              <span className={styles.sourceName}>{item.file_name}</span>
            </div>
          ))}
          {availableContext.length === 0 && (
            <p className={styles.empty}>No files yet.</p>
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className={styles.chatContainer}>
        {/* Mobile Header Toggle */}
        <div className={styles.mobileHeader}>
          <button
            onClick={() => setIsSidebarOpen(true)}
            className={styles.menuBtn}
          >
            ☰ View Sources
          </button>
          <span className={styles.mobileTitle}>AI Agent</span>
        </div>

        <div className={styles.messagesList}>
          {messages.length === 0 && (
            <div className={styles.welcome}>
              <h2>Knowledge Assistant</h2>
              <p>Ask me anything about your uploaded files.</p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={msg.role === "user" ? styles.userRow : styles.aiRow}
            >
              <div
                className={
                  msg.role === "user" ? styles.userBubble : styles.aiBubble
                }
              >
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className={styles.aiRow}>
              <div className={styles.aiBubble}>
                <span className={styles.typing}>Thinking...</span>
              </div>
            </div>
          )}
          {/* Scroll Target */}
          <div ref={messagesEndRef} />
        </div>

        <div className={styles.inputArea}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading}
            className={styles.sendBtn}
          >
            {isLoading ? "..." : "Send"}
          </button>
        </div>
      </main>
    </div>
  );
}
