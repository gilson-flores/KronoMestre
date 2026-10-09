/**
 * Registro Criativo de Avatares do KronoMestre
 * Coleção de 52 avatares únicos categorizados:
 * - Heróis de RPG & Fantasia
 * - Vikings & Lendas Nórdicas
 * - Feras & Criaturas Místicas ("Freras")
 * - Cômicos, Divertidos & Excêntricos
 */

export interface AvatarItem {
  id: string;
  name: string;
  category: 'rpg' | 'vikings' | 'feras' | 'comicos';
  categoryLabel: string;
  tagline: string;
  url: string;
}

export const AVATAR_CATEGORIES = [
  { id: 'todos', label: 'Todos os Avatares', emoji: '✨' },
  { id: 'rpg', label: 'Heróis de RPG', emoji: '🛡️' },
  { id: 'vikings', label: 'Vikings & Nórdicos', emoji: '⚔️' },
  { id: 'feras', label: 'Feras & Místicos', emoji: '🐾' },
  { id: 'comicos', label: 'Cômicos & Divertidos', emoji: '🤪' },
] as const;

export const KRONO_AVATARS: AvatarItem[] = [
  // ==========================================
  // 1. HERÓIS DE RPG & FANTASIA ÉPICA (15 avatares)
  // ==========================================
  {
    id: 'rpg-1',
    name: 'Mestre Arcano Krono',
    category: 'rpg',
    categoryLabel: 'Heróis de RPG',
    tagline: 'Manipulador do espaço-tempo e guardião dos prazos de entrega.',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=KronoArchmage&radius=50&backgroundColor=1e293b',
  },
  {
    id: 'rpg-2',
    name: 'Valéria da Chama Solar',
    category: 'rpg',
    categoryLabel: 'Heróis de RPG',
    tagline: 'Cavaleira templária que ilumina qualquer dúvida difícil.',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=SolarKnightValeria&radius=50&backgroundColor=311042',
  },
  {
    id: 'rpg-3',
    name: 'Lyra Ladina das Sombras',
    category: 'rpg',
    categoryLabel: 'Heróis de RPG',
    tagline: 'Ágil e furtiva, entrega as tarefas antes do sino tocar.',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=ShadowRogueLyra&radius=50&backgroundColor=0f172a',
  },
  {
    id: 'rpg-4',
    name: 'Bardo Elian Melodia',
    category: 'rpg',
    categoryLabel: 'Heróis de RPG',
    tagline: 'Transforma qualquer explicação teórica em uma canção inesquecível.',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=BardElianMelody&radius=50&backgroundColor=1e1b4b',
  },
  {
    id: 'rpg-5',
    name: 'Druida Thorne do Carvalho',
    category: 'rpg',
    categoryLabel: 'Heróis de RPG',
    tagline: 'Conectado com a natureza e com a paciência pedagógica.',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=OakDruidThorne&radius=50&backgroundColor=064e3b',
  },
  {
    id: 'rpg-6',
    name: 'Paladino Cósmico Aiden',
    category: 'rpg',
    categoryLabel: 'Heróis de RPG',
    tagline: 'Armadura reluzente forjada na sabedoria dos livros antigos.',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=CosmicPaladinAiden&radius=50&backgroundColor=172554',
  },
  {
    id: 'rpg-7',
    name: 'Alquimista Fizz',
    category: 'rpg',
    categoryLabel: 'Heróis de RPG',
    tagline: 'Mistura fórmulas científicas e poções de foco total.',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=AlchemistFizz&radius=50&backgroundColor=365314',
  },
  {
    id: 'rpg-8',
    name: 'Arqueira Sylvia das Folhas',
    category: 'rpg',
    categoryLabel: 'Heróis de RPG',
    tagline: 'Miras certeiras em todas as questões de múltipla escolha.',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=WindElfSylvia&radius=50&backgroundColor=042f2e',
  },
  {
    id: 'rpg-9',
    name: 'Morgana Tecelã do Vazio',
    category: 'rpg',
    categoryLabel: 'Heróis de RPG',
    tagline: 'Desvenda enigmas complexos com um estalar de dedos.',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=TimeSorcMorgana&radius=50&backgroundColor=581c87',
  },
  {
    id: 'rpg-10',
    name: 'Monge Ren do Punho Astral',
    category: 'rpg',
    categoryLabel: 'Heróis de RPG',
    tagline: 'Mente serena, punhos rápidos e notas elevadas.',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=AstralMonkRen&radius=50&backgroundColor=1e293b',
  },
  {
    id: 'rpg-11',
    name: 'Clériga Serena da Aurora',
    category: 'rpg',
    categoryLabel: 'Heróis de RPG',
    tagline: 'Restaura as energias dos colegas antes do simulado.',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=DawnClericSerena&radius=50&backgroundColor=701a75',
  },
  {
    id: 'rpg-12',
    name: 'Ranger Bane do Horizonte',
    category: 'rpg',
    categoryLabel: 'Heróis de RPG',
    tagline: 'Rastreador de conteúdos e explorador de novos saberes.',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=AstralHunterBane&radius=50&backgroundColor=1e1b4b',
  },
  {
    id: 'rpg-13',
    name: 'Bruxa Hazel dos Cogumelos',
    category: 'rpg',
    categoryLabel: 'Heróis de RPG',
    tagline: 'Especialista em botânica mágica e receitas curiosas.',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=MushroomWitchHazel&radius=50&backgroundColor=3f3f46',
  },
  {
    id: 'rpg-14',
    name: 'Zahra Campeã das Areias',
    category: 'rpg',
    categoryLabel: 'Heróis de RPG',
    tagline: 'Força indomável com espírito estratégico.',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=RunicChampionZahra&radius=50&backgroundColor=451a03',
  },
  {
    id: 'rpg-15',
    name: 'Artífice Garrick do Vapor',
    category: 'rpg',
    categoryLabel: 'Heróis de RPG',
    tagline: 'Construtor de engenhocas e calculadoras a vapor.',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=ArtificerGarrick&radius=50&backgroundColor=1c1917',
  },

  // ==========================================
  // 2. VIKINGS & LENDAS NÓRDICAS (12 avatares)
  // ==========================================
  {
    id: 'viking-1',
    name: 'Ragnar Barba-de-Trovão',
    category: 'vikings',
    categoryLabel: 'Vikings & Nórdicos',
    tagline: 'Líder destemido que navega pelos mares de redações difíceis.',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=RagnarThunderbeard&radius=50&backgroundColor=0f172a',
  },
  {
    id: 'viking-2',
    name: 'Brynhild Valquíria Glacial',
    category: 'vikings',
    categoryLabel: 'Vikings & Nórdicos',
    tagline: 'Desce dos céus gelados para conduzir campeões ao topo.',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=GlacialValkyrieBrynhild&radius=50&backgroundColor=1e293b',
  },
  {
    id: 'viking-3',
    name: 'Torstein Quebra-Escudos',
    category: 'vikings',
    categoryLabel: 'Vikings & Nórdicos',
    tagline: 'Nenhum desafio ou bloqueio mental fica de pé diante dele.',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=ShieldBreakerTorstein&radius=50&backgroundColor=334155',
  },
  {
    id: 'viking-4',
    name: 'Freyja das Neves Eternas',
    category: 'vikings',
    categoryLabel: 'Vikings & Nórdicos',
    tagline: 'Guardiã dos lobos árticos e senhora dos mistérios rúnicos.',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=SnowFreyja&radius=50&backgroundColor=0369a1',
  },
  {
    id: 'viking-5',
    name: 'Jarl Einar Machado de Fogo',
    category: 'vikings',
    categoryLabel: 'Vikings & Nórdicos',
    tagline: 'Determinação ardente forjada no calor das batalhas escolares.',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=SmokyAxeEinar&radius=50&backgroundColor=7c2d12',
  },
  {
    id: 'viking-6',
    name: 'Astrid Skald dos Versos',
    category: 'vikings',
    categoryLabel: 'Vikings & Nórdicos',
    tagline: 'Canta as sagas dos melhores trabalhos em grupo do bimestre.',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=SagaSkaldAstrid&radius=50&backgroundColor=164e63',
  },
  {
    id: 'viking-7',
    name: 'Olaf dos Chifres Dourados',
    category: 'vikings',
    categoryLabel: 'Vikings & Nórdicos',
    tagline: 'Sempre comemora cada nota dez com um brinde festivo.',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=GoldenHornOlaf&radius=50&backgroundColor=78350f',
  },
  {
    id: 'viking-8',
    name: 'Sven Sentinela do Fiorde',
    category: 'vikings',
    categoryLabel: 'Vikings & Nórdicos',
    tagline: 'Olhos de águia nas correções e foco total no horizonte.',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=FjordWatcherSven&radius=50&backgroundColor=0f766e',
  },
  {
    id: 'viking-9',
    name: 'Sigrid Donzela do Escudo',
    category: 'vikings',
    categoryLabel: 'Vikings & Nórdicos',
    tagline: 'Defensora incansável dos colegas em apuros nas avaliações.',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=ShieldmaidenSigrid&radius=50&backgroundColor=1e1b4b',
  },
  {
    id: 'viking-10',
    name: 'Ivar Garra de Lobo',
    category: 'vikings',
    categoryLabel: 'Vikings & Nórdicos',
    tagline: 'Feroz e perspicaz, não descansa até resolver o problema.',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=AsgardWolfIvar&radius=50&backgroundColor=312e81',
  },
  {
    id: 'viking-11',
    name: 'Bjorn Mestre dos Dracares',
    category: 'vikings',
    categoryLabel: 'Vikings & Nórdicos',
    tagline: 'Pilota projetos com maestria por mares revoltos.',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=DrakkarMasterBjorn&radius=50&backgroundColor=1e293b',
  },
  {
    id: 'viking-12',
    name: 'Pequeno Halvar Escudeiro',
    category: 'vikings',
    categoryLabel: 'Vikings & Nórdicos',
    tagline: 'O escudo é maior do que ele, mas a coragem é infinita.',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=LittleVikingHalvar&radius=50&backgroundColor=0284c7',
  },

  // ==========================================
  // 3. FERAS & CRIATURAS MÍSTICAS ("FRERAS") (12 avatares)
  // ==========================================
  {
    id: 'feras-1',
    name: 'Dragãozinho Ignis Erudito',
    category: 'feras',
    categoryLabel: 'Feras & Místicos',
    tagline: 'Cospe fogo e devora livros didáticos no café da manhã.',
    url: 'https://api.dicebear.com/9.x/bottts/svg?seed=ScholarDragonIgnis&radius=50&backgroundColor=b91c1c',
  },
  {
    id: 'feras-2',
    name: 'Grifo Zephyr Protetor',
    category: 'feras',
    categoryLabel: 'Feras & Místicos',
    tagline: 'Metade leão, metade águia, 100% lealdade à turma.',
    url: 'https://api.dicebear.com/9.x/bottts/svg?seed=GryphonNestProtector&radius=50&backgroundColor=d97706',
  },
  {
    id: 'feras-3',
    name: 'Fênix Solar Pyra',
    category: 'feras',
    categoryLabel: 'Feras & Místicos',
    tagline: 'Renasce das cinzas e recupera a nota no simulado de recuperação!',
    url: 'https://api.dicebear.com/9.x/bottts/svg?seed=SolarPhoenixPyra&radius=50&backgroundColor=ea580c',
  },
  {
    id: 'feras-4',
    name: 'Lobo Lupo dos Cometas',
    category: 'feras',
    categoryLabel: 'Feras & Místicos',
    tagline: 'Uiva para a lua cheia e corre na velocidade da luz.',
    url: 'https://api.dicebear.com/9.x/bottts/svg?seed=CometWolfLupo&radius=50&backgroundColor=4338ca',
  },
  {
    id: 'feras-5',
    name: 'Minotauro Baurus Zen',
    category: 'feras',
    categoryLabel: 'Feras & Místicos',
    tagline: 'Encontrou a saída do labirinto através da meditação e da leitura.',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=ZenMinotaurBaurus&radius=50&backgroundColor=78350f',
  },
  {
    id: 'feras-6',
    name: 'Coruja Archimedes Sábia',
    category: 'feras',
    categoryLabel: 'Feras & Místicos',
    tagline: 'Enxerga a resposta certa mesmo na mais densa escuridão.',
    url: 'https://api.dicebear.com/9.x/bottts/svg?seed=WiseOwlArchimedes&radius=50&backgroundColor=065f46',
  },
  {
    id: 'feras-7',
    name: 'Tigre Dente-de-Sabre Néon',
    category: 'feras',
    categoryLabel: 'Feras & Místicos',
    tagline: 'Garras pré-históricas com reflexos modernos e tecnológicos.',
    url: 'https://api.dicebear.com/9.x/bottts/svg?seed=NeonSabertooth&radius=50&backgroundColor=0284c7',
  },
  {
    id: 'feras-8',
    name: 'Golem Rocky do Musgo',
    category: 'feras',
    categoryLabel: 'Feras & Místicos',
    tagline: 'Coração de rocha inabalável, mas muito gentil com plantas.',
    url: 'https://api.dicebear.com/9.x/bottts/svg?seed=MossGolemRocky&radius=50&backgroundColor=15803d',
  },
  {
    id: 'feras-9',
    name: 'Kitsune Yuki das Nove Caudas',
    category: 'feras',
    categoryLabel: 'Feras & Místicos',
    tagline: 'Raposa mágica que ilumina os caminhos do conhecimento.',
    url: 'https://api.dicebear.com/9.x/bottts/svg?seed=SpiritKitsuneYuki&radius=50&backgroundColor=be185d',
  },
  {
    id: 'feras-10',
    name: 'Basilisco Herbívoro',
    category: 'feras',
    categoryLabel: 'Feras & Místicos',
    tagline: 'Não petrifica ninguém: prefere comer alface e bater papo.',
    url: 'https://api.dicebear.com/9.x/bottts/svg?seed=VeggieBasilisk&radius=50&backgroundColor=047857',
  },
  {
    id: 'feras-11',
    name: 'Urso Ursus Armadura de Ferro',
    category: 'feras',
    categoryLabel: 'Feras & Místicos',
    tagline: 'Abraços quentinhos protegidos por placas de titânio.',
    url: 'https://api.dicebear.com/9.x/bottts/svg?seed=IronArmoredUrsus&radius=50&backgroundColor=374151',
  },
  {
    id: 'feras-12',
    name: 'Quimera Travessa Bidu',
    category: 'feras',
    categoryLabel: 'Feras & Místicos',
    tagline: 'Três cabeças, três opiniões diferentes sobre cada questão!',
    url: 'https://api.dicebear.com/9.x/bottts/svg?seed=PlayfulChimeraBidu&radius=50&backgroundColor=6d28d9',
  },

  // ==========================================
  // 4. CÔMICOS, DIVERTIDOS & EXCÊNTRICOS (13 avatares)
  // ==========================================
  {
    id: 'comico-1',
    name: 'Mago Grumble Cabeça-de-Torrada',
    category: 'comicos',
    categoryLabel: 'Cômicos & Divertidos',
    tagline: 'Errou um feitiço de café da manhã e agora pensa crocante.',
    url: 'https://api.dicebear.com/9.x/bottts/svg?seed=ToasterWizardGrumble&radius=50&backgroundColor=ca8a04',
  },
  {
    id: 'comico-2',
    name: 'Sir Pinguim Tampa-de-Panela',
    category: 'comicos',
    categoryLabel: 'Cômicos & Divertidos',
    tagline: 'Paladino dos mares gelados armado com uma colher de pau.',
    url: 'https://api.dicebear.com/9.x/bottts/svg?seed=SirPenguinPotLid&radius=50&backgroundColor=0284c7',
  },
  {
    id: 'comico-3',
    name: 'Gato Samurai Tigela de Lámen',
    category: 'comicos',
    categoryLabel: 'Cômicos & Divertidos',
    tagline: 'Honra inquestionável e macarrão sempre no ponto exato.',
    url: 'https://api.dicebear.com/9.x/bottts/svg?seed=RamenCatSamurai&radius=50&backgroundColor=e11d48',
  },
  {
    id: 'comico-4',
    name: 'Cogumelo Ninja Faixa Preta',
    category: 'comicos',
    categoryLabel: 'Cômicos & Divertidos',
    tagline: 'Pequeno no tamanho, mas aplica voadoras nas matérias difíceis.',
    url: 'https://api.dicebear.com/9.x/bottts/svg?seed=BlackBeltMushroom&radius=50&backgroundColor=15803d',
  },
  {
    id: 'comico-5',
    name: 'Spud Batata Guerreira',
    category: 'comicos',
    categoryLabel: 'Cômicos & Divertidos',
    tagline: 'Não teme nem o purê mais aterrorizante da cantina.',
    url: 'https://api.dicebear.com/9.x/bottts/svg?seed=WarriorPotatoSpud&radius=50&backgroundColor=b45309',
  },
  {
    id: 'comico-6',
    name: 'Rusty Robô das Margaridas',
    category: 'comicos',
    categoryLabel: 'Cômicos & Divertidos',
    tagline: 'Processador de 1000 teraflops dedicado a cuidar de flores.',
    url: 'https://api.dicebear.com/9.x/bottts/svg?seed=FlowerBotRusty&radius=50&backgroundColor=0f766e',
  },
  {
    id: 'comico-7',
    name: 'Esqueleto Bones Óculos Fundo-de-Garrafa',
    category: 'comicos',
    categoryLabel: 'Cômicos & Divertidos',
    tagline: 'Estuda tanto que nem lembra onde deixou a própria carne.',
    url: 'https://api.dicebear.com/9.x/bottts/svg?seed=NerdSkeletonBones&radius=50&backgroundColor=475569',
  },
  {
    id: 'comico-8',
    name: 'Gizmo Goblin das Bugigangas',
    category: 'comicos',
    categoryLabel: 'Cômicos & Divertidos',
    tagline: 'Aperta parafusos que não devia, gerando faíscas de pura genialidade.',
    url: 'https://api.dicebear.com/9.x/bottts/svg?seed=ExplodingGoblinGizmo&radius=50&backgroundColor=65a30d',
  },
  {
    id: 'comico-9',
    name: 'Hamster Halvar Elmo de Noz',
    category: 'comicos',
    categoryLabel: 'Cômicos & Divertidos',
    tagline: 'Armazena sementes de girassol e dicas de estudo nas bochechas.',
    url: 'https://api.dicebear.com/9.x/bottts/svg?seed=NutHelmetHamster&radius=50&backgroundColor=ea580c',
  },
  {
    id: 'comico-10',
    name: 'Rei Blorp Alienígena Medieval',
    category: 'comicos',
    categoryLabel: 'Cômicos & Divertidos',
    tagline: 'Tentando disfarçar que veio de Marte usando uma coroa torta.',
    url: 'https://api.dicebear.com/9.x/bottts/svg?seed=AlienKingBlorp&radius=50&backgroundColor=9333ea',
  },
  {
    id: 'comico-11',
    name: 'Quacko Pato Feiticeiro',
    category: 'comicos',
    categoryLabel: 'Cômicos & Divertidos',
    tagline: 'Emite relâmpagos estalados toda vez que faz "quack".',
    url: 'https://api.dicebear.com/9.x/bottts/svg?seed=DuckMageQuacko&radius=50&backgroundColor=f59e0b',
  },
  {
    id: 'comico-12',
    name: 'Gloop Slime de Cartola',
    category: 'comicos',
    categoryLabel: 'Cômicos & Divertidos',
    tagline: 'A gelatina mais educada e elegante de todo o reino escolar.',
    url: 'https://api.dicebear.com/9.x/bottts/svg?seed=TopHatSlimeGloop&radius=50&backgroundColor=10b981',
  },
  {
    id: 'comico-13',
    name: 'Inky Camaleão Distraído',
    category: 'comicos',
    categoryLabel: 'Cômicos & Divertidos',
    tagline: 'Ficou com estampa xadrez ao encostar na camisa do professor.',
    url: 'https://api.dicebear.com/9.x/bottts/svg?seed=ClumsyChameleonInky&radius=50&backgroundColor=06b6d4',
  },
];

/**
 * Retorna os avatares filtrados por categoria ou todos
 */
export function getAvatarsByCategory(categoryId: string): AvatarItem[] {
  if (!categoryId || categoryId === 'todos') {
    return KRONO_AVATARS;
  }
  return KRONO_AVATARS.filter((av) => av.category === categoryId);
}

/**
 * Busca avatar por ID
 */
export function getAvatarById(id: string): AvatarItem | undefined {
  return KRONO_AVATARS.find((av) => av.id === id);
}

/**
 * Array simplificado apenas de URLs para retrocompatibilidade
 */
export const ALL_AVATAR_URLS = KRONO_AVATARS.map((a) => a.url);
