import { Activity, StudentUser, TeacherUser, ScheduleItem, LibraryFile, ChatMessage } from './types';

// Fallback de carregamento esterilizado.
// Usado APENAS para evitar erros de renderização no frontend antes da API responder.
export const initialTeacher: TeacherUser = {
  id: '',
  name: 'Carregando...',
  subject: '',
  email: '',
  avatarUrl: '',
  school: '',
  driveFolderUrl: '',
  matriculaFuncional: '',
  tenantCode: '',
  contractStartDate: '',
  contractEndDate: '',
  contractType: '',
  contractStatus: '',
};

export const initialStudents: StudentUser[] = [];

export const initialActivities: Activity[] = [];

export const initialSchedule: ScheduleItem[] = [];

export const initialLibrary: LibraryFile[] = [];

export const initialChatMessages: ChatMessage[] = [];


