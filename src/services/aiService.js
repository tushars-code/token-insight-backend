import { pipeline } from "@huggingface/transformers";
import dotenv from "dotenv";
dotenv.config();

let generator;
async function initGenerator() {
  if (!generator) {
    console.log("⏳ Loading Hugging Face model...");
    generator = await pipeline(
      "text-generation",
      process.env.AI_MODEL || "HuggingFaceTB/SmolLM2-1.7B-Instruct",
      { use_auth_token: process.env.HF_ACCESS_TOKEN }
    );
    console.log("✅ Model loaded!");
  }
}

function extractJSON(text) {
  let stack = [];
  let startIndex = -1;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") {
      if (stack.length === 0) startIndex = i;
      stack.push("{");
    } else if (ch === "}") {
      stack.pop();
      if (stack.length === 0 && startIndex !== -1) {
        const candidate = text.slice(startIndex, i + 1);
        try {
          return JSON.parse(candidate);
        } catch {}
      }
    }
  }
  return null;
}

function firstNSentences(text, n = 2) {
  if (!text) return "";
  const re = /[^.!?]+[.!?]*/g;
  const matches = text.match(re) || [text];
  return matches.slice(0, n).map(s => s.trim()).join(" ").trim();
}

function normalizeSentiment(raw) {
  if (!raw || typeof raw !== "string") return "Neutral";
  const s = raw.toLowerCase();
  if (s.includes("bull")) return "Bullish";
  if (s.includes("bear")) return "Bearish";
  if (s.includes("positive")) return "Bullish";
  if (s.includes("negative")) return "Bearish";
  return "Neutral";
}

export async function getAIInsights(prompt) {
  await initGenerator();

  try {
    const output = await generator(prompt, {
      max_new_tokens: 300,
      temperature: Number(process.env.AI_TEMP ?? 0.2),
      top_p: Number(process.env.AI_TOP_P ?? 0.95),
      return_full_text: false, 
    });

    const rawText =
      Array.isArray(output) && output[0] && typeof output[0].generated_text === "string"
        ? output[0].generated_text
        : String(output);

    const json = extractJSON(rawText);
    if (json) {
      const reasoning = firstNSentences(json.reasoning, 2) || firstNSentences(rawText, 2);
      const sentiment = normalizeSentiment(json.sentiment);
      return { reasoning, sentiment };
    }

    const fallbackReasoning = firstNSentences(rawText, 2);
    const inferredSentiment = normalizeSentiment(rawText);
    return { reasoning: fallbackReasoning || "No usable insight produced by model.", sentiment: inferredSentiment };
  } catch (err) {
    console.error("getAIInsights error:", err?.message ?? err);
    return { reasoning: "Failed to generate insight", sentiment: "Neutral" };
  }
}
