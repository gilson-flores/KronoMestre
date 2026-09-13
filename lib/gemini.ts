import { GoogleGenAI } from "@google/genai";

/**
 * Returns a cleaned and sanitized GEMINI_API_KEY, or undefined if not set or if it's a placeholder.
 */
export function getGeminiApiKey(): string | undefined {
  const rawKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY;

  if (!rawKey || typeof rawKey !== "string") return undefined;
  const cleaned = rawKey.trim().replace(/^["']|["']$/g, "").trim();

  // Rejeita placeholders conhecidos de templates de ambiente
  if (
    !cleaned ||
    cleaned.length < 10 ||
    cleaned === "MY_GEMINI_API_KEY" ||
    cleaned === "YOUR_GEMINI_API_KEY" ||
    cleaned.toLowerCase().includes("your_api_key")
  ) {
    return undefined;
  }

  return cleaned;
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
