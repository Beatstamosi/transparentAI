import { createClient } from "@supabase/supabase-js";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const chatWithContext = async (req: any, res: any) => {
  try {
    const { message } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader)
      return res.status(401).json({ error: "No authorization header" });

    // 1. Create the scoped User Client
    const userClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: authHeader } },
      },
    );

    // 2. Fetch context (RLS automatically filters by user_id now)
    const { data: contexts, error } = await userClient
      .from("user_contexts")
      .select("content, file_name, public_url");

    if (error) throw error;

    // 3. Format & Increase Context Limit
    // Llama 3.3 70B can handle ~100k+ tokens. 50k chars is safe and generous.
    const contextBody = contexts
      ?.map(
        (c) =>
          `SOURCE: ${c.file_name}\nURL: ${c.public_url}\nCONTENT: ${c.content}`,
      )
      .join("\n\n---\n\n");

    const safeContext =
      contextBody.length > 50000
        ? contextBody.substring(0, 50000) + "... [Truncated for Performance]"
        : contextBody;

    const systemPrompt = `
      You are a helpful AI assistant with access to the user's personal context.
      Use the provided context to answer questions. 
      
      RULES:
      1. Always cite sources as [Source Name](URL).
      2. If information is missing, say: "I don't have that information in my current records."
      3. Use markdown for clear formatting.

      CONTEXT:
      ${safeContext || "No context available."}
    `;

    // 4. Groq Completion with higher response tokens
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3, // Slightly lower for higher precision
      max_tokens: 2048, // Increased for longer explanations
    });

    res.json({ reply: chatCompletion.choices[0]?.message?.content || "" });
  } catch (err: any) {
    console.error("Chat Error:", err);
    res.status(500).json({ error: err.message || "AI Error" });
  }
};
