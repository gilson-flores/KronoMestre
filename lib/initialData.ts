import { Activity, StudentUser, TeacherUser, ScheduleItem, LibraryFile, ChatMessage } from './types';

export const initialTeacher: TeacherUser = {
  id: 'teacher-1',
  name: 'Gilson Flores',
  subject: 'Sociologia',
  email: 'gilson.flores@escola.edu.br',
  avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=250',
  school: "EEB Prof. Jandira D'Ávila",
  driveFolderUrl: '',
  matriculaFuncional: '654.982-1',
  contractStartDate: '2026-02-09',
  contractEndDate: '2026-12-18',
  contractType: 'ACT / Contratado',
  contractStatus: 'ativo',
};

export const initialStudents: StudentUser[] = [];

export const initialActivities: Activity[] = [];

export const initialSchedule: ScheduleItem[] = [];

export const initialLibrary: LibraryFile[] = [];

export const initialChatMessages: ChatMessage[] = [];


