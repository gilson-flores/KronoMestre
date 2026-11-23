import { GoogleGenAI } from "@google/genai";

/**
 * Lista centralizada de modelos ativos do Gemini em ordem de estabilidade e disponibilidade.
 */
export const GEMINI_CANDIDATE_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-flash-latest",
] as const;

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

  // Aceita chaves padrão AIza..., chaves vinculadas a conta de serviço AQ.* e tokens OAuth2 ya29.
  if (!cleaned.startsWith("AIza") && !cleaned.startsWith("AQ.") && !cleaned.startsWith("ya29.")) {
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
 * Detects whether an error is a quota/rate-limit failure (429 / RESOURCE_EXHAUSTED).
 */
export function isGeminiQuotaError(err: any): boolean {
  if (!err) return false;
  const status = err?.status || err?.code || err?.error?.code;
  if (status === 429) return true;
  const errStr = String(err?.message || err?.error?.message || err || '').toLowerCase();
  return (
    errStr.includes('429') ||
    errStr.includes('quota exceeded') ||
    errStr.includes('resource_exhausted') ||
    errStr.includes('rate limit')
  );
}

/**
 * Detects whether an error is a temporary upstream overload (503 / UNAVAILABLE / high demand).
 */
export function isGeminiTransientError(err: any): boolean {
  if (!err) return false;
  const status = err?.status || err?.code || err?.error?.code;
  if (status === 503 || status === 504 || status === 502) return true;
  const errStr = String(err?.message || err?.error?.message || err || '').toLowerCase();
  return (
    errStr.includes('503') ||
    errStr.includes('unavailable') ||
    errStr.includes('high demand') ||
    errStr.includes('overloaded') ||
    errStr.includes('temporarily') ||
    errStr.includes('econnreset')
  );
}

export interface GeminiFallbackParams {
  contents: any;
  config?: any;
  routeTag?: string;
  models?: readonly string[];
  validateText?: (text: string) => boolean;
  retryDelayMs?: number;
}

export interface GeminiFallbackResult {
  response: any | null;
  text: string | null;
  modelUsed: string | null;
  lastErrorMsg: string;
  isAuthError: boolean;
}

/**
 * Executa generateContent percorrendo a cascata de modelos ativos com retry curto em 503
 * e avanço imediato em 429, encerrando sem desperdício em erros de autenticação.
 */
export async function generateContentWithFallback(
  ai: GoogleGenAI,
  params: GeminiFallbackParams
): Promise<GeminiFallbackResult> {
  const models = params.models && params.models.length > 0 ? params.models : GEMINI_CANDIDATE_MODELS;
  const tag = params.routeTag || 'gemini';
  const retryDelayMs = params.retryDelayMs ?? 700;
  let lastErrorMsg = '';

  for (const modelName of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const requestPayload: any = {
          model: modelName,
          contents: params.contents,
        };
        if (params.config !== undefined) {
          requestPayload.config = params.config;
        }

        const response = await ai.models.generateContent(requestPayload);
        const text = typeof response?.text === 'string' ? response.text : '';

        if (text) {
          if (params.validateText) {
            let isValid = false;
            try {
              isValid = Boolean(params.validateText(text));
            } catch (valErr: any) {
              lastErrorMsg = `Validação falhou no modelo ${modelName}: ${valErr?.message || valErr}`;
              console.warn(`[${tag}] ${lastErrorMsg}`);
            }
            if (!isValid) {
              break; // Passa para o próximo modelo da cascata
            }
          }

          return {
            response,
            text,
            modelUsed: modelName,
            lastErrorMsg: '',
            isAuthError: false,
          };
        }
        break;
      } catch (err: any) {
        lastErrorMsg = String(err?.message || err || 'Erro desconhecido no modelo');
        console.warn(`[${tag}] Falha no modelo ${modelName} (tentativa ${attempt + 1}):`, lastErrorMsg);

        if (isGeminiAuthError(err)) {
          return {
            response: null,
            text: null,
            modelUsed: null,
            lastErrorMsg,
            isAuthError: true,
          };
        }

        if (isGeminiQuotaError(err)) {
          break; // Cota esgotada neste modelo: avança imediatamente para o próximo
        }

        if (isGeminiTransientError(err) && attempt === 0) {
          await new Promise((r) => setTimeout(r, retryDelayMs));
          continue;
        }
        break;
      }
    }
  }

  return {
    response: null,
    text: null,
    modelUsed: null,
    lastErrorMsg: lastErrorMsg || 'Modelos Gemini temporariamente indisponíveis.',
    isAuthError: false,
  };
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
