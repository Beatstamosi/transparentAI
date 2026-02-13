import express from "express";
import cors from "cors";
import "dotenv/config";
import Groq from "groq-sdk";
import findContext from "./helper/findContext";

const app = express();
app.use(cors()); // Allow frontend access
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.get("/api/chat", async (req, res) => {
  const userPrompt = req.query.prompt as string;

  try {
    const context = findContext(userPrompt);

    const systemMessage = `
      Du bist ein technischer Support-Assistent für E-Bikes. 
      Nutze AUSSCHLIESSLICH den folgenden Kontext, um die Frage zu beantworten:
      ---
      ${context}
      ---
      Falls der Kontext die Frage nicht beantworten kann, sage höflich, dass du dazu keine Informationen hast und ein Techniker kontaktiert werden sollte.
    `;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userPrompt },
      ],
      model: "llama-3.1-8b-instant",
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.end();
  } catch (error) {
    console.error("Fehler im Chat-Stream:", error);
    res
      .status(500)
      .write(`data: ${JSON.stringify({ error: "Interner Serverfehler" })}\n\n`);
    res.end();
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
