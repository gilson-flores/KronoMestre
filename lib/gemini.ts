import { GoogleGenAI } from "@google/genai";

/**
 * Returns a cleaned and sanitized GEMINI_API_KEY, or undefined if not set.
 */
export function getGeminiApiKey(): string | undefined {
  const rawKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY;

  if (!rawKey || typeof rawKey !== "string") return undefined;
  const cleaned = rawKey.trim().replace(/^["']|["']$/g, "").trim();
  return cleaned.length > 5 ? cleaned : undefined;
}

/**
 * Returns a GoogleGenAI client instance with required headers if a key is available, or null.
 */
export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}
