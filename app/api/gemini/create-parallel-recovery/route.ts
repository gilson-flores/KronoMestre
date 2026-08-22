import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

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
      approachType = 'practical_cases', // 'practical_cases' | 'step_by_step_guided' | 'conceptual_reinforcement' | 'custom'
      customApproach = '',
    } = await req.json();

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const questionsContext = Array.isArray(questions) && questions.length > 0
      ? JSON.stringify(questions, null, 2)
      : `Atividade de tema: "${title}". Descrição: "${description}".`;

    let approachDescription = '';
    if (approachType === 'practical_cases') {
      approachDescription = 'Abordagem por Estudos de Caso e Aplicações no Cotidiano: Reformule o conteúdo para focar em situações práticas, dilemas reais e exemplos cotidianos que ajudem o aluno a reconectar a teoria com a vida prática.';
    } else if (approachType === 'step_by_step_guided') {
      approachDescription = 'Abordagem Guiada Passo a Passo: Enunciados com andaimento pedagógico (scaffolding), perguntas norteadoras e pequenas dicas de raciocínio que guiam a reflexão do estudante sem dar a resposta direta.';
    } else if (approachType === 'conceptual_reinforcement') {
      approachDescription = 'Abordagem de Reforço Conceitual Estruturado: Foco nos conceitos fundamentais e nas ideias-chave que sustentam a competência esperada, com contextualização clara e alternativas reflexivas.';
    } else {
      approachDescription = customApproach || 'Abordagem Pedagógica Diferenciada com foco em reavaliação de competências.';
    }

    const prompt = `
Você é um especialista em Avaliação da Aprendizagem e Pedagogia da Recuperação Paralela Contínua (Lei de Diretrizes e Bases da Educação).
Sua missão é CRIAR UMA AVALIAÇÃO DE RECUPERAÇÃO PARALELA com uma ABORDAGEM PEDAGÓGICA DIFERENTE da avaliação raiz original.

OBJETIVO PEDAGÓGICO:
O aluno que realiza esta recuperação paralela ou não realizou a 1ª chamada ou precisa recuperar sua aprendizagem. 
A recuperação paralela NÃO deve ser apenas uma cópia da prova original, mas sim uma oportunidade de demonstrar as mesmas competências sob uma PERSPECTIVA NOVA E MAIS ACESSÍVEL.

DADOS DA AVALIAÇÃO ORIGINAL:
- Título Original: ${title || 'Avaliação'}
- Disciplina: ${subject}
- Turma: ${turma || 'Geral'}
- Descrição Original: ${description}
- Pontuação Máxima: ${maxGrade}
- Questões / Conteúdo Original:
${questionsContext}

DIRETRIZ DA ABORDAGEM SELECIONADA:
${approachDescription}
${customApproach ? `\nInstruções Específicas do Professor:\n"""\n${customApproach}\n"""\n` : ''}

REGRAS ESTRUTURAIS:
1. TÍTULO: Deve ter o formato "[Recuperação Paralela] " + Título Original.
2. ABORDAGEM: Uma frase resumindo a abordagem pedagógica utilizada (ex: "Foco em estudos de caso e situações práticas do cotidiano").
3. DESCRIÇÃO: Breve texto orientador acolhedor incentivando o aluno e explicando a nova perspectiva da atividade.
4. QUESTÕES:
   - Gere questões no mesmo quantitativo ou similar (entre 2 e 5 questões).
   - Para questões de Múltipla Escolha ('multiple_choice'): 4 opções com enunciados contextualizados pela nova abordagem e o índice da correta (0 a 3).
   - Para questões Dissertativas ('essay'): enunciados reflexivos guiados, "minCharacters" moderado (ex: 150 a 300) e palavras-chave de apoio.

FORMATO DE RESPOSTA (JSON estrito):
Retorne EXCLUSIVAMENTE um objeto JSON válido:
{
  "recoveryTitle": "[Recuperação Paralela] Nome da Atividade",
  "recoveryApproach": "Resumo conciso da abordagem pedagógica diferenciada aplicada",
  "recoveryDescription": "Instrução pedagógica da recuperação para os estudantes",
  "questions": [
    {
      "type": "multiple_choice",
      "id": "q-rec-1",
      "statement": "Enunciado claro com a nova abordagem",
      "options": ["Opção A", "Opção B", "Opção C", "Opção D"],
      "correctOptionIndex": 0
    },
    {
      "type": "essay",
      "id": "q-rec-2",
      "statement": "Enunciado da dissertativa guiada",
      "minCharacters": 150,
      "keywords": "palavra-chave 1, palavra-chave 2"
    }
  ]
}
`;

    const candidateModels = [
      'gemini-3.1-flash-lite',
      'gemini-3.7-flash',
      'gemini-flash-latest',
    ];

    let response: any = null;
    let lastError: any = null;

    for (const modelName of candidateModels) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              temperature: 0.4,
            },
          });
          if (response && response.text) break;
        } catch (err: any) {
          lastError = err;
          await new Promise((res) => setTimeout(res, 800));
        }
      }
      if (response && response.text) break;
    }

    if (!response || !response.text) {
      throw lastError || new Error('Não foi possível gerar a recuperação paralela no momento.');
    }

    let parsed: any;
    try {
      let rawText = response.text.trim();
      if (rawText.startsWith('```json')) {
        rawText = rawText.replace(/^```json/, '').replace(/```$/, '').trim();
      } else if (rawText.startsWith('```')) {
        rawText = rawText.replace(/^```/, '').replace(/```$/, '').trim();
      }
      parsed = JSON.parse(rawText);
    } catch (parseErr) {
      console.error('Erro ao fazer parse do JSON retornado:', parseErr, response.text);
      return NextResponse.json(
        { error: 'Resposta da IA não veio em formato JSON válido.' },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('Erro na rota create-parallel-recovery:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro interno no servidor ao gerar recuperação paralela.' },
      { status: 500 }
    );
  }
}
