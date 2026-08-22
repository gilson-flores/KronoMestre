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
      statusAction = "graded",
      essayAnswer = "",
      objectiveSummary = { total: 0, correct: 0 },
      customInstructions = "",
      feedbackType = "ninja",
    } = body;

    const isReturned = statusAction === "returned";
    const isSerious = feedbackType === "serious";

    let prompt = "";

    if (isSerious) {
      prompt = `Você é o Professor de Sociologia do Ensino Médio: amigável, acolhedor, humano, incentivador e altamente pedagógico.
Sua missão é gerar um feedback positivo, claro, encorajador e construtivo (sem ser rígido, frio ou formal demais) para a atividade de Sociologia entregue pelo estudante.

DADOS DA ENTREGA:
- Nome do Estudante: ${studentName}
- Atividade / Avaliação: ${activityTitle}
- Situação da Avaliação: ${isReturned ? "Devolvendo para o aluno REFAZER e aprimorar" : "Atividade Concluída e Aprovada"}
- Nota atribuída: ${grade !== null ? `${grade}/10` : "Em análise"}
- Questões Objetivas: ${objectiveSummary.correct} de ${objectiveSummary.total} acertos
- Resposta Dissertativa enviada pelo estudante: "${essayAnswer || "Não houve resposta escrita dissertativa"}"
${customInstructions ? `- Instrução extra do Docente: ${customInstructions}` : ""}

DIRETRIZES DE ESTILO E CONTEÚDO (FEEDBACK DO PROFESSOR):
1. Mantenha um tom amigável, próximo, empático e estimulante. Fale de professor para aluno com carinho e entusiasmo pelo aprendizado.
2. Destaque o esforço e a reflexão crítica de forma leve e motivadora, evitando termos burocráticos ou excessivamente sisudos.
3. ${
        isReturned
          ? "Como a atividade foi devolvida para refazer, oriente com empatia e clareza os pontos que o estudante pode enriquecer em suas ideias antes de reenviar."
          : "Como a atividade foi aprovada, parabenize a dedicação e valorize o bom raciocínio demonstrado com alegria e incentivo."
      }
4. REGRA OBRIGATÓRIA DE TAMANHO: O feedback gerado DEVE ter no MÁXIMO 400 caracteres no total (incluindo espaços e pontuação). Seja direto, caloroso e conciso.
5. Responda estritamente em Português do Brasil com linguagem acessível ao jovem do Ensino Médio.`;
    } else {
      prompt = `Você é o Sensei de Sociologia da Vila da Folha (universo de Naruto Shippuden, combinando sabedoria pedagógica, acolhimento e humor de mestres como Kakashi e Jiraiya Sensei).
Sua missão é gerar um feedback pedagógico ninja, motivador e instrutivo para a atividade de Sociologia entregue pelo aluno.

DADOS DA ENTREGA:
- Aluno Shinobi: ${studentName}
- Missão / Atividade: ${activityTitle}
- Situação da Avaliação: ${isReturned ? "Devolvendo para o aluno REFAZER e aprimorar" : "Atividade Concluída e Aprovada"}
- Nota atribuída: ${grade !== null ? `${grade}/10` : "Em análise"}
- Questões Objetivas: ${objectiveSummary.correct} de ${objectiveSummary.total} acertos
- Resposta Dissertativa enviada pelo aluno: "${essayAnswer || "Não houve resposta escrita dissertativa"}"
${customInstructions ? `- Instrução extra do Professor: ${customInstructions}` : ""}

DIRETRIZES DE ESTILO E CONTEÚDO (FEEDBACK NINJA):
1. Mantenha o tom de um Sensei sábio e encorajador da Vila da Folha.
2. Integre termos de Naruto (Chakra, Vontade do Fogo, Jutsu, Treino, Ichiraku, Pergaminhos) com conceitos sociológicos de forma divertida e pedagógica.
3. ${
        isReturned
          ? "Como a atividade está sendo DEVOLVIDA para refazer, aponte com gentileza e clareza onde o aluno precisa focar seu chakra para lapidar o raciocínio sociológico antes de reenviar."
          : "Como a atividade foi APROVADA, elogie a dedicação, a reflexão crítica e a força da Vontade do Fogo demonstradas na resposta."
      }
4. REGRA OBRIGATÓRIA DE TAMANHO: O feedback gerado DEVE ter no MÁXIMO 400 caracteres no total (incluindo espaços e emojis como 🍃, ⚡, 📜). Seja extremamente conciso, direto e dinâmico.
5. Responda estritamente em Português do Brasil.`;
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

    const generatedFeedback = (
      response.text ||
      (isSerious
        ? "Excelente desempenho e dedicação na atividade! Continue aprofundando suas leituras e reflexões críticas."
        : "Sensei: Excelente esforço na missão! Continue concentrando seu chakra nos estudos de Sociologia. Dattebayo!")
    ).trim().slice(0, 400);

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
