import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(helmet());
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "2mb" }));

const {
  OPENROUTER_API_KEY,
  OPENROUTER_MODEL = "openai/gpt-4o-mini",
  APP_URL = "http://localhost:5500",
  APP_TITLE = "Meeting Summarizer",
  PORT = 8080
} = process.env;

if (!OPENROUTER_API_KEY) {
  console.error("Missing OPENROUTER_API_KEY in .env");
  process.exit(1);
}

app.get("/health", (_, res) => res.json({ ok: true }));

app.post("/api/summarize", async (req, res) => {
  try {
    const { transcript } = req.body;

    if (!transcript || typeof transcript !== "string" || transcript.trim().length < 20) {
      return res.status(400).json({ error: "Transcript is required (min ~20 chars)." });
    }

    const prompt = `
You are an expert meeting assistant.
Summarize the following meeting transcript into concise bullet points.

Rules:
- Each bullet should be a single actionable point, decision, or key insight.
- Group bullets under short headers if there are multiple topics.
- If action items exist, end with a section "Action Items" listing owner + task.
- Do not invent facts.

Transcript:
"""${transcript}"""
    `.trim();

    const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": APP_URL,
        "X-Title": APP_TITLE
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: "system", content: "You summarize meeting transcripts." },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 2000,
      })
    });

    if (!orRes.ok) {
      const text = await orRes.text();
      return res.status(orRes.status).json({ error: text });
    }

    const data = await orRes.json();
    const summary = data?.choices?.[0]?.message?.content?.trim();

    if (!summary) {
      return res.status(500).json({ error: "No summary returned from model." });
    }

    res.json({ summary, model: data.model, usage: data.usage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
