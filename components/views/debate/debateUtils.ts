import { Activity, StudentUser, TeacherUser } from "@/lib/types";

export type GroupRole = 'pro' | 'contra' | 'juror';

export interface LocalDebateQuestion {
  id: string;
  number?: number;
  side?: string;
  sociologicalConcept: string;
  prompt: string;
  researchHint?: string;
}

export interface LocalDebateParticipant {
  studentId: string;
  studentName: string;
  role: GroupRole;
  turma?: string;
  isLeader?: boolean;
}

export interface LocalDebateCriterion {
  id: string;
  number?: number;
  title?: string;
  criterion?: string;
  description: string;
}

export interface LocalDebateConfig {
  maxJurors: number;
  proQuestions: LocalDebateQuestion[];
  contraQuestions: LocalDebateQuestion[];
  jurorQuestions: LocalDebateQuestion[];
  checklistCriteria: LocalDebateCriterion[];
  jurorInitialGuide: string;
  participants: LocalDebateParticipant[];
  proAnswers: Record<string, string>;
  contraAnswers: Record<string, string>;
  jurorAnswers: Record<string, string>;
  proResearchCompleted?: boolean;
  contraResearchCompleted?: boolean;
  proSummaryAI: string;
  contraSummaryAI: string;
  jurorGuideAI: string;
  jurorVerdicts: any[];
  gradingMode?: 'group' | 'individual';
  groupGrades?: Record<string, number>;
  individualGrades?: Record<string, number>;
  teacherChecklists?: Record<string, TeacherGroupChecklistState>;
  [key: string]: any;
}

export interface TeacherGroupChecklistState {
  criteriaChecked: Record<string, boolean>;
  customScore: number;
  teacherNotes: string;
  appliedAt?: string;
}

export interface DebatePaperlessViewProps {
  activity?: Activity | null;
  debateConfig?: any;
  title?: string;
  topic?: string;
  student?: StudentUser | null;
  currentStudent?: StudentUser | null;
  students?: StudentUser[];
  allStudents?: StudentUser[];
  teacher?: TeacherUser | null;
  isTeacher?: boolean;
  isTeacherPreview?: boolean;
  role?: 'teacher' | 'student' | 'second_teacher' | string | null;
  onSaveActivity?: (updatedActivity: Activity) => void | Promise<void>;
  onUpdateActivity?: (updatedActivity: Activity) => void | Promise<void>;
  onUpdateDebateConfig?: (updatedConfig: any) => void | Promise<void>;
  onSubmitAnswer?: (
    activityId: string,
    studentId: string,
    essayAnswer: string,
    objectiveScore?: number,
    maxObjectiveScore?: number,
    maxEssayScore?: number,
    selectedObjectiveAnswers?: { [questionId: string]: number },
    groupMembers?: string
  ) => void | Promise<void>;
  onFinishGame?: (finalScore: number, groupMembersStr?: string) => void;
  onClose?: () => void;
  [key: string]: any;
}

export const DEFAULT_TEACHER_CRITERIA = [
  { id: 'tc_1', label: 'Domínio Conceitual Sociológico (6 Questões & Debate)', weight: 2.0 },
  { id: 'tc_2', label: 'Uso de Evidências, Dados e Fatos Reais', weight: 2.0 },
  { id: 'tc_3', label: 'Coerência com o Resumo Elaborado da Bancada', weight: 2.0 },
  { id: 'tc_4', label: 'Capacidade de Réplica, Tréplica ou Julgamento Crítico', weight: 1.5 },
  { id: 'tc_5', label: 'Articulação em Equipe e Participação Coletiva', weight: 1.5 },
  { id: 'tc_6', label: 'Respeito ao Tempo (Timer) e Postura Democrática', weight: 1.0 },
];

export const DEBATE_TIMER_PRESETS = [
  { id: 'exp_pro', label: '🎙️ Exposição Inicial • PRÓ', seconds: 180 },
  { id: 'exp_contra', label: '⚡ Exposição Inicial • CONTRA', seconds: 180 },
  { id: 'rep_pro', label: '🔄 Réplica • PRÓ', seconds: 120 },
  { id: 'rep_contra', label: '🛡️ Réplica • CONTRA', seconds: 120 },
  { id: 'sabatina_juror', label: '⚖️ Perguntas dos Jurados', seconds: 120 },
  { id: 'final', label: '🏁 Considerações Finais', seconds: 90 },
];

/**
 * Garante que cada um dos 3 grupos tenha SEMPRE 6 perguntas estruturadas
 * com espaço de resposta (mesmo se a atividade foi criada antes com 3 perguntas).
 */
export function ensureSixQuestions(
  existing: LocalDebateQuestion[] | undefined,
  side: GroupRole,
  topicTitle: string
): LocalDebateQuestion[] {
  const cleanTopic = (topicTitle || 'Sociedade e Cidadania').trim();
  const baseList = Array.isArray(existing) ? existing : [];

  const proDefaults = [
    { concept: 'Fundamentos Históricos e Conquistas', q: `Quais marcos históricos e sociais comprovam a importância de "${cleanTopic}" para a construção da cidadania?` },
    { concept: 'Coesão Social e Direitos', q: `Sob a ótica da Sociologia, como "${cleanTopic}" contribui para fortalecer as instituições democráticas e proteger direitos coletivos?` },
    { concept: 'Evidências e Dados da Realidade Brasileira', q: `Que dados empíricos, leis ou exemplos práticos demonstram os impactos positivos de "${cleanTopic}" no Brasil contemporâneo?` },
    { concept: 'Inclusão e Redução de Desigualdades', q: `De que maneira a defesa de "${cleanTopic}" atua na superação de desigualdades históricas e na inclusão de grupos vulnerabilizados?` },
    { concept: 'Participação Política e Mudança Cultural', q: `Como "${cleanTopic}" estimula a consciência crítica e novas práticas de responsabilidade coletiva nas escolas e comunidades?` },
    { concept: 'Tese Central e Proposta Sociológica (PRÓ)', q: `Qual é o argumento sociológico definitivo da Bancada PRÓ para rebater as críticas e defender a consolidação de "${cleanTopic}"?` },
  ];

  const contraDefaults = [
    { concept: 'Contradições Estruturais e Limites Práticos', q: `Quais são as principais contradições entre o discurso oficial sobre "${cleanTopic}" e a realidade concreta vivida pela população?` },
    { concept: 'Assimetrias de Poder e Interesses Hegemônicos', q: `Que grupos econômicos, políticos ou institucionais se beneficiam das falhas ou distorções ligadas a "${cleanTopic}"?` },
    { concept: 'Efeitos Colaterais e Exclusão Social', q: `Quais dados empíricos ou situações cotidianas revelam limitações, exclusões ou efeitos colaterais na aplicação atual de "${cleanTopic}"?` },
    { concept: 'Crítica Institucional e Burocrática', q: `Por que as instituições atuais encontram barreiras estruturais para efetivar "${cleanTopic}" de forma igualitária entre as classes sociais?` },
    { concept: 'Ideologia e Discurso Dominante', q: `De que modo a abordagem superficial de "${cleanTopic}" pode mascarar problemas estruturais mais profundos da sociedade?` },
    { concept: 'Tese Crítica de Refutação (CONTRA)', q: `Qual reformulação estrutural a Bancada CONTRA propõe para enfrentar as falhas reais identificadas em "${cleanTopic}"?` },
  ];

  const jurorDefaults = [
    { concept: 'Auditoria de Conceitos Sociológicos', q: `Quais conceitos e autores clássicos ou contemporâneos da Sociologia são indispensáveis para avaliar as teses sobre "${cleanTopic}"?` },
    { concept: 'Verificação de Fatos e Dados Empíricos', q: `Que evidências concretas e dados da realidade brasileira devem ser exigidos tanto da Bancada PRÓ quanto da Bancada CONTRA?` },
    { concept: 'Superação do Senso Comum', q: `Quais argumentos rasos ou falácias do senso comum sobre "${cleanTopic}" o Corpo de Jurados deve identificar e penalizar?` },
    { concept: 'Equilíbrio entre Teoria e Prática', q: `Como avaliar se as propostas defendidas pelas duas bancadas sobre "${cleanTopic}" possuem viabilidade social e constitucional?` },
    { concept: 'Pergunta de Confronto Direto (Sabatina)', q: `Qual pergunta incisiva o Corpo de Jurados fará durante o Grande Debate para testar a consistência das duas bancadas?` },
    { concept: 'Critério Decisivo de Veredito Imparcial', q: `Qual é o dilema ético e sociológico central de "${cleanTopic}" que definirá a bancada vencedora na avaliação dos jurados?` },
  ];

  const templates =
    side === 'pro' ? proDefaults : side === 'contra' ? contraDefaults : jurorDefaults;

  return Array.from({ length: 6 }).map((_, idx) => {
    const found = baseList[idx];
    const fallback = templates[idx];
    return {
      id: found?.id || `${side}_q_${idx + 1}`,
      number: idx + 1,
      side,
      sociologicalConcept: found?.sociologicalConcept?.trim() || fallback.concept,
      prompt: found?.prompt?.trim() || fallback.q,
      researchHint: '',
    };
  });
}

export function buildDefaultElaborateSummaries(topicTitle: string) {
  const cleanTopic = (topicTitle || 'Sociedade e Cidadania').trim();
  return {
    proSummaryAI: `📘 RESUMO ELABORADO DE RESPOSTAS — BANCADA PRÓ (${cleanTopic.toUpperCase()}):\n\n1. Fundamentação Histórica e Cidadã: A análise sociológica favorável demonstra que "${cleanTopic}" constitui um pilar para a consolidação dos direitos civis, políticos e sociais (T.H. Marshall), promovendo maior integração e justiça social.\n\n2. Coesão Social e Efetividade Democrática: Sob a perspectiva das instituições sociais (Durkheim e Habermas), a proteção e o aperfeiçoamento das políticas ligadas a "${cleanTopic}" fortalecem o espaço público democrático e reduzem desigualdades históricas.\n\n3. Diretriz Estratégica para as 6 Respostas e Debate: A equipe deve articular conceitos sociológicos com dados empíricos da realidade brasileira, demonstrando que os desafios existentes exigem ampliação e investimento público, jamais retrocesso.`,
    contraSummaryAI: `📕 RESUMO ELABORADO DE RESPOSTAS — BANCADA CONTRA (${cleanTopic.toUpperCase()}):\n\n1. Contradições Estruturais e Cidadania de Papel: A leitura sociológica crítica evidencia a distância entre a promessa formal de "${cleanTopic}" e as condições materiais reais da população brasileira (Gilberto Dimenstein / Karl Marx).\n\n2. Assimetrias de Poder e Reprodução Social: A partir de Max Weber, Pierre Bourdieu e Michel Foucault, observa-se como estruturas burocráticas e interesses hegemônicos limitam o alcance prático do tema e reproduzem privilégios.\n\n3. Diretriz Estratégica para as 6 Respostas e Debate: A bancada deve problematizar os efeitos colaterais e os limites institucionais atuais, exigindo transformações estruturais profundas com base em indicadores sociais reais.`,
    jurorGuideAI: `⚖️ DOSSIÊ E RESUMO ELABORADO DE ANÁLISE — CORPO DE JURADOS (${cleanTopic.toUpperCase()}):\n\n1. Parâmetro de Rigor Sociológico: O Corpo de Jurados deve verificar se as duas bancadas responderam às 6 questões utilizando conceitos da Sociologia (fato social, ação social, ideologia, estratificação, poder e cidadania) em vez de opiniões do senso comum.\n\n2. Confronto de Evidências e Coerência: Avaliar qual equipe sustentou sua tese com fatos históricos, dados estatísticos e exemplos concretos da sociedade brasileira sem incorrer em contradições.\n\n3. Julgamento no Grande Debate: Utilizar os 2 Checklists oficiais (Pró e Contra) para pontuar a clareza de exposição, a capacidade de réplica direta, o respeito ao Timer e a ética democrática.`,
  };
}

