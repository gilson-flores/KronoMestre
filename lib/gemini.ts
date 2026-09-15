// lib/gemini.ts
import { GoogleGenAI } from '@google/genai';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('FATAL: Variável GEMINI_API_KEY não configurada no ambiente.');
}

/**
 * Instância centralizada do SDK oficial do Google Gen AI
 */
export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

/**
 * Modelos padronizados para o ecossistema da aplicação
 */
export const GEMINI_MODELS = {
  fast: 'gemini-2.5-flash',
  complex: 'gemini-2.5-pro',
} as const;

/**
 * Filtros de segurança calibrados para o ambiente escolar
 */
export const GEMINI_SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_LOW_AND_ABOVE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
] as const;

/**
 * Timeout padrão de 25 segundos para resiliência em conexões móveis
 */
export const REQUEST_TIMEOUT_MS = 25000;

/**
 * Sanitiza o input textual contra manipulações e injeções de prompt
 */
export function sanitizePedagogicalInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/SYSTEM INSTRUCTION:/gi, '[DIRETIVA_IGNORADA]')
    .replace(/IGNORE ALL PREVIOUS INSTRUCTIONS/gi, '[TENTATIVA_DE_OVERRIDE]')
    .replace(/=== INSTRUCTION ===/gi, '')
    .trim();
}

/**
 * Mascara documentos e identificadores sensíveis (LGPD)
 */
export function sanitizeStudentPII(text: string): string {
  if (!text) return '';
  return text
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[DOCUMENTO_PROTEGIDO]')
    .replace(/\b\d{7,10}\b/g, '[MATRICULA_PROTEGIDA]');
}

/**
 * Mapeia erros de API para notificações claras e humanas ao docente
 */
export function mapAiErrorToFriendlyMessage(error: any): { message: string; status: number } {
  console.error('[Gemini Service Error]:', error);

  const rawMsg = error?.message || '';

  if (rawMsg.includes('RESOURCE_EXHAUSTED') || rawMsg.includes('429')) {
    return {
      message: 'O assistente pedagógico está com alta demanda momentânea. Aguarde alguns segundos e tente novamente.',
      status: 429,
    };
  }

  if (rawMsg.includes('DEADLINE_EXCEEDED') || rawMsg.includes('timeout')) {
    return {
      message: 'Tempo limite esgotado. Verifique a conexão com a internet e repita a operação.',
      status: 504,
    };
  }

  if (rawMsg.includes('SAFETY')) {
    return {
      message: 'O conteúdo inserido acionou os filtros de moderação escolar. Revise o texto e tente novamente.',
      status: 422,
    };
  }

  return {
    message: 'Não foi possível concluir a ação pedagógica no momento. Tente novamente em instantes.',
    status: 500,
  };
}
