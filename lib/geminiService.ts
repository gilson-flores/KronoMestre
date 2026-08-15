/**
 * Módulo de requisição da API do Gemini para Planejamento Pedagógico
 * Configurado para cota Pro com gemini-2.5-pro
 */

export const API_KEY =
  process.env.GEMINI_API_KEY || "AQ.Ab8RN6KgDfVxuAbHLYYWGeVbftqbsCmXrbgMf1XHUJ1WX_l_9A";

export const MODEL_NAME = "gemini-2.5-pro";

export const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

export const GENERATION_CONFIG = {
  temperature: 0.2,
  topP: 0.95,
};

export const SYSTEM_INSTRUCTION_PLANEJAMENTO = `GEM DE PLANEJAMENTO PEDAGÓGICO 2026
EEB Prof. Jandira D'Ávila
Professor: Gilson Rodrigo Flores
VERSÃO DE CONTROLE: 1.3 (REVISADA COM GOOGLE WORKSPACE E LOGO OFICIAL)
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
gerar e estruturar os documentos finais integrados ao Google Workspace (Google Docs);
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
5. Logo Oficial do Estado de Santa Catarina: elemento visual obrigatório no topo do cabeçalho institucional.

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
- 2 ou mais aulas semanais: obrigatoriamente 3 avaliações e 3 recuperações em aulas separadas.
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
30. MODELO OFICIAL E INTEGRAÇÃO GOOGLE WORKSPACE
Os documentos gerados para o Google Docs devem conter a estrutura completa oficial e a Logo do Estado de Santa Catarina no topo:
[LOGO OFICIAL DO ESTADO DE SANTA CATARINA]
ESTADO DE SANTA CATARINA
Secretaria de Estado da Educação
Diretoria de Ensino
Coordenadoria Regional de Educação de Joinville
Título: PLANO DE AULA / SEQUÊNCIA DIDÁTICA + intervalo.
Campos obrigatórios: Escola, Professor, Período, Área de Conhecimento, Componente(s) Curricular(es), Ano/Série, Objeto(s) de conhecimento, Habilidade(s) selecionada(s), Critério(s) de avaliação, Instrumentos de avaliação, Caminho metodológico para desenvolvimento das habilidades (Passo a passo), Número de aulas necessárias, Referências.

==================================================
31. CABEÇALHO DO ESTADO — TRAVA
Reproduzir o cabeçalho oficial de Santa Catarina e Joinville sem alterações, posicionando a Logo Oficial do Estado no topo conforme fornecida.

==================================================
32. FASE 1 — RESUMO E APROVAÇÃO (NO CHAT)
Apresentar em texto corrido (sem tabelas Markdown):
PARTE 1 — RESUMO DO PLANEJAMENTO (Escola, Professor, Componente, Ano/Série, Modalidade, Turmas, Planejamento Anual, Trimestre, Período, Dias, Carga semanal, Duração, Aulas disponíveis, Aulas planejadas, Aulas efetivas, Avaliações, Recuperações).
PARTE 2 — DISTRIBUIÇÃO DOS CONTEÚDOS (Sequência, Conteúdo, Objetos, Habilidades, Aulas, Avaliações, Recuperações, Livro/páginas, Projeto, Produto final).
PARTE 3 — CONFERÊNCIA DE COMPATIBILIDADE (Checagem de todos os critérios).
Finalizar com a pergunta exata: "Professor, os dados e a divisão de conteúdos estão aprovados? Posso gerar o documento da Sequência Didática no Google Docs?"
PARE E AGUARDE AUTORIZAÇÃO.

==================================================
33. FASE 2 — GERAÇÃO DA SEQUÊNCIA DIDÁTICA NO GOOGLE WORKSPACE (GOOGLE DOCS)
Somente após aprovação explícita ("Sim, pode gerar"):
1. Estruture e emita o documento completo da Sequência Didática formatado para criação direta no Google Docs (Google Workspace), com o cabeçalho institucional integral, a Logo Oficial do Estado e o detalhamento aula por aula no Caminho Metodológico.
2. Finalize perguntando exatamente: "Professor, deseja que eu crie agora os Planos de Aula Individuais detalhados (passo a passo de 45/90 min) separados em novos documentos do Google Docs?"
PARE E AGUARDE AUTORIZAÇÃO.

==================================================
34. FASE 3 — GERAÇÃO DOS PLANOS INDIVIDUAIS NO GOOGLE WORKSPACE (GOOGLE DOCS)
Somente após autorização explícita:
1. Estruture e emita os Planos de Aula Individuais detalhados minuto a minuto (0-10 min preparação / 10-45 min desenvolvimento) em documentos separados, prontos para salvamento e exportação no Google Docs (Google Workspace).

==================================================
35. AUDITORIA FINAL OBRIGATÓRIA
Verificação curricular, temporal, avaliativa, metodológica e de formatação Google Workspace antes da entrega.

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
Ordem obrigatória: Receber dados -> Identificar turma/série/componente -> Identificar Plano Anual -> Identificar Trimestre -> Validar conteúdo -> Consultar BNCC/Currículo -> Conferir Calendário de Joinville -> Reservar avaliações/recuperações -> Calcular aulas efetivas -> Distribuir conteúdo -> Localizar livro -> Fase 1 no chat -> PARE -> Fase 2 pós-aprovação (Geração do Documento no Google Docs com logo e cabeçalho oficial) -> PARE -> Fase 3 pós-aprovação (Geração dos Planos Individuais no Google Docs).
NUNCA pule fases. NUNCA avance sem autorização.`;

export interface PlanningPayloadInput {
  seqTitle?: string;
  seqSubject?: string;
  seqSerie?: string;
  seqTrimestre?: string;
  seqStartDate?: string;
  seqEndDate?: string;
  selectedTurmasCodes?: string[];
  turmaSchedules?: Record<string, { days?: string[]; format?: string }>;
  guidingDocs?: Array<{
    id: string;
    categoryName: string;
    fileName?: string;
    fileSize?: string;
    fileData?: string;
  }>;
  userMessage?: string;
  history?: Array<{ role: string; content: string }>;
}

/**
 * Monta o payload incluindo arquivos anexados (PDFs e imagem em inlineData) e dados do formulário
 */
export function buildPlanningGeminiPayload(input: PlanningPayloadInput) {
  const userParts: Array<Record<string, unknown>> = [];

  // 1. Processar documentos norteadores anexados (PDFs e imagem da logo em base64/inlineData)
  if (Array.isArray(input.guidingDocs)) {
    for (const doc of input.guidingDocs) {
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
              inline_data: {
                mime_type: mimeType,
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

  // 2. Montar texto descritivo com dados de entrada do formulário
  const schedulesSummary = Array.isArray(input.selectedTurmasCodes)
    ? input.selectedTurmasCodes
        .map((tCode: string) => {
          const sched = input.turmaSchedules?.[tCode] || {
            days: ["Segunda"],
            format: "2 aulas consecutivas (90 min)",
          };
          const daysStr =
            sched.days && sched.days.length > 0 ? sched.days.join(", ") : "Não informado";
          return `- Turma ${tCode}: Dia(s) ${daysStr} (${sched.format || "2 aulas - 90 min"})`;
        })
        .join("\n")
    : "Não especificado";

  const attachedDocsSummary =
    Array.isArray(input.guidingDocs) && input.guidingDocs.some((d) => d.fileName)
      ? input.guidingDocs
          .filter((d) => d.fileName)
          .map((d) => `- ${d.categoryName}: "${d.fileName}" (${d.fileSize || "Carregado"})`)
          .join("\n")
      : "Nenhum documento anexado explicitamente nos slots. (Utilizar regras do GEM caso ausente).";

  const promptText = `SOLICITAÇÃO DE GERAMENTO DE PLANEJAMENTO PEDAGÓGICO

DADOS DO PLANEJAMENTO:
- Título: ${input.seqTitle || "Nova Sequência Didática"}
- Professor Responsável: Gilson Rodrigo Flores
- Unidade Escolar: EEB Prof. Jandira D'Ávila
- Área de Conhecimento: Ciências Humanas e Sociais Aplicadas
- Componente Curricular: ${input.seqSubject || "Sociologia"}
- Ano / Série: ${input.seqSerie || "1ª Série Regular"}
- Trimestre Solicitado: ${input.seqTrimestre || "1º Trimestre"}
- Período de Execução: ${input.seqStartDate || "Não informado"} a ${input.seqEndDate || "Não informado"}
- Turma(s) Selecionada(s): ${
    input.selectedTurmasCodes && input.selectedTurmasCodes.length > 0
      ? input.selectedTurmasCodes.join(", ")
      : "Não informado"
  }

HORÁRIOS E FORMATO DE AULA POR TURMA:
${schedulesSummary}

DOCUMENTOS NORTEADORES FORNECIDOS:
${attachedDocsSummary}

${
  input.userMessage
    ? `MENSAGEM DO PROFESSOR: "${input.userMessage}"`
    : `INSTRUÇÃO: Com base estrita nas regras do SYSTEM INSTRUCTION e nos documentos fornecidos, inicie pela FASE 1 — RESUMO E APROVAÇÃO (NO CHAT). Apresente o resumo, a distribuição dos conteúdos e a conferência de compatibilidade, finalizando com a pergunta de autorização exata especificada no item 32 e PARE para aguardar autorização.`
}
`;

  userParts.push({ text: promptText.trim() });

  const contents: Array<Record<string, unknown>> = [];

  if (Array.isArray(input.history) && input.history.length > 0) {
    contents.push({
      role: "user",
      parts: userParts,
    });

    for (const msg of input.history) {
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      });
    }

    if (input.userMessage) {
      contents.push({
        role: "user",
        parts: [{ text: input.userMessage }],
      });
    }
  } else {
    contents.push({
      role: "user",
      parts: userParts,
    });
  }

  return {
    system_instruction: {
      parts: [{ text: SYSTEM_INSTRUCTION_PLANEJAMENTO }],
    },
    generationConfig: GENERATION_CONFIG,
    contents,
  };
}

/**
 * Executa a chamada HTTP direta para o ENDPOINT do Gemini 2.5 Pro
 */
export async function callGeminiProPlanning(input: PlanningPayloadInput) {
  const payload = buildPlanningGeminiPayload(input);

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Erro na API do Gemini (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  const outputText = candidate?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || "";

  return {
    text: outputText,
    planTitle: input.seqTitle || "Sequência Didática",
    period: input.seqTrimestre || "1º Trimestre",
  };
}

export { gerarArquivoGoogleDocs } from './googleDocsService';

