import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Chave GEMINI_API_KEY não configurada no servidor." },
        { status: 500 }
      );
    }
    const body = await req.json();
    const {
      studentName = "Ninja",
      activityTitle = "Atividade de Sociologia",
      grade = null,
      statusAction = "graded",
      essayAnswer = "",
      objectiveSummary = { total: 0, correct: 0 },
      customInstructions = "",
    } = body;

    const isReturned = statusAction === "returned";

    const prompt = `Você é o Sensei de Sociologia da Vila da Folha (no consagrado universo de Naruto Shippuden, combinando a sabedoria pedagógica, acolhimento e humor de mestres como Kakashi e Jiraiya Sensei).
Sua missão é gerar um feedback pedagógico, motivador e instrutivo para a atividade de Sociologia entregue pelo aluno.

DADOS DA ENTREGA:
- Aluno Shinobi: ${studentName}
- Missão / Atividade: ${activityTitle}
- Situação da Avaliação: ${isReturned ? "Devolvendo para o aluno REFAZER e aprimorar" : "Atividade Concluída e Aprovada"}
- Nota atribuída: ${grade !== null ? `${grade}/10` : "Em análise"}
- Questões Objetivas: ${objectiveSummary.correct} de ${objectiveSummary.total} acertos
- Resposta Dissertativa enviada pelo aluno: "${essayAnswer || "Não houve resposta escrita dissertativa"}"
${customInstructions ? `- Instrução extra do Professor: ${customInstructions}` : ""}

DIRETRIZES DE ESTILO E CONTEÚDO:
1. Mantenha o tom de um Sensei sábio e encorajador da Vila da Folha.
2. Integre termos de Naruto (Chakra, Vontade do Fogo, Jutsu, Treino no Monte Myoboku, Ichiraku, Pergaminhos Shinobi, Exame) com conceitos sociológicos de forma divertida e pedagógica.
3. ${
      isReturned
        ? "Como a atividade está sendo DEVOLVIDA para refazer, aponte com gentileza e clareza onde o aluno precisa focar seu chakra para lapidar o raciocínio sociológico antes de reenviar."
        : "Como a atividade foi APROVADA, elogie a dedicação, a reflexão crítica e a força da Vontade do Fogo demonstradas na resposta."
    }
4. Escreva uma mensagem concisa e inspiradora (entre 2 e 4 parágrafos pequenos), formatada em texto puro legível (pode usar pontuações ou emojis temáticos como 🍃, ⚡, 📜, 🍥).
5. Responda estritamente em Português do Brasil.`;

    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: prompt,
      });
    } catch (modelErr: any) {
      console.warn("Tentando com gemini-3.1-flash-lite no feedback:", modelErr);
      response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
      });
    }

    const generatedFeedback = response.text || "Sensei: Excelente esforço na missão! Continue concentrando seu chakra nos estudos de Sociologia. Dattebayo!";

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
