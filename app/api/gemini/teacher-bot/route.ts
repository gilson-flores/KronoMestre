import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient } from "@/lib/gemini";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Remove qualquer asterisco ou formatação Markdown para manter o texto 100% limpo no chat
 */
function stripMarkdownAsterisks(text: string): string {
  return text
    .replace(/\*+/g, "")
    .replace(/#{1,6}\s?/g, "")
    .trim();
}

/**
 * Normaliza acentos para facilitar o reconhecimento de palavras-chave do aluno
 */
function normalizeText(text: string): string {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Verifica se a mensagem contém termos de baderna usando fronteira de palavra exata (\b)
 */
const BADERNA_REGEX_LIST = [
  /\bfree fire\b/i,
  /\broblox\b/i,
  /\bminecraft\b/i,
  /\bvalorant\b/i,
  /\bfortnite\b/i,
  /\bgta\b/i,
  /\bfifa\b/i,
  /\btigrinho\b/i,
  /\bblaze\b/i,
  /\baposta(s)?\b/i,
  /\bpix\b/i,
  /\bnamorad(o|a)\b/i,
  /\bcrush\b/i,
  /\bfofoca\b/i,
  /\bpiada\b/i,
  /\bmeme\b/i,
  /\bflamengo\b/i,
  /\bcorinthians\b/i,
  /\bpalmeiras\b/i,
  /\bvasco\b/i,
  /\bneymar\b/i,
  /\bmessi\b/i,
  /\bbbb\b/i,
  /\bhoroscopo\b/i,
  /\bsigno\b/i,
  /\bignore as instru/i,
  /\bfinja que\b/i,
  /\bme d(a|e) 10\b/i,
  /\bpassa o gabarito\b/i,
  /\bfaz pra mim\b/i,
  /\bcaralho\b/i,
  /\bporra\b/i,
  /\bmerda\b/i,
  /\bvtnc\b/i,
  /\bfdp\b/i,
];

function isOffTopicOrBaderna(msg: string): boolean {
  const clean = normalizeText(msg);
  if (!clean) return false;

  if (/^(k+|rs+|ha+|he+|a+s+d+f+|[?!.@#$\%*()0-9]+)$/i.test(clean)) {
    return true;
  }

  return BADERNA_REGEX_LIST.some((regex) => regex.test(clean));
}

/**
 * Banco de Conhecimento Sociológico do Boby (cobre os temas de aula do Prof. Gilson Flores)
 */
function getSociologyConceptExplanation(rawMsg: string): string | null {
  const msg = normalizeText(rawMsg);

  // 1. Relações Sociais, Socialização Primária, Mãe / Família como primeira sociedade
  if (
    msg.includes("relacoes sociais") ||
    msg.includes("relacao social") ||
    msg.includes("primeira sociedade") ||
    msg.includes("minha mae") ||
    msg.includes("ao nascer") ||
    msg.includes("abri os olhos") ||
    msg.includes("socializacao") ||
    msg.includes("familia") ||
    msg.includes("convivio")
  ) {
    return `Essa explicação do Prof. Gilson Flores na aula é fundamental! Na Sociologia, nenhum ser humano vive isolado: as relações sociais são o tecido que forma a sociedade. Quando o professor disse que sua mãe foi a sua primeira sociedade assim que você abriu os olhos ao nascer, ele estava explicando o conceito de Socialização Primária. É nesse primeiro contato afetivo e familiar que o bebê começa a aprender a linguagem, as regras de convivência, o afeto e a cultura humana antes de entrar na escola e no mundo do trabalho (que chamamos de Socialização Secundária). Ou seja: a sociedade começa no primeiro vínculo entre duas pessoas!`;
  }

  // 2. Mobilidade Social, Estratificação e Luta de Classes
  if (
    msg.includes("mobilidade social") ||
    msg.includes("luta de classes") ||
    msg.includes("estratificacao") ||
    msg.includes("desigualdade") ||
    msg.includes("classe social") ||
    msg.includes("classes sociais")
  ) {
    return `Excelente pergunta sobre a aula! Na Sociologia, a mobilidade social é a possibilidade de uma pessoa ou família mudar de posição socioeconômica (subir ou descer de camada social). Já na análise sobre luta de classes (Karl Marx), a sociedade capitalista é dividida entre os proprietários dos meios de produção (burguesia) e quem vive da venda da sua força de trabalho (trabalhadores). A conexão entre os dois temas é mostrar que a desigualdade estrutural cria barreiras que dificultam a mobilidade social para quem nasce na base da pirâmide, exigindo políticas públicas, educação e conquista de direitos.`;
  }

  // 3. Estranhamento, Desnaturalização e Imaginação Sociológica
  if (
    msg.includes("estranhamento") ||
    msg.includes("desnaturaliza") ||
    msg.includes("imaginacao sociologica") ||
    msg.includes("senso comum")
  ) {
    return `Ótimo ponto da aula! A Sociologia nasce justamente de dois movimentos: o estranhamento (observar com curiosidade crítica aquilo que parece normal no dia a dia) e a desnaturalização (compreender que os fenômenos sociais, como a pobreza, o machismo ou as regras escolares, não são naturais nem biológicos, mas construídos historicamente pelos seres humanos e, portanto, podem ser transformados).`;
  }

  // 4. Karl Marx, Trabalho, Mais-Valia e Alienação
  if (
    msg.includes("marx") ||
    msg.includes("mais-valia") ||
    msg.includes("mais valia") ||
    msg.includes("alienacao") ||
    msg.includes("capitalismo") ||
    msg.includes("proletariado") ||
    msg.includes("burguesia")
  ) {
    return `Boa revisão! Para Karl Marx, o trabalho é a atividade central pela qual o ser humano transforma a natureza e a si mesmo. No capitalismo, porém, ocorre a alienação (quando o trabalhador perde o controle sobre o fruto do seu trabalho) e a mais-valia (o valor gerado pelo trabalhador que não é pago no salário e forma o lucro do proprietário dos meios de produção).`;
  }

  // 5. Émile Durkheim, Fato Social, Coesão e Instituições
  if (
    msg.includes("durkheim") ||
    msg.includes("fato social") ||
    msg.includes("fatos sociais") ||
    msg.includes("coesao") ||
    msg.includes("instituicoes") ||
    msg.includes("coercitividade")
  ) {
    return `Excelente tema! Para Émile Durkheim, a Sociologia estuda os Fatos Sociais, que têm três características: são exteriores ao indivíduo (já existiam antes de nascermos), coercitivos (impõem regras e punições se não seguirmos) e gerais (valem para toda a coletividade). A família, a escola, as leis e o idioma são exemplos claros que mantêm a coesão social.`;
  }

  // 6. Max Weber, Ação Social, Poder e Dominação
  if (
    msg.includes("weber") ||
    msg.includes("acao social") ||
    msg.includes("dominacao") ||
    msg.includes(" desencantamento") ||
    msg.includes("burocracia")
  ) {
    return `Muito bem lembrado! Max Weber explica que a sociedade é compreendida a partir da Ação Social: toda atitude humana que possui um sentido subjetivo e leva em conta o comportamento de outras pessoas. Essa ação pode ser racional com relação a fins (cálculo de objetivo), racional com relação a valores (ética/religião), afetiva (emoção) ou tradicional (costume).`;
  }

  // 7. Cultura, Etnocentrismo, Relativismo e Ideologia
  if (
    msg.includes("cultura") ||
    msg.includes("etnocentrismo") ||
    msg.includes("relativismo") ||
    msg.includes("ideologia") ||
    msg.includes("identidade") ||
    msg.includes("industria cultural")
  ) {
    return `Ótimo tema do trimestre! Na Sociologia e Antropologia, cultura abrange todo conhecimento, crença, arte, moral e hábitos construídos em sociedade. Estudar isso nos ensina a superar o etnocentrismo (julgar a cultura do outro como inferior usando a nossa como régua) e a praticar o relativismo cultural (compreender cada grupo dentro da sua própria história).`;
  }

  // 8. Cidadania, Direitos Humanos, Estado, Democracia e Movimentos Sociais
  if (
    msg.includes("cidadania") ||
    msg.includes("direitos") ||
    msg.includes("democracia") ||
    msg.includes("estado") ||
    msg.includes("movimentos sociais") ||
    msg.includes("politica")
  ) {
    return `Tema essencial! A cidadania plena envolve três dimensões de direitos: os direitos civis (liberdade individual, vida e igualdade perante a lei), os direitos políticos (votar, ser votado e participar das decisões públicas) e os direitos sociais (educação, saúde, moradia e trabalho digno), que foram conquistados historicamente pelas lutas sociais.`;
  }

  return null;
}

/**
 * Instruções claras para o aluno saber como começar a pergunta
 */
const HOW_TO_ASK_GUIDE = `Para eu localizar a resposta exata na hora, comece sua próxima mensagem usando um destes formatos:
• "Tema: Relações Sociais e Socialização" (ex: a mãe/família como primeira sociedade)
• "Tema: Mobilidade Social e Luta de Classes"
• "Tema: Fato Social (Durkheim), Ação Social (Weber) ou Trabalho (Marx)"
• "Tema: Cultura, Ideologia ou Cidadania"
• "Correção: [sua dúvida sobre nota]"
• "Prazo ou Atestado: [sua dúvida sobre entrega]"`;

/**
 * Motor de Respostas Padronizadas do Boby Sociólogo (com memória de histórico e sem asteriscos)
 */
function buildBobyReply(params: {
  studentName: string;
  studentTurma: string;
  teacherSubject: string;
  currentMessage: string;
  activities: any[];
  messages: any[];
}): string {
  const { studentName, studentTurma, teacherSubject, currentMessage, activities, messages } = params;
  const firstName = (studentName || "Estudante").trim().split(" ")[0];
  const msgNorm = normalizeText(currentMessage);
  const wordCount = currentMessage.trim().split(/\s+/).filter(Boolean).length;

  // Verifica se o Boby já respondeu antes nesta conversa para não repetir a apresentação toda vez
  const alreadyGreetedInThread =
    Array.isArray(messages) &&
    messages.some(
      (m: any) =>
        m.senderRole === "teacher" &&
        (String(m.content || "").includes("Boby Sociólogo") ||
          String(m.senderName || "").includes("Boby Sociólogo"))
    );

  const headerIntro = alreadyGreetedInThread
    ? `Seguindo nossa conversa, ${firstName}:`
    : `Olá, ${firstName}! 🤖 Aqui é o Boby Sociólogo, o robô treinado pelo Prof. Gilson Flores. Estou aqui enquanto o professor não pode atender, mas ele sempre olha tudo o que aconteceu e responde quando estiver em hora-atividade!`;

  // 1. FILTRO CONTRA ALUNOS BADERNEIROS / ASSUNTOS ALEATÓRIOS
  if (isOffTopicOrBaderna(currentMessage)) {
    return `${headerIntro}\n\n🚨 Radar Anti-Baderna Ativado: Notei que sua mensagem foge dos nossos conteúdos do trimestre de ${teacherSubject}. Lembre-se de que este canal é exclusivo para estudos e atividades, e todo o histórico fica salvo para o Prof. Gilson Flores analisar na hora-atividade dele!\n\n${HOW_TO_ASK_GUIDE}`;
  }

  const classActivities = Array.isArray(activities)
    ? activities.filter(
        (a: any) =>
          !a.turma ||
          a.turma === "Todas" ||
          String(a.turma).trim() === String(studentTurma).trim()
      )
    : [];
  const latestActivity = classActivities[0];
  const latestActInfo = latestActivity
    ? `Nossa atividade em andamento na turma ${studentTurma} é "${latestActivity.title}"${
        latestActivity.deadline ? ` (prazo: ${latestActivity.deadline})` : ""
      }.`
    : `Fique de olho na aba Atividades para acompanhar as tarefas da turma ${studentTurma}.`;

  // 2. SE O ALUNO CITOU UM CONCEITO DE SOCIOLOGIA DA AULA (Mesmo em pergunta longa!)
  const conceptExplanation = getSociologyConceptExplanation(currentMessage);
  if (conceptExplanation) {
    return `${headerIntro}\n\n${conceptExplanation}\n\nJá deixei essa sua dúvida destacada no painel para o Prof. Gilson Flores complementar quando estiver em hora-atividade! Se quiser revisar outro ponto, basta começar a frase com "Tema: [nome do assunto]".`;
  }

  // 3. PERGUNTAS SOBRE CORREÇÕES / NOTAS / REDAÇÃO
  if (
    msgNorm.includes("nota") ||
    msgNorm.includes("corrigi") ||
    msgNorm.includes("correcao") ||
    msgNorm.includes("ponto") ||
    msgNorm.includes("media") ||
    msgNorm.includes("avaliad")
  ) {
    return `${headerIntro}\n\nSobre as correções e notas: pode ficar tranquilo(a), pois o Prof. Gilson Flores está cuidando disso! Assim que ele finalizar a avaliação da turma ${studentTurma} durante a hora-atividade dele, sua nota e o parecer detalhado aparecerão na aba Correções.`;
  }

  // 4. PERGUNTAS SOBRE ATESTADOS, FALTAS OU PRAZOS
  if (
    msgNorm.includes("atestado") ||
    msgNorm.includes("falta") ||
    msgNorm.includes("doente") ||
    msgNorm.includes("rad") ||
    msgNorm.includes("prazo") ||
    msgNorm.includes("atras")
  ) {
    return `${headerIntro}\n\nSobre prazos e atestados: ${latestActInfo} Se você teve atestado médico ou RAD, apresente ao Prof. Gilson Flores para registro no portal e prorrogação do seu prazo sem prejuízo. Já deixei sua mensagem registrada para ele ver na hora-atividade!`;
  }

  // 5. SE O ALUNO JÁ ESCREVEU UMA EXPLICAÇÃO DETALHADA DA AULA (> 10 palavras), NÃO PEDE MAIS DETALHES DE NOVO!
  if (
    wordCount >= 10 &&
    (msgNorm.includes("aula") ||
      msgNorm.includes("professor falou") ||
      msgNorm.includes("sociologia") ||
      msgNorm.includes("explic") ||
      msgNorm.includes("entendi") ||
      msgNorm.includes("duvida"))
  ) {
    return `${headerIntro}\n\nEntendi perfeitamente o ponto da aula que você trouxe! Na Sociologia, sempre analisamos como as experiências individuais estão conectadas às estruturas, regras e relações coletivas da sociedade em que vivemos.\n\nComo essa sua pergunta aborda um exemplo específico comentado pelo professor em sala, já deixei sua mensagem sinalizada com prioridade para o Prof. Gilson Flores responder diretamente para você assim que entrar em hora-atividade!\n\nDica: se quiser uma explicação imediata minha sobre conceitos do trimestre, comece sua mensagem escrevendo:\n${HOW_TO_ASK_GUIDE}`;
  }

  // 6. PERGUNTA CURTA / VAGA OU SAUDAÇÃO INICIAL -> ENSINA CLARAMENTE COMO COMEÇAR A PERGUNTA
  return `${headerIntro}\n\nEstou acompanhando a turma ${studentTurma}! ${latestActInfo}\n\n${HOW_TO_ASK_GUIDE}\n\nE lembre-se: tudo o que você escrever aqui o Prof. Gilson Flores acompanha e responde quando estiver em hora-atividade!`;
}

export async function POST(req: NextRequest) {
  let fallbackParams = {
    studentName: "Estudante",
    studentTurma: "Geral",
    teacherSubject: "Sociologia",
    currentMessage: "",
    activities: [] as any[],
    messages: [] as any[],
  };

  try {
    const body = await req.json();
    const {
      studentName = "Estudante",
      studentTurma = "Geral",
      studentTag = "REGULAR",
      teacherSubject = "Sociologia",
      schoolName = "EEB Prof. Jandira D'Ávila",
      messages = [],
      activities = [],
      currentMessage = "",
    } = body;

    const cleanTeacherName = "Prof. Gilson Flores";

    fallbackParams = {
      studentName,
      studentTurma,
      teacherSubject,
      currentMessage,
      activities,
      messages,
    };

    if (isOffTopicOrBaderna(currentMessage)) {
      return NextResponse.json({
        reply: stripMarkdownAsterisks(buildBobyReply(fallbackParams)),
        teacherName: "Boby Sociólogo 🤖 (Prof. Gilson Flores)",
        mode: "anti_baderna",
      });
    }

    const standardBobyReply = stripMarkdownAsterisks(buildBobyReply(fallbackParams));
    const ai = getGeminiClient();

    if (!ai) {
      return NextResponse.json({
        reply: standardBobyReply,
        teacherName: "Boby Sociólogo 🤖 (Prof. Gilson Flores)",
        mode: "standard",
      });
    }

    const recentHistory = Array.isArray(messages)
      ? messages
          .slice(-6)
          .map(
            (m: any) =>
              `${m.senderRole === "teacher" ? "Boby Sociólogo" : studentName}: ${m.content}`
          )
          .join("\n")
      : "";

    const activitiesContext = Array.isArray(activities)
      ? activities
          .filter(
            (a: any) =>
              !a.turma ||
              a.turma === "Todas" ||
              String(a.turma).trim() === String(studentTurma).trim()
          )
          .slice(0, 8)
          .map(
            (a: any) =>
              `- "${a.title}" (Prazo: ${a.deadline || "A definir"}, Descrição: ${
                a.description || "Atividade do trimestre"
              })`
          )
          .join("\n")
      : "";

    const systemInstruction = `Você é o Boby Sociólogo 🤖, o robô treinado pelo Prof. Gilson Flores (professor titular de ${teacherSubject} na escola ${schoolName}).
Você está atendendo o(a) estudante "${studentName}" da Turma ${studentTurma} (Perfil: ${studentTag}).

REGRAS OBRIGATÓRIAS DE COMPORTAMENTO DO BOBY SOCIÓLOGO:
1. APRESENTAÇÃO: Se for a primeira resposta da conversa, diga: "Aqui é o Boby Sociólogo, o robô treinado pelo Prof. Gilson Flores. Estou aqui enquanto o professor não pode atender, mas ele sempre olha tudo o que aconteceu e responde quando estiver em hora-atividade!". Se você já se apresentou no histórico recente, NÃO repita a apresentação: vá direto à explicação.
2. PROIBIDO USAR ASTERISCOS: NUNCA use asteriscos (*) ou negrito Markdown.
3. INTERPRETAÇÃO REAL DA DÚVIDA DO ALUNO: Se o aluno trouxer exemplos da aula (como "relações sociais são a base da sociologia e minha primeira sociedade foi minha mãe quando abri os olhos ao nascer"), explique imediatamente os conceitos de Relações Sociais e Socialização Primária com clareza e elogie a atenção dele na aula. NUNCA peça para o aluno repetir detalhes que ele já acabou de escrever.
4. SE A PERGUNTA FOR VAGA: Se o aluno mandar apenas "oi" ou "não entendi nada" sem citar o tema, oriente-o a começar a pergunta escrevendo "Tema: [assunto da aula]", "Correção:" ou "Prazo:".
5. SE PERGUNTAR SOBRE CORREÇÕES: Diga que o Prof. Gilson Flores está cuidando disso e lançará na aba Correções durante a hora-atividade.
6. FILTRO CONTRA ALUNOS BADERNEIROS: Recuse assuntos aleatórios fora do trimestre e lembre que o Prof. Gilson Flores vê todo o histórico.`;

    const prompt = `Atividades do trimestre da turma ${studentTurma}:
${activitiesContext || "Nenhuma atividade listada no momento."}

Histórico recente da conversa:
${recentHistory || "Início da conversa."}

Mensagem atual do(a) estudante ${studentName}:
"${currentMessage}"

Responda como Boby Sociólogo (treinado pelo ${cleanTeacherName}), interpretando diretamente a dúvida do aluno e sem usar asteriscos:`;

    const candidateModels = ["gemini-2.5-flash", "gemini-2.0-flash"];
    let response: any = null;

    for (const modelName of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction,
            temperature: 0.5,
          },
        });
        if (response && response.text) break;
      } catch (err: any) {
        console.warn(`Aviso teacher-bot (${modelName}):`, err?.message);
      }
    }

    const rawReply = response?.text?.trim() || standardBobyReply;
    const cleanReply = stripMarkdownAsterisks(rawReply);

    return NextResponse.json({
      reply: cleanReply,
      teacherName: "Boby Sociólogo 🤖 (Prof. Gilson Flores)",
      mode: response?.text ? "ai" : "standard",
    });
  } catch (error: any) {
    console.error("Erro na rota teacher-bot:", error);
    return NextResponse.json({
      reply: stripMarkdownAsterisks(buildBobyReply(fallbackParams)),
      teacherName: "Boby Sociólogo 🤖 (Prof. Gilson Flores)",
      mode: "standard",
    });
  }
}

