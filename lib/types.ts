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
  status: 'pending' | 'draft' | 'graded' | 'returned';
  essayAnswer?: string;
  teacherFeedback?: string;
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  turma: string;
  type: 'Simulado' | 'Redação' | 'Dinâmica' | 'Avaliação';
  status: 'Ativo' | 'Prazo Encerrado' | 'Inativo';
  deadline: string;
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
