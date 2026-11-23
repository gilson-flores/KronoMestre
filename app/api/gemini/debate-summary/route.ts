import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient, isGeminiAuthError, generateContentWithFallback } from '@/lib/gemini';
import { DebateGuidingQuestion } from "@/lib/types";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

interface SummaryRequestPayload {
  title: string;
  topic: string;
  turma?: string;
  subject?: string;
  supportMaterial?: string;
  proQuestions: DebateGuidingQuestion[];
  contraQuestions: DebateGuidingQuestion[];
  jurorQuestions?: DebateGuidingQuestion[];
  proAnswers: Record<string, string>;
  contraAnswers: Record<string, string>;
  jurorAnswers?: Record<string, string>;
}

function buildSynthesizedFromStudentAnswers(payload: SummaryRequestPayload) {
  const {
    title,
    topic,
    turma = "",
    proQuestions = [],
    contraQuestions = [],
    proAnswers = {},
    contraAnswers = {},
  } = payload;

  const cleanLabel = (title || topic || "Debate Sociológico").trim();
  const turmaTag = turma ? ` • TURMA ${turma}` : "";

  const proAnsweredItems = proQuestions.map((q, i) => {
    const ans = (proAnswers[q.id] || "").trim();
    return {
      index: i + 1,
      concept: q.sociologicalConcept || `Eixo ${i + 1}`,
      prompt: q.prompt,
      answer: ans,
    };
  });

  const contraAnsweredItems = contraQuestions.map((q, i) => {
    const ans = (contraAnswers[q.id] || "").trim();
    return {
      index: i + 1,
      concept: q.sociologicalConcept || `Eixo ${i + 1}`,
      prompt: q.prompt,
      answer: ans,
    };
  });

  const proFilledCount = proAnsweredItems.filter((x) => x.answer.length > 0).length;
  const contraFilledCount = contraAnsweredItems.filter((x) => x.answer.length > 0).length;

  const proSynthesisLines = proAnsweredItems
    .map((item) =>
      item.answer
        ? `• [Questão ${item.index} - ${item.concept}]: "${item.answer}"`
        : `• [Questão ${item.index} - ${item.concept}]: (Ainda não respondida pela bancada — completar no Passo 1)`
    )
    .join("\n");

  const contraSynthesisLines = contraAnsweredItems
    .map((item) =>
      item.answer
        ? `• [Questão ${item.index} - ${item.concept}]: "${item.answer}"`
        : `• [Questão ${item.index} - ${item.concept}]: (Ainda não respondida pela bancada — completar no Passo 1)`
    )
    .join("\n");

  const proSummary = `📘 SÍNTESE DAS RESPOSTAS DA BANCADA DOS GIRONDINOS (${cleanLabel.toUpperCase()}${turmaTag})
Respostas integradas: ${proFilledCount} de ${proQuestions.length || 6} questões.

1. ARGUMENTOS CONSTRUÍDOS PELA SUA BANCADA:
${proSynthesisLines}

2. COMO USAR SUAS RESPOSTAS NA EXPOSIÇÃO E RÉPLICA:
• Abertura (Exposição): Comecem apresentando os argumentos das Questões 1 e 2 acima, destacando os conceitos sociológicos pesquisados pelo grupo.
• Sustentação (Réplica): Usem os exemplos e dados que vocês anotaram nas Questões 3, 4 e 5 para rebater as críticas dos Jacobinos.
• Fechamento (Tréplica): Concluam com a tese final da Questão 6 demonstrando a consistência da posição girondina.`;

  const contraSummary = `📕 SÍNTESE DAS RESPOSTAS DA BANCADA DOS JACOBINOS (${cleanLabel.toUpperCase()}${turmaTag})
Respostas integradas: ${contraFilledCount} de ${contraQuestions.length || 6} questões.

1. ARGUMENTOS CRÍTICOS CONSTRUÍDOS PELA SUA BANCADA:
${contraSynthesisLines}

2. COMO USAR SUAS RESPOSTAS NA EXPOSIÇÃO E RÉPLICA:
• Abertura (Exposição): Iniciem expondo as contradições e relações de poder levantadas pelo grupo nas Questões 1 e 2.
• Contra-Ataque (Réplica): Confrontem a bancada adversária usando os problemas reais e exclusões que vocês registraram nas Questões 3, 4 e 5.
• Fechamento (Tréplica): Encerrem com a proposta de transformação estrutural que vocês formularam na Questão 6.`;

  // Construção das 6 Perguntas do Júri baseadas diretamente no que Girondinos e Jacobinos responderam
  const proFirstAns = proAnsweredItems.find((x) => x.answer)?.answer || "a defesa institucional apresentada pelo grupo";
  const proSecondAns = proAnsweredItems.slice(1).find((x) => x.answer)?.answer || "os benefícios sociais defendidos pela bancada";
  const contraFirstAns = contraAnsweredItems.find((x) => x.answer)?.answer || "as críticas estruturais levantadas pelo grupo";
  const contraSecondAns = contraAnsweredItems.slice(1).find((x) => x.answer)?.answer || "as desigualdades apontadas pela bancada";

  const jurorGuideSummary = `⚖️ PERGUNTAS DE SABATINA FORMULADAS PELA IA PARA O JÚRI (${cleanLabel.toUpperCase()}${turmaTag})
(Elaboradas a partir das respostas e resumos das Bancadas dos Girondinos e dos Jacobinos)

🏛️ PERGUNTAS DIRECIONADAS AOS GIRONDINOS (LADO PRÓ):
1. Confronto de Realidade: A bancada dos Girondinos sustentou em seu resumo que "${proFirstAns.slice(0, 140)}...". Como vocês respondem à crítica dos Jacobinos de que essa posição ignora as desigualdades materiais da população?
2. Comprovação Prática: Vocês destacaram que "${proSecondAns.slice(0, 140)}...". Que evidência histórica ou dado concreto comprova que esse modelo funciona para todas as classes sociais e não apenas para uma elite?
3. Limite Institucional: Se o modelo defendido pelos Girondinos encontrar resistência popular ou crise econômica, qual medida concreta a bancada propõe sem violar os direitos democráticos?

🔥 PERGUNTAS DIRECIONADAS AOS JACOBINOS (LADO CONTRA):
4. Viabilidade da Proposta: A bancada dos Jacobinos afirmou em seu resumo que "${contraFirstAns.slice(0, 140)}...". Como implementar essa ruptura ou transformação sem gerar instabilidade institucional ou autoritarismo?
5. Resposta ao Contraponto Girondino: Vocês apontaram que "${contraSecondAns.slice(0, 140)}...". Como a bancada jacobina rebate o argumento girondino de que reformas graduais protegem melhor a coesão social?
6. Critério Decisivo para amanhã: Qual garantia concreta os Jacobinos oferecem de que sua proposta resolverá o problema estrutural sem criar novas formas de exclusão?`;

  return {
    proSummary,
    contraSummary,
    jurorGuideSummary,
    proSummaryAI: proSummary,
    contraSummaryAI: contraSummary,
    jurorGuideAI: jurorGuideSummary,
  };
}

export async function POST(req: NextRequest) {
  let payload: SummaryRequestPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const localSynthesized = buildSynthesizedFromStudentAnswers(payload);
  const ai = getGeminiClient();
  if (!ai) {
    return NextResponse.json({ ...localSynthesized, isFallback: true });
  }

  try {
    let generatedText: string | null = null;

    const proCompiled = (payload.proQuestions || [])
      .map(
        (q, i) =>
          `Pergunta Girondinos ${i + 1} (${q.sociologicalConcept}): ${q.prompt}\nResposta Real Escrita pelos Alunos (Girondinos): ${
            (payload.proAnswers?.[q.id] || "").trim() || "(Em branco)"
          }`
      )
      .join("\n\n");

    const contraCompiled = (payload.contraQuestions || [])
      .map(
        (q, i) =>
          `Pergunta Jacobinos ${i + 1} (${q.sociologicalConcept}): ${q.prompt}\nResposta Real Escrita pelos Alunos (Jacobinos): ${
            (payload.contraAnswers?.[q.id] || "").trim() || "(Em branco)"
          }`
      )
      .join("\n\n");

    const prompt = `Você é o Professor Gilson Flores orientando um Debate Sem Papel de Sociologia no Ensino Médio (Turma ${payload.turma || "Ativa"}).
Título do Debate: "${payload.title}"
Tema / Contexto: "${payload.topic}"

Abaixo estão as RESPOSTAS REAIS escritas pelos estudantes das duas bancadas:

=== RESPOSTAS REAIS DA BANCADA DOS GIRONDINOS (PRÓ) ===
${proCompiled}

=== RESPOSTAS REAIS DA BANCADA DOS JACOBINOS (CONTRA) ===
${contraCompiled}

REGRAS OBRIGATÓRIAS:
1. NÃO escreva textos genéricos ou vagos! Sintetize FIELMENTE o que os alunos escreveram acima, citando e organizando os próprios argumentos deles em tópicos claros para leitura rápida durante o debate. Se alguma questão estiver em branco, aponte qual ponto o grupo ainda precisa complementar.
2. Em "proSummary": Crie o Resumo Elaborado da Bancada dos Girondinos sintetizando as respostas reais que eles deram nas 6 questões e orientando como usá-las na Exposição, Réplica e Tréplica.
3. Em "contraSummary": Crie o Resumo Elaborado da Bancada dos Jacobinos sintetizando as respostas reais que eles deram nas 6 questões e orientando como usá-las na Exposição, Réplica e Tréplica.
4. Em "jurorGuideSummary": O Júri NÃO deve receber um resumo comum! Formule 6 PERGUNTAS DIRETAS E INCISIVAS DE SABATINA (3 perguntas para o Júri fazer aos Girondinos e 3 perguntas para o Júri fazer aos Jacobinos) baseadas diretamente nos resumos e respostas que os dois grupos produziram acima, colocando os pontos de divergência frente a frente.

Retorne EXCLUSIVAMENTE um JSON válido com as chaves:
{
  "proSummary": "...",
  "contraSummary": "...",
  "jurorGuideSummary": "..."
}`;

    const { text: aiSummaryText } = await generateContentWithFallback(ai, {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        temperature: 0.5,
      },
      routeTag: "debate-summary",
      validateText: (txt) => {
        const cleaned = txt.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
        const parsed = JSON.parse(cleaned);
        return Boolean(parsed && typeof parsed === "object");
      },
    });
    generatedText = aiSummaryText;

    if (generatedText) {
      try {
        const cleaned = generatedText
          .replace(/^```json\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();
        const parsed = JSON.parse(cleaned);
        const proFinal = parsed.proSummary || parsed.proSummaryAI || localSynthesized.proSummary;
        const contraFinal = parsed.contraSummary || parsed.contraSummaryAI || localSynthesized.contraSummary;
        const jurorFinal = parsed.jurorGuideSummary || parsed.jurorGuideAI || localSynthesized.jurorGuideSummary;

        return NextResponse.json({
          proSummary: proFinal,
          contraSummary: contraFinal,
          jurorGuideSummary: jurorFinal,
          proSummaryAI: proFinal,
          contraSummaryAI: contraFinal,
          jurorGuideAI: jurorFinal,
          isFallback: false,
        });
      } catch {
        // fallback below
      }
    }

    return NextResponse.json({ ...localSynthesized, isFallback: true });
  } catch {
    return NextResponse.json({ ...localSynthesized, isFallback: true });
  }
}
