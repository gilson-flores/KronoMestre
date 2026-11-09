import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient, isGeminiAuthError } from "@/lib/gemini";
import { GameData, GameMode, AeeMechanic, AeePromptSettings, DebateConfig } from "@/lib/types";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

interface RequestPayload {
  mode?: "interactive_game" | "krono_game" | "adapted_aee";
  gameMode?: GameMode;
  title?: string;
  subject?: string;
  topic?: string;
  supportMaterial?: string;
  customPrompt?: string;
  questionCount?: number;
  aeeMechanic?: AeeMechanic;
  aeePromptSettings?: AeePromptSettings;
}

function applyUppercaseIfNeeded(text: string, isUpper: boolean): string {
  return isUpper ? text.toUpperCase() : text;
}

function createFallbackDebateConfig(
  topic: string,
  subject: string,
  count: number = 6
): any {
  const safeTopic = (topic || "Cidadania e Sociedade").trim();
  const safeCount = Math.max(1, Math.min(10, count || 6));

  const proTemplates = [
    {
      concept: "Conquistas Históricas e Direitos",
      q: `Quais marcos históricos e conquistas sociais comprovam os avanços gerados por "${safeTopic}" na construção da cidadania?`,
    },
    {
      concept: "Coesão Social e Democracia",
      q: `Sob a ótica da Sociologia, como "${safeTopic}" contribui para reduzir desigualdades e fortalecer as instituições democráticas no Brasil?`,
    },
    {
      concept: "Evidências Empíricas e Políticas Públicas",
      q: `Que indicadores sociais, leis ou exemplos práticos demonstram os impactos positivos de "${safeTopic}" na vida coletiva?`,
    },
    {
      concept: "Inclusão e Reconhecimento Social",
      q: `De que maneira a defesa de "${safeTopic}" protege grupos historicamente vulnerabilizados na estrutura social contemporânea?`,
    },
    {
      concept: "Transformação Cultural e Cidadã",
      q: `Como "${safeTopic}" promove novas práticas de participação política e responsabilidade coletiva nas escolas e comunidades?`,
    },
    {
      concept: "Proposta Sociológica de Consolidação",
      q: `Qual argumento sociológico central sintetiza por que a sociedade deve ampliar e proteger "${safeTopic}"?`,
    },
  ];

  const contraTemplates = [
    {
      concept: "Contradições Estruturais",
      q: `Quais são as principais contradições entre a promessa formal de "${safeTopic}" e a realidade concreta vivida pela população brasileira?`,
    },
    {
      concept: "Assimetrias de Poder e Interesses",
      q: `Que grupos ou interesses hegemônicos se beneficiam das limitações ou distorções práticas ligadas a "${safeTopic}"?`,
    },
    {
      concept: "Efeitos Colaterais e Desigualdades",
      q: `Quais dados ou situações cotidianas revelam falhas, exclusões ou efeitos não previstos na aplicação atual de "${safeTopic}"?`,
    },
    {
      concept: "Crítica Institucional",
      q: `Por que as instituições atuais encontram limites estruturais para efetivar "${safeTopic}" de forma justa para todas as classes sociais?`,
    },
    {
      concept: "Tensões Culturais e Ideológicas",
      q: `De que modo o discurso dominante sobre "${safeTopic}" pode ocultar problemas estruturais mais profundos da sociedade?`,
    },
    {
      concept: "Síntese Crítica e Contraproposta",
      q: `Qual reformulação estrutural a Bancada Contra propõe para superar as falhas identificadas em "${safeTopic}"?`,
    },
  ];

  const jurorTemplates = [
    {
      concept: "Verificação Conceitual",
      q: `Quais conceitos e autores da Sociologia são indispensáveis para avaliar se as bancadas dominam o tema "${safeTopic}"?`,
    },
    {
      concept: "Auditoria de Fatos e Dados",
      q: `Que dados empíricos ou fatos históricos reais sobre "${safeTopic}" devem ser cobrados tanto da Bancada Pró quanto da Bancada Contra?`,
    },
    {
      concept: "Critério de Desempate Argumentativo",
      q: `Qual é o principal dilema ético e sociológico de "${safeTopic}" que definirá qual bancada apresentou a tese mais consistente?`,
    },
    {
      concept: "Análise de Viabilidade Prática",
      q: `Como avaliar se os argumentos apresentados pelas bancadas sobre "${safeTopic}" são aplicáveis à realidade brasileira?`,
    },
    {
      concept: "Detecção de Senso Comum e Falácias",
      q: `Quais generalizações do senso comum sobre "${safeTopic}" os jurados devem penalizar durante o debate oral?`,
    },
    {
      concept: "Síntese de Julgamento Imparcial",
      q: `Que pergunta final de verificação os jurados podem dirigir às duas bancadas sobre "${safeTopic}"?`,
    },
  ];

  return {
    maxJurors: 3,
    proQuestions: Array.from({ length: safeCount }).map((_, idx) => {
      const item = proTemplates[idx % proTemplates.length];
      return {
        id: `pro_q_${idx + 1}`,
        number: idx + 1,
        side: "pro",
        sociologicalConcept: item.concept,
        prompt: item.q,
        researchHint: "",
      };
    }),
    contraQuestions: Array.from({ length: safeCount }).map((_, idx) => {
      const item = contraTemplates[idx % contraTemplates.length];
      return {
        id: `contra_q_${idx + 1}`,
        number: idx + 1,
        side: "contra",
        sociologicalConcept: item.concept,
        prompt: item.q,
        researchHint: "",
      };
    }),
    jurorQuestions: Array.from({ length: safeCount }).map((_, idx) => {
      const item = jurorTemplates[idx % jurorTemplates.length];
      return {
        id: `juror_q_${idx + 1}`,
        number: idx + 1,
        side: "juror",
        sociologicalConcept: item.concept,
        prompt: item.q,
        researchHint: "",
      };
    }),
    checklistCriteria: [
      { id: "crit_1", number: 1, title: "Rigor Conceitual Sociológico", description: "Mobilizou conceitos, teorias ou autores da Sociologia sem recorrer ao senso comum." },
      { id: "crit_2", number: 2, title: "Evidências e Fatos Concretos", description: "Apresentou dados históricos, estatísticos ou exemplos reais da sociedade brasileira." },
      { id: "crit_3", number: 3, title: "Coerência Lógica e Argumentativa", description: "Sustentou a tese sem contradições internas e sem ataques pessoais." },
      { id: "crit_4", number: 4, title: "Capacidade de Réplica e Refutação", description: "Respondeu diretamente aos argumentos da bancada oposta com base sociológica." },
      { id: "crit_5", number: 5, title: "Articulação Coletiva e Uso do Tempo", description: "A equipe dividiu a fala de forma equilibrada e respeitou o tempo de exposição." },
      { id: "crit_6", number: 6, title: "Ética Democrática e Direitos Humanos", description: "Manteve postura respeitosa e alinhada à cidadania e aos direitos fundamentais." },
    ],
    jurorInitialGuide: `GUIA DOS 3 JURADOS — TEMA: ${safeTopic.toUpperCase()}\nAvaliem com imparcialidade sociológica a Bancada PRÓ e a Bancada CONTRA utilizando as questões preparatórias e os 2 Checklists oficiais.`,
    proSummaryAI: `📘 RESUMO ELABORADO DE RESPOSTAS — BANCADA PRÓ (${safeTopic.toUpperCase()}):\n1. Fundamentos Históricos e Direitos: A defesa favorável demonstra que "${safeTopic}" representa uma conquista histórica essencial para a cidadania e para a redução de assimetrias sociais.\n2. Coesão Social e Democracia: Sob a ótica sociológica (Durkheim, Habermas e Bobbio), o fortalecimento de políticas e garantias ligadas ao tema amplia a participação democrática e protege grupos vulnerabilizados.\n3. Síntese Argumentativa para o Debate: A bancada deve sustentar com dados empíricos que eventuais falhas práticas decorrem da falta de efetivação plena, e não do princípio em si.`,
    contraSummaryAI: `📕 RESUMO ELABORADO DE RESPOSTAS — BANCADA CONTRA (${safeTopic.toUpperCase()}):\n1. Contradições Estruturais e Limites Reais: A análise crítica evidencia o abismo entre a promessa formal de "${safeTopic}" e a realidade material vivida pela população brasileira.\n2. Assimetrias de Poder e Ideologia: A partir da sociologia crítica (Marx, Weber, Bourdieu e Foucault), observa-se como interesses hegemônicos e barreiras institucionais distorcem sua aplicação prática.\n3. Síntese de Refutação para o Debate: A bancada deve exigir transformações estruturais profundas, demonstrando os efeitos colaterais e exclusões geradas pelo modelo atual.`,
    jurorGuideAI: `⚖️ DOSSIÊ E RESUMO ELABORADO DE ANÁLISE — CORPO DE JURADOS (${safeTopic.toUpperCase()}):\n1. Eixo de Verificação Teórica: Avaliar se ambas as bancadas superaram o senso comum e mobilizaram conceitos sociológicos rigorosos (fato social, ação social, ideologia, cidadania e poder).\n2. Auditoria de Evidências: Conferir qual equipe comprovou suas teses com dados históricos, estatísticos ou exemplos concretos da realidade brasileira.\n3. Critério de Desempate no Grande Debate: Vence a bancada que mantiver maior coerência lógica, responder diretamente às réplicas adversárias sem falácias e respeitar o tempo oficial.`,
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
  const isUpper = Boolean(payload.aeePromptSettings?.uppercaseText);
  const isAee = payload.mode === "adapted_aee";
  const isOnlyPlayful = payload.aeeMechanic === "visual_cards" || payload.aeeMechanic === "social_story";
  const stageCount = Math.max(1, Math.min(12, payload.questionCount || (6)));

  if (!isAee && payload.gameMode === "debate_paperless") {
    const debateConfig = createFallbackDebateConfig(topic, subject, stageCount);
    return {
      introText: `Debate Sociológico Sem Papel sobre "${topic}".`,
      stages: [],
      debateConfig,
    };
  }

  if (isAee && isOnlyPlayful) {
    const playfulThemes = [
      { title: "Convivência na Escola", emojiOk: "🤝", labelOk: "Incluir e dialogar com o colega", emojiNo1: "🚫", labelNo1: "Isolar o colega", emojiNo2: "🗯️", labelNo2: "Desrespeitar o grupo" },
      { title: "Atitude Cidadã", emojiOk: "🟢", labelOk: "Ouvir com empatia e respeito", emojiNo1: "🔴", labelNo1: "Interromper com gritos", emojiNo2: "🟡", labelNo2: "Ignorar quem precisa" },
      { title: "Espaço Coletivo", emojiOk: "🏛️", labelOk: "Preservar o bem público", emojiNo1: "🗑️", labelNo1: "Degradar o patrimônio", emojiNo2: "⛔", labelNo2: "Bloquear o acesso" },
      { title: "Decisão em Comunidade", emojiOk: "🌱", labelOk: "Cooperar para o bem comum", emojiNo1: "⚡", labelNo1: "Agir com egoísmo", emojiNo2: "🙈", labelNo2: "Omitir ajuda" },
      { title: "Diversidade e Respeito", emojiOk: "💙", labelOk: "Valorizar as diferenças", emojiNo1: "❌", labelNo1: "Praticar preconceito", emojiNo2: "🧱", labelNo2: "Excluir do grupo" },
      { title: "Construção Democrática", emojiOk: "🏆", labelOk: "Resolver conflitos pelo diálogo", emojiNo1: "🛑", labelNo1: "Recusar o diálogo", emojiNo2: "💢", labelNo2: "Impor pela força" },
    ];

    return {
      introText: applyUppercaseIfNeeded(`Atividade Lúdica Interativa sobre "${topic}".`, isUpper),
      stages: playfulThemes.slice(0, stageCount).map((item, idx) => ({
        id: `stage-${idx + 1}`,
        title: applyUppercaseIfNeeded(`Etapa ${idx + 1}: ${item.title}`, isUpper),
        scenario: applyUppercaseIfNeeded(`Analisando "${topic}" no cotidiano: qual escolha demonstra cidadania e respeito coletivo?`, isUpper),
        clue: "",
        options: [
          { text: applyUppercaseIfNeeded(item.labelOk, isUpper), isCorrect: true, pointsWeight: 10, feedback: applyUppercaseIfNeeded("Excelente escolha cidadã!", isUpper), iconEmoji: item.emojiOk },
          { text: applyUppercaseIfNeeded(item.labelNo1, isUpper), isCorrect: false, pointsWeight: 0, feedback: applyUppercaseIfNeeded("Observe o cartão que promove respeito coletivo.", isUpper), iconEmoji: item.emojiNo1 },
        ],
        pneSevereStage: {
          playfulPrompt: applyUppercaseIfNeeded(`Toque no cartão correto sobre "${topic}":`, isUpper),
          visualCards: [
            { iconEmoji: item.emojiOk, label: applyUppercaseIfNeeded(item.labelOk, isUpper), isCorrect: true, feedback: applyUppercaseIfNeeded("Muito bem! Escolha correta!", isUpper) },
            { iconEmoji: item.emojiNo1, label: applyUppercaseIfNeeded(item.labelNo1, isUpper), isCorrect: false, feedback: applyUppercaseIfNeeded("Tente o cartão que mostra cooperação!", isUpper) },
            { iconEmoji: item.emojiNo2, label: applyUppercaseIfNeeded(item.labelNo2, isUpper), isCorrect: false, feedback: applyUppercaseIfNeeded("Escolha a atitude que ajuda o coletivo!", isUpper) },
          ],
        },
      })),
    };
  }

  if (isAee && !isOnlyPlayful) {
    const mildQuestions = [
      { axis: "Cotidiano Escolar", q: `Como o conceito de "${topic}" pode ser observado nas relações dentro da escola?` },
      { axis: "Direitos e Deveres", q: `Qual atitude respeita os direitos coletivos ao lidarmos com "${topic}" na comunidade?` },
      { axis: "Convivência Social", q: `De que forma a Sociologia explica a importância de "${topic}" para evitar injustiças?` },
      { axis: "Participação Cidadã", q: `Qual decisão fortalece a democracia e o respeito mútuo em situações ligadas a "${topic}"?` },
      { axis: "Análise Prática", q: `Diante de um conflito envolvendo "${topic}", qual caminho promove uma solução justa?` },
      { axis: "Conclusão Aplicada", q: `Por que compreender "${topic}" ajuda a construir uma sociedade mais igualitária?` },
    ];
    return {
      introText: applyUppercaseIfNeeded(`Atividade Adaptada Proficiente sobre "${topic}".`, isUpper),
      stages: mildQuestions.slice(0, stageCount).map((item, idx) => ({
        id: `stage-${idx + 1}`,
        title: applyUppercaseIfNeeded(`Questão ${idx + 1}: ${item.axis}`, isUpper),
        scenario: applyUppercaseIfNeeded(item.q, isUpper),
        clue: "",
        options: [
          { text: applyUppercaseIfNeeded(`Promover os direitos coletivos, o diálogo e a justiça social em relação a "${topic}".`, isUpper), isCorrect: true, pointsWeight: 10, feedback: applyUppercaseIfNeeded("Correto! Análise clara e fundamentada.", isUpper), iconEmoji: "✅" },
          { text: applyUppercaseIfNeeded("Desconsiderar as regras democráticas e agir apenas por interesse individual.", isUpper), isCorrect: false, pointsWeight: 0, feedback: applyUppercaseIfNeeded("Na vida em sociedade, os direitos coletivos devem ser respeitados.", isUpper), iconEmoji: "❌" },
        ],
        pneMildStage: {
          scenario: applyUppercaseIfNeeded(item.q, isUpper),
          options: [
            { text: applyUppercaseIfNeeded(`Reconhecer a importância de "${topic}" para uma convivência justa e democrática.`, isUpper), isCorrect: true, feedback: applyUppercaseIfNeeded("Correto! Muito bem.", isUpper) },
            { text: applyUppercaseIfNeeded("Ignorar os impactos sociais e os direitos das outras pessoas.", isUpper), isCorrect: false, feedback: applyUppercaseIfNeeded("Pense na importância do respeito coletivo.", isUpper) },
          ],
        },
      })),
    };
  }

  const regularQuestions = [
    { axis: "Gênese Histórica e Estrutural", q: `Que processos históricos e sociais explicam o surgimento e a relevância de "${topic}" na sociedade moderna?` },
    { axis: "Instituições e Controle Social", q: `De que maneira as instituições sociais (Estado, escola, leis, mídia) atuam na configuração de "${topic}"?` },
    { axis: "Assimetrias e Estratificação", q: `Como as desigualdades de classe, poder ou acesso a direitos se manifestam no debate sobre "${topic}"?` },
    { axis: "Atores e Movimentos Sociais", q: `Qual é o papel dos movimentos sociais e da participação cidadã nas transformações relacionadas a "${topic}"?` },
    { axis: "Realidade Brasileira Contemporânea", q: `Analisando o contexto brasileiro atual, qual evidência empírica demonstra o impacto direto de "${topic}"?` },
    { axis: "Síntese Teórica da Sociologia", q: `Comparando o senso comum com a análise científica da ${subject}, como devemos interpretar "${topic}"?` },
  ];

  return {
    introText: `Desafio KronoGames de ${subject}: "${topic}".`,
    stages: regularQuestions.slice(0, stageCount).map((item, idx) => ({
      id: `stage-${idx + 1}`,
      title: `Desafio ${idx + 1}: ${item.axis}`,
      scenario: item.q,
      clue: "",
      options: [
        { text: `Analisar "${topic}" a partir das relações históricas, institucionais e de poder que estruturam a coletividade.`, isCorrect: true, pointsWeight: 10, feedback: "Excelente! Interpretação sociológica rigorosa.", iconEmoji: "🎯" },
        { text: "Tratar o fenômeno como resultado exclusivo de escolhas individuais isoladas do contexto social.", isCorrect: false, pointsWeight: 0, feedback: "A Sociologia demonstra que os fenômenos humanos estão inseridos em estruturas coletivas.", iconEmoji: "❌" },
        { text: "Considerar que as estruturas sociais são naturais, imutáveis e independentes da ação histórica.", isCorrect: false, pointsWeight: 0, feedback: "As instituições e relações sociais são construções históricas passíveis de mudança.", iconEmoji: "⚠️" },
        { text: "Basear a explicação apenas em opiniões imediatas sem verificação empírica ou conceitual.", isCorrect: false, pointsWeight: 0, feedback: "O conhecimento sociológico exige investigação empírica e rigor teórico.", iconEmoji: "🔎" },
      ],
    })),
  };
}

export async function POST(req: NextRequest) {
  let payload: RequestPayload = {};
  try {
    payload = await req.json();
    const {
      mode = "krono_game",
      gameMode = "millionaire",
      title = "Atividade Interativa",
      subject = "Sociologia",
      topic = "Cidadania e Sociedade",
      supportMaterial = "",
      customPrompt = "",
      questionCount,
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
    // 1. MODO AEE (LÚDICA vs PROFICIENTE) COM PROMPT DIRETO + MATERIAL DE APOIO
    // ==========================================================================
    if (mode === "adapted_aee") {
      const isOnlyPlayful = aeeMechanic === "visual_cards" || aeeMechanic === "social_story";
      const targetStages = Math.max(1, Math.min(10, questionCount || 6));

      const aeePrompt = [
        isOnlyPlayful
          ? "Você é um Especialista em Educação Especial Inclusiva (AEE - Laudos Severos / Comunicação Visual)."
          : "Você é um Especialista em Educação Especial Inclusiva (AEE - Laudos Leves/Moderados, TDAH, Dislexia, TEA Nível 1/2).",
        `SEMENTE DE ORIGINALIDADE: ${creativeSeed}`,
        `TEMA CENTRAL: "${topic}" (${subject}) | TÍTULO: "${title}"`,
        `QUANTIDADE DE ETAPAS: Gere EXATAMENTE ${targetStages} etapas COMPLETAMENTE DISTINTAS entre si.`,
        customPrompt.trim()
          ? `⚡ DIRETRIZ SOBERANA / PROMPT DO PROFESSOR (OBRIGATÓRIO SEGUIR FIELMENTE):\n"""\n${customPrompt.trim()}\n"""`
          : "⚡ DIRETRIZ: Crie situações inéditas, criativas, variadas e diretamente ligadas ao tema.",
        supportMaterial.trim()
          ? `📚 MATERIAL DE APOIO / TEXTO BASE DO ALUNO (USE COMO FONTE DE CONTEÚDO):\n"""\n${supportMaterial.trim()}\n"""`
          : "",
        "REGRAS ANTI-REPETIÇÃO:",
        "- PROIBIDO repetir a mesma estrutura de frase ou o mesmo texto de orientação nas etapas.",
        "- Cada etapa deve explorar um ângulo, cena ou caso concreto diferente do tema.",
        `- Caixa Alta: ${isUppercase ? "SIM, ESCREVA TODOS OS TEXTOS EM LETRAS MAIÚSCULAS" : "Escrita normal"}.`,
        isOnlyPlayful
          ? 'Retorne EXCLUSIVAMENTE um JSON válido: { "introText": string, "stages": [ { "id": "stage-1", "title": string, "scenario": string, "clue": "", "options": [ { "text": string, "isCorrect": true, "pointsWeight": 10, "feedback": string, "iconEmoji": string }, { "text": string, "isCorrect": false, "pointsWeight": 0, "feedback": string, "iconEmoji": string } ], "pneSevereStage": { "playfulPrompt": string, "visualCards": [ { "iconEmoji": string, "label": string, "isCorrect": true, "feedback": string }, { "iconEmoji": string, "label": string, "isCorrect": false, "feedback": string }, { "iconEmoji": string, "label": string, "isCorrect": false, "feedback": string } ] } } ] }'
          : 'Retorne EXCLUSIVAMENTE um JSON válido: { "introText": string, "stages": [ { "id": "stage-1", "title": string, "scenario": string, "clue": "", "options": [ { "text": string, "isCorrect": true, "pointsWeight": 10, "feedback": string, "iconEmoji": "✅" }, { "text": string, "isCorrect": false, "pointsWeight": 0, "feedback": string, "iconEmoji": "❌" } ], "pneMildStage": { "scenario": string, "options": [ { "text": string, "isCorrect": true, "feedback": string }, { "text": string, "isCorrect": false, "feedback": string } ] } } ] }',
      ]
        .filter(Boolean)
        .join("\n\n");

      for (const model of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: [{ role: "user", parts: [{ text: aeePrompt }] }],
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
    }

    // ==========================================================================
    // 2. MODO DEBATE SEM PAPEL: PERGUNTAS DIRETAS E INÉDITAS (ZERO REPETIÇÃO)
    // ==========================================================================
    if (gameMode === "debate_paperless") {
      const targetQuestionsPerGroup = Math.max(1, Math.min(10, questionCount || 6));

      const debatePrompt = [
        `Você é um Professor Doutor em ${subject} do Ensino Médio. Estruture um DEBATE SOCIOLÓGICO SEM PAPEL sobre o tema "${topic}" (Título: "${title}").`,
        `SEMENTE CRIATIVA: ${creativeSeed}`,
        customPrompt.trim()
          ? `⚡ DIRETRIZ SOBERANA / REGRAS DO JOGO DEFINIDAS PELO PROFESSOR (PRIORIDADE MÁXIMA):\n"""\n${customPrompt.trim()}\n"""`
          : `⚡ DIRETRIZ: Formule perguntas sociológicas diretas, instigantes e específicas sobre "${topic}".`,
        supportMaterial.trim()
          ? `📚 MATERIAL DE APOIO / TEXTO BASE PARA OS ALUNOS (FONTE DE CONTEÚDO):\n"""\n${supportMaterial.trim()}\n"""`
          : "",
        `QUANTIDADE: Gere EXATAMENTE ${targetQuestionsPerGroup} perguntas para o grupo PRÓ (proQuestions), ${targetQuestionsPerGroup} perguntas para o grupo CONTRA (contraQuestions) e ${targetQuestionsPerGroup} perguntas para os JURADOS (jurorQuestions), caso o professor não tenha especificado outro número no prompt acima.`,
        "REGRAS OBRIGATÓRIAS DE QUALIDADE (PROIBIDO REPETIR TEXTO):",
        "1. NUNCA repita a mesma frase ou estrutura entre as questões.",
        "2. NÃO coloque prefixos mecânicos como '[Pesquisa PRÓ #1] Considerando o tema...' nem textos de orientação genéricos ('pesquise dados, conceitos sociológicos...'). Escreva APENAS A PERGUNTA DIRETA, clara, profunda e diferente em cada item.",
        "3. Deixe o campo \"researchHint\" sempre vazio (\"\") — não exiba textos de orientação repetitivos.",
        'Retorne EXCLUSIVAMENTE um JSON válido com: { "introText": string, "proQuestions": [{ "sociologicalConcept": string, "prompt": string, "researchHint": "" }], "contraQuestions": [{ "sociologicalConcept": string, "prompt": string, "researchHint": "" }], "jurorQuestions": [{ "sociologicalConcept": string, "prompt": string, "researchHint": "" }], "checklistCriteria": [{ "title": string, "description": string }], "jurorInitialGuide": string, "proSummaryAI": "Resumo elaborado em 3 parágrafos com o gabarito comentado das 6 questões da Bancada PRÓ", "contraSummaryAI": "Resumo elaborado em 3 parágrafos com o gabarito comentado das 6 questões da Bancada CONTRA", "jurorGuideAI": "Resumo elaborado em 3 parágrafos orientando a análise das 6 questões do Corpo de Jurados" }',
      ]
        .filter(Boolean)
        .join("\n\n");

      for (const model of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: [{ role: "user", parts: [{ text: debatePrompt }] }],
            config: { responseMimeType: "application/json", temperature: 0.85 },
          });
          if (response && response.text) {
            const cleaned = response.text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
            const parsed = JSON.parse(cleaned);
            const fallbackCfg = createFallbackDebateConfig(topic, subject, targetQuestionsPerGroup);
            const debateConfig: any = {
              maxJurors: 3,
              proQuestions:
                Array.isArray(parsed.proQuestions) && parsed.proQuestions.length > 0
                  ? parsed.proQuestions.map((q: any, i: number) => ({
                      id: `pro_q_${i + 1}`,
                      number: i + 1,
                      side: "pro" as const,
                      sociologicalConcept:
                        q.sociologicalConcept ||
                        (fallbackCfg.proQuestions[i] || fallbackCfg.proQuestions[0]).sociologicalConcept,
                      prompt:
                        q.prompt ||
                        (fallbackCfg.proQuestions[i] || fallbackCfg.proQuestions[0]).prompt,
                      researchHint: "",
                    }))
                  : fallbackCfg.proQuestions,
              contraQuestions:
                Array.isArray(parsed.contraQuestions) && parsed.contraQuestions.length > 0
                  ? parsed.contraQuestions.map((q: any, i: number) => ({
                      id: `contra_q_${i + 1}`,
                      number: i + 1,
                      side: "contra" as const,
                      sociologicalConcept:
                        q.sociologicalConcept ||
                        (fallbackCfg.contraQuestions[i] || fallbackCfg.contraQuestions[0]).sociologicalConcept,
                      prompt:
                        q.prompt ||
                        (fallbackCfg.contraQuestions[i] || fallbackCfg.contraQuestions[0]).prompt,
                      researchHint: "",
                    }))
                  : fallbackCfg.contraQuestions,
              jurorQuestions:
                Array.isArray(parsed.jurorQuestions) && parsed.jurorQuestions.length > 0
                  ? parsed.jurorQuestions.map((q: any, i: number) => ({
                      id: `juror_q_${i + 1}`,
                      number: i + 1,
                      side: "juror" as const,
                      sociologicalConcept:
                        q.sociologicalConcept ||
                        (fallbackCfg.jurorQuestions![i] || fallbackCfg.jurorQuestions![0]).sociologicalConcept,
                      prompt:
                        q.prompt ||
                        (fallbackCfg.jurorQuestions![i] || fallbackCfg.jurorQuestions![0]).prompt,
                      researchHint: "",
                    }))
                  : fallbackCfg.jurorQuestions,
              checklistCriteria:
                Array.isArray(parsed.checklistCriteria) && parsed.checklistCriteria.length > 0
                  ? parsed.checklistCriteria.map((c: any, i: number) => ({
                      id: `crit_${i + 1}`,
                      number: i + 1,
                      title:
                        c.title ||
                        c.criterion ||
                        (fallbackCfg.checklistCriteria[i] || fallbackCfg.checklistCriteria[0]).title,
                      description:
                        c.description ||
                        (fallbackCfg.checklistCriteria[i] || fallbackCfg.checklistCriteria[0]).description,
                    }))
                  : fallbackCfg.checklistCriteria,
              jurorInitialGuide: parsed.jurorInitialGuide || fallbackCfg.jurorInitialGuide,
              proSummaryAI: parsed.proSummaryAI || (fallbackCfg as any).proSummaryAI,
              contraSummaryAI: parsed.contraSummaryAI || (fallbackCfg as any).contraSummaryAI,
              jurorGuideAI: parsed.jurorGuideAI || parsed.jurorInitialGuide || (fallbackCfg as any).jurorGuideAI,
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
    // 3. TODOS OS JOGOS DE SALA E DE CASA (KRONOGAMES): PROMPT DE REGRAS + APOIO
    // ==========================================================================
    const targetStages = Math.max(1, Math.min(12, questionCount || 6));
    const regularPrompt = [
      `Você é um Professor Doutor em ${subject} e Game Designer Pedagógico do Ensino Médio.`,
      `Crie um jogo avaliativo completo na modalidade "${gameMode}" sobre o tema "${topic}" (Título: "${title}").`,
      `SEMENTE CRIATIVA: ${creativeSeed}`,
      `QUANTIDADE DE FASES/QUESTÕES: Gere EXATAMENTE ${targetStages} fases inéditas e progressivas.`,
      customPrompt.trim()
        ? `⚡ DIRETRIZ SOBERANA / REGRAS DO JOGO DEFINIDAS PELO PROFESSOR (OBRIGATÓRIO CUMPRIR):\n"""\n${customPrompt.trim()}\n"""`
        : `⚡ DIRETRIZ: Crie desafios instigantes, sem repetir enunciados, conectando conceitos de ${subject} à realidade prática.`,
      supportMaterial.trim()
        ? `📚 MATERIAL DE APOIO / TEXTO BASE DO ALUNO (FONTE DE CONTEÚDO PARA AS QUESTÕES):\n"""\n${supportMaterial.trim()}\n"""`
        : "",
      "REGRAS DE QUALIDADE:",
      "- Cada fase deve apresentar uma pergunta ou situação-problema única, direta e sem textos genéricos repetidos.",
      "- As 4 alternativas de cada fase devem ser plausíveis, tendo 1 correta (pointsWeight: 10) e 3 incorretas (pointsWeight: 0) com feedbacks explicativos reais.",
      'Retorne EXCLUSIVAMENTE um JSON válido com: { "introText": string, "stages": [ { "id": "stage-1", "title": string, "scenario": string, "clue": string, "options": [ { "text": string, "isCorrect": true, "pointsWeight": 10, "feedback": string, "iconEmoji": "🎯" }, { "text": string, "isCorrect": false, "pointsWeight": 0, "feedback": string, "iconEmoji": "❌" }, { "text": string, "isCorrect": false, "pointsWeight": 0, "feedback": string, "iconEmoji": "⚠️" }, { "text": string, "isCorrect": false, "pointsWeight": 0, "feedback": string, "iconEmoji": "🔎" } ] } ] }',
    ]
      .filter(Boolean)
      .join("\n\n");

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
