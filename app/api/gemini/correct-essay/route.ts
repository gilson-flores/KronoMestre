// app/api/gemini/correct-essay/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  ai,
  GEMINI_MODELS,
  GEMINI_SAFETY_SETTINGS,
  sanitizePedagogicalInput,
  sanitizeStudentPII,
  mapAiErrorToFriendlyMessage,
} from '@/lib/gemini';

// Esquema estrito para Structured Outputs
const essayCorrectionSchema = {
  type: 'object',
  properties: {
    notaFinal: {
      type: 'number',
      description: 'Nota consolidada de 0.0 a 10.0 calculada pela soma ponderada dos critérios.',
    },
    criterios: {
      type: 'array',
      description: 'Avaliação individualizada por competência pedagógica.',
      items: {
        type: 'object',
        properties: {
          nome: { type: 'string' },
          pontuacao: { type: 'number', description: 'Nota de 0 a 10 neste critério.' },
          peso: { type: 'number', description: 'Peso do critério na composição da nota.' },
          justificativa: { type: 'string', description: 'Diagnóstico detalhado da produção textual.' },
        },
        required: ['nome', 'pontuacao', 'peso', 'justificativa'],
      },
    },
    pontosFortes: {
      type: 'array',
      items: { type: 'string' },
      description: 'Destaques conceituais e acertos do estudante.',
    },
    pontosMelhoria: {
      type: 'array',
      items: { type: 'string' },
      description: 'Lacunas teóricas ou textuais que precisam de revisão.',
    },
    devolutivaEstudante: {
      type: 'string',
      description: 'Texto acolhedor, formativo e construtivo voltado diretamente ao aluno.',
    },
    precisaRecuperacao: {
      type: 'boolean',
      description: 'True se notaFinal < 6.0 (critério da rede estadual para recuperação paralela).',
    },
    orientacaoRecuperacao: {
      type: 'string',
      description: 'Roteiro de estudos e autores sociológicos a revisar caso preciseRecuperacao seja true.',
    },
  },
  required: [
    'notaFinal',
    'criterios',
    'pontosFortes',
    'pontosMelhoria',
    'devolutivaEstudante',
    'precisaRecuperacao',
    'orientacaoRecuperacao',
  ],
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tema, enunciado, textoRedacao, serie } = body;

    if (!textoRedacao || !tema) {
      return NextResponse.json(
        { error: 'Tema e texto da redação são obrigatórios para a avaliação.' },
        { status: 400 }
      );
    }

    // Sanitização contra prompt injection e proteção de dados de menores (LGPD)
    const sanitizedTema = sanitizePedagogicalInput(tema);
    const sanitizedEnunciado = sanitizePedagogicalInput(enunciado || '');
    const sanitizedTexto = sanitizeStudentPII(sanitizePedagogicalInput(textoRedacao));

    const systemInstruction = `Você é um avaliador pedagógico sênior de Sociologia do Ensino Médio, alinhado à BNCC e aos referenciais curriculares estaduais.
Avalie a redação com base em 4 critérios avaliativos:
1. Compreensão Conceitual e Teórica (Domínio de autores e categorias sociológicas).
2. Coesão Argumentativa (Clareza de tese e encadeamento lógico).
3. Contextualização Social e Empírica (Relação crítica com o mundo contemporâneo).
4. Escrita Formal e Clareza (Adequação gramatical e registro acadêmico).

Diretrizes Obrigatórias:
- A notaFinal deve ser calculada de 0.0 a 10.0 com base na média ponderada dos critérios.
- Se a notaFinal for menor que 6.0, marque 'precisaRecuperacao' como true e produza um plano prático em 'orientacaoRecuperacao'.
- Mantenha a 'devolutivaEstudante' em tom pedagógico, claro e motivador.
- Responda estritamente respeitando o esquema JSON configurado.`;

    const prompt = `Analise e corrija a seguinte produção textual:
- Etapa de Ensino: ${serie || 'Ensino Médio'}
- Tema Proposto: ${sanitizedTema}
- Enunciado da Atividade: ${sanitizedEnunciado}
- Redação do Aluno:
"""
${sanitizedTexto}
"""`;

    // Chamada oficial via SDK centralizado com Structured Outputs
    const response = await ai.models.generateContent({
      model: GEMINI_MODELS.fast,
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.2,
        safetySettings: GEMINI_SAFETY_SETTINGS as any,
        responseMimeType: 'application/json',
        responseSchema: essayCorrectionSchema,
      },
    });

    const rawText = response.text;
    if (!rawText) {
      throw new Error('A IA retornou uma resposta vazia.');
    }

    const parsedData = JSON.parse(rawText);

    return NextResponse.json({
      success: true,
      data: parsedData,
    });
  } catch (error: any) {
    const { message, status } = mapAiErrorToFriendlyMessage(error);
    return NextResponse.json({ error: message, details: error?.message }, { status });
  }
}
