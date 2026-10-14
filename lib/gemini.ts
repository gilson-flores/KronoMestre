import { GoogleGenAI } from "@google/genai";

/**
 * Returns a cleaned and sanitized GEMINI_API_KEY, or undefined if not set, placeholder, or invalid token type.
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
    cleaned.length < 20 ||
    cleaned === "MY_GEMINI_API_KEY" ||
    cleaned === "YOUR_GEMINI_API_KEY" ||
    cleaned.toLowerCase().includes("your_api_key")
  ) {
    return undefined;
  }

  // Google Generative Language API aceita estritamente chaves de API do Google (iniciando em AIza...)
  // ou tokens OAuth2 válidos (iniciando em ya29...). Tokens de outros serviços ou formatos inválidos (como AQ.*)
  // causam erro imediato 401 ACCESS_TOKEN_TYPE_UNSUPPORTED na API do Google.
  if (!cleaned.startsWith("AIza") && !cleaned.startsWith("ya29.")) {
    return undefined;
  }

  return cleaned;
}

/**
 * Detects whether an error from the Gemini SDK is an authentication or credential failure.
 */
export function isGeminiAuthError(err: any): boolean {
  if (!err) return false;
  const status = err?.status || err?.code || err?.error?.code;
  if (status === 401 || status === 403) return true;
  const errStr = (
    String(err?.message || '') +
    ' ' +
    String(err?.error?.message || '') +
    ' ' +
    String(err?.statusText || '') +
    ' ' +
    (typeof err === 'string' ? err : '') +
    ' ' +
    (typeof err === 'object' ? JSON.stringify(err) : '')
  ).toLowerCase();

  return (
    errStr.includes('unauthenticated') ||
    errStr.includes('401') ||
    errStr.includes('403') ||
    errStr.includes('api_key_invalid') ||
    errStr.includes('api key not valid') ||
    errStr.includes('invalid authentication credentials') ||
    errStr.includes('access_token_type_unsupported') ||
    errStr.includes('api_key_service_blocked') ||
    errStr.includes('permission_denied')
  );
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
