import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

function cleanHtmlCode(rawText: string): string {
  let cleaned = (rawText || '').trim();
  if (cleaned.startsWith('```html')) {
    cleaned = cleaned.replace(/^```html\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned.trim();
}

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
            'Chave GEMINI_API_KEY não configurada no servidor. Adicione a variável de ambiente GEMINI_API_KEY.',
        },
        { status: 500 }
      );
    }

    const {
      title,
      subject = 'Sociologia',
      description = '',
      turma = '',
      questions = [],
      maxGrade = 10,
    } = await req.json();

    const ai = new GoogleGenAI({ apiKey });

    // Format questions context
    const questionsSummary = Array.isArray(questions) && questions.length > 0
      ? questions
          .map((q: any, i: number) => {
            if (q.type === 'multiple_choice') {
              return `Questão ${i + 1}: ${q.statement} | Alternativas: ${(q.options || []).join(' / ')} | Resposta correta: ${q.options?.[q.correctOptionIndex] || 'Opção 1'}`;
            }
            return `Questão ${i + 1} (Dissertativa): ${q.statement}`;
          })
          .join('\n')
      : 'Tema geral da atividade: ' + (title || 'Conceitos básicos de Sociologia e Sociedade');

    const prompt = `
Você é um desenvolvedor especialista em Tecnologias Assistivas, Educação Especial Inclusiva (AEE) e Gamificação Pedagógica.
Sua tarefa é criar um JOGO EDUCATIVO LÚDICO e INTERATIVO em HTML5/CSS3/JavaScript puro (documento único e autocontido) para alunos com síndromes e deficiências severas (ex: Autismo Severo, Síndrome de Down com comprometimento elevado, Paralisia Cerebral, etc.).

DADOS DA ATIVIDADE ORIGINAL:
- Título: ${title || 'Atividade Interativa'}
- Disciplina: ${subject}
- Turma/Nível: ${turma || 'Geral'}
- Nota Máxima: ${maxGrade}
- Descrição/Conteúdo: ${description}
- Questões de Referência:
${questionsSummary}

DIRETRIZES TÉCNICAS E PEDAGÓGICAS DO JOGO LÚDICO:
1. DESIGN & ACESSIBILIDADE PARA SÍNDROMES SEVERAS:
   - Botões bem grandes, com cantos arredondados, fontes grandes e legíveis (24px a 36px), alto contraste acolhedor (evitar luzes estroboscópicas ou agressivas).
   - Uso rico de Emojis visuais para ancoragem cognitiva (ex: 🌟, 🎯, 🚀, 💡, 👏, 🏆).
   - Feedback imediato: reforço positivo vibrante (confetes em canvas ou CSS, estrelas brilhantes, frases acolhedoras como "Sensacional!", "Muito Bem!", "Parabéns, você é incrível!").
   - Efeitos sonoros suaves usando Web Audio API do navegador (sem arquivos externos de áudio): criar bips doces e acordes agradáveis quando acertar.
   - SEM contagem regressiva punitiva de tempo ou penalidades estressantes. O aluno pode tentar até acertar ou receber dicas visuais gentis.

2. MECÂNICA DO JOGO:
   - Jogo de Perguntas e Respostas Lúdicas / Quiz Interativo Visual em etapas (cards sequenciais ou minidesafios de 3 a 5 fases).
   - Cada fase apresenta 1 pergunta super simples e direta com 2 ou 3 botões visuais grandes com ilustrações/emojis.
   - Contador de Pontuação e Estrelas no topo da tela (ex: "⭐ 3/5 Estrelas", Barra de progresso colorida).
   - Tela final comemorativa exibindo o total de pontos alcançados, estrelas conquistadas e a nota final proporcional (até ${maxGrade} pts).

3. INTEGRAÇÃO COM A PLATAFORMA (POSTMESSAGE):
   - O jogo deve incluir um botão final visível "FINALIZAR E REGISTRAR NOTA 🚀".
   - Ao finalizar, o script deve chamar:
     window.parent.postMessage({
       type: 'PLAYFUL_GAME_COMPLETED',
       score: currentScore,
       maxScore: totalPossibleScore,
       percentage: percentageCalculated,
       finalGrade: calculatedGradeOutOf${maxGrade}
     }, '*');

4. REQUISITOS DO CÓDIGO HTML:
   - Retorne APENAS o código HTML completo dentro de uma tag <!DOCTYPE html><html>...</html>.
   - Não use dependências externas pesadas (sem frameworks pesados). Apenas HTML5, CSS inline e JS embutido (<script>).
   - Deve ser responsivo para computadores e tablets.

Gere agora o código HTML completo do jogo interativo.
`;

    const candidateModels = [
      'gemini-3.7-flash',
      'gemini-flash-latest',
      'gemini-3.1-flash-lite',
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
          const isRetryable = status === 503 || status === 429 || err?.message?.includes('high demand') || err?.message?.includes('UNAVAILABLE');
          console.warn(`Tentativa ${attempt} com ${modelName} na geração do jogo:`, err?.message || err);
          if (isRetryable && attempt < 2) {
            await new Promise((r) => setTimeout(r, 1200));
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
      if (lastError) throw lastError;
      throw new Error('Nenhum modelo do Gemini respondeu à geração do jogo lúdico.');
    }

    const cleanedHtml = cleanHtmlCode(response.text);

    return NextResponse.json({
      html: cleanedHtml,
      title: `[PNE Lúdica] ${title}`,
      maxScore: maxGrade,
    });
  } catch (error: any) {
    console.error('Erro na rota de geração de atividade lúdica com Gemini:', error);
    return NextResponse.json(
      { error: error?.message || 'Falha ao gerar jogo lúdico com o Gemini.' },
      { status: 500 }
    );
  }
}
