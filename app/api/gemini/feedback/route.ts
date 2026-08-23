import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

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
            "Chave GEMINI_API_KEY não configurada no servidor de produção. Adicione a variável de ambiente GEMINI_API_KEY no painel de deploy.",
        },
        { status: 500 }
      );
    }

    const body = await req.json();
    const {
      studentName = "Estudante",
      activityTitle = "Atividade de Sociologia",
      grade = null,
      maxGrade = 10,
      maxObjectiveGrade = null,
      maxEssayGrade = null,
      statusAction = "graded",
      evaluationFormat: explicitFormat,
      hasObjective: explicitHasObjective,
      hasEssay: explicitHasEssay,
      essayAnswer = "",
      essayScore = null,
      objectiveSummary = { total: 0, correct: 0, score: 0 },
      customInstructions = "",
      feedbackType = "ninja",
    } = body;

    const isReturned = statusAction === "returned";
    const isSerious = feedbackType === "serious";

    // Determine exact evaluation format: 'objective_only' | 'essay_only' | 'mixed'
    let evaluationFormat: 'objective_only' | 'essay_only' | 'mixed' = explicitFormat || 'mixed';
    if (!explicitFormat) {
      if (explicitHasObjective !== undefined && explicitHasEssay !== undefined) {
        if (explicitHasObjective && !explicitHasEssay) evaluationFormat = 'objective_only';
        else if (!explicitHasObjective && explicitHasEssay) evaluationFormat = 'essay_only';
        else evaluationFormat = 'mixed';
      } else {
        const objCount = Number(objectiveSummary?.total || 0);
        const hasEssayText = Boolean(essayAnswer && essayAnswer.trim());
        if (objCount > 0 && !hasEssayText) {
          evaluationFormat = 'objective_only';
        } else if (objCount === 0 && hasEssayText) {
          evaluationFormat = 'essay_only';
        } else {
          evaluationFormat = 'mixed';
        }
      }
    }

    let prompt = "";

    if (isSerious) {
      let formatContext = "";
      let formatSpecificRules = "";

      if (evaluationFormat === 'objective_only') {
        formatContext = `
FORMATO DA AVALIAÇÃO: AVALIAÇÃO 100% OBJETIVA (Múltipla Escolha / Gabarito)
- Total de Questões Objetivas: ${objectiveSummary.total}
- Acertos no Gabarito: ${objectiveSummary.correct} de ${objectiveSummary.total} questões
- Nota das Objetivas: ${grade !== null ? `${grade}/${maxGrade}` : "Em análise"}
- ATENÇÃO: NÃO HÁ QUESTÕES DISSERTATIVAS nesta avaliação.`;

        formatSpecificRules = `
DIRETRIZES ESPECÍFICAS PARA AVALIAÇÃO 100% OBJETIVA:
- Foque EXCLUSIVAMENTE no desempenho nas questões objetivas, no raciocínio lógico e nos acertos obtidos no gabarito.
- REGRA CRÍTICA E ABSOLUTA: É TOTALMENTE PROIBIDO mencionar questões dissertativas, redação, escrita, argumentação textual ou reclamar de falta de resposta escrita. A avaliação foi exclusivamente objetiva.
- ${
          isReturned
            ? "Como a atividade foi devolvida para refazer, oriente com empatia o estudante a revisar os conceitos e enunciados das questões objetivas para aprimorar seus acertos."
            : "Como a atividade foi concluída com aprovação, parabenize os acertos e valorize o bom domínio dos conceitos demonstrados no gabarito."
        }`;
      } else if (evaluationFormat === 'essay_only') {
        formatContext = `
FORMATO DA AVALIAÇÃO: AVALIAÇÃO 100% DISSERTATIVA (Resposta Escrita / Discursiva / Redação)
- Resposta Dissertativa enviada pelo estudante: "${essayAnswer || "Não enviada"}"
- Nota da Dissertação: ${grade !== null ? `${grade}/${maxGrade}` : "Em análise"}
- ATENÇÃO: NÃO HÁ QUESTÕES OBJETIVAS (múltipla escolha) nesta avaliação.`;

        formatSpecificRules = `
DIRETRIZES ESPECÍFICAS PARA AVALIAÇÃO 100% DISSERTATIVA:
- Foque EXCLUSIVAMENTE na resposta escrita, na clareza da argumentação, reflexão crítica e fundamentação sociológica.
- REGRA CRÍTICA E ABSOLUTA: É TOTALMENTE PROIBIDO mencionar questões objetivas, alternativas de múltipla escolha ou acertos de gabarito.
- ${
          isReturned
            ? "Como a atividade foi devolvida para refazer, oriente com carinho e clareza os pontos que o estudante pode aprofundar em suas ideias e argumentos textuais antes de reenviar."
            : "Como a atividade foi concluída com aprovação, elogie a dedicação, a reflexão crítica e a clareza demonstradas no texto."
        }`;
      } else {
        formatContext = `
FORMATO DA AVALIAÇÃO: AVALIAÇÃO MESCLADA / MISTA (Questões Objetivas + Questão Dissertativa)
- Questões Objetivas: ${objectiveSummary.correct} acertos de ${objectiveSummary.total} questões
- Resposta Dissertativa enviada pelo estudante: "${essayAnswer || "Não enviada"}"
- Nota Total: ${grade !== null ? `${grade}/${maxGrade}` : "Em análise"}`;

        formatSpecificRules = `
DIRETRIZES ESPECÍFICAS PARA AVALIAÇÃO MESCLADA:
- Avalie o conjunto da atividade: comente a precisão nas questões objetivas e o desenvolvimento crítico na questão dissertativa.
- ${
          isReturned
            ? "Oriente com clareza o que pode ser revisado tanto no gabarito das questões objetivas quanto no aprofundamento da resposta dissertativa."
            : "Parabenize o bom equilíbrio demonstrado entre os acertos objetivos e a reflexão crítica dissertativa."
        }`;
      }

      prompt = `Você é o Professor de Sociologia do Ensino Médio: amigável, acolhedor, humano, incentivador e altamente pedagógico.
Sua missão é gerar um feedback positivo, claro, encorajador e construtivo (sem ser rígido, frio ou formal demais) para a atividade de Sociologia entregue pelo estudante.

DADOS DA ENTREGA:
- Nome do Estudante: ${studentName}
- Atividade / Avaliação: ${activityTitle}
- Situação da Avaliação: ${isReturned ? "Devolvendo para o aluno REFAZER e aprimorar" : "Atividade Concluída e Aprovada"}
${formatContext}
${customInstructions ? `- Instrução extra do Docente: ${customInstructions}` : ""}

DIRETRIZES DE ESTILO E CONTEÚDO (FEEDBACK DO PROFESSOR):
1. Mantenha um tom amigável, próximo, empático e estimulante. Fale de professor para aluno com carinho e entusiasmo pelo aprendizado.
2. Destaque o esforço e a reflexão de forma leve e motivadora, evitando termos burocráticos ou excessivamente sisudos.
${formatSpecificRules}
3. REGRA OBRIGATÓRIA DE TAMANHO: O feedback gerado DEVE ter no MÁXIMO 400 caracteres no total (incluindo espaços e pontuação). Seja direto, caloroso e conciso.
4. Responda estritamente em Português do Brasil com linguagem acessível ao jovem do Ensino Médio.`;
    } else {
      let formatContextNinja = "";
      let formatSpecificRulesNinja = "";

      if (evaluationFormat === 'objective_only') {
        formatContextNinja = `
FORMATO DA MISSÃO: TESTE 100% OBJETIVO (Pergaminhos de Múltipla Escolha / Gabarito)
- Total de Questões Objetivas: ${objectiveSummary.total}
- Acertos no Gabarito: ${objectiveSummary.correct} de ${objectiveSummary.total} acertos
- Nota da Missão: ${grade !== null ? `${grade}/${maxGrade}` : "Em análise"}
- ATENÇÃO: NÃO HÁ QUESTÕES DISSERTATIVAS nesta missão.`;

        formatSpecificRulesNinja = `
DIRETRIZES ESPECÍFICAS PARA MISSÃO 100% OBJETIVA:
- Foque EXCLUSIVAMENTE nos acertos das questões objetivas, na precisão do jutsu no gabarito e no domínio dos conceitos sociológicos.
- REGRA CRÍTICA E ABSOLUTA: É ESTRITAMENTE PROIBIDO falar de questões dissertativas, redação ou escrita de texto. A missão foi apenas de múltipla escolha.
- ${
          isReturned
            ? "Como a missão está sendo DEVOLVIDA para refazer, aponte onde concentrar o chakra para revisar as alternativas e gabaritar as questões objetivas."
            : "Como a missão foi APROVADA, elogie a precisão nos pergaminhos objetivos com a força da Vontade do Fogo."
        }`;
      } else if (evaluationFormat === 'essay_only') {
        formatContextNinja = `
FORMATO DA MISSÃO: MISSÃO 100% DISSERTATIVA (Pergaminho de Escrita / Reflexão Crítica)
- Resposta Dissertativa enviada pelo aluno Shinobi: "${essayAnswer || "Não enviada"}"
- Nota da Missão: ${grade !== null ? `${grade}/${maxGrade}` : "Em análise"}
- ATENÇÃO: NÃO HÁ QUESTÕES OBJETIVAS (múltipla escolha) nesta missão.`;

        formatSpecificRulesNinja = `
DIRETRIZES ESPECÍFICAS PARA MISSÃO 100% DISSERTATIVA:
- Foque EXCLUSIVAMENTE na escrita, na profundidade das ideias, na argumentação e na reflexão crítica sociológica.
- REGRA CRÍTICA E ABSOLUTA: É ESTRITAMENTE PROIBIDO falar de alternativas de múltipla escolha ou acertos de gabarito.
- ${
          isReturned
            ? "Como a missão está sendo DEVOLVIDA para refazer, aponte onde concentrar o chakra para aprofundar os argumentos do texto antes de reenviar."
            : "Como a missão foi APROVADA, elogie a força da escrita, a reflexão crítica e a dedicação demonstrada no pergaminho."
        }`;
      } else {
        formatContextNinja = `
FORMATO DA MISSÃO: MISSÃO MESCLADA / MISTA (Questões Objetivas + Questão Dissertativa)
- Questões Objetivas: ${objectiveSummary.correct} de ${objectiveSummary.total} acertos
- Resposta Dissertativa enviada pelo aluno Shinobi: "${essayAnswer || "Não enviada"}"
- Nota Total: ${grade !== null ? `${grade}/${maxGrade}` : "Em análise"}`;

        formatSpecificRulesNinja = `
DIRETRIZES ESPECÍFICAS PARA MISSÃO MESCLADA:
- Avalie o conjunto: comente a precisão nos pergaminhos objetivos e o poder da escrita na questão dissertativa.
- ${
          isReturned
            ? "Como a missão foi devolvida para refazer, oriente onde calibrar o chakra tanto nas questões objetivas quanto no aprofundamento dissertativo."
            : "Como a missão foi aprovada, elogie o equilíbrio ninja entre a pontaria no gabarito e a sabedoria no pergaminho dissertativo."
        }`;
      }

      prompt = `Você é o Sensei de Sociologia da Vila da Folha (universo de Naruto Shippuden, combinando sabedoria pedagógica, acolhimento e humor de mestres como Kakashi e Jiraiya Sensei).
Sua missão é gerar um feedback pedagógico ninja, motivador e instrutivo para a atividade de Sociologia entregue pelo aluno.

DADOS DA ENTREGA:
- Aluno Shinobi: ${studentName}
- Missão / Atividade: ${activityTitle}
- Situação da Avaliação: ${isReturned ? "Devolvendo para o aluno REFAZER e aprimorar" : "Atividade Concluída e Aprovada"}
${formatContextNinja}
${customInstructions ? `- Instrução extra do Professor: ${customInstructions}` : ""}

DIRETRIZES DE ESTILO E CONTEÚDO (FEEDBACK NINJA):
1. Mantenha o tom de um Sensei sábio e encorajador da Vila da Folha.
2. Integre termos de Naruto (Chakra, Vontade do Fogo, Jutsu, Treino, Ichiraku, Pergaminhos) com conceitos sociológicos de forma divertida e pedagógica.
${formatSpecificRulesNinja}
3. REGRA OBRIGATÓRIA DE TAMANHO: O feedback gerado DEVE ter no MÁXIMO 400 caracteres no total (incluindo espaços e emojis como 🍃, ⚡, 📜). Seja extremamente conciso, direto e dinâmico.
4. Responda estritamente em Português do Brasil.`;
    }

    const ai = new GoogleGenAI({ apiKey });

    const candidateModels = [
      'gemini-3.1-flash-lite',
      'gemini-3.7-flash',
      'gemini-flash-latest',
    ];

    let response: any = null;
    let lastError: any = null;

    for (const modelName of candidateModels) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
          });
          if (response && response.text) {
            break;
          }
        } catch (err: any) {
          lastError = err;
          const status = err?.status || err?.code;
          const errMsg = String(err?.message || '');
          const isQuotaExhausted = status === 429 || errMsg.includes('Quota exceeded') || errMsg.includes('RESOURCE_EXHAUSTED');
          const isHighDemand = status === 503 || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE');

          console.warn(`Tentativa ${attempt} com modelo ${modelName} no feedback:`, errMsg || err);

          if (isQuotaExhausted) {
            break;
          }

          if (isHighDemand && attempt < 2) {
            await new Promise((r) => setTimeout(r, 600));
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
      throw new Error("Nenhum modelo do Gemini respondeu à solicitação de feedback.");
    }

    let defaultFallback = "";
    if (isSerious) {
      if (evaluationFormat === 'objective_only') {
        defaultFallback = isReturned
          ? "Revise com atenção os conceitos das questões objetivas para aprimorar seu gabarito antes de reenviar."
          : "Excelente desempenho nas questões objetivas! Parabéns pela assertividade e dedicação aos estudos.";
      } else if (evaluationFormat === 'essay_only') {
        defaultFallback = isReturned
          ? "Releia sua resposta dissertativa e aprofunde seus argumentos com mais reflexão sociológica antes de reenviar."
          : "Excelente reflexão e escrita dissertativa! Parabéns pela argumentação e dedicação nos estudos.";
      } else {
        defaultFallback = isReturned
          ? "Revise as questões objetivas e aprofunde sua resposta dissertativa para enriquecer a atividade antes de reenviar."
          : "Excelente desempenho nas questões objetivas e dissertativas! Continue dedicando-se com entusiasmo aos estudos.";
      }
    } else {
      if (evaluationFormat === 'objective_only') {
        defaultFallback = isReturned
          ? "Sensei: Quase lá! Concentre seu chakra para revisar as alternativas e gabaritar as questões objetivas. Dattebayo!"
          : "Sensei: Excelente precisão nos pergaminhos de questões objetivas! Mantenha o chakra focado. Dattebayo!";
      } else if (evaluationFormat === 'essay_only') {
        defaultFallback = isReturned
          ? "Sensei: Concentre seu chakra na escrita e aprofunde seus argumentos sociológicos antes de reenviar. Dattebayo!"
          : "Sensei: Excelente reflexão no seu pergaminho dissertativo! Sua Vontade do Fogo brilhou na argumentação. Dattebayo!";
      } else {
        defaultFallback = isReturned
          ? "Sensei: Calibre seu chakra nas questões objetivas e aprofunde o texto dissertativo para reenviar a missão. Dattebayo!"
          : "Sensei: Excelente esforço em toda a missão objetiva e dissertativa! Continue com a Vontade do Fogo acesa. Dattebayo!";
      }
    }

    const generatedFeedback = (response.text || defaultFallback).trim().slice(0, 400);

    return NextResponse.json({ feedback: generatedFeedback });
  } catch (error: any) {
    console.error("Erro ao gerar feedback com Gemini:", error);
    
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

    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido ao chamar Gemini API";
    return NextResponse.json(
      { error: "Falha ao gerar feedback do Sensei.", details: errorMessage },
      { status: 500 }
    );
  }
}
