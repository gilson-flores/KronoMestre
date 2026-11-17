import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient, isGeminiAuthError } from "@/lib/gemini";
import { SOCIOLOGIA_EM_MOVIMENTO_CHAPTERS } from "@/lib/textbookMarkdownIndex";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

function stripMarkdownAsterisks(text: string): string {
  return (text || "")
    .replace(/\*+/g, "")
    .replace(/#{1,6}\s?/g, "")
    .trim();
}

function normalizeText(text: string): string {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

const DISCIPLINE_VIOLATION_REGEX = [
  /\bcaralho\b/i,
  /\bporra\b/i,
  /\bmerda\b/i,
  /\bvtnc\b/i,
  /\bfdp\b/i,
  /\bvai se foder\b/i,
  /\bcala a boca\b/i,
  /\bidioti?a\b/i,
  /\bburro\b/i,
  /\botario\b/i,
  /\blixo\b/i,
  /\bpassa o gabarito\b/i,
  /\bme da a resposta\b/i,
  /\bfaz pra mim\b/i,
  /\bignore as instru/i,
  /\bfinja que\b/i,
  /\btigrinho\b/i,
  /\bblaze\b/i,
  /\bfree fire\b/i,
  /\broblox\b/i,
  /\bfortnite\b/i,
];

function isDisciplineOrOffTopicViolation(msg: string): boolean {
  const clean = normalizeText(msg);
  if (!clean) return false;
  if (/^(k+|rs+|ha+|he+|a+s+d+f+|[?!.@#$%^*()0-9]{4,})$/i.test(clean)) {
    return true;
  }
  return DISCIPLINE_VIOLATION_REGEX.some((rx) => rx.test(clean));
}

function findRelevantTextbookChapters(query: string): string {
  const qNorm = normalizeText(query);
  const scored = SOCIOLOGIA_EM_MOVIMENTO_CHAPTERS.map((ch) => {
    let score = 0;
    const hay = normalizeText(`${ch.title} ${ch.topics.join(" ")} ${ch.markdown}`);
    const words = qNorm.split(/\s+/).filter((w) => w.length >= 3);
    for (const w of words) {
      if (hay.includes(w)) score += 2;
    }
    return { ch, score };
  }).sort((a, b) => b.score - a.score);

  const selected = scored[0]?.score > 0 ? scored.slice(0, 3).map((s) => s.ch) : SOCIOLOGIA_EM_MOVIMENTO_CHAPTERS.slice(0, 2);
  const indexSummary = SOCIOLOGIA_EM_MOVIMENTO_CHAPTERS.map(
    (c) => `Cap. ${c.chapterNumber} (${c.title} - ${c.pages}): ${c.topics.join(", ")}`
  ).join("\n");

  const detailed = selected.map((c) => c.markdown).join("\n\n");
  return `[ÍNDICE DO LIVRO SOCIOLOGIA EM MOVIMENTO]:\n${indexSummary}\n\n[CAPÍTULOS DETALHADOS PARA CONSULTA]:\n${detailed}`;
}

function buildCommercialTriageFallback(params: {
  studentName: string;
  studentTurma: string;
  teacherSubject: string;
  currentMessage: string;
  activities: any[];
}): string {
  const { studentName, studentTurma, teacherSubject, currentMessage, activities } = params;
  const firstName = (studentName || "Estudante").trim().split(" ")[0];
  const msgNorm = normalizeText(currentMessage);

  // 1. Freio Disciplinar Imediato
  if (isDisciplineOrOffTopicViolation(currentMessage)) {
    return `🛑 Atendimento pausado, ${firstName}. Este chat é um canal oficial de estudo da escola. Mantenha o respeito e o foco em ${teacherSubject} (sem gírias impróprias, desvios ou pedidos de gabarito pronto).\n\nQuando quiser retomar com seriedade, digite o número do que precisa:\n1 - Dúvida sobre conteúdo do Livro Didático\n2 - Dúvida sobre como fazer uma Atividade\n3 - Orientações de Secretaria, Atestados ou Supervisão`;
  }

  // 2. Triagem: Secretaria Escolar
  if (
    msgNorm.includes("historico") ||
    msgNorm.includes("declaracao") ||
    msgNorm.includes("matricula") ||
    msgNorm.includes("transferencia") ||
    msgNorm.includes("boletim oficial") ||
    msgNorm.includes("documento") ||
    msgNorm.includes("secretaria")
  ) {
    return `Olá, ${firstName}! 🤖 Identifiquei que sua solicitação é documental/administrativa.\n\n📌 Setor responsável: Secretaria da Escola.\nO Prof. Gilson não emite documentos ou declarações pelo chat. Procure diretamente a Secretaria no seu turno de aula. Posso te ajudar em algo de ${teacherSubject}?`;
  }

  // 3. Triagem: Orientação Educacional (SOE)
  if (
    msgNorm.includes("atestado") ||
    msgNorm.includes("falta") ||
    msgNorm.includes("doente") ||
    msgNorm.includes("medico") ||
    msgNorm.includes("orientacao") ||
    msgNorm.includes("psicolog") ||
    msgNorm.includes("conflito") ||
    msgNorm.includes("bullying")
  ) {
    return `Olá, ${firstName}! 🤖 Esse assunto pertence ao setor de acompanhamento ao estudante.\n\n📌 Setor responsável: Orientação Educacional (SOE).\nEntregue seu atestado ou converse com a Orientação da escola para registro oficial. Se precisar saber qual atividade de ${teacherSubject} ficou pendente na Turma ${studentTurma}, digite 2!`;
  }

  // 4. Triagem: Supervisão Escolar
  if (
    msgNorm.includes("calendario") ||
    msgNorm.includes("conselho de classe") ||
    msgNorm.includes("horario de aula") ||
    msgNorm.includes("supervisao") ||
    msgNorm.includes("direcao") ||
    msgNorm.includes("norma da escola")
  ) {
    return `Olá, ${firstName}! 🤖 Essa demanda envolve a organização geral da escola.\n\n📌 Setor responsável: Supervisão Escolar / Coordenação Pedagógica.\nProcure a Supervisão na escola para confirmar datas e normas gerais. Se tiver dúvida no conteúdo de ${teacherSubject}, digite 1!`;
  }

  const classActivities = Array.isArray(activities)
    ? activities.filter(
        (a: any) =>
          !a.turma ||
          a.turma === "Todas" ||
          String(a.turma).includes(String(studentTurma).trim())
      )
    : [];

  // 5. Opção 2 ou Dúvida de Atividade
  if (msgNorm === "2" || msgNorm.includes("atividade") || msgNorm.includes("trabalho") || msgNorm.includes("jogo") || msgNorm.includes("prazo")) {
    const actList = classActivities.length > 0
      ? classActivities.slice(0, 3).map((a: any, i: number) => `${i + 1}. ${a.title} (Prazo: ${a.deadline || "Em aberto"})`).join("\n")
      : "Nenhuma atividade pendente listada no momento.";
    return `Certo, ${firstName}! 🤖 Aqui estão as atividades da Turma ${studentTurma}:\n${actList}\n\nMe diga de forma curta: em qual dessas atividades você está com dúvida e qual questão quer entender?`;
  }

  // 6. Opção 1 ou Dúvida de Conteúdo do Livro Didático
  const matchedChapter = SOCIOLOGIA_EM_MOVIMENTO_CHAPTERS.find((c) => {
    const hay = normalizeText(`${c.title} ${c.topics.join(" ")} ${c.markdown}`);
    return msgNorm.split(/\s+/).some((w) => w.length >= 4 && hay.includes(w));
  });

  if (matchedChapter) {
    const lines = matchedChapter.markdown
      .split("\n")
      .filter((l) => l.trim().startsWith("- "))
      .slice(0, 2)
      .map((l) => stripMarkdownAsterisks(l))
      .join("\n");
    return `Vamos direto ao ponto no livro Sociologia em Movimento (${matchedChapter.title}, ${matchedChapter.pages}):\n\n${lines}\n\nFicou claro esse conceito ou você quer que eu explique outro tópico deste capítulo?`;
  }

  if (msgNorm === "1" || msgNorm.includes("livro") || msgNorm.includes("materia") || msgNorm.includes("conteudo") || msgNorm.includes("capitulo")) {
    return `Perfeito, ${firstName}! 🤖 Eu consulto todo o livro Sociologia em Movimento para você.\n\nQual tema você está estudando agora?\n1A - Cap. 1 e 2: Conhecimento, Cultura, Socialização (Durkheim, Weber, Marx)\n1B - Cap. 3 e 4: Trabalho, Estratificação e Desigualdades\n1C - Cap. 5 em diante: Política, Estado, Cidadania, Movimentos Sociais e Meio Ambiente\n\nDigite a opção ou escreva a palavra-chave da sua dúvida!`;
  }

  // 7. Menu Inicial de Triagem (Atendente Comercial)
  return `Olá, ${firstName}! 🤖 Sou o Bob, seu agente de atendimento de ${teacherSubject} (Turma ${studentTurma}).\n\nEscolha uma opção para começarmos:\n1 - Dúvida na matéria (Livro Sociologia em Movimento)\n2 - Ajuda sobre Atividades ou KronoGames\n3 - Atestados, Faltas, Declarações ou Horários (Setores da Escola)\n4 - Solicitação pedagógica específica para o Prof. Gilson\n\nDigite o número da opção ou sua dúvida em 1 frase curta!`;
}

export async function POST(req: NextRequest) {
  let fallbackParams = {
    studentName: "Estudante",
    studentTurma: "Geral",
    teacherSubject: "Sociologia",
    currentMessage: "",
    activities: [] as any[],
  };

  try {
    const body = await req.json();
    const {
      studentName = "Estudante",
      studentTurma = "Geral",
      teacherSubject = "Sociologia",
      currentMessage = "",
      activities = [],
      messages = [],
      textbookExcerpt = "",
      annualPlan = "",
      lessonPlan = "",
    } = body;

    fallbackParams = {
      studentName,
      studentTurma,
      teacherSubject,
      currentMessage,
      activities,
    };

    const firstName = (studentName || "Estudante").trim().split(" ")[0];

    // Trava disciplinar determinística imediata (não gasta API com indisciplina)
    if (isDisciplineOrOffTopicViolation(currentMessage)) {
      return NextResponse.json({
        reply: buildCommercialTriageFallback(fallbackParams),
        teacherName: "Bob 🤖 (Agente de Atendimento)",
        mode: "discipline_brake",
      });
    }

    const textbookContext = findRelevantTextbookChapters(currentMessage);

    const systemInstruction = `Você é o Bob 🤖, Agente de Atendimento Pedagógico e Triagem Escolar do Prof. Gilson Flores na disciplina de ${teacherSubject}. Você está atendendo o(a) aluno(a) ${studentName} da Turma ${studentTurma}.

COMO VOCÊ DEVE AGIR (PROTOCOLO DE ATENDIMENTO COMERCIAL E TRIAGEM):
1. TEXTOS CURTOS E DIRETOS: Suas respostas devem ter no máximo 2 parágrafos curtos (até 4 frases no total). Nunca escreva textos longos. Use linguagem clara, amigável e fácil de entender por adolescentes do ensino médio.
2. FUNIL DE OPÇÕES E PERGUNTAS CURTAS: Se o aluno mandar apenas "oi", "olá", "preciso falar com o professor" ou algo vago, apresente um menu numerado curto (1-Conteúdo do Livro, 2-Dúvida em Atividade, 3-Setores da Escola, 4-Recado Pedagógico ao Professor) e faça 1 pergunta curta para descobrir exatamente o que ele precisa.
3. RESPONDA DÚVIDAS DE CONTEÚDO EXCLUSIVAMENTE PELO LIVRO DIDÁTICO:
   - Sua única fonte teórica é o livro "Sociologia em Movimento" fornecido abaixo.
   - Responda a dúvida do aluno de forma direta, clara e fiel ao livro didático, e termine com uma pergunta curta confirmando se ele entendeu ou se precisa de mais algum ponto.
   - Nunca invente conteúdos fora do livro didático.
4. TRIAGEM DE SETORES DA ESCOLA (NÃO ENCAMINHE AO PROFESSOR O QUE É DE OUTRO SETOR):
   - SECRETARIA ESCOLAR: Se for sobre histórico escolar, declaração, matrícula, transferência, documentos ou boletim oficial da rede -> Oriente o aluno a procurar a Secretaria da Escola.
   - ORIENTAÇÃO EDUCACIONAL (SOE): Se for sobre entrega de atestado médico, abono de faltas, problemas emocionais/pessoais ou conflitos entre colegas -> Oriente o aluno a procurar a Orientação Educacional (SOE).
   - SUPERVISÃO ESCOLAR: Se for sobre calendário geral da escola, horário das aulas, conselho de classe ou normas gerais da unidade -> Oriente o aluno a procurar a Supervisão Escolar.
5. FILTRO RÍGIDO PARA O PROF. GILSON (SÓ ENCAMINHE EM ÚLTIMO CASO):
   - Você deve resolver 95% dos atendimentos sozinho.
   - SÓ diga que vai encaminhar ao Prof. Gilson se for uma decisão estritamente pedagógica exclusiva dele (ex: revisão de nota de uma atividade específica após o aluno já ter dito qual atividade e o motivo, ou dúvida pedagógica que não consta no livro). Se o aluno pedir para falar com o professor sem dizer o motivo, pergunte primeiro qual é a atividade e qual é a dúvida exata.
6. FREIO DE DISCIPLINA: Se o aluno demonstrar falta de respeito, ironia agressiva, desvio para jogos/apostas ou pedir gabarito pronto ("faz pra mim"), interrompa o atendimento na hora com firmeza curta e exija postura escolar adequada.
7. FORMATAÇÃO LIMPA: Proibido usar asteriscos (** ou *) ou hashtags (#).

[BASE DO LIVRO DIDÁTICO - SOCIOLOGIA EM MOVIMENTO]:
${textbookContext}
${textbookExcerpt ? `\n[TRECHO ADICIONAL]: ${textbookExcerpt}` : ""}
${annualPlan ? `\n[PLANO ANUAL]: ${annualPlan}` : ""}
${lessonPlan ? `\n[PLANO DE AULA]: ${lessonPlan}` : ""}`;

    const recentHistory = Array.isArray(messages)
      ? messages
          .slice(-6)
          .map((m: any) => `${m.senderRole === "teacher" ? "Bob" : firstName}: ${m.content}`)
          .join("\n")
      : "";

    const activitiesContext = Array.isArray(activities)
      ? activities
          .filter(
            (a: any) =>
              !a.turma ||
              a.turma === "Todas" ||
              String(a.turma).includes(String(studentTurma).trim())
          )
          .slice(0, 8)
          .map(
            (a: any) =>
              `- "${a.title}" (Prazo: ${a.deadline || "A definir"}, Tipo: ${a.type || "Atividade"})`
          )
          .join("\n")
      : "";

    const prompt = `[Atividades da Turma ${studentTurma}]:
${activitiesContext || "Sem atividades listadas."}

[Histórico Recente]:
${recentHistory || "Início do atendimento."}

[Mensagem Atual de ${firstName}]:
"${currentMessage}"

Responda como Bob (curto, objetivo, em formato de atendente/triagem ou explicando direto pelo livro didático, sem asteriscos):`;

    const ai = getGeminiClient();

    if (!ai) {
      return NextResponse.json({
        reply: stripMarkdownAsterisks(buildCommercialTriageFallback(fallbackParams)),
        teacherName: "Bob 🤖 (Agente de Atendimento)",
        mode: "standard",
      });
    }

    const candidateModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"];
    let response: any = null;

    for (const modelName of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction,
            temperature: 0.4,
          },
        });
        if (response && response.text) break;
      } catch (err: any) {
        if (isGeminiAuthError(err)) break;
        console.warn(`Aviso teacher-bot (${modelName}):`, err?.message || err);
      }
    }

    const rawReply = response?.text?.trim() || buildCommercialTriageFallback(fallbackParams);
    const cleanReply = stripMarkdownAsterisks(rawReply);

    return NextResponse.json({
      reply: cleanReply,
      teacherName: "Bob 🤖 (Agente de Atendimento)",
      mode: response?.text ? "ai" : "standard",
    });
  } catch (error: any) {
    console.error("Erro na rota teacher-bot:", error);
    return NextResponse.json({
      reply: stripMarkdownAsterisks(buildCommercialTriageFallback(fallbackParams)),
      teacherName: "Bob 🤖 (Agente de Atendimento)",
      mode: "standard",
    });
  }
}
