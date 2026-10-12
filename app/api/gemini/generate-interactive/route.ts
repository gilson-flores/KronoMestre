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
 * Produz 6 estágios completos com rodadas co-op inclusivas (pneMildStage e pneSevereStage).
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

  // =========================================================================
  // 1. MODO: ATIVIDADES ADAPTADAS (CENTRAL AEE)
  // =========================================================================
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

  // =========================================================================
  // 2. MODO: KRONOGAMES (ESTÚDIO INTERATIVO DE JOGOS)
  // =========================================================================
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
        { text: `Fatos sociais são meras coincidências biológicas imutáveis ao longo do tempo.`, isCorrect: false, pointsWeight: 0, feedback: 'Fenômenos sociais são construções históricas e culturais, não apenas biologia.', iconEmoji: '⚠️' },
        { text: `A sociedade não exerce qualquer influência nas escolhas cotidianas humanas.`, isCorrect: false, pointsWeight: 0, feedback: 'As instituições e a cultura exercem papel decisivo em nossas escolhas.', iconEmoji: '🚫' },
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
    },
    {
      id: 'stage-2',
      title: `${modeConfig.prefix} 2: Relações e Estruturas`,
      scenario: `Ao aprofundar os conceitos de ${safeTopic}, qual aspecto evidencia sua relevância no cotidiano?`,
      clue: 'Pista dos Clássicos: Lembrem-se das normas invisíveis e costumes que orientam nossas ações diárias.',
      options: [
        { text: `As instituições sociais e normas coletivas guiam comportamentos e geram coesão social.`, isCorrect: true, pointsWeight: 10, feedback: 'Exato! As instituições sociais garantem ordem, direitos e deveres compartilhados.', iconEmoji: '🏛️' },
        { text: `Ninguém precisa de cooperação ou regras para viver em comunidade pacífica.`, isCorrect: false, pointsWeight: 0, feedback: 'Sem cooperação e normas, a vida em comunidade se torna inviável.', iconEmoji: '❌' },
        { text: `Apenas a força física individual determina o sucesso cultural de um povo.`, isCorrect: false, pointsWeight: 0, feedback: 'A cultura se sustenta em linguagem, valores e saberes, não em força bruta.', iconEmoji: '⚠️' },
        { text: `O ambiente escolar não tem nenhuma relação com a cidadania pública.`, isCorrect: false, pointsWeight: 0, feedback: 'A escola é um dos principais espaços de formação da cidadania.', iconEmoji: '🚫' },
      ],
      pneMildStage: {
        scenario: `Por que regras de convivência são importantes para ${safeTopic}?`,
        options: [
          { text: 'Para garantir respeito, justiça e paz entre todos', isCorrect: true, feedback: 'Correto! Regras justas protegem a todos nós.' },
          { text: 'Para impedir as pessoas de aprenderem', isCorrect: false, feedback: 'Regras servem para proteger, não para prejudicar.' },
        ],
      },
      pneSevereStage: {
        playfulPrompt: 'Qual símbolo representa estudo, sabedoria e livros?',
        visualCards: [
          { iconEmoji: '📚', label: 'Livro do Conhecimento', isCorrect: true, feedback: 'Muito bem! Os livros nos ajudam a aprender e crescer!' },
          { iconEmoji: '🍕', label: 'Fatia de Pizza', isCorrect: false, feedback: 'Uma pizza é gostosa, mas procure o símbolo dos estudos!' },
          { iconEmoji: '⚽', label: 'Bola de Futebol', isCorrect: false, feedback: 'O esporte é legal, mas procure o que usamos para estudar!' },
        ],
      },
    },
    {
      id: 'stage-3',
      title: `${modeConfig.prefix} 3: Desafios Contemporâneos`,
      scenario: `Ao analisar ${safeTopic} na contemporaneidade, qual é o principal obstáculo para a igualdade social?`,
      clue: 'Pista dos Clássicos: Considerem as barreiras históricas que excluem determinados grupos sociais.',
      options: [
        { text: `Superar preconceitos históricos e promover a inclusão de todos os grupos sociais.`, isCorrect: true, pointsWeight: 10, feedback: 'Perfeito! A superação de discriminações históricas é o cerne da justiça social.', iconEmoji: '⚖️' },
        { text: `Aceitar que desigualdades são naturais e que nada pode ser transformado.`, isCorrect: false, pointsWeight: 0, feedback: 'Desigualdades são produtos históricos e podem ser combatidas com políticas públicas.', iconEmoji: '❌' },
        { text: `Ignorar a diversidade cultural em favor de uma imposição homogênea.`, isCorrect: false, pointsWeight: 0, feedback: 'A riqueza da sociedade reside no respeito à diversidade cultural.', iconEmoji: '⚠️' },
        { text: `Silenciar os grupos minoritários para manter o conformismo tradicional.`, isCorrect: false, pointsWeight: 0, feedback: 'A democracia floresce quando todas as vozes têm representatividade.', iconEmoji: '🚫' },
      ],
      pneMildStage: {
        scenario: `Como devemos tratar os colegas e pessoas com vivências diferentes das nossas?`,
        options: [
          { text: 'Com empatia, inclusão e respeito aos direitos de todos', isCorrect: true, feedback: 'Sensacional! O respeito à diversidade nos torna melhores.' },
          { text: 'Com desprezo e exclusão', isCorrect: false, feedback: 'Preconceito não tem espaço em nossa sociedade.' },
        ],
      },
      pneSevereStage: {
        playfulPrompt: 'Escolha o cartão com o coração de empatia e carinho:',
        visualCards: [
          { iconEmoji: '❤️', label: 'Coração de Empatia', isCorrect: true, feedback: 'Parabéns! Empatia e amor ao próximo transformam o mundo!' },
          { iconEmoji: '🌧️', label: 'Nuvem Escura', isCorrect: false, feedback: 'Procure o cartão que transmite amor e acolhimento!' },
          { iconEmoji: '⚙️', label: 'Engrenagem', isCorrect: false, feedback: 'Procure o coração quentinho!' },
        ],
      },
    },
    {
      id: 'stage-4',
      title: `${modeConfig.prefix} 4: Pensamento Crítico e Análise`,
      scenario: `Qual postura investigativa é indispensável ao debater criticamente ${safeTopic}?`,
      clue: 'Pista dos Clássicos: Exercitar o estranhamento e desnaturalizar o que parece óbvio.',
      options: [
        { text: `Exercitar o estranhamento metodológico e investigar as raízes históricas do tema.`, isCorrect: true, pointsWeight: 10, feedback: 'Brilhante! Desnaturalizar o cotidiano é a principal ferramenta do cientista social.', iconEmoji: '🔍' },
        { text: `Repetir notícias falsas e boatos de redes sociais sem checagem de fontes.`, isCorrect: false, pointsWeight: 0, feedback: 'Boatos desinformam e enfraquecem a cidadania esclarecida.', iconEmoji: '❌' },
        { text: `Acreditar que a realidade é simples e que não requer reflexão cuidadosa.`, isCorrect: false, pointsWeight: 0, feedback: 'Os fenômenos humanos são multifacetados e exigem análise aprofundada.', iconEmoji: '⚠️' },
        { text: `Julgar povos diferentes usando exclusivamente os próprios preconceitos.`, isCorrect: false, pointsWeight: 0, feedback: 'O etnocentrismo impede a compreensão intercultural genuína.', iconEmoji: '🚫' },
      ],
      pneMildStage: {
        scenario: `Quando vemos uma informação na internet sobre ${safeTopic}, o que fazemos?`,
        options: [
          { text: 'Conferimos se é verdadeira em fontes confiáveis', isCorrect: true, feedback: 'Muito bem! Checar informações evita cair em mentiras.' },
          { text: 'Acreditamos em qualquer boato sem pensar', isCorrect: false, feedback: 'Sempre confira fontes seguras antes de acreditar.' },
        ],
      },
      pneSevereStage: {
        playfulPrompt: 'Toque na lupa de investigação e curiosidade:',
        visualCards: [
          { iconEmoji: '🔍', label: 'Lupa Investigadora', isCorrect: true, feedback: 'Sensacional! Investigar nos faz aprender muito mais!' },
          { iconEmoji: '🔒', label: 'Cadeado Fechado', isCorrect: false, feedback: 'Procure a lente de aumento da investigação!' },
          { iconEmoji: '🪨', label: 'Pedra', isCorrect: false, feedback: 'Toque na lupa!' },
        ],
      },
    },
    {
      id: 'stage-5',
      title: `${modeConfig.prefix} 5: Práxis e Cidadania`,
      scenario: `Como a compreensão teórica de ${safeTopic} pode ser convertida em transformação social prática?`,
      clue: 'Pista dos Clássicos: A teoria sem prática é vazia; a prática sem teoria é cega.',
      options: [
        { text: `Por meio da participação democrática ativa, projetos coletivos e defesa dos direitos humanos.`, isCorrect: true, pointsWeight: 10, feedback: 'Excelente! A cidadania é construída pela ação deliberada nos espaços públicos.', iconEmoji: '🌱' },
        { text: `Através do isolamento completo e do desinteresse pelos problemas da cidade.`, isCorrect: false, pointsWeight: 0, feedback: 'O desinteresse político enfraquece a democracia e as conquistas sociais.', iconEmoji: '❌' },
        { text: `Destruindo espaços públicos e impedindo outras pessoas de manifestarem opiniões.`, isCorrect: false, pointsWeight: 0, feedback: 'Ação cidadã preza pelo diálogo, pelo patrimônio coletivo e pela não-violência.', iconEmoji: '⚠️' },
        { text: `Esperando passivamente que outras pessoas resolvam tudo sem nossa colaboração.`, isCorrect: false, pointsWeight: 0, feedback: 'A transformação exige engajamento e protagonismo de todos.', iconEmoji: '🚫' },
      ],
      pneMildStage: {
        scenario: `Como podemos transformar nossa escola para melhor em relação a ${safeTopic}?`,
        options: [
          { text: 'Participando de projetos e ajudando os colegas', isCorrect: true, feedback: 'Correto! A participação ativa melhora toda a escola.' },
          { text: 'Fingindo que não nos importamos com nada', isCorrect: false, feedback: 'O envolvimento positivo faz toda a diferença.' },
        ],
      },
      pneSevereStage: {
        playfulPrompt: 'Toque na planta que cresce com cuidado e carinho:',
        visualCards: [
          { iconEmoji: '🌱', label: 'Broto de Esperança', isCorrect: true, feedback: 'Que lindo! Boas ações fazem o futuro florescer!' },
          { iconEmoji: '🗑️', label: 'Lixo', isCorrect: false, feedback: 'Procure a plantinha verde crescendo!' },
          { iconEmoji: '⛓️', label: 'Corrente', isCorrect: false, feedback: 'Toque na sementinha verde que cresce!' },
        ],
      },
    },
    {
      id: 'stage-6',
      title: `${modeConfig.prefix} 6: Grande Desafio Final`,
      scenario: `Na conclusão das missões sobre ${safeTopic}, qual síntese consolida o aprendizado da equipe?`,
      clue: 'Pista dos Clássicos: O conhecimento liberta e convida à responsabilidade ética com o futuro.',
      options: [
        { text: `O conhecimento científico social capacita o indivíduo a pensar por si mesmo e atuar como agente de justiça.`, isCorrect: true, pointsWeight: 10, feedback: 'Parabéns, equipe! Vocês conquistaram a nota máxima e provaram domínio crítico!', iconEmoji: '🏆' },
        { text: `Estudar a sociedade não serve para nada além de memorizar termos desnecessários.`, isCorrect: false, pointsWeight: 0, feedback: 'O conhecimento social nos ensina a viver melhor e a defender nossos direitos.', iconEmoji: '❌' },
        { text: `Apenas cientistas isolados em laboratórios têm o direito de opinar sobre sociedade.`, isCorrect: false, pointsWeight: 0, feedback: 'A sociedade é construída por todos os cidadãos conscientes.', iconEmoji: '⚠️' },
        { text: `O pensamento crítico deve ser abandonado em favor de certezas imutáveis.`, isCorrect: false, pointsWeight: 0, feedback: 'O pensamento crítico é o motor do progresso humano.', iconEmoji: '🚫' },
      ],
      pneMildStage: {
        scenario: `Qual é o maior aprendizado sobre ${safeTopic}?`,
        options: [
          { text: 'Pensar por nós mesmos e ser generosos com todos', isCorrect: true, feedback: 'Sensacional! Vocês completaram a missão com nota 10!' },
          { text: 'Acreditar em qualquer coisa sem questionar', isCorrect: false, feedback: 'Pensar por si mesmo é a maior conquista!' },
        ],
      },
      pneSevereStage: {
        playfulPrompt: 'Toque no troféu de ouro da vitória da sua equipe:',
        visualCards: [
          { iconEmoji: '🏆', label: 'Troféu Campeão', isCorrect: true, feedback: 'Vitória! Vocês escalaram todas as etapas e venceram!' },
          { iconEmoji: '⌛', label: 'Ampulheta', isCorrect: false, feedback: 'Toque na taça dourada!' },
          { iconEmoji: '📦', label: 'Caixa Fechada', isCorrect: false, feedback: 'Escolha o troféu campeão!' },
        ],
      },
    },
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

  // Fallback padrão imediato caso a chave não esteja disponível
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
      ? `Você é um Arquiteto Pedagógico especialista em Educação Especial e AEE (Atendimento Educacional Especializado).
Sua missão é criar 6 estágios adaptados em formato JSON estruturado para uma atividade inclusiva.
Tema: "${topic}" (${subject}). Título: "${title}".
Mecânica Inclusiva: "${aeeMechanic}" (visual_cards, binary_trail, social_story, block_builder).
Diretrizes Cognitivas:
- Linguagem 100% literal, sem metáforas ou duplo sentido (${aeePromptSettings?.literalLanguage ? 'OBRIGATÓRIO' : 'recomendado'}).
- Redução cognitiva em frases curtas e diretas (${aeePromptSettings?.cognitiveReduction ? 'OBRIGATÓRIO' : 'recomendado'}).
- Exemplos do cotidiano concreto (${aeePromptSettings?.concreteExamples ? 'OBRIGATÓRIO' : 'recomendado'}).
- Caixa alta: ${isUppercase ? 'ESCREVA TODOS OS TEXTOS EM LETRAS MAIÚSCULAS' : 'Normal'}.
Cada um dos 6 estágios deve conter:
- id: "stage-1" até "stage-6"
- title: título da etapa
- scenario: situação-problema simples e acolhedora
- clue: dica direta
- options: 2 a 3 alternativas simples, cada uma com text, isCorrect (boolean), pointsWeight (10 se correta, 0 se incorreta), feedback acolhedor e iconEmoji ilustrativo
- pneMildStage: versão binária simples com scenario e 2 options (text, isCorrect, feedback)
- pneSevereStage: versão lúdica com playfulPrompt e 3 visualCards (iconEmoji, label, isCorrect, feedback)`
      : `Você é um Game Designer Pedagógico especialista em KronoGames (jogos avaliativos interativos para ensino médio).
Sua missão é gerar um jogo de 6 estágios estruturado em JSON sobre o tema "${topic}" da disciplina "${subject}".
Título: "${title}". Modo de Jogo: "${gameMode}".
Material de Apoio fornecido: "${supportMaterial.slice(0, 500)}".
Regra de Co-Op Inclusivo para Sala de Aula:
Em TODOS os 6 estágios, gere:
1. scenario e options desafiadores para estudantes regulares (com pointsWeight, feedback pedagógico e iconEmoji);
2. pneMildStage: rodada adaptada com 2 opções diretas sobre o mesmo conceito;
3. pneSevereStage: rodada lúdica com cartões visuais (iconEmoji, label, isCorrect, feedback) para que colegas com deficiência severa joguem no mesmo aparelho em equipe.`;

    const prompt = `Gere os 6 estágios completos no formato JSON de gameData:
{
  "introText": "texto de introdução convidativo para os alunos",
  "stages": [
    {
      "id": "stage-1",
      "title": "título do estágio",
      "scenario": "enunciado",
      "clue": "dica reflexiva",
      "options": [
        { "text": "opção", "isCorrect": true, "pointsWeight": 10, "feedback": "feedback positivo", "iconEmoji": "🎯" },
        { "text": "distrator", "isCorrect": false, "pointsWeight": 0, "feedback": "feedback construtivo", "iconEmoji": "❌" }
      ],
      "pneMildStage": {
        "scenario": "situação simplificada",
        "options": [
          { "text": "correta", "isCorrect": true, "feedback": "muito bem!" },
          { "text": "incorreta", "isCorrect": false, "feedback": "tente novamente" }
        ]
      },
      "pneSevereStage": {
        "playfulPrompt": "toque no cartão...",
        "visualCards": [
          { "iconEmoji": "🤝", "label": "opção correta", "isCorrect": true, "feedback": "parabéns!" },
          { "iconEmoji": "🛑", "label": "distrator", "isCorrect": false, "feedback": "observe com carinho" },
          { "iconEmoji": "⚡", "label": "distrator", "isCorrect": false, "feedback": "procure o outro" }
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
            temperature: 0.7,
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

    // Se a IA não responder ou responder JSON quebrado, aciona o fallback garantido
    const fallbackData = generateFallbackInteractiveData(payload);
    return NextResponse.json({ gameData: fallbackData, isFallback: true });
  } catch (error: any) {
    console.error('[Generate Interactive] Erro inesperado:', error);
    const fallbackData = generateFallbackInteractiveData(payload);
    return NextResponse.json({ gameData: fallbackData, isFallback: true });
  }
}
