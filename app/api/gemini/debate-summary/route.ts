import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient, isGeminiAuthError } from "@/lib/gemini";
import { DebateGuidingQuestion } from "@/lib/types";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

interface SummaryRequestPayload {
  title: string;
  topic: string;
  subject?: string;
  supportMaterial?: string;
  proQuestions: DebateGuidingQuestion[];
  contraQuestions: DebateGuidingQuestion[];
  proAnswers: Record<string, string>;
  contraAnswers: Record<string, string>;
}

function buildFallbackSummaries(payload: SummaryRequestPayload) {
  const { topic, proQuestions = [], contraQuestions = [], proAnswers = {}, contraAnswers = {} } = payload;

  const proPoints = proQuestions
    .map((q, i) => `• Eixo ${i + 1} (${q.sociologicalConcept}): ${proAnswers[q.id] || "Argumento em consolidação pela bancada."}`)
    .join("\n");

  const contraPoints = contraQuestions
    .map((q, i) => `• Eixo ${i + 1} (${q.sociologicalConcept}): ${contraAnswers[q.id] || "Contraponto em consolidação pela bancada."}`)
    .join("\n");

  return {
    proSummary: `📘 DOSSIÊ ESTRATÉGICO DA BANCADA PRÓ — "${topic}"\n\n1. TESE CENTRAL FAVORÁVEL:\nNossa bancada sustenta a importância e a validade sociológica do tema a partir das seguintes pesquisas realizadas pelo grupo:\n${proPoints}\n\n2. ROTEIRO PARA RÉPLICA E TRÉPLICA:\n• Apresentem os dados empíricos logo nos primeiros minutos do Timer.\n• Conectem os argumentos aos conceitos sociológicos estudados e mostrem como as críticas adversárias não invalidam os avanços sociais demonstrados.`,
    contraSummary: `📕 DOSSIÊ ESTRATÉGICO DA BANCADA CONTRA — "${topic}"\n\n1. TESE CENTRAL CRÍTICA / OPOSIÇÃO:\nNossa bancada problematiza as contradições estruturais, limites práticos e relações de poder envolvidas no tema com base na pesquisa do grupo:\n${contraPoints}\n\n2. ROTEIRO PARA RÉPLICA E TRÉPLICA:\n• Questionem a distância entre o discurso formal e a realidade concreta brasileira.\n• Exijam evidências práticas da Bancada Pró durante a fase de réplica controlada pelo Timer.`,
    jurorGuideSummary: `⚖️ GUIA DE JULGAMENTO DOS 3 JURADOS — "${topic}"\n\n1. O QUE AVALIAR NA BANCADA PRÓ:\nVerifiquem se o grupo fundamentou a defesa usando os conceitos de ${proQuestions.map((q) => q.sociologicalConcept).join(", ")} com dados reais.\n\n2. O QUE AVALIAR NA BANCADA CONTRA:\nVerifiquem se o grupo apresentou problematizações sociológicas consistentes sobre ${contraQuestions.map((q) => q.sociologicalConcept).join(", ")} sem cair em senso comum.\n\n3. INSTRUÇÃO DE USO DOS 2 CHECKLISTS:\nMarquem "Cumpriu" ou "Não Cumpriu" nos 6 critérios para o Lado Pró e nos 6 critérios para o Lado Contra enquanto acompanham o Timer do Professor.`,
  };
}

export async function POST(req: NextRequest) {
  let payload: SummaryRequestPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return NextResponse.json({ ...buildFallbackSummaries(payload), isFallback: true });
  }

  try {
    const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"];
    let generatedText: string | null = null;

    const proCompiled = (payload.proQuestions || [])
      .map((q, i) => `Questão Pró ${i + 1} (${q.sociologicalConcept}): ${q.prompt}\nResposta pesquisada pelo Grupo Pró: ${payload.proAnswers?.[q.id] || "(Ainda não preenchida)"}`)
      .join("\n\n");

    const contraCompiled = (payload.contraQuestions || [])
      .map((q, i) => `Questão Contra ${i + 1} (${q.sociologicalConcept}): ${q.prompt}\nResposta pesquisada pelo Grupo Contra: ${payload.contraAnswers?.[q.id] || "(Ainda não preenchida)"}`)
      .join("\n\n");

    const prompt = `Você é um Professor Doutor em Sociologia orientando um Debate Sem Papel no Ensino Médio.
Tema do Debate: "${payload.topic}" (Título: "${payload.title}").
Roteiro do Professor: "${payload.supportMaterial || ""}"

Os estudantes concluíram a fase de pesquisa norteadora e enviaram as seguintes respostas:

=== PESQUISA DA BANCADA PRÓ ===
${proCompiled}

=== PESQUISA DA BANCADA CONTRA ===
${contraCompiled}

Sua tarefa é gerar 3 TEXTOS-RESUMO ESTRATÉGICOS E INDEPENDENTES (em português claro, bem estruturado em tópicos para leitura rápida no celular durante o debate):
1. "proSummary": Resumo exclusivo para todos os integrantes da BANCADA PRÓ lerem na aula do debate, organizando os melhores argumentos pesquisados por eles, exemplos sociológicos e como se defender na réplica/tréplica.
2. "contraSummary": Resumo exclusivo para todos os integrantes da BANCADA CONTRA lerem na aula do debate, organizando as críticas estruturais pesquisadas por eles, conceitos sociológicos e como contra-argumentar na réplica/tréplica.
3. "jurorGuideSummary": Resumo exclusivo para os 3 JURADOS saberem exatamente o que julgar em cada bancada, quais conceitos sociológicos observar e como preencher os 2 checklists (Pró e Contra).

Retorne EXCLUSIVAMENTE um JSON válido com as 3 chaves:
{
  "proSummary": "...",
  "contraSummary": "...",
  "jurorGuideSummary": "..."
}`;

    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: {
            responseMimeType: "application/json",
            temperature: 0.75,
          },
        });
        if (response && response.text) {
          generatedText = response.text;
          break;
        }
      } catch (err: any) {
        if (isGeminiAuthError(err)) break;
      }
    }

    if (generatedText) {
      try {
        const cleaned = generatedText.replace(/^\`\`\`json\s*/i, "").replace(/\s*\`\`\`$/i, "").trim();
        const parsed = JSON.parse(cleaned);
        const fb = buildFallbackSummaries(payload);
        return NextResponse.json({
          proSummary: parsed.proSummary || fb.proSummary,
          contraSummary: parsed.contraSummary || fb.contraSummary,
          jurorGuideSummary: parsed.jurorGuideSummary || fb.jurorGuideSummary,
          isFallback: false,
        });
      } catch {
        // fallback below
      }
    }

    return NextResponse.json({ ...buildFallbackSummaries(payload), isFallback: true });
  } catch {
    return NextResponse.json({ ...buildFallbackSummaries(payload), isFallback: true });
  }
}
