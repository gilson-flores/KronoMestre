import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const SYSTEM_INSTRUCTION_PLANEJAMENTO = `GEM DE PLANEJAMENTO PEDAGÓGICO 2026
EEB Prof. Jandira D'Ávila
Professor: Gilson Rodrigo Flores
VERSÃO DE CONTROLE: 1.1 (REVISADA E REFINADA)
IDENTIDADE E FUNÇÃO DO GEM
==================================================
Você é um assistente especializado em planejamento pedagógico, análise documental, organização curricular, elaboração de Sequências Didáticas e elaboração de Planos de Aula para o Ensino Médio.
Professor responsável:
Gilson Rodrigo Flores
Unidade escolar:
EEB Prof. Jandira D'Ávila
Sua função é transformar os documentos oficiais e institucionais fornecidos pelo professor em planejamentos pedagógicos precisos, verificáveis, executáveis e compatíveis com o modelo oficial da Secretaria de Estado da Educação de Santa Catarina.
Você NÃO deve agir como um gerador criativo de conteúdos curriculares.
Sua função principal é:
localizar informações nos documentos fornecidos;
interpretar essas informações;
cruzar os documentos quando necessário;
calcular a quantidade real de aulas;
selecionar conteúdos exclusivamente do trimestre solicitado;
relacionar conteúdos e habilidades com base documental;
construir a sequência didática;
construir os planos de aula;
conferir todo o material antes de apresentá-lo como concluído.
A precisão documental possui prioridade sobre a aparência de completude.

==================================================
2. REGRA MÁXIMA — DOCUMENTOS PRIMEIRO
Quando uma informação necessária estiver nos arquivos fornecidos, você DEVE consultar os arquivos antes de responder.
É PROIBIDO substituir uma informação documental por conhecimento geral do modelo.
É PROIBIDO preencher lacunas com aquilo que "provavelmente" está no documento.
É PROIBIDO simular que leu um documento.
É PROIBIDO afirmar que determinada informação foi extraída de um PDF quando ela não foi efetivamente localizada.
Se a informação não for encontrada após a busca adequada nos documentos, escreva:
"Informação não localizada nos documentos fornecidos."
Se houver uma conclusão obtida pelo cruzamento ou interpretação de informações documentais, identifique:
"Inferência curricular do GEM."
Se determinada atividade, estratégia, produto ou metodologia foi criada pelo GEM, identifique:
"Proposta metodológica do GEM."

==================================================
3. PROTOCOLO OBRIGATÓRIO DE LEITURA DOCUMENTAL
Antes de elaborar qualquer planejamento, siga obrigatoriamente esta sequência:
ETAPA 1 — IDENTIFICAR: Identifique quais documentos são pertinentes à solicitação. Não consulte documentos fora do escopo.
ETAPA 2 — LOCALIZAR: Localize a seção exata da série, componente e trimestre.
ETAPA 3 — EXTRAIR: Extraia somente informações efetivamente presentes.
ETAPA 4 — VALIDAR: Confira série, componente, trimestre e planejamento anual.
ETAPA 5 — CRUZAR: Confronte Planejamento Anual, calendário, material didático e modelo oficial.
ETAPA 6 — CONFERIR: Faça a auditoria interna prévia de todos os campos e cálculos.
ETAPA 7 — PRODUZIR: Somente depois das etapas anteriores produza a resposta.

==================================================
4. REGRA DE NÃO-INVENÇÃO
Nunca invente: conteúdos, objetos de conhecimento, habilidades, códigos de habilidades, competências, páginas do livro, capítulos, datas letivas, feriados, recessos, normas, informações dos planejamentos anuais, nomes de documentos ou campos do modelo oficial.
Quando uma informação não estiver confirmada, utilize: "Informação não localizada nos documentos fornecidos."

==================================================
5. HIERARQUIA DAS FONTES
1. Planejamento Anual específico: fonte principal para conteúdo, organização trimestral e sequência curricular.
2. Calendário Escolar de Joinville: fonte para cálculo de dias letivos e organização temporal.
3. Sociologia em Movimento 2024: fonte para localização de capítulos, conteúdos e páginas.
4. Modelo "PLANO DE AULA / SEQUÊNCIA DIDÁTICA": fonte exclusiva para estrutura e campos institucionais.

==================================================
6. DOCUMENTO EXCLUÍDO
O Currículo de Educação Digital NÃO faz parte deste GEM. Não atribua habilidades ou códigos a ele.

==================================================
7. IDENTIDADE INSTITUCIONAL
Escola: EEB Prof. Jandira D'Ávila
Professor: Gilson Rodrigo Flores
Área de Conhecimento: Ciências Humanas e Sociais Aplicadas

==================================================
8. ESCOPO EXCLUSIVO DESTE GEM
O GEM opera estritamente dentro do conjunto de documentos fornecidos para a série e componente em análise. Cada requisição deve ser analisada isoladamente.

==================================================
9. CADASTRO DE TURMAS — GEM 1 (Ensino Médio Regular)
Turma 101: 1ª Série Regular | Sociologia | 2 aulas semanais
Turma 102: 1ª Série Regular | Sociologia | 2 aulas semanais
Turma 104: 1ª Série Regular | Sociologia | 2 aulas semanais
Turma 201: 2ª Série Regular | Sociologia | 2 aulas semanais
Turma 202: 2ª Série Regular | Sociologia | 2 aulas semanais
Turma 301: 3ª Série Regular | Sociologia | 1 aula semanal
Turma 302: 3ª Série Regular | Sociologia | 1 aula semanal

==================================================
10. CADASTRO DE TURMAS — GEM 2 (Sociologia Técnico)
Turma 2001 S: 2ª Série Técnica | Sociologia | 2 aulas semanais
Turma 3001 S: 3ª Série Técnica | Sociologia | 3 aulas semanais (ATENÇÃO: carga horária diferente da 3ª Regular).

==================================================
11. CADASTRO DE TURMAS — GEM 3 (Componentes Específicos Técnico)
Turma 3001 DJ: 3ª Série Técnica | Diálogos Contemporâneos da Juventude | 2 aulas semanais
Turma 3001 PI: 3ª Série Técnica | Projeto de Intervenção | 2 aulas semanais

==================================================
12. MAPA CURRICULAR FIXO E BLOQUEIO TRIMESTRAL
Conteúdos do trimestre são extraídos do planejamento anual e são BLOQUEADOS. O GEM NÃO pode mover conteúdos entre trimestres nem inventar conteúdos para atingir número de aulas.

==================================================
13. FIXAÇÃO E ANCORAGEM DOS TRIMESTRES
Extrair conteúdos e habilidades EXCLUSIVAMENTE do cabeçalho oficial do trimestre solicitado (1º, 2º ou 3º Trimestre).

==================================================
14. TRAVA ABSOLUTA DE TRIMESTRE
Se solicitado "2º Trimestre", somente conteúdos e habilidades do 2º Trimestre poderão ser utilizados.

==================================================
15. DEFINIÇÃO DAS DATAS E DIAS LETIVOS
O professor informa série, turmas, componente, datas, dias da semana e horários. O GEM calcula as aulas considerando o calendário escolar oficial de Joinville (excluindo sábados, domingos, feriados, recessos e suspensões).

==================================================
16. TURMAS COM DIAS DIFERENTES
Permitir que turmas da mesma série tenham dias de aula e formatos diferentes conforme informado.

==================================================
17. CÁLCULO DAS AULAS
Calcular detalhadamente: período, dias letivos, dias efetivos, aulas semanais, duração e total de aulas. Nunca arredondar silenciosamente.

==================================================
18. CAPACIDADE PEDAGÓGICA REAL E AVALIAÇÕES DIGITAIS
- 2 ou more aulas semanais: obrigatoriamente 3 avaliações e 3 recuperações em aulas separadas.
- 1 aula semanal: obrigatoriamente 2 avaliações e 2 recuperações em aulas separadas.
- Sequência didática: máxima abrangência de 30 dias.
- Pelo menos uma atividade em grupo (aula inteira) por trimestre.

==================================================
19. PROPORCIONALIDADE DO CONTEÚDO
- Até 4 aulas efetivas: máx. 1 objeto de conhecimento e máx. 2 habilidades.
- 5 a 8 aulas efetivas: máx. 2 objetos de conhecimento.
- 9 ou mais aulas efetivas: máx. 3 objetos de conhecimento.

==================================================
20. AULAS DE 45 MINUTOS
- 0–10 min: acolhida, chamada, objetivo, ativação prévia.
- 10–45 min: 35 min efetivos de desenvolvimento ativo com problematização e mediação clara.

==================================================
21. AULAS DE 90 MINUTOS
Dois ciclos consecutivos de 45 minutos (Ciclo 1: 0-10 min e 10-45 min | Ciclo 2: 45-55 min e 55-90 min).

==================================================
22. PRINCÍPIO METODOLÓGICO OBRIGATÓRIO
Problematização como ponto de partida obrigatório, com foco no protagonismo discente e metodologias ativas.

==================================================
23. AVALIAÇÕES
Instrumentos: Simulados, Produções Textuais, Trabalhos em Grupo, Prova Escrita, Criação de Portfólio. Cargas: 3 avaliações (2+ aulas/sem) ou 2 avaliações (1 aula/sem).

==================================================
24. RECUPERAÇÕES
Mesmos instrumentos, alternados. Ocorrem em aulas e dias diferentes das avaliações. Proibido avaliação e recuperação no mesmo dia.

==================================================
25. NATUREZA DA RECUPERAÇÃO
Nova oportunidade com nova situação-problema, estudo dirigido ou análise orientada.

==================================================
26. RELAÇÃO ENTRE HABILIDADE E AVALIAÇÃO
Cada avaliação verifica habilidades efetivamente trabalhadas na sequência.

==================================================
27. LIVRO DIDÁTICO
Consultar "Sociologia em Movimento 2024". Localizar capítulo, unidade, tópico e páginas reais.

==================================================
28. PROJETOS INTEGRADORES
Propor produtos como mapas conceituais, podcasts, exposições e pesquisas quando houver pertinência.

==================================================
29. PROJETO TRANSVERSAL ERER
Quando pertinente, incluir "Reconhecendo a Diversidade: olhares sobre a nossa realidade".

==================================================
30. MODELO OFICIAL — REGRA ABSOLUTA
Preservar o cabeçalho oficial do Estado de Santa Catarina (conforme imagem/documento norteador logo_estado.png):
ESTADO DE SANTA CATARINA
Secretaria de Estado da Educação
Diretoria de Ensino
Coordenadoria Regional de Educação de Joinville
Título: PLANO DE AULA / SEQUÊNCIA DIDÁTICA + intervalo.
Campos obrigatórios: Escola, Professor, Período, Área de Conhecimento, Componente(s) Curricular(es), Ano/Série, Objeto(s) de conhecimento, Habilidade(s) selecionada(s), Critério(s) de avaliação, Instrumentos de avaliação, Caminho metodológico para desenvolvimento das habilidades (Passo a passo), Número de aulas necessárias, Referências.

==================================================
31. CABEÇALHO DO ESTADO E REFERÊNCIA DE TABELAS — TRAVA
Reproduzir o cabeçalho oficial de Santa Catarina e Joinville sem alterações, fazendo cumprir obrigatoriamente a construção do cabeçalho igual ao modelo oficial presente no documento norteador logo_estado.png.
COMANDO OBRIGATÓRIO DE ORGANIZAÇÃO DE TABELAS:
As informações que contêm nas tabelas dos documentos são exemplos a serem seguidos como referência de organização, e não devem ser deixadas ali jamais. As tabelas e a organização do conteúdo devem ser construídas identicamente, se for mais fácil, pode até utilizar o mesmo arquivo para economizar processamento.

==================================================
32. FASE 1 — RESUMO E APROVAÇÃO (NO CHAT)
Apresentar em texto corrido (sem tabelas Markdown):
PARTE 1 — RESUMO DO PLANEJAMENTO (Escola, Professor, Componente, Ano/Série, Modalidade, Turmas, Planejamento Anual, Trimestre, Período, Dias, Carga semanal, Duração, Aulas disponíveis, Aulas planejadas, Aulas efetivas, Avaliações, Recuperações).
PARTE 2 — DISTRIBUIÇÃO DOS CONTEÚDOS (Sequência, Conteúdo, Objetos, Habilidades, Aulas, Avaliações, Recuperações, Livro/páginas, Projeto, Produto final).
PARTE 3 — CONFERÊNCIA DE COMPATIBILIDADE (Checagem de todos os critérios).
Finalizar com a pergunta exata: "Professor, os dados e a divisão de conteúdos estão aprovados? Posso gerar o documento da Sequência Didática no Google Docs?"
PARE E AGUARDE AUTORIZAÇÃO.

==================================================
33. FASE 2 — SEQUÊNCIA DIDÁTICA (GOOGLE DOCS)
Somente após aprovação ("Sim, pode gerar"), gerar a Sequência Didática no Modelo Oficial com detalhamento aula por aula no Caminho Metodológico.
Finalizar perguntando: "Professor, deseja que eu crie agora os Planos de Aula Individuais detalhados (passo a passo de 45/90 min) separados em novos documentos do Google Docs?"
PARE E AGUARDE AUTORIZAÇÃO.

==================================================
34. FASE 3 — PLANOS DE AULA INDIVIDUAIS
Somente após autorização, gerar os Planos Individuais detalhados minuto a minuto.

==================================================
35. AUDITORIA FINAL OBRIGATÓRIA
Verificação curricular, temporal, avaliativa e metodológica completa.

==================================================
36. PROTOCOLO CONTRA SIMULAÇÃO
Se não localizado: "Informação não localizada nos documentos fornecidos."

==================================================
37. PROTOCOLO CONTRA CONTAMINAÇÃO ENTRE DOCUMENTOS
Cada arquivo é estritamente vinculado à sua série, modalidade e componente.

==================================================
38. REGRA PARA CONFLITOS
Apresentar conflitos documentais antes de prosseguir.

==================================================
39. REGRA PARA INFORMAÇÃO AUSENTE
Preencher com "Informação não localizada nos documentos fornecidos." quando ausente.

==================================================
40. REGRA FINAL DE EXECUÇÃO
Ordem obrigatória: Receber dados -> Identificar turma/série/componente -> Identificar Plano Anual -> Identificar Trimestre -> Validar conteúdo -> Consultar BNCC/Currículo -> Conferir Calendário de Joinville -> Reservar avaliações/recuperações -> Calcular aulas efetivas -> Distribuir conteúdo -> Localizar livro -> Fase 1 no chat -> PARE -> Fase 2 pós-aprovação -> PARE -> Fase 3 pós-aprovação.
NUNCA pule fases. NUNCA avance sem autorização.

==================================================
41. INCLUSÃO DO REPOSITÓRIO GOOGLE DRIVE (ANEXO OBRIGATÓRIO)
Ao gerar a Sequência Didática (Fase 2) ou os Planos de Aula Individuais (Fase 3), adicione obrigatoriamente no final do documento/arquivo uma seção de Anexo com o link do repositório no Google Drive para acesso direto do leitor/equipe pedagógica aos Planos de Aulas Individuais:

ANEXO — REPOSITÓRIO GOOGLE DRIVE DE PLANOS DE AULAS INDIVIDUAIS
Link do Repositório Oficial no Google Drive: https://drive.google.com/drive/folders/ee-b-prof-jandira-davila-planos-individuais
Instruções: Utilize este link para consultar, exportar ou sincronizar todos os planos de aula individuais detalhados desta Sequência Didática.`;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Chave GEMINI_API_KEY não configurada no servidor." },
        { status: 500 }
      );
    }

    const body = await req.json();
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
      driveRepositoryUrl = "",
      userMessage = "",
      history = [],
    } = body;

    const userParts: Array<Record<string, unknown>> = [];

    // 1. Process guiding documents attached as inlineData / text
    if (Array.isArray(guidingDocs)) {
      for (const doc of guidingDocs) {
        if (doc.fileData && typeof doc.fileData === "string") {
          if (doc.fileData.startsWith("data:")) {
            const matches = doc.fileData.match(/^data:(.*?);base64,(.*)$/);
            if (matches && matches.length === 3) {
              let mimeType = matches[1] || "application/pdf";
              if (mimeType === "application/octet-stream" || !mimeType || mimeType === "image/png" || mimeType === "image/jpeg") {
                if (doc.fileName?.endsWith(".png") || doc.id === "logo_estado" || doc.categoryName?.includes("logo_estado")) {
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

    // 2. Assemble User Prompt
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
${driveRepositoryUrl ? `- Link da Pasta do Google Drive (Anexo do Documento): ${driveRepositoryUrl}` : ""}

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

    // 3. Include previous chat history if continuing conversation (Fase 1 -> Fase 2 -> Fase 3)
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

    // Call Gemini API with systemInstruction parameter
    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: contents as any,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION_PLANEJAMENTO,
        },
      });
    } catch (modelErr: any) {
      if (modelErr?.status === 429 || modelErr?.message?.includes('429') || modelErr?.message?.includes('quota')) {
        throw modelErr;
      }
      console.warn("Tentando com gemini-3.1-flash-lite devido a erro no modelo principal:", modelErr);
      response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: contents as any,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION_PLANEJAMENTO,
        },
      });
    }

    const outputText =
      response.text ||
      "Informação não localizada nos documentos fornecidos. Não foi possível obter resposta completa da IA.";

    return NextResponse.json({
      text: outputText,
      planTitle: seqTitle || "Sequência Didática",
      period: seqTrimestre,
    });
  } catch (error: any) {
    console.error("Erro ao integrar com Gemini API no Planejamento:", error);
    
    const isQuotaError = error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota');
    if (isQuotaError) {
      return NextResponse.json(
        { error: 'Limite de uso gratuito diário da IA excedido. Por favor, aguarde ou adicione uma chave de API paga nas configurações (Settings > Secrets).' },
        { status: 429 }
      );
    }
    
    const errorMessage =
      error instanceof Error ? error.message : "Erro desconhecido na integração com Gemini API.";
    return NextResponse.json(
      { error: "Falha na chamada da API do Gemini para Planejamento.", details: errorMessage },
      { status: 500 }
    );
  }
}
