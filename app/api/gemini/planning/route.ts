import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';
import {
  callGeminiProPlanning,
  SYSTEM_INSTRUCTION_PLANEJAMENTO,
  GENERATION_CONFIG,
  MODEL_NAME,
  API_KEY,
  ENDPOINT,
} from "@/lib/geminiService";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Tenta primeiro a chamada direta Pro com os parâmetros e endpoint especificados
    try {
      const result = await callGeminiProPlanning(body);
      return NextResponse.json(result);
    } catch (directErr) {
      console.warn("Tentativa direta Pro retornou erro, utilizando SDK como fallback:", directErr);
      
      // Fallback com @google/genai SDK
      const ai = new GoogleGenAI({
        apiKey: API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const {
        seqTitle,
        seqSubject = "Sociologia",
        seqSerie = "1ª Série Regular",
        seqTrimestre = "1º Trimestre",
        seqStartDate,
        seqEndDate,
        selectedTurmasCodes = [],
        turmaSchedules = {},
        guidingDocs = [],
        userMessage = "",
        history = [],
      } = body;

      const userParts: Array<Record<string, unknown>> = [];

      if (Array.isArray(guidingDocs)) {
        for (const doc of guidingDocs) {
          if (doc.fileData && typeof doc.fileData === "string") {
            if (doc.fileData.startsWith("data:")) {
              const matches = doc.fileData.match(/^data:(.*?);base64,(.*)$/);
              if (matches && matches.length === 3) {
                let mimeType = matches[1] || "application/pdf";
                if (
                  mimeType === "application/octet-stream" ||
                  !mimeType ||
                  mimeType === "image/png" ||
                  mimeType === "image/jpeg"
                ) {
                  if (
                    doc.fileName?.endsWith(".png") ||
                    doc.id === "logo_estado" ||
                    doc.categoryName?.includes("Logo") ||
                    doc.categoryName?.includes("logo_estado")
                  ) {
                    mimeType = "image/png";
                  } else if (doc.fileName?.endsWith(".jpg") || doc.fileName?.endsWith(".jpeg")) {
                    mimeType = "image/jpeg";
                  } else if (doc.fileName?.endsWith(".gdoc") || doc.fileName?.endsWith(".txt")) {
                    mimeType = "text/plain";
                  } else if (doc.fileName?.endsWith(".pdf")) {
                    mimeType = "application/pdf";
                  }
                }
                const base64Data = matches[2];
                userParts.push({
                  inlineData: {
                    mimeType: mimeType,
                    data: base64Data,
                  },
                });
              }
            } else if (doc.fileData.trim()) {
              userParts.push({
                text: `[DOCUMENTO NORTEADOR: ${doc.categoryName || doc.id} (${doc.fileName || "anexo"})]\n${doc.fileData}`,
              });
            }
          }
        }
      }

      const schedulesSummary = Array.isArray(selectedTurmasCodes)
        ? selectedTurmasCodes
            .map((tCode: string) => {
              const sched = turmaSchedules[tCode] || { days: ["Segunda"], format: "2 aulas consecutivas (90 min)" };
              const daysStr = sched.days && sched.days.length > 0 ? sched.days.join(", ") : "Não informado";
              return `- Turma ${tCode}: Dia(s) ${daysStr} (${sched.format || "2 aulas - 90 min"})`;
            })
            .join("\n")
        : "Não especificado";

      const attachedDocsSummary = Array.isArray(guidingDocs) && guidingDocs.some((d) => d.fileName)
        ? guidingDocs
            .filter((d) => d.fileName)
            .map((d) => `- ${d.categoryName}: "${d.fileName}" (${d.fileSize || "Carregado"})`)
            .join("\n")
        : "Nenhum documento anexado explicitamente nos slots. (Utilizar regras do GEM caso ausente).";

      const promptText = `SOLICITAÇÃO DE GERAMENTO DE PLANEJAMENTO PEDAGÓGICO

DADOS DO PLANEJAMENTO:
- Título: ${seqTitle || "Nova Sequência Didática"}
- Professor Responsável: Gilson Rodrigo Flores
- Unidade Escolar: EEB Prof. Jandira D'Ávila
- Área de Conhecimento: Ciências Humanas e Sociais Aplicadas
- Componente Curricular: ${seqSubject}
- Ano / Série: ${seqSerie}
- Trimestre Solicitado: ${seqTrimestre}
- Período de Execução: ${seqStartDate || "Não informado"} a ${seqEndDate || "Não informado"}
- Turma(s) Selecionada(s): ${selectedTurmasCodes.length > 0 ? selectedTurmasCodes.join(", ") : "Não informado"}

HORÁRIOS E FORMATO DE AULA POR TURMA:
${schedulesSummary}

DOCUMENTOS NORTEADORES FORNECIDOS:
${attachedDocsSummary}

${
  userMessage
    ? `MENSAGEM DO PROFESSOR: "${userMessage}"`
    : `INSTRUÇÃO: Com base estrita nas regras do SYSTEM INSTRUCTION e nos documentos fornecidos, inicie pela FASE 1 — RESUMO E APROVAÇÃO (NO CHAT). Apresente o resumo, a distribuição dos conteúdos e a conferência de compatibilidade, finalizando com a pergunta de autorização exata especificada no item 32 e PARE para aguardar autorização.`
}
`;

      userParts.push({ text: promptText.trim() });

      const contents: Array<Record<string, unknown>> = [];

      if (Array.isArray(history) && history.length > 0) {
        contents.push({
          role: "user",
          parts: userParts,
        });

        for (const msg of history) {
          contents.push({
            role: msg.role === "assistant" ? "model" : "user",
            parts: [{ text: msg.content }],
          });
        }

        if (userMessage) {
          contents.push({
            role: "user",
            parts: [{ text: userMessage }],
          });
        }
      } else {
        contents.push({
          role: "user",
          parts: userParts,
        });
      }

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: contents as any,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION_PLANEJAMENTO,
          temperature: GENERATION_CONFIG.temperature,
          topP: GENERATION_CONFIG.topP,
        },
      });

      const outputText =
        response.text ||
        "Informação não localizada nos documentos fornecidos. Não foi possível obter resposta completa da IA.";

      return NextResponse.json({
        text: outputText,
        planTitle: seqTitle || "Sequência Didática",
        period: seqTrimestre,
      });
    }
  } catch (error: unknown) {
    console.error("Erro ao integrar com Gemini API no Planejamento:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Erro desconhecido na integração com Gemini API.";
    return NextResponse.json(
      { error: "Falha na chamada da API do Gemini para Planejamento.", details: errorMessage },
      { status: 500 }
    );
  }
}
