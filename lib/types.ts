export type UserRole = 'teacher' | 'student' | null;

export interface TeacherUser {
  id: string;
  name: string;
  subject: string;
  email: string;
  avatarUrl: string;
  phone?: string;
  school?: string;
}

export interface StudentUser {
  id: string;
  fullName: string;
  turma: string;
  matricula: string;
  tag?: 'REGULAR' | 'PNE' | 'RAD';
  passwordHash: string; // default "1234"
  avatarUrl: string;
}

export interface ActivitySubmission {
  studentId: string;
  studentName: string;
  matricula: string;
  tag?: 'REGULAR' | 'PNE' | 'RAD';
  avatarUrl: string;
  submittedAt?: string;
  objectiveScore: number; // e.g. 4.5
  maxObjectiveScore: number; // e.g. 5.0
  essayScore?: number; // e.g. 4.0
  maxEssayScore: number; // e.g. 5.0
  extraPoints?: number; // Ponto extra por desempenho
  status: 'pending' | 'draft' | 'graded' | 'returned';
  essayAnswer?: string;
  teacherFeedback?: string;
  registeredInStateSystem?: boolean; // Atividade já registrada no sistema do estado (RCO/SED)
  groupMembers?: string; // Nomes dos alunos do grupo
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
  type: 'Simulado' | 'Redação' | 'Dinâmica' | 'Avaliação';
  status: 'Ativo' | 'Prazo Encerrado' | 'Inativo';
  deadline: string;
  maxGrade?: number;
  allowGroupWork?: boolean;
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
}
