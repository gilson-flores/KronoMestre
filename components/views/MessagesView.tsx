'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Search,
  User,
  Check,
  CheckCheck,
  Paperclip,
  ArrowLeft,
  Sparkles,
  Filter,
  FileText,
  Clock,
  Shield,
  Smile,
  X,
  Users,
  Bell,
  BellRing,
  Bot,
  Loader2,
  Volume2
} from 'lucide-react';
import { ChatMessage, StudentUser, TeacherUser, Activity } from '@/lib/types';
import { formatAvatarUrl } from '@/lib/utils';
import {
  getNotificationPermission,
  requestNotificationPermission,
  isNotificationSupported,
  playNotificationSound,
  sendBrowserNotification
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

export const MessagesView: React.FC<MessagesViewProps> = ({
  isSecondTeacher,
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

  // Mobile navigation state (true = viewing conversation, false = viewing thread list)
  const [isMobileChatOpen, setIsMobileChatOpen] = useState<boolean>(false);

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

  // Filters
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>('Todos');
  const [selectedTurmaFilter, setSelectedTurmaFilter] = useState<string>('Todas');
  const [readStatusFilter, setReadStatusFilter] = useState<'todas' | 'nao_lidas' | 'lidas'>('todas');

  // Recipient selection for Student
  const [studentRecipient, setStudentRecipient] = useState<'titular' | 'segundo'>('titular');

  // New message form state
  const [newMessageText, setNewMessageText] = useState('');
  const [attachedActivityId, setAttachedActivityId] = useState<string>('');
  const [isAttachingActivity, setIsAttachingActivity] = useState(false);
  const [broadcastTurma, setBroadcastTurma] = useState<string>('Todas');

  // Ref for chat auto-scroll
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Get active student object for the selected thread
  const activeStudent = selectedStudentId === 'broadcast' ? null : (students.find((s) => s.id === selectedStudentId) ||
    (currentUserRole === 'student' && student ? student : students[0]));

  // Current Thread ID is student.id
  const activeThreadId = selectedStudentId === 'broadcast' ? 'broadcast' : (currentUserRole === 'student'
    ? (student?.id || 'default-thread')
    : (selectedStudentId || (students.length > 0 ? students[0].id : 'default-thread')));

  // Filter messages for active thread
  const activeThreadMessages = messages.filter(
    (m) => m.threadId === activeThreadId || (m.senderId === activeThreadId || m.recipientId === activeThreadId)
  );

  // Auto-scroll to bottom of chat when new message arrives or thread changes
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThreadMessages.length, selectedStudentId]);

  // Mark thread as read when selected or when new messages arrive
  useEffect(() => {
    if (onMarkThreadAsRead && activeThreadId) {
      onMarkThreadAsRead(activeThreadId, currentUserRole);
    }
  }, [activeThreadId, currentUserRole, onMarkThreadAsRead, messages]);

  // Calculate unique turmas for filter dropdown
  const availableTurmas = Array.from(new Set(students.map((s) => s.turma))).filter(Boolean);

  // Calculate total threads with unread messages
  const totalUnreadThreads = students.filter((s) => {
    const stMessages = messages.filter(
      (m) => m.threadId === s.id || m.senderId === s.id || m.recipientId === s.id
    );
    return stMessages.some((m) => m.senderRole === 'student' && !m.read);
  }).length;

  // Filter students for the sidebar conversation list:
  // ONLY show students who have messages sent/received, OR who are explicitly chosen in the student filter
  const filteredStudents = students.filter((s) => {
    const stMessages = messages.filter(
      (m) => m.threadId === s.id || m.senderId === s.id || m.recipientId === s.id
    );
    const hasMessages = stMessages.length > 0;
    const isExplicitlySelected = selectedStudentFilter !== 'Todos' && s.id === selectedStudentFilter;

    // Rule 1: Only show students with messages sent/received (or explicitly chosen to message)
    if (!hasMessages && !isExplicitlySelected) {
      return false;
    }

    // Rule 2: Filter by Student
    const matchesStudent = selectedStudentFilter === 'Todos' || s.id === selectedStudentFilter;

    // Rule 3: Filter by Turma
    const matchesTurma = selectedTurmaFilter === 'Todas' || s.turma === selectedTurmaFilter;

    // Rule 4: Filter by Read/Unread Status
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

    if (currentUserRole === 'teacher' && selectedStudentId === 'broadcast') {
      const targetStudents = students.filter(s => broadcastTurma === 'Todas' || s.turma === broadcastTurma);
      for (const st of targetStudents) {
        onSendMessage({
          threadId: st.id,
          senderId: teacher.id || 'teacher-1',
          senderName: teacher.name || 'Professor',
          senderRole: 'teacher',
          senderAvatar: teacher.avatarUrl,
          recipientId: st.id,
          recipientName: st.fullName || 'Aluno',
          content: newMessageText.trim(),
          activityId: selectedActObj?.id,
          activityTitle: selectedActObj?.title,
        });
        await new Promise(r => setTimeout(r, 10)); // Ensure unique timestamp IDs
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
      sndId = teacher.id || 'teacher-1';
      sndName = teacher.name || 'Professor';
      sndAvatar = teacher.avatarUrl;
      recId = activeStudent?.id || 'std-1';
      recName = activeStudent?.fullName || 'Aluno';
    } else {
      sndId = student?.id || 'std-1';
      sndName = student?.fullName || 'Aluno';
      sndAvatar = student?.avatarUrl;
      
      if (studentRecipient === 'segundo') {
        recId = 'second-teacher';
        recName = '2º Professor (Inclusão)';
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

  // Quick suggestion prompts for teacher and student
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
      const lastStudentMsg = [...activeThreadMessages].reverse().find(m => m.senderRole === 'student');
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
          currentMessage: lastStudentMsg ? lastStudentMsg.content : (newMessageText || 'Como posso ajudar você hoje nas aulas de Sociologia?'),
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
              <span className="text-[10px] sm:text-xs font-semibold text-muted truncate">Sociologia On-line • Comunicação Direta</span>
            </div>
            <h1 className="text-lg sm:text-2xl font-extrabold text-foreground mt-1 truncate">
              {currentUserRole === 'teacher' ? 'Central de Mensagens e Atendimento' : 'Atendimento com o Prof. Gilson'}
            </h1>
            <p className="text-[11px] sm:text-xs text-muted mt-0.5 line-clamp-2 sm:line-clamp-none">
              {currentUserRole === 'teacher'
                ? 'Tire dúvidas, envie feedbacks individuais e acompanhe respostas automáticas com IA.'
                : 'Tire dúvidas conceituais, consulte prazos de atividades e receba orientações pedagógicas em tempo real.'}
            </p>
          </div>
        </div>

        {/* Action Controls in Header: Notifications & AI Auto-Reply */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap self-start md:self-auto">
          {/* Notification Button */}
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

          {/* Teacher AI Auto-Reply Toggle */}
          {currentUserRole === 'teacher' && onToggleAiAutoReply && (
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
            {/* Teacher Sidebar Header */}
            <div className="p-3 sm:p-4 border-b border-border space-y-2.5 bg-surface/60 shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  <span>Conversas ({students.length})</span>
                </h3>
                <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">
                  Ativas
                </span>
              </div>

              {!isSecondTeacher && (<>
{/* Filtros: Aluno, Turma e Status */}
              <div className="space-y-2">
                {/* 1. Filtro por Aluno */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#869486] uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3 h-3 text-primary" />
                    <span>Filtro por Aluno</span>
                  </label>
                  <select
                    value={selectedStudentFilter}
                    onChange={(e) => setSelectedStudentFilter(e.target.value)}
                    className="w-full bg-surface border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="Todos" className="bg-surface text-foreground">
                      Todos os Alunos com Mensagens
                    </option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id} className="bg-surface text-foreground">
                        {s.fullName} ({s.turma})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Filtro por Turma */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#869486] uppercase tracking-wider flex items-center gap-1.5">
                    <Filter className="w-3 h-3 text-primary" />
                    <span>Filtro por Turma</span>
                  </label>
                  <select
                    value={selectedTurmaFilter}
                    onChange={(e) => setSelectedTurmaFilter(e.target.value)}
                    className="w-full bg-surface border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="Todas" className="bg-surface text-foreground">
                      Todas as Turmas
                    </option>
                    {availableTurmas.map((t) => (
                      <option key={t} value={t} className="bg-surface text-foreground">
                        Turma {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Filtro por Lidas / Não Lidas */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#869486] uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="w-3 h-3 text-primary" />
                    <span>Status de Leitura</span>
                  </label>
                  <select
                    value={readStatusFilter}
                    onChange={(e) => setReadStatusFilter(e.target.value as 'todas' | 'nao_lidas' | 'lidas')}
                    className="w-full bg-surface border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="todas" className="bg-surface text-foreground">
                      Todas as Mensagens
                    </option>
                    <option value="nao_lidas" className="bg-surface text-primary">
                      Apenas Não Lidas ({totalUnreadThreads})
                    </option>
                    <option value="lidas" className="bg-surface text-foreground">
                      Apenas Lidas
                    </option>
                  </select>
                </div>
              </div>
            </>)}
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
                    <h4 className={`text-xs font-bold truncate ${selectedStudentId === 'broadcast' ? 'text-foreground' : 'text-foreground'}`}>
                      Mensagem para Turma
                    </h4>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-muted mt-0.5 truncate">
                    Enviar para múltiplos alunos
                  </p>
                </div>
              </button>

              {filteredStudents.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted space-y-2">
                  <p>Nenhuma mensagem ou conversa encontrada para os filtros selecionados.</p>
                  {(selectedStudentFilter !== 'Todos' || selectedTurmaFilter !== 'Todas' || readStatusFilter !== 'todas') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStudentFilter('Todos');
                        setSelectedTurmaFilter('Todas');
                        setReadStatusFilter('todas');
                      }}
                      className="text-primary underline font-semibold text-xs hover:text-[#6bfb9a] cursor-pointer"
                    >
                      Limpar Filtros
                    </button>
                  )}
                </div>
              ) : (
                filteredStudents.map((st) => {
                  const isSelected = st.id === selectedStudentId;
                  const stMessages = messages.filter(
                    (m) => m.threadId === st.id || m.senderId === st.id || m.recipientId === st.id
                  );
                  const lastMsg = stMessages[stMessages.length - 1];
                  const unreadCount = stMessages.filter((m) => m.senderRole === 'student' && !m.read).length;

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
                          <h4 className="text-xs font-bold text-foreground truncate">
                            {st.fullName}
                          </h4>
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
              {/* Back button for mobile view */}
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
                        <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">Mensagem para Turma</h3>
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
                          {availableTurmas.map(t => (
                            <option key={t} value={t}>{t} ({students.filter(s => s.turma === t).length} alunos)</option>
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
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200';
                      }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">{activeStudent.fullName}</h3>
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
                        {studentRecipient === 'segundo' ? 'Mensagem para o 2º Professor (Inclusão / AEE)' : 'Mensagem para o Professor Regente (Sociologia)'}
                      </p>
                    </div>
                  </div>

                  {/* Student Recipient Toggle */}
                  <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-border shrink-0 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setStudentRecipient('titular')}
                      className={`px-2 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
                        studentRecipient === 'titular'
                          ? 'bg-primary text-white shadow'
                          : 'text-muted hover:text-foreground'
                      }`}
                    >
                      Prof. Regente
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudentRecipient('segundo')}
                      className={`px-2 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
                        studentRecipient === 'segundo'
                          ? 'bg-amber-400 text-amber-950 shadow'
                          : 'text-muted hover:text-foreground'
                      }`}
                    >
                      2º Professor
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
                  {selectedStudentId === 'broadcast' ? <Users className="w-7 h-7 sm:w-8 sm:h-8" /> : <MessageSquare className="w-7 h-7 sm:w-8 sm:h-8" />}
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-foreground">
                  {selectedStudentId === 'broadcast' ? 'Nova Mensagem em Massa' : 'Nenhuma mensagem nesta conversa'}
                </h4>
                <p className="text-[11px] sm:text-xs text-muted max-w-sm">
                  {selectedStudentId === 'broadcast'
                    ? 'Escreva uma mensagem que será enviada individualmente para todos os alunos selecionados.'
                    : currentUserRole === 'teacher'
                    ? `Envie uma mensagem para ${activeStudent?.fullName || 'o aluno'} orientando sobre trabalhos, prazos ou feedbacks.`
                    : 'Escreva sua dúvida abaixo para enviar diretamente ao seu professor.'}
                </p>
              </div>
            ) : (
              activeThreadMessages.map((msg) => {
                const isMine =
                  (currentUserRole === 'teacher' && msg.senderRole === 'teacher') ||
                  (currentUserRole === 'student' && msg.senderRole === 'student');

                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2 sm:gap-2.5 max-w-[88%] sm:max-w-[75%] ${
                      isMine ? 'ml-auto flex-row-reverse' : 'mr-auto'
                    }`}
                  >
                    {!isMine && (
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
                      {/* Message Bubble */}
                      <div
                        className={`p-3 sm:p-4 rounded-2xl text-xs sm:text-xs leading-relaxed shadow-lg break-words overflow-hidden ${
                          isMine
                            ? 'bg-[#115e33] text-foreground rounded-br-none border border-primary/30'
                            : 'bg-surface text-foreground rounded-bl-none border border-border'
                        }`}
                      >
                        {/* 2º Professor Tag */}
                        {(msg.recipientId === 'second-teacher' || msg.recipientName?.includes('2º Professor')) && (
                          <div className="mb-2">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-400/20 text-amber-600 border border-amber-400/30">
                              Para: 2º Professor (Inclusão)
                            </span>
                          </div>
                        )}
                        {msg.senderName?.includes('2º Professor') && (
                          <div className="mb-2">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-400/20 text-amber-600 border border-amber-400/30">
                              De: 2º Professor (Inclusão)
                            </span>
                          </div>
                        )}

                        {/* Linked Activity Card inside Message */}
                        {msg.activityTitle && (
                          <div className="mb-2.5 p-2 sm:p-2.5 bg-black/20 rounded-xl border border-border flex items-center gap-2 text-[11px] text-primary font-semibold">
                            <FileText className="w-4 h-4 shrink-0" />
                            <span className="truncate">Ref: {msg.activityTitle}</span>
                          </div>
                        )}

                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      </div>

                      {/* Timestamp & Read Checkmarks */}
                      <div
                        className={`flex items-center gap-1.5 text-[10px] text-[#869486] ${
                          isMine ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <span>{msg.createdAt}</span>
                        {isMine && (
                          msg.read ? (
                            <span title="Lida"><CheckCheck className="w-3.5 h-3.5 text-primary" /></span>
                          ) : (
                            <span title="Enviada"><Check className="w-3.5 h-3.5 text-[#869486]" /></span>
                          )
                        )}
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

          {/* Attached Activity Selector (if user clicked clip) */}
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
            {/* Fixed Sender Avatar outside input box */}
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <img
                src={
                  currentUserRole === 'teacher'
                    ? formatAvatarUrl(teacher.avatarUrl)
                    : formatAvatarUrl(student?.avatarUrl)
                }
                alt={currentUserRole === 'teacher' ? (teacher.name || 'Professor') : (student?.fullName || 'Aluno')}
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
                  ? `Escrever para ${activeStudent?.fullName ? activeStudent.fullName.split(' ')[0] : 'o aluno'}...`
                  : 'Escrever sua dúvida para o Prof. Gilson...'
              }
              className="flex-1 min-w-0 bg-surface border border-border rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2 sm:py-3 text-xs text-foreground placeholder-[#869486] focus:outline-none focus:border-primary leading-relaxed min-h-[38px] sm:min-h-[44px]"
            />

            {/* Teacher AI Draft Assistant Button */}
            {currentUserRole === 'teacher' && selectedStudentId !== 'broadcast' && (
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
    </div>
  );
};

export default MessagesView;

