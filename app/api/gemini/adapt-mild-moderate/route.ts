import { GoogleGenAI, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GOOGLE_GENAI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'Chave GEMINI_API_KEY não configurada no servidor. Adicione a variável de ambiente GEMINI_API_KEY.',
        },
        { status: 500 }
      );
    }

    const {
      title,
      subject = 'Sociologia',
      description = '',
      turma = '',
      questions = [],
      maxGrade = 10,
    } = await req.json();

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const questionsContext = Array.isArray(questions) && questions.length > 0
      ? JSON.stringify(questions, null, 2)
      : `Atividade de tema: "${title}". Descrição: "${description}".`;

    const prompt = `
Você é um especialista renomado em Educação Especial Inclusiva (AEE - Atendimento Educacional Especializado) e Pedagogia Adaptativa.
Sua missão é ADAPTAR pedagogicamente esta atividade para alunos com DEFICIÊNCIAS LEVES E MODERADAS (ex: TDAH, Dislexia, Deficiência Intelectual Leve/Moderada, TEA Nível 1 e 2).

DADOS DA ATIVIDADE ORIGINAL:
- Título: ${title || 'Atividade'}
- Disciplina: ${subject}
- Turma: ${turma || 'Geral'}
- Descrição Original: ${description}
- Questões / Conteúdo Original:
${questionsContext}

DIRETRIZES PEDAGÓGICAS RIGOROSAS (AEE - LEVES E MODERADAS):
1. REDUÇÃO DE CARGA COGNITIVA:
   - Se a atividade tiver muitas questões, selecione/sintetize cerca de 50% das questões mais essenciais (mínimo 1, máximo 4 questões bem estruturadas).
   - Se a atividade for uma Redação ou não tiver lista de questões, crie 1 a 2 questões dissertativas guiadas com perguntas norteadoras claras e vocabulário direto.

2. QUESTÕES OBJETIVAS (MÚLTIPLA ESCOLHA):
   - Cada questão objetiva DEVE ter EXATAMENTE 2 ALTERNATIVAS (Opção A e Opção B), eliminando distratores excessivos para evitar sobrecarga de processamento.
   - Enunciados curtos, claros e em linguagem direta.
   - O campo "correctOptionIndex" deve ser 0 (se a primeira for a correta) ou 1 (se a segunda for a correta).

3. QUESTÕES DISSERTATIVAS / REDAÇÃO:
   - Forneça enunciados estruturados com roteiro passo a passo (ex: "1. Explique com suas palavras...", "2. Dê um exemplo...").
   - "minCharacters" DEVE ser 0 (SEM limite mínimo punitivo de caracteres).
   - "keywords" pode ser uma string vazia ou palavras-chave facilitadoras.

4. ESTRUTURA DE RESPOSTA OBRIGATÓRIA (JSON puro):
Retorne um objeto JSON contendo:
- "adaptedTitle": Título adaptado (ex: "[PNE Leve/Mod] " + título original)
- "adaptedDescription": Breve orientação pedagógica inclusiva explicando o tema de forma acolhedora.
- "questions": Lista de questões adaptadas seguindo o modelo exato:
  - type: 'multiple_choice' | 'essay'
  - id: identificador único gerado
  - statement: enunciado simplificado e claro
  - options: array com exatamente 2 strings (apenas se type === 'multiple_choice')
  - correctOptionIndex: número 0 ou 1 (apenas se type === 'multiple_choice')
  - minCharacters: 0 (se type === 'essay')
`;

    const candidateModels = [
      'gemini-3.7-flash',
      'gemini-flash-latest',
      'gemini-3.1-flash-lite',
    ];

    let response: any = null;
    let lastError: any = null;

    for (const modelName of candidateModels) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  adaptedTitle: { type: Type.STRING },
                  adaptedDescription: { type: Type.STRING },
                  questions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        type: { type: Type.STRING, enum: ['multiple_choice', 'essay'] },
                        statement: { type: Type.STRING },
                        options: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                        },
                        correctOptionIndex: { type: Type.INTEGER },
                        minCharacters: { type: Type.INTEGER },
                        keywords: { type: Type.STRING },
                      },
                      required: ['id', 'type', 'statement'],
                    },
                  },
                },
                required: ['adaptedTitle', 'adaptedDescription', 'questions'],
              },
            },
          });

          if (response && response.text) {
            break;
          }
        } catch (err: any) {
          lastError = err;
          const status = err?.status || err?.code;
          const isRetryable = status === 503 || status === 429 || err?.message?.includes('high demand') || err?.message?.includes('UNAVAILABLE');
          console.warn(`Tentativa ${attempt} com ${modelName} na adaptação leve:`, err?.message || err);
          if (isRetryable && attempt < 2) {
            await new Promise((r) => setTimeout(r, 1200));
            continue;
          }
          break;
        }
      }
      if (response && response.text) {
        break;
      }
    }

    if (!response || !response.text) {
      if (lastError) throw lastError;
      throw new Error('Nenhum modelo do Gemini gerou a resposta de adaptação.');
    }

    const parsedData = JSON.parse(response.text.trim());

    // Sanitizar questões para garantir conformidade
    const sanitizedQuestions = (parsedData.questions || []).map((q: any, idx: number) => {
      const qId = q.id || `q-gemini-adapt-${Date.now()}-${idx + 1}`;
      if (q.type === 'multiple_choice') {
        const rawOptions = Array.isArray(q.options) && q.options.length >= 2
          ? q.options.slice(0, 2)
          : ['Opção Correta (A)', 'Opção Incorreta (B)'];
        
        const correctIdx = typeof q.correctOptionIndex === 'number' && (q.correctOptionIndex === 0 || q.correctOptionIndex === 1)
          ? q.correctOptionIndex
          : 0;

        return {
          id: qId,
          type: 'multiple_choice',
          statement: q.statement,
          options: rawOptions,
          correctOptionIndex: correctIdx,
        };
      }

      return {
        id: qId,
        type: 'essay',
        statement: q.statement,
        minCharacters: 0,
        keywords: q.keywords || '',
      };
    });

    return NextResponse.json({
      adaptedTitle: parsedData.adaptedTitle || `[PNE Leve/Mod] ${title}`,
      adaptedDescription: parsedData.adaptedDescription || `Atividade adaptada por IA para PNE Leve/Moderada.`,
      questions: sanitizedQuestions,
    });
  } catch (error: any) {
    console.error('Erro na rota de adaptação para PNE Leve/Moderada com Gemini:', error);
    return NextResponse.json(
      { error: error?.message || 'Falha ao adaptar atividade com o Gemini.' },
      { status: 500 }
    );
  }
}
