import { useState } from "react";
import styles from "./MyAgent.module.css";

export default function MyAgent() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAsk = () => {
    if (!question.trim()) return;

    // Logic for calling Groq/Express will go here
    setIsLoading(true);
    console.log("Asking agent:", question);

    // Simulating a response for UI demonstration
    setTimeout(() => {
      setAnswer(
        "This is a preview of how your personal agent will respond using your specific context. Once we connect the backend, the LLM will analyze your PDFs and audio to provide transparent answers here.",
      );
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className={styles.container}>
      <h1 style={{ marginBottom: "2rem" }}>My Personal Agent</h1>

      <div className={styles.chatWrapper}>
        <div className={styles.inputSection}>
          <textarea
            className={styles.textArea}
            placeholder="Ask anything based on your uploaded context..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button
            className={styles.sendButton}
            onClick={handleAsk}
            disabled={isLoading || !question.trim()}
          >
            {isLoading ? "Thinking..." : "Ask Agent ➜"}
          </button>
        </div>

        <div className={styles.divider} />

        <div className={styles.responseSection}>
          <div className={styles.responseHeader}>
            <span>✦</span> Agent Response
          </div>

          {answer ? (
            <div className={styles.answerBox}>{answer}</div>
          ) : (
            <div className={styles.placeholderText}>
              Your agent is waiting for a question. It will only use the context
              you've provided.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
