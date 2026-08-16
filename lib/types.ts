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
}

export interface StudentUser {
  id: string;
  fullName: string;
  turma: string;
  matricula: string;
  tag?: 'REGULAR' | 'PNE' | 'RAD';
  pneConditions?: string[]; // Doenças, deficiências ou necessidades específicas
  passwordHash: string; // default "1234"
  avatarUrl: string;
  pedagogicalNotes?: string;
  secondTeacherId?: string;
  secondTeacherName?: string;
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
  options: [string, string, string, string];
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

export interface Activity {
  id: string;
  title: string;
  subject?: string;
  description: string;
  supportMaterial?: string;
  turma: string;
  type: 'Simulado' | 'Redação' | 'Dinâmica' | 'Avaliação' | 'Trabalho em grupo' | 'Projeto de pesquisa';
  status: 'Ativo' | 'Prazo Encerrado' | 'Inativo';
  deadline: string;
  maxGrade?: number;
  allowGroupWork?: boolean;
  securityFocusLock?: boolean; // Trava 1: Trava de foco (Aviso ao sair da tela, limite de 4 avisos -> auto entrega)
  securityBlockCopyStatement?: boolean; // Trava 2: Trava de cópia dos enunciados
  securityBlockPasteEssay?: boolean; // Trava 3: Trava de copia e cola nas respostas dissertativas
  questions?: ActivityQuestion[];
  totalSubmissions: number;
  totalStudents: number;
  pendingCorrection: number;
  averageGrade?: number;
  completedDate?: string;
  submissions: ActivitySubmission[];
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
  senderRole: 'teacher' | 'student';
  senderAvatar?: string;
  recipientId: string;
  recipientName: string;
  content: string;
  createdAt: string; // ISO string ou HH:mm
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



