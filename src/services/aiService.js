import { pipeline } from "@huggingface/transformers";
import dotenv from "dotenv";
dotenv.config();

let generator;

/**
 * Initialize Hugging Face model only once.
 */
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

/**
 * Extract valid JSON block from text safely.
 */
function extractJSON(text) {
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) return null;
  try {
    const jsonString = text.slice(jsonStart, jsonEnd + 1);
    return JSON.parse(jsonString);
  } catch {
    return null;
  }
}

/**
 * Get first N sentences from text.
 */
function firstNSentences(text, n = 2) {
  if (!text) return "";
  const matches = text.match(/[^.!?]+[.!?]*/g) || [text];
  return matches.slice(0, n).map(s => s.trim()).join(" ").trim();
}

/**
 * Normalize sentiment keywords.
 */
function normalizeSentiment(raw) {
  if (!raw || typeof raw !== "string") return "Neutral";
  const s = raw.toLowerCase();
  if (s.includes("bull")) return "Bullish";
  if (s.includes("bear")) return "Bearish";
  if (s.includes("positive")) return "Bullish";
  if (s.includes("negative")) return "Bearish";
  if (s.includes("neutral")) return "Neutral";
  return "Neutral";
}

/**
 * Generate AI insights for given market data prompt.
 */
export async function getAIInsights(prompt) {
  await initGenerator();

  const formattedPrompt = `
You are a financial market analysis AI. Analyze the following token's market data and produce structured insight as valid JSON only.

Input:
${prompt}

Respond strictly in this JSON format:
{
  "reasoning": "Explain short reasoning behind the market behavior in 2-3 sentences.",
  "sentiment": "Bullish / Bearish / Neutral"
}
`;

  try {
    const output = await generator(formattedPrompt, {
      max_new_tokens: 300,
      temperature: Number(process.env.AI_TEMP ?? 0.4),
      top_p: Number(process.env.AI_TOP_P ?? 0.9),
      return_full_text: false,
    });

    const rawText =
      Array.isArray(output) && output[0]?.generated_text
        ? output[0].generated_text.trim()
        : String(output);

    const json = extractJSON(rawText);
    if (json && json.reasoning) {
      return {
        reasoning: firstNSentences(json.reasoning, 2),
        sentiment: normalizeSentiment(json.sentiment),
      };
    }

    // fallback if model gives unstructured output
    console.warn("⚠️ No JSON insight returned. Using fallback parsing.");
    return {
      reasoning: firstNSentences(rawText, 2) || "No usable insight produced by model.",
      sentiment: normalizeSentiment(rawText),
    };
  } catch (err) {
    console.error("❌ getAIInsights error:", err?.message ?? err);
    return { reasoning: "Failed to generate insight", sentiment: "Neutral" };
  }
}
