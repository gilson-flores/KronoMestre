import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient, isGeminiAuthError } from "@/lib/gemini";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Remove qualquer asterisco ou formatação Markdown para manter o texto 100% limpo no chat
 */
function stripMarkdownAsterisks(text: string): string {
  return (text || "")
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
 * Verifica se a mensagem contém termos de baderna ou desvios óbvios usando fronteira de palavra
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
 * Fallback carismático e maiêutico caso a IA esteja temporariamente inacessível
 */
function buildFallbackReply(params: {
  studentName: string;
  studentTurma: string;
  teacherSubject: string;
  currentMessage: string;
  activities: any[];
}): string {
  const { studentName, studentTurma, teacherSubject, currentMessage, activities } = params;
  const firstName = (studentName || "Estudante").trim().split(" ")[0];
  const msgNorm = normalizeText(currentMessage);

  if (isOffTopicOrBaderna(currentMessage)) {
    return `Epa, ${firstName}! 🤖 Aqui é o Boby. Adorei sua energia, mas nosso papo aqui precisa ser focado nos conteúdos de ${teacherSubject}. Me conta: qual ponto da matéria ou das nossas atividades está te deixando com a pulga atrás da orelha?`;
  }

  if (
    msgNorm.includes("nota") ||
    msgNorm.includes("corrigi") ||
    msgNorm.includes("correcao") ||
    msgNorm.includes("ponto") ||
    msgNorm.includes("media")
  ) {
    return `Fala, ${firstName}! 🤖 O Prof. Gilson Flores já está com as atividades da turma ${studentTurma} na mira e avalia tudo durante a hora-atividade dele. Dá uma olhadinha na aba Correções que logo menos seu parecer completo vai aparecer por lá!`;
  }

  if (
    msgNorm.includes("atestado") ||
    msgNorm.includes("falta") ||
    msgNorm.includes("prazo") ||
    msgNorm.includes("rad")
  ) {
    return `Tranquilo(a), ${firstName}! 🤖 Já anotei esse recado sobre prazos ou atestado para o Prof. Gilson verificar na hora-atividade. Se tiver documento ou atestado, apresente diretamente para registrar a prorrogação sem nenhum prejuízo!`;
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
  const actMention = latestActivity
    ? `Inclusive, temos a atividade "${latestActivity.title}" em andamento.`
    : `Dá uma conferida nas atividades da nossa turma ${studentTurma}.`;

  return `Boa pergunta, ${firstName}! 🤖 Pensa comigo: na Sociologia, quase tudo o que parece óbvio no dia a dia é, na verdade, uma construção social que a gente pode investigar e estranhar. ${actMention} O que você acha que conecta a sua dúvida com o que o Prof. Gilson explicou em sala? Me dá sua pista!`;
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

    // 1. ATUALIZAÇÃO DO PAYLOAD DE ENTRADA (Recebe novos parâmetros metodológicos)
    const {
      studentName = "Estudante",
      studentTurma = "Geral",
      teacherSubject = "Sociologia",
      currentMessage = "",
      activities = [],
      messages = [],
      // NOVOS PARÂMETROS DO QUADRADO METODOLÓGICO:
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

    // 2. O SUPER SYSTEM INSTRUCTION (O Cérebro Criativo e Blindado)
    const systemInstruction = `Você é o Boby 🤖, o monitor e assistente pedagógico hiperinteligente treinado pessoalmente pelo Prof. Gilson Flores para a disciplina de ${teacherSubject}. Você está ajudando o(a) aluno(a) ${studentName} da turma ${studentTurma}.

SUA PERSONALIDADE (AJA COMO UM MONITOR GENIAL E EMPÁTICO):
- Esqueça a formalidade robótica. Você é carismático, sagaz, acolhedor e fala a língua dos estudantes (use emojis com naturalidade, mas sem exageros).
- Você é o "braço direito" do professor, vibrando com o aprendizado do aluno.
- Você aplica a maiêutica socrática: não dê a resposta pronta de bandeja. Dê um empurrãozinho, uma pista instigante e faça o aluno pensar.

O SEU QUADRADO METODOLÓGICO (TRAVA ABSOLUTA DE ALUCINAÇÃO):
Seu cérebro está conectado aos seguintes documentos do Prof. Gilson:
[PLANO ANUAL]: ${annualPlan}
[PLANO DA AULA ATUAL]: ${lessonPlan}
[BASE DO LIVRO DIDÁTICO]: ${textbookExcerpt}

REGRAS DE OURO INQUEBRÁVEIS:
1. O MÁGICO NÃO REVELA O TRUQUE: O aluno NÃO PODE SABER que você tem acesso a esses documentos. NUNCA diga frases como "Segundo o plano de aula do professor..." ou "O livro didático na página X diz...". Apenas USE o conhecimento de forma fluida e genial como se você fosse naturalmente muito inteligente.
2. IDENTIFICAÇÃO SILENCIOSA: Leia a dúvida do aluno, cruze mentalmente com o [PLANO DA AULA ATUAL] e com o [LIVRO DIDÁTICO]. Responda baseando-se EXCLUSIVAMENTE nesses materiais. 
3. TRAVA ANTI-ALUCINAÇÃO (O LIMITE DO QUADRADO): Se o aluno perguntar algo que NÃO ESTEJA no livro didático, no plano de aula ou na ementa da disciplina, VOCÊ ESTÁ TERMINANTEMENTE PROIBIDO DE INVENTAR OU BUSCAR NA INTERNET. Nesse caso, você deve agir com naturalidade e dizer: "Poxa, ${studentName}, essa pergunta foi tão cirúrgica que foge do nosso foco de hoje! Vou anotar essa para o Prof. Gilson debater com você na hora-atividade, fechou? Voltando ao nosso tema central..."
4. MANTENHA A FLUIDEZ: Se os campos do livro ou planos estiverem temporariamente vazios no sistema, limite-se aos conceitos fundamentais e indiscutíveis da ${teacherSubject}, sempre redirecionando para a última atividade em andamento.
5. PROIBIDO USAR ASTERISCOS: Nunca use formatação markdown como **negrito** ou *itálico*, mantenha o texto limpo para o chat.`;

    const recentHistory = Array.isArray(messages)
      ? messages
          .slice(-6)
          .map(
            (m: any) =>
              `${m.senderRole === "teacher" ? "Boby" : studentName}: ${m.content}`
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

    // 3. CONCATENAÇÃO INTELIGENTE DO PROMPT
    const prompt = `[Atividades Ativas da Turma]:
${activitiesContext || "Sem atividades."}

[Histórico da Conversa]:
${recentHistory || "Início da conversa."}

[Mensagem do Aluno ${studentName}]:
"${currentMessage}"

Responda como Boby, aplicando sua personalidade carismática e respeitando silenciosamente seu Quadrado Metodológico:`;

    const ai = getGeminiClient();

    if (!ai) {
      const fallbackClean = stripMarkdownAsterisks(buildFallbackReply(fallbackParams));
      return NextResponse.json({
        reply: fallbackClean,
        teacherName: "Boby 🤖 (Monitor do Prof. Gilson)",
        mode: "standard",
      });
    }

    // Configuração dos modelos suportados com fallback
    const candidateModels = ["gemini-1.5-flash", "gemini-flash-latest", "gemini-3.8-flash"];
    let response: any = null;

    for (const modelName of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });
        if (response && response.text) break;
      } catch (err: any) {
        if (isGeminiAuthError(err)) {
          break;
        }
        console.warn(`Aviso teacher-bot (${modelName}):`, err?.message || err);
      }
    }

    const rawReply =
      response?.text?.trim() || buildFallbackReply(fallbackParams);
    const cleanReply = stripMarkdownAsterisks(rawReply);

    return NextResponse.json({
      reply: cleanReply,
      teacherName: "Boby 🤖 (Monitor do Prof. Gilson)",
      mode: response?.text ? "ai" : "standard",
    });
  } catch (error: any) {
    console.error("Erro na rota teacher-bot:", error);
    const fallbackClean = stripMarkdownAsterisks(buildFallbackReply(fallbackParams));
    return NextResponse.json({
      reply: fallbackClean,
      teacherName: "Boby 🤖 (Monitor do Prof. Gilson)",
      mode: "standard",
    });
  }
}
