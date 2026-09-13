import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient } from '@/lib/gemini';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

function generateFallbackRecovery(
  title: string,
  subject: string,
  turma: string,
  description: string,
  questions: any[],
  approachType: string,
  customApproach: string
) {
  let approachTitle = 'Estudos de Caso e Aplicações Práticas';
  if (approachType === 'step_by_step_guided') {
    approachTitle = 'Abordagem Guiada Passo a Passo';
  } else if (approachType === 'conceptual_reinforcement') {
    approachTitle = 'Reforço Conceitual Estruturado';
  } else if (customApproach) {
    approachTitle = customApproach;
  }

  const fallbackQuestions = (Array.isArray(questions) && questions.length > 0 ? questions.slice(0, 4) : []).map((q: any, idx: number) => {
    if (q.type === 'multiple_choice' && Array.isArray(q.options) && q.options.length >= 2) {
      return {
        id: `q-rec-${Date.now()}-${idx + 1}`,
        type: 'multiple_choice',
        statement: `[Recuperação - Nova Abordagem] ${q.statement || 'Analise a situação apresentada e assinale a alternativa correta:'}`,
        options: q.options,
        correctOptionIndex: typeof q.correctOptionIndex === 'number' ? q.correctOptionIndex : 0,
      };
    }
    return {
      id: `q-rec-${Date.now()}-${idx + 1}`,
      type: 'essay',
      statement: `[Recuperação Guiada] ${q.statement || 'Apresente uma reflexão fundamentada sobre os conceitos estudados.'}\n\nRoteiro de apoio: 1) Identifique os conceitos principais. 2) Explique como eles se aplicam à realidade social.`,
      minCharacters: 120,
      keywords: q.keywords || 'cidadania, sociedade, direitos',
    };
  });

  if (fallbackQuestions.length === 0) {
    fallbackQuestions.push({
      id: `q-rec-${Date.now()}-1`,
      type: 'multiple_choice',
      statement: `Em relação aos estudos de ${subject || 'Sociologia'} sobre ${title || 'sociedade e cidadania'}, como podemos definir a participação social consciente?`,
      options: [
        'Engajamento ativo nas decisões coletivas e respeito aos direitos humanos',
        'Isolamento individual sem preocupação com o bem comum',
        'Recusa em debater ideias divergentes na comunidade',
        'Busca exclusiva por benefícios particulares em detrimento do coletivo'
      ],
      correctOptionIndex: 0,
    });
    fallbackQuestions.push({
      id: `q-rec-${Date.now()}-2`,
      type: 'essay',
      statement: `Reflita sobre o tema "${title || 'Sociologia'}" e redija um texto relacionando os conceitos teóricos discutidos em aula com uma situação prática do cotidiano escolar ou comunitário.`,
      minCharacters: 150,
      keywords: 'sociedade, convivência, direitos',
    });
  }

  return {
    recoveryTitle: `[Recuperação Paralela] ${title || 'Avaliação de Sociologia'}`,
    recoveryApproach: `Abordagem diferenciada focada em ${approachTitle}.`,
    recoveryDescription: `Avaliação de Recuperação Paralela com metodologia diferenciada, permitindo demonstrar as competências sob uma perspectiva aplicada.`,
    questions: fallbackQuestions,
  };
}

export async function POST(req: NextRequest) {
  try {
    const {
      title = '',
      subject = 'Sociologia',
      description = '',
      turma = '',
      questions = [],
      maxGrade = 10,
      approachType = 'practical_cases',
      customApproach = '',
    } = await req.json();

    const ai = getGeminiClient();
    if (!ai) {
      const fallback = generateFallbackRecovery(
        title,
        subject,
        turma,
        description,
        questions,
        approachType,
        customApproach
      );
      return NextResponse.json(fallback);
    }

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
      'gemini-3.8-flash',
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
    ];

    let response: any = null;

    for (const modelName of candidateModels) {
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
        const errMsg = String(err?.message || '');
        if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('API key not valid')) {
          break;
        }
        console.warn(`Tentativa com ${modelName} na recuperação:`, errMsg);
      }
    }

    if (response && response.text) {
      let rawText = response.text.trim();
      if (rawText.startsWith('```json')) {
        rawText = rawText.replace(/^```json/, '').replace(/```$/, '').trim();
      } else if (rawText.startsWith('```')) {
        rawText = rawText.replace(/^```/, '').replace(/```$/, '').trim();
      }
      try {
        const parsed = JSON.parse(rawText);
        return NextResponse.json(parsed);
      } catch {
        // Parse error, fallback
      }
    }

    const fallback = generateFallbackRecovery(
      title,
      subject,
      turma,
      description,
      questions,
      approachType,
      customApproach
    );
    return NextResponse.json(fallback);
  } catch (error: any) {
    console.error('Erro na rota create-parallel-recovery, aplicando gerador pedagógico resiliente:', error);
    try {
      const {
        title = '',
        subject = 'Sociologia',
        description = '',
        turma = '',
        questions = [],
        approachType = 'practical_cases',
        customApproach = '',
      } = await req.json().catch(() => ({}));

      const fallback = generateFallbackRecovery(
        title,
        subject,
        turma,
        description,
        questions,
        approachType,
        customApproach
      );
      return NextResponse.json(fallback);
    } catch {
      return NextResponse.json({
        recoveryTitle: `[Recuperação Paralela] Avaliação de Sociologia`,
        recoveryApproach: 'Abordagem contextualizada com estudos práticos.',
        recoveryDescription: 'Atividade de recuperação paralela.',
        questions: [],
      });
    }
  }
}

