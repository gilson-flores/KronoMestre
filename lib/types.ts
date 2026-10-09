export type UserRole = 'teacher' | 'student' | 'second_teacher' | null;

export interface TeacherUser {
  id: string;
  name: string;
  subject: string;
  email: string;
  avatarUrl: string;
  phone?: string;
  school?: string;
  driveFolderUrl?: string;
  matriculaFuncional?: string;
  tenantCode?: string; // NOVO: Código único de acesso do aluno (Ex: A1B2)
  contractStartDate?: string; // YYYY-MM-DD
  contractEndDate?: string; // YYYY-MM-DD
  contractType?: 'ACT / Contratado' | 'Efetivo' | 'Substituto' | string;
  contractStatus?: 'ativo' | 'encerrado' | 'afastado' | string;
  mustChangePassword?: boolean;
  ownerTeacherId?: string;
  owner_teacher_id?: string;
  is_admin?: boolean;
  isAdmin?: boolean;
  plan_type?: 'basic' | 'pro' | 'unlimited' | string;
  escolas_vinculadas?: string[];
  disciplinas?: string[];
}

export interface StudentUser {
  id: string;
  fullName: string;
  turma: string;
  matricula: string;
  tag?: 'REGULAR' | 'PNE' | 'RAD';
  pneConditions?: string[]; // Doenças, deficiências ou necessidades específicas
  passwordHash: string; // SEGURANÇA: Senha real cadastrada (NUNCA reintroduzir senha padrão fixa aqui)
  avatarUrl: string;
  pedagogicalNotes?: string;
  secondTeacherId?: string;
  secondTeacherName?: string;
  isArchived?: boolean;
  archivedAt?: string;
  archivedReason?: string;
  archivedVinculoId?: string; // Código/numeração única do vínculo (ex: VINC-092026)
  archivedSchool?: string; // Escola de vinculação
  mustChangePassword?: boolean;
  ownerTeacherId?: string;
  owner_teacher_id?: string;
  isOnline?: boolean;
  lastActiveAt?: string;
}

export const PNE_CONDITIONS_LIST = [
  'Altas Habilidades / Superdotação',
  'Autismo leve',
  'Autismo moderado',
  'Autismo severo',
  'Baixa Visão / Cegueira',
  'Deficiência Auditiva / Surdez',
  'Deficiência Física',
  'Deficiência Intelectual',
  'Deficiência Motora',
  'Deficiência Múltipla',
  'Discalculia',
  'Disgrafia / Disortografia',
  'Dislexia',
  'Outra Necessidade Específica',
  'Paralisia Cerebral',
  'Síndrome de Down',
  'TDAH (Déficit de Atenção e Hiperatividade)',
  'TOD (Transtorno Opositor Desafiador)',
] as const;

export type PneCondition = (typeof PNE_CONDITIONS_LIST)[number];

export interface ActivitySubmission {
  studentId: string;
  studentName: string;
  matricula: string;
  tag?: 'REGULAR' | 'PNE' | 'RAD';
  avatarUrl: string;
  submittedAt?: string;
  objectiveScore: number; // e.g. 5.0 (sai na hora)
  maxObjectiveScore: number; // e.g. 5.0
  essayScore?: number; // e.g. 4.0 (preenchido após o professor mandar/corrigir)
  maxEssayScore: number; // e.g. 5.0
  extraPoints?: number; // Ponto extra por desempenho
  status: 'pending' | 'draft' | 'graded' | 'returned';
  essayAnswer?: string;
  selectedObjectiveAnswers?: { [questionId: string]: number };
  teacherFeedback?: string;
  registeredInStateSystem?: boolean; // Atividade já registrada no sistema do estado (RCO/SED)
  groupMembers?: string; // Nomes dos alunos do grupo
  returnCount?: number; // Contador de devoluções pelo professor (1x, 2x, 3x; 4ª bloqueada)
}

export interface MultipleChoiceQuestion {
  id: string;
  statement: string;
  options: string[];
  correctOptionIndex: number;
}

export interface EssayQuestion {
  id: string;
  statement: string;
  minCharacters: number;
  keywords?: string; // Palavras-chave de atenção para a IA e aluno
}

export type ActivityQuestion = 
  | ({ type: 'multiple_choice' } & MultipleChoiceQuestion)
  | ({ type: 'essay' } & EssayQuestion);

export type ActivityType = 'Simulado' | 'Redação' | 'Dinâmica' | 'Avaliação' | 'Trabalho em grupo' | 'Projeto de pesquisa' | 'Recuperação Paralela' | 'Jogo Avaliativo';

export type ActivityDomain = 'formal' | 'interactive_game' | 'adapted_aee';
export type AeeMechanic = 'visual_cards' | 'binary_trail' | 'social_story' | 'block_builder';

export type GameMode = 'millionaire' | 'dialectic_tribunal' | 'structural_detective' | 'rpg_campaign' | 'real_life_lab';
export type GameExecutionContext = 'classroom_group' | 'homework_individual';

export interface GameStageOption {
  text: string;
  isCorrect: boolean;
  pointsWeight: number;
  feedback: string;
  iconEmoji?: string;
}

export interface GameMildStage {
  scenario: string;
  options: Array<{ text: string; isCorrect: boolean; feedback: string }>;
}

export interface GameSevereCard {
  iconEmoji: string;
  label: string;
  isCorrect: boolean;
  feedback: string;
}

export interface GameSevereStage {
  playfulPrompt: string;
  visualCards: GameSevereCard[];
}

export interface GameStage {
  id: string;
  title: string;
  scenario: string;
  clue?: string;
  options: GameStageOption[];
  pneMildStage?: GameMildStage;
  pneSevereStage?: GameSevereStage;
}

export interface GameData {
  introText: string;
  stages: GameStage[];
}

export interface AeePromptSettings {
  literalLanguage: boolean;
  cognitiveReduction: boolean;
  uppercaseText: boolean;
  concreteExamples: boolean;
}

export interface Activity {
  id: string;
  title: string;
  subject?: string;
  topic?: string;
  description: string;
  supportMaterial?: string;
  turma: string;
  type: ActivityType;
  status: 'Ativo' | 'Prazo Encerrado' | 'Inativo';
  deadline: string;
  dueDate?: string;
  maxGrade?: number;
  allowGroupWork?: boolean;
  securityFocusLock?: boolean; // Trava 1: Trava de foco (Aviso ao sair da tela, limite de 4 avisos -> auto entrega)
  securityBlockCopyStatement?: boolean; // Trava 2: Trava de cópia dos enunciados
  securityBlockPasteEssay?: boolean; // Trava 3: Trava de copia e cola nas respostas dissertativas
  
  // Três domínios estruturais de avaliação
  activityDomain?: ActivityDomain;
  isInteractive?: boolean;
  isStandaloneAdaptation?: boolean; // Quando true, a atividade adaptada existe por conta própria sem precisar de adaptedFromId
  linkedActivityId?: string; // Vínculo OPCIONAL a uma atividade formal ou interativa

  // Educação Inclusiva & AEE
  isAdapted?: boolean; // Indica se esta atividade foi adaptada para alunos PNE
  adaptationType?: 'mild_moderate' | 'severe_playful'; // Tipo de adaptação pedagógica
  adaptationReason?: string;
  aeeMechanic?: AeeMechanic;
  aeePromptSettings?: AeePromptSettings;
  playfulGameHtml?: string; // Código HTML do jogo interativo lúdico para síndromes severas
  playfulGameScoreMax?: number; // Pontuação máxima do jogo lúdico
  adaptedFromId?: string; // ID da atividade original vinculada
  originalActivityId?: string; // ID da atividade de origem quando aplicável

  // KronoGames & Gamificação
  isGameActivity?: boolean;
  gameMode?: GameMode;
  executionContext?: GameExecutionContext;
  gameData?: GameData;

  // Suporte futuro para Liga & Desafios
  isChallenge?: boolean;
  challengeWeek?: number;
  challengePoints?: number;

  isRecovery?: boolean; // Indica se esta atividade é uma Recuperação Paralela vinculada
  recoveryFromId?: string; // ID da atividade raiz da qual esta é a recuperação paralela
  recoveryManualParentName?: string; // Nome da atividade mãe digitado manualmente na exceção (ex: atividades em papel)
  recoveryApproach?: string; // Abordagem pedagógica diferenciada aplicada na recuperação
  includedPneStudentIds?: string[]; // IDs dos alunos PNE selecionados por proficiência para fazer a atividade normal
  questions?: ActivityQuestion[];
  objectiveQuestions?: any[];
  essayQuestions?: any[];
  totalSubmissions: number;
  totalStudents: number;
  pendingCorrection: number;
  averageGrade?: number;
  completedDate?: string;
  isArchived?: boolean;
  archivedAt?: string;
  archivedReason?: string;
  archivedVinculoId?: string; // Código/numeração única do vínculo (ex: VINC-092026)
  archivedSchool?: string; // Escola de vinculação
  submissions: ActivitySubmission[];
}

export interface ArchivedVinculo {
  id: string; // Identificador único do vínculo (ex: VINC-092026-...)
  vinculoCode: string; // Numeração formatada do vínculo (ex: "Vínculo 09/2026")
  school: string; // Escola associada
  monthYear: string; // Mês e ano de encerramento (ex: "09/2026")
  closedAt: string; // Data ISO de encerramento
  reason: string; // Motivo do arquivamento
  students: StudentUser[];
  activities: Activity[];
  turmas: string[];
  totalStudents: number;
  totalActivities: number;
}

export interface ScheduleItem {
  id: string;
  day: string;
  time: string;
  turma: string;
  room: string;
  subject: string;
}

export interface LibraryFile {
  id: string;
  title: string;
  category: string;
  turma: string;
  fileSize: string;
  updatedAt: string;
  driveUrl?: string;
}

export interface ChatMessage {
  id: string;
  threadId: string; // ID da conversa (ex: studentId)
  senderId: string;
  senderName: string;
  senderRole: 'teacher' | 'student' | 'second_teacher';
  senderAvatar?: string;
  recipientId: string;
  recipientName: string;
  recipientRole?: 'teacher' | 'student' | 'second_teacher';
  content: string;
  createdAt: string; // ISO string ou HH:mm
  timestamp?: string;
  read?: boolean;
  activityId?: string; // Opcional: vinculado a uma atividade
  activityTitle?: string;
}

export interface ChatThread {
  id: string; // id do aluno
  studentId: string;
  studentName: string;
  studentTurma: string;
  studentAvatar: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCountTeacher?: number;
  unreadCountStudent?: number;
}

export interface InclusionEvaluation {
  id: string;
  date: string;
  teacherName?: string;
  category: 'Acompanhamento' | 'Evolução' | 'Adaptação' | 'Ocorrência' | 'Reunião Família';
  content: string;
}

export interface InclusionRecord {
  id?: string;
  studentId: string;
  studentName: string;
  turma?: string;
  diagnosisNotes: string; // Diagnóstico/Laudo e Necessidades Específicas
  peiGoals: string; // Objetivos do PEI
  adaptedResources: string; // Recursos Adaptados & Metodologia Assistiva
  evaluationsHistory: InclusionEvaluation[]; // Histórico de pareceres de acompanhamento
  secondTeacherId?: string;
  secondTeacherName?: string;
  updatedAt?: string;
}

export interface AtestadoRadRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentTurma?: string;
  dataFalta: string; // Data da falta justificada (YYYY-MM-DD)
  dataAtestado: string; // Data do atestado (YYYY-MM-DD)
  diasAtestado: number; // Dias de atestado
  dataFinal: string; // Data final calculada automaticamente (YYYY-MM-DD)
  motivo?: string; // Motivo para justificar (opcional)
  tipo: 'Atestado' | 'RAD'; // RAD se diasAtestado >= 15 ou Atestado
  createdAt: string;
}

export interface RcoEmissionRecord {
  id: string;
  emissionHash: string;
  teacherId: string;
  teacherName: string;
  subject: string;
  school: string;
  scope: 'all' | 'single';
  turma?: string;
  totalStudents: number;
  totalActivities: number;
  turmasSummary: Array<{
    turmaName: string;
    studentsCount: number;
    activitiesCount: number;
    averageGrade: number;
    pneCount: number;
    radCount: number;
  }>;
  fullSnapshot: any;
  emittedAt: string;
  createdAt: string;
}

export type { AdaptationRecommendation } from './studentUtils';



