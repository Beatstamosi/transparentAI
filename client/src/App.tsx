import { useState } from "react";
import "./App.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

function App() {
  const [problem, setProblem] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const askAi = async () => {
    if (!problem.trim()) return;

    setIsLoading(true);
    setAnswer("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/chat?prompt=${encodeURIComponent(problem)}`,
      );

      if (!response.body) throw new Error("No Response Body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      // Read Stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);

        // parse SSE-Format
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              // Pretend typing
              setAnswer((prev) => prev + data.content);
            } catch (e) {
              console.error("Parsing Fehler", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Streaming Error:", error);
      setAnswer("Error connection to Server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>Teile das Problem, welches du mit deinem E-bike hast:</h1>

      <div className="input-area">
        <textarea
          name="problem"
          id="problem"
          placeholder="Beschreibe dein technisches Problem..."
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          disabled={isLoading}
        ></textarea>

        <button onClick={askAi} disabled={isLoading || !problem.trim()}>
          {isLoading ? "Denke nach..." : "Hilfe anfragen"}
        </button>
      </div>

      {answer && (
        <div className="answer-box">
          <h3>Empfehlung:</h3>
          <p>{answer}</p>
        </div>
      )}
    </div>
  );
}

export default App;
