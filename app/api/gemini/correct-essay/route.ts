import { GoogleGenAI, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

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
            'Chave GEMINI_API_KEY não configurada no servidor de produção. Adicione a variável de ambiente GEMINI_API_KEY no painel de deploy (ex: Vercel, Railway, Docker, .env.local).',
        },
        { status: 500 }
      );
    }

    const {
      essayAnswer,
      questionStatement,
      keywords,
      turma,
      maxEssayScore = 5.0,
    } = await req.json();

    if (!essayAnswer || typeof essayAnswer !== 'string') {
      return NextResponse.json(
        { error: 'A resposta do aluno não foi fornecida.' },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // Determine year level difficulty rule
    let gradeLevelRule = 'Nível Médio (2º Ano): exija clareza, boa argumentação e articulação conceitual.';
    const turmaStr = (turma || '').toLowerCase();
    if (turmaStr.includes('1') || turmaStr.includes('primeiro')) {
      gradeLevelRule = 'Nível Fácil (1º Ano): exija compreensão básica e linguagem direta e acessível.';
    } else if (turmaStr.includes('3') || turmaStr.includes('terceiro') || turmaStr.includes('enem')) {
      gradeLevelRule = 'Nível Padrão ENEM (3º Ano): exija rigor na estrutura dissertativa-argumentativa, norma culta, coesão e argumentação crítica fundamentada.';
    }

    const prompt = `
Você é um professor avaliador e assistente pedagógico de Sociologia. Sua tarefa é corrigir a produção textual dissertativa fornecida por um aluno.

DADOS DA QUESTÃO E DA RESPOSTA:
- Turma/Ano: ${turma || 'Não especificada'} (${gradeLevelRule})
- Enunciado / Tema da Questão: ${questionStatement || 'Tema geral de Sociologia'}
- Palavras-chave exigidas/esperadas: ${keywords || 'Nenhuma palavra-chave específica informada'}
- Nota Máxima da Questão Dissertativa: ${maxEssayScore}
- Resposta do Aluno:
"${essayAnswer}"

INSTRUÇÕES E PARÂMETROS OBRIGATÓRIOS DE CORREÇÃO:
1. Fidelidade ao Tema: Avalie se a resposta abordou diretamente o enunciado proposto.
2. Atenção às Palavras-Chave: Verifique se o aluno usou corretamente e contextualizou as palavras-chave informadas (${keywords || 'gerais'}).
3. Coerência com o Ano Escolar: Aplique a exigência do ano escolar -> ${gradeLevelRule}.
4. Estrutura Textual Completa: Analise se a resposta contém Introdução, Desenvolvimento e Conclusão (independente da quantidade de caracteres).
5. Feedback Pedagógico do Professor:
   - Escreva um feedback simpático e construtivo com NO MÁXIMO 300 CARACTERES.
   - Inclua um elogio ou alerta motivacional simpático.
   - Inclua uma breve observação/correção de gramática e ortografia.
   - ATENÇÃO: NÃO mencione no feedback as palavras-chave que foram utilizadas como critério de avaliação.
6. Nota Sugerida: Atribua uma nota numérica de 0 a ${maxEssayScore} proporcional ao desempenho do aluno.

Retorne obrigatoriamente um objeto JSON com o formato:
{
  "suggestedScore": number,
  "feedback": string,
  "themeFidelity": string,
  "keywordsCheck": string,
  "structureCheck": string,
  "grammarCheck": string
}
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
                  suggestedScore: {
                    type: Type.NUMBER,
                    description: `Nota sugerida entre 0.0 e ${maxEssayScore}`,
                  },
                  feedback: {
                    type: Type.STRING,
                    description: 'Feedback curto para o aluno com no máximo 300 caracteres, elogio/alerta e gramática/ortografia.',
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
                },
                required: ['suggestedScore', 'feedback', 'themeFidelity', 'keywordsCheck', 'structureCheck', 'grammarCheck'],
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
          console.warn(`Tentativa ${attempt} com modelo ${modelName} na correção:`, err?.message || err);
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
      if (lastError) {
        throw lastError;
      }
      throw new Error('Nenhum modelo do Gemini respondeu à solicitação de correção.');
    }

    const parsedData = extractJson(response.text);

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error('Erro na rota de correção de redação com Gemini:', error);
    
    const isPrepaymentError = error?.message?.includes('prepayment') || error?.message?.includes('credits are depleted');
    if (isPrepaymentError) {
      return NextResponse.json(
        { error: 'Os créditos pré-pagos do projeto desta chave de API estão esgotados. Para usar gratuitamente, crie uma chave em um projeto novo sem faturamento pré-pago no Google AI Studio (https://aistudio.google.com/app/apikey).' },
        { status: 429 }
      );
    }

    const isQuotaError = error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota');
    if (isQuotaError) {
      return NextResponse.json(
        { error: 'Limite de requisições por minuto atingido. Aguarde alguns segundos e tente novamente.' },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: error?.message || 'Falha ao processar correção com o Gemini.' },
      { status: 500 }
    );
  }
}
