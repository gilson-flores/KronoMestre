import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient, isGeminiAuthError } from "@/lib/gemini";
import { GameData, GameMode, AeeMechanic, AeePromptSettings, DebateConfig } from "@/lib/types";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

interface RequestPayload {
  mode?: "interactive_game" | "adapted_aee";
  gameMode?: GameMode;
  title?: string;
  subject?: string;
  topic?: string;
  supportMaterial?: string;
  aeeMechanic?: AeeMechanic;
  aeePromptSettings?: AeePromptSettings;
}

function applyUppercaseIfNeeded(text: string, isUpper: boolean): string {
  return isUpper ? text.toUpperCase() : text;
}

function createFallbackDebateConfig(topic: string, subject: string, supportMaterial: string): DebateConfig {
  const safeTopic = (topic || "Cidadania e Sociedade").trim();
  const safeSubject = (subject || "Sociologia").trim();
  const scriptLines = (supportMaterial || "")
    .split(/\n+/)
    .map((l) => l.replace(/^[\d\-\*•\.]+\s*/, "").trim())
    .filter((l) => l.length > 8);

  const proFocuses = [
    "Fundamento Histórico e Institucional",
    "Impacto Coletivo e Coesão Social",
    "Direitos Humanos e Inclusão Cidadã",
    "Dados Empíricos e Evidências Sociais",
    "Transformação Cultural e Democracia",
    "Proposta Prática e Síntese Sociológica",
  ];

  const contraFocuses = [
    "Contradições Estruturais e Limites Práticos",
    "Desigualdades e Efeitos Colaterais Invisíveis",
    "Relações de Poder e Interesses Hegemônicos",
    "Análise Crítica dos Dados e Indicadores",
    "Tensões entre Teoria Institucional e Cotidiano",
    "Contraproposta Crítica e Síntese Sociológica",
  ];

  return {
    maxJurors: 3,
    proQuestions: proFocuses.map((focus, idx) => ({
      id: `pro_q_${idx + 1}`,
      number: idx + 1,
      side: "pro",
      sociologicalConcept: scriptLines[idx] ? scriptLines[idx].slice(0, 60) : focus,
      prompt: `[Pesquisa PRÓ #${idx + 1}] Considerando o tema "${safeTopic}" (${safeSubject}) e o eixo "${scriptLines[idx] || focus}", pesquise e construa um argumento favorável fundamentado em conceitos sociológicos e fatos reais.`,
      researchHint: "Busque exemplos históricos, leis, estatísticas ou conceitos da Sociologia que comprovem os benefícios desta tese.",
    })),
    contraQuestions: contraFocuses.map((focus, idx) => ({
      id: `contra_q_${idx + 1}`,
      number: idx + 1,
      side: "contra",
      sociologicalConcept: scriptLines[idx] ? scriptLines[idx].slice(0, 60) : focus,
      prompt: `[Pesquisa CONTRA #${idx + 1}] Considerando o tema "${safeTopic}" (${safeSubject}) e o eixo "${scriptLines[idx] || focus}", pesquise e construa um argumento crítico fundamentado em dados e conceitos sociológicos.`,
      researchHint: "Identifique contradições sociais, limites práticos, relações de poder e evidências que problematizem a tese.",
    })),
    jurorQuestions: proFocuses.map((focus, idx) => ({
      id: `juror_q_${idx + 1}`,
      number: idx + 1,
      side: "juror",
      sociologicalConcept: scriptLines[idx] ? scriptLines[idx].slice(0, 60) : focus,
      prompt: `[Preparação JURADOS #${idx + 1}] Sobre "${safeTopic}" (${scriptLines[idx] || focus}): pesquise os conceitos sociológicos neutros e indicadores reais para avaliar com imparcialidade os dois grupos neste eixo.`,
      researchHint: "Anote o conceito sociológico chave e quais evidências cobrar tanto do Time Pró quanto do Time Contra.",
    })),
    checklistCriteria: [
      { id: "crit_1", number: 1, title: "Uso de Conceitos Sociológicos", description: "Mobilizou conceitos, teorias ou autores da Sociologia com precisão (sem ficar no senso comum)." },
      { id: "crit_2", number: 2, title: "Evidências e Fatos Concretos", description: "Apresentou dados históricos, estatísticos ou exemplos reais verificáveis da sociedade brasileira." },
      { id: "crit_3", number: 3, title: "Coerência Lógica e Argumentativa", description: "Sustentou a tese sem contradições internas e sem recorrer a falácias ou ataques pessoais." },
      { id: "crit_4", number: 4, title: "Capacidade de Réplica e Refutação", description: "Respondeu diretamente aos argumentos da bancada oposta com base sociológica." },
      { id: "crit_5", number: 5, title: "Articulação Coletiva e Uso do Tempo", description: "A equipe dividiu a fala de forma equilibrada e respeitou o tempo de exposição." },
      { id: "crit_6", number: 6, title: "Ética Democrática e Direitos Humanos", description: "Manteve postura respeitosa e alinhada à cidadania e aos direitos fundamentais." },
    ],
    jurorInitialGuide: `GUIA DE PREPARAÇÃO DOS 3 JURADOS — TEMA: ${safeTopic.toUpperCase()}\n\n1. SEU PAPEL: Vocês são os 3 magistrados analíticos da turma. Sua missão é avaliar com imparcialidade sociológica a Bancada PRÓ e a Bancada CONTRA.\n2. ROTEIRO DO PROFESSOR: ${supportMaterial || "Avaliem o uso de conceitos sociológicos, dados concretos e capacidade de réplica."}\n3. OS 2 CHECKLISTS: Durante o debate oral, preencham o Checklist 1 (Bancada Pró) e o Checklist 2 (Bancada Contra) marcando Cumpriu ou Não Cumpriu nos 6 critérios oficiais.`,
    participants: [],
    proAnswers: {},
    contraAnswers: {},
    jurorVerdicts: [],
    gradingMode: "group",
    groupGrades: {},
    individualGrades: {},
  };
}

function generateFallbackInteractiveData(payload: RequestPayload): GameData {
  const topic = (payload.topic || payload.title || "Cidadania e Sociedade").trim();
  const subject = (payload.subject || "Sociologia").trim();
  const supportMaterial = (payload.supportMaterial || "").trim();
  const isUpper = Boolean(payload.aeePromptSettings?.uppercaseText);
  const isAee = payload.mode === "adapted_aee";
  const isOnlyPlayful = payload.aeeMechanic === "visual_cards" || payload.aeeMechanic === "social_story";

  if (!isAee && payload.gameMode === "debate_paperless") {
    const debateConfig = createFallbackDebateConfig(topic, subject, supportMaterial);
    return {
      introText: `Debate Sociológico Sem Papel sobre "${topic}". Cadastre-se no seu grupo (Time Pró, Time Contra ou Corpo de 3 Jurados) para acessar suas 6 questões exclusivas.`,
      stages: [],
      debateConfig,
    };
  }

  if (isAee && isOnlyPlayful) {
    const playfulThemes = [
      { title: "História Social na Escola", emojiOk: "🤝", labelOk: "Ajudar e incluir o colega", emojiNo1: "🚫", labelNo1: "Deixar o colega sozinho", emojiNo2: "🗯️", labelNo2: "Ignorar a regra do grupo" },
      { title: "Semáforo da Convivência", emojiOk: "🟢", labelOk: "Ouvir com atenção e respeito", emojiNo1: "🔴", labelNo1: "Gritar ou interromper", emojiNo2: "🟡", labelNo2: "Virar as costas" },
      { title: "Detetive da Comunidade", emojiOk: "🏛️", labelOk: "Cuidar do espaço de todos", emojiNo1: "🗑️", labelNo1: "Sujar o espaço público", emojiNo2: "⛔", labelNo2: "Impedir a passagem" },
      { title: "Causa e Efeito Cidadão", emojiOk: "🌱", labelOk: "Colaborar para o bem comum", emojiNo1: "⚡", labelNo1: "Criar confusão na fila", emojiNo2: "🙈", labelNo2: "Fingir que não viu" },
      { title: "Pontes da Empatia", emojiOk: "💙", labelOk: "Respeitar as diferenças", emojiNo1: "❌", labelNo1: "Rir da dificuldade alheia", emojiNo2: "🧱", labelNo2: "Isolar quem pensa diferente" },
      { title: "Missão Coletiva", emojiOk: "🏆", labelOk: "Construir juntos com diálogo", emojiNo1: "🛑", labelNo1: "Desistir de participar", emojiNo2: "💢", labelNo2: "Impor vontade sem ouvir" },
    ];

    return {
      introText: applyUppercaseIfNeeded(`Missão Visual e Lúdica sobre "${topic}". Observe cada cena e toque no cartão correto!`, isUpper),
      stages: playfulThemes.map((item, idx) => ({
        id: `stage-${idx + 1}`,
        title: applyUppercaseIfNeeded(`Etapa ${idx + 1}: ${item.title}`, isUpper),
        scenario: applyUppercaseIfNeeded(`No dia a dia da escola e da comunidade, estamos aprendendo sobre "${topic}". Qual atitude mostra respeito e cidadania?`, isUpper),
        clue: applyUppercaseIfNeeded("Observe os símbolos e escolha a atitude positiva.", isUpper),
        options: [
          { text: applyUppercaseIfNeeded(item.labelOk, isUpper), isCorrect: true, pointsWeight: 10, feedback: applyUppercaseIfNeeded("Muito bem! Atitude cidadã exemplar!", isUpper), iconEmoji: item.emojiOk },
          { text: applyUppercaseIfNeeded(item.labelNo1, isUpper), isCorrect: false, pointsWeight: 0, feedback: applyUppercaseIfNeeded("Tente novamente observando o cartão de respeito.", isUpper), iconEmoji: item.emojiNo1 },
        ],
        pneSevereStage: {
          playfulPrompt: applyUppercaseIfNeeded(`Toque no cartão que representa a melhor atitude sobre "${topic}":`, isUpper),
          visualCards: [
            { iconEmoji: item.emojiOk, label: applyUppercaseIfNeeded(item.labelOk, isUpper), isCorrect: true, feedback: applyUppercaseIfNeeded("Parabéns! Você escolheu a atitude certa!", isUpper) },
            { iconEmoji: item.emojiNo1, label: applyUppercaseIfNeeded(item.labelNo1, isUpper), isCorrect: false, feedback: applyUppercaseIfNeeded("Olhe com carinho para o cartão de cooperação!", isUpper) },
            { iconEmoji: item.emojiNo2, label: applyUppercaseIfNeeded(item.labelNo2, isUpper), isCorrect: false, feedback: applyUppercaseIfNeeded("Tente escolher o cartão que ajuda o grupo!", isUpper) },
          ],
        },
      })),
    };
  }

  if (isAee && !isOnlyPlayful) {
    const mildAngles = [
      "Situação Prática na Escola",
      "Exemplo do Cotidiano no Bairro",
      "Decisão Consciente em Grupo",
      "Direitos e Deveres na Prática",
      "Análise de Caso Direta",
      "Conclusão Aplicada ao Dia a Dia",
    ];
    return {
      introText: applyUppercaseIfNeeded(`Atividade Adaptada Proficiente sobre "${topic}". Leia cada situação curta e escolha entre as 2 alternativas.`, isUpper),
      stages: mildAngles.map((angle, idx) => ({
        id: `stage-${idx + 1}`,
        title: applyUppercaseIfNeeded(`Desafio ${idx + 1}: ${angle}`, isUpper),
        scenario: applyUppercaseIfNeeded(`[${angle}] Considerando o tema "${topic}" em ${subject}, qual das duas opções explica corretamente a situação?`, isUpper),
        clue: applyUppercaseIfNeeded("Foque na relação entre convivência, regras sociais e direitos.", isUpper),
        options: [
          { text: applyUppercaseIfNeeded(`Compreender "${topic}" a partir do respeito às regras coletivas e aos direitos de todos.`, isUpper), isCorrect: true, pointsWeight: 10, feedback: applyUppercaseIfNeeded("Excelente! Você identificou o ponto principal com precisão.", isUpper), iconEmoji: "✅" },
          { text: applyUppercaseIfNeeded("Ignorar as regras coletivas e agir sem considerar o impacto nas outras pessoas.", isUpper), isCorrect: false, pointsWeight: 0, feedback: applyUppercaseIfNeeded("Releia a dica: na vida em sociedade, nossas ações afetam o coletivo.", isUpper), iconEmoji: "❌" },
        ],
        pneMildStage: {
          scenario: applyUppercaseIfNeeded(`[${angle}] Sobre "${topic}": qual opção está correta?`, isUpper),
          options: [
            { text: applyUppercaseIfNeeded(`Reconhecer a importância de "${topic}" para uma sociedade justa e organizada.`, isUpper), isCorrect: true, feedback: applyUppercaseIfNeeded("Correto! Muito bem fundamentado.", isUpper) },
            { text: applyUppercaseIfNeeded("Desconsiderar os direitos e deveres coletivos na vida em comunidade.", isUpper), isCorrect: false, feedback: applyUppercaseIfNeeded("Pense em como a regra ajuda toda a comunidade.", isUpper) },
          ],
        },
      })),
    };
  }

  const regularAxes = [
    "Contexto Histórico e Social",
    "Estruturas e Instituições",
    "Relações de Poder e Cidadania",
    "Desigualdades e Atores Sociais",
    "Impactos na Realidade Brasileira",
    "Síntese Crítica Sociológica",
  ];

  return {
    introText: `Missão KronoGames de ${subject}: "${topic}". Superem as 6 etapas de investigação sociológica!`,
    stages: regularAxes.map((axis, idx) => ({
      id: `stage-${idx + 1}`,
      title: `Fase ${idx + 1}: ${axis}`,
      scenario: `[${axis}] Considerando o tema "${topic}", qual interpretação sociológica explica este fenômeno com rigor?`,
      clue: "Analise as estruturas sociais, históricas e institucionais envolvidas.",
      options: [
        { text: `Compreender "${topic}" a partir das relações sociais, históricas e institucionais que moldam a vida coletiva.`, isCorrect: true, pointsWeight: 10, feedback: "Excelente análise sociológica!", iconEmoji: "🎯" },
        { text: "Reduzir o fenômeno a opiniões isoladas sem relação com a história ou com a sociedade.", isCorrect: false, pointsWeight: 0, feedback: "A Sociologia investiga as estruturas coletivas além do senso comum.", iconEmoji: "❌" },
        { text: "Considerar que a sociedade nunca muda e independe da ação humana.", isCorrect: false, pointsWeight: 0, feedback: "As instituições sociais são construídas historicamente.", iconEmoji: "⚠️" },
        { text: "Ignorar os dados empíricos e os direitos fundamentais na análise.", isCorrect: false, pointsWeight: 0, feedback: "A análise sociológica exige base empírica.", iconEmoji: "🔎" },
      ],
    })),
  };
}

export async function POST(req: NextRequest) {
  let payload: RequestPayload = {};
  try {
    payload = await req.json();
    const {
      mode = "interactive_game",
      gameMode = "millionaire",
      title = "Atividade Interativa",
      subject = "Sociologia",
      topic = "Cidadania e Sociedade",
      supportMaterial = "",
      aeeMechanic = "visual_cards",
      aeePromptSettings,
    } = payload;

    const ai = getGeminiClient();
    if (!ai) {
      return NextResponse.json({ gameData: generateFallbackInteractiveData(payload), isFallback: true });
    }

    const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
    const creativeSeed = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const isUppercase = Boolean(aeePromptSettings?.uppercaseText);

    // ==========================================================================
    // 1. MODO AEE: SEPARAÇÃO ESTRITA (SOMENTE LÚDICA vs SOMENTE PROFICIENTE)
    // ==========================================================================
    if (mode === "adapted_aee") {
      const isOnlyPlayful = aeeMechanic === "visual_cards" || aeeMechanic === "social_story";
      const playfulFormats = [
        "OFICINA DE HISTÓRIAS SOCIAIS DO COTIDIANO: 6 cenas visuais curtas onde estudantes vivem situações reais na escola/comunidade.",
        "DETETIVE VISUAL DAS EMOÇÕES E CONVIVÊNCIA: 6 desafios visuais de associação causa-e-efeito com símbolos concretos.",
        "JORNADA DOS SÍMBOLOS DA CIDADANIA: 6 missões lúdicas explorando espaços da cidade, família e escola com cartões ilustrados.",
        "SEMÁFORO INTERATIVO DE ATITUDES COLETIVAS: 6 situações práticas contrastando cooperação vs exclusão de forma acolhedora.",
        "ÁLBUM VISUAL DA VIDA DIÁRIA: 6 desafios práticos conectando o tema da aula a hábitos de autonomia, respeito e empatia.",
      ];
      const proficientFormats = [
        "ESTUDOS DE CASO DO COTIDIANO JUVENIL: 6 mini-histórias reais de jovens brasileiros conectadas ao tema, com 2 escolhas diretas.",
        "DILEMAS PRÁTICOS DE DECISÃO CIDADÃ: 6 situações concretas na escola ou bairro onde o estudante toma uma decisão fundamentada.",
        "ANÁLISE DE DIÁLOGOS DO DIA A DIA: 6 breves conversas entre estudantes que mostram o conceito da aula na prática.",
        "INVESTIGAÇÃO PASSO A PASSO: 6 etapas objetivas de causa e consequência com redução cognitiva e linguagem literal.",
      ];

      const chosenFormat = isOnlyPlayful
        ? playfulFormats[Math.floor(Math.random() * playfulFormats.length)]
        : proficientFormats[Math.floor(Math.random() * proficientFormats.length)];

      const aeePrompt = isOnlyPlayful
        ? [
            "Você é um Especialista Criativo em Educação Especial Inclusiva (AEE - Laudos Severos).",
            `SEMENTE CRIATIVA INÉDITA: ${creativeSeed}`,
            `FORMATO CRIATIVO SORTEADO (OBRIGATÓRIO SEGUIR PARA NÃO REPETIR PADRÃO): ${chosenFormat}`,
            `Crie uma atividade 100% LÚDICA E VISUAL de 6 etapas sobre o tema "${topic}" (${subject}) - Título: "${title}".`,
            `Material de Apoio do Professor: "${supportMaterial || "Exemplos concretos de convivência, cidadania e cotidiano."}"`,
            "Regras Obrigatórias:",
            "- Gere SOMENTE a modalidade LÚDICA (pneSevereStage com 3 visualCards por etapa: 1 correto e 2 incorretos).",
            "- Cada uma das 6 etapas deve ter uma situação diferente, criativa e concreta (1 a 2 frases curtas).",
            "- Use emojis variados e expressivos em cada cartão.",
            `- Caixa Alta: ${isUppercase ? "SIM, ESCREVA TODOS OS TEXTOS EM LETRAS MAIÚSCULAS" : "Escrita normal"}.`,
            "Retorne EXCLUSIVAMENTE um JSON válido com a estrutura: { \"introText\": string, \"stages\": [ { \"id\": \"stage-1\", \"title\": string, \"scenario\": string, \"clue\": string, \"options\": [ { \"text\": string, \"isCorrect\": true, \"pointsWeight\": 10, \"feedback\": string, \"iconEmoji\": string }, { \"text\": string, \"isCorrect\": false, \"pointsWeight\": 0, \"feedback\": string, \"iconEmoji\": string } ], \"pneSevereStage\": { \"playfulPrompt\": string, \"visualCards\": [ { \"iconEmoji\": string, \"label\": string, \"isCorrect\": true, \"feedback\": string }, { \"iconEmoji\": string, \"label\": string, \"isCorrect\": false, \"feedback\": string }, { \"iconEmoji\": string, \"label\": string, \"isCorrect\": false, \"feedback\": string } ] } } ] }"
          ].join("\n")
        : [
            "Você é um Especialista Criativo em Educação Especial Inclusiva (AEE - Laudos Leves/Moderados, TDAH, Dislexia, TEA Nível 1/2).",
            `SEMENTE CRIATIVA INÉDITA: ${creativeSeed}`,
            `FORMATO CRIATIVO SORTEADO (OBRIGATÓRIO SEGUIR PARA NÃO REPETIR PADRÃO): ${chosenFormat}`,
            `Crie uma atividade 100% PROFICIENTE ADAPTADA (Redução Cognitiva e Linguagem Literal) de 6 etapas sobre o tema "${topic}" (${subject}) - Título: "${title}".`,
            `Material de Apoio do Professor: "${supportMaterial || "Exemplos práticos do cotidiano brasileiro e escolar."}"`,
            "Regras Obrigatórias:",
            "- Gere SOMENTE a modalidade PROFICIENTE ADAPTADA (pneMildStage e options com exatas 2 alternativas claras: 1 correta e 1 incorreta). Não gere cartões infantis.",
            "- Linguagem 100% literal, sem metáforas confusas, com enunciados objetivos e criativos.",
            `- Caixa Alta: ${isUppercase ? "SIM, ESCREVA TODOS OS TEXTOS EM LETRAS MAIÚSCULAS" : "Escrita normal"}.`,
            "Retorne EXCLUSIVAMENTE um JSON válido com a estrutura: { \"introText\": string, \"stages\": [ { \"id\": \"stage-1\", \"title\": string, \"scenario\": string, \"clue\": string, \"options\": [ { \"text\": string, \"isCorrect\": true, \"pointsWeight\": 10, \"feedback\": string, \"iconEmoji\": \"✅\" }, { \"text\": string, \"isCorrect\": false, \"pointsWeight\": 0, \"feedback\": string, \"iconEmoji\": \"❌\" } ], \"pneMildStage\": { \"scenario\": string, \"options\": [ { \"text\": string, \"isCorrect\": true, \"feedback\": string }, { \"text\": string, \"isCorrect\": false, \"feedback\": string } ] } } ] }"
          ].join("\n");

      for (const model of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: [{ role: "user", parts: [{ text: aeePrompt }] }],
            config: { responseMimeType: "application/json", temperature: 0.9 },
          });
          if (response && response.text) {
            const cleaned = response.text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
            const parsed: GameData = JSON.parse(cleaned);
            if (parsed && Array.isArray(parsed.stages) && parsed.stages.length > 0) {
              return NextResponse.json({ gameData: parsed, isFallback: false });
            }
          }
        } catch (err: any) {
          if (isGeminiAuthError(err)) break;
        }
      }
      return NextResponse.json({ gameData: generateFallbackInteractiveData(payload), isFallback: true });
    }

    // ==========================================================================
    // 2. MODO DEBATE SEM PAPEL: 18 QUESTÕES ISOLADAS (6 PRÓ + 6 CONTRA + 6 JURADOS)
    // ==========================================================================
    if (gameMode === "debate_paperless") {
      const debatePrompt = [
        `Você é um Professor Doutor em Sociologia do Ensino Médio. Crie a estrutura oficial de um DEBATE SOCIOLÓGICO SEM PAPEL sobre o tema "${topic}" (${subject}).`,
        `Roteiro Prévio do Professor: "${supportMaterial || "Fundamente nas teorias sociológicas clássicas e contemporâneas e na realidade brasileira."}"`,
        "Gere EXATAMENTE 18 questões dissertativas isoladas por grupo:",
        "- proQuestions: 6 questões dissertativas norteadoras exclusivas para o TIME PRÓ pesquisar.",
        "- contraQuestions: 6 questões dissertativas norteadoras exclusivas para o TIME CONTRA pesquisar.",
        "- jurorQuestions: 6 questões preparatórias exclusivas para os 3 JURADOS pesquisarem.",
        "- checklistCriteria: 6 critérios objetivos para os 2 Checklists de julgamento dos jurados.",
        "- jurorInitialGuide: Texto-guia orientando os 3 jurados.",
        "Retorne EXCLUSIVAMENTE um JSON válido com: { \"introText\": string, \"proQuestions\": [{ \"sociologicalConcept\": string, \"prompt\": string, \"researchHint\": string }], \"contraQuestions\": [{ \"sociologicalConcept\": string, \"prompt\": string, \"researchHint\": string }], \"jurorQuestions\": [{ \"sociologicalConcept\": string, \"prompt\": string, \"researchHint\": string }], \"checklistCriteria\": [{ \"title\": string, \"description\": string }], \"jurorInitialGuide\": string }"
      ].join("\n");

      for (const model of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: [{ role: "user", parts: [{ text: debatePrompt }] }],
            config: { responseMimeType: "application/json", temperature: 0.8 },
          });
          if (response && response.text) {
            const cleaned = response.text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
            const parsed = JSON.parse(cleaned);
            const fallbackCfg = createFallbackDebateConfig(topic, subject, supportMaterial);
            const debateConfig: DebateConfig = {
              maxJurors: 3,
              proQuestions: Array.isArray(parsed.proQuestions) && parsed.proQuestions.length >= 6
                ? parsed.proQuestions.slice(0, 6).map((q: any, i: number) => ({
                    id: `pro_q_${i + 1}`,
                    number: i + 1,
                    side: "pro" as const,
                    sociologicalConcept: q.sociologicalConcept || fallbackCfg.proQuestions[i].sociologicalConcept,
                    prompt: q.prompt || fallbackCfg.proQuestions[i].prompt,
                    researchHint: q.researchHint || fallbackCfg.proQuestions[i].researchHint,
                  }))
                : fallbackCfg.proQuestions,
              contraQuestions: Array.isArray(parsed.contraQuestions) && parsed.contraQuestions.length >= 6
                ? parsed.contraQuestions.slice(0, 6).map((q: any, i: number) => ({
                    id: `contra_q_${i + 1}`,
                    number: i + 1,
                    side: "contra" as const,
                    sociologicalConcept: q.sociologicalConcept || fallbackCfg.contraQuestions[i].sociologicalConcept,
                    prompt: q.prompt || fallbackCfg.contraQuestions[i].prompt,
                    researchHint: q.researchHint || fallbackCfg.contraQuestions[i].researchHint,
                  }))
                : fallbackCfg.contraQuestions,
              jurorQuestions: Array.isArray(parsed.jurorQuestions) && parsed.jurorQuestions.length >= 6
                ? parsed.jurorQuestions.slice(0, 6).map((q: any, i: number) => ({
                    id: `juror_q_${i + 1}`,
                    number: i + 1,
                    side: "juror" as const,
                    sociologicalConcept: q.sociologicalConcept || fallbackCfg.jurorQuestions![i].sociologicalConcept,
                    prompt: q.prompt || fallbackCfg.jurorQuestions![i].prompt,
                    researchHint: q.researchHint || fallbackCfg.jurorQuestions![i].researchHint,
                  }))
                : fallbackCfg.jurorQuestions,
              checklistCriteria: Array.isArray(parsed.checklistCriteria) && parsed.checklistCriteria.length >= 6
                ? parsed.checklistCriteria.slice(0, 6).map((c: any, i: number) => ({
                    id: `crit_${i + 1}`,
                    number: i + 1,
                    title: c.title || fallbackCfg.checklistCriteria[i].title,
                    description: c.description || fallbackCfg.checklistCriteria[i].description,
                  }))
                : fallbackCfg.checklistCriteria,
              jurorInitialGuide: parsed.jurorInitialGuide || fallbackCfg.jurorInitialGuide,
              participants: [],
              proAnswers: {},
              contraAnswers: {},
              jurorVerdicts: [],
              gradingMode: "group",
              groupGrades: {},
              individualGrades: {},
            };
            return NextResponse.json({
              gameData: {
                introText: parsed.introText || `Debate Sociológico Sem Papel: ${topic}`,
                stages: [],
                debateConfig,
              },
              isFallback: false,
            });
          }
        } catch (err: any) {
          if (isGeminiAuthError(err)) break;
        }
      }
      return NextResponse.json({ gameData: generateFallbackInteractiveData(payload), isFallback: true });
    }

    // ==========================================================================
    // 3. DEMAIS MODALIDADES KRONOGAMES (6 FASES SOCIOLÓGICAS)
    // ==========================================================================
    const regularPrompt = [
      `Você é um Professor Doutor em Sociologia do Ensino Médio. Crie um jogo pedagógico de 6 fases na modalidade "${gameMode}" sobre o tema "${topic}" (${subject}).`,
      `Roteiro do Professor: "${supportMaterial || "Conecte conceitos sociológicos à realidade brasileira."}"`,
      "Retorne EXCLUSIVAMENTE um JSON válido com: { \"introText\": string, \"stages\": [ { \"id\": \"stage-1\", \"title\": string, \"scenario\": string, \"clue\": string, \"options\": [ { \"text\": string, \"isCorrect\": true, \"pointsWeight\": 10, \"feedback\": string, \"iconEmoji\": \"🎯\" }, { \"text\": string, \"isCorrect\": false, \"pointsWeight\": 0, \"feedback\": string, \"iconEmoji\": \"❌\" }, { \"text\": string, \"isCorrect\": false, \"pointsWeight\": 0, \"feedback\": string, \"iconEmoji\": \"⚠️\" }, { \"text\": string, \"isCorrect\": false, \"pointsWeight\": 0, \"feedback\": string, \"iconEmoji\": \"🔎\" } ] } ] }"
    ].join("\n");

    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [{ role: "user", parts: [{ text: regularPrompt }] }],
          config: { responseMimeType: "application/json", temperature: 0.85 },
        });
        if (response && response.text) {
          const cleaned = response.text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
          const parsed: GameData = JSON.parse(cleaned);
          if (parsed && Array.isArray(parsed.stages) && parsed.stages.length > 0) {
            return NextResponse.json({ gameData: parsed, isFallback: false });
          }
        }
      } catch (err: any) {
        if (isGeminiAuthError(err)) break;
      }
    }

    return NextResponse.json({ gameData: generateFallbackInteractiveData(payload), isFallback: true });
  } catch (error: any) {
    console.error("[Generate Interactive] Erro:", error);
    return NextResponse.json({ gameData: generateFallbackInteractiveData(payload), isFallback: true });
  }
}
