import { Activity, StudentUser, TeacherUser, ScheduleItem, LibraryFile, ChatMessage } from './types';

export const initialTeacher: TeacherUser = {
  id: '',
  name: '',
  subject: '',
  email: '',
  avatarUrl: '',
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

export const initialChatMessages: ChatMessage[] = [
  {
    id: 'msg-1',
    threadId: 'std-1',
    senderId: 'std-1',
    senderName: 'Ana Silva',
    senderRole: 'student',
    senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
    recipientId: 'teacher-1',
    recipientName: 'Professora',
    content: 'Professora, boa tarde! Gostaria de tirar uma dúvida sobre o conceito de Fato Social em Durkheim para a redação.',
    createdAt: '09/08/2026 09:15',
    read: true,
  },
  {
    id: 'msg-2',
    threadId: 'std-1',
    senderId: 'teacher-1',
    senderName: 'Professora',
    senderRole: 'teacher',
    recipientId: 'std-1',
    recipientName: 'Ana Silva',
    content: 'Olá Ana! Lembre-se das três características fundamentais: exterioridade, coercitividade e generalidade. Você pode usar a solidariedade orgânica como repertório no ENEM.',
    createdAt: '09/08/2026 09:22',
    read: true,
  },
  {
    id: 'msg-3',
    threadId: 'std-1',
    senderId: 'std-1',
    senderName: 'Ana Silva',
    senderRole: 'student',
    senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
    recipientId: 'teacher-1',
    recipientName: 'Professora',
    content: 'Excelente, professora! Muito obrigada pela explicação, ficou claríssimo!',
    createdAt: '09/08/2026 09:30',
    read: false,
  },
];


