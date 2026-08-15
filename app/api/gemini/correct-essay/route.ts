import { GoogleGenAI, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Chave GEMINI_API_KEY não configurada no servidor.' },
        { status: 500 }
      );
    }

    const {
      essayAnswer,
      questionStatement,
      keywords,
      turma,
      maxEssayScore = 5.0,
    } = await req.json();

    if (!essayAnswer || typeof essayAnswer !== 'string') {
      return NextResponse.json(
        { error: 'A resposta do aluno não foi fornecida.' },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Determine year level difficulty rule
    let gradeLevelRule = 'Nível Médio (2º Ano): exija clareza, boa argumentação e articulação conceitual.';
    const turmaStr = (turma || '').toLowerCase();
    if (turmaStr.includes('1') || turmaStr.includes('primeiro')) {
      gradeLevelRule = 'Nível Fácil (1º Ano): exija compreensão básica e linguagem direta e acessível.';
    } else if (turmaStr.includes('3') || turmaStr.includes('terceiro') || turmaStr.includes('enem')) {
      gradeLevelRule = 'Nível Padrão ENEM (3º Ano): exija rigor na estrutura dissertativa-argumentativa, norma culta, coesão e argumentação crítica fundamentada.';
    }

    const prompt = `
Você é um professor avaliador e assistente pedagógico de Sociologia. Sua tarefa é corrigir a produção textual dissertativa fornecida por um aluno.

DADOS DA QUESTÃO E DA RESPOSTA:
- Turma/Ano: ${turma || 'Não especificada'} (${gradeLevelRule})
- Enunciado / Tema da Questão: ${questionStatement || 'Tema geral de Sociologia'}
- Palavras-chave exigidas/esperadas: ${keywords || 'Nenhuma palavra-chave específica informada'}
- Nota Máxima da Questão Dissertativa: ${maxEssayScore}
- Resposta do Aluno:
"${essayAnswer}"

INSTRUÇÕES E PARÂMETROS OBRIGATÓRIOS DE CORREÇÃO:
1. Fidelidade ao Tema: Avalie se a resposta abordou diretamente o enunciado proposto.
2. Atenção às Palavras-Chave: Verifique se o aluno usou corretamente e contextualizou as palavras-chave informadas (${keywords || 'gerais'}).
3. Coerência com o Ano Escolar: Aplique a exigência do ano escolar -> ${gradeLevelRule}.
4. Estrutura Textual Completa: Analise se a resposta contém Introdução, Desenvolvimento e Conclusão (independente da quantidade de caracteres).
5. Feedback Pedagógico do Professor:
   - Escreva um feedback simpático e construtivo com NO MÁXIMO 300 CARACTERES.
   - Inclua um elogio ou alerta motivacional simpático.
   - Inclua uma breve observação/correção de gramática e ortografia.
   - ATENÇÃO: NÃO mencione no feedback as palavras-chave que foram utilizadas como critério de avaliação.
6. Nota Sugerida: Atribua uma nota numérica de 0 a ${maxEssayScore} proporcional ao desempenho do aluno.

Retorne obrigatoriamente um objeto JSON conforme o schema.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedScore: {
              type: Type.NUMBER,
              description: `Nota sugerida entre 0.0 e ${maxEssayScore}`,
            },
            feedback: {
              type: Type.STRING,
              description: 'Feedback curto para o aluno com no máximo 300 caracteres, elogio/alerta e gramática/ortografia.',
            },
            themeFidelity: {
              type: Type.STRING,
              description: 'Análise de fidelidade ao tema',
            },
            keywordsCheck: {
              type: Type.STRING,
              description: 'Verificação do uso de palavras-chave',
            },
            structureCheck: {
              type: Type.STRING,
              description: 'Análise de Introdução, Desenvolvimento e Conclusão',
            },
            grammarCheck: {
              type: Type.STRING,
              description: 'Análise sintética de gramática e ortografia',
            },
          },
          required: ['suggestedScore', 'feedback', 'themeFidelity', 'keywordsCheck', 'structureCheck', 'grammarCheck'],
        },
      },
    });

    const jsonText = response.text || '{}';
    const parsedData = JSON.parse(jsonText);

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error('Erro na rota de correção de redação com Gemini:', error);
    return NextResponse.json(
      { error: error?.message || 'Falha ao processar correção com o Gemini.' },
      { status: 500 }
    );
  }
}
