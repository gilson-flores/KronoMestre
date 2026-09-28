'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Send,
  User,
  Check,
  CheckCheck,
  Paperclip,
  ArrowLeft,
  Sparkles,
  Filter,
  FileText,
  Shield,
  X,
  Users,
  Bell,
  BellRing,
  Bot,
  Loader2,
  Eye,
} from 'lucide-react';
import { ChatMessage, StudentUser, TeacherUser, Activity } from '@/lib/types';
import { formatAvatarUrl } from '@/lib/utils';
import {
  getNotificationPermission,
  requestNotificationPermission,
  isNotificationSupported,
  playNotificationSound,
  sendBrowserNotification,
} from '@/lib/notificationUtils';

interface MessagesViewProps {
  currentUserRole: 'teacher' | 'student';
  isSecondTeacher?: boolean;
  teacher: TeacherUser;
  student?: StudentUser | null;
  students: StudentUser[];
  activities: Activity[];
  messages: ChatMessage[];
  isAiAutoReplyEnabled?: boolean;
  onToggleAiAutoReply?: (enabled: boolean) => void;
  onSendMessage: (msg: {
    threadId: string;
    senderId: string;
    senderName: string;
    senderRole: 'teacher' | 'student';
    senderAvatar?: string;
    recipientId: string;
    recipientName: string;
    content: string;
    activityId?: string;
    activityTitle?: string;
  }) => void;
  onMarkThreadAsRead?: (threadId: string, currentRole: 'teacher' | 'student') => void;
}

/**
 * Identifica se uma mensagem pertence ao canal do 2º Professor (AEE / Inclusão)
 */
const isSecondTeacherChannelMessage = (msg: ChatMessage): boolean => {
  const sId = (msg.senderId || '').toLowerCase();
  const rId = (msg.recipientId || '').toLowerCase();
  const sName = (msg.senderName || '').toLowerCase();
  const rName = (msg.recipientName || '').toLowerCase();
  const role = (msg.senderRole as string) || '';

  return (
    role === 'second_teacher' ||
    sId === 'second-teacher' ||
    rId === 'second-teacher' ||
    sId.startsWith('st_') ||
    rId.startsWith('st_') ||
    sName.includes('2º professor') ||
    rName.includes('2º professor') ||
    sName.includes('2o professor') ||
    rName.includes('2o professor')
  );
};

export const MessagesView: React.FC<MessagesViewProps> = ({
  isSecondTeacher = false,
  currentUserRole,
  teacher,
  student,
  students,
  activities,
  messages,
  isAiAutoReplyEnabled = true,
  onToggleAiAutoReply,
  onSendMessage,
  onMarkThreadAsRead,
}) => {
  // Currently active thread student ID
  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    if (currentUserRole === 'student' && student) {
      return student.id;
    }
    return students.length > 0 ? students[0].id : '';
  });

  // Mobile navigation state
  const [isMobileChatOpen, setIsMobileChatOpen] = useState<boolean>(false);

  // Popup de Filtros
  const [isFilterPopupOpen, setIsFilterPopupOpen] = useState<boolean>(false);

  // Notification permission state
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && isNotificationSupported()) {
      return getNotificationPermission();
    }
    return 'default';
  });
  const [isGeneratingAiDraft, setIsGeneratingAiDraft] = useState(false);

  const handleToggleNotifications = async () => {
    const perm = await requestNotificationPermission();
    setNotifPermission(perm);
    if (perm === 'granted') {
      playNotificationSound();
      sendBrowserNotification('🔔 Notificações Ativadas com Sucesso!', {
        body: 'Você receberá avisos em tempo real de novas mensagens, novas atividades e prazos de entrega.',
        tag: 'welcome-notification',
      });
    }
  };

  // Filters state
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>('Todos');
  const [selectedTurmaFilter, setSelectedTurmaFilter] = useState<string>('Todas');
  const [readStatusFilter, setReadStatusFilter] = useState<'todas' | 'nao_lidas' | 'lidas'>('todas');
  const [channelScopeFilter, setChannelScopeFilter] = useState<'todos' | 'titular' | 'segundo'>('todos');

  // Recipient selection for Student ('titular' vs 'segundo')
  const [studentRecipient, setStudentRecipient] = useState<'titular' | 'segundo'>('titular');

  // New message form state
  const [newMessageText, setNewMessageText] = useState('');
  const [attachedActivityId, setAttachedActivityId] = useState<string>('');
  const [isAttachingActivity, setIsAttachingActivity] = useState(false);
  const [broadcastTurma, setBroadcastTurma] = useState<string>('Todas');

  // Ref for chat auto-scroll
  const chatBottomRef = useRef<HTMLDivElement>(null);

  /**
   * Filtra se uma mensagem é visível para o papel logado:
   * - 2º Professor: Vê ESTRITAMENTE mensagens do canal do 2º Professor (e enviadas por/para ele).
   * - Professor Titular: Vê TODAS (suas e do 2º Professor para supervisão), respeitando o filtro de canal.
   * - Aluno: Vê o canal selecionado na aba superior ('titular' ou 'segundo').
   */
  const isMessageVisibleInCurrentContext = (msg: ChatMessage): boolean => {
    const isSecMsg = isSecondTeacherChannelMessage(msg);

    if (currentUserRole === 'teacher') {
      if (isSecondTeacher) {
        if (!isSecMsg) return false;
        const myId = (teacher.id || '').trim().toLowerCase();
        const myName = (teacher.name || '').trim().toLowerCase();
        const sId = (msg.senderId || '').trim().toLowerCase();
        const rId = (msg.recipientId || '').trim().toLowerCase();
        const sName = (msg.senderName || '').trim().toLowerCase();

        return (
          rId === 'second-teacher' ||
          sId === 'second-teacher' ||
          (Boolean(myId) && (sId === myId || rId === myId)) ||
          (Boolean(myName) && sName.includes(myName))
        );
      } else {
        // Professor Titular: vê tudo ou filtra por canal no popup
        if (channelScopeFilter === 'titular') return !isSecMsg;
        if (channelScopeFilter === 'segundo') return isSecMsg;
        return true;
      }
    }

    // Papel Aluno: separa a conversa do Professor Regente da conversa do 2º Professor
    if (studentRecipient === 'segundo') {
      return isSecMsg;
    }
    return !isSecMsg;
  };

  // Get active student object for the selected thread
  const activeStudent =
    selectedStudentId === 'broadcast'
      ? null
      : students.find((s) => s.id === selectedStudentId) ||
        (currentUserRole === 'student' && student ? student : students[0]);

  // Current Thread ID is student.id
  const activeThreadId =
    selectedStudentId === 'broadcast'
      ? 'broadcast'
      : currentUserRole === 'student'
      ? student?.id || 'default-thread'
      : selectedStudentId || (students.length > 0 ? students[0].id : 'default-thread');

  // Filter messages for active thread applying role & channel isolation
  const activeThreadMessages = messages.filter((m) => {
    const belongsToStudent =
      m.threadId === activeThreadId || m.senderId === activeThreadId || m.recipientId === activeThreadId;
    if (!belongsToStudent) return false;
    return isMessageVisibleInCurrentContext(m);
  });

  // Contadores de mensagens não lidas por canal para o Aluno
  const studentUnreadFromTitular = useMemo(() => {
    if (currentUserRole !== 'student' || !student) return 0;
    return messages.filter(
      (m) =>
        (m.threadId === student.id || m.recipientId === student.id) &&
        m.senderRole !== 'student' &&
        !isSecondTeacherChannelMessage(m) &&
        !m.read
    ).length;
  }, [messages, currentUserRole, student]);

  const studentUnreadFromSegundo = useMemo(() => {
    if (currentUserRole !== 'student' || !student) return 0;
    return messages.filter(
      (m) =>
        (m.threadId === student.id || m.recipientId === student.id) &&
        m.senderRole !== 'student' &&
        isSecondTeacherChannelMessage(m) &&
        !m.read
    ).length;
  }, [messages, currentUserRole, student]);

  // Auto-scroll to bottom of chat when new message arrives or thread changes
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThreadMessages.length, selectedStudentId, studentRecipient]);

  // Mark thread as read when selected or when new messages arrive
  useEffect(() => {
    if (onMarkThreadAsRead && activeThreadId) {
      onMarkThreadAsRead(activeThreadId, currentUserRole);
    }
  }, [activeThreadId, currentUserRole, onMarkThreadAsRead, messages]);

  // Calculate unique turmas for filter dropdown
  const availableTurmas = Array.from(new Set(students.map((s) => s.turma))).filter(Boolean);

  // Calculate total threads with unread messages within the user's visible scope
  const totalUnreadThreads = students.filter((s) => {
    const stMessages = messages.filter(
      (m) =>
        (m.threadId === s.id || m.senderId === s.id || m.recipientId === s.id) &&
        isMessageVisibleInCurrentContext(m)
    );
    return stMessages.some((m) => m.senderRole === 'student' && !m.read);
  }).length;

  // Quantidade de filtros ativos no popup
  const activeFiltersCount =
    (selectedStudentFilter !== 'Todos' ? 1 : 0) +
    (selectedTurmaFilter !== 'Todas' ? 1 : 0) +
    (readStatusFilter !== 'todas' ? 1 : 0) +
    (!isSecondTeacher && channelScopeFilter !== 'todos' ? 1 : 0);

  // Filter students for the sidebar conversation list
  const filteredStudents = students.filter((s) => {
    const stMessages = messages.filter(
      (m) =>
        (m.threadId === s.id || m.senderId === s.id || m.recipientId === s.id) &&
        isMessageVisibleInCurrentContext(m)
    );
    const hasMessages = stMessages.length > 0;
    const isExplicitlySelected = selectedStudentFilter !== 'Todos' && s.id === selectedStudentFilter;

    // Para o 2º Professor, se ainda não houver mensagens trocadas, permite ver os alunos da sua turma caso filtre por turma/aluno, ou mostra apenas os que já têm mensagens com ele
    if (!hasMessages && !isExplicitlySelected && selectedTurmaFilter === 'Todas') {
      return false;
    }

    const matchesStudent = selectedStudentFilter === 'Todos' || s.id === selectedStudentFilter;
    const matchesTurma = selectedTurmaFilter === 'Todas' || s.turma === selectedTurmaFilter;

    const hasUnread = stMessages.some((m) => m.senderRole === 'student' && !m.read);
    let matchesStatus = true;
    if (readStatusFilter === 'nao_lidas') {
      matchesStatus = hasUnread;
    } else if (readStatusFilter === 'lidas') {
      matchesStatus = !hasUnread;
    }

    return matchesStudent && matchesTurma && matchesStatus;
  });

  const handleSelectStudent = (stId: string) => {
    setSelectedStudentId(stId);
    setIsMobileChatOpen(true);
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessageText.trim()) return;

    const selectedActObj = activities.find((a) => a.id === attachedActivityId);

    // Formata o nome do remetente garantindo a tag de 2º Professor quando enviado pelo 2º Professor
    const formattedTeacherSenderName = isSecondTeacher
      ? teacher.name?.toLowerCase().includes('2º professor')
        ? teacher.name
        : `${teacher.name || 'Professor'} (2º Professor)`
      : teacher.name || 'Professor';

    const formattedTeacherSenderId = isSecondTeacher
      ? teacher.id || 'second-teacher'
      : teacher.id || 'teacher-1';

    if (currentUserRole === 'teacher' && selectedStudentId === 'broadcast') {
      const targetStudents = students.filter(
        (s) => broadcastTurma === 'Todas' || s.turma === broadcastTurma
      );
      for (const st of targetStudents) {
        onSendMessage({
          threadId: st.id,
          senderId: formattedTeacherSenderId,
          senderName: formattedTeacherSenderName,
          senderRole: 'teacher',
          senderAvatar: teacher.avatarUrl,
          recipientId: st.id,
          recipientName: st.fullName || 'Aluno',
          content: newMessageText.trim(),
          activityId: selectedActObj?.id,
          activityTitle: selectedActObj?.title,
        });
        await new Promise((r) => setTimeout(r, 10));
      }
      setNewMessageText('');
      setAttachedActivityId('');
      setIsAttachingActivity(false);
      return;
    }

    let recId = '';
    let recName = '';
    let sndId = '';
    let sndName = '';
    let sndAvatar: string | undefined = undefined;

    if (currentUserRole === 'teacher') {
      sndId = formattedTeacherSenderId;
      sndName = formattedTeacherSenderName;
      sndAvatar = teacher.avatarUrl;
      recId = activeStudent?.id || 'std-1';
      recName = activeStudent?.fullName || 'Aluno';
    } else {
      sndId = student?.id || 'std-1';
      sndName = student?.fullName || 'Aluno';
      sndAvatar = student?.avatarUrl;

      if (studentRecipient === 'segundo') {
        recId = 'second-teacher';
        recName = student?.secondTeacherName
          ? `${student.secondTeacherName} (2º Professor)`
          : '2º Professor (Inclusão)';
      } else {
        recId = teacher.id || 'teacher-1';
        recName = teacher.name || 'Prof. Regente';
      }
    }

    onSendMessage({
      threadId: activeThreadId,
      senderId: sndId,
      senderName: sndName,
      senderRole: currentUserRole,
      senderAvatar: sndAvatar,
      recipientId: recId,
      recipientName: recName,
      content: newMessageText.trim(),
      activityId: selectedActObj?.id,
      activityTitle: selectedActObj?.title,
    });

    setNewMessageText('');
    setAttachedActivityId('');
    setIsAttachingActivity(false);
  };

  // Quick suggestion prompts
  const teacherPrompts = [
    'Parabéns pelo empenho na última avaliação!',
    'Lembre-se de conferir as orientações da redação antes de enviar.',
    'Sua dúvida sobre a questão foi esclarecida?',
  ];

  const studentPrompts = [
    'Professor, boa tarde! Tenho uma dúvida sobre a última atividade.',
    'Gostaria de saber se a minha redação já foi corrigida.',
    'Poderia me enviar o material complementar de apoio?',
  ];

  const quickPrompts = currentUserRole === 'teacher' ? teacherPrompts : studentPrompts;

  // Generate intelligent response draft using Gemini acting as Prof. Gilson
  const handleGenerateAiTeacherDraft = async () => {
    if (isGeneratingAiDraft) return;
    setIsGeneratingAiDraft(true);

    try {
      const lastStudentMsg = [...activeThreadMessages].reverse().find((m) => m.senderRole === 'student');
      const res = await fetch('/api/gemini/teacher-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: activeStudent?.fullName || 'Aluno',
          studentTurma: activeStudent?.turma || 'Geral',
          studentTag: activeStudent?.tag || 'REGULAR',
          teacherName: teacher.name || 'Prof. Gilson Flores',
          teacherSubject: teacher.subject || 'Sociologia',
          schoolName: teacher.school || "EEB Prof. Jandira D'Ávila",
          messages: activeThreadMessages,
          activities: activities,
          currentMessage: lastStudentMsg
            ? lastStudentMsg.content
            : newMessageText || 'Como posso ajudar você hoje nas aulas de Sociologia?',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.reply) {
          setNewMessageText(data.reply);
        }
      }
    } catch (e) {
      console.warn('Erro ao gerar rascunho com IA:', e);
    } finally {
      setIsGeneratingAiDraft(false);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-6 sm:pb-10 w-full min-w-0">
      {/* Header Banner */}
      <div className="glass-panel p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4 shadow-xl min-w-0">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="p-2.5 sm:p-3.5 bg-primary/10 text-primary rounded-2xl border border-primary/20 shrink-0">
            <MessageSquare className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] sm:text-xs font-bold text-primary uppercase tracking-wider bg-primary/10 px-2.5 sm:px-3 py-0.5 rounded-full border border-primary/20 shrink-0">
                Mensagens
              </span>
              <span className="text-[10px] sm:text-xs font-semibold text-muted truncate">
                KronoMestre • Comunicação Direta
              </span>
            </div>
            <h1 className="text-lg sm:text-2xl font-extrabold text-foreground mt-1 truncate">
              {currentUserRole === 'teacher'
                ? isSecondTeacher
                  ? 'Mensagens • 2º Professor (Turmas Vinculadas)'
                  : 'Central de Mensagens e Atendimento'
                : 'Atendimento com os Professores'}
            </h1>
            <p className="text-[11px] sm:text-xs text-muted mt-0.5 line-clamp-2 sm:line-clamp-none">
              {currentUserRole === 'teacher'
                ? isSecondTeacher
                  ? 'Converse diretamente com os alunos das turmas em que você atua.'
                  : 'Tire dúvidas, envie feedbacks individuais e supervisione as interações das turmas.'
                : 'Escolha abaixo se deseja conversar com o Professor Regente ou com o 2º Professor da sua turma.'}
            </p>
          </div>
        </div>

        {/* Action Controls in Header: Notifications & AI Auto-Reply */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap self-start md:self-auto">
          <button
            type="button"
            onClick={handleToggleNotifications}
            className={`px-3 py-2 rounded-2xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
              notifPermission === 'granted'
                ? 'bg-primary/15 text-primary border-primary/30 hover:bg-primary/25'
                : 'bg-surface text-muted border-border hover:text-foreground hover:bg-surface-hover'
            }`}
            title="Ativar ou verificar notificações no navegador Chrome e Smartphone"
          >
            {notifPermission === 'granted' ? (
              <>
                <BellRing className="w-3.5 h-3.5 text-primary" />
                <span className="hidden sm:inline">Notificações Ativas</span>
                <span className="sm:hidden">Notificações</span>
              </>
            ) : (
              <>
                <Bell className="w-3.5 h-3.5 text-amber-400" />
                <span>Ativar Notificações</span>
              </>
            )}
          </button>

          {/* Teacher AI Auto-Reply Toggle (Apenas Professor Titular) */}
          {currentUserRole === 'teacher' && !isSecondTeacher && onToggleAiAutoReply && (
            <button
              type="button"
              onClick={() => onToggleAiAutoReply(!isAiAutoReplyEnabled)}
              className={`px-3 py-2 rounded-2xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                isAiAutoReplyEnabled
                  ? 'bg-purple-100 text-purple-600 border-purple-200 hover:bg-purple-500/30'
                  : 'bg-surface text-muted border-border hover:text-foreground'
              }`}
              title="Ativar/Pausar respostas automáticas com IA do Prof. Gilson para os alunos"
            >
              <Bot className={`w-3.5 h-3.5 ${isAiAutoReplyEnabled ? 'text-purple-400' : 'text-[#869486]'}`} />
              <span>IA Prof. Gilson: {isAiAutoReplyEnabled ? 'Ativo' : 'Pausado'}</span>
            </button>
          )}

          <div className="bg-surface px-3 py-2 rounded-2xl border border-border flex items-center gap-2 text-xs text-foreground shrink-0">
            <Shield className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-[11px] font-medium hidden lg:inline">Canal Seguro</span>
          </div>
        </div>
      </div>

      {/* Main Messaging Interface Container */}
      <div className="glass-panel rounded-2xl sm:rounded-3xl border border-border shadow-2xl overflow-hidden h-[calc(100vh-220px)] sm:h-[calc(100vh-250px)] min-h-[480px] max-h-[780px] flex flex-col md:flex-row relative w-full min-w-0">
        {/* LEFT PANEL: Student Thread List (Teacher View) */}
        {currentUserRole === 'teacher' && (
          <div
            className={`w-full md:w-72 lg:w-80 xl:w-96 bg-[#0c1424] border-r border-border flex flex-col transition-all duration-300 h-full min-h-0 shrink-0 ${
              isMobileChatOpen ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Clean Teacher Sidebar Header with Popup Filter Button */}
            <div className="p-3 sm:p-4 border-b border-border bg-surface/60 shrink-0 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <User className="w-4 h-4 text-primary shrink-0" />
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider truncate">
                  Conversas ({filteredStudents.length})
                </h3>
                {totalUnreadThreads > 0 && (
                  <span className="text-[10px] bg-primary text-white px-2 py-0.5 rounded-full font-extrabold">
                    {totalUnreadThreads} nova(s)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStudentFilter('Todos');
                      setSelectedTurmaFilter('Todas');
                      setReadStatusFilter('todas');
                      setChannelScopeFilter('todos');
                    }}
                    className="text-[10px] text-rose-400 hover:underline font-bold px-1.5 py-1 cursor-pointer"
                    title="Limpar todos os filtros"
                  >
                    Limpar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsFilterPopupOpen(true)}
                  className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeFiltersCount > 0
                      ? 'bg-primary/20 text-primary border-primary/40 shadow-sm'
                      : 'bg-surface hover:bg-surface-hover text-foreground border-border'
                  }`}
                  title="Abrir filtros de aluno, turma, status e canal"
                >
                  <Filter className="w-3.5 h-3.5 text-primary" />
                  <span>Filtros</span>
                  {activeFiltersCount > 0 && (
                    <span className="bg-primary text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Student Thread Scroll Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-white/5 min-h-0">
              <button
                onClick={() => handleSelectStudent('broadcast')}
                className={`w-full p-3 sm:p-4 text-left flex items-center sm:items-start gap-3 transition-colors cursor-pointer relative ${
                  selectedStudentId === 'broadcast'
                    ? 'bg-[#17233b] border-l-4 border-l-[#4ade80]'
                    : 'hover:bg-surface-hover'
                }`}
              >
                <div className="relative shrink-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="text-xs font-bold truncate text-foreground">Mensagem para Turma</h4>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-muted mt-0.5 truncate">
                    Enviar para múltiplos alunos
                  </p>
                </div>
              </button>

              {filteredStudents.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted space-y-3">
                  <p>
                    {isSecondTeacher
                      ? 'Nenhuma conversa iniciada com alunos da sua turma ainda.'
                      : 'Nenhuma mensagem ou conversa encontrada para os filtros atuais.'}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsFilterPopupOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-primary/15 text-primary border border-primary/30 font-bold text-xs hover:bg-primary/25 cursor-pointer"
                    >
                      Escolher Aluno / Turma
                    </button>
                    {activeFiltersCount > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStudentFilter('Todos');
                          setSelectedTurmaFilter('Todas');
                          setReadStatusFilter('todas');
                          setChannelScopeFilter('todos');
                        }}
                        className="text-muted underline font-semibold text-xs hover:text-foreground cursor-pointer"
                      >
                        Limpar Filtros
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                filteredStudents.map((st) => {
                  const isSelected = st.id === selectedStudentId;
                  const stMessages = messages.filter(
                    (m) =>
                      (m.threadId === st.id || m.senderId === st.id || m.recipientId === st.id) &&
                      isMessageVisibleInCurrentContext(m)
                  );
                  const lastMsg = stMessages[stMessages.length - 1];
                  const unreadCount = stMessages.filter((m) => m.senderRole === 'student' && !m.read).length;
                  const lastIsSecondChannel = lastMsg ? isSecondTeacherChannelMessage(lastMsg) : false;

                  return (
                    <button
                      key={st.id}
                      onClick={() => handleSelectStudent(st.id)}
                      className={`w-full p-3 sm:p-4 text-left flex items-center sm:items-start gap-3 transition-colors cursor-pointer relative ${
                        isSelected
                          ? 'bg-[#17233b] border-l-4 border-l-[#4ade80]'
                          : 'hover:bg-surface-hover'
                      }`}
                    >
                      <div className="relative shrink-0">
                        <img
                          src={st.avatarUrl}
                          alt={st.fullName}
                          loading="lazy"
                          decoding="async"
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border border-border"
                        />
                        <span className="w-2.5 h-2.5 rounded-full bg-primary absolute bottom-0 right-0 border-2 border-[#0c1424]" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-bold text-foreground truncate">{st.fullName}</h4>
                          {lastMsg && (
                            <span className="text-[10px] text-[#869486] shrink-0">
                              {lastMsg.createdAt.split(' ')[1] || lastMsg.createdAt}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-[10px] bg-surface text-muted px-1.5 py-0.2 rounded border border-border font-semibold">
                            {st.turma}
                          </span>
                          {st.tag && (
                            <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.2 rounded font-bold">
                              {st.tag}
                            </span>
                          )}
                          {!isSecondTeacher && lastIsSecondChannel && (
                            <span className="text-[9px] bg-amber-400/20 text-amber-400 border border-amber-400/30 px-1.5 py-0.2 rounded font-bold">
                              2º Prof
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-muted truncate mt-1">
                          {lastMsg ? lastMsg.content : 'Iniciar conversa...'}
                        </p>
                      </div>

                      {unreadCount > 0 && (
                        <span className="bg-primary text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center shrink-0 shadow-sm self-center">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* RIGHT PANEL: Active Conversation Window */}
        <div
          className={`flex-1 bg-[#09101f] flex flex-col transition-all duration-300 min-w-0 h-full min-h-0 ${
            !isMobileChatOpen && currentUserRole === 'teacher' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Chat Window Header */}
          <div className="p-3 sm:p-4 bg-surface border-b border-border flex items-center justify-between gap-2.5 sm:gap-3 shrink-0 min-w-0 w-full">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {currentUserRole === 'teacher' && (
                <button
                  onClick={() => setIsMobileChatOpen(false)}
                  className="md:hidden p-1.5 text-muted hover:text-foreground rounded-full hover:bg-surface-hover transition-colors shrink-0"
                  aria-label="Voltar para lista de alunos"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}

              {currentUserRole === 'teacher' ? (
                selectedStudentId === 'broadcast' ? (
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/40 shrink-0">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">
                          Mensagem para Turma
                        </h3>
                        <span className="text-[10px] bg-[#171f33] text-primary font-bold px-2 py-0.5 rounded border border-border shrink-0">
                          Múltiplos Alunos
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <select
                          value={broadcastTurma}
                          onChange={(e) => setBroadcastTurma(e.target.value)}
                          className="bg-surface border border-border rounded-md px-1.5 py-0.5 text-[10px] text-muted hover:text-foreground focus:outline-none focus:border-primary cursor-pointer"
                        >
                          <option value="Todas">Todas as Turmas ({students.length})</option>
                          {availableTurmas.map((t) => (
                            <option key={t} value={t}>
                              {t} ({students.filter((s) => s.turma === t).length} alunos)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ) : activeStudent ? (
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <img
                      src={formatAvatarUrl(activeStudent.avatarUrl)}
                      alt={activeStudent.fullName}
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border border-primary shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200';
                      }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">
                          {activeStudent.fullName}
                        </h3>
                        <span className="text-[10px] bg-[#171f33] text-primary font-bold px-2 py-0.5 rounded border border-border shrink-0">
                          {activeStudent.turma}
                        </span>
                      </div>
                      <p className="text-[10px] sm:text-[11px] text-muted truncate">
                        Matrícula: <span className="font-mono text-foreground">{activeStudent.matricula}</span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-muted">Selecione um aluno</span>
                )
              ) : (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 w-full min-w-0">
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <h3 className="text-xs sm:text-sm font-extrabold text-foreground truncate">
                        Canal de Comunicação com os Professores
                      </h3>
                      <p className="text-[10px] sm:text-[11px] text-muted truncate">
                        {studentRecipient === 'segundo'
                          ? 'Conversa exclusiva com o 2º Professor (Inclusão / AEE)'
                          : `Conversa com o Professor Regente (${teacher.name || 'Sociologia'})`}
                      </p>
                    </div>
                  </div>

                  {/* Student Recipient Toggle */}
                  <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-border shrink-0 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setStudentRecipient('titular')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        studentRecipient === 'titular'
                          ? 'bg-primary text-white shadow'
                          : 'text-muted hover:text-foreground'
                      }`}
                    >
                      <span>Prof. Regente</span>
                      {studentUnreadFromTitular > 0 && (
                        <span className="bg-white text-primary text-[9px] font-black px-1.5 rounded-full">
                          {studentUnreadFromTitular}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudentRecipient('segundo')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        studentRecipient === 'segundo'
                          ? 'bg-amber-400 text-amber-950 shadow'
                          : 'text-muted hover:text-foreground'
                      }`}
                    >
                      <span>2º Professor</span>
                      {studentUnreadFromSegundo > 0 && (
                        <span className="bg-amber-950 text-amber-300 text-[9px] font-black px-1.5 rounded-full">
                          {studentUnreadFromSegundo}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-muted shrink-0">
              <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
              <span className="hidden lg:inline font-semibold text-[11px]">Canal Ativo</span>
            </div>
          </div>

          {/* Messages Stream Area */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 sm:p-5 space-y-3.5 sm:space-y-4">
            {activeThreadMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 sm:p-8 space-y-3">
                <div className="p-3.5 sm:p-4 rounded-full bg-surface text-primary border border-border">
                  {selectedStudentId === 'broadcast' ? (
                    <Users className="w-7 h-7 sm:w-8 sm:h-8" />
                  ) : (
                    <MessageSquare className="w-7 h-7 sm:w-8 sm:h-8" />
                  )}
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-foreground">
                  {selectedStudentId === 'broadcast'
                    ? 'Nova Mensagem em Massa'
                    : 'Nenhuma mensagem neste canal'}
                </h4>
                <p className="text-[11px] sm:text-xs text-muted max-w-sm">
                  {selectedStudentId === 'broadcast'
                    ? 'Escreva uma mensagem que será enviada individualmente para todos os alunos selecionados.'
                    : currentUserRole === 'teacher'
                    ? `Envie uma mensagem para ${activeStudent?.fullName || 'o aluno'} orientando sobre trabalhos, prazos ou feedbacks.`
                    : studentRecipient === 'segundo'
                    ? 'Envie sua mensagem ou dúvida diretamente para o 2º Professor da sua turma.'
                    : 'Escreva sua dúvida abaixo para enviar diretamente ao Professor Regente.'}
                </p>
              </div>
            ) : (
              activeThreadMessages.map((msg) => {
                const isSecChannel = isSecondTeacherChannelMessage(msg);

                // Determina se o balão deve ficar à direita (enviado pelo próprio usuário logado)
                const isMine =
                  currentUserRole === 'student'
                    ? msg.senderRole === 'student'
                    : isSecondTeacher
                    ? msg.senderRole !== 'student' && isSecChannel
                    : msg.senderRole !== 'student' && !isSecChannel;

                // Mensagem enviada pelo 2º Professor sendo observada pelo Professor Titular
                const isObservedSecondTeacherReply =
                  currentUserRole === 'teacher' && !isSecondTeacher && msg.senderRole !== 'student' && isSecChannel;

                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2 sm:gap-2.5 max-w-[88%] sm:max-w-[75%] ${
                      isMine || isObservedSecondTeacherReply ? 'ml-auto flex-row-reverse' : 'mr-auto'
                    }`}
                  >
                    {!isMine && !isObservedSecondTeacherReply && (
                      <img
                        src={
                          formatAvatarUrl(msg.senderAvatar) ||
                          (msg.senderRole === 'teacher'
                            ? formatAvatarUrl(teacher.avatarUrl)
                            : formatAvatarUrl(activeStudent?.avatarUrl))
                        }
                        alt={msg.senderName}
                        loading="lazy"
                        decoding="async"
                        className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover border border-border shrink-0 mb-1"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            msg.senderRole === 'teacher'
                              ? 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=250'
                              : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200';
                        }}
                      />
                    )}

                    <div className="space-y-1 min-w-0 flex-1">
                      <div
                        className={`p-3 sm:p-4 rounded-2xl text-xs leading-relaxed shadow-lg break-words overflow-hidden ${
                          isObservedSecondTeacherReply
                            ? 'bg-amber-500/15 text-foreground rounded-br-none border border-amber-400/40'
                            : isMine
                            ? 'bg-[#115e33] text-foreground rounded-br-none border border-primary/30'
                            : 'bg-surface text-foreground rounded-bl-none border border-border'
                        }`}
                      >
                        {/* Selo de Identificação de Canal do 2º Professor */}
                        {isSecChannel && (
                          <div className="mb-2 flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-400/20 text-amber-400 border border-amber-400/30">
                              {!isSecondTeacher && currentUserRole === 'teacher' && (
                                <Eye className="w-3 h-3 shrink-0" />
                              )}
                              <span>
                                {msg.senderRole === 'student'
                                  ? `Aluno → ${msg.recipientName || '2º Professor'}`
                                  : `De: ${msg.senderName || '2º Professor'}`}
                              </span>
                            </span>
                          </div>
                        )}

                        {msg.activityTitle && (
                          <div className="mb-2.5 p-2 sm:p-2.5 bg-black/20 rounded-xl border border-border flex items-center gap-2 text-[11px] text-primary font-semibold">
                            <FileText className="w-4 h-4 shrink-0" />
                            <span className="truncate">Ref: {msg.activityTitle}</span>
                          </div>
                        )}

                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      </div>

                      <div
                        className={`flex items-center gap-1.5 text-[10px] text-[#869486] ${
                          isMine || isObservedSecondTeacherReply ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <span>{msg.createdAt}</span>
                        {(isMine || isObservedSecondTeacherReply) &&
                          (msg.read ? (
                            <span title="Lida">
                              <CheckCheck className="w-3.5 h-3.5 text-primary" />
                            </span>
                          ) : (
                            <span title="Enviada">
                              <Check className="w-3.5 h-3.5 text-[#869486]" />
                            </span>
                          ))}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Quick Suggestion Chips */}
          <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-[#0c1424] border-t border-border flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar shrink-0 w-full touch-pan-x">
            <span className="text-[10px] font-bold text-[#869486] shrink-0 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-primary shrink-0" />
              <span className="hidden sm:inline">Sugestões:</span>
            </span>
            {quickPrompts.map((promptText, idx) => (
              <button
                key={idx}
                onClick={() => setNewMessageText(promptText)}
                className="px-2.5 sm:px-3 py-1 rounded-full bg-surface hover:bg-[#1f2b47] text-foreground text-[10px] sm:text-[11px] border border-border whitespace-nowrap transition-colors cursor-pointer shrink-0"
              >
                {promptText}
              </button>
            ))}
          </div>

          {/* Attached Activity Selector */}
          {isAttachingActivity && (
            <div className="p-2.5 sm:p-3 bg-surface border-t border-border flex items-center justify-between gap-2 animate-fadeIn shrink-0">
              <div className="flex items-center gap-2 text-xs text-foreground min-w-0 flex-1">
                <FileText className="w-4 h-4 text-primary shrink-0" />
                <span className="font-bold text-xs truncate shrink-0">Atividade:</span>
                <select
                  value={attachedActivityId}
                  onChange={(e) => setAttachedActivityId(e.target.value)}
                  className="bg-surface border border-white/15 rounded-xl px-2.5 py-1 text-xs text-foreground focus:outline-none min-w-0 flex-1 truncate"
                >
                  <option value="">Selecione uma atividade...</option>
                  {activities.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title} ({a.turma})
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => {
                  setIsAttachingActivity(false);
                  setAttachedActivityId('');
                }}
                className="text-muted hover:text-foreground p-1 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Chat Message Input Bar */}
          <form
            onSubmit={handleSend}
            className="p-2 sm:p-3.5 bg-surface border-t border-border flex items-center gap-1.5 sm:gap-2.5 shrink-0 w-full min-w-0"
          >
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <img
                src={
                  currentUserRole === 'teacher'
                    ? formatAvatarUrl(teacher.avatarUrl)
                    : formatAvatarUrl(student?.avatarUrl)
                }
                alt={
                  currentUserRole === 'teacher'
                    ? teacher.name || 'Professor'
                    : student?.fullName || 'Aluno'
                }
                className="w-7 h-7 sm:w-9 sm:h-9 rounded-full object-cover border border-primary/40 shrink-0 shadow-sm"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    currentUserRole === 'teacher'
                      ? 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=250'
                      : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200';
                }}
              />
            </div>

            <button
              type="button"
              onClick={() => setIsAttachingActivity(!isAttachingActivity)}
              className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border transition-colors cursor-pointer min-h-[38px] min-w-[38px] sm:min-h-[44px] sm:min-w-[44px] flex items-center justify-center shrink-0 ${
                attachedActivityId
                  ? 'bg-primary/20 text-primary border-primary/40'
                  : 'bg-surface hover:bg-[#1a253e] text-muted border-border'
              }`}
              title="Vincular atividade à mensagem"
            >
              <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <input
              type="text"
              value={newMessageText}
              onChange={(e) => setNewMessageText(e.target.value)}
              placeholder={
                selectedStudentId === 'broadcast'
                  ? 'Escrever mensagem para a turma...'
                  : currentUserRole === 'teacher'
                  ? `Escrever para ${
                      activeStudent?.fullName ? activeStudent.fullName.split(' ')[0] : 'o aluno'
                    }...`
                  : studentRecipient === 'segundo'
                  ? 'Escrever mensagem para o 2º Professor...'
                  : 'Escrever sua dúvida para o Prof. Regente...'
              }
              className="flex-1 min-w-0 bg-surface border border-border rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2 sm:py-3 text-xs text-foreground placeholder-[#869486] focus:outline-none focus:border-primary leading-relaxed min-h-[38px] sm:min-h-[44px]"
            />

            {/* Botão IA Gilson apenas para o Professor Titular */}
            {currentUserRole === 'teacher' && !isSecondTeacher && selectedStudentId !== 'broadcast' && (
              <button
                type="button"
                onClick={handleGenerateAiTeacherDraft}
                disabled={isGeneratingAiDraft}
                className="px-2.5 sm:px-3 py-2 sm:py-3 bg-purple-100 hover:bg-purple-500/30 text-purple-600 border border-purple-200 rounded-xl sm:rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 min-h-[38px] sm:min-h-[44px]"
                title="Pedir para a IA do Prof. Gilson redigir uma resposta pedagógica"
              >
                {isGeneratingAiDraft ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                    <span className="hidden lg:inline text-[11px]">Gerando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span className="hidden lg:inline text-[11px]">IA Gilson</span>
                  </>
                )}
              </button>
            )}

            <button
              type="submit"
              disabled={!newMessageText.trim() || isGeneratingAiDraft}
              className="px-3 sm:px-5 py-2 sm:py-3 bg-primary hover:bg-[#6bfb9a] disabled:opacity-40 disabled:hover:bg-primary text-white font-extrabold rounded-xl sm:rounded-2xl text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5 shrink-0 min-h-[38px] sm:min-h-[44px]"
            >
              <Send className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Enviar</span>
            </button>
          </form>
        </div>
      </div>

      {/* POPUP MODAL DE FILTROS DE MENSAGENS */}
      {isFilterPopupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel w-full max-w-md rounded-3xl border border-border p-6 space-y-5 relative bg-surface shadow-2xl">
            <button
              type="button"
              onClick={() => setIsFilterPopupOpen(false)}
              className="absolute top-4 right-4 text-muted hover:text-foreground p-2 rounded-full hover:bg-surface-hover transition-colors cursor-pointer"
              aria-label="Fechar filtros"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-border pb-3.5">
              <div className="p-2.5 bg-primary/15 text-primary rounded-2xl border border-primary/30">
                <Filter className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Filtrar Conversas</h3>
                <p className="text-[11px] text-muted">
                  Selecione um aluno para iniciar conversa ou filtre por turma e leitura
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              {/* 1. Filtro por Aluno */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-primary" />
                  <span>Selecionar Aluno (ou Iniciar Nova Conversa)</span>
                </label>
                <select
                  value={selectedStudentFilter}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedStudentFilter(val);
                    if (val !== 'Todos') {
                      setSelectedStudentId(val);
                    }
                  }}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="Todos">Todos os Alunos com Mensagens</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.turma})
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Filtro por Turma */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-primary" />
                  <span>Filtro por Turma</span>
                </label>
                <select
                  value={selectedTurmaFilter}
                  onChange={(e) => setSelectedTurmaFilter(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="Todas">Todas as Turmas</option>
                  {availableTurmas.map((t) => (
                    <option key={t} value={t}>
                      Turma {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Status de Leitura */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-primary" />
                  <span>Status de Leitura</span>
                </label>
                <select
                  value={readStatusFilter}
                  onChange={(e) =>
                    setReadStatusFilter(e.target.value as 'todas' | 'nao_lidas' | 'lidas')
                  }
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="todas">Todas as Mensagens</option>
                  <option value="nao_lidas">Apenas Não Lidas ({totalUnreadThreads})</option>
                  <option value="lidas">Apenas Lidas</option>
                </select>
              </div>

              {/* 4. Filtro de Canal (Exclusivo Professor Titular / Supervisão) */}
              {!isSecondTeacher && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                    <span>Canal de Atendimento / Supervisão</span>
                  </label>
                  <select
                    value={channelScopeFilter}
                    onChange={(e) =>
                      setChannelScopeFilter(e.target.value as 'todos' | 'titular' | 'segundo')
                    }
                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="todos">Todos os Canais (Titular + 2º Professor)</option>
                    <option value="titular">Apenas Meu Canal (Professor Titular)</option>
                    <option value="segundo">Apenas Canal do 2º Professor (Supervisão)</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedStudentFilter('Todos');
                  setSelectedTurmaFilter('Todas');
                  setReadStatusFilter('todas');
                  setChannelScopeFilter('todos');
                }}
                className="flex-1 py-2.5 rounded-xl border border-border bg-background hover:bg-surface-hover text-xs font-bold text-muted hover:text-foreground transition-all cursor-pointer"
              >
                Limpar Tudo
              </button>
              <button
                type="button"
                onClick={() => setIsFilterPopupOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-[#6bfb9a] text-white text-xs font-extrabold shadow-md transition-all cursor-pointer"
              >
                Aplicar Filtros
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesView;

