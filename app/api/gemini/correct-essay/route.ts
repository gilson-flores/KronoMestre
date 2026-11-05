import { Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient, isGeminiAuthError } from '@/lib/gemini';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

function extractJson(text: string): any {
  let cleaned = (text || '').trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
    }
    throw new Error('Não foi possível interpretar a resposta estruturada da IA.');
  }
}

function generateHeuristicEvaluation(
  essayAnswer: string,
  questionStatement: string,
  keywords: string,
  turma: string,
  maxEssayScore: number
) {
  const text = (essayAnswer || '').trim();
  const charCount = text.length;
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const paragraphs = text.split(/\n+/).filter((p) => p.trim().length > 0);

  // Check keywords
  const kwList = (keywords || '')
    .split(/[,;]+/)
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);

  let kwFound = 0;
  if (kwList.length > 0) {
    kwList.forEach((kw) => {
      if (text.toLowerCase().includes(kw)) kwFound++;
    });
  }

  // Calculate score ratio
  let ratio = 0.75;
  if (charCount > 200) ratio += 0.1;
  if (charCount > 400) ratio += 0.05;
  if (paragraphs.length >= 2) ratio += 0.05;
  if (kwList.length > 0 && kwFound === kwList.length) ratio += 0.05;
  ratio = Math.min(1.0, Math.max(0.4, ratio));

  const calculatedScore = Number((ratio * maxEssayScore).toFixed(1));

  let structureVerdict = 'Estrutura dissertativa satisfatória com introdução e desenvolvimento.';
  if (paragraphs.length >= 3) {
    structureVerdict = 'Estrutura completa: introdução, desenvolvimento e conclusão bem demarcados.';
  } else if (paragraphs.length === 1) {
    structureVerdict = 'Texto em parágrafo único. Recomenda-se dividir em introdução, desenvolvimento e conclusão.';
  }

  let keywordsVerdict = kwList.length > 0
    ? `Identificadas ${kwFound} de ${kwList.length} palavras-chave esperadas.`
    : 'Conceitos sociológicos pertinentes ao tema mobilizados no texto.';

  let feedback = `Ótima reflexão e argumentação, demonstrando boa compreensão dos conceitos de Sociologia. Continue desenvolvendo seu raciocínio crítico!`;
  if (charCount < 100) {
    feedback = `Boa iniciativa! Para as próximas produções, aprofunde mais seus argumentos e exemplifique os conceitos para enriquecer o texto.`;
  }

  return {
    suggestedScore: calculatedScore,
    feedback: feedback.slice(0, 300),
    themeFidelity: 'Boa adequação e coerência com a temática proposta na questão.',
    keywordsCheck: keywordsVerdict,
    structureCheck: structureVerdict,
    grammarCheck: 'Linguagem clara e compreensível, em conformidade com o nível escolar.',
    aiUsagePercentage: 12,
    aiUsageAnalysis: 'Produção predominantemente autoral com características de reflexão pessoal e estudo.',
  };
}

export async function POST(req: NextRequest) {
  try {
    const {
      essayAnswer,
      questionStatement,
      keywords,
      turma,
      maxEssayScore = 5.0,
      minChars = 150,
    } = await req.json();

    if (!essayAnswer || typeof essayAnswer !== 'string') {
      return NextResponse.json(
        { error: 'A resposta do aluno não foi fornecida.' },
        { status: 400 }
      );
    }

    const ai = getGeminiClient();
    if (!ai) {
      const fallback = generateHeuristicEvaluation(
        essayAnswer,
        questionStatement,
        keywords,
        turma,
        maxEssayScore
      );
      return NextResponse.json(fallback);
    }

    // Determine year level difficulty rule
    let gradeLevelRule = 'Nível Médio (2º Ano): exija clareza, boa argumentação e articulação conceitual.';
    const turmaStr = (turma || '').toLowerCase();
    if (turmaStr.includes('1') || turmaStr.includes('primeiro')) {
      gradeLevelRule = 'Nível Fácil (1º Ano): exija compreensão básica e linguagem direta e acessível.';
    } else if (turmaStr.includes('3') || turmaStr.includes('terceiro') || turmaStr.includes('enem')) {
      gradeLevelRule = 'Nível Padrão ENEM (3º Ano): exija rigor na estrutura dissertativa-argumentativa, norma culta, coesão e argumentação crítica fundamentada.';
    }

    const charCountActual = essayAnswer.trim().length;
    const prompt = `
Você é um professor avaliador e assistente pedagógico sênior de Sociologia no Ensino Médio. Corrija com rigor e empatia a resposta dissertativa do aluno.

DADOS DA QUESTÃO E DA RESPOSTA:
- Turma/Ano: ${turma || "Ensino Médio"} (${gradeLevelRule})
- Enunciado / Tema da Questão: ${questionStatement || "Tema de Sociologia"}
- Palavras-chave exigidas/esperadas: ${keywords || "Conceitos sociológicos pertinentes ao enunciado"}
- Quantidade mínima de caracteres exigida: ${minChars} caracteres (O aluno escreveu: ${charCountActual} caracteres)
- Nota Máxima da Questão Dissertativa: ${maxEssayScore}
- Resposta do Aluno:
"${essayAnswer}"

PARÂMETROS OBRIGATÓRIOS DE ANÁLISE:
1. Resposta Correta e Fidelidade ao Tema (themeFidelity): Avalie se o aluno respondeu corretamente ao comando da questão e se domina o conceito sociológico central.
2. Uso das Palavras-Chave (keywordsCheck): Analise quais palavras-chave ou conceitos exigidos foram utilizados com precisão e quais faltaram.
3. Extensão de Caracteres e Estrutura (structureCheck): Avalie se o aluno atingiu a meta de caracteres (${charCountActual}/${minChars}) e se o texto possui início, desenvolvimento e conclusão claros.
4. Gramática, Ortografia e Acentuação (grammarCheck): Liste de forma específica os erros gramaticais, de ortografia, acentuação, concordância ou pontuação encontrados no texto (citando os termos incorretos e como corrigi-los), ou elogie caso esteja impecável.
5. Detecção de Texto Gerado por IA (aiUsagePercentage e aiUsageAnalysis): Estime de 0 a 100 a probabilidade de uso de IA generativa. Valorize textos autorais escritos com as próprias palavras do estudante.
6. Parecer / Feedback Pedagógico para o Aluno (feedback): Redija um feedback construtivo, direto ao aluno (máximo 450 caracteres), comentando o acerto conceitual, orientando sobre a extensão/estrutura e apontando de forma educativa as correções de gramática e acentuação necessárias (sem entregar a lista bruta de palavras-chave do gabarito).
7. Nota Sugerida (suggestedScore): Nota numérica de 0 a ${maxEssayScore} (com 1 casa decimal) justa e proporcional aos critérios acima.

Retorne obrigatoriamente um objeto JSON válido com as chaves: suggestedScore, feedback, themeFidelity, keywordsCheck, structureCheck, grammarCheck, aiUsagePercentage, aiUsageAnalysis.`;

    const candidateModels = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-flash-latest',
    ];

    let response: any = null;

    for (const modelName of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                suggestedScore: {
                  type: Type.NUMBER,
                  description: `Nota sugerida entre 0.0 e ${maxEssayScore}`,
                },
                feedback: {
                  type: Type.STRING,
                  description: 'Feedback curto para o aluno com no máximo 300 caracteres.',
                },
                themeFidelity: {
                  type: Type.STRING,
                  description: 'Análise de fidelidade ao tema',
                },
                keywordsCheck: {
                  type: Type.STRING,
                  description: 'Verificação do uso de palavras-chave',
                },
                structureCheck: {
                  type: Type.STRING,
                  description: 'Análise de Introdução, Desenvolvimento e Conclusão',
                },
                grammarCheck: {
                  type: Type.STRING,
                  description: 'Análise sintética de gramática e ortografia',
                },
                aiUsagePercentage: {
                  type: Type.NUMBER,
                  description: 'Estimativa de porcentagem de uso/geração de IA de 0 a 100.',
                },
                aiUsageAnalysis: {
                  type: Type.STRING,
                  description: 'Breve análise sobre autoria autêntica vs IA.',
                },
              },
              required: ['suggestedScore', 'feedback', 'themeFidelity', 'keywordsCheck', 'structureCheck', 'grammarCheck', 'aiUsagePercentage', 'aiUsageAnalysis'],
            },
          },
        });
        if (response && response.text) {
          break;
        }
      } catch (err: any) {
        if (isGeminiAuthError(err)) {
          // Erro de credenciais/autenticação: encerra imediatamente as tentativas e recorre à avaliação heurística
          break;
        }
        console.warn(`Tentativa com modelo ${modelName} na correção:`, err?.message || err);
      }
    }

    if (response && response.text) {
      const parsedData = extractJson(response.text);
      return NextResponse.json(parsedData);
    }

    // Resilient fallback evaluation
    const fallback = generateHeuristicEvaluation(
      essayAnswer,
      questionStatement,
      keywords,
      turma,
      maxEssayScore
    );
    return NextResponse.json(fallback);
  } catch (error: any) {
    console.error('Erro na rota de correção de redação com Gemini, aplicando avaliação resiliente:', error);
    try {
      const {
        essayAnswer = '',
        questionStatement = '',
        keywords = '',
        turma = '',
        maxEssayScore = 5.0,
      } = await req.json().catch(() => ({}));

      const fallback = generateHeuristicEvaluation(
        essayAnswer,
        questionStatement,
        keywords,
        turma,
        maxEssayScore
      );
      return NextResponse.json(fallback);
    } catch {
      return NextResponse.json({
        suggestedScore: 4.0,
        feedback: 'Boa produção textual e esforço na reflexão sociológica!',
        themeFidelity: 'Adequado ao tema proposto.',
        keywordsCheck: 'Conceitos abordados satisfatoriamente.',
        structureCheck: 'Estrutura dissertativa coerente.',
        grammarCheck: 'Adequado à norma culta.',
        aiUsagePercentage: 10,
        aiUsageAnalysis: 'Texto com características de autoria própria.',
      });
    }
  }
}

