import { Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient, isGeminiAuthError } from "@/lib/gemini";
import {
  GameData,
  GameMode,
  AeeMechanic,
  AeePromptSettings,
  GameStage,
  AdaptationRecommendation,
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

  // Extrai tópicos do roteiro do professor se fornecido
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
    return {
      introText: `🎙️ DEBATE SEM PAPEL & TEORIA DOS JOGOS — "${safeTopic}" (${safeSubject})
1) BANCADAS PRÓ E CONTRA: Centralizem argumentos, notícias e dados estatísticos no documento digital da bancada no celular/tablet.
2) AUDIÊNCIA ANALÍTICA: Avaliem em tempo real a qualidade dos argumentos, o uso de dados e o respeito ao tempo.
3) INTERAÇÃO Q&A: Enviem perguntas digitais para a fase de réplica sem interromper a fala controlada pelo KronoMestre projetado no quadro.
4) FECHAMENTO E PORTFÓLIO: Produzam o Infográfico Digital ou Mini-Podcast de 2 min consolidando a síntese do debate.`,
      stages: [
        {
          id: "stage-1",
          title: "Fase 1: Central do Debate & Preparação das Bancadas (Pró vs Contra)",
          scenario: `[BANCADAS PRÓ E CONTRA • TEORIA DOS JOGOS] Tema central: "${safeTopic}". ${scriptLines[0] || "As equipes acessam a Central do Debate via QR Code e estruturam seus argumentos com dados estatísticos e fontes confiáveis."} Qual estratégia gera o melhor equilíbrio argumentativo inicial?`,
          clue: "Teoria dos Jogos: Em um debate regrado de informação completa, vence a bancada que fundamenta sua tese em evidências empíricas e antecipa a réplica adversária.",
          options: [
            { text: "Dividir os papéis de fala no documento digital compartilhado, inserindo dados estatísticos, conceitos sociológicos e fontes verificáveis.", isCorrect: true, pointsWeight: 10, feedback: "Perfeito! A organização colaborativa sem papel garante precisão conceitual e fluidez no tempo de fala.", iconEmoji: "📑" },
            { text: "Improvisar falas isoladas baseadas apenas em impressões pessoais sem consultar fontes ou dividir tópicos na bancada.", isCorrect: false, pointsWeight: 0, feedback: "Risco estratégico alto: argumentos sem dados ou coordenação de bancada perdem força diante da audiência analítica.", iconEmoji: "⚠️" },
          ],
          pneMildStage: {
            scenario: "Como a equipe se prepara melhor para o Debate Sem Papel?",
            options: [
              { text: "Organizando ideias e dados verdadeiros junto com os colegas no celular", isCorrect: true, feedback: "Muito bem! A preparação em equipe deixa o debate claro e forte." },
              { text: "Falando sem pesquisar e sem combinar com o grupo", isCorrect: false, feedback: "Em equipe, pesquisar e combinar antes ajuda todos a participarem." },
            ],
          },
          pneSevereStage: {
            playfulPrompt: "Toque no cartão que mostra os colegas pesquisando e preparando o debate juntos:",
            visualCards: [
              { iconEmoji: "📱", label: "Equipe Preparada", isCorrect: true, feedback: "Excelente! Tudo organizado na tela para o debate!" },
              { iconEmoji: "🙈", label: "Sem Pesquisa", isCorrect: false, feedback: "Escolha o cartão da equipe preparada!" },
              { iconEmoji: "💤", label: "Distração", isCorrect: false, feedback: "Toque no cartão da pesquisa em grupo!" },
            ],
          },
        },
        {
          id: "stage-2",
          title: "Fase 2: Exposição Inicial & Controle de Tempo no KronoMestre",
          scenario: `[EXPOSIÇÃO REGRADA] ${scriptLines[1] || `Com o cronômetro do KronoMestre espelhado no projetor da sala, as bancadas Pró e Contra apresentam suas teses iniciais sobre "${safeTopic}".`} Como sustentar a hegemonia argumentativa respeitando o tempo?`,
          clue: "Rigor do Tempo: O respeito estrito ao cronômetro projetado demonstra domínio retórico e evita penalizações da Audiência Analítica.",
          options: [
            { text: "Apresentar a tese central logo no início, conectar com a realidade brasileira e concluir dentro do tempo exibido no KronoMestre.", isCorrect: true, pointsWeight: 10, feedback: "Domínio exemplar! Síntese clara, fundamentação teórica e gestão precisa do tempo.", iconEmoji: "⏱️" },
            { text: "Estourar o tempo do cronômetro repetindo o mesmo ponto sem apresentar evidências novas.", isCorrect: false, pointsWeight: 0, feedback: "Penalidade de tempo: na estrutura do debate, exceder o cronômetro reduz a nota de organização.", iconEmoji: "⏳" },
          ],
          pneMildStage: {
            scenario: "Durante a fala no debate, por que olhamos o relógio do KronoMestre no quadro?",
            options: [
              { text: "Para falar com clareza e respeitar o tempo de todos os grupos", isCorrect: true, feedback: "Correto! Respeitar o tempo garante que todos sejam ouvidos." },
              { text: "Para interromper a vez do colega falar", isCorrect: false, feedback: "No debate, cada grupo tem seu momento certo de falar." },
            ],
          },
          pneSevereStage: {
            playfulPrompt: "Toque no cartão do relógio que marca o tempo justo para todos:",
            visualCards: [
              { iconEmoji: "⏱️", label: "Tempo Justo", isCorrect: true, feedback: "Perfeito! O KronoMestre cuida do tempo de todos!" },
              { iconEmoji: "🔇", label: "Silêncio Total", isCorrect: false, feedback: "Procure o cartão do cronômetro!" },
              { iconEmoji: "📢", label: "Grito", isCorrect: false, feedback: "Toque no relógio do tempo justo!" },
            ],
          },
        },
        {
          id: "stage-3",
          title: "Fase 3: Sessão Q&A — Perguntas Digitais da Plateia",
          scenario: `[INTERAÇÃO DA PLATEIA Q&A] ${scriptLines[2] || `Enquanto ouvem os debatedores sobre "${safeTopic}", os estudantes da plateia enviam perguntas pelo celular para a tela do mediador.`} Qual pergunta eleva o nível analítico da réplica?`,
          clue: "Dialética: As melhores perguntas da plateia confrontam causas estruturais e exigem que as bancadas apliquem conceitos sociológicos a casos reais.",
          options: [
            { text: "Formular uma questão que conecte a tese debatida aos impactos reais na comunidade e exija solução prática fundamentada.", isCorrect: true, pointsWeight: 10, feedback: "Excelente intervenção! A plateia ativa transforma o debate em investigação coletiva.", iconEmoji: "💬" },
            { text: "Enviar comentários fora do tema que não contribuem para testar a validade dos argumentos.", isCorrect: false, pointsWeight: 0, feedback: "Na sessão Q&A, o foco deve ser desafiar construtivamente as premissas das bancadas.", iconEmoji: "🚫" },
          ],
          pneMildStage: {
            scenario: "Como a plateia participa sem interromper quem está falando?",
            options: [
              { text: "Enviando perguntas interessantes pelo celular para o momento da resposta", isCorrect: true, feedback: "Isso mesmo! Assim todos participam com ordem e respeito." },
              { text: "Gritando no meio da explicação do colega", isCorrect: false, feedback: "Usamos o envio digital de perguntas para manter a organização." },
            ],
          },
          pneSevereStage: {
            playfulPrompt: "Toque no balão de pergunta respeitosa da plateia:",
            visualCards: [
              { iconEmoji: "💬", label: "Boa Pergunta", isCorrect: true, feedback: "Muito bem! Perguntar ajuda todo mundo a aprender!" },
              { iconEmoji: "❌", label: "Interrupção", isCorrect: false, feedback: "Escolha o balão de conversa!" },
              { iconEmoji: "🧱", label: "Bloqueio", isCorrect: false, feedback: "Toque no cartão da Boa Pergunta!" },
            ],
          },
        },
        {
          id: "stage-4",
          title: "Fase 4: Réplica, Tréplica & Dilema da Cooperação",
          scenario: `[RÉPLICA ESTRATÉGICA • EQUILÍBRIO DE NASH] Bancadas Pró e Contra respondem às perguntas selecionadas sobre "${safeTopic}". Diante de um dado verdadeiro apresentado pelo adversário, qual é a melhor jogada racional?`,
          clue: "Equilíbrio de Nash Pedagógico: Reconhecer um dado válido e aprofundar a interpretação sociológica gera mais credibilidade do que negar fatos comprovados.",
          options: [
            { text: "Reconhecer a evidência factual, contextualizá-la historicamente e demonstrar como a tese da sua bancada explica o fenômeno com maior profundidade.", isCorrect: true, pointsWeight: 10, feedback: "Jogada de mestre! Honestidade intelectual combinada com refutação sociológica de alto nível.", iconEmoji: "⚖️" },
            { text: "Negar dados estatísticos oficiais ou recorrer a ataques pessoais (falácia ad hominem).", isCorrect: false, pointsWeight: 0, feedback: "Falácia detectada! Atacar pessoas ou negar fatos destrói a pontuação perante a Audiência Analítica.", iconEmoji: "🛑" },
          ],
          pneMildStage: {
            scenario: "Na hora de responder ao outro grupo, o que devemos fazer?",
            options: [
              { text: "Explicar nossas ideias com respeito e fatos verdadeiros", isCorrect: true, feedback: "Parabéns! Argumentar com respeito mostra sabedoria." },
              { text: "Ofender o outro grupo por pensar diferente", isCorrect: false, feedback: "No debate respeitamos todas as pessoas." },
            ],
          },
          pneSevereStage: {
            playfulPrompt: "Toque na balança do equilíbrio e do respeito no debate:",
            visualCards: [
              { iconEmoji: "⚖️", label: "Debate Justo", isCorrect: true, feedback: "Sensacional! Equilíbrio e respeito sempre!" },
              { iconEmoji: "💣", label: "Briga", isCorrect: false, feedback: "Procure a balança da justiça!" },
              { iconEmoji: "🌪️", label: "Confusão", isCorrect: false, feedback: "Toque na balança do Debate Justo!" },
            ],
          },
        },
        {
          id: "stage-5",
          title: "Fase 5: Julgamento Digital da Audiência Analítica",
          scenario: `[AUDIÊNCIA ANALÍTICA] Chegou o momento da votação digital no celular sobre "${safeTopic}". Quais critérios técnicos os alunos avaliadores devem priorizar no formulário de avaliação?`,
          clue: "Avaliação por Evidências: O voto analítico avalia 1) Qualidade dos argumentos, 2) Respeito ao tempo (KronoMestre) e 3) Uso consistente de dados.",
          options: [
            { text: "Avaliar com imparcialidade a qualidade conceitual dos argumentos, o uso de dados verificados e o cumprimento do tempo no KronoMestre.", isCorrect: true, pointsWeight: 10, feedback: "Perfeito! A avaliação justa gera gráficos de desempenho fiéis em segundos para toda a turma.", iconEmoji: "📊" },
            { text: "Votar apenas por amizade pessoal, ignorando quem apresentou os melhores dados e argumentos.", isCorrect: false, pointsWeight: 0, feedback: "Voto enviesado compromete a análise coletiva: na Audiência Analítica, os critérios objetivos vêm em primeiro lugar.", iconEmoji: "📉" },
          ],
          pneMildStage: {
            scenario: "Como a plateia vota de forma justa no final do debate?",
            options: [
              { text: "Observando quem explicou bem, usou fatos e respeitou o tempo", isCorrect: true, feedback: "Excelente! Isso é ser um avaliador justo!" },
              { text: "Escolhendo sem prestar atenção no que foi dito", isCorrect: false, feedback: "Prestar atenção ajuda a votar com justiça." },
            ],
          },
          pneSevereStage: {
            playfulPrompt: "Toque no gráfico colorido da votação da turma:",
            visualCards: [
              { iconEmoji: "📊", label: "Voto Justo", isCorrect: true, feedback: "Parabéns! O gráfico da turma ficou pronto!" },
              { iconEmoji: "🗑️", label: "Descarte", isCorrect: false, feedback: "Procure o cartão do gráfico!" },
              { iconEmoji: "🔒", label: "Fechado", isCorrect: false, feedback: "Toque no gráfico do Voto Justo!" },
            ],
          },
        },
        {
          id: "stage-6",
          title: "Fase 6: Registro Final & Portfólio Digital (Canva / Mini-Podcast)",
          scenario: `[FECHAMENTO SEM PAPEL] Para transformar o debate sobre "${safeTopic}" em registro pedagógico formal e nota da equipe, qual entrega consolida a síntese coletiva?`,
          clue: "Portfólio Digital: Um Infográfico no Canva ou um Mini-Podcast de 2 minutos sintetiza tese, antítese e conclusão sociológica.",
          options: [
            { text: "Produzir em grupo um Infográfico Digital ou Mini-Podcast de 2 minutos sintetizando as conclusões e enviando o registro na plataforma.", isCorrect: true, pointsWeight: 10, feedback: "Missão cumprida com nota máxima! Debate Sem Papel concluído com síntese autoral e portfólio permanente.", iconEmoji: "🎙️" },
            { text: "Encerrar a discussão sem registrar nenhuma síntese ou conclusão coletiva do aprendizado.", isCorrect: false, pointsWeight: 0, feedback: "O registro final em infográfico ou áudio é essencial para consolidar o aprendizado e a avaliação formal.", iconEmoji: "📝" },
          ],
          pneMildStage: {
            scenario: "Como guardamos o que aprendemos no debate sem usar folhas de papel?",
            options: [
              { text: "Criando um cartaz digital colorido ou gravando um áudio curto com o grupo", isCorrect: true, feedback: "Maravilha! Você concluiu todas as etapas do Debate Sem Papel!" },
              { text: "Esquecendo tudo o que conversamos na aula", isCorrect: false, feedback: "Registrar em imagem ou áudio guarda nosso aprendizado!" },
            ],
          },
          pneSevereStage: {
            playfulPrompt: "Toque no troféu de conclusão do Debate Sem Papel:",
            visualCards: [
              { iconEmoji: "🏆", label: "Debate Concluído!", isCorrect: true, feedback: "Campeão! Você brilhou no Debate Sem Papel!" },
              { iconEmoji: "🪨", label: "Pedra", isCorrect: false, feedback: "Procure o troféu dourado!" },
              { iconEmoji: "🥄", label: "Colher", isCorrect: false, feedback: "Toque no troféu da vitória!" },
            ],
          },
        },
      ],
    };
  }

  // Fallback completo de 6 estágios para qualquer outra modalidade usando o roteiro do professor
  const stages: GameStage[] = Array.from({ length: 6 }).map((_, idx) => {
    const scriptSegment = scriptLines[idx] || `Análise estratégica e sociológica — Etapa ${idx + 1} sobre ${safeTopic}`;
    return {
      id: `stage-${idx + 1}`,
      title: `Fase ${idx + 1}: ${scriptSegment.slice(0, 52)}`,
      scenario: `[Desafio ${idx + 1} • Teoria dos Jogos & Sociologia] ${scriptSegment}. Considerando o tema "${safeTopic}", qual decisão produz o melhor resultado coletivo e conceitual?`,
      clue: "Pista Estratégica: Analise as relações de poder, cooperação e consequências estruturais antes de decidir.",
      options: [
        {
          text: `Aplicar a análise crítica e cooperativa fundamentada nos conceitos de ${safeSubject} sobre ${safeTopic}.`,
          isCorrect: true,
          pointsWeight: 10,
          feedback: "Decisão estratégica correta! Você articulou teoria e realidade social com precisão.",
          iconEmoji: "🎯",
        },
        {
          text: "Adotar uma visão imediatista e individualista que ignora o contexto histórico e coletivo.",
          isCorrect: false,
          pointsWeight: 0,
          feedback: "Atenção: Na Teoria dos Jogos aplicada à vida social, ignorar o coletivo gera perdas para todos os atores.",
          iconEmoji: "❌",
        },
      ],
      pneMildStage: {
        scenario: `Etapa ${idx + 1} sobre ${safeTopic}: qual caminho ajuda toda a comunidade?`,
        options: [
          { text: "Compreender a realidade, dialogar e agir em cooperação", isCorrect: true, feedback: "Muito bem! Você acertou em cheio!" },
          { text: "Agir sem pensar nas outras pessoas da sociedade", isCorrect: false, feedback: "Pense em como ajudar a comunidade." },
        ],
      },
      pneSevereStage: {
        playfulPrompt: "Toque no cartão que mostra sabedoria e união:",
        visualCards: [
          { iconEmoji: "🌟", label: "Sabedoria e União", isCorrect: true, feedback: "Parabéns! Escolha perfeita!" },
          { iconEmoji: "🛑", label: "Parado", isCorrect: false, feedback: "Toque na estrela brilhante!" },
          { iconEmoji: "⚡", label: "Conflito", isCorrect: false, feedback: "Escolha o cartão da estrela!" },
        ],
      },
    };
  });

  return {
    introText: `🎮 Missão KronoGames (${safeSubject}): "${title || safeTopic}". Superem as 6 fases estratégicas baseadas em Teoria dos Jogos e tomada de decisão coletiva!`,
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
    // Modelos reais e ativos na API Gemini
    const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"];
    let generatedText: string | null = null;

    const isAee = mode === "adapted_aee";
    const isUppercase = Boolean(aeePromptSettings?.uppercaseText);
    const creativeSeed = `SEED-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const gameModeInstructions: Record<string, string> = {
      millionaire: "ARENA DO MILHÃO & TEORIA DOS JOGOS: Crie 6 rodadas progressivas de tomada de decisão sob incerteza, onde cada pergunta exige articular o roteiro do professor com dilemas reais de cooperação vs competição.",
      dialectic_tribunal: "TRIBUNAL DIALÉTICO & TEORIA DOS JOGOS: Crie 6 casos de julgamento crítico onde os alunos atuam como juízes e estrategistas, analisando teses em conflito, equilíbrio de poder, hegemonia e falácias.",
      structural_detective: "DETETIVE ESTRUTURAL & TEORIA DOS JOGOS: Crie 6 cenas de investigação sociológica onde pistas empíricas revelam mecanismos invisíveis de poder, ideologia e interesses dos atores sociais.",
      rpg_campaign: "CRÔNICAS DA PÓLIS (RPG DE TEORIA DOS JOGOS): Crie 6 capítulos interligados onde o aluno vive um protagonista diante de dilemas estratégicos (Dilema do Prisioneiro, Tragédia dos Comuns, Contrato Social, Ação Coletiva).",
      real_life_lab: "LABORATÓRIO DA VIDA REAL & TEORIA DOS JOGOS: Crie 6 simulações práticas do cotidiano brasileiro onde escolhas individuais e coletivas geram impactos diretos na comunidade.",
      debate_paperless: `ESTRUTURA DO DEBATE SEM PAPEL & TEORIA DOS JOGOS:
Estruture os 6 estágios guiando um Debate Sem Papel completo sobre o tema e roteiro do professor:
- Estágio 1 (Bancadas Pró e Contra - Preparação Digital): Argumentos centrais, dados e conceitos para o documento colaborativo do Grupo Pró e do Grupo Contra.
- Estágio 2 (Exposição Inicial & Cronômetro KronoMestre): Tese central e defesa inicial sob controle de tempo projetado em sala.
- Estágio 3 (Interação Q&A da Plateia): Dilema ou pergunta crítica enviada anonimamente pela plateia pelo celular para desafiar os debatedores.
- Estágio 4 (Réplica, Tréplica & Equilíbrio de Nash): Confronto direto de evidências, superação de senso comum e refutação fundamentada.
- Estágio 5 (Audiência Analítica - Avaliação Digital): Critérios de julgamento (Qualidade dos argumentos, Respeito ao tempo e Uso de dados) aplicados ao tema.
- Estágio 6 (Registro Final & Portfólio - Infográfico Canva / Mini-Podcast): Síntese conclusiva do debate para registro pedagógico formal.`,
    };

    const systemPrompt = isAee
      ? `Você é um Arquiteto Pedagógico Mestre e Game Designer de Educação Especial (AEE) no Ensino Médio.
SEMENTE CRIATIVA ÚNICA (NUNCA REPITA JOGOS ANTERIORES): ${creativeSeed}
Sua missão é criar uma atividade interativa completa de 6 ESTÁGIOS INÉDITOS E ALTAMENTE CRIATIVOS em JSON sobre:
- Tema: "${topic}" (${subject})
- Título: "${title}"
- Mecânica Inclusiva: "${aeeMechanic}"
- Roteiro / Material de Apoio do Professor (USE INTEGRALMENTE):
"""
${supportMaterial || "Explore exemplos práticos e visuais do cotidiano dos estudantes."}
"""

DIRETRIZES COGNITIVAS:
- Linguagem clara, acolhedora e objetiva (${aeePromptSettings?.literalLanguage ? "100% literal" : "acessível"}).
- Frases diretas (${aeePromptSettings?.cognitiveReduction ? "redução cognitiva ativa" : "bem estruturadas"}).
- Caixa alta: ${isUppercase ? "ESCREVA TODOS OS TEXTOS EM LETRAS MAIÚSCULAS" : "Normal"}.
- Varie os cenários, personagens, situações do cotidiano e emojis em cada geração. Nunca gere textos genéricos repetidos!`
      : `Você é um Game Designer Pedagógico Sênior especialista em Sociologia, Filosofia e Teoria dos Jogos para o Ensino Médio.
SEMENTE CRIATIVA ÚNICA (PROIBIDO REPETIR JOGOS): ${creativeSeed}
Transforme o tema "${topic}" da disciplina "${subject}" (Título: "${title}") em uma ATIVIDADE COMPLETA E INÉDITA DE 6 ESTÁGIOS!

MODALIDADE ESCOLHIDA:
${gameModeInstructions[gameMode] || gameModeInstructions.millionaire}

ROTEIRO PRÉVIO / TEXTO BASE FORNECIDO PELO PROFESSOR (OBRIGATÓRIO SEGUIR E DESENVOLVER INTEGRALMENTE NAS 6 FASES):
"""
${supportMaterial || "Desenvolva os conceitos clássicos e contemporâneos do tema com aplicação à realidade social brasileira e dilemas de Teoria dos Jogos."}
"""

REGRAS DE OURO:
1. Crie TODOS os 6 estágios completos, profundos e diretamente baseados no roteiro do professor.
2. Em cada estágio, inclua 4 alternativas ricas em "options" (1 correta com pointsWeight: 10 e 3 distratores plausíveis com pointsWeight: 0 e feedback explicativo detalhado).
3. Aplique conceitos de Teoria dos Jogos (escolhas estratégicas, dilemas de cooperação, incentivos sociais, hegemonia, ação coletiva) conectados aos autores e temas do roteiro.
4. Em TODOS os 6 estágios, preencha também "pneMildStage" (2 opções adaptadas) e "pneSevereStage" (3 cartões visuais) para o Co-Op Inclusivo automático em sala.`;

    const prompt = `Retorne EXCLUSIVAMENTE um objeto JSON válido contendo EXATAMENTE 6 estágios ("stage-1" a "stage-6") com a estrutura abaixo:
{
  "introText": "Texto de abertura completo apresentando a missão, o contexto do roteiro do professor e as regras estratégicas.",
  "stages": [
    {
      "id": "stage-1",
      "title": "Título específico e criativo da Fase 1",
      "scenario": "Contextualização rica, dilema ou questão completa baseada no roteiro do professor...",
      "clue": "Pista teórica/estratégica conectando o autor ou conceito do roteiro...",
      "options": [
        { "text": "Alternativa correta fundamentada...", "isCorrect": true, "pointsWeight": 10, "feedback": "Explicação pedagógica detalhada do acerto...", "iconEmoji": "🎯" },
        { "text": "Distrator plausível 1...", "isCorrect": false, "pointsWeight": 0, "feedback": "Explicação de por que esta estratégia falha...", "iconEmoji": "❌" },
        { "text": "Distrator plausível 2...", "isCorrect": false, "pointsWeight": 0, "feedback": "Explicação conceitual...", "iconEmoji": "⚠️" },
        { "text": "Distrator plausível 3...", "isCorrect": false, "pointsWeight": 0, "feedback": "Explicação conceitual...", "iconEmoji": "🔎" }
      ],
      "pneMildStage": {
        "scenario": "Pergunta direta e clara sobre o mesmo conceito da fase...",
        "options": [
          { "text": "Opção correta clara...", "isCorrect": true, "feedback": "Elogio e explicação simples..." },
          { "text": "Opção incorreta...", "isCorrect": false, "feedback": "Dica acolhedora..." }
        ]
      },
      "pneSevereStage": {
        "playfulPrompt": "Comando lúdico visual...",
        "visualCards": [
          { "iconEmoji": "🤝", "label": "Conceito Correto", "isCorrect": true, "feedback": "Feedback positivo..." },
          { "iconEmoji": "🛑", "label": "Distrator 1", "isCorrect": false, "feedback": "Dica visual..." },
          { "iconEmoji": "⚡", "label": "Distrator 2", "isCorrect": false, "feedback": "Dica visual..." }
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
            temperature: 0.95,
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
        const cleaned = generatedText
          .replace(/^\`\`\`json\s*/i, "")
          .replace(/\s*\`\`\`$/i, "")
          .trim();
        const parsed: GameData = JSON.parse(cleaned);

        if ((parsed as any).submissions) delete (parsed as any).submissions;
        if ((parsed as any).students) delete (parsed as any).students;
        if ((parsed as any).grades) delete (parsed as any).grades;

        if (parsed && Array.isArray(parsed.stages) && parsed.stages.length > 0) {
          return NextResponse.json({
            gameData: parsed,
            isFallback: false,
          });
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
