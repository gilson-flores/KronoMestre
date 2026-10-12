import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient, isGeminiAuthError } from "@/lib/gemini";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
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
      feedbackType = "creative",
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

    // Build immediate contextual pedagogical fallback
    let defaultFallback = "";
    if (isSerious) {
      if (evaluationFormat === 'objective_only') {
        defaultFallback = isReturned
          ? `Olá, ${studentName}! Revise com atenção os conceitos das questões objetivas em "${activityTitle}" para aprimorar seu gabarito antes de reenviar.`
          : `Parabéns pelo ótimo desempenho nas questões objetivas em "${activityTitle}", ${studentName}! Sua dedicação e assertividade nos conceitos sociológicos foram exemplares.`;
      } else if (evaluationFormat === 'essay_only') {
        defaultFallback = isReturned
          ? `Olá, ${studentName}! Releia sua resposta dissertativa em "${activityTitle}" e aprofunde seus argumentos com mais reflexão sociológica antes de reenviar.`
          : `Excelente reflexão e escrita dissertativa em "${activityTitle}", ${studentName}! Sua argumentação crítica demonstra grande maturidade nos estudos sociológicos.`;
      } else {
        defaultFallback = isReturned
          ? `Olá, ${studentName}! Revise as questões objetivas e aprofunde sua resposta dissertativa em "${activityTitle}" para enriquecer a atividade antes de reenviar.`
          : `Parabéns pelo ótimo desempenho integral em "${activityTitle}", ${studentName}! Excelente equilíbrio entre as questões objetivas e a reflexão dissertativa.`;
      }
    } else {
      if (evaluationFormat === 'objective_only') {
        defaultFallback = isReturned
          ? `Professor: Quase lá, ${studentName}! Concentre-se para revisar as alternativas de "${activityTitle}" e gabaritar as questões objetivas. 📚`
          : `Professor: Excelente precisão nas questões objetivas de "${activityTitle}", ${studentName}! Sua compreensão com os conceitos de Sociologia foi certeira. ✨`;
      } else if (evaluationFormat === 'essay_only') {
        defaultFallback = isReturned
          ? `Professor: Concentre-se na escrita, ${studentName}! Aprofunde seus argumentos sociológicos em "${activityTitle}" antes de reenviar a atividade. 📝`
          : `Professor: Que reflexão poderosa na sua resposta dissertativa de "${activityTitle}", ${studentName}! Sua capacidade crítica brilhou na argumentação sociológica. 💡`;
      } else {
        defaultFallback = isReturned
          ? `Professor: Atenção nas questões objetivas e aprofunde sua resposta dissertativa em "${activityTitle}" para reenviar a atividade com força total, ${studentName}! 📚📝`
          : `Professor: Atividade cumprida com maestria em "${activityTitle}", ${studentName}! Excelente domínio no gabarito e sabedoria na dissertação. Continue com esse foco! 🏆`;
      }
    }

    const ai = getGeminiClient();
    if (!ai) {
      // Return the contextual pedagogical feedback immediately without throwing
      return NextResponse.json({ feedback: defaultFallback.slice(0, 400) });
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
      let formatContextCreative = "";
      let formatSpecificRulesCreative = "";

      if (evaluationFormat === 'objective_only') {
        formatContextCreative = `
FORMATO DA TAREFA: TESTE 100% OBJETIVO (Múltipla Escolha / Gabarito)
- Total de Questões Objetivas: ${objectiveSummary.total}
- Acertos no Gabarito: ${objectiveSummary.correct} de ${objectiveSummary.total} acertos
- Nota da Tarefa: ${grade !== null ? `${grade}/${maxGrade}` : "Em análise"}
- ATENÇÃO: NÃO HÁ QUESTÕES DISSERTATIVAS nesta tarefa.`;

        formatSpecificRulesCreative = `
DIRETRIZES ESPECÍFICAS PARA TAREFA 100% OBJETIVA:
- Foque EXCLUSIVAMENTE nos acertos das questões objetivas, na precisão do gabarito e no domínio dos conceitos sociológicos.
- REGRA CRÍTICA E ABSOLUTA: É ESTRITAMENTE PROIBIDO falar de questões dissertativas, redação ou escrita de texto. A tarefa foi apenas de múltipla escolha.
- ${
          isReturned
            ? "Como a tarefa está sendo DEVOLVIDA para refazer, oriente a revisar as alternativas e focar para gabaritar as questões objetivas."
            : "Como a tarefa foi APROVADA, elogie a precisão nas questões objetivas."
        }`;
      } else if (evaluationFormat === 'essay_only') {
        formatContextCreative = `
FORMATO DA TAREFA: TAREFA 100% DISSERTATIVA (Escrita / Reflexão Crítica)
- Resposta Dissertativa enviada pelo estudante: "${essayAnswer || "Não enviada"}"
- Nota da Tarefa: ${grade !== null ? `${grade}/${maxGrade}` : "Em análise"}
- ATENÇÃO: NÃO HÁ QUESTÕES OBJETIVAS (múltipla escolha) nesta tarefa.`;

        formatSpecificRulesCreative = `
DIRETRIZES ESPECÍFICAS PARA TAREFA 100% DISSERTATIVA:
- Foque EXCLUSIVAMENTE na escrita, na profundidade das ideias, na argumentação e na reflexão crítica sociológica.
- REGRA CRÍTICA E ABSOLUTA: É ESTRITAMENTE PROIBIDO falar de alternativas de múltipla escolha ou acertos de gabarito.
- ${
          isReturned
            ? "Como a tarefa está sendo DEVOLVIDA para refazer, oriente a aprofundar os argumentos do texto antes de reenviar."
            : "Como a tarefa foi APROVADA, elogie a força da escrita, a reflexão crítica e a dedicação demonstrada na resposta."
        }`;
      } else {
        formatContextCreative = `
FORMATO DA TAREFA: TAREFA MESCLADA / MISTA (Questões Objetivas + Questão Dissertativa)
- Questões Objetivas: ${objectiveSummary.correct} de ${objectiveSummary.total} acertos
- Resposta Dissertativa enviada pelo estudante: "${essayAnswer || "Não enviada"}"
- Nota Total: ${grade !== null ? `${grade}/${maxGrade}` : "Em análise"}`;

        formatSpecificRulesCreative = `
DIRETRIZES ESPECÍFICAS PARA TAREFA MESCLADA:
- Avalie o conjunto: comente a precisão nas questões objetivas e o poder da escrita na questão dissertativa.
- ${
          isReturned
            ? "Como a tarefa foi devolvida para refazer, oriente onde melhorar tanto nas questões objetivas quanto no aprofundamento dissertativo."
            : "Como a tarefa foi aprovada, elogie o equilíbrio entre a precisão no gabarito e a sabedoria na resposta dissertativa."
        }`;
      }

      prompt = `Você é um Professor de Sociologia inspirador, carismático e entusiasmado.
Sua missão é gerar um feedback pedagógico animado, criativo e motivador para a atividade de Sociologia entregue pelo aluno. Use uma linguagem mais descontraída, lúdica e engajadora para cativar o aluno, mas mantendo a utilidade pedagógica.

DADOS DA ENTREGA:
- Aluno: ${studentName}
- Tarefa / Atividade: ${activityTitle}
- Situação da Avaliação: ${isReturned ? "Devolvendo para o aluno REFAZER e aprimorar" : "Atividade Concluída e Aprovada"}
${formatContextCreative}
${customInstructions ? `- Instrução extra do Professor: ${customInstructions}` : ""}

DIRETRIZES DE ESTILO E CONTEÚDO (FEEDBACK GAMIFICADO/DESCONTRAÍDO):
1. Mantenha o tom de um mentor sábio, entusiasmado e acolhedor.
2. Use analogias lúdicas, elogiando o "nível", "poder analítico" e "sabedoria" do aluno, de forma criativa.
${formatSpecificRulesCreative}
3. REGRA OBRIGATÓRIA DE TAMANHO: O feedback gerado DEVE ter no MÁXIMO 400 caracteres no total (incluindo espaços e emojis). Seja conciso, direto e dinâmico.
4. Responda estritamente em Português do Brasil.`;
    }

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
        });
        if (response && response.text) {
          break;
        }
      } catch (err: any) {
        if (isGeminiAuthError(err)) {
          // Erro de credenciais/autenticação: encerra imediatamente as tentativas e recorre ao feedback pedagógico seguro
          break;
        }
        console.warn(`Tentativa com modelo ${modelName} no feedback:`, err?.message || err);
      }
    }

    const generatedFeedback = (response?.text || defaultFallback).trim().slice(0, 400);
    return NextResponse.json({ feedback: generatedFeedback });
  } catch (error: any) {
    console.error("Erro ao gerar feedback com Gemini, aplicando resposta pedagógica de segurança:", error);
    return NextResponse.json({
      feedback: "Excelente dedicação e esforço demonstrados nesta atividade! Continue com foco nos estudos de Sociologia.",
    });
  }
}

