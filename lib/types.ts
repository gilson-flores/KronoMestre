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
  tenantCode?: string;
  contractStartDate?: string;
  contractEndDate?: string;
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
  pneConditions?: string[];
  passwordHash: string;
  avatarUrl: string;
  pedagogicalNotes?: string;
  secondTeacherId?: string;
  secondTeacherName?: string;
  isArchived?: boolean;
  archivedAt?: string;
  archivedReason?: string;
  archivedVinculoId?: string;
  archivedSchool?: string;
  mustChangePassword?: boolean;
  ownerTeacherId?: string;
  owner_teacher_id?: string;
  isOnline?: boolean;
  lastActiveAt?: string;
  authorizedRecoveryActivityIds?: string[];
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
  objectiveScore: number;
  maxObjectiveScore: number;
  essayScore?: number;
  maxEssayScore: number;
  extraPoints?: number;
  status: 'pending' | 'draft' | 'graded' | 'returned';
  essayAnswer?: string;
  selectedObjectiveAnswers?: { [questionId: string]: number };
  teacherFeedback?: string;
  registeredInStateSystem?: boolean;
  groupMembers?: string;
  returnCount?: number;
  isPhysicalDelivery?: boolean;
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
  keywords?: string;
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
  securityFocusLock?: boolean;
  securityBlockCopyStatement?: boolean;
  securityBlockPasteEssay?: boolean;
  
  activityDomain?: ActivityDomain;
  isInteractive?: boolean;
  isStandaloneAdaptation?: boolean;
  linkedActivityId?: string;

  isAdapted?: boolean;
  adaptationType?: 'mild_moderate' | 'severe_playful';
  adaptationReason?: string;
  aeeMechanic?: AeeMechanic;
  aeePromptSettings?: AeePromptSettings;
  playfulGameHtml?: string;
  playfulGameScoreMax?: number;
  adaptedFromId?: string;
  originalActivityId?: string;

  isGameActivity?: boolean;
  gameMode?: GameMode;
  executionContext?: GameExecutionContext;
  gameData?: GameData;

  isChallenge?: boolean;
  challengeWeek?: number;
  challengePoints?: number;

  isRecovery?: boolean;
  recoveryFromId?: string;
  recoveryManualParentName?: string;
  recoveryApproach?: string;
  authorizedRecoveryStudentIds?: string[];
  includedPneStudentIds?: string[];
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
  archivedVinculoId?: string;
  archivedSchool?: string;
  submissions: ActivitySubmission[];
}

export interface ArchivedVinculo {
  id: string;
  vinculoCode: string;
  school: string;
  monthYear: string;
  closedAt: string;
  reason: string;
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
  threadId: string;
  senderId: string;
  senderName: string;
  senderRole: 'teacher' | 'student' | 'second_teacher';
  senderAvatar?: string;
  recipientId: string;
  recipientName: string;
  recipientRole?: 'teacher' | 'student' | 'second_teacher';
  content: string;
  createdAt: string;
  timestamp?: string;
  read?: boolean;
  activityId?: string;
  activityTitle?: string;
}

export interface ChatThread {
  id: string;
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
  diagnosisNotes: string;
  peiGoals: string;
  adaptedResources: string;
  evaluationsHistory: InclusionEvaluation[];
  secondTeacherId?: string;
  secondTeacherName?: string;
  updatedAt?: string;
}

export interface AtestadoRadRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentTurma?: string;
  dataFalta: string;
  dataAtestado: string;
  diasAtestado: number;
  dataFinal: string;
  motivo?: string;
  tipo: 'Atestado' | 'RAD';
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