import { Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient, isGeminiAuthError } from '@/lib/gemini';
import { GameData, GameMode, GameStage } from '@/lib/types';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

function generateFallbackGameData(
  title: string,
  subject: string = 'Sociologia',
  topic: string = 'Sociedade e Cidadania',
  gameMode: GameMode = 'millionaire'
): GameData {
  const safeTopic = topic || title || 'Conhecimento e Sociedade';
  const safeSubject = subject || 'Sociologia';

  let introText = '';
  const stages: GameStage[] = [];

  if (gameMode === 'millionaire') {
    introText = `Bem-vindos à Arena do Milhão de ${safeSubject}! Vocês trabalharão em equipe para escalar as 6 rodadas do conhecimento sobre "${safeTopic}". Usem sabedoria coletiva, consultem as pistas dos grandes mestres e busquem a pontuação máxima de 10 pontos!`;

    const stagesConfig = [
      {
        title: 'Rodada 1: O Ponto de Partida',
        scenario: `Para começar a jornada sobre ${safeTopic}, identifiquem a premissa fundamental aceita pelas ciências humanas:`,
        clue: 'Pista dos Clássicos: Pensem no que diferencia o senso comum da análise reflexiva sistemática.',
        correct: `Compreender ${safeTopic} requer investigação fundamentada além das aparências imediatas.`,
        distractors: [
          `Opiniões individuais sem evidências bastam para explicar ${safeTopic}.`,
          `Fatos sociais são meras coincidências biológicas imutáveis.`,
          `A sociedade não exerce qualquer influência nas escolhas humanas.`
        ],
        mildScenario: `Sobre o tema ${safeTopic}, o que a ciência busca entender?`,
        mildCorrect: `Como as pessoas se organizam e interagem na sociedade`,
        mildDistractor: `Apenas a velocidade das estrelas no espaço`,
        severePrompt: `Toque no cartão que mostra união, respeito e sociedade:`,
        severeCards: [
          { iconEmoji: '🤝', label: 'União e Ajuda Mútua', isCorrect: true, feedback: 'Excelente! A sociedade se constrói com união e respeito mútuo!' },
          { iconEmoji: '🌪️', label: 'Confusão e Barulho', isCorrect: false, feedback: 'Tente novamente! Procure a atitude positiva!' },
          { iconEmoji: '🛑', label: 'Parada Brusca', isCorrect: false, feedback: 'Observe com carinho o cartão que representa união!' }
        ]
      },
      {
        title: 'Rodada 2: Conceitos Estruturais',
        scenario: `Aprofundando os conceitos de ${safeTopic}, qual aspecto evidencia sua relevância no cotidiano?`,
        clue: 'Pista dos Clássicos: Lembrem-se das regras sociais invisíveis que moldam nossos hábitos.',
        correct: `As instituições sociais e normas coletivas guiam comportamentos e geram coesão.`,
        distractors: [
          `Ninguém precisa de cooperação ou regras para viver em comunidade.`,
          `Apenas a força física determina as escolhas culturais de um povo.`,
          `O ambiente social não tem nenhum efeito sobre a cidadania.`
        ],
        mildScenario: `Por que regras de convivência são importantes para ${safeTopic}?`,
        mildCorrect: `Para garantir justiça, respeito e paz entre todos`,
        mildDistractor: `Para impedir as pessoas de pensarem e aprenderem`,
        severePrompt: `Qual símbolo representa estudo, saber e livros?`,
        severeCards: [
          { iconEmoji: '📚', label: 'Livro do Conhecimento', isCorrect: true, feedback: 'Muito bem! Os livros nos ajudam a aprender e crescer!' },
          { iconEmoji: '🍕', label: 'Fatia de Pizza', isCorrect: false, feedback: 'Uma pizza é gostosa, mas procure o símbolo dos estudos!' },
          { iconEmoji: '⚽', label: 'Bola de Futebol', isCorrect: false, feedback: 'O esporte é legal, mas procure o que usamos para estudar!' }
        ]
      },
      {
        title: 'Rodada 3: Desafios Contemporâneos',
        scenario: `Ao analisar ${safeTopic} na sociedade atual, qual é o principal obstáculo a ser superado?`,
        clue: 'Pista dos Clássicos: Pensem na desigualdade de oportunidades e na exclusão social.',
        correct: `Superar preconceitos históricos e promover a inclusão de todos os cidadãos.`,
        distractors: [
          `Aceitar que as injustiças sociais são naturais e nunca mudarão.`,
          `Ignorar as diferenças culturais e impor uma visão única.`,
          `Descartar o diálogo democrático em favor do individualismo isolado.`
        ],
        mildScenario: `Como devemos tratar os colegas e pessoas diferentes de nós?`,
        mildCorrect: `Com empatia, inclusão e respeito aos direitos de todos`,
        mildDistractor: `Com desprezo e preconceito`,
        severePrompt: `Escolha o cartão com o coração de empatia e carinho:`,
        severeCards: [
          { iconEmoji: '❤️', label: 'Coração de Empatia', isCorrect: true, feedback: 'Parabéns! Empatia e amor ao próximo transformam o mundo!' },
          { iconEmoji: '🌧️', label: 'Nuvem Escura', isCorrect: false, feedback: 'Procure o cartão que transmite amor e acolhimento!' },
          { iconEmoji: '⚙️', label: 'Engrenagem Fria', isCorrect: false, feedback: 'Procure o coração quentinho!' }
        ]
      },
      {
        title: 'Rodada 4: Análise Crítica',
        scenario: `Qual postura crítica é necessária para compreender criticamente ${safeTopic}?`,
        clue: 'Pista dos Clássicos: Desnaturalizar o que parece óbvio e questionar certezas pré-fabricadas.',
        correct: `Exercitar o estranhamento e investigar as raízes históricas dos fenômenos.`,
        distractors: [
          `Repetir boatos sem checar fontes ou estudos científicos.`,
          `Acreditar que tudo sempre foi assim e não pode ser transformado.`,
          `Julgar outras realidades usando apenas os próprios preconceitos.`
        ],
        mildScenario: `Quando recebemos uma notícia sobre ${safeTopic}, o que devemos fazer?`,
        mildCorrect: `Verificar se é verdadeira e buscar fontes seguras`,
        mildDistractor: `Acreditar em qualquer mentira sem pensar`,
        severePrompt: `Toque na lupa de investigação e curiosidade:`,
        severeCards: [
          { iconEmoji: '🔍', label: 'Lupa Investigadora', isCorrect: true, feedback: 'Sensacional! Investigar e ter curiosidade nos faz aprender mais!' },
          { iconEmoji: '📦', label: 'Caixa Fechada', isCorrect: false, feedback: 'A caixa está fechada! Procure a lupa de pesquisador!' },
          { iconEmoji: '🗑️', label: 'Lixeira', isCorrect: false, feedback: 'Não jogue fora a chance de investigar! Escolha a lupa!' }
        ]
      },
      {
        title: 'Rodada 5: Prática Cidadã e Coletiva',
        scenario: `Como os cidadãos podem atuar positivamente sobre o tema ${safeTopic}?`,
        clue: 'Pista dos Clássicos: Ação coletiva, participação política e solidariedade orgânica.',
        correct: `Através da participação cívica, defesa dos direitos humanos e apoio mútuo.`,
        distractors: [
          `Isolando-se e recusando qualquer tipo de cooperação social.`,
          `Atacando instituições democráticas e promovendo a intolerância.`,
          `Deixando todas as decisões para terceiros sem exercer reflexão.`
        ],
        mildScenario: `O que faz de alguém um bom cidadão na escola e comunidade?`,
        mildCorrect: `Ajudar a comunidade e defender os direitos de quem precisa`,
        mildDistractor: `Destruir o patrimônio público e brigar`,
        severePrompt: `Qual cartão mostra trabalho em equipe e mãos dadas?`,
        severeCards: [
          { iconEmoji: '👥', label: 'Mãos Dadas em Equipe', isCorrect: true, feedback: 'Brilhante! Juntos somos muito mais fortes!' },
          { iconEmoji: '🔒', label: 'Cadeado Trancado', isCorrect: false, feedback: 'O cadeado prende! Queremos união e mãos dadas!' },
          { iconEmoji: '🧱', label: 'Muro de Tijolos', isCorrect: false, feedback: 'Muros separam, mas mãos dadas unem!' }
        ]
      },
      {
        title: 'Rodada Final: O Grande Veredito do Milhão',
        scenario: `Para conquistar a pontuação máxima de 10 pts, sintetizem o valor de ${safeTopic} para a humanidade:`,
        clue: 'Pista dos Clássicos: A sociologia e a filosofia buscam a emancipação do ser humano.',
        correct: `A emancipação crítica dos indivíduos constrói uma sociedade justa, consciente e plural.`,
        distractors: [
          `A sociedade só funciona quando uns dominam e oprimem os outros.`,
          `O conhecimento crítico é dispensável para a convivência democrática.`,
          `O progresso social independe de valores éticos ou solidariedade.`
        ],
        mildScenario: `Para finalizar: qual é o maior benefício de aprender sobre ${safeTopic}?`,
        mildCorrect: `Construir um futuro mais justo e respeitoso para todos`,
        mildDistractor: `Criar discórdia e afastar as pessoas`,
        severePrompt: `Toque no troféu dourado da vitória do conhecimento!`,
        severeCards: [
          { iconEmoji: '🏆', label: 'Troféu da Vitória', isCorrect: true, feedback: 'Vitória magnífica! Você concluiu todas as rodadas com louvor!' },
          { iconEmoji: '⏳', label: 'Ampulheta', isCorrect: false, feedback: 'O tempo voa, mas o troféu é seu objetivo!' },
          { iconEmoji: '🕯️', label: 'Vela Apagada', isCorrect: false, feedback: 'Procure o grande troféu dourado!' }
        ]
      }
    ];

    stagesConfig.forEach((cfg, idx) => {
      stages.push({
        id: `stg-${idx + 1}`,
        title: cfg.title,
        scenario: cfg.scenario,
        clue: cfg.clue,
        options: [
          { text: cfg.correct, isCorrect: true, pointsWeight: 1.67, feedback: 'Exato! Fundamentação científica e raciocínio crítico corretos.' },
          { text: cfg.distractors[0], isCorrect: false, pointsWeight: 0, feedback: 'Incorreto. Essa visão reflete senso comum sem base científica.' },
          { text: cfg.distractors[1], isCorrect: false, pointsWeight: 0, feedback: 'Incorreto. A ciência demonstra o caráter social e transformador.' },
          { text: cfg.distractors[2], isCorrect: false, pointsWeight: 0, feedback: 'Incorreto. O compromisso ético e cidadão exige participação.' },
        ],
        pneMildStage: {
          scenario: cfg.mildScenario,
          options: [
            { text: cfg.mildCorrect, isCorrect: true, feedback: 'Muito bem! Resposta certíssima e muito clara!' },
            { text: cfg.mildDistractor, isCorrect: false, feedback: 'Ops, tente a outra alternativa com mais calma!' },
          ]
        },
        pneSevereStage: {
          playfulPrompt: cfg.severePrompt,
          visualCards: cfg.severeCards
        }
      });
    });
  } else if (gameMode === 'dialectic_tribunal') {
    introText = `O Tribunal Dialético de ${safeSubject} está em sessão! O tema em julgamento é "${safeTopic}". Analisem as falácias do senso comum e escolham a refutação científica sólida para garantir a justiça do saber.`;

    const tribunalCases = [
      {
        thesis: `Falácia 1: "As desigualdades sociais sempre existiram e são inevitáveis porque dependem unicamente da vontade de cada um."`,
        ruling: `Refutação Científica: As desigualdades decorrem de estruturas históricas, econômicas e sociais que distribuem recursos de forma assimétrica.`,
        fallacies: [
          `Concordar que a biologia determina quem tem sucesso ou fracasso.`,
          `Afirmar que a sorte cósmica é a única responsável pelas oportunidades.`,
          `Ignorar as políticas públicas e aceitar o determinismo fatalista.`
        ],
        mildPrompt: `É verdade que todo mundo nasce com as mesmas oportunidades sem precisar de ajuda?`,
        mildCorrect: `Não, pessoas diferentes precisam de apoio e justiça social`,
        mildWrong: `Sim, tudo é igualzinho para todo mundo desde sempre`,
        severePrompt: `Toque na balança da justiça e equilíbrio:`,
        severeCards: [
          { iconEmoji: '⚖️', label: 'Balança da Justiça', isCorrect: true, feedback: 'Justiça e igualdade! Você acertou!' },
          { iconEmoji: '🔨', label: 'Martelo Quebrado', isCorrect: false, feedback: 'Procure a balança que pesa com equilíbrio!' },
          { iconEmoji: '🎲', label: 'Dado de Jogo', isCorrect: false, feedback: 'A justiça não é sorte, é equilíbrio!' }
        ]
      },
      {
        thesis: `Falácia 2: "A cultura de um país é superior à de outros quando tem mais tecnologia moderna."`,
        ruling: `Refutação Científica: O etnocentrismo distorce a realidade; cada cultura possui lógica própria e nenhuma é naturalmente superior.`,
        fallacies: [
          `Classificar culturas tradicionais como atrasadas e sem valor.`,
          `Impor uma única língua e proibir costumes ancestrais.`,
          `Acreditar que a tecnologia anula a sabedoria dos povos originários.`
        ],
        mildPrompt: `Existe cultura melhor ou pior do que a outra no mundo?`,
        mildCorrect: `Não, cada cultura tem seu valor e merece respeito`,
        mildWrong: `Sim, só a cultura de países ricos presta`,
        severePrompt: `Toque no globo terrestre colorido com várias culturas:`,
        severeCards: [
          { iconEmoji: '🌍', label: 'Planeta Terra Diverso', isCorrect: true, feedback: 'Lindo! A diversidade de pessoas enriquece o planeta!' },
          { iconEmoji: '💣', label: 'Bomba', isCorrect: false, feedback: 'Paz e respeito são o caminho certo!' },
          { iconEmoji: '🕳️', label: 'Buraco Escuro', isCorrect: false, feedback: 'Olhe para a beleza do planeta Terra!' }
        ]
      },
      {
        thesis: `Falácia 3: "O jovem de hoje não se interessa por política ou pelos problemas da sociedade."`,
        ruling: `Refutação Científica: A juventude reinventa formas de ativismo através de redes, grêmios, arte e movimentos ecológicos.`,
        fallacies: [
          `Afirmar que participar de causas só tem valor se for em partidos tradicionais.`,
          `Desprezar manifestações artísticas como forma de expressão cidadã.`,
          `Acreditar que a nova geração é apática e indiferente ao futuro.`
        ],
        mildPrompt: `Os jovens e estudantes podem mudar a escola para melhor?`,
        mildCorrect: `Sim, dando ideias boas e trabalhando em grupo`,
        mildWrong: `Não, estudante não deve falar nada`,
        severePrompt: `Toque no megafone da voz ativa e do diálogo:`,
        severeCards: [
          { iconEmoji: '📢', label: 'Megafone da Expressão', isCorrect: true, feedback: 'Que potência! Nossa voz constrói cidadania!' },
          { iconEmoji: '🔇', label: 'Som Mudo', isCorrect: false, feedback: 'Não se cale! Escolha a voz da participação!' },
          { iconEmoji: '💤', label: 'Dormindo', isCorrect: false, feedback: 'Acorde e faça sua voz ecoar no megafone!' }
        ]
      },
      {
        thesis: `Falácia 4: "Preconceito e bullying são só brincadeiras normais de adolescência que fortalecem o caráter."`,
        ruling: `Refutação Científica: Práticas discriminatórias causam danos psicológicos severos e reproduzem violências estruturais.`,
        fallacies: [
          `Rir de ofensas raciais ou capacitistas como se fossem humor inocente.`,
          `Culpabilizar quem sofre agressão por não saber 'levar na esportiva'.`,
          `Achar que tolerar violência diminui o problema.`
        ],
        mildPrompt: `O que devemos fazer quando vemos alguém sofrendo bullying?`,
        mildCorrect: `Apoiar o colega e avisar professores ou responsáveis`,
        mildWrong: `Achar graça e zombar junto`,
        severePrompt: `Toque no escudo de proteção e amizade:`,
        severeCards: [
          { iconEmoji: '🛡️', label: 'Escudo Protetor da Amizade', isCorrect: true, feedback: 'Muito bem! Proteger os amigos é um ato heroico!' },
          { iconEmoji: '🌵', label: 'Cacto Espinhoso', isCorrect: false, feedback: 'Espinhos machucam! Escolha o escudo que protege!' },
          { iconEmoji: '🔥', label: 'Fogo Perigoso', isCorrect: false, feedback: 'O fogo queima! Procure a segurança do escudo!' }
        ]
      },
      {
        thesis: `Falácia 5: "A escola só serve para conseguir diploma e trabalho, não para pensar sobre a vida."`,
        ruling: `Refutação Científica: A educação tem finalidade cidadã e emancipatória, desenvolvendo autonomia e pensamento crítico.`,
        fallacies: [
          `Reduzir seres humanos a meras peças de reposição mecânica.`,
          `Eliminar matérias de humanidades porque 'não geram lucro rápido'.`,
          `Treinar alunos apenas para decorar fórmulas sem entender seu significado.`
        ],
        mildPrompt: `Para que serve a escola além de tirar notas?`,
        mildCorrect: `Para aprender a conviver, pensar e ser uma pessoa melhor`,
        mildWrong: `Apenas para ficar sentado decorando palavras`,
        severePrompt: `Toque na lâmpada das ideias brilhantes:`,
        severeCards: [
          { iconEmoji: '💡', label: 'Lâmpada da Ideia Genial', isCorrect: true, feedback: 'Incrível! Novas ideias iluminam o caminho!' },
          { iconEmoji: '🔋', label: 'Pilha Fraca', isCorrect: false, feedback: 'A mente precisa de energia criativa! Procure a lâmpada!' },
          { iconEmoji: '🔌', label: 'Tomada', isCorrect: false, feedback: 'A ideia é a lâmpada que brilha!' }
        ]
      },
      {
        thesis: `Falácia 6: "Quem pensa diferente de mim em sociedade é meu inimigo e não merece diálogo."`,
        ruling: `Refutação Científica: A democracia se fundamenta na pluralidade de ideias e no respeito inegociável aos direitos fundamentais.`,
        fallacies: [
          `Perseguir quem expressa convicções pacíficas distintas.`,
          `Acreditar que só um grupo detém a verdade absoluta sobre tudo.`,
          `Romper qualquer laço comunitário devido à divergência de opiniões.`
        ],
        mildPrompt: `Como pessoas que pensam diferente devem resolver seus conflitos?`,
        mildCorrect: `Conversando com respeito e ouvindo o outro lado`,
        mildWrong: `Brigando e agredindo quem discorda`,
        severePrompt: `Toque no aperto de mãos da paz e cooperação:`,
        severeCards: [
          { iconEmoji: '🤝', label: 'Aperto de Mãos da Paz', isCorrect: true, feedback: 'Perfeito! O diálogo e a paz são os maiores trunfos da humanidade!' },
          { iconEmoji: '🥊', label: 'Luva de Briga', isCorrect: false, feedback: 'Violência nunca resolve! Escolha o aperto de mãos!' },
          { iconEmoji: '⚔️', label: 'Espadas Cruzadas', isCorrect: false, feedback: 'Guerra não é a resposta! Escolha a conciliação!' }
        ]
      }
    ];

    tribunalCases.forEach((tc, idx) => {
      stages.push({
        id: `tribunal-${idx + 1}`,
        title: `Caso ${idx + 1}: Veredito Dialético`,
        scenario: tc.thesis,
        clue: 'Pista dos Juízes: Escolham o argumento fundamentado no método científico e nos direitos humanos.',
        options: [
          { text: tc.ruling, isCorrect: true, pointsWeight: 1.67, feedback: 'Veredito impecável! Refutação científica acolhida com unanimidade.' },
          { text: tc.fallacies[0], isCorrect: false, pointsWeight: 0, feedback: 'Alegação rejeitada. Argumento insustentável cientificamente.' },
          { text: tc.fallacies[1], isCorrect: false, pointsWeight: 0, feedback: 'Alegação rejeitada. Contraria evidências históricas sólidas.' },
          { text: tc.fallacies[2], isCorrect: false, pointsWeight: 0, feedback: 'Alegação rejeitada. Fere princípios da análise crítica.' },
        ],
        pneMildStage: {
          scenario: tc.mildPrompt,
          options: [
            { text: tc.mildCorrect, isCorrect: true, feedback: 'Excelente veredito! Você acertou em cheio!' },
            { text: tc.mildWrong, isCorrect: false, feedback: 'Pense bem sobre respeito e tente novamente!' }
          ]
        },
        pneSevereStage: {
          playfulPrompt: tc.severePrompt,
          visualCards: tc.severeCards
        }
      });
    });
  } else if (gameMode === 'rpg_campaign') {
    introText = `Crônicas da Pólis: Campanha de RPG de ${safeSubject}. Vocês são heróis do pensamento encarregados de reconstruir a harmonia na cidade afetada por dilemas sobre "${safeTopic}". Em 6 atos, façam as melhores escolhas estratégicas para o bem comum!`;

    const rpgActs = [
      {
        act: 'Ato I: A Chegada aos Portões da Pólis',
        desc: `Um boato espalhou-se pela praça central sobre ${safeTopic}, criando desconfiança entre os cidadãos. Qual é sua primeira ação como conselheiro?`,
        clue: 'Perícia Investigação: Reúna fatos antes de tomar qualquer decisão impulsiva.',
        choice: `Convocar uma assembleia aberta para ouvir todas as partes e analisar os dados reais.`,
        badChoices: [
          `Prender quem questionar o boato sem averiguar a verdade.`,
          `Fugir da cidade e abandonar os cidadãos à própria sorte.`,
          `Espalhar mais rumores para gerar pânico e ganhar influência.`
        ],
        mildDesc: `As pessoas da cidade estão com medo de boatos. O que você faz?`,
        mildCorrect: `Conversa com calma e busca saber a verdade dos fatos`,
        mildWrong: `Grita com todo mundo e aumenta a confusão`,
        severePrompt: `Toque na chave dourada que abre as portas da verdade:`,
        severeCards: [
          { iconEmoji: '🗝️', label: 'Chave Dourada da Verdade', isCorrect: true, feedback: 'Parabéns! A verdade abre todas as portas certas!' },
          { iconEmoji: '🕸️', label: 'Teia de Aranha', isCorrect: false, feedback: 'Cuidado para não se enroscar em mentiras! Escolha a chave!' },
          { iconEmoji: '🚪', label: 'Porta Trancada', isCorrect: false, feedback: 'Abra com a chave dourada!' }
        ]
      },
      {
        act: 'Ato II: O Enigma da Biblioteca Esquecida',
        desc: `Nos arquivos da cidade, há pergaminhos antigos sobre ${safeTopic}. Como aplicar essa sabedoria ao presente?`,
        clue: 'Perícia História: O passado nos ensina como as conquistas sociais foram difíceis.',
        choice: `Interpretar as lições do passado com olhar crítico para solucionar o dilema moderno.`,
        badChoices: [
          `Queimar os livros porque foram escritos em outra época.`,
          `Copiar regras antigas sem adaptação às necessidades atuais.`,
          `Ignorar o conhecimento acumulado e agir puramente por instinto.`
        ],
        mildDesc: `Encontramos livros com histórias importantes. Como devemos usá-los?`,
        mildCorrect: `Lendo com atenção para aprender lições valiosas`,
        mildWrong: `Rasgando as páginas sem ler nada`,
        severePrompt: `Toque na tocha que ilumina o caminho no escuro:`,
        severeCards: [
          { iconEmoji: '🔥', label: 'Tocha Iluminadora', isCorrect: true, feedback: 'Que luz brilhante! O saber ilumina nossa jornada!' },
          { iconEmoji: '🌑', label: 'Noite Escura', isCorrect: false, feedback: 'Está muito escuro! Use a tocha para enxergar!' },
          { iconEmoji: '💨', label: 'Vento que Apaga', isCorrect: false, feedback: 'Proteja a chama do conhecimento!' }
        ]
      },
      {
        act: 'Ato III: A Ponte Quebrada do Diálogo',
        desc: `Dois bairros da Pólis entraram em atrito sobre a partilha de água e serviços, relacionando-se diretamente a ${safeTopic}. O que fazer?`,
        clue: 'Perícia Mediação: A cooperação gera mais abundância do que a disputa egoísta.',
        choice: `Propor uma divisão justa e solidária dos recursos com comitês conjuntos.`,
        badChoices: [
          `Dar todos os recursos ao bairro mais forte e rico.`,
          `Incentivar a batalha para ver quem sobrevive primeiro.`,
          `Fechar os reservatórios e deixar todos sem abastecimento.`
        ],
        mildDesc: `Dois grupos estão brigando por água. Qual a melhor solução?`,
        mildCorrect: `Dividir a água com justiça para que ninguém passe sede`,
        mildWrong: `Dar toda água para um lado só e deixar o outro com sede`,
        severePrompt: `Toque na ponte firme que liga os dois lados do rio:`,
        severeCards: [
          { iconEmoji: '🌉', label: 'Ponte da União', isCorrect: true, feedback: 'Excelente! Construir pontes é melhor do que erguer muros!' },
          { iconEmoji: '🌊', label: 'Rio Revolto', isCorrect: false, feedback: 'Não caia na água funda! Atravesse pela ponte segura!' },
          { iconEmoji: '🪨', label: 'Pedra no Caminho', isCorrect: false, feedback: 'Use a ponte para passar!' }
        ]
      },
      {
        act: 'Ato IV: A Fortaleza dos Preconceitos',
        desc: `Um grupo de conselheiros quer excluir cidadãos vulneráveis das decisões da Pólis sobre ${safeTopic}. Como agir?`,
        clue: 'Perícia Ética: A cidadania plena não admite castas ou privilégios injustos.',
        choice: `Defender vigorosamente a inclusão e o direito de voz de todos os moradores.`,
        badChoices: [
          `Apoiar a exclusão para agradar aos poderosos locais.`,
          `Omitir-se e fingir que a exclusão não atinge você.`,
          `Concordar que apenas quem tem dinheiro pode opinar.`
        ],
        mildDesc: `Querem proibir alguns colegas de participar da brincadeira. O que você faz?`,
        mildCorrect: `Defende que todos devem ser incluídos e respeitados`,
        mildWrong: `Concorda em deixar o colega triste de fora`,
        severePrompt: `Toque na estrela mágica da inclusão e do brilho coletivo:`,
        severeCards: [
          { iconEmoji: '⭐', label: 'Estrela Brilhante', isCorrect: true, feedback: 'Uau! Todo mundo tem um brilho único e especial!' },
          { iconEmoji: '🪨', label: 'Pedregulho Cinza', isCorrect: false, feedback: 'Escolha a estrela mágica que brilha para todos!' },
          { iconEmoji: '🕸️', label: 'Poeira', isCorrect: false, feedback: 'Olhe para a estrela brilhante lá no alto!' }
        ]
      },
      {
        act: 'Ato V: O Desafio da Renovação Coletiva',
        desc: `A cidade enfrenta uma grande seca econômica. Como renovar a esperança e a produção em sintonia com ${safeTopic}?`,
        clue: 'Perícia Sustentabilidade: A economia solidária e a preservação ambiental garantem o amanhã.',
        choice: `Fomentar hortas comunitárias, feiras de trocas e preservação dos bens naturais.`,
        badChoices: [
          `Vender as florestas públicas para especuladores estrangeiros.`,
          `Cobrar tributos impagáveis dos trabalhadores mais pobres.`,
          `Abandonar o cuidado com os idosos e as crianças da cidade.`
        ],
        mildDesc: `Como podemos cuidar da nossa escola e praça para todos ficarem bem?`,
        mildCorrect: `Plantando mudas, limpando o lixo e cuidando dos espaços`,
        mildWrong: `Jogando lixo no chão e sujando as paredes`,
        severePrompt: `Toque na plantinha verde que cresce com cuidado e carinho:`,
        severeCards: [
          { iconEmoji: '🌱', label: 'Broto de Esperança', isCorrect: true, feedback: 'Que lindo! Cuidar da vida gera frutos maravilhosos!' },
          { iconEmoji: '🍂', label: 'Folha Seca', isCorrect: false, feedback: 'A plantinha viva precisa de água! Procure o broto verde!' },
          { iconEmoji: '🪵', label: 'Galho Quebrado', isCorrect: false, feedback: 'Procure o brotinho novo crescendo!' }
        ]
      },
      {
        act: 'Ato VI: A Coroação da Pólis Consciente',
        desc: `A Pólis alcançou paz e justiça graças às decisões sábias sobre ${safeTopic}. Qual é o legado definitivo da sua guilda?`,
        clue: 'Perícia Sabedoria: O maior triunfo é deixar a sociedade mais forte e acolhedora.',
        choice: `Uma constituição cidadã onde todo ser humano tem dignidade, direitos e deveres protegidos.`,
        badChoices: [
          `Um monumento de ouro em homenagem exclusiva aos governantes.`,
          `Um exército que amedronta os próprios cidadãos.`,
          `O retorno aos velhos hábitos de corrupção e desamparo.`
        ],
        mildDesc: `Qual é o final feliz da nossa história de cooperação?`,
        mildCorrect: `Uma comunidade alegre onde todos se ajudam e vivem em paz`,
        mildWrong: `Uma cidade triste onde as pessoas continuam brigando`,
        severePrompt: `Toque no castelo dourado da comunidade em festa:`,
        severeCards: [
          { iconEmoji: '🏰', label: 'Castelo da Cidade em Festa', isCorrect: true, feedback: 'Vitória épica! A Pólis foi salva pela sabedoria coletiva!' },
          { iconEmoji: '🕳️', label: 'Fosso Vazio', isCorrect: false, feedback: 'Olhe para a imponência do castelo vitorioso!' },
          { iconEmoji: '🌧️', label: 'Chuva Fria', isCorrect: false, feedback: 'Comemore no castelo alegre!' }
        ]
      }
    ];

    rpgActs.forEach((act, idx) => {
      stages.push({
        id: `rpg-${idx + 1}`,
        title: act.act,
        scenario: act.desc,
        clue: act.clue,
        options: [
          { text: act.choice, isCorrect: true, pointsWeight: 1.67, feedback: 'Decisão magistral! Sua guilda ganha +100 de sabedoria e avança triunfante.' },
          { text: act.badChoices[0], isCorrect: false, pointsWeight: 0, feedback: 'Escolha perigosa. Isso desestabiliza a Pólis e fere a ética.' },
          { text: act.badChoices[1], isCorrect: false, pointsWeight: 0, feedback: 'A omissão enfraquece os laços sociais comunitários.' },
          { text: act.badChoices[2], isCorrect: false, pointsWeight: 0, feedback: 'Essa rota gera discórdia e afasta a solução real.' },
        ],
        pneMildStage: {
          scenario: act.mildDesc,
          options: [
            { text: act.mildCorrect, isCorrect: true, feedback: 'Muito bom! Herói sábio que pensa no bem de todos!' },
            { text: act.mildWrong, isCorrect: false, feedback: 'Cuidado! Escolha a atitude que traz paz!' }
          ]
        },
        pneSevereStage: {
          playfulPrompt: act.severePrompt,
          visualCards: act.severeCards
        }
      });
    });
  } else {
    // real_life_lab
    introText = `Laboratório da Vida Real de ${safeSubject}! Vocês foram contratados como consultores sociais para diagnosticar 6 situações concretas do dia a dia sobre "${safeTopic}". Apliquem o método científico prático para resolver cada caso!`;

    const cases = [
      {
        title: 'Caso 1: O Dilema do Transporte Público',
        scenario: `Trabalhadores da periferia levam 2h a mais para chegar ao trabalho devido à falta de linhas integradas, impactando ${safeTopic}. Qual diagnóstico técnico é mais preciso?`,
        clue: 'Pista Prática: Mobilidade urbana é um direito social essencial à igualdade de condições.',
        correct: `A segregação socioespacial limita o acesso a oportunidades, exigindo investimento em transporte de qualidade.`,
        distractors: [
          `Quem mora longe deve simplesmente acordar de madrugada sem reclamar.`,
          `Transporte público não tem relação alguma com dignidade ou cidadania.`,
          `O trânsito é inevitável e não cabe ao poder público planejar soluções.`
        ],
        mildScenario: `Por que ônibus e transporte de qualidade são importantes para as pessoas?`,
        mildCorrect: `Para chegar ao trabalho e escola com segurança e sem cansaço excessivo`,
        mildDistractor: `Para passear à toa sem motivo algum`,
        severePrompt: `Toque no ônibus escolar que leva os estudantes com segurança:`,
        severeCards: [
          { iconEmoji: '🚌', label: 'Ônibus Seguro', isCorrect: true, feedback: 'Muito bem! Transporte bom ajuda todo mundo a chegar bem!' },
          { iconEmoji: '🛑', label: 'Placa de Pare', isCorrect: false, feedback: 'O ônibus está esperando por você!' },
          { iconEmoji: '🛞', label: 'Pneu Furado', isCorrect: false, feedback: 'Procure o ônibus funcionando!' }
        ]
      },
      {
        title: 'Caso 2: Acessibilidade na Escola e no Bairro',
        scenario: `Uma escola tem alunos cadeirantes e pessoas com mobilidade reduzida, mas as calçadas e portas são estreitas. Qual medida concreta resolve o problema?`,
        clue: 'Pista Prática: O Desenho Universal garante autonomia para todas as pessoas.',
        correct: `Adaptar rampas, corrimãos e portas conforme normas de acessibilidade universal.`,
        distractors: [
          `Pedir aos alunos que fiquem em casa para não atrapalhar o fluxo.`,
          `Esperar que voluntários carreguem os colegas no colo todos os dias.`,
          `Colocar placas avisando que o local não é para pessoas com deficiência.`
        ],
        mildScenario: `O que uma escola deve ter para receber alunos cadeirantes?`,
        mildCorrect: `Rampas acessíveis e portas adequadas`,
        mildDistractor: `Escadarias íngremes sem rampa`,
        severePrompt: `Toque na rampa de acesso e acessibilidade:`,
        severeCards: [
          { iconEmoji: '♿', label: 'Rampa de Acessibilidade', isCorrect: true, feedback: 'Show! Acessibilidade é um direito de todos!' },
          { iconEmoji: '🪜', label: 'Escada Alta', isCorrect: false, feedback: 'A escada não serve para a cadeira! Escolha a rampa!' },
          { iconEmoji: '🚧', label: 'Cavalete de Bloqueio', isCorrect: false, feedback: 'Não bloqueie! Abra o caminho acessível!' }
        ]
      },
      {
        title: 'Caso 3: O Desafio da Merenda Saudável',
        scenario: `Estudantes consom muitos alimentos ultraprocessados, gerando problemas de saúde e falta de concentração. Como o laboratório propõe intervir?`,
        clue: 'Pista Prática: Alimentação de qualidade apoia a agricultura familiar e melhora a aprendizagem.',
        correct: `Comprar alimentos frescos da agricultura familiar local e promover educação nutricional.`,
        distractors: [
          `Substituir refeições por suplementos químicos e refrigerantes.`,
          `Proibir o almoço na escola para cortar despesas imediatas.`,
          `Ignorar a saúde dos alunos e focar unicamente em notas de prova.`
        ],
        mildScenario: `Que tipo de comida nos dá mais energia saudável para estudar?`,
        mildCorrect: `Frutas, verduras e comida caseira saudável`,
        mildDistractor: `Comer só salgadinho frito todo dia`,
        severePrompt: `Toque na maçã vermelha e suculenta:`,
        severeCards: [
          { iconEmoji: '🍎', label: 'Maçã Saudável', isCorrect: true, feedback: 'Que delícia! Comida saudável deixa o corpo forte e a mente esperta!' },
          { iconEmoji: '🍬', label: 'Bala Doce', isCorrect: false, feedback: 'Doce demais faz mal aos dentes! Procure a fruta fresca!' },
          { iconEmoji: '🍩', label: 'Rosquinha Frita', isCorrect: false, feedback: 'Procure a maçã cheia de vitaminas!' }
        ]
      },
      {
        title: 'Caso 4: Conflito no Grupo de WhatsApp da Turma',
        scenario: `Mensagens agressivas e apelidos ofensivos foram compartilhados no grupo da turma da escola. Qual intervenção pedagógica é a mais indicada?`,
        clue: 'Pista Prática: Cidadania digital requer empatia, responsabilização e diálogo restaurativo.',
        correct: `Realizar uma roda de conversa sobre empatia digital e responsabilizar conscientemente as partes.`,
        distractors: [
          `Incentivar vingança virtual e criar grupos paralelos para atacar os colegas.`,
          `Fingir que na internet tudo é permitido sem consequências no mundo real.`,
          `Expulsar imediatamente todos os alunos sem qualquer investigação.`
        ],
        mildScenario: `Como devemos nos comunicar nas mensagens do celular com os colegas?`,
        mildCorrect: `Com respeito, palavras gentis e carinho`,
        mildDistractor: `Ofendendo e criando apelidos chatos`,
        severePrompt: `Toque no coração verde de carinho e respeito:`,
        severeCards: [
          { iconEmoji: '💚', label: 'Coração Verde de Respeito', isCorrect: true, feedback: 'Muito bem! Respeito e afeto fazem a amizade brilhar!' },
          { iconEmoji: '💢', label: 'Símbolo de Raiva', isCorrect: false, feedback: 'Sem raiva! Escolha o coração de respeito!' },
          { iconEmoji: '⚡', label: 'Raio de Conflito', isCorrect: false, feedback: 'Acalme o coração e escolha o amor!' }
        ]
      },
      {
        title: 'Caso 5: Descarte Correto e Reciclagem',
        scenario: `A comunidade descarta lixo em terrenos baldios, atraindo insetos e poluindo os córregos locais. O que o plano de ação propõe?`,
        clue: 'Pista Prática: Coleta seletiva e conscientização ambiental geram renda e preservam a saúde.',
        correct: `Instalar pontos de coleta seletiva, apoiar cooperativas de reciclagem e educar moradores.`,
        distractors: [
          `Queimar o lixo ao ar livre aumentando a fumaça tóxica no ar.`,
          `Jogar o lixo no rio mais próximo durante a madrugada.`,
          `Multar sem orientar nem disponibilizar lixeiras adequadas.`
        ],
        mildScenario: `O que devemos fazer com o papel, plástico e lixo da escola?`,
        mildCorrect: `Jogar na lixeira certa para poder ser reciclado`,
        mildDistractor: `Jogar no chão do pátio ou na rua`,
        severePrompt: `Toque no símbolo verde de reciclagem:`,
        severeCards: [
          { iconEmoji: '♻️', label: 'Símbolo de Reciclagem', isCorrect: true, feedback: 'Genial! Proteger a natureza é dever de todo cidadão!' },
          { iconEmoji: '🗑️', label: 'Lata Transbordando', isCorrect: false, feedback: 'Vamos reciclar com o símbolo verde!' },
          { iconEmoji: '🔥', label: 'Fogo Queimando', isCorrect: false, feedback: 'Não queime! Recicle com sabedoria!' }
        ]
      },
      {
        title: 'Caso 6: Apresentação Final das Soluções',
        scenario: `Para concluir o relatório do laboratório com nota máxima (10 pts), qual é o impacto de aplicar o conhecimento prático na comunidade?`,
        clue: 'Pista Prática: O conhecimento científico tem valor quando melhora a vida concreta das pessoas.',
        correct: `Transformar teorias em práticas sociais que reduzem desigualdades e promovem a dignidade coletiva.`,
        distractors: [
          `Guardar as conclusões em uma gaveta sem compartilhar com ninguém.`,
          `Cobrar dinheiro dos vizinhos para mostrar o que foi descoberto.`,
          `Concluir que nenhum problema social pode ser resolvido.`
        ],
        mildScenario: `O que aprendemos quando aplicamos nossos estudos na vida real?`,
        mildCorrect: `Que nosso conhecimento pode ajudar a melhorar a vida de todos`,
        mildDistractor: `Que estudar não serve para nada de bom`,
        severePrompt: `Toque na medalha de ouro de honra e dever cumprido!`,
        severeCards: [
          { iconEmoji: '🥇', label: 'Medalha de Ouro', isCorrect: true, feedback: 'Parabéns campeão! O laboratório da vida real foi um sucesso estrondoso!' },
          { iconEmoji: '🪙', label: 'Moeda Perdida', isCorrect: false, feedback: 'Procure a medalha de ouro brilhante!' },
          { iconEmoji: '🪨', label: 'Cascalho', isCorrect: false, feedback: 'Você conquistou a medalha de ouro!' }
        ]
      }
    ];

    cases.forEach((c, idx) => {
      stages.push({
        id: `lab-${idx + 1}`,
        title: c.title,
        scenario: c.scenario,
        clue: c.clue,
        options: [
          { text: c.correct, isCorrect: true, pointsWeight: 1.67, feedback: 'Diagnóstico e proposta de excelência! Solução viável e socialmente justa.' },
          { text: c.distractors[0], isCorrect: false, pointsWeight: 0, feedback: 'Proposta inviável. Contraria os direitos sociais e a dignidade.' },
          { text: c.distractors[1], isCorrect: false, pointsWeight: 0, feedback: 'Proposta incorreta. A ciência social busca a superação de barreiras.' },
          { text: c.distractors[2], isCorrect: false, pointsWeight: 0, feedback: 'Proposta desaconselhada. Falta base empírica e planejamento.' },
        ],
        pneMildStage: {
          scenario: c.mildScenario,
          options: [
            { text: c.mildCorrect, isCorrect: true, feedback: 'Muito bem! Resposta inteligente e solidária!' },
            { text: c.mildDistractor, isCorrect: false, feedback: 'Tente novamente pensando no que é melhor para todos!' }
          ]
        },
        pneSevereStage: {
          playfulPrompt: c.severePrompt,
          visualCards: c.severeCards
        }
      });
    });
  }

  return {
    introText,
    stages
  };
}

export async function POST(req: NextRequest) {
  try {
    const {
      title = 'Jogo do Conhecimento',
      subject = 'Sociologia',
      topic = '',
      supportMaterial = '',
      gameMode = 'millionaire',
      isAdaptedOnly = false,
      adaptationSeverity = 'mild_moderate'
    } = await req.json();

    const ai = getGeminiClient();

    if (!ai) {
      const fallback = generateFallbackGameData(title, subject, topic || title, gameMode);
      return NextResponse.json({ gameData: fallback, isFallback: true });
    }

    const modeLabels: Record<GameMode, { name: string; context: string; style: string }> = {
      millionaire: {
        name: 'Arena do Milhão',
        context: 'sala de aula em duplas ou grupos (cooperativo)',
        style: 'escada progressiva de 6 perguntas desafiadoras com dicas dos clássicos e 4 alternativas (1 correta).'
      },
      dialectic_tribunal: {
        name: 'Tribunal Dialético',
        context: 'sala de aula em duplas ou grupos (julgamento dialético)',
        style: '6 rodadas onde uma falácia do senso comum é exposta e os alunos escolhem a refutação científica sólida.'
      },
      structural_detective: {
        name: 'Detetive Estrutural',
        context: 'sala de aula em duplas ou grupos (investigação sociológica)',
        style: '6 enigmas de investigação social onde pistas estruturais revelam os mecanismos ocultos dos fenômenos sociais.'
      },
      rpg_campaign: {
        name: 'Crônicas da Pólis - Campanha de RPG',
        context: 'atividade de casa individual ou coletiva',
        style: 'narrativa interativa em 6 atos épicos onde decisões sociais práticas guiam o destino da comunidade.'
      },
      real_life_lab: {
        name: 'Laboratório da Vida Real',
        context: 'atividade prática de análise concreta',
        style: '6 estudos de casos reais do cotidiano sobre a disciplina, diagnosticando causas e soluções justas.'
      }
    };

    const currentModeInfo = modeLabels[gameMode as GameMode] || modeLabels.millionaire;

    const prompt = `
Você é um Designer Pedagógico Sênior e Especialista em Gamificação Educacional Inclusiva (AEE).
Crie o roteiro completo de um jogo avaliativo gamificado (KronoGames) com EXATAMENTE 6 ESTÁGIOS para estudantes do Ensino Médio/Fundamental II.

PARÂMETROS DA ATIVIDADE:
- Título: "${title}"
- Disciplina: "${subject}"
- Tema Central: "${topic || title}"
- Modo de Jogo: "${currentModeInfo.name}" (${gameMode})
- Contexto de Execução: ${currentModeInfo.context}
- Estilo: ${currentModeInfo.style}
${supportMaterial ? `- Material de Apoio fornecido pelo professor:\n"""${supportMaterial}"""\n` : ''}

REGRAS DE OURO DA ARQUITETURA INCLUSIVA (MANDATÓRIO):
1. O jogo possui 6 estágios sequenciais.
2. Cada estágio padrão deve ter:
   - "id": id único (ex: "stage-1")
   - "title": título do estágio/rodada
   - "scenario": o desafio, pergunta ou situação problema
   - "clue": dica pedagógica ou reflexão dos pensadores clássicos
   - "options": EXATAMENTE 4 opções, sendo 1 correta ("isCorrect": true, "pointsWeight": 1.67) e 3 incorretas ("isCorrect": false, "pointsWeight": 0), com "feedback" explicativo para cada opção.
3. INCLUSÃO PNE EMBUTIDA (CRÍTICO): Em CADA um dos 6 estágios, você DEVE gerar OBRIGATORIAMENTE duas adaptações irmãs sobre o mesmo exato conceito:
   a) "pneMildStage": para colega com deficiência leve/moderada (TDAH, Dislexia, TEA Nível 1, DI Leve):
      - "scenario": enunciado direto, enxuto e sem jargões rebuscados
      - "options": EXATAMENTE 2 opções (1 correta com isCorrect: true, 1 incorreta com isCorrect: false)
   b) "pneSevereStage": para colega com síndrome severa ou não verbal:
      - "playfulPrompt": instrução lúdica clara (ex: "Toque no cartão que mostra união e ajuda:")
      - "visualCards": array de 3 cartões visuais lúdicos, cada um com "iconEmoji" (um emoji representativo), "label" (rótulo curto), "isCorrect" (boolean) e "feedback" encorajador.
4. "introText": Apresentação acolhedora e animadora da proposta do jogo (2 a 3 frases).

Retorne EXCLUSIVAMENTE o JSON no esquema solicitado.
`;

    const candidateModels = [
      'gemini-3.8-flash',
      'gemini-3.1-flash-lite',
      'gemini-flash-latest'
    ];

    let gameData: GameData | null = null;

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                introText: { type: Type.STRING },
                stages: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      title: { type: Type.STRING },
                      scenario: { type: Type.STRING },
                      clue: { type: Type.STRING },
                      options: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            text: { type: Type.STRING },
                            isCorrect: { type: Type.BOOLEAN },
                            pointsWeight: { type: Type.NUMBER },
                            feedback: { type: Type.STRING }
                          },
                          required: ['text', 'isCorrect', 'feedback']
                        }
                      },
                      pneMildStage: {
                        type: Type.OBJECT,
                        properties: {
                          scenario: { type: Type.STRING },
                          options: {
                            type: Type.ARRAY,
                            items: {
                              type: Type.OBJECT,
                              properties: {
                                text: { type: Type.STRING },
                                isCorrect: { type: Type.BOOLEAN },
                                feedback: { type: Type.STRING }
                              },
                              required: ['text', 'isCorrect', 'feedback']
                            }
                          }
                        },
                        required: ['scenario', 'options']
                      },
                      pneSevereStage: {
                        type: Type.OBJECT,
                        properties: {
                          playfulPrompt: { type: Type.STRING },
                          visualCards: {
                            type: Type.ARRAY,
                            items: {
                              type: Type.OBJECT,
                              properties: {
                                iconEmoji: { type: Type.STRING },
                                label: { type: Type.STRING },
                                isCorrect: { type: Type.BOOLEAN },
                                feedback: { type: Type.STRING }
                              },
                              required: ['iconEmoji', 'label', 'isCorrect', 'feedback']
                            }
                          }
                        },
                        required: ['playfulPrompt', 'visualCards']
                      }
                    },
                    required: ['id', 'title', 'scenario', 'options', 'pneMildStage', 'pneSevereStage']
                  }
                }
              },
              required: ['introText', 'stages']
            }
          }
        });

        if (response && response.text) {
          const parsed = JSON.parse(response.text);
          if (parsed && Array.isArray(parsed.stages) && parsed.stages.length >= 3) {
            gameData = parsed as GameData;
            break;
          }
        }
      } catch (err: any) {
        if (isGeminiAuthError(err)) {
          break;
        }
        console.warn(`[generate-game] Erro com modelo ${modelName}:`, err?.message || err);
      }
    }

    if (!gameData) {
      console.warn('[generate-game] Modelos falharam ou cota excedida. Usando gerador pedagógico determinístico de alta fidelidade.');
      gameData = generateFallbackGameData(title, subject, topic || title, gameMode);
    }

    return NextResponse.json({ gameData });
  } catch (error: any) {
    console.error('Erro na rota /api/gemini/generate-game:', error);
    return NextResponse.json(
      { error: 'Falha ao gerar KronoGame', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
