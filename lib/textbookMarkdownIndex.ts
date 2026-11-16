import { LibraryFile } from './types';

export interface TextbookChapterSlice {
  id: string;
  unitNumber: number;
  chapterNumber: number;
  title: string;
  pages: string;
  topics: string[];
  markdown: string;
}

export const SOCIOLOGIA_EM_MOVIMENTO_CHAPTERS: TextbookChapterSlice[] = [
  {
    id: 'cap_1',
    unitNumber: 1,
    chapterNumber: 1,
    title: 'Capítulo 1: Produção de conhecimento',
    pages: 'p. 14–39',
    topics: ['Senso comum vs. Ciência', 'Conhecimento religioso e filosófico', 'Estranhamento e Desnaturalização', 'Durkheim, Weber e Marx', 'Pensamento Decolonial e Sociedade em Rede'],
    markdown: `<!-- CAP_1 -->
# CAPÍTULO 1: PRODUÇÃO DE CONHECIMENTO (Sociologia em Movimento, p. 14-39)
## 1. Conhecimento Científico e Práticas Sociais
- Todo conhecimento nasce de práticas sociais e contextos históricos (ex: cooperação científica e quebra de patentes de vacinas na pandemia de covid-19).
- **Três Revoluções da Modernidade**: Iluminismo (cultural), Revolução Francesa (política) e Revolução Industrial (econômica).
- **Papel da Sociologia**: **Estranhar** (problematizar o cotidiano) e **Desnaturalizar** (compreender fenômenos sociais como construções históricas e não como fatos naturais imutáveis).

## 2. As Diferentes Formas de Conhecimento
- **Senso Comum**: Saberes práticos do cotidiano transmitidos entre gerações (ex: observar nuvens escuras para prever chuva; saberes de Dona Flor, raizeira e parteira do Cerrado em Goiás; arquitetura das ocas do povo Waujá no Xingu).
- **Conhecimento Religioso (Teológico)**: Baseado na fé, mitos e sagrado (ex: Lavagem do Bonfim na Bahia, patrimônio imaterial pelo Iphan).
- **Conhecimento Filosófico**: Busca sentido racional e lógico para a existência por meio do questionamento rigoroso.
- **Conhecimento Científico**: Estudo sistemático, metódico, verificável e passível de revisão crítica.
- **Opostos ou Complementares?**: Para o **Positivismo** (Auguste Comte: "Ordem e Progresso") e Pedro Demo, a ciência opõe-se ao senso comum. Para **Paulo Freire** e **Manuela Carneiro da Cunha**, ciência e saberes populares/tradicionais dialogam e se complementam. **Leticia Cesarino** analisa como algoritmos e **bolhas informacionais** afetam a confiança na ciência.

## 3. Métodos Clássicos e Contemporâneos de Análise Sociológica
- **Funcionalismo / Método Comparativo (Émile Durkheim)**: Sociedade comparada a um organismo vivo; cada instituição (como a escola) cumpre uma função para a coesão do todo social.
- **Sociologia Compreensiva (Max Weber)**: Uso do *tipo ideal*; foco na interpretação do sentido subjetivo da **ação social** (ex: *A ética protestante e o espírito do capitalismo*).
- **Materialismo Histórico e Dialético (Karl Marx)**: A história é movida pela **luta de classes** e pelas condições materiais (**infraestrutura** econômica orientando a **superestrutura** jurídico-política e ideológica).
- **Estruturalismo (Saussure, Lévi-Strauss)** e **Pós-estruturalismo (Michel Foucault, Jacques Derrida, Judith Butler)**: Crítica às relações de poder e discursos.
- **Pensamento Decolonial (Aníbal Quijano)**: Crítica ao eurocentrismo e à **colonialidade do poder**; valorização de saberes periféricos, indígenas e afro-brasileiros (ex: cultura do passinho e funk).
- **Século XXI**: **Manuel Castells** (*Sociedade em Rede* / informacional), **Jennifer Gabrys** (*smart forests* e crise climática), **Octavio Ianni** (contradições do capitalismo no Brasil), **Luiz Antônio Machado da Silva** (*sociabilidade violenta*) e **Michel Misse** (violência urbana e legitimidade; dados do *Atlas da Violência*).`
  },
  {
    id: 'cap_2',
    unitNumber: 1,
    chapterNumber: 2,
    title: 'Capítulo 2: Indivíduo, sociedade e cultura',
    pages: 'p. 40–71',
    topics: ['Fato Social (Durkheim)', 'Ação Social (Weber)', 'Classes (Marx)', 'Habitus e Capital Cultural (Bourdieu)', 'Socialização Primária e Secundária', 'Cultura Material e Imaterial', 'Etnocentrismo vs. Relativismo Cultural', 'Ideologia e Indústria Cultural'],
    markdown: `<!-- CAP_2 -->
# CAPÍTULO 2: INDIVÍDUO, SOCIEDADE E CULTURA (Sociologia em Movimento, p. 40-71)
## 1. Padrões Sociais, Instituições e Estrutura
- **Coerção e Padrões Sociais**: Regras e expectativas coletivas (ex: uso de uniforme na escola, padrões estéticos na mídia).
- **Instituição Social**: Conjunto estável de regras que atende necessidades sociais (família, escola, casamento, Estado).

## 2. Indivíduo e Sociedade nas Teorias Sociológicas
- **Émile Durkheim (Fato Social)**: Formas de agir, pensar e sentir com três características: **exterioridade**, **coercitividade** e **generalidade** (ex: silêncio na biblioteca, erguer a mão na aula).
- **Max Weber (Ação Social)**: Conduta dotada de sentido orientada pela ação dos outros. 4 tipos: **Tradicional** (costume), **Afetiva** (emoção), **Racional orientada a valores** (princípios éticos) e **Racional orientada a fins** (cálculo de meios e objetivos).
- **Karl Marx (Classes Sociais)**: Posição ocupada nas relações de produção (burguesia proprietária dos meios de produção vs. proletariado que vende sua força de trabalho).
- **Sínteses Contemporâneas**: **Anthony Giddens** (*reflexividade*), **Pierre Bourdieu** (*habitus* e os 4 capitais: econômico, cultural, social e simbólico — ex: prato feito vs. foie gras; acesso a museus), **Heleieth Saffioti** e **Lélia Gonzalez** (gênero, raça e classe), **Charles Wright Mills** (*imaginação sociológica* conectando biografia e história, ex: caso George Floyd e racismo estrutural).

## 3. Socialização, Cultura e Antropologia
- **Socialização Primária** (família, infância, laços afetivos) e **Socialização Secundária** (escola, trabalho, amigos, redes sociais). Variações regionais (ex: aipim, mandioca e macaxeira; Reisado de Inhanhum; jogo indígena rõkrã).
- **Pedagogia Decolonial (Catherine Walsh)**: Leis 10.639/2003 (história e cultura afro-brasileira) e 11.645/2008 (indígena).
- **Cultura Material** (bens tangíveis: Igreja do Bonfim, instrumentos, edificações) vs. **Cultura Imaterial** (saberes, festas, maracatu, Samba de Roda do Recôncavo Baiano registrado pelo Iphan).
- **Cultura Erudita**, **Cultura Popular** (slam, hip-hop, Carolina Maria de Jesus) e **Cultura de Massa / Indústria Cultural** (Adorno e Horkheimer: padronização cultural como mercadoria).
- **Etnocentrismo** (julgar outra cultura como inferior a partir da própria) vs. **Relativismo Cultural** (Franz Boas: compreender cada cultura em sua própria lógica).
- **Ideologia**: *Falsa consciência* (Marx), *Hegemonia e Contra-hegemonia* (Antonio Gramsci), *Educação Bancária vs. Emancipadora* (Paulo Freire) e *Cibercultura* (Pierre Lévy).`
  },
  {
    id: 'cap_3',
    unitNumber: 2,
    chapterNumber: 3,
    title: 'Capítulo 3: Trabalho e desigualdades',
    pages: 'p. 74–91',
    topics: ['Trabalho em Marx (Mais-valia), Weber e Durkheim', 'Taylorismo, Fordismo e Toyotismo', 'Desemprego Estrutural e Precarização / Uberização', 'Economia Solidária', 'Divisão Sexual e Desigualdade Racial no Trabalho'],
    markdown: `<!-- CAP_3 -->
# CAPÍTULO 3: TRABALHO E DESIGUALDADES (Sociologia em Movimento, p. 74-91)
## 1. O Trabalho nos Clássicos da Sociologia
- **Karl Marx**: Força de trabalho, meios de produção e **Mais-valia** (trabalho não pago apropriado pelo capitalista: **mais-valia absoluta** por aumento de jornada; **mais-valia relativa** por tecnologia e produtividade). **Exército industrial de reserva**.
- **Max Weber**: *A ética protestante e o espírito do capitalismo* — vocação, trabalho disciplinado e ascese puritana/calvinista.
- **Émile Durkheim**: Divisão social do trabalho como fonte de coesão. **Solidariedade Mecânica** (sociedades tradicionais, baixa divisão do trabalho, forte consciência coletiva) vs. **Solidariedade Orgânica** (sociedades industriais/modernas, alta especialização e interdependência funcional). **Anomia**: ausência de regras integradoras.

## 2. Sistemas Produtivos e Racionalização
- **Taylorismo** (Frederick Taylor): Separação entre planejamento e execução, controle de tempos e movimentos.
- **Fordismo** (Henry Ford): Esteira rolante, produção em série padronizada e consumo de massa.
- **Toyotismo** (Taiichi Ohno): Produção flexível (*just in time*), estoque mínimo, trabalhador polivalente/multifuncional.

## 3. Cenário Atual: Precarização, Gênero e Raça
- **Desemprego Estrutural** (automação e mudanças tecnológicas permanentes) vs. **Desemprego Conjuntural** (crises passageiras).
- **Precarização, Terceirização e Uberização**: Entregadores e motoristas de aplicativo sem garantias da CLT; queda na sindicalização.
- **Economia Solidária**: Cooperativas e autogestão (ex: Cooperativa Comaru de castanha-do-pará no Amapá). Combate ao trabalho análogo à escravidão (*Escravo, nem pensar!*).
- **Divisão Sexual do Trabalho (Helena Hirata, Danièle Kergoat, Flávia Biroli)**: Princípios da **separação** e da **hierarquia**; sobrecarga feminina no trabalho doméstico e desigualdade salarial que atinge mais severamente mulheres negras (dados Dieese/IBGE).`
  },
  {
    id: 'cap_4',
    unitNumber: 2,
    chapterNumber: 4,
    title: 'Capítulo 4: Estratificação social',
    pages: 'p. 92–111',
    topics: ['Castas, Estamentos e Classes Sociais', 'Mobilidade Social Vertical e Horizontal', 'Classe, Status e Partido (Weber)', 'Pobreza Extrema vs. Relativa e Índice de Gini', 'Precariado e Racismo Ambiental'],
    markdown: `<!-- CAP_4 -->
# CAPÍTULO 4: ESTRATIFICAÇÃO SOCIAL (Sociologia em Movimento, p. 92-111)
## 1. Estrutura, Estratificação e Mobilidade Social
- **Estratificação Social**: Divisão hierárquica da sociedade em camadas. **Mobilidade Social**: mudança de posição (vertical ascendente/descendente ou horizontal).
- **Três Formas de Estratificação**:
  1. **Castas** (ex: Índia tradicional — Brâmanes, Xátrias, Vaixás, Sudras e Dalits/Párias): sistema fechado, hereditário, sem mobilidade social.
  2. **Estamentos** (ex: Feudalismo medieval — Clero, Nobreza e Campesinato/Servos): baseado na honra, linhagem e posse de terras; mobilidade raríssima. No Brasil, **Raymundo Faoro** destaca a herança do **patrimonialismo**.
  3. **Classes Sociais** (Capitalismo): baseadas na situação econômica e relações de produção. Para **Marx**, dividem-se entre proprietários (burguesia) e não proprietários (proletariado). Para **Weber**, a estratificação articula três dimensões: **Classe** (economia/mercado), **Status** (prestígio e honra social) e **Partido** (poder político e burocracia).

## 2. Desigualdades no Brasil Contemporâneo
- Superação do determinismo biológico/geográfico (crítica de Renato Ortiz às teses racistas do séc. XIX).
- **Pobreza Extrema (Absoluta)** vs. **Pobreza Relativa**; **Índice de Gini** (mede concentração de renda de 0 a 1) e **IDH**. Arquitetura hostil urbana (ex: pedras sob o Viaduto da Conceição em Porto Alegre) e **Aporofobia** (Adela Cortina: aversão aos pobres).
- **Debate sobre Classes no Brasil**: **Jessé Souza** (crítica ao mito da "nova classe média" pela falta de capital cultural e cidadania), **Marcio Pochmann** (base da pirâmide no setor de serviços), **Guy Standing**, **Ruy Braga** e **Giovanni Alves** (o **precariado**).
- **Desigualdade de Gênero, Raça e Racismo Ambiental**: Dependência econômica e violência doméstica (Raquel Rolnik; Campanha Sinal Vermelho). **Racismo Ambiental** (Diosmar Filho): impactos extremos do calor, falta de saneamento e arboviroses nas periferias negras e indígenas (ex: Cuiabá e Porto Velho).`
  },
  {
    id: 'cap_5',
    unitNumber: 3,
    chapterNumber: 5,
    title: 'Capítulo 5: Poder, política e Estado',
    pages: 'p. 114–135',
    topics: ['Conceitos de Poder, Política e Estado', 'Poder Econômico, Ideológico e Político (Bobbio)', 'Os 3 Tipos de Dominação Legítima (Max Weber)', 'Formas Históricas de Estado Moderno'],
    markdown: `<!-- CAP_5 -->
# CAPÍTULO 5: PODER, POLÍTICA E ESTADO (Sociologia em Movimento, p. 114-135)
## 1. Diferenciação Conceitual
- **Poder** (Max Weber): Probabilidade de impor a própria vontade numa relação social, mesmo contra resistência (presente na família, escola e esfera pública).
- **Política**: Meios pelos quais grupos organizam a convivência coletiva, disputam e exercem o poder.
- **Estado**: Instituição político-administrativa soberana que detém o monopólio legítimo da força sobre um território. Sociedades sem Estado: povos ameríndios estudados por **Pierre Clastres** (*A sociedade contra o Estado*).

## 2. Formas de Poder e Dominação Legítima
- **Norberto Bobbio — 3 Formas de Poder**: **Poder Econômico** (posse de bens/capital), **Poder Ideológico** (influência sobre ideias, mídia, educação) e **Poder Político** (monopólio legítimo da coerção/força).
- **Max Weber — Os 3 Tipos Puros de Dominação Legítima**:
  1. **Dominação Tradicional**: Baseada nos costumes e tradições antigas (ex: feudalismo, patriarcalismo e coronelismo no Brasil).
  2. **Dominação Carismática**: Baseada na crença em qualidades excepcionais de um líder (ex: Nelson Mandela na luta contra o apartheid).
  3. **Dominação Racional-Legal**: Baseada em leis impessoais, normas jurídicas e na **burocracia** do Estado moderno.`
  },
  {
    id: 'cap_6',
    unitNumber: 3,
    chapterNumber: 6,
    title: 'Capítulo 6: Governo e participação política',
    pages: 'p. 136–159',
    topics: ['Formas e Sistemas de Governo (Monarquia, República, Parlamentarismo, Presidencialismo)', 'Democracia Direta, Representativa e Participativa', 'Cidadania e Democracia no Brasil'],
    markdown: `<!-- CAP_6 -->
# CAPÍTULO 6: GOVERNO E PARTICIPAÇÃO POLÍTICA (Sociologia em Movimento, p. 136-159)
- **Formas de Governo**: Monarquia (hereditária/vitalícia) vs. República (eletiva/temporária, voltada à coisa pública).
- **Sistemas de Governo**: Presidencialismo vs. Parlamentarismo. Regimes Democráticos vs. Autoritários/Totalitários.
- **Teoria Democrática**: Democracia direta (Atenas clássica), Democracia representativa moderna (voto, divisão de poderes de Montesquieu) e Democracia participativa/deliberativa contemporânea (orçamento participativo, conselhos, plebiscito, referendo e iniciativa popular na Constituição de 1988).
- **Crise de Representatividade**: Desafios da participação juvenil, combate à desinformação e sub-representação de mulheres, negros e indígenas no parlamento brasileiro.`
  },
  {
    id: 'cap_7',
    unitNumber: 4,
    chapterNumber: 7,
    title: 'Capítulo 7: Racismo na cidade contemporânea',
    pages: 'p. 162–191',
    topics: ['Raça e Racismo Estrutural', 'Preconceito, Discriminação e Segregação Socioespacial', 'Multiculturalismo, Interculturalidade e Ações Afirmativas'],
    markdown: `<!-- CAP_7 -->
# CAPÍTULO 7: RACISMO NA CIDADE CONTEMPORÂNEA (Sociologia em Movimento, p. 162-191)
- **Raça como Construção Social**: Superação do racismo científico e crítica ao mito da democracia racial (Florestan Fernandes, Abdias do Nascimento, Lélia Gonzalez, Silvio Almeida).
- **Conceitos Fundamentais**: **Preconceito** (juízo mental prévio), **Discriminação** (ação prática de tratamento desigual) e **Segregação** (separação espacial e institucional, ex: periferias e conflitos urbanos).
- **Ideologia do Branqueamento**: Análise histórica da tela *A Redenção de Cam* (Modesto Brocos, 1895).
- **Políticas de Reparação**: **Ações Afirmativas** (cotas raciais e sociais nas universidades e concursos públicos), **Multiculturalismo** e **Interculturalidade**.`
  },
  {
    id: 'cap_8',
    unitNumber: 4,
    chapterNumber: 8,
    title: 'Capítulo 8: Gênero, sexualidades e identidades',
    pages: 'p. 192–217',
    topics: ['Sexo vs. Gênero como Construção Social', 'Patriarcado e Divisão Sexual do Trabalho', 'Interseccionalidade (Raça, Classe e Gênero)', 'Movimentos Feministas e LGBTQIA+'],
    markdown: `<!-- CAP_8 -->
# CAPÍTULO 8: GÊNERO, SEXUALIDADES E IDENTIDADES (Sociologia em Movimento, p. 192-217)
- **Sexo e Gênero**: Distinção entre características biológicas e a construção social/histórica dos papéis masculinos e femininos (Simone de Beauvoir, Judith Butler).
- **Patriarcado**: Estrutura histórica de dominação masculina nas esferas pública e privada.
- **Interseccionalidade** (Kimberlé Crenshaw, Carla Akotirene, Djamila Ribeiro): Cruzamento entre opressões de gênero, raça e classe social.
- **Movimentos Sociais**: Conquistas históricas dos movimentos feministas (sufrágio, direitos trabalhistas, combate ao feminicídio, feminismos populares do Sul global) e cidadania LGBTQIA+.`
  },
  {
    id: 'cap_9',
    unitNumber: 5,
    chapterNumber: 9,
    title: 'Capítulo 9: Sociedade e meio ambiente',
    pages: 'p. 220–245',
    topics: ['Problemática Socioambiental e Mudanças Climáticas', 'Modernização Ecológica vs. Ecologismo', 'Justiça Ambiental e Racismo Ambiental', 'Agroecologia e Legislação Ambiental'],
    markdown: `<!-- CAP_9 -->
# CAPÍTULO 9: SOCIEDADE E MEIO AMBIENTE (Sociologia em Movimento, p. 220-245)
- **Questão Socioambiental**: A relação entre sociedade capitalista industrial, sociedade de risco (Ulrich Beck), consumismo e crise ecológica planetária.
- **Correntes**: **Modernização Ecológica** (soluções de mercado e eficiência técnica) vs. **Justiça Ambiental e Ecologismo Popular** (denúncia da distribuição desigual dos danos ambientais).
- **Racismo Ambiental**: Impactos desproporcionais de barragens, garimpo ilegal, poluição e eventos climáticos extremos sobre populações periféricas, ribeirinhas, quilombolas e indígenas.`
  },
  {
    id: 'cap_10',
    unitNumber: 5,
    chapterNumber: 10,
    title: 'Capítulo 10: Críticas à colonialidade',
    pages: 'p. 246–269',
    topics: ['Estudos Pós-Coloniais e Decoloniais', 'Nêgo Bispo e a Proposta Contracolonial (Confluência)', 'Povos Indígenas no Brasil e Demarcação', 'Quilombos e Povos Tradicionais de Matriz Africana'],
    markdown: `<!-- CAP_10 -->
# CAPÍTULO 10: CRÍTICAS À COLONIALIDADE (Sociologia em Movimento, p. 246-269)
- **Existências Plurais**: Pensamento de **Ailton Krenak** (*Ideias para adiar o fim do mundo*) e **Antônio Bispo dos Santos — Nêgo Bispo** (pensamento **contracolonial**, biointeração e **confluência** em oposição à colonização predatória).
- **Povos Indígenas no Brasil**: Diversidade étnica e linguística (Censo IBGE 2022), protagonismo indígena e direito originário à terra (Art. 231 da Constituição de 1988).
- **Quilombos e Povos Tradicionais**: O *quilombismo* (Abdias do Nascimento), comunidades remanescentes de quilombos e preservação de saberes ancestrais.`
  },
  {
    id: 'cap_11',
    unitNumber: 6,
    chapterNumber: 11,
    title: 'Capítulo 11: Globalização, cidadania e direitos humanos',
    pages: 'p. 272–299',
    topics: ['Globalização Econômica, Cultural e Tecnológica', 'Cidadania Civil, Política e Social (T. H. Marshall)', 'Direitos Humanos e Constituição de 1988', 'Movimentos Sociais Tradicionais e Contemporâneos'],
    markdown: `<!-- CAP_11 -->
# CAPÍTULO 11: GLOBALIZAÇÃO, CIDADANIA E DIREITOS HUMANOS (Sociologia em Movimento, p. 272-299)
- **Globalização**: Integração assimétrica dos mercados, blocos econômicos e fluxos informacionais (análise crítica de **Milton Santos**: globalização como fábula, como perversidade e como possibilidade).
- **Cidadania (T. H. Marshall)**: Direitos **Civis** (liberdade individual, justiça), **Políticos** (votar e ser votado) e **Sociais** (educação, saúde, trabalho, moradia). No Brasil, **José Murilo de Carvalho** analisa a trajetória histórica da cidadania.
- **Movimentos Sociais**: Movimentos tradicionais (operários/sindicais) e **Novos Movimentos Sociais** (Alain Touraine, Maria da Glória Gohn: lutas identitárias, ambientais, urbanas e por demarcação de terras).`
  },
  {
    id: 'cap_12',
    unitNumber: 6,
    chapterNumber: 12,
    title: 'Capítulo 12: Sociologia do desenvolvimento',
    pages: 'p. 300–325',
    topics: ['Crescimento Econômico vs. Desenvolvimento Humano', 'Teoria da Modernização vs. Teoria da Dependência (Celso Furtado)', 'Neoliberalismo, Estado de Bem-Estar Social e BRICS'],
    markdown: `<!-- CAP_12 -->
# CAPÍTULO 12: SOCIOLOGIA DO DESENVOLVIMENTO (Sociologia em Movimento, p. 300-325)
- **Capitalismo e Crises**: Diferença entre mero crescimento do PIB e desenvolvimento socioeconômico com distribuição de renda e sustentabilidade.
- **Perspectivas Latino-Americanas**: Crítica da CEPAL (**Raúl Prebisch** e **Celso Furtado**) e da **Teoria da Dependência** (Ruy Mauro Marini, Theotônio dos Santos, Fernando Henrique Cardoso e Enzo Faletto) à divisão internacional do trabalho entre países centrais e periféricos.
- **Geopolítica Contemporânea**: Crise do Estado de Bem-Estar Social, avanços do neoliberalismo, multipolaridade e papel do bloco **BRICS** no desenvolvimento do Sul Global.`
  },
];

export function findTextbookInLibrary(files: LibraryFile[] = []): LibraryFile | undefined {
  if (!Array.isArray(files) || files.length === 0) return undefined;
  return (
    files.find(
      (f) =>
        /sociologia em movimento/i.test(f.title) ||
        /livro did[aá]tico/i.test(f.title) ||
        /livro did[aá]tico/i.test(f.category || '') ||
        Boolean(f.markdownContent)
    ) || files[0]
  );
}

export function getTextbookMarkdownSlice(
  chapterId: string,
  libraryFile?: LibraryFile
): { chapterTitle: string; markdownSlice: string; sourceTitle: string } {
  const sourceTitle = libraryFile?.title || 'Sociologia em Movimento (2024) — Volume Único (.MD)';
  const foundChapter =
    SOCIOLOGIA_EM_MOVIMENTO_CHAPTERS.find((c) => c.id === chapterId) ||
    SOCIOLOGIA_EM_MOVIMENTO_CHAPTERS[0];

  if (libraryFile?.markdownContent && libraryFile.markdownContent.trim().length > 40) {
    const rawMd = libraryFile.markdownContent.trim();
    const markerRegex = new RegExp(`<!--\\s*${chapterId.toUpperCase()}\\s*-->([\\s\\S]*?)(?=<!--\\s*CAP_|$)`, 'i');
    const match = rawMd.match(markerRegex);
    if (match && match[1] && match[1].trim().length > 40) {
      return {
        chapterTitle: foundChapter.title,
        markdownSlice: match[1].trim().slice(0, 8000),
        sourceTitle,
      };
    }
    return {
      chapterTitle: `${sourceTitle} — ${foundChapter.title}`,
      markdownSlice: `${foundChapter.markdown}\n\n--- TRECHO ADICIONAL DO ARQUIVO (.MD) ---\n${rawMd.slice(0, 4500)}`,
      sourceTitle,
    };
  }

  return {
    chapterTitle: foundChapter.title,
    markdownSlice: foundChapter.markdown,
    sourceTitle,
  };
}
