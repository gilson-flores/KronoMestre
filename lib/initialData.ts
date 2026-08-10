import { Activity, StudentUser, TeacherUser, ScheduleItem, LibraryFile, ChatMessage } from './types';

export const initialTeacher: TeacherUser = {
  id: 'teacher-1',
  name: 'Gilson Flores',
  subject: 'Sociologia',
  email: 'gilson.flores@escola.edu.br',
  avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=250',
  school: "EEB Prof. Jandira D'Ávila",
};

export const initialStudents: StudentUser[] = [];

export const initialActivities: Activity[] = [];

export const initialSchedule: ScheduleItem[] = [];

export const initialLibrary: LibraryFile[] = [
  {
    id: 'lib-1',
    title: 'Apostila 01 - Fundamentos de Sociologia e Cultura (PDF)',
    category: 'Apostilas',
    turma: 'branco',
    fileSize: '4.2 MB',
    updatedAt: '05/08/2026',
    driveUrl: 'https://drive.google.com/drive/my-drive',
  },
  {
    id: 'lib-2',
    title: 'Slides de Aula - Clássicos da Sociologia (Marx, Durkheim, Weber)',
    category: 'Apresentações',
    turma: 'branco',
    fileSize: '12.8 MB',
    updatedAt: '02/08/2026',
    driveUrl: 'https://drive.google.com/drive/my-drive',
  },
  {
    id: 'lib-3',
    title: 'Guia de Redação Sociológica e Repertório Cultural - Padrão ENEM',
    category: 'Guias e Modelos',
    turma: 'branco',
    fileSize: '1.8 MB',
    updatedAt: '01/08/2026',
    driveUrl: 'https://drive.google.com/drive/my-drive',
  },
];

export const initialChatMessages: ChatMessage[] = [];


