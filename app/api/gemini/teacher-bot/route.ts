import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient } from "@/lib/gemini";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
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

    const defaultReply = `Olá, ${studentName}! Aqui é o ${teacherName}. Recebi sua mensagem com muita atenção! Estou acompanhando de perto seu progresso e suas atividades de ${teacherSubject}. Se tiver qualquer dúvida sobre o conteúdo ou os prazos do portal, pode contar comigo. Bons estudos e um grande abraço!`;

    const ai = getGeminiClient();
    if (!ai) {
      return NextResponse.json({
        reply: defaultReply,
        teacherName,
      });
    }

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

    const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];
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
        const errMsg = String(err?.message || '');
        if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('API key not valid')) {
          break;
        }
        console.warn(`Tentativa na rota teacher-bot com ${modelName}:`, errMsg);
      }
    }

    const replyText = response?.text?.trim() || defaultReply;

    return NextResponse.json({
      reply: replyText,
      teacherName,
    });
  } catch (error: any) {
    console.error("Erro na rota teacher-bot, aplicando resposta de segurança:", error);
    return NextResponse.json({
      reply: "Olá! Recebi sua mensagem com carinho e já estou acompanhando suas atividades. Qualquer dúvida estou por aqui!",
      teacherName: "Prof. Gilson Flores",
    });
  }
}

