import { Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient, isGeminiAuthError } from '@/lib/gemini';
import {
  GameData,
  GameMode,
  AeeMechanic,
  AeePromptSettings,
  GameStage,
  AdaptationRecommendation,
} from '@/lib/types';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

interface RequestPayload {
  mode: 'krono_game' | 'adapted_aee';
  title: string;
  subject?: string;
  topic?: string;
  supportMaterial?: string;
  gameMode?: GameMode;
  aeeMechanic?: AeeMechanic;
  aeePromptSettings?: AeePromptSettings;
  adaptationRecommendation?: AdaptationRecommendation;
}

/**
 * Gerador de fallback estático resiliente (zero custo de API e 100% de disponibilidade).
 * Produz 6 estágios completos com rodadas co-op inclusivas.
 */
function generateFallbackInteractiveData(payload: RequestPayload): GameData {
  const {
    mode,
    title,
    subject = 'Sociologia',
    topic = 'Cidadania e Sociedade',
    gameMode = 'millionaire',
    aeeMechanic = 'visual_cards',
    aeePromptSettings,
  } = payload;

  const safeTopic = topic || title || 'Sociedade e Cidadania';
  const safeSubject = subject || 'Sociologia';
  const isUppercase = Boolean(aeePromptSettings?.uppercaseText);

  const formatText = (text: string) => (isUppercase ? text.toUpperCase() : text);

  if (mode === 'adapted_aee') {
    let intro = `Esta é uma atividade adaptada de ${safeSubject} sobre "${safeTopic}". Todas as etapas foram desenhadas para aprendizado claro e direto.`;
    if (aeeMechanic === 'visual_cards') {
      intro = `Bem-vindo(a) ao Mapa Visual de ${safeSubject}! Observe os cartões e toque na imagem que melhor responde à pergunta sobre "${safeTopic}".`;
    } else if (aeeMechanic === 'binary_trail') {
      intro = `Trilha Guiada de 2 Escolhas: leia ou ouça a situação e escolha a alternativa correta sobre "${safeTopic}".`;
    } else if (aeeMechanic === 'social_story') {
      intro = `História Social: acompanhe o dia a dia e descubra como agir com respeito e cooperação em "${safeTopic}".`;
    } else if (aeeMechanic === 'block_builder') {
      intro = `Oficina de Blocos: monte as ideias corretas de "${safeTopic}" sem precisar digitar textos longos.`;
    }

    const aeeStages: GameStage[] = [
      {
        id: 'stage-1',
        title: formatText('Etapa 1: Ponto de Encontro'),
        scenario: formatText(`No dia a dia, quando pensamos em ${safeTopic}, o que ajuda as pessoas a viverem bem juntas?`),
        clue: formatText('Dica: Pense no respeito e na cooperação entre amigos.'),
        options: [
          { text: formatText('Conversar com calma e respeitar as regras da escola e da comunidade.'), isCorrect: true, pointsWeight: 10, feedback: formatText('Muito bem! O diálogo e as regras ajudam todos a conviver em paz.'), iconEmoji: '🤝' },
          { text: formatText('Gritar e ignorar o que os outros dizem.'), isCorrect: false, pointsWeight: 0, feedback: formatText('Atenção: viver em grupo exige ouvir e respeitar os outros.'), iconEmoji: '❌' },
        ],
        pneMildStage: {
          scenario: formatText(`O que é essencial em ${safeTopic}?`),
          options: [
            { text: formatText('Respeitar os colegas e cooperar'), isCorrect: true, feedback: formatText('Correto! Respeito constrói amizade e cidadania.') },
            { text: formatText('Brigarem todos os dias'), isCorrect: false, feedback: formatText('Tente de novo: o caminho certo é o respeito.') },
          ],
        },
        pneSevereStage: {
          playfulPrompt: formatText('Toque no cartão que mostra ajuda mútua e respeito:'),
          visualCards: [
            { iconEmoji: '🤝', label: formatText('Amizade e Respeito'), isCorrect: true, feedback: formatText('Muito bem! Você escolheu a amizade!') },
            { iconEmoji: '⚡', label: formatText('Briga'), isCorrect: false, feedback: formatText('Procure o cartão com as mãos dadas!') },
            { iconEmoji: '🛑', label: formatText('Parar'), isCorrect: false, feedback: formatText('Olhe o cartão com o abraço e respeito!') },
          ],
        },
      },
      {
        id: 'stage-2',
        title: formatText('Etapa 2: Ação no Cotidiano'),
        scenario: formatText(`Ao observar ${safeTopic} na nossa cidade, o que representa uma atitude cidadã?`),
        clue: formatText('Dica: Cuidar dos espaços compartilhados por todos.'),
        options: [
          { text: formatText('Cuidar da praça, da escola e não jogar lixo no chão.'), isCorrect: true, pointsWeight: 10, feedback: formatText('Excelente! Cuidar do espaço público é dever de todo cidadão.'), iconEmoji: '🌳' },
          { text: formatText('Estragar os bancos e sujar a rua.'), isCorrect: false, pointsWeight: 0, feedback: formatText('Não. Espaços públicos pertencem a todos nós.'), iconEmoji: '🗑️' },
        ],
        pneMildStage: {
          scenario: formatText(`Como cuidamos da nossa cidade?`),
          options: [
            { text: formatText('Mantendo a escola e a praça limpas'), isCorrect: true, feedback: formatText('Perfeito! Cuidar da cidade é dever de todos.') },
            { text: formatText('Jogando lixo no chão'), isCorrect: false, feedback: formatText('Lixo deve ser colocado na lixeira!') },
          ],
        },
        pneSevereStage: {
          playfulPrompt: formatText('Escolha o cartão com a árvore e a natureza bem cuidadas:'),
          visualCards: [
            { iconEmoji: '🌳', label: formatText('Cidade Limpa'), isCorrect: true, feedback: formatText('Parabéns! Cuidar da natureza é lindo!') },
            { iconEmoji: '💨', label: formatText('Fumaça'), isCorrect: false, feedback: formatText('Procure a árvore verdinha!') },
            { iconEmoji: '🧱', label: formatText('Muro Quebrado'), isCorrect: false, feedback: formatText('Toque na árvore!') },
          ],
        },
      },
      {
        id: 'stage-3',
        title: formatText('Etapa 3: Direito e Inclusão'),
        scenario: formatText(`Todas as pessoas, mesmo com jeitos ou necessidades diferentes, têm direito a aprender e participar de ${safeTopic}?`),
        clue: formatText('Dica: A lei garante que todos tenham acesso e carinho.'),
        options: [
          { text: formatText('Sim! Todos têm os mesmos direitos e devem ser acolhidos com carinho.'), isCorrect: true, pointsWeight: 10, feedback: formatText('Perfeito! Inclusão é garantir que ninguém fique de fora.'), iconEmoji: '❤️' },
          { text: formatText('Não, apenas quem for igual à maioria.'), isCorrect: false, pointsWeight: 0, feedback: formatText('Incorreto. A inclusão é para todas as pessoas sem exceção.'), iconEmoji: '🚫' },
        ],
        pneMildStage: {
          scenario: formatText(`Todas as pessoas merecem carinho e direitos iguais?`),
          options: [
            { text: formatText('Sim, todos são importantes e têm direitos'), isCorrect: true, feedback: formatText('Isso mesmo! Todas as vidas têm valor.') },
            { text: formatText('Não, só alguns'), isCorrect: false, feedback: formatText('A resposta certa é que todos têm direitos iguais.') },
          ],
        },
        pneSevereStage: {
          playfulPrompt: formatText('Toque no coração de carinho e inclusão:'),
          visualCards: [
            { iconEmoji: '❤️', label: formatText('Coração de Amor'), isCorrect: true, feedback: formatText('Você encontrou o coração! Maravilhoso!') },
            { iconEmoji: '🌧️', label: formatText('Chuva'), isCorrect: false, feedback: formatText('Procure o coração vermelho!') },
            { iconEmoji: '📦', label: formatText('Caixa'), isCorrect: false, feedback: formatText('Toque no coração!') },
          ],
        },
      },
      {
        id: 'stage-4',
        title: formatText('Etapa 4: Cooperação em Grupo'),
        scenario: formatText(`Quando fazemos uma atividade em grupo sobre ${safeTopic}, como todos aprendem melhor?`),
        clue: formatText('Dica: Compartilhar ideias e ajudar o colega do lado.'),
        options: [
          { text: formatText('Dividindo as tarefas e ajudando o colega que tem alguma dúvida.'), isCorrect: true, pointsWeight: 10, feedback: formatText('Muito bem! O trabalho em equipe fortalece todos os alunos.'), iconEmoji: '👥' },
          { text: formatText('Fazendo tudo sozinho e escondendo o caderno.'), isCorrect: false, pointsWeight: 0, feedback: formatText('Em grupo aprendemos muito mais compartilhando.'), iconEmoji: '🔒' },
        ],
        pneMildStage: {
          scenario: formatText(`O que fazemos quando um amigo precisa de ajuda?`),
          options: [
            { text: formatText('Ajudamos com paciência e amizade'), isCorrect: true, feedback: formatText('Parabéns! Ajudar um amigo é atitude nobre.') },
            { text: formatText('Rimos dele e nos afastamos'), isCorrect: false, feedback: formatText('Nunca zombamos de quem precisa de ajuda.') },
          ],
        },
        pneSevereStage: {
          playfulPrompt: formatText('Toque nas mãos unidas trabalhando juntas:'),
          visualCards: [
            { iconEmoji: '🙌', label: formatText('Mãos Unidas'), isCorrect: true, feedback: formatText('Isso aí! Trabalhando juntos vamos longe!') },
            { iconEmoji: '👣', label: formatText('Pegada'), isCorrect: false, feedback: formatText('Procure as mãos levantadas!') },
            { iconEmoji: '💤', label: formatText('Sono'), isCorrect: false, feedback: formatText('Procure as mãos da cooperação!') },
          ],
        },
      },
      {
        id: 'stage-5',
        title: formatText('Etapa 5: Resolução Pacífica'),
        scenario: formatText(`Se duas pessoas discordarem sobre ${safeTopic}, qual é a melhor atitude?`),
        clue: formatText('Dica: O diálogo sempre resolve melhor que a briga.'),
        options: [
          { text: formatText('Conversar com calma, ouvir os dois lados e encontrar uma solução pacífica.'), isCorrect: true, pointsWeight: 10, feedback: formatText('Sensacional! A paz e a conversa constroem pontes.'), iconEmoji: '🕊️' },
          { text: formatText('Gritar até o outro desistir de falar.'), isCorrect: false, pointsWeight: 0, feedback: formatText('Gritos nunca resolvem desentendimentos.'), iconEmoji: '📢' },
        ],
        pneMildStage: {
          scenario: formatText(`Quando discordamos de alguém, o que fazemos?`),
          options: [
            { text: formatText('Conversamos com respeito para entender o outro'), isCorrect: true, feedback: formatText('Certo! A conversa pacífica é a chave.') },
            { text: formatText('Gritamos bem alto'), isCorrect: false, feedback: formatText('Gritar não resolve; falar com calma sim.') },
          ],
        },
        pneSevereStage: {
          playfulPrompt: formatText('Toque no pássaro da paz e tranquilidade:'),
          visualCards: [
            { iconEmoji: '🕊️', label: formatText('Pomba da Paz'), isCorrect: true, feedback: formatText('Lindo! A paz sempre vence!') },
            { iconEmoji: '💣', label: formatText('Explosão'), isCorrect: false, feedback: formatText('Escolha a pombinha branca da paz!') },
            { iconEmoji: '🌵', label: formatText('Cacto Espinhoso'), isCorrect: false, feedback: formatText('Procure o pássaro da paz!') },
          ],
        },
      },
      {
        id: 'stage-6',
        title: formatText('Etapa 6: Grande Conquista'),
        scenario: formatText(`Parabéns! Você chegou ao final da jornada de ${safeTopic}. O que você aprendeu de mais importante?`),
        clue: formatText('Dica: Cidadania é praticada todos os dias com amor e respeito.'),
        options: [
          { text: formatText('Que ser cidadão é cuidar de si, cuidar dos outros e respeitar a sociedade.'), isCorrect: true, pointsWeight: 10, feedback: formatText('Parabéns! Você completou a atividade com nota 10!'), iconEmoji: '🌟' },
          { text: formatText('Que não precisamos de ninguém no mundo.'), isCorrect: false, pointsWeight: 0, feedback: formatText('Todos nós precisamos uns dos outros na vida.'), iconEmoji: '👤' },
        ],
        pneMildStage: {
          scenario: formatText(`Qual é a mensagem final sobre ser cidadão?`),
          options: [
            { text: formatText('Cuidar das pessoas e respeitar a todos'), isCorrect: true, feedback: formatText('Perfeito! Você brilhou nesta jornada!') },
            { text: formatText('Fazer coisas ruins sem se importar'), isCorrect: false, feedback: formatText('Ser cidadão é fazer o bem!') },
          ],
        },
        pneSevereStage: {
          playfulPrompt: formatText('Toque no troféu dourado da sua vitória:'),
          visualCards: [
            { iconEmoji: '🏆', label: formatText('Troféu Campeão'), isCorrect: true, feedback: formatText('Parabéns, campeão(ã)! Você concluiu tudo!') },
            { iconEmoji: '🥄', label: formatText('Colher'), isCorrect: false, feedback: formatText('Toque na taça dourada!') },
            { iconEmoji: '🪙', label: formatText('Moeda Pequena'), isCorrect: false, feedback: formatText('Escolha o troféu grande!') },
          ],
        },
      },
    ];

    return {
      introText: formatText(intro),
      stages: aeeStages,
    };
  }

  const gameModeTitles: Record<GameMode, { intro: string; prefix: string }> = {
    millionaire: {
      intro: `Bem-vindos à Arena do Milhão de ${safeSubject}! Trabalhem em equipe para escalar as 6 rodadas do conhecimento sobre "${safeTopic}". Consultem as pistas dos grandes pensadores e busquem a pontuação máxima de 10 pontos!`,
      prefix: 'Rodada',
    },
    dialectic_tribunal: {
      intro: `Tribunal Dialético de ${safeSubject}! Vocês atuarão como jurados e advogados do pensamento crítico no caso "${safeTopic}". Analisem argumentos, identifiquem falácias e profiram seu veredito!`,
      prefix: 'Caso',
    },
    structural_detective: {
      intro: `Detetive Estrutural: Um mistério social envolve "${safeTopic}". Sigam os indícios, examinem as estruturas sociais ocultas e desvendem a causa-raiz!`,
      prefix: 'Evidência',
    },
    rpg_campaign: {
      intro: `Crônicas da Pólis - Campanha RPG de ${safeSubject}: Assumam o papel de heróis da cidadania na jornada sobre "${safeTopic}". Suas decisões moldarão o destino da comunidade!`,
      prefix: 'Missão',
    },
    real_life_lab: {
      intro: `Laboratório da Vida Real de ${safeSubject}: Apliquem teorias a dilemas práticos do cotidiano sobre "${safeTopic}". Experimentem hipóteses e descubram impactos reais!`,
      prefix: 'Experimento',
    },
  };

  const modeConfig = gameModeTitles[gameMode] || gameModeTitles.millionaire;

  const defaultStages: GameStage[] = [
    {
      id: 'stage-1',
      title: `${modeConfig.prefix} 1: O Ponto de Partida`,
      scenario: `Para iniciar a investigação sobre ${safeTopic}, qual é a premissa fundamental aceita pelas ciências humanas?`,
      clue: 'Pista dos Clássicos: Pensem no que diferencia o senso comum da análise reflexiva sistemática.',
      options: [
        { text: `Compreender ${safeTopic} requer investigação fundamentada além das aparências imediatas.`, isCorrect: true, pointsWeight: 10, feedback: 'Excelente! A análise crítica desconstrói aparências e revela estruturas sociais profundas.', iconEmoji: '🎯' },
        { text: `Opiniões individuais sem evidências bastam para explicar qualquer fenômeno social.`, isCorrect: false, pointsWeight: 0, feedback: 'Atenção: Opiniões sem evidências caem no senso comum superficial.', iconEmoji: '❌' },
      ],
      pneMildStage: {
        scenario: `Sobre o tema ${safeTopic}, o que a ciência busca entender?`,
        options: [
          { text: 'Como as pessoas se organizam e cooperam na sociedade', isCorrect: true, feedback: 'Muito bem! As ciências humanas estudam a convivência social.' },
          { text: 'Apenas a velocidade das estrelas no espaço', isCorrect: false, feedback: 'Ciências sociais estudam as pessoas e a sociedade.' },
        ],
      },
      pneSevereStage: {
        playfulPrompt: 'Toque no cartão que mostra união, respeito e cooperação:',
        visualCards: [
          { iconEmoji: '🤝', label: 'União e Cooperação', isCorrect: true, feedback: 'Parabéns! Viver em sociedade é cooperar!' },
          { iconEmoji: '🌪️', label: 'Confusão', isCorrect: false, feedback: 'Procure o cartão com as mãos dadas!' },
          { iconEmoji: '🛑', label: 'Parada', isCorrect: false, feedback: 'Observe o cartão que representa união!' },
        ],
      },
    }
  ];

  return {
    introText: modeConfig.intro,
    stages: defaultStages,
  };
}

export async function POST(req: NextRequest) {
  let payload: RequestPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Payload JSON inválido.' }, { status: 400 });
  }

  const {
    mode = 'krono_game',
    title = 'Atividade Interativa',
    subject = 'Sociologia',
    topic = 'Sociedade e Cidadania',
    supportMaterial = '',
    gameMode = 'millionaire',
    aeeMechanic = 'visual_cards',
    aeePromptSettings,
  } = payload;

  const ai = getGeminiClient();

  if (!ai) {
    console.info('[Generate Interactive] Gemini client indisponível, usando fallback pedagógico robusto.');
    const fallbackData = generateFallbackInteractiveData(payload);
    return NextResponse.json({ gameData: fallbackData, isFallback: true });
  }

  try {
    const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];
    let generatedText: string | null = null;

    const isAee = mode === 'adapted_aee';
    const isUppercase = Boolean(aeePromptSettings?.uppercaseText);

    const systemPrompt = isAee
      ? `Você é um Arquiteto Pedagógico Mestre e Game Designer de Educação Especial (AEE).
NÍVEL DE CRIATIVIDADE: 200%. Sua missão é criar uma experiência mágica, lúdica e estruturada em JSON, para uma atividade inclusiva.
Tema: "${topic}" (${subject}). Título: "${title}". Mecânica Inclusiva: "${aeeMechanic}".

DIRETRIZES COGNITIVAS:
- Linguagem 100% literal, sem metáforas ou duplo sentido (${aeePromptSettings?.literalLanguage ? 'OBRIGATÓRIO' : 'recomendado'}).
- Frases curtas e diretas (${aeePromptSettings?.cognitiveReduction ? 'OBRIGATÓRIO' : 'recomendado'}).
- Caixa alta: ${isUppercase ? 'ESCREVA TODOS OS TEXTOS EM LETRAS MAIÚSCULAS' : 'Normal'}.

ESTRUTURA DE 6 ESTÁGIOS MÁGICOS:
- "title", "scenario", "clue", "options", "pneMildStage" (2 opções curtas) e "pneSevereStage" (3 cartões visuais com iconEmoji).

🚨 REGRA DE SEGURANÇA MÁXIMA (ANTI-DADOS FANTASMAS) 🚨
VOCÊ ESTÁ TERMINANTEMENTE PROIBIDO DE CRIAR, SIMULAR OU ADICIONAR NOTAS (grades), SUBMISSÕES (submissions), ALUNOS OU QUAISQUER OUTROS DADOS.
Seu trabalho é APENAS gerar a estrutura base do jogo. Retorne EXCLUSIVAMENTE o formato JSON solicitado contendo apenas "introText" e "stages".`
      : `Você é um Game Designer Pedagógico Nível Mestre especialista em KronoGames (jogos imersivos para ensino médio).
NÍVEL DE CRIATIVIDADE: 200%. Transforme o tema "${topic}" da disciplina "${subject}" (Título: "${title}") em uma AVENTURA ÉPICA!
Modo de Jogo: "${gameMode}". Crie metáforas vibrantes (RPG, detetives, ficção científica, tribunais) que transportem o aluno para dentro da história imediatamente.
Cada estágio (stage) deve parecer um capítulo de um livro. As "options" são os caminhos do jogador. O "feedback" deve explicar a consequência dramática da escolha.

Material de Apoio: "${supportMaterial.slice(0, 500)}".

REGRA DE CO-OP INCLUSIVO PARA SALA DE AULA:
Em TODOS os 6 estágios, gere obrigatoriamente:
1. "pneMildStage": rodada adaptada com 2 opções diretas sobre o mesmo conceito;
2. "pneSevereStage": rodada lúdica com cartões visuais (iconEmoji, label, isCorrect, feedback) ultra simplificados.

🚨 REGRA DE SEGURANÇA MÁXIMA (ANTI-DADOS FANTASMAS) 🚨
É ESTRITAMENTE PROIBIDO inventar, adicionar ou simular dados de alunos, notas (grades), entregas (submissions) ou campos extras. O KronoMestre gerencia a lógica de notas, seu papel é APENAS estruturar o jogo e a história. O JSON DEVE conter APENAS "introText" e "stages".`;

    const prompt = `Gere os 6 estágios épicos no formato JSON EXATO abaixo. NENHUMA chave adicional é permitida.
{
  "introText": "texto épico e imersivo",
  "stages": [
    {
      "id": "stage-1",
      "title": "...",
      "scenario": "...",
      "clue": "...",
      "options": [
        { "text": "...", "isCorrect": true, "pointsWeight": 10, "feedback": "...", "iconEmoji": "🎯" },
        { "text": "...", "isCorrect": false, "pointsWeight": 0, "feedback": "...", "iconEmoji": "❌" }
      ],
      "pneMildStage": {
        "scenario": "...",
        "options": [
          { "text": "...", "isCorrect": true, "feedback": "..." },
          { "text": "...", "isCorrect": false, "feedback": "..." }
        ]
      },
      "pneSevereStage": {
        "playfulPrompt": "...",
        "visualCards": [
          { "iconEmoji": "🤝", "label": "...", "isCorrect": true, "feedback": "..." },
          { "iconEmoji": "🛑", "label": "...", "isCorrect": false, "feedback": "..." },
          { "iconEmoji": "⚡", "label": "...", "isCorrect": false, "feedback": "..." }
        ]
      }
    }
  ]
}`;

    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            { role: 'user', parts: [{ text: `${systemPrompt}\n\n${prompt}` }] },
          ],
          config: {
            responseMimeType: 'application/json',
            temperature: 0.9, 
          },
        });

        if (response && response.text) {
          generatedText = response.text;
          break;
        }
      } catch (err: any) {
        if (isGeminiAuthError(err)) {
          break;
        }
        console.warn(`[Generate Interactive] Falha com modelo ${model}:`, err?.message || err);
      }
    }

    if (generatedText) {
      try {
        const cleaned = generatedText
          .replace(/^```json\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();
        const parsed: GameData = JSON.parse(cleaned);

        // Bloqueio rigoroso de chaves fantasmas: se a IA colocar "submissions", nós apagamos antes de devolver
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
        console.warn('[Generate Interactive] Erro ao parsear resposta da IA:', parseErr);
      }
    }

    const fallbackData = generateFallbackInteractiveData(payload);
    return NextResponse.json({ gameData: fallbackData, isFallback: true });
  } catch (error: any) {
    console.error('[Generate Interactive] Erro inesperado:', error);
    const fallbackData = generateFallbackInteractiveData(payload);
    return NextResponse.json({ gameData: fallbackData, isFallback: true });
  }
}