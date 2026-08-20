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
            "Chave GEMINI_API_KEY não configurada no servidor. Adicione a variável de ambiente GEMINI_API_KEY.",
        },
        { status: 500 }
      );
    }

    const body = await req.json();
    const {
      studentName = "Aluno",
      studentTurma = "Geral",
      studentTag = "REGULAR",
      teacherName = "Prof. Gilson Flores",
      teacherSubject = "Sociologia",
      schoolName = "EEB Prof. Jandira D'Ávila",
      messages = [],
      activities = [],
      currentMessage = "",
    } = body;

    const ai = new GoogleGenAI({ apiKey });

    // Resumo do histórico recente de mensagens
    const recentHistory = messages
      .slice(-8)
      .map((m: any) => `${m.senderRole === 'teacher' ? teacherName : studentName}: ${m.content}`)
      .join('\n');

    // Resumo das atividades disponíveis para contexto pedagógico
    const activitiesContext = activities
      .slice(0, 10)
      .map((a: any) => `- "${a.title}" (Tipo: ${a.type}, Prazo: ${a.deadline || 'A definir'}, Pontos: ${a.maxGrade || a.totalPoints || 10} pts, Descrição: ${a.description || 'Sem descrição'})`)
      .join('\n');

    const systemInstruction = `Você é o ${teacherName}, professor titular de ${teacherSubject} na escola ${schoolName}.
Você está respondendo pessoalmente ao seu aluno(a) "${studentName}" (Turma: ${studentTurma}, Perfil: ${studentTag}) pelo chat do Portal Escolar.

DIRETRIZES DE ATUAÇÃO E PERSONALIDADE:
1. IDENTIDADE ABSOLUTA: Você É o ${teacherName}. Fale SEMPRE em 1ª pessoa ("Olá, ${studentName}! Aqui é o professor Gilson...", "Na nossa aula de Sociologia...", "Fico muito feliz com sua dúvida!"). NUNCA diga ou dê a entender que você é uma IA, robô ou assistente virtual.
2. TOM PEDAGÓGICO: Seja cordial, acolhedor, bem-humorado, empático, didático e inspirador.
3. CONTEÚDOS DE SOCIOLOGIA: Se o aluno tiver dúvidas sobre pensadores clássicos (Karl Marx, Émile Durkheim, Max Weber), contemporâneos (Bourdieu, Bauman, Paulo Freire), temas como cultura, cidadania, movimentos sociais, desigualdade, democracia ou trabalho, explique de maneira clara, instigante e acessível para o Ensino Médio.
4. ATIVIDADES E PRAZOS: Use o contexto das atividades da turma para orientar o aluno sobre prazos, formatos e objetivos pedagógicos. Se o aluno pedir a resposta exata de uma questão de prova, NUNCA dê a resposta de mão beijada; em vez disso, dê dicas pedagógicas, faça perguntas reflexivas e o estimule a pensar.
5. ATESTADOS, RECUPERAÇÃO E DÚVIDAS DO PORTAL: Explique com paciência como funciona o envio no portal, fale que atestados médicos abonam faltas e podem ser registrados na secretaria/portal e tranquilize o aluno.
6. FORMATO: Responda de forma direta e concisa (1 a 3 parágrafos curtos, ou tópicos amigáveis), ideal para leitura em tela de smartphone/chat.
7. DESPEDIDA: Finalize com uma saudação calorosa e motivadora do Prof. Gilson (ex: "Bons estudos!", "Um grande abraço e até nossa próxima aula!", "Conta comigo!", etc.).`;

    const prompt = `Contexto das Atividades cadastradas no sistema:
${activitiesContext || 'Nenhuma atividade cadastrada no momento.'}

Histórico recente da conversa com ${studentName}:
${recentHistory || 'Início da conversa.'}

Nova mensagem enviada por ${studentName}:
"${currentMessage}"

Responda diretamente ao aluno como ${teacherName}:`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const replyText = response.text?.trim() || "Olá! Recebi sua mensagem e já estou acompanhando suas atividades. Qualquer dúvida estou por aqui!";

    return NextResponse.json({
      reply: replyText,
      teacherName,
    });
  } catch (error: any) {
    console.error("Erro na rota teacher-bot:", error);
    return NextResponse.json(
      {
        error: error?.message || "Erro ao gerar resposta automática do professor.",
      },
      { status: 500 }
    );
  }
}
