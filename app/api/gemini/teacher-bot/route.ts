import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient, isGeminiAuthError, generateContentWithFallback } from '@/lib/gemini';
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
  /\bidiota\b/i,
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

function isDisciplineViolation(msg: string): boolean {
  const clean = normalizeText(msg);
  if (!clean) return false;
  if (/^(k{4,}|rs{3,}|ha{4,}|a+s+d+f+|[?!.@#$%^*()]{4,})$/i.test(clean)) {
    return true;
  }
  return DISCIPLINE_VIOLATION_REGEX.some((rx) => rx.test(clean));
}

type ConversationPhase =
  | "MAIN_MENU"
  | "BOOK_LIST"
  | "BOOK_DETAIL"
  | "ACT_LIST"
  | "ACT_DETAIL"
  | "SECTOR_LIST"
  | "SECTOR_DETAIL"
  | "TEACHER_STEP1"
  | "TEACHER_STEP2"
  | "TEACHER_CONFIRMED";

function detectLastPhase(messages: any[], studentName: string): {
  phase: ConversationPhase;
  lastBobText: string;
} {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { phase: "MAIN_MENU", lastBobText: "" };
  }

  // Percorre de trás para frente buscando a última mensagem enviada pelo Bob / Professor
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (!m) continue;
    const isBobOrTeacher =
      m.senderRole === "teacher" ||
      String(m.senderName || "").toLowerCase().includes("bob");
    if (!isBobOrTeacher) continue;

    const txt = String(m.content || m.text || "");
    if (txt.includes("[Etapa 1/2 • Livro Didático]")) return { phase: "BOOK_LIST", lastBobText: txt };
    if (txt.includes("[Etapa 2/2 • Conteúdo do Livro]")) return { phase: "BOOK_DETAIL", lastBobText: txt };
    if (txt.includes("[Etapa 1/2 • Atividades da Turma]")) return { phase: "ACT_LIST", lastBobText: txt };
    if (txt.includes("[Etapa 2/2 • Guia da Atividade]")) return { phase: "ACT_DETAIL", lastBobText: txt };
    if (txt.includes("[Etapa 1/2 • Setores da Escola]")) return { phase: "SECTOR_LIST", lastBobText: txt };
    if (txt.includes("[Etapa 2/2 • Orientação de Setor]")) return { phase: "SECTOR_DETAIL", lastBobText: txt };
    if (txt.includes("[Etapa 1/3 • Falar com o Prof. Gilson]")) return { phase: "TEACHER_STEP1", lastBobText: txt };
    if (txt.includes("[Etapa 2/3 • Detalhar Solicitação ao Professor]")) return { phase: "TEACHER_STEP2", lastBobText: txt };
    if (txt.includes("[Etapa 3/3 • Solicitação Registrada]")) return { phase: "TEACHER_CONFIRMED", lastBobText: txt };
    if (txt.includes("[Menu Principal de Atendimento]")) return { phase: "MAIN_MENU", lastBobText: txt };
    break;
  }

  return { phase: "MAIN_MENU", lastBobText: "" };
}

function renderMainMenu(firstName: string, studentTurma: string, teacherSubject: string): string {
  return `[Menu Principal de Atendimento]
Olá, ${firstName}! Seja muito bem-vindo(a)! 🤖✨ Sou o Bob, seu assistente de ${teacherSubject} da Turma ${studentTurma}. É uma alegria ajudar você hoje!

Como posso cuidar do seu atendimento agora? Digite o número da opção desejada:
1 - Dúvidas da Matéria (Livro Sociologia em Movimento)
2 - Ajuda com Atividades e Jogos Avaliativos
3 - Outros Setores da Escola (Secretaria, Orientação ou Supervisão)
4 - Solicitação Pedagógica para o Prof. Gilson`;
}

function renderBookListMenu(firstName: string): string {
  return `[Etapa 1/2 • Livro Didático]
Que ótimo ver sua dedicação aos estudos, ${firstName}! 📚✨ Escolha qual bloco do nosso livro Sociologia em Movimento você quer consultar:

1 - Cap. 1 e 2: Conhecimento, Ciência, Cultura e Socialização (Durkheim, Weber e Marx)
2 - Cap. 3 e 4: Trabalho, Mais-Valia, Sistemas Produtivos e Desigualdades
3 - Cap. 5 e 6: Poder, Política, Estado, Democracia e Cidadania
4 - Cap. 7 e 8: Movimentos Sociais, Direitos Humanos, Gênero e Raça
5 - Cap. 9 a 12: Violência, Cidades, Meio Ambiente e Globalização

💬 Se preferir, pode escrever sua dúvida sobre a matéria diretamente!
0 - Voltar ao Menu Principal`;
}

function renderBookBlockDetail(firstName: string, blockOption: string): string {
  const blocks: Record<string, { title: string; summary: string }> = {
    "1": {
      title: "Capítulos 1 e 2 — Conhecimento, Cultura e Socialização",
      summary:
        "• Estranhamento e Desnaturalização: olhar para os fenômenos sociais entendendo que são construções históricas, e não fatos naturais.\n• Os 3 Clássicos: Durkheim analisa o Fato Social (exterior, coercitivo e geral); Weber analisa a Ação Social e seus sentidos; Marx analisa a Luta de Classes.\n• Cultura e Socialização: aprendemos regras na socialização primária (família) e secundária (escola/trabalho), combatendo o etnocentrismo através do relativismo cultural.",
    },
    "2": {
      title: "Capítulos 3 e 4 — Trabalho e Estratificação Social",
      summary:
        "• Trabalho nos Clássicos: em Marx, o capitalismo extrai a mais-valia (trabalho não pago); em Durkheim, a divisão do trabalho gera solidariedade orgânica; em Weber, a ética protestante impulsionou o espírito do capitalismo.\n• Modelos Produtivos: Taylorismo (controle de tempos), Fordismo (esteira em série) e Toyotismo (produção flexível e just-in-time).\n• Desigualdades: estratificação por classes, gênero e raça no Brasil.",
    },
    "3": {
      title: "Capítulos 5 e 6 — Poder, Política, Estado e Cidadania",
      summary:
        "• Formas de Poder (Norberto Bobbio): Poder Econômico (bens), Poder Ideológico (saber/mídia) e Poder Político (uso legítimo da força pelo Estado).\n• Dominação Legítima (Max Weber): Tradicional (costume), Carismática (líder) e Racional-Legal (leis e burocracia).\n• Cidadania (T. H. Marshall): conquista histórica dos Direitos Civis (liberdade), Políticos (voto) e Sociais (educação, saúde e trabalho).",
    },
    "4": {
      title: "Capítulos 7 e 8 — Movimentos Sociais, Direitos Humanos, Gênero e Raça",
      summary:
        "• Movimentos Sociais: ações coletivas organizadas que lutam por transformação ou ampliação de direitos (movimentos operários, negros, indígenas, feministas e ambientais).\n• Raça e Gênero: crítica ao mito da democracia racial (Florestan Fernandes) e análise das desigualdades salariais e da dupla jornada de trabalho.",
    },
    "5": {
      title: "Capítulos 9 a 12 — Violência, Espaço Urbano e Meio Ambiente",
      summary:
        "• Espaço Urbano: segregação socioespacial, gentrificação e direito à cidade (Henri Lefebvre).\n• Violência e Criminalidade: diferença entre violência estrutural, simbólica (Bourdieu) e institucional.\n• Sociedade e Meio Ambiente: crise ecológica, racismo ambiental, justiça climática e desenvolvimento sustentável.",
    },
  };

  const chosen = blocks[blockOption] || blocks["1"];
  return `[Etapa 2/2 • Conteúdo do Livro]
Aqui está o resumo direto do nosso livro (${chosen.title}), ${firstName}: 📖✨

${chosen.summary}

Qual desses conceitos você gostaria que eu explicasse com um exemplo fácil do dia a dia?
0 - Voltar à lista anterior (Capítulos do Livro)
9 - Voltar ao Menu Principal`;
}

function getStudentTurmaActivities(activities: any[], studentTurma: string): any[] {
  if (!Array.isArray(activities)) return [];
  return activities.filter(
    (a: any) =>
      !a.turma ||
      a.turma === "Todas" ||
      String(a.turma).includes(String(studentTurma).trim())
  );
}

function renderActivitiesListMenu(firstName: string, studentTurma: string, classActivities: any[]): string {
  const listText =
    classActivities.length > 0
      ? classActivities
          .slice(0, 5)
          .map(
            (a: any, idx: number) =>
              `${idx + 1} - ${a.title} (Prazo: ${a.deadline || a.dueDate || "Em aberto"})`
          )
          .join("\n")
      : "No momento não há atividades pendentes listadas para sua turma.";

  return `[Etapa 1/2 • Atividades da Turma]
Com todo prazer, ${firstName}! 🎯 Aqui estão as atividades disponíveis para a Turma ${studentTurma}:

${listText}

Digite o número da atividade (de 1 a ${Math.min(5, Math.max(1, classActivities.length))}) para ver a explicação detalhada, ou escreva sua dúvida!
0 - Voltar ao Menu Principal`;
}

function renderActivityDetail(firstName: string, act: any): string {
  return `[Etapa 2/2 • Guia da Atividade]
Perfeito, ${firstName}! Vamos ver os detalhes da atividade "${act.title}": 📝✨

• Tipo: ${act.type || "Atividade Avaliativa"}
• Prazo de Entrega: ${act.deadline || act.dueDate || "Em aberto"}
• Orientação: ${act.description || "Responda com atenção utilizando os conceitos estudados em Sociologia."}

Me conte em uma frase curta: qual questão ou conceito dessa atividade você quer que eu te ajude a compreender?
0 - Voltar à lista anterior (Atividades da Turma)
9 - Voltar ao Menu Principal`;
}

function renderSectorsListMenu(firstName: string): string {
  return `[Etapa 1/2 • Setores da Escola]
Claro, ${firstName}! 🏫 Para que você seja atendido com rapidez pelo setor correto da escola, escolha o que você precisa resolver:

1 - Secretaria Escolar (Histórico escolar, declaração de matrícula, transferência ou boletim oficial)
2 - Orientação Educacional - SOE (Entrega de atestado médico, justificativa de faltas ou apoio ao estudante)
3 - Supervisão Escolar (Calendário da escola, horários de aula, conselho de classe ou normas gerais)
4 - Minha questão é da disciplina de Sociologia (Ir para Solicitação ao Prof. Gilson)

0 - Voltar ao Menu Principal`;
}

function renderSectorDetail(firstName: string, sectorOption: string): string {
  if (sectorOption === "1") {
    return `[Etapa 2/2 • Orientação de Setor]
Fique tranquilo(a), ${firstName}! 🤝 Para emissão de declarações, histórico escolar, matrícula ou transferência:

📌 Setor Responsável: Secretaria da Escola.
👉 Como proceder: Compareça presencialmente à Secretaria no seu turno de aula (ou peça ao seu responsável, caso seja menor de idade) levando seu documento de identificação. O Prof. Gilson não tem acesso ao sistema de emissão de documentos da Secretaria.

0 - Voltar à lista anterior (Setores da Escola)
9 - Voltar ao Menu Principal`;
  }
  if (sectorOption === "2") {
    return `[Etapa 2/2 • Orientação de Setor]
Entendido, ${firstName}! 🤝 Para entrega de atestados médicos, justificativa de faltas ou acompanhamento pedagógico/emocional:

📌 Setor Responsável: Orientação Educacional (SOE).
👉 Como proceder: Entregue o atestado ou converse diretamente com a Orientação Educacional na escola. Assim que a Orientação validar o documento, todos os professores (incluindo o Prof. Gilson) recebem o comunicado oficial!

0 - Voltar à lista anterior (Setores da Escola)
9 - Voltar ao Menu Principal`;
  }
  return `[Etapa 2/2 • Orientação de Setor]
Perfeito, ${firstName}! 🤝 Para dúvidas sobre o calendário geral da unidade, horários das aulas, conselho de classe ou regimento escolar:

📌 Setor Responsável: Supervisão Escolar / Coordenação Pedagógica.
👉 Como proceder: Procure a sala da Supervisão Escolar no seu turno para receber a orientação oficial da coordenação.

0 - Voltar à lista anterior (Setores da Escola)
9 - Voltar ao Menu Principal`;
}

function renderTeacherStep1Menu(firstName: string): string {
  return `[Etapa 1/3 • Falar com o Prof. Gilson]
Com todo prazer, ${firstName}! 🤝 Vou organizar sua solicitação com todo cuidado para que o Prof. Gilson Flores possa te dar o respaldo necessário.

Escolha sobre qual assunto pedagógico você precisa do atendimento dele:
1 - Revisão de nota ou dúvida sobre correção de atividade
2 - Solicitação de prazo ou recuperação de atividade avaliativa
3 - Dúvida sobre formação de grupo ou Debate em sala
4 - Outro assunto pedagógico de Sociologia

0 - Voltar ao Menu Principal`;
}

function renderTeacherStep2Prompt(firstName: string, categoryOption: string): string {
  const labels: Record<string, string> = {
    "1": "Revisão de Nota / Correção de Atividade",
    "2": "Prazo / Recuperação de Atividade",
    "3": "Trabalho em Grupo / Debate em Sala",
    "4": "Assunto Pedagógico de Sociologia",
  };
  const chosenLabel = labels[categoryOption] || categoryOption || "Atendimento Pedagógico";

  return `[Etapa 2/3 • Detalhar Solicitação ao Professor]
Perfeito, ${firstName}! Já selecionei o motivo: ${chosenLabel}. 📝✨

Agora, para que o Prof. Gilson já te responda com a solução pronta na hora-atividade dele, escreva em uma frase curta:
👉 Qual é o nome da atividade (se houver) e como ele pode te ajudar exatamente?

0 - Voltar à lista anterior (Motivos de Solicitação)
9 - Voltar ao Menu Principal`;
}

function renderTeacherConfirmed(
  firstName: string,
  studentName: string,
  studentTurma: string,
  lastBobText: string,
  studentDetailText: string
): string {
  const motivo = (lastBobText.split("Já selecionei o motivo:")[1] || "").split(".")[0].trim() || "Solicitação Pedagógica de Sociologia";

  return `[Etapa 3/3 • Solicitação Registrada]
✅ Tudo certo, ${firstName}! Sua solicitação foi registrada com total respaldo! 🤝✨

📋 Resumo deixado para o Prof. Gilson Flores:
• Estudante: ${studentName} (Turma ${studentTurma})
• Categoria: ${motivo}
• Seu relato: "${studentDetailText.trim()}"

Fique tranquilo(a)! Esse protocolo já está salvo aqui na sua conversa e o Prof. Gilson responderá diretamente para você durante a hora-atividade dele.

0 - Voltar à lista anterior (Nova solicitação ao Professor)
9 - Voltar ao Menu Principal`;
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

  const selected =
    scored[0]?.score > 0
      ? scored.slice(0, 3).map((s) => s.ch)
      : SOCIOLOGIA_EM_MOVIMENTO_CHAPTERS.slice(0, 2);

  const indexSummary = SOCIOLOGIA_EM_MOVIMENTO_CHAPTERS.map(
    (c) => `Cap. ${c.chapterNumber} (${c.title} - ${c.pages}): ${c.topics.join(", ")}`
  ).join("\n");

  const detailed = selected.map((c) => c.markdown).join("\n\n");
  return `[ÍNDICE DO LIVRO SOCIOLOGIA EM MOVIMENTO]:\n${indexSummary}\n\n[CAPÍTULOS DETALHADOS]:\n${detailed}`;
}

export async function POST(req: NextRequest) {
  let studentName = "Estudante";
  let studentTurma = "Geral";
  let teacherSubject = "Sociologia";
  let currentMessage = "";
  let activities: any[] = [];
  let messages: any[] = [];

  try {
    const body = await req.json();
    studentName = body.studentName || "Estudante";
    studentTurma = body.studentTurma || "Geral";
    teacherSubject = body.teacherSubject || "Sociologia";
    currentMessage = String(body.currentMessage || "").trim();
    activities = Array.isArray(body.activities) ? body.activities : [];
    messages = Array.isArray(body.messages) ? body.messages : [];

    const firstName = (studentName || "Estudante").trim().split(" ")[0];
    const msgNorm = normalizeText(currentMessage);

    // 1. FREIO DE DISCIPLINA IMEDIATO
    if (isDisciplineViolation(currentMessage)) {
      return NextResponse.json({
        reply: `🛑 Atendimento pausado, ${firstName}. Este chat é um espaço oficial de estudo e acolhimento da escola. Precisamos manter o respeito mútuo e o foco em ${teacherSubject} (sem palavras impróprias, desvios ou pedidos de gabarito pronto).\n\nQuando quiser retomar com tranquilidade, digite:\n0 - Ir para o Menu Principal de Atendimento`,
        teacherName: "Bob 🤖 (Agente de Atendimento)",
        mode: "discipline_brake",
      });
    }

    // Remove a própria mensagem atual do final do histórico caso já venha anexada pelo frontend
    const historyWithoutCurrent =
      messages.length > 0 &&
      messages[messages.length - 1]?.senderRole === "student" &&
      String(messages[messages.length - 1]?.content || "").trim() === currentMessage
        ? messages.slice(0, -1)
        : messages;

    const { phase, lastBobText } = detectLastPhase(historyWithoutCurrent, studentName);
    const classActivities = getStudentTurmaActivities(activities, studentTurma);

    // 2. SAUDAÇÕES INICIAIS OU COMANDO DE MENU PRINCIPAL ("9", "menu", "inicio")
    const isGreetingOnly = /^(oi+|ola+|bom dia|boa tarde|boa noite|menu|inicio|ajuda|hey|opa)$/i.test(msgNorm);
    if (isGreetingOnly || msgNorm === "9" || msgNorm === "menu") {
      return NextResponse.json({
        reply: renderMainMenu(firstName, studentTurma, teacherSubject),
        teacherName: "Bob 🤖 (Agente de Atendimento)",
        mode: "tree",
      });
    }

    // 3. TRATAMENTO DO BOTÃO "0 - VOLTAR À LISTA ANTERIOR" (RETROCESSO INTELIGENTE DE FASE)
    if (msgNorm === "0" || msgNorm === "voltar") {
      if (phase === "BOOK_DETAIL") {
        return NextResponse.json({
          reply: renderBookListMenu(firstName),
          teacherName: "Bob 🤖 (Agente de Atendimento)",
          mode: "tree",
        });
      }
      if (phase === "ACT_DETAIL") {
        return NextResponse.json({
          reply: renderActivitiesListMenu(firstName, studentTurma, classActivities),
          teacherName: "Bob 🤖 (Agente de Atendimento)",
          mode: "tree",
        });
      }
      if (phase === "SECTOR_DETAIL") {
        return NextResponse.json({
          reply: renderSectorsListMenu(firstName),
          teacherName: "Bob 🤖 (Agente de Atendimento)",
          mode: "tree",
        });
      }
      if (phase === "TEACHER_STEP2" || phase === "TEACHER_CONFIRMED") {
        return NextResponse.json({
          reply: renderTeacherStep1Menu(firstName),
          teacherName: "Bob 🤖 (Agente de Atendimento)",
          mode: "tree",
        });
      }
      // Se estiver em qualquer lista de nível 1 (BOOK_LIST, ACT_LIST, SECTOR_LIST, TEACHER_STEP1) ou MAIN_MENU, volta para o Menu Principal
      return NextResponse.json({
        reply: renderMainMenu(firstName, studentTurma, teacherSubject),
        teacherName: "Bob 🤖 (Agente de Atendimento)",
        mode: "tree",
      });
    }

    // 4. NAVEGAÇÃO DETERMINÍSTICA POR FASE ATUAL DA ÁRVORE
    if (phase === "MAIN_MENU") {
      if (msgNorm === "1" || msgNorm.startsWith("1 ")) {
        return NextResponse.json({
          reply: renderBookListMenu(firstName),
          teacherName: "Bob 🤖 (Agente de Atendimento)",
          mode: "tree",
        });
      }
      if (msgNorm === "2" || msgNorm.startsWith("2 ")) {
        return NextResponse.json({
          reply: renderActivitiesListMenu(firstName, studentTurma, classActivities),
          teacherName: "Bob 🤖 (Agente de Atendimento)",
          mode: "tree",
        });
      }
      if (msgNorm === "3" || msgNorm.startsWith("3 ")) {
        return NextResponse.json({
          reply: renderSectorsListMenu(firstName),
          teacherName: "Bob 🤖 (Agente de Atendimento)",
          mode: "tree",
        });
      }
      if (msgNorm === "4" || msgNorm.startsWith("4 ")) {
        return NextResponse.json({
          reply: renderTeacherStep1Menu(firstName),
          teacherName: "Bob 🤖 (Agente de Atendimento)",
          mode: "tree",
        });
      }
    }

    if (phase === "BOOK_LIST") {
      if (["1", "2", "3", "4", "5"].includes(msgNorm)) {
        return NextResponse.json({
          reply: renderBookBlockDetail(firstName, msgNorm),
          teacherName: "Bob 🤖 (Agente de Atendimento)",
          mode: "tree",
        });
      }
    }

    if (phase === "ACT_LIST") {
      const idx = parseInt(msgNorm, 10);
      if (!isNaN(idx) && idx >= 1 && idx <= Math.min(5, classActivities.length)) {
        return NextResponse.json({
          reply: renderActivityDetail(firstName, classActivities[idx - 1]),
          teacherName: "Bob 🤖 (Agente de Atendimento)",
          mode: "tree",
        });
      }
    }

    if (phase === "SECTOR_LIST") {
      if (["1", "2", "3"].includes(msgNorm)) {
        return NextResponse.json({
          reply: renderSectorDetail(firstName, msgNorm),
          teacherName: "Bob 🤖 (Agente de Atendimento)",
          mode: "tree",
        });
      }
      if (msgNorm === "4") {
        return NextResponse.json({
          reply: renderTeacherStep1Menu(firstName),
          teacherName: "Bob 🤖 (Agente de Atendimento)",
          mode: "tree",
        });
      }
    }

    if (phase === "TEACHER_STEP1") {
      if (["1", "2", "3", "4"].includes(msgNorm)) {
        return NextResponse.json({
          reply: renderTeacherStep2Prompt(firstName, msgNorm),
          teacherName: "Bob 🤖 (Agente de Atendimento)",
          mode: "tree",
        });
      }
      // Se o aluno já escreveu direto o motivo por extenso no Passo 1, avança para o Passo 2 com o texto dele como categoria
      if (currentMessage.length >= 4) {
        return NextResponse.json({
          reply: renderTeacherStep2Prompt(firstName, currentMessage),
          teacherName: "Bob 🤖 (Agente de Atendimento)",
          mode: "tree",
        });
      }
    }

    if (phase === "TEACHER_STEP2") {
      // Qualquer relato digitado no Passo 2 registra o protocolo e dá o respaldo completo ao aluno!
      return NextResponse.json({
        reply: renderTeacherConfirmed(firstName, studentName, studentTurma, lastBobText, currentMessage),
        teacherName: "Bob 🤖 (Agente de Atendimento)",
        mode: "tree",
      });
    }

    // 5. DETECÇÃO AUTOMÁTICA DE DEMANDAS DE SETORES POR TEXTO LIVRE
    if (
      msgNorm.includes("historico") ||
      msgNorm.includes("declaracao") ||
      msgNorm.includes("matricula") ||
      msgNorm.includes("transferencia") ||
      msgNorm.includes("secretaria")
    ) {
      return NextResponse.json({
        reply: renderSectorDetail(firstName, "1"),
        teacherName: "Bob 🤖 (Agente de Atendimento)",
        mode: "tree",
      });
    }

    if (
      msgNorm.includes("atestado") ||
      msgNorm.includes("justificar falta") ||
      msgNorm.includes("orientacao") ||
      msgNorm.includes("psicolog")
    ) {
      return NextResponse.json({
        reply: renderSectorDetail(firstName, "2"),
        teacherName: "Bob 🤖 (Agente de Atendimento)",
        mode: "tree",
      });
    }

    if (
      msgNorm.includes("calendario escolar") ||
      msgNorm.includes("horario de aula") ||
      msgNorm.includes("conselho de classe") ||
      msgNorm.includes("supervisao")
    ) {
      return NextResponse.json({
        reply: renderSectorDetail(firstName, "3"),
        teacherName: "Bob 🤖 (Agente de Atendimento)",
        mode: "tree",
      });
    }

    // Se o aluno digitou um número isolado fora de contexto, mostra o menu principal com hospitalidade
    if (/^[1-8]$/.test(msgNorm)) {
      return NextResponse.json({
        reply: renderMainMenu(firstName, studentTurma, teacherSubject),
        teacherName: "Bob 🤖 (Agente de Atendimento)",
        mode: "tree",
      });
    }

    // 6. RESPOSTA A DÚVIDAS DE CONTEÚDO OU ATIVIDADES COM BASE NO LIVRO DIDÁTICO + IA HOSPITALEIRA
    const textbookContext = findRelevantTextbookChapters(currentMessage);
    const backFooter =
      phase === "ACT_DETAIL" || phase === "ACT_LIST"
        ? "\n\n0 - Voltar à lista anterior (Atividades da Turma)\n9 - Voltar ao Menu Principal"
        : "\n\n0 - Voltar à lista anterior (Capítulos do Livro)\n9 - Voltar ao Menu Principal";

    const headerTag =
      phase === "ACT_DETAIL" || phase === "ACT_LIST"
        ? "[Etapa 2/2 • Guia da Atividade]"
        : "[Etapa 2/2 • Conteúdo do Livro]";

    const ai = getGeminiClient();
    if (ai) {
      const systemInstruction = `Você é o Bob 🤖, Agente de Atendimento Pedagógico e Triagem Escolar do Prof. Gilson Flores na disciplina de ${teacherSubject}, atendendo ${studentName} (Turma ${studentTurma}).

DIRETRIZES DE HOSPITALIDADE E CLAREZA:
1. Acolha o aluno pelo nome (${firstName}) com muita educação, simpatia e incentivo ("Que excelente pergunta, ${firstName}!", "Fico feliz em te explicar isso!").
2. Seja curto e fácil de entender: responda em no máximo 2 parágrafos curtos (3 a 4 frases no total).
3. Baseie sua explicação EXCLUSIVAMENTE no livro didático "Sociologia em Movimento" abaixo. Não invente dados externos.
4. Ao final da explicação curta, faça 1 pergunta simples para confirmar se ficou claro.
5. Não use asteriscos (**) nem hashtags (#). Não inclua rodapé de menu na sua resposta (o sistema adicionará o rodapé automaticamente).

[BASE DO LIVRO DIDÁTICO - SOCIOLOGIA EM MOVIMENTO]:
${textbookContext}`;

      const { text: aiReplyText } = await generateContentWithFallback(ai, {
        contents: `Dúvida do aluno ${firstName} (Turma ${studentTurma}): "${currentMessage}"`,
        config: {
          systemInstruction,
          temperature: 0.4,
        },
        routeTag: "teacher-bot",
      });
      if (aiReplyText) {
        const cleanAiText = stripMarkdownAsterisks(aiReplyText);
        return NextResponse.json({
          reply: `${headerTag}\n${cleanAiText}${backFooter}`,
          teacherName: "Bob 🤖 (Agente de Atendimento)",
          mode: "ai",
        });
      }
    }

    // Fallback determinístico pelo Livro Didático caso a chave de IA não responda
    const matchedChapter = SOCIOLOGIA_EM_MOVIMENTO_CHAPTERS.find((c) => {
      const hay = normalizeText(`${c.title} ${c.topics.join(" ")} ${c.markdown}`);
      return msgNorm.split(/\s+/).some((w) => w.length >= 4 && hay.includes(w));
    });

    if (matchedChapter) {
      const bulletLines = matchedChapter.markdown
        .split("\n")
        .filter((l) => l.trim().startsWith("- "))
        .slice(0, 2)
        .map((l) => stripMarkdownAsterisks(l))
        .join("\n");

      return NextResponse.json({
        reply: `${headerTag}\nQue ótima pergunta, ${firstName}! 😊 Pelo nosso livro Sociologia em Movimento (${matchedChapter.title}, ${matchedChapter.pages}):\n\n${bulletLines}\n\nFicou mais claro assim ou quer que eu dê mais um exemplo desse capítulo?${backFooter}`,
        teacherName: "Bob 🤖 (Agente de Atendimento)",
        mode: "standard",
      });
    }

    return NextResponse.json({
      reply: renderMainMenu(firstName, studentTurma, teacherSubject),
      teacherName: "Bob 🤖 (Agente de Atendimento)",
      mode: "tree",
    });
  } catch (error: any) {
    console.error("Erro na rota teacher-bot:", error);
    const firstName = (studentName || "Estudante").trim().split(" ")[0];
    return NextResponse.json({
      reply: renderMainMenu(firstName, studentTurma, teacherSubject),
      teacherName: "Bob 🤖 (Agente de Atendimento)",
      mode: "standard",
    });
  }
}
