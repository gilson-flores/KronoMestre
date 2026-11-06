import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient, isGeminiAuthError } from "@/lib/gemini";
import {
  GameData,
  GameMode,
  AeeMechanic,
  AeePromptSettings,
  GameStage,
  AdaptationRecommendation,
  DebateConfig,
} from "@/lib/types";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

interface RequestPayload {
  mode: "krono_game" | "adapted_aee";
  title: string;
  subject?: string;
  topic?: string;
  supportMaterial?: string;
  gameMode?: GameMode;
  aeeMechanic?: AeeMechanic;
  aeePromptSettings?: AeePromptSettings;
  adaptationRecommendation?: AdaptationRecommendation;
}

function buildFallbackDebateConfig(safeTopic: string, safeSubject: string, supportMaterial: string): DebateConfig {
  const scriptLines = supportMaterial
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 8);

  const proFocuses = [
    "Fundamentos históricos e conquistas sociais",
    "Dados empíricos e impactos positivos na cidadania",
    "Conceitos sociológicos clássicos de coesão e direitos",
    "Exemplos práticos na realidade brasileira",
    "Políticas públicas e fortalecimento democrático",
    "Síntese propositiva para a defesa da Bancada Pró",
  ];

  const contraFocuses = [
    "Contradições estruturais e limites práticos",
    "Crítica sociológica às desigualdades e assimetrias de poder",
    "Dados empíricos sobre exclusão ou efeitos colaterais",
    "Análise de interesses hegemônicos e ideologia",
    "Impactos críticos no cotidiano da população brasileira",
    "Síntese de refutação para a defesa da Bancada Contra",
  ];

  return {
    maxJurors: 3,
    proQuestions: proFocuses.map((focus, idx) => ({
      id: `pro_q_${idx + 1}`,
      number: idx + 1,
      side: "pro",
      sociologicalConcept: scriptLines[idx] || focus,
      prompt: `[Pesquisa PRÓ #${idx + 1}] Considerando o tema "${safeTopic}" (${safeSubject}) e o eixo "${scriptLines[idx] || focus}", pesquise e elabore um argumento fundamentado com fatos e conceitos sociológicos que sustentem a posição FAVORÁVEL da sua bancada.`,
      researchHint: "Busque dados reais, exemplos históricos ou conceitos sociológicos trabalhados em aula para comprovar este ponto.",
    })),
    contraQuestions: contraFocuses.map((focus, idx) => ({
      id: `contra_q_${idx + 1}`,
      number: idx + 1,
      side: "contra",
      sociologicalConcept: scriptLines[idx] || focus,
      prompt: `[Pesquisa CONTRA #${idx + 1}] Considerando o tema "${safeTopic}" (${safeSubject}) e o eixo "${scriptLines[idx] || focus}", pesquise e elabore um argumento crítico fundamentado com dados e conceitos sociológicos que sustentem o QUESTIONAMENTO/OPOSIÇÃO da sua bancada.`,
      researchHint: "Identifique contradições sociais, limites práticos, relações de poder e evidências que contestem a visão dominante.",
    })),
    checklistCriteria: [
      { id: "chk_1", number: 1, criterion: "Domínio Conceitual Sociológico", description: "A bancada utilizou corretamente conceitos e autores da Sociologia pertinentes ao tema?" },
      { id: "chk_2", number: 2, criterion: "Uso de Dados e Evidências Reais", description: "Os debatedores apresentaram exemplos concretos, fatos históricos ou dados da realidade brasileira?" },
      { id: "chk_3", number: 3, criterion: "Coerência com o Resumo de Pesquisa", description: "A equipe articulou bem os 6 pontos pesquisados e o resumo estruturado do grupo?" },
      { id: "chk_4", number: 4, criterion: "Capacidade de Réplica e Tréplica", description: "O grupo respondeu diretamente aos argumentos adversários sem fugir do tema ou usar falácias?" },
      { id: "chk_5", number: 5, criterion: "Respeito ao Tempo (Timer KronoMestre)", description: "A bancada organizou a fala respeitando o cronômetro de exposição, réplica, tréplica e conclusão?" },
      { id: "chk_6", number: 6, criterion: "Postura Ética e Democrática", description: "Manteve o respeito mútuo, a escuta ativa e o rigor acadêmico durante todo o debate?" },
    ],
    jurorInitialGuide: `Vocês 3 formam o Corpo de Jurados de Sociologia sobre "${safeTopic}". Enquanto as Bancadas Pró e Contra realizam suas 6 pesquisas norteadoras, acompanhem os conceitos centrais do roteiro do professor. Ao término das pesquisas, a IA gerará o Dossiê Guia exclusivo dos Jurados para orientar o julgamento com os 2 Checklists (Pró e Contra).`,
    participants: [],
    proAnswers: {},
    contraAnswers: {},
    proResearchCompleted: false,
    contraResearchCompleted: false,
    jurorVerdicts: [],
    gradingMode: "group",
  };
}

function generateFallbackInteractiveData(payload: RequestPayload): GameData {
  const {
    mode,
    title,
    subject = "Sociologia",
    topic = "Cidadania e Sociedade",
    supportMaterial = "",
    gameMode = "millionaire",
    aeeMechanic = "visual_cards",
    aeePromptSettings,
  } = payload;

  const safeTopic = topic || title || "Sociedade e Cidadania";
  const safeSubject = subject || "Sociologia";
  const isUppercase = Boolean(aeePromptSettings?.uppercaseText);
  const formatText = (text: string) => (isUppercase ? text.toUpperCase() : text);

  const scriptLines = supportMaterial
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 8);

  if (mode === "adapted_aee") {
    const intro = `Atividade Adaptada Interativa de ${safeSubject} sobre "${safeTopic}" (Mecânica: ${aeeMechanic}).`;
    const aeeStages: GameStage[] = Array.from({ length: 6 }).map((_, idx) => {
      const refLine = scriptLines[idx] || `Análise prática do conceito ${idx + 1} sobre ${safeTopic}`;
      return {
        id: `stage-${idx + 1}`,
        title: formatText(`Fase ${idx + 1}: ${refLine.slice(0, 48)}`),
        scenario: formatText(`Considerando "${refLine}", qual atitude promove a cidadania, a cooperação e a compreensão crítica de ${safeTopic}?`),
        clue: formatText("Dica Pedagógica: Observe como o diálogo, a empatia e os direitos coletivos fortalecem a sociedade."),
        options: [
          {
            text: formatText(`Agir com consciência coletiva, diálogo e respeito aos direitos em relação a ${safeTopic}.`),
            isCorrect: true,
            pointsWeight: 10,
            feedback: formatText("Excelente! A cooperação e a análise consciente transformam a convivência social."),
            iconEmoji: "🎯",
          },
          {
            text: formatText("Ignorar o coletivo e agir sem considerar as consequências para os demais."),
            isCorrect: false,
            pointsWeight: 0,
            feedback: formatText("Atenção: Na vida em sociedade, nossas escolhas impactam toda a comunidade."),
            iconEmoji: "❌",
          },
        ],
        pneMildStage: {
          scenario: formatText(`Sobre ${safeTopic} (Etapa ${idx + 1}), qual é a melhor escolha?`),
          options: [
            { text: formatText("Cooperar, dialogar e respeitar os direitos de todos"), isCorrect: true, feedback: formatText("Muito bem! Respeito e diálogo constroem a cidadania.") },
            { text: formatText("Desrespeitar as regras e excluir os colegas"), isCorrect: false, feedback: formatText("Tente novamente: na sociedade todos devem ser respeitados.") },
          ],
        },
        pneSevereStage: {
          playfulPrompt: formatText("Toque no cartão visual que representa cooperação e atitude positiva:"),
          visualCards: [
            { iconEmoji: "🤝", label: formatText("Cooperação e Diálogo"), isCorrect: true, feedback: formatText("Parabéns! Cooperar é o caminho certo!") },
            { iconEmoji: "🛑", label: formatText("Exclusão"), isCorrect: false, feedback: formatText("Procure o cartão que mostra união!") },
            { iconEmoji: "⚡", label: formatText("Conflito"), isCorrect: false, feedback: formatText("Toque no cartão das mãos unidas!") },
          ],
        },
      };
    });

    return { introText: formatText(intro), stages: aeeStages };
  }

  if (gameMode === "debate_paperless") {
    const debateConfig = buildFallbackDebateConfig(safeTopic, safeSubject, supportMaterial);
    const stagesFromDebate: GameStage[] = debateConfig.proQuestions.map((q, idx) => ({
      id: `stage-${idx + 1}`,
      title: `Eixo Norteador ${idx + 1}: ${q.sociologicalConcept.slice(0, 48)}`,
      scenario: `[PRÓ]: ${q.prompt}\n\n[CONTRA]: ${debateConfig.contraQuestions[idx]?.prompt || ""}`,
      clue: q.researchHint,
      options: [
        { text: "Pesquisa Dissertativa Pró / Contra + Avaliação por Jurados", isCorrect: true, pointsWeight: 10, feedback: "Questão norteadora registrada no dossiê do grupo.", iconEmoji: "🎙️" },
        { text: "Aguardando submissão da bancada", isCorrect: false, pointsWeight: 0, feedback: "Preencha a pesquisa no modo Debate.", iconEmoji: "⏳" },
      ],
    }));

    return {
      introText: `🎙️ DEBATE SOCIOLÓGICO SEM PAPEL — "${safeTopic}" (${safeSubject})
1) INSCRIÇÃO DE PAPÉIS: Alunos se dividem entre Bancada PRÓ, Bancada CONTRA e 3 JURADOS.
2) PESQUISA NORTEADORA: 6 questões dissertativas para a Bancada Pró e 6 questões dissertativas para a Bancada Contra.
3) SÍNTESE DA IA: Ao concluir a pesquisa, a IA gera 3 resumos exclusivos (Pró, Contra e Guia dos Jurados) visíveis para todos do grupo.
4) DEBATE EM SALA & PARECER: O professor controla o Timer (Exposição, Réplica, Tréplica e Considerações Finais) e os Jurados preenchem os 2 Checklists.`,
      stages: stagesFromDebate,
      debateConfig,
    };
  }

  const stages: GameStage[] = Array.from({ length: 6 }).map((_, idx) => {
    const scriptSegment = scriptLines[idx] || `Análise Sociológica — Etapa ${idx + 1} sobre ${safeTopic}`;
    return {
      id: `stage-${idx + 1}`,
      title: `Fase ${idx + 1}: ${scriptSegment.slice(0, 52)}`,
      scenario: `[Investigação Sociológica ${idx + 1}] ${scriptSegment}. Considerando o tema "${safeTopic}", qual interpretação sociológica explica este fenômeno com rigor?`,
      clue: "Dica Sociológica: Analise as estruturas sociais, relações de poder, cultura e cidadania.",
      options: [
        {
          text: `Compreender o fenômeno a partir das estruturas históricas, relações sociais e conceitos de ${safeSubject} sobre ${safeTopic}.`,
          isCorrect: true,
          pointsWeight: 10,
          feedback: "Excelente análise sociológica! Você conectou teoria e realidade social com precisão.",
          iconEmoji: "🎯",
        },
        {
          text: "Reduzir o fenômeno a opiniões isoladas do senso comum sem considerar o contexto histórico e social.",
          isCorrect: false,
          pointsWeight: 0,
          feedback: "Atenção: A Sociologia supera o senso comum ao investigar causas estruturais e coletivas.",
          iconEmoji: "❌",
        },
      ],
      pneMildStage: {
        scenario: `Etapa ${idx + 1} sobre ${safeTopic}: como a Sociologia explica esta situação?`,
        options: [
          { text: "Analisando a história, a sociedade e os direitos de todos", isCorrect: true, feedback: "Muito bem! Você acertou em cheio!" },
          { text: "Olhando apenas opiniões sem pesquisar a realidade", isCorrect: false, feedback: "Na Sociologia, sempre pesquisamos a realidade coletiva." },
        ],
      },
      pneSevereStage: {
        playfulPrompt: "Toque no cartão que mostra pesquisa e união social:",
        visualCards: [
          { iconEmoji: "🌟", label: "Sociedade e Direitos", isCorrect: true, feedback: "Parabéns! Escolha perfeita!" },
          { iconEmoji: "🛑", label: "Isolamento", isCorrect: false, feedback: "Toque na estrela brilhante!" },
          { iconEmoji: "⚡", label: "Conflito", isCorrect: false, feedback: "Escolha o cartão da estrela!" },
        ],
      },
    };
  });

  return {
    introText: `🎮 Missão KronoGames de ${safeSubject}: "${title || safeTopic}". Superem as 6 etapas de investigação sociológica baseadas no roteiro da aula!`,
    stages,
  };
}

export async function POST(req: NextRequest) {
  let payload: RequestPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Payload JSON inválido." }, { status: 400 });
  }

  const {
    mode = "krono_game",
    title = "Atividade Interativa",
    subject = "Sociologia",
    topic = "Sociedade e Cidadania",
    supportMaterial = "",
    gameMode = "millionaire",
    aeeMechanic = "visual_cards",
    aeePromptSettings,
  } = payload;

  const ai = getGeminiClient();

  if (!ai) {
    const fallbackData = generateFallbackInteractiveData(payload);
    return NextResponse.json({ gameData: fallbackData, isFallback: true });
  }

  try {
    const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"];
    let generatedText: string | null = null;
    const creativeSeed = `SEED-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    // Ramo específico para DEBATE SEM PAPEL (Sociologia Pura: 6 Questões Pró + 6 Questões Contra + 2 Checklists de Jurados)
    if (mode === "krono_game" && gameMode === "debate_paperless") {
      const debatePrompt = `Você é um Professor Doutor em Sociologia e Arquiteto Pedagógico do Ensino Médio.
SEMENTE CRIATIVA ÚNICA: ${creativeSeed}
Sua missão é estruturar uma atividade completa de DEBATE SOCIOLÓGICO SEM PAPEL sobre:
- Título: "${title}"
- Tema Central: "${topic}"
- Disciplina: "${subject}"
- Roteiro Prévio do Professor (OBRIGATÓRIO SEGUIR INTEGRALMENTE):
"""
${supportMaterial || "Explore autores clássicos e contemporâneos da Sociologia (como Hannah Arendt, Gramsci, Durkheim, Weber, Marx, Bourdieu, Foucault) aplicados à realidade brasileira."}
"""

COMO FUNCIONA O DEBATE:
1. Os alunos se dividem em Bancada PRÓ, Bancada CONTRA e 3 JURADOS.
2. Crie EXATAMENTE 6 questões dissertativas norteadoras para o grupo PRÓ pesquisar (focadas em fundamentar a tese favorável com conceitos sociológicos e dados reais).
3. Crie EXATAMENTE 6 questões dissertativas norteadoras para o grupo CONTRA pesquisar (focadas em fundamentar o contraponto crítico, tensões estruturais e dados empíricos).
4. Crie um texto orientador inicial para os 3 Jurados ("jurorInitialGuide") e EXATAMENTE 6 critérios claros de avaliação ("checklistCriteria") que serão usados nos 2 Checklists (Cumpriu / Não Cumpriu) para julgar os lados Pró e Contra.
5. NÃO mencione "Teoria dos Jogos". Use exclusivamente referencial de SOCIOLOGIA.

Retorne EXCLUSIVAMENTE um JSON válido no formato exato abaixo:
{
  "introText": "Texto apresentando o tema sociológico do debate, a divisão entre Bancada Pró, Bancada Contra e 3 Jurados, a etapa de pesquisa norteadora e o debate ao vivo com cronômetro.",
  "proQuestions": [
    {
      "id": "pro_q_1",
      "number": 1,
      "side": "pro",
      "sociologicalConcept": "Nome do conceito ou autor sociológico do eixo 1",
      "prompt": "Pergunta dissertativa norteadora 1 para orientar a pesquisa da Bancada PRÓ...",
      "researchHint": "Dica prática do que os alunos do grupo Pró devem pesquisar e citar..."
    }
  ],
  "contraQuestions": [
    {
      "id": "contra_q_1",
      "number": 1,
      "side": "contra",
      "sociologicalConcept": "Nome do conceito ou tensão sociológica do eixo 1",
      "prompt": "Pergunta dissertativa norteadora 1 para orientar a pesquisa da Bancada CONTRA...",
      "researchHint": "Dica prática do que os alunos do grupo Contra devem pesquisar e problematizar..."
    }
  ],
  "jurorInitialGuide": "Orientação sociológica clara para os 3 jurados sobre o que observar nas teses Pró e Contra.",
  "checklistCriteria": [
    {
      "id": "chk_1",
      "number": 1,
      "criterion": "Título curto do critério 1",
      "description": "Pergunta direta para o jurado marcar Cumpriu ou Não Cumpriu..."
    }
  ]
}`;

      for (const model of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: [{ role: "user", parts: [{ text: debatePrompt }] }],
            config: {
              responseMimeType: "application/json",
              temperature: 0.85,
            },
          });
          if (response && response.text) {
            generatedText = response.text;
            break;
          }
        } catch (err: any) {
          if (isGeminiAuthError(err)) break;
          console.warn(`[Debate Generator] Falha no modelo ${model}:`, err?.message || err);
        }
      }

      if (generatedText) {
        try {
          const cleaned = generatedText.replace(/^\`\`\`json\s*/i, "").replace(/\s*\`\`\`$/i, "").trim();
          const parsed = JSON.parse(cleaned);
          const fallbackCfg = buildFallbackDebateConfig(topic, subject, supportMaterial);

          const proQuestions = Array.isArray(parsed.proQuestions) && parsed.proQuestions.length > 0
            ? parsed.proQuestions.slice(0, 6).map((q: any, i: number) => ({
                id: `pro_q_${i + 1}`,
                number: i + 1,
                side: "pro" as const,
                sociologicalConcept: q.sociologicalConcept || `Eixo Sociológico ${i + 1}`,
                prompt: q.prompt || fallbackCfg.proQuestions[i].prompt,
                researchHint: q.researchHint || fallbackCfg.proQuestions[i].researchHint,
              }))
            : fallbackCfg.proQuestions;

          const contraQuestions = Array.isArray(parsed.contraQuestions) && parsed.contraQuestions.length > 0
            ? parsed.contraQuestions.slice(0, 6).map((q: any, i: number) => ({
                id: `contra_q_${i + 1}`,
                number: i + 1,
                side: "contra" as const,
                sociologicalConcept: q.sociologicalConcept || `Eixo Crítico ${i + 1}`,
                prompt: q.prompt || fallbackCfg.contraQuestions[i].prompt,
                researchHint: q.researchHint || fallbackCfg.contraQuestions[i].researchHint,
              }))
            : fallbackCfg.contraQuestions;

          const checklistCriteria = Array.isArray(parsed.checklistCriteria) && parsed.checklistCriteria.length > 0
            ? parsed.checklistCriteria.slice(0, 6).map((c: any, i: number) => ({
                id: `chk_${i + 1}`,
                number: i + 1,
                criterion: c.criterion || fallbackCfg.checklistCriteria[i].criterion,
                description: c.description || fallbackCfg.checklistCriteria[i].description,
              }))
            : fallbackCfg.checklistCriteria;

          const debateConfig: DebateConfig = {
            maxJurors: 3,
            proQuestions,
            contraQuestions,
            checklistCriteria,
            jurorInitialGuide: parsed.jurorInitialGuide || fallbackCfg.jurorInitialGuide,
            participants: [],
            proAnswers: {},
            contraAnswers: {},
            proResearchCompleted: false,
            contraResearchCompleted: false,
            jurorVerdicts: [],
            gradingMode: "group",
          };

          const stages: GameStage[] = proQuestions.map((pq: any, idx: number) => {
            const cq = contraQuestions[idx] || pq;
            return {
              id: `stage-${idx + 1}`,
              title: `Eixo ${idx + 1}: ${pq.sociologicalConcept}`,
              scenario: `[PESQUISA PRÓ #${idx + 1}]: ${pq.prompt}\n\n[PESQUISA CONTRA #${idx + 1}]: ${cq.prompt}`,
              clue: `Dica Pró: ${pq.researchHint} | Dica Contra: ${cq.researchHint}`,
              options: [
                { text: `Questão Norteadora Pró #${idx + 1}: ${pq.prompt}`, isCorrect: true, pointsWeight: 10, feedback: pq.researchHint, iconEmoji: "🟢" },
                { text: `Questão Norteadora Contra #${idx + 1}: ${cq.prompt}`, isCorrect: true, pointsWeight: 10, feedback: cq.researchHint, iconEmoji: "🔴" },
              ],
            };
          });

          return NextResponse.json({
            gameData: {
              introText: parsed.introText || `Debate Sociológico Sem Papel sobre "${topic}".`,
              stages,
              debateConfig,
            },
            isFallback: false,
          });
        } catch (parseErr) {
          console.warn("[Debate Generator] Erro ao parsear JSON do debate:", parseErr);
        }
      }

      const fallbackData = generateFallbackInteractiveData(payload);
      return NextResponse.json({ gameData: fallbackData, isFallback: true });
    }

    // Demais modalidades (AEE e Jogos Sociológicos)
    const isAee = mode === "adapted_aee";
    const isUppercase = Boolean(aeePromptSettings?.uppercaseText);

    const gameModeInstructions: Record<string, string> = {
      millionaire: "ARENA DO MILHÃO DE SOCIOLOGIA: Crie 6 rodadas progressivas de análise sociológica baseadas integralmente no roteiro do professor.",
      dialectic_tribunal: "TRIBUNAL DIALÉTICO DE SOCIOLOGIA: Crie 6 casos de julgamento sociológico analisando teses em conflito, relações de poder, hegemonia e direitos humanos.",
      structural_detective: "DETETIVE ESTRUTURAL DE SOCIOLOGIA: Crie 6 cenas de investigação sociológica onde indícios empíricos revelam estruturas sociais, desigualdades e instituições.",
      rpg_campaign: "CRÔNICAS DA PÓLIS (RPG SOCIOLÓGICO): Crie 6 capítulos onde o estudante toma decisões éticas, políticas e cidadãs diante de problemas reais da comunidade.",
      real_life_lab: "LABORATÓRIO DA VIDA REAL (SOCIOLOGIA APLICADA): Crie 6 simulações práticas do cotidiano brasileiro conectando conceitos sociológicos à vida dos jovens.",
    };

    const systemPrompt = isAee
      ? `Você é um Arquiteto Pedagógico Mestre de Educação Especial (AEE) em Sociologia.
SEMENTE CRIATIVA: ${creativeSeed}
Crie 6 estágios inéditos sobre "${topic}" (${subject}) - Título: "${title}" - Mecânica: "${aeeMechanic}".
Roteiro do Professor:
"""
${supportMaterial || "Exemplos práticos do cotidiano escolar e comunitário."}
"""
Caixa alta: ${isUppercase ? "SIM, TUDO EM MAIÚSCULAS" : "Normal"}.`
      : `Você é um Professor Doutor em Sociologia e Game Designer Pedagógico do Ensino Médio.
SEMENTE CRIATIVA ÚNICA: ${creativeSeed}
Transforme o tema "${topic}" da disciplina "${subject}" (Título: "${title}") em uma atividade de 6 ESTÁGIOS INÉDITOS baseada exclusivamente em SOCIOLOGIA!
Modalidade: ${gameModeInstructions[gameMode] || gameModeInstructions.millionaire}
Roteiro Prévio do Professor (OBRIGATÓRIO SEGUIR INTEGRALMENTE NAS 6 FASES):
"""
${supportMaterial || "Desenvolva os conceitos sociológicos do tema aplicados à realidade brasileira."}
"""`;

    const prompt = `Retorne EXCLUSIVAMENTE um JSON válido com 6 estágios ("stage-1" a "stage-6"):
{
  "introText": "Texto de abertura apresentando o contexto sociológico e o roteiro do professor.",
  "stages": [
    {
      "id": "stage-1",
      "title": "Título da Fase 1",
      "scenario": "Contextualização e questão sociológica baseada no roteiro do professor...",
      "clue": "Pista teórica conectando autor ou conceito sociológico...",
      "options": [
        { "text": "Alternativa correta fundamentada na Sociologia...", "isCorrect": true, "pointsWeight": 10, "feedback": "Explicação sociológica detalhada...", "iconEmoji": "🎯" },
        { "text": "Distrator plausível 1...", "isCorrect": false, "pointsWeight": 0, "feedback": "Explicação...", "iconEmoji": "❌" },
        { "text": "Distrator plausível 2...", "isCorrect": false, "pointsWeight": 0, "feedback": "Explicação...", "iconEmoji": "⚠️" },
        { "text": "Distrator plausível 3...", "isCorrect": false, "pointsWeight": 0, "feedback": "Explicação...", "iconEmoji": "🔎" }
      ],
      "pneMildStage": {
        "scenario": "Pergunta adaptada direta sobre o mesmo conceito...",
        "options": [
          { "text": "Opção correta...", "isCorrect": true, "feedback": "Explicação acolhedora..." },
          { "text": "Opção incorreta...", "isCorrect": false, "feedback": "Dica simples..." }
        ]
      },
      "pneSevereStage": {
        "playfulPrompt": "Comando visual...",
        "visualCards": [
          { "iconEmoji": "🤝", "label": "Conceito Correto", "isCorrect": true, "feedback": "Muito bem!" },
          { "iconEmoji": "🛑", "label": "Distrator 1", "isCorrect": false, "feedback": "Tente novamente!" },
          { "iconEmoji": "⚡", "label": "Distrator 2", "isCorrect": false, "feedback": "Observe o primeiro cartão!" }
        ]
      }
    }
  ]
}`;

    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }],
          config: {
            responseMimeType: "application/json",
            temperature: 0.9,
          },
        });

        if (response && response.text) {
          generatedText = response.text;
          break;
        }
      } catch (err: any) {
        if (isGeminiAuthError(err)) break;
        console.warn(`[Generate Interactive] Falha com modelo ${model}:`, err?.message || err);
      }
    }

    if (generatedText) {
      try {
        const cleaned = generatedText.replace(/^\`\`\`json\s*/i, "").replace(/\s*\`\`\`$/i, "").trim();
        const parsed: GameData = JSON.parse(cleaned);
        if ((parsed as any).submissions) delete (parsed as any).submissions;
        if ((parsed as any).students) delete (parsed as any).students;
        if ((parsed as any).grades) delete (parsed as any).grades;

        if (parsed && Array.isArray(parsed.stages) && parsed.stages.length > 0) {
          return NextResponse.json({ gameData: parsed, isFallback: false });
        }
      } catch (parseErr) {
        console.warn("[Generate Interactive] Erro ao parsear resposta da IA:", parseErr);
      }
    }

    const fallbackData = generateFallbackInteractiveData(payload);
    return NextResponse.json({ gameData: fallbackData, isFallback: true });
  } catch (error: any) {
    console.error("[Generate Interactive] Erro inesperado:", error);
    const fallbackData = generateFallbackInteractiveData(payload);
    return NextResponse.json({ gameData: fallbackData, isFallback: true });
  }
}
