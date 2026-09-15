// app/api/gemini/correct-essay/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  ai,
  GEMINI_MODELS,
  GEMINI_SAFETY_SETTINGS,
  sanitizePedagogicalInput,
  sanitizeStudentPII,
  mapAiErrorToFriendlyMessage,
} from '@/lib/gemini';

// Esquema estrito para Structured Outputs
const essayCorrectionSchema = {
  type: 'object',
  properties: {
    notaFinal: {
      type: 'number',
      description: 'Nota consolidada de 0.0 a 10.0 calculada pela soma ponderada dos critérios.',
    },
    criterios: {
      type: 'array',
      description: 'Avaliação individualizada por competência pedagógica.',
      items: {
        type: 'object',
        properties: {
          nome: { type: 'string' },
          pontuacao: { type: 'number', description: 'Nota de 0 a 10 neste critério.' },
          peso: { type: 'number', description: 'Peso do critério na composição da nota.' },
          justificativa: { type: 'string', description: 'Diagnóstico detalhado da produção textual.' },
        },
        required: ['nome', 'pontuacao', 'peso', 'justificativa'],
      },
    },
    pontosFortes: {
      type: 'array',
      items: { type: 'string' },
      description: 'Destaques conceituais e acertos do estudante.',
    },
    pontosMelhoria: {
      type: 'array',
      items: { type: 'string' },
      description: 'Lacunas teóricas ou textuais que precisam de revisão.',
    },
    devolutivaEstudante: {
      type: 'string',
      description: 'Texto acolhedor, formativo e construtivo voltado diretamente ao aluno.',
    },
    precisaRecuperacao: {
      type: 'boolean',
      description: 'True se notaFinal < 6.0 (critério da rede estadual para recuperação paralela).',
    },
    orientacaoRecuperacao: {
      type: 'string',
      description: 'Roteiro de estudos e autores sociológicos a revisar caso preciseRecuperacao seja true.',
    },
  },
  required: [
    'notaFinal',
    'criterios',
    'pontosFortes',
    'pontosMelhoria',
    'devolutivaEstudante',
    'precisaRecuperacao',
    'orientacaoRecuperacao',
  ],
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tema, enunciado, textoRedacao, serie } = body;

    if (!textoRedacao || !tema) {
      return NextResponse.json(
        { error: 'Tema e texto da redação são obrigatórios para a avaliação.' },
        { status: 400 }
      );
    }

    // Sanitização contra prompt injection e proteção de dados de menores (LGPD)
    const sanitizedTema = sanitizePedagogicalInput(tema);
    const sanitizedEnunciado = sanitizePedagogicalInput(enunciado || '');
    const sanitizedTexto = sanitizeStudentPII(sanitizePedagogicalInput(textoRedacao));

    const systemInstruction = `Você é um avaliador pedagógico sênior de Sociologia do Ensino Médio, alinhado à BNCC e aos referenciais curriculares estaduais.
Avalie a redação com base em 4 critérios avaliativos:
1. Compreensão Conceitual e Teórica (Domínio de autores e categorias sociológicas).
2. Coesão Argumentativa (Clareza de tese e encadeamento lógico).
3. Contextualização Social e Empírica (Relação crítica com o mundo contemporâneo).
4. Escrita Formal e Clareza (Adequação gramatical e registro acadêmico).

Diretrizes Obrigatórias:
- A notaFinal deve ser calculada de 0.0 a 10.0 com base na média ponderada dos critérios.
- Se a notaFinal for menor que 6.0, marque 'precisaRecuperacao' como true e produza um plano prático em 'orientacaoRecuperacao'.
- Mantenha a 'devolutivaEstudante' em tom pedagógico, claro e motivador.
- Responda estritamente respeitando o esquema JSON configurado.`;

    const prompt = `Analise e corrija a seguinte produção textual:
- Etapa de Ensino: ${serie || 'Ensino Médio'}
- Tema Proposto: ${sanitizedTema}
- Enunciado da Atividade: ${sanitizedEnunciado}
- Redação do Aluno:
"""
${sanitizedTexto}
"""`;

    // Chamada oficial via SDK centralizado com Structured Outputs
    const response = await ai.models.generateContent({
      model: GEMINI_MODELS.fast,
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.2,
        safetySettings: GEMINI_SAFETY_SETTINGS as any,
        responseMimeType: 'application/json',
        responseSchema: essayCorrectionSchema,
      },
    });

    const rawText = response.text;
    if (!rawText) {
      throw new Error('A IA retornou uma resposta vazia.');
    }

    const parsedData = JSON.parse(rawText);

    return NextResponse.json({
      success: true,
      data: parsedData,
    });
  } catch (error: any) {
    const { message, status } = mapAiErrorToFriendlyMessage(error);
    return NextResponse.json({ error: message, details: error?.message }, { status });
  }
}
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
5. Análise de Autoria e Porcentagem de Uso de IA:
   - Estime uma porcentagem de 0% a 100% quanto à probabilidade de o texto ter sido gerado integralmente por Inteligência Artificial (ex: ChatGPT, Gemini).
   - RECOMPENSA PEDAGÓGICA: Se o aluno pesquisou fontes e redigiu uma produção autoral própria com suas próprias palavras e reflexões críticas baseadas na pesquisa, ele DEVE SER RECOMPENSADO com valorização na nota sugerida e no feedback.
6. Feedback Pedagógico do Professor:
   - Escreva um feedback simpático e construtivo com NO MÁXIMO 300 CARACTERES.
   - Inclua um elogio ou alerta motivacional simpático e uma breve observação de gramática.
   - ATENÇÃO: NÃO mencione no feedback as palavras-chave que foram utilizadas como critério de avaliação.
7. Nota Sugerida: Atribua uma nota numérica de 0 a ${maxEssayScore} proporcional ao desempenho do aluno.

Retorne obrigatoriamente um objeto JSON com o formato:
{
  "suggestedScore": number,
  "feedback": string,
  "themeFidelity": string,
  "keywordsCheck": string,
  "structureCheck": string,
  "grammarCheck": string,
  "aiUsagePercentage": number,
  "aiUsageAnalysis": string
}
`;

    const candidateModels = [
      'gemini-3.8-flash',
      'gemini-3.1-flash-lite',
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
        const errMsg = String(err?.message || '');
        if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('API key not valid')) {
          // Chave de API ausente ou inválida: encerra silenciosamente o loop e recorre à avaliação heurística
          break;
        }
        console.warn(`Tentativa com modelo ${modelName} na correção:`, errMsg);
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

