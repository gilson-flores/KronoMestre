'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Send,
  User,
  ArrowLeft,
  Shield,
  Users,
  Bot,
  Loader2,
  RefreshCw,
  Search,
  CheckCircle2,
  Layers,
  Globe
} from 'lucide-react';
import { ChatMessage, StudentUser, TeacherUser, Activity } from '@/lib/types';

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

export const BOBY_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNTYgMjU2Ij4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iYm9iQmciIHgxPSIwIiB5MT0iMCIgeDI9IjI1NiIgeTI9IjI1NiI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiMwZjE3MmEiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjMWUzYThhIi8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJib2JCb2R5IiB4MT0iMCIgeTE9IjQwIiB4Mj0iMCIgeTI9IjIyMCI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNmOGZhZmMiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjY2JkNWUxIi8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogIDwvZGVmcz4KICA8cmVjdCB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgcng9IjY0IiBmaWxsPSJ1cmwoI2JvYkJnKSIvPgogIDxsaW5lIHgxPSIxMjgiIHkxPSIyOCIgeDI9IjEyOCIgeTI9IjU4IiBzdHJva2U9IiMzOGJkZjgiIHN0cm9rZS13aWR0aD0iOCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CiAgPGNpcmNsZSBjeD0iMTI4IiBjeT0iMjQiIHI9IjEyIiBmaWxsPSIjMjJkM2VlIi8+CiAgPHJlY3QgeD0iMzYiIHk9IjEwNiIgd2lkdGg9IjE2IiBoZWlnaHQ9IjQ0IiByeD0iOCIgZmlsbD0iIzM4YmRmOCIvPgogIDxyZWN0IHg9IjIwNCIgeT0iMTA2IiB3aWR0aD0iMTYiIGhlaWdodD0iNDQiIHJ4PSI4IiBmaWxsPSIjMzhiZGY4Ii8+CiAgPHJlY3QgeD0iNTIiIHk9IjU4IiB3aWR0aD0iMTUyIiBoZWlnaHQ9IjE0MCIgcng9IjQyIiBmaWxsPSJ1cmwoI2JvYkJvZHkpIiBzdHJva2U9IiMzOGJkZjgiIHN0cm9rZS13aWR0aD0iNiIvPgogIDxyZWN0IHg9IjcwIiB5PSI4MiIgd2lkdGg9IjExNiIgaGVpZ2h0PSI2OCIgcng9IjI0IiBmaWxsPSIjMGYxNzJhIiBzdHJva2U9IiMwMjg0YzciIHN0cm9rZS13aWR0aD0iNCIvPgogIDxjaXJjbGUgY3g9IjEwMiIgY3k9IjExNiIgcj0iMTIiIGZpbGw9IiMyMmQzZWUiLz4KICA8Y2lyY2xlIGN4PSIxMDYiIGN5PSIxMTIiIHI9IjQiIGZpbGw9IiNmZmZmZmYiLz4KICA8Y2lyY2xlIGN4PSIxNTQiIGN5PSIxMTYiIHI9IjEyIiBmaWxsPSIjMjJkM2VlIi8+CiAgPGNpcmNsZSBjeD0iMTU4IiBjeT0iMTEyIiByPSI0IiBmaWxsPSIjZmZmZmZmIi8+CiAgPHBhdGggZD0iTSAxMDIgMTcwIFEgMTI4IDE4OCAxNTQgMTcwIiBmaWxsPSJub25lIiBzdHJva2U9IiMwMjg0YzciIHN0cm9rZS13aWR0aD0iNyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CiAgPGNpcmNsZSBjeD0iODQiIGN5PSIxNjgiIHI9IjYiIGZpbGw9IiMzOGJkZjgiIG9wYWNpdHk9IjAuNiIvPgogIDxjaXJjbGUgY3g9IjE3MiIgY3k9IjE2OCIgcj0iNiIgZmlsbD0iIzM4YmRmOCIgb3BhY2l0eT0iMC42Ii8+Cjwvc3ZnPg==';

const isSecondTeacherChannelMessage = (msg: ChatMessage): boolean => {
  const sId = (msg.senderId ? msg.senderId : '').toLowerCase();
  const rId = (msg.recipientId ? msg.recipientId : '').toLowerCase();
  const sName = (msg.senderName ? msg.senderName : '').toLowerCase();
  const rName = (msg.recipientName ? msg.recipientName : '').toLowerCase();
  const role = (msg.senderRole as string) ? (msg.senderRole as string) : '';

  return (
    role === 'second_teacher' ||
    sId === 'second-teacher' ||
    rId === 'second-teacher' ||
    sId.startsWith('st_') ||
    rId.startsWith('st_') ||
    sName.includes('2º professor') ||
    rName.includes('2º professor')
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
  // Modos de envio do Professor: 'student' (1 aluno), 'single_turma' (1 turma), 'multi_turmas' (várias turmas), 'all_students' (todos)
  const [targetScopeMode, setTargetScopeMode] = useState<'student' | 'single_turma' | 'multi_turmas' | 'all_students'>('student');

  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    if (currentUserRole === 'student' && student) return student.id;
    return students.length > 0 ? students[0].id : '';
  });

  const [isMobileChatOpen, setIsMobileChatOpen] = useState<boolean>(false);
  const [isGeneratingAiDraft, setIsGeneratingAiDraft] = useState(false);
  const [isBobyMode, setIsBobyMode] = useState(false);

  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');
  const [selectedTurmaFilter, setSelectedTurmaFilter] = useState<string>('Todas');
  const [readStatusFilter, setReadStatusFilter] = useState<'todas' | 'nao_lidas'>('todas');
  const [channelScopeFilter] = useState<'todos' | 'titular' | 'segundo'>('todos');
  const [studentRecipient, setStudentRecipient] = useState<'titular' | 'segundo'>('titular');
  const [newMessageText, setNewMessageText] = useState('');
  const [attachedActivityId, setAttachedActivityId] = useState<string>('');

  // Estados para disparo por Turma / Turmas / Todos
  const turmasList = useMemo(() => {
    const set = new Set<string>();
    (students || []).forEach((s) => {
      if (!s.isArchived && s.turma && s.turma.trim()) set.add(s.turma.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [students]);

  const [singleTargetTurma, setSingleTargetTurma] = useState<string>(() => turmasList[0] || '');
  const [multiTargetTurmas, setMultiTargetTurmas] = useState<string[]>([]);
  const [broadcastFeedback, setBroadcastFeedback] = useState<string | null>(null);
  const [isSendingBroadcast, setIsSendingBroadcast] = useState<boolean>(false);

  useEffect(() => {
    if (!singleTargetTurma && turmasList.length > 0) {
      setSingleTargetTurma(turmasList[0]);
    }
  }, [turmasList, singleTargetTurma]);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  const isMessageVisibleInCurrentContext = (msg: ChatMessage): boolean => {
    const isSecMsg = isSecondTeacherChannelMessage(msg);
    if (currentUserRole === 'teacher') {
      if (isSecondTeacher) {
        if (!isSecMsg) return false;
        const myId = (teacher.id ? teacher.id : '').trim().toLowerCase();
        const myName = (teacher.name ? teacher.name : '').trim().toLowerCase();
        const sId = (msg.senderId ? msg.senderId : '').trim().toLowerCase();
        const rId = (msg.recipientId ? msg.recipientId : '').trim().toLowerCase();
        const sName = (msg.senderName ? msg.senderName : '').trim().toLowerCase();
        return (
          rId === 'second-teacher' ||
          sId === 'second-teacher' ||
          (Boolean(myId) && (sId === myId || rId === myId)) ||
          (Boolean(myName) && sName.includes(myName))
        );
      } else {
        if (channelScopeFilter === 'titular') return !isSecMsg;
        if (channelScopeFilter === 'segundo') return isSecMsg;
        return true;
      }
    }
    if (studentRecipient === 'segundo') return isSecMsg;
    return !isSecMsg;
  };

  const activeStudent =
    targetScopeMode !== 'student'
      ? null
      : students.find((s) => s.id === selectedStudentId) ||
        (currentUserRole === 'student' && student ? student : students[0]);

  const activeThreadId =
    targetScopeMode !== 'student'
      ? 'broadcast'
      : currentUserRole === 'student'
      ? student?.id || 'default-thread'
      : selectedStudentId || (students.length > 0 ? students[0].id : 'default-thread');

  const activeThreadMessages = messages.filter((m) => {
    if (targetScopeMode !== 'student') return false;
    const belongsToStudent =
      m.threadId === activeThreadId ||
      m.senderId === activeThreadId ||
      m.recipientId === activeThreadId;
    if (!belongsToStudent) return false;
    return isMessageVisibleInCurrentContext(m);
  });

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThreadMessages.length, selectedStudentId, studentRecipient, targetScopeMode]);

  const hasUnreadInActiveThread = activeThreadMessages.some(
    (m) => m.senderRole !== currentUserRole && !m.read
  );

  useEffect(() => {
    if (onMarkThreadAsRead && activeThreadId && activeThreadId !== 'broadcast' && hasUnreadInActiveThread) {
      onMarkThreadAsRead(activeThreadId, currentUserRole);
    }
  }, [activeThreadId, currentUserRole, onMarkThreadAsRead, hasUnreadInActiveThread]);

  // Lista todos os alunos da escola (ordenando quem tem mensagens não lidas e conversas recentes no topo)
  const filteredStudents = useMemo(() => {
    const q = studentSearchQuery.trim().toLowerCase();
    return [...students]
      .filter((s) => {
        if (s.isArchived) return false;
        const matchesTurma = selectedTurmaFilter === 'Todas' || s.turma === selectedTurmaFilter;
        if (!matchesTurma) return false;

        const matchesSearch =
          !q ||
          s.fullName.toLowerCase().includes(q) ||
          String(s.matricula || '').toLowerCase().includes(q) ||
          String(s.turma || '').toLowerCase().includes(q);
        if (!matchesSearch) return false;

        if (readStatusFilter === 'nao_lidas') {
          const stMessages = messages.filter(
            (m) =>
              (m.threadId === s.id || m.senderId === s.id || m.recipientId === s.id) &&
              isMessageVisibleInCurrentContext(m)
          );
          return stMessages.some((m) => m.senderRole === 'student' && !m.read);
        }
        return true;
      })
      .sort((a, b) => {
        const aMsgs = messages.filter(
          (m) => (m.threadId === a.id || m.senderId === a.id || m.recipientId === a.id) && isMessageVisibleInCurrentContext(m)
        );
        const bMsgs = messages.filter(
          (m) => (m.threadId === b.id || m.senderId === b.id || m.recipientId === b.id) && isMessageVisibleInCurrentContext(m)
        );
        const aUnread = aMsgs.filter((m) => m.senderRole === 'student' && !m.read).length;
        const bUnread = bMsgs.filter((m) => m.senderRole === 'student' && !m.read).length;
        if (aUnread !== bUnread) return bUnread - aUnread;
        if (aMsgs.length !== bMsgs.length) return bMsgs.length - aMsgs.length;
        return a.fullName.localeCompare(b.fullName);
      });
  }, [students, studentSearchQuery, selectedTurmaFilter, readStatusFilter, messages]);

  // Alunos destinatários quando em modo Coletivo (1 Turma, Várias Turmas ou Todos)
  const collectiveTargetStudents = useMemo(() => {
    const activeRoster = students.filter((s) => !s.isArchived);
    if (targetScopeMode === 'single_turma') {
      return activeRoster.filter((s) => s.turma === singleTargetTurma);
    }
    if (targetScopeMode === 'multi_turmas') {
      return activeRoster.filter((s) => multiTargetTurmas.includes(s.turma));
    }
    if (targetScopeMode === 'all_students') {
      return activeRoster;
    }
    return [];
  }, [students, targetScopeMode, singleTargetTurma, multiTargetTurmas]);

  const handleSelectStudent = (stId: string) => {
    setTargetScopeMode('student');
    setSelectedStudentId(stId);
    setIsMobileChatOpen(true);
    setIsBobyMode(false);
  };

  const handleToggleMultiTurma = (turmaCode: string) => {
    setMultiTargetTurmas((prev) =>
      prev.includes(turmaCode) ? prev.filter((t) => t !== turmaCode) : [...prev, turmaCode]
    );
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessageText.trim()) return;

    const selectedActObj = activities.find((a) => a.id === attachedActivityId);

    const formattedTeacherSenderName = isSecondTeacher
      ? teacher.name?.toLowerCase().includes('2º professor')
        ? teacher.name
        : `${teacher.name ? teacher.name : 'Professor'} (2º Professor)`
      : teacher.name
      ? teacher.name
      : 'Professor';

    const formattedTeacherSenderId = isSecondTeacher
      ? teacher.id
        ? teacher.id
        : 'second-teacher'
      : teacher.id
      ? teacher.id
      : 'teacher-1';

    // Disparo para 1 Turma, Múltiplas Turmas ou Todos os Alunos
    if (currentUserRole === 'teacher' && targetScopeMode !== 'student') {
      if (collectiveTargetStudents.length === 0) {
        alert('Selecione pelo menos uma turma com alunos para enviar a mensagem.');
        return;
      }

      setIsSendingBroadcast(true);
      const textToSend = newMessageText.trim();
      const senderIdToUse = isBobyMode ? 'boby-assistant' : formattedTeacherSenderId;
      const senderNameToUse = isBobyMode ? 'Bob 🤖 (Agente de Atendimento)' : formattedTeacherSenderName;
      const senderAvatarToUse = isBobyMode ? BOBY_AVATAR : teacher.avatarUrl;

      for (const st of collectiveTargetStudents) {
        onSendMessage({
          threadId: st.id,
          senderId: senderIdToUse,
          senderName: senderNameToUse,
          senderRole: 'teacher',
          senderAvatar: senderAvatarToUse,
          recipientId: st.id,
          recipientName: st.fullName ? st.fullName : 'Aluno',
          content: textToSend,
          activityId: selectedActObj?.id,
          activityTitle: selectedActObj?.title,
        });
        await new Promise((r) => setTimeout(r, 15));
      }

      const scopeLabel =
        targetScopeMode === 'single_turma'
          ? `Turma ${singleTargetTurma}`
          : targetScopeMode === 'multi_turmas'
          ? `Turmas ${multiTargetTurmas.join(', ')}`
          : 'Todas as Turmas';

      setNewMessageText('');
      setAttachedActivityId('');
      setIsBobyMode(false);
      setIsSendingBroadcast(false);
      setBroadcastFeedback(`✅ Mensagem enviada com sucesso para ${collectiveTargetStudents.length} aluno(s) (${scopeLabel})!`);
      setTimeout(() => setBroadcastFeedback(null), 6000);
      return;
    }

    let recId = '';
    let recName = '';
    let sndId = '';
    let sndName = '';
    let sndAvatar: string | undefined = undefined;

    if (currentUserRole === 'teacher') {
      sndId = isBobyMode ? 'boby-assistant' : formattedTeacherSenderId;
      sndName = isBobyMode ? 'Bob 🤖 (Agente de Atendimento)' : formattedTeacherSenderName;
      sndAvatar = isBobyMode ? BOBY_AVATAR : teacher.avatarUrl;
      recId = activeStudent?.id ? activeStudent.id : 'std-1';
      recName = activeStudent?.fullName ? activeStudent.fullName : 'Aluno';
    } else {
      sndId = student?.id ? student.id : 'std-1';
      sndName = student?.fullName ? student.fullName : 'Aluno';
      sndAvatar = student?.avatarUrl;
      if (studentRecipient === 'segundo') {
        recId = 'second-teacher';
        recName = student?.secondTeacherName
          ? `${student.secondTeacherName} (2º Professor)`
          : '2º Professor (Inclusão)';
      } else {
        recId = teacher.id ? teacher.id : 'teacher-1';
        recName = teacher.name ? teacher.name : 'Prof. Regente';
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
    setIsBobyMode(false);
  };

  const handleGenerateAiTeacherDraft = async () => {
    if (isGeneratingAiDraft) return;
    setIsGeneratingAiDraft(true);

    try {
      const lastStudentMsg = [...activeThreadMessages].reverse().find((m) => m.senderRole === 'student');
      const res = await fetch('/api/gemini/teacher-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: activeStudent?.fullName ? activeStudent.fullName : 'Estudante',
          studentTurma: activeStudent?.turma ? activeStudent.turma : singleTargetTurma || 'Geral',
          activities,
          messages: activeThreadMessages,
          currentMessage: lastStudentMsg ? lastStudentMsg.content : 'Olá! Como o Bob pode ajudar?',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.reply) {
          setNewMessageText(data.reply);
          setIsBobyMode(true);
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
      <div className="glass-panel p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4 shadow-xl min-w-0">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="p-2.5 sm:p-3.5 bg-primary/10 text-primary rounded-2xl border border-primary/20 shrink-0">
            <MessageSquare className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] sm:text-xs font-bold text-primary uppercase tracking-wider bg-primary/10 px-2.5 sm:px-3 py-0.5 rounded-full border border-primary/20 shrink-0">
                Mensagens & Triagem Bob 🤖
              </span>
              <span className="text-[10px] sm:text-xs font-semibold text-muted truncate">
                KronoMestre • Comunicação Individual, por Turma ou Geral
              </span>
            </div>
            <h1 className="text-lg sm:text-2xl font-extrabold text-foreground mt-1 truncate">
              {currentUserRole === 'teacher'
                ? isSecondTeacher
                  ? 'Mensagens • 2º Professor'
                  : 'Central de Mensagens'
                : 'Atendimento'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap self-start md:self-auto">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-3 py-2 rounded-2xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm bg-surface text-muted border-border hover:text-foreground hover:bg-surface-hover"
            title="Atualizar mensagens"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sincronizar</span>
          </button>

          {currentUserRole === 'teacher' && !isSecondTeacher && onToggleAiAutoReply && (
            <button
              type="button"
              onClick={() => onToggleAiAutoReply(!isAiAutoReplyEnabled)}
              className={`px-3 py-2 rounded-2xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm ${
                isAiAutoReplyEnabled
                  ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/25'
                  : 'bg-surface text-muted border-border hover:text-foreground'
              }`}
              title="Ativar/Pausar triagem automática do Agente Bob"
            >
              <img src={BOBY_AVATAR} alt="Bob" className="w-4 h-4 rounded-full" />
              <span>Bob Auto: {isAiAutoReplyEnabled ? 'ON' : 'OFF'}</span>
            </button>
          )}

          <div className="bg-surface px-3 py-2 rounded-2xl border border-border flex items-center gap-2 text-xs text-foreground shrink-0">
            <Shield className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-[11px] font-medium hidden lg:inline">Canal Seguro</span>
          </div>
        </div>
      </div>

      {/* BARRA DE ESCOLHA DE DESTINATÁRIO DO PROFESSOR: ALUNO | 1 TURMA | VÁRIAS TURMAS | TODOS */}
      {currentUserRole === 'teacher' && (
        <div className="glass-panel p-3 sm:p-4 rounded-2xl border border-border bg-surface flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 shadow-md">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-muted mr-1">Enviar para:</span>
            <button
              type="button"
              onClick={() => setTargetScopeMode('student')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all border ${
                targetScopeMode === 'student'
                  ? 'bg-primary text-white border-primary shadow-md'
                  : 'bg-background text-muted border-border hover:text-foreground'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>1. Aluno Específico</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTargetScopeMode('single_turma');
                setIsMobileChatOpen(true);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all border ${
                targetScopeMode === 'single_turma'
                  ? 'bg-cyan-600 text-white border-cyan-400 shadow-md'
                  : 'bg-background text-muted border-border hover:text-foreground'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>2. Uma Turma</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTargetScopeMode('multi_turmas');
                setIsMobileChatOpen(true);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all border ${
                targetScopeMode === 'multi_turmas'
                  ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md'
                  : 'bg-background text-muted border-border hover:text-foreground'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>3. Várias Turmas</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTargetScopeMode('all_students');
                setIsMobileChatOpen(true);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all border ${
                targetScopeMode === 'all_students'
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-md'
                  : 'bg-background text-muted border-border hover:text-foreground'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>4. Todos os Alunos ({students.filter((s) => !s.isArchived).length})</span>
            </button>
          </div>

          {/* Seletor rápido de aluno direto no topo */}
          {targetScopeMode === 'student' && (
            <div className="flex items-center gap-2">
              <select
                value={selectedStudentId}
                onChange={(e) => {
                  if (e.target.value) handleSelectStudent(e.target.value);
                }}
                className="w-full sm:w-72 bg-background border border-border rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:border-primary"
              >
                <option value="">Escolher aluno rapidamente ({filteredStudents.length})...</option>
                {filteredStudents.map((st) => (
                  <option key={st.id} value={st.id}>
                    Turma {st.turma} • {st.fullName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {broadcastFeedback && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-400 text-emerald-200 text-xs font-bold flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{broadcastFeedback}</span>
          </div>
          <button onClick={() => setBroadcastFeedback(null)} className="text-emerald-200 hover:text-white">✕</button>
        </div>
      )}

      <div className="glass-panel rounded-2xl sm:rounded-3xl border border-border shadow-2xl overflow-hidden h-[calc(100vh-220px)] sm:h-[calc(100vh-250px)] min-h-[500px] max-h-[780px] flex flex-col md:flex-row relative w-full min-w-0">
        
        {/* Painel Esquerdo: Lista de Alunos com Busca e Filtro de Turma */}
        {currentUserRole === 'teacher' && (
          <div className={`w-full md:w-72 lg:w-80 xl:w-96 bg-[#0c1424] border-r border-border flex flex-col transition-all duration-300 h-full min-h-0 shrink-0 ${isMobileChatOpen ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-3 border-b border-border bg-surface/60 shrink-0 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <User className="w-4 h-4 text-primary shrink-0" />
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider truncate">
                    Alunos ({filteredStudents.length})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setReadStatusFilter((prev) => (prev === 'todas' ? 'nao_lidas' : 'todas'))}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer border ${
                    readStatusFilter === 'nao_lidas'
                      ? 'bg-primary/20 text-primary border-primary/40'
                      : 'bg-background text-muted border-border'
                  }`}
                >
                  {readStatusFilter === 'nao_lidas' ? '🔔 Só Não Lidas' : 'Todas'}
                </button>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  placeholder="Buscar aluno por nome ou turma..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                <button
                  type="button"
                  onClick={() => setSelectedTurmaFilter('Todas')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 cursor-pointer ${
                    selectedTurmaFilter === 'Todas'
                      ? 'bg-primary text-white'
                      : 'bg-background text-muted hover:text-foreground border border-border'
                  }`}
                >
                  Todas
                </button>
                {turmasList.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedTurmaFilter(t)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 cursor-pointer ${
                      selectedTurmaFilter === t
                        ? 'bg-primary text-white'
                        : 'bg-background text-muted hover:text-foreground border border-border'
                    }`}
                  >
                    Turma {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-white/5 min-h-0">
              {filteredStudents.map((st) => {
                const isSelected = targetScopeMode === 'student' && st.id === selectedStudentId;
                const stMessages = messages.filter(
                  (m) =>
                    (m.threadId === st.id || m.senderId === st.id || m.recipientId === st.id) &&
                    isMessageVisibleInCurrentContext(m)
                );
                const lastMsg = stMessages[stMessages.length - 1];
                const unreadCount = stMessages.filter((m) => m.senderRole === 'student' && !m.read).length;
                return (
                  <button
                    key={st.id}
                    onClick={() => handleSelectStudent(st.id)}
                    className={`w-full p-3 text-left flex items-start gap-3 cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#17233b] border-l-4 border-l-[#4ade80]' : 'hover:bg-surface-hover'
                    }`}
                  >
                    <img
                      src={st.avatarUrl || BOBY_AVATAR}
                      alt=""
                      className="w-9 h-9 rounded-full object-cover border border-border shrink-0 bg-slate-900"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-foreground truncate">{st.fullName}</h4>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 shrink-0">
                          {st.turma}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted truncate mt-1">
                        {lastMsg ? lastMsg.content : 'Clique para enviar mensagem...'}
                      </p>
                    </div>
                    {unreadCount > 0 && (
                      <span className="bg-primary text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Painel Direito */}
        <div className={`flex-1 bg-[#09101f] flex flex-col transition-all duration-300 min-w-0 h-full min-h-0 ${!isMobileChatOpen && currentUserRole === 'teacher' ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-3 sm:p-4 bg-surface border-b border-border flex items-center justify-between shrink-0 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {currentUserRole === 'teacher' && (
                <button
                  type="button"
                  onClick={() => setIsMobileChatOpen(false)}
                  className="md:hidden p-2 text-muted hover:text-foreground hover:bg-surface-hover rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer active:scale-95 transition-all"
                  aria-label="Voltar para a lista de conversas"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}

              {currentUserRole === 'teacher' ? (
                targetScopeMode === 'student' ? (
                  activeStudent ? (
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={activeStudent.avatarUrl || BOBY_AVATAR}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover border border-primary shrink-0 bg-slate-900"
                      />
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-foreground truncate">{activeStudent.fullName}</h3>
                        <span className="text-[10px] font-mono text-cyan-400 block">Turma {activeStudent.turma} • Conversa Individual</span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-muted">Selecione um aluno</span>
                  )
                ) : (
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-400 text-cyan-300 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-foreground truncate">
                        {targetScopeMode === 'single_turma'
                          ? `Disparo para a Turma ${singleTargetTurma} (${collectiveTargetStudents.length} alunos)`
                          : targetScopeMode === 'multi_turmas'
                          ? `Disparo para Várias Turmas (${collectiveTargetStudents.length} alunos selecionados)`
                          : `Comunicado para Todos os Alunos (${collectiveTargetStudents.length} alunos)`}
                      </h3>
                      <span className="text-[10px] text-muted block">
                        A mensagem será entregue individualmente no chat de cada aluno selecionado
                      </span>
                    </div>
                  </div>
                )
              ) : (
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    onClick={() => setStudentRecipient('titular')}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold ${
                      studentRecipient === 'titular' ? 'bg-primary text-white' : 'text-muted hover:text-foreground'
                    }`}
                  >
                    Prof. Regente & Bob 🤖
                  </button>
                  <button
                    onClick={() => setStudentRecipient('segundo')}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold ${
                      studentRecipient === 'segundo' ? 'bg-amber-400 text-amber-950' : 'text-muted hover:text-foreground'
                    }`}
                  >
                    2º Professor
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Área Central: Seleção de Turma(s) no modo coletivo OU Histórico de Chat no modo individual */}
          {currentUserRole === 'teacher' && targetScopeMode !== 'student' ? (
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5">
              {targetScopeMode === 'single_turma' && (
                <div className="p-5 rounded-2xl bg-surface border border-cyan-500/30 space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-cyan-400">
                    Escolha a Turma Destinatária:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {turmasList.map((t) => {
                      const count = students.filter((s) => !s.isArchived && s.turma === t).length;
                      const active = singleTargetTurma === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setSingleTargetTurma(t)}
                          className={`px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer border transition-all ${
                            active
                              ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-lg'
                              : 'bg-background text-foreground border-border hover:border-cyan-500/50'
                          }`}
                        >
                          Turma {t} ({count} alunos)
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {targetScopeMode === 'multi_turmas' && (
                <div className="p-5 rounded-2xl bg-surface border border-amber-500/30 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">
                      Marque as Turmas que receberão a mensagem:
                    </h4>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setMultiTargetTurmas(turmasList)}
                        className="text-[11px] font-bold text-amber-300 underline cursor-pointer"
                      >
                        Marcar Todas
                      </button>
                      <span className="text-muted">•</span>
                      <button
                        type="button"
                        onClick={() => setMultiTargetTurmas([])}
                        className="text-[11px] font-bold text-muted hover:text-foreground underline cursor-pointer"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {turmasList.map((t) => {
                      const count = students.filter((s) => !s.isArchived && s.turma === t).length;
                      const checked = multiTargetTurmas.includes(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => handleToggleMultiTurma(t)}
                          className={`px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer border transition-all ${
                            checked
                              ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-lg'
                              : 'bg-background text-muted border-border hover:text-foreground'
                          }`}
                        >
                          {checked ? '✓ ' : '+ '}Turma {t} ({count})
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                <p className="text-xs font-bold text-slate-200">
                  Destinatários selecionados: <span className="text-emerald-400">{collectiveTargetStudents.length} aluno(s)</span>
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Escreva o comunicado no campo abaixo e clique em Enviar. Cada aluno da seleção receberá a mensagem diretamente em sua conversa individual.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 sm:p-5 space-y-4">
              {activeThreadMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted space-y-2">
                  <img src={BOBY_AVATAR} alt="Bob" className="w-12 h-12 rounded-full border border-cyan-500/40" />
                  <p className="text-xs font-bold text-foreground">
                    Nenhuma mensagem ainda com {activeStudent?.fullName || 'este aluno'}.
                  </p>
                  <p className="text-[11px] max-w-sm">
                    Envie uma mensagem abaixo para iniciar o atendimento direto ou clique no botão Bob para gerar uma abordagem inicial.
                  </p>
                </div>
              ) : (
                activeThreadMessages.map((msg) => {
                  const isSecChannel = isSecondTeacherChannelMessage(msg);
                  const isMine =
                    currentUserRole === 'student'
                      ? msg.senderRole === 'student'
                      : isSecondTeacher
                      ? msg.senderRole !== 'student' && isSecChannel
                      : msg.senderRole !== 'student' && !isSecChannel;
                  const msgSenderName = msg.senderName ? msg.senderName : '';
                  const isBobyMsg = msgSenderName.toLowerCase().includes('bob');

                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2 max-w-[88%] sm:max-w-[75%] ${
                        isMine ? 'ml-auto flex-row-reverse' : 'mr-auto'
                      }`}
                    >
                      <img
                        src={
                          isBobyMsg
                            ? BOBY_AVATAR
                            : msg.senderAvatar
                            ? msg.senderAvatar
                            : BOBY_AVATAR
                        }
                        alt=""
                        className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-700 bg-slate-900"
                      />
                      <div
                        className={`p-3 sm:p-4 rounded-2xl text-xs leading-relaxed shadow-lg break-words ${
                          isBobyMsg
                            ? 'bg-slate-900 border border-cyan-500/40 text-cyan-50'
                            : isMine
                            ? 'bg-[#115e33] text-foreground border border-primary/30'
                            : 'bg-surface text-foreground border border-border'
                        }`}
                      >
                        {isBobyMsg && (
                          <div className="text-[10px] font-black text-cyan-300 mb-1 flex items-center gap-1">
                            <Bot className="w-3.5 h-3.5" /> BOB • AGENTE DE ATENDIMENTO
                          </div>
                        )}
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>
          )}

          <form
            onSubmit={handleSend}
            className="p-2 sm:p-3.5 bg-surface border-t border-border flex items-center gap-1.5 sm:gap-2.5 shrink-0 w-full min-w-0"
          >
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <img
                src={
                  isBobyMode
                    ? BOBY_AVATAR
                    : currentUserRole === 'teacher'
                    ? teacher.avatarUrl || BOBY_AVATAR
                    : student?.avatarUrl || BOBY_AVATAR
                }
                alt=""
                className={`w-8 h-8 rounded-full object-cover border ${
                  isBobyMode ? 'border-cyan-400' : 'border-primary/40'
                } shrink-0 bg-slate-900`}
              />
            </div>

            <input
              type="text"
              value={newMessageText}
              onChange={(e) => {
                setNewMessageText(e.target.value);
                if (e.target.value === '') setIsBobyMode(false);
              }}
              placeholder={
                isBobyMode
                  ? 'Editando resposta do Agente Bob...'
                  : targetScopeMode !== 'student'
                  ? `Escrever comunicado para ${collectiveTargetStudents.length} aluno(s)...`
                  : `Escrever mensagem para ${activeStudent?.fullName || 'o aluno'}...`
              }
              className={`flex-1 min-w-0 bg-surface border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none min-h-[38px] ${
                isBobyMode
                  ? 'border-cyan-500/50 focus:border-cyan-400'
                  : 'border-border focus:border-primary'
              }`}
            />

            {currentUserRole === 'teacher' && !isSecondTeacher && targetScopeMode === 'student' && (
              <button
                type="button"
                onClick={handleGenerateAiTeacherDraft}
                disabled={isGeneratingAiDraft}
                className="px-2.5 py-2 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                title="Gerar resposta curta de triagem ou do Livro Didático com o Bob"
              >
                {isGeneratingAiDraft ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <img src={BOBY_AVATAR} alt="Bob" className="w-4 h-4 rounded-full" />
                    <span className="hidden lg:inline text-[11px]">Bob</span>
                  </>
                )}
              </button>
            )}

            <button
              type="submit"
              disabled={!newMessageText.trim() || isGeneratingAiDraft || isSendingBroadcast}
              className={`px-4 py-2 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50 ${
                isBobyMode ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-primary hover:bg-[#6bfb9a]'
              }`}
            >
              <Send className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">
                {isSendingBroadcast
                  ? 'Enviando...'
                  : targetScopeMode !== 'student'
                  ? `Enviar (${collectiveTargetStudents.length})`
                  : 'Enviar'}
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MessagesView;
