// app/api/gemini/adapt-mild-moderate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  ai,
  GEMINI_MODELS,
  GEMINI_SAFETY_SETTINGS,
  sanitizePedagogicalInput,
  sanitizeStudentPII,
  mapAiErrorToFriendlyMessage,
} from '@/lib/gemini';

// Esquema estruturado para adaptação curricular PNE
const adaptedActivitySchema = {
  type: 'object',
  properties: {
    tituloAdaptado: {
      type: 'string',
      description: 'Título claro, conciso e acessível da atividade.',
    },
    enunciadoSimplificado: {
      type: 'string',
      description: 'Instrução direta da tarefa em linguagem clara, frases curtas e objetivas.',
    },
    glossarioApoio: {
      type: 'array',
      description: 'Definições simples de conceitos sociológicos complexos presentes no texto.',
      items: {
        type: 'object',
        properties: {
          termo: { type: 'string' },
          significadoSimples: { type: 'string' },
        },
        required: ['termo', 'significadoSimples'],
      },
    },
    passoAPassoExecucao: {
      type: 'array',
      description: 'Roteiro sequencial e estruturado para o estudante realizar a atividade.',
      items: { type: 'string' },
    },
    questoesAdaptadas: {
      type: 'array',
      description: 'Perguntas adaptadas com opções claras ou suporte imagético/guiado.',
      items: {
        type: 'object',
        properties: {
          numero: { type: 'number' },
          pergunta: { type: 'string' },
          dicaCognitiva: { type: 'string', description: 'Pista pedagógica para orientar o raciocínio.' },
          tipo: { type: 'string', description: 'multipla_escolha, reflexao_curta ou associacao' },
          alternativas: {
            type: 'array',
            items: { type: 'string' },
            description: 'Opções caso a questão seja de múltipla escolha (máximo 4 alternativas).',
          },
        },
        required: ['numero', 'pergunta', 'dicaCognitiva', 'tipo'],
      },
    },
    orientacaoSegundoProfessor: {
      type: 'string',
      description: 'Diretrizes práticas para mediação do 2º professor ou apoio pedagógico.',
    },
  },
  required: [
    'tituloAdaptado',
    'enunciadoSimplificado',
    'glossarioApoio',
    'passoAPassoExecucao',
    'questoesAdaptadas',
    'orientacaoSegundoProfessor',
  ],
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { titulo, descricao, tipoAtividade, necessidadesEspecificas } = body;

    if (!titulo || !descricao) {
      return NextResponse.json(
        { error: 'Título e descrição da atividade original são obrigatórios.' },
        { status: 400 }
      );
    }

    // Sanitização e proteção de dados sensíveis (LGPD)
    const sanitizedTitulo = sanitizePedagogicalInput(titulo);
    const sanitizedDescricao = sanitizeStudentPII(sanitizePedagogicalInput(descricao));
    const sanitizedNecessidades = sanitizePedagogicalInput(necessidadesEspecificas || 'Acessibilidade curricular geral e redução de sobrecarga cognitiva');

    const systemInstruction = `Você é um especialista em Educação Especial Inclusiva e design pedagógico acessível, com foco em Sociologia no Ensino Médio.
Sua missão é adaptar atividades didáticas originais para estudantes com necessidades pedagógicas específicas (comprometimento leve a moderado, TEA, TDAH, dificuldades de leitura/interpretação).

Diretrizes Obrigatórias de Acessibilidade:
1. Fragmentação: Divida comandos longos em etapas sequenciais e claras.
2. Vocabulário: Descomunique o jargão sociológico denso através de glossários acessíveis com exemplos concretos do cotidiano.
3. Foco Cognitivo: Reduza distratores visuais e textuais, mantendo o objetivo central de aprendizagem da BNCC.
4. Mediação: Forneça orientações precisas para a mediação pedagógica do 2º professor de sala.
5. Responda estritamente respeitando o esquema JSON estruturado.`;

    const prompt = `Adapte a seguinte atividade de Sociologia:
- Título Original: ${sanitizedTitulo}
- Formato/Tipo: ${tipoAtividade || 'Atividade Regular'}
- Perfil/Necessidades: ${sanitizedNecessidades}
- Conteúdo da Atividade Original:
"""
${sanitizedDescricao}
"""`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODELS.fast,
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.3,
        safetySettings: GEMINI_SAFETY_SETTINGS as any,
        responseMimeType: 'application/json',
        responseSchema: adaptedActivitySchema,
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
