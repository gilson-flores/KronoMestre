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
  Bot,
  Loader2,
  Eye,
  RefreshCw
} from 'lucide-react';
import { ChatMessage, StudentUser, TeacherUser, Activity } from '@/lib/types';
import { formatAvatarUrl } from '@/lib/utils';

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

// O Avatar Nativo do Boby
const BOBY_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNTYgMjU2Ij4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iYmdCb2J5IiB4MT0iMCIgeTE9IjAiIHgyPSIyNTYiIHkyPSIyNTYiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjNGMxZDk1Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzJlMTA2NSIvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICA8L2RlZnM+CiAgPHJlY3Qgd2lkdGg9IjI1NiIgaGVpZ2h0PSIyNTYiIHJ4PSI2NCIgZmlsbD0idXJsKCNiZ0JvYnkpIi8+CiAgPHBhdGggZD0iTSA2MCAxMjAgQyA0MCA4MCwgODAgNDAsIDEyOCA0MCBDIDE3NiA0MCwgMjE2IDgwLCAxOTYgMTIwIEMgMjIwIDEwMCwgMjQwIDE0MCwgMjAwIDE2MCBDIDIyMCAxODAsIDE5MCAyMDAsIDE3MCAxODAgQyAxNTAgMjEwLCAxMDYgMjEwLCA4NiAxODAgQyA2NiAyMDAsIDM2IDE4MCwgNTYgMTYwIEMgMTYgMTQwLCAzNiAxMDAsIDYwIDEyMCBaIiBmaWxsPSIjOTNjNWZkIiAvPgogIDxjaXJjbGUgY3g9IjEyOCIgY3k9IjE0MCIgcj0iNDUiIGZpbGw9IiNmZGUwNDciIC8+CiAgPGNpcmNsZSBjeD0iMTA1IiBjeT0iMTM1IiByPSIxNiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjYiLz4KICA8Y2lyY2xlIGN4PSIxNTEiIGN5PSIxMzUiIHI9IjE2IiBmaWxsPSJub25lIiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iNiIvPgogIDxsaW5lIHgxPSIxMjEiIHkxPSIxMzUiIHgyPSIxMzUiIHkyPSIxMzUiIHN0cm9rZT0iIzFlMjkzYiIgc3Ryb2tlLXdpZHRoPSI2Ii8+CiAgPGNpcmNsZSBjeD0iMTA1IiBjeT0iMTM1IiByPSI0IiBmaWxsPSIjMWUyOTNiIi8+CiAgPGNpcmNsZSBjeD0iMTUxIiBjeT0iMTM1IiByPSI0IiBmaWxsPSIjMWUyOTNiIi8+CiAgPHBhdGggZD0iTSAxMTUgMTYwIFEgMTI4IDE3MCAxNDEgMTYwIiBmaWxsPSJub25lIiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+Cjwvc3ZnPg==';

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
  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    if (currentUserRole === 'student' && student) return student.id;
    return students.length > 0 ? students[0].id : '';
  });

  const [isMobileChatOpen, setIsMobileChatOpen] = useState<boolean>(false);
  const [isFilterPopupOpen, setIsFilterPopupOpen] = useState<boolean>(false);
  const [isGeneratingAiDraft, setIsGeneratingAiDraft] = useState(false);
  const [isBobyMode, setIsBobyMode] = useState(false);

  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>('Todos');
  const [selectedTurmaFilter, setSelectedTurmaFilter] = useState<string>('Todas');
  const [readStatusFilter, setReadStatusFilter] = useState<'todas' | 'nao_lidas' | 'lidas'>('todas');
  const [channelScopeFilter, setChannelScopeFilter] = useState<'todos' | 'titular' | 'segundo'>('todos');
  const [studentRecipient, setStudentRecipient] = useState<'titular' | 'segundo'>('titular');
  const [newMessageText, setNewMessageText] = useState('');
  const [attachedActivityId, setAttachedActivityId] = useState<string>('');
  const [isAttachingActivity, setIsAttachingActivity] = useState(false);
  const [broadcastTurma, setBroadcastTurma] = useState<string>('Todas');

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
    selectedStudentId === 'broadcast'
      ? null
      : students.find((s) => s.id === selectedStudentId) ||
        (currentUserRole === 'student' && student ? student : students[0]);

  const activeThreadId =
    selectedStudentId === 'broadcast'
      ? 'broadcast'
      : currentUserRole === 'student'
      ? student?.id || 'default-thread'
      : selectedStudentId || (students.length > 0 ? students[0].id : 'default-thread');

  const activeThreadMessages = messages.filter((m) => {
    const belongsToStudent = m.threadId === activeThreadId || m.senderId === activeThreadId || m.recipientId === activeThreadId;
    if (!belongsToStudent) return false;
    return isMessageVisibleInCurrentContext(m);
  });

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThreadMessages.length, selectedStudentId, studentRecipient]);

  useEffect(() => {
    if (onMarkThreadAsRead && activeThreadId) {
      onMarkThreadAsRead(activeThreadId, currentUserRole);
    }
  }, [activeThreadId, currentUserRole, onMarkThreadAsRead, messages]);

  const filteredStudents = students.filter((s) => {
    const stMessages = messages.filter(
      (m) => (m.threadId === s.id || m.senderId === s.id || m.recipientId === s.id) && isMessageVisibleInCurrentContext(m)
    );
    const hasMessages = stMessages.length > 0;
    const isExplicitlySelected = selectedStudentFilter !== 'Todos' && s.id === selectedStudentFilter;

    if (!hasMessages && !isExplicitlySelected && selectedTurmaFilter === 'Todas') return false;

    const matchesStudent = selectedStudentFilter === 'Todos' || s.id === selectedStudentFilter;
    const matchesTurma = selectedTurmaFilter === 'Todas' || s.turma === selectedTurmaFilter;
    const hasUnread = stMessages.some((m) => m.senderRole === 'student' && !m.read);
    
    let matchesStatus = true;
    if (readStatusFilter === 'nao_lidas') matchesStatus = hasUnread;
    else if (readStatusFilter === 'lidas') matchesStatus = !hasUnread;

    return matchesStudent && matchesTurma && matchesStatus;
  });

  const handleSelectStudent = (stId: string) => {
    setSelectedStudentId(stId);
    setIsMobileChatOpen(true);
    setIsBobyMode(false);
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessageText.trim()) return;

    const selectedActObj = activities.find((a) => a.id === attachedActivityId);

    const formattedTeacherSenderName = isSecondTeacher
      ? teacher.name?.toLowerCase().includes('2º professor') ? teacher.name : `${teacher.name ? teacher.name : 'Professor'} (2º Professor)`
      : teacher.name ? teacher.name : 'Professor';

    const formattedTeacherSenderId = isSecondTeacher ? (teacher.id ? teacher.id : 'second-teacher') : (teacher.id ? teacher.id : 'teacher-1');

    if (currentUserRole === 'teacher' && selectedStudentId === 'broadcast') {
      const targetStudents = students.filter((s) => broadcastTurma === 'Todas' || s.turma === broadcastTurma);
      for (const st of targetStudents) {
        onSendMessage({
          threadId: st.id,
          senderId: formattedTeacherSenderId,
          senderName: formattedTeacherSenderName,
          senderRole: 'teacher',
          senderAvatar: teacher.avatarUrl,
          recipientId: st.id,
          recipientName: st.fullName ? st.fullName : 'Aluno',
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
      sndId = isBobyMode ? 'boby-assistant' : formattedTeacherSenderId;
      sndName = isBobyMode ? 'Boby (Assistente)' : formattedTeacherSenderName;
      sndAvatar = isBobyMode ? BOBY_AVATAR : teacher.avatarUrl;
      recId = activeStudent?.id ? activeStudent.id : 'std-1';
      recName = activeStudent?.fullName ? activeStudent.fullName : 'Aluno';
    } else {
      sndId = student?.id ? student.id : 'std-1';
      sndName = student?.fullName ? student.fullName : 'Aluno';
      sndAvatar = student?.avatarUrl;
      if (studentRecipient === 'segundo') {
        recId = 'second-teacher';
        recName = student?.secondTeacherName ? `${student.secondTeacherName} (2º Professor)` : '2º Professor (Inclusão)';
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
    setIsAttachingActivity(false);
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
          studentName: activeStudent?.fullName ? activeStudent.fullName : 'Aluno',
          studentTurma: activeStudent?.turma ? activeStudent.turma : 'Geral',
          currentMessage: lastStudentMsg ? lastStudentMsg.content : 'Olá! No que o Boby pode ajudar?',
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
                Mensagens
              </span>
              <span className="text-[10px] sm:text-xs font-semibold text-muted truncate">
                KronoMestre • Comunicação Direta
              </span>
            </div>
            <h1 className="text-lg sm:text-2xl font-extrabold text-foreground mt-1 truncate">
              {currentUserRole === 'teacher' ? (isSecondTeacher ? 'Mensagens • 2º Professor' : 'Central de Mensagens') : 'Atendimento'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap self-start md:self-auto">
          {/* Botão de Sincronização Manual */}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-3 py-2 rounded-2xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm bg-surface text-muted border-border hover:text-foreground hover:bg-surface-hover"
            title="Atualizar mensagens"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sincronizar</span>
          </button>

          {/* Teacher AI Auto-Reply Toggle */}
          {currentUserRole === 'teacher' && !isSecondTeacher && onToggleAiAutoReply && (
            <button
              type="button"
              onClick={() => onToggleAiAutoReply(!isAiAutoReplyEnabled)}
              className={`px-3 py-2 rounded-2xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                isAiAutoReplyEnabled
                  ? 'bg-purple-100 text-purple-600 border-purple-200 hover:bg-purple-500/30'
                  : 'bg-surface text-muted border-border hover:text-foreground'
              }`}
              title="Ativar/Pausar respostas automáticas com IA do Boby"
            >
              <Bot className={`w-3.5 h-3.5 ${isAiAutoReplyEnabled ? 'text-purple-400' : 'text-[#869486]'}`} />
              <span className="hidden sm:inline">Boby Auto: {isAiAutoReplyEnabled ? 'ON' : 'OFF'}</span>
            </button>
          )}

          <div className="bg-surface px-3 py-2 rounded-2xl border border-border flex items-center gap-2 text-xs text-foreground shrink-0">
            <Shield className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-[11px] font-medium hidden lg:inline">Canal Seguro</span>
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-2xl sm:rounded-3xl border border-border shadow-2xl overflow-hidden h-[calc(100vh-220px)] sm:h-[calc(100vh-250px)] min-h-[480px] max-h-[780px] flex flex-col md:flex-row relative w-full min-w-0">
        
        {/* Painel Esquerdo */}
        {currentUserRole === 'teacher' && (
          <div className={`w-full md:w-72 lg:w-80 xl:w-96 bg-[#0c1424] border-r border-border flex flex-col transition-all duration-300 h-full min-h-0 shrink-0 ${isMobileChatOpen ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-3 sm:p-4 border-b border-border bg-surface/60 shrink-0 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <User className="w-4 h-4 text-primary shrink-0" />
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider truncate">Conversas</h3>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-white/5 min-h-0">
              {filteredStudents.map((st) => {
                const isSelected = st.id === selectedStudentId;
                const stMessages = messages.filter(m => (m.threadId === st.id || m.senderId === st.id || m.recipientId === st.id) && isMessageVisibleInCurrentContext(m));
                const lastMsg = stMessages[stMessages.length - 1];
                const unreadCount = stMessages.filter((m) => m.senderRole === 'student' && !m.read).length;
                return (
                  <button key={st.id} onClick={() => handleSelectStudent(st.id)} className={`w-full p-3 text-left flex items-start gap-3 cursor-pointer ${isSelected ? 'bg-[#17233b] border-l-4 border-l-[#4ade80]' : 'hover:bg-surface-hover'}`}>
                    <img src={st.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover border border-border shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-foreground truncate">{st.fullName}</h4>
                      <p className="text-[11px] text-muted truncate mt-1">{lastMsg ? lastMsg.content : 'Iniciar conversa...'}</p>
                    </div>
                    {unreadCount > 0 && <span className="bg-primary text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center shrink-0">{unreadCount}</span>}
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
              {currentUserRole === 'teacher' && <button onClick={() => setIsMobileChatOpen(false)} className="md:hidden p-1.5 text-muted hover:text-foreground rounded-full"><ArrowLeft className="w-5 h-5" /></button>}
              {currentUserRole === 'teacher' ? (
                activeStudent ? (
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img src={activeStudent.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-primary shrink-0" />
                    <div className="min-w-0"><h3 className="text-sm font-bold text-foreground truncate">{activeStudent.fullName}</h3></div>
                  </div>
                ) : <span className="text-xs text-muted">Selecione um aluno</span>
              ) : (
                <div className="flex items-center gap-2 min-w-0">
                  <button onClick={() => setStudentRecipient('titular')} className={`px-2 py-1 rounded-lg text-[11px] font-bold ${studentRecipient === 'titular' ? 'bg-primary text-white' : 'text-muted hover:text-foreground'}`}>Prof. Regente</button>
                  <button onClick={() => setStudentRecipient('segundo')} className={`px-2 py-1 rounded-lg text-[11px] font-bold ${studentRecipient === 'segundo' ? 'bg-amber-400 text-amber-950' : 'text-muted hover:text-foreground'}`}>2º Professor</button>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 sm:p-5 space-y-4">
            {activeThreadMessages.map((msg) => {
              const isSecChannel = isSecondTeacherChannelMessage(msg);
              const isMine = currentUserRole === 'student' ? msg.senderRole === 'student' : isSecondTeacher ? msg.senderRole !== 'student' && isSecChannel : msg.senderRole !== 'student' && !isSecChannel;
              const msgSenderName = msg.senderName ? msg.senderName : '';
              const isBobyMsg = msgSenderName.includes('Boby');

              return (
                <div key={msg.id} className={`flex items-end gap-2 max-w-[88%] sm:max-w-[75%] ${isMine ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                  {!isMine && (
                    <img src={msg.senderAvatar ? msg.senderAvatar : 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=250'} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                  )}
                  <div className={`p-3 sm:p-4 rounded-2xl text-xs leading-relaxed shadow-lg break-words ${isBobyMsg ? 'bg-purple-900/60 border border-purple-500/40 text-purple-100' : isMine ? 'bg-[#115e33] text-foreground border border-primary/30' : 'bg-surface text-foreground border border-border'}`}>
                     {isBobyMsg && <div className="text-[10px] font-black text-purple-300 mb-1 flex items-center gap-1"><Bot className="w-3 h-3"/> BOBY ASSISTENTE</div>}
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              );
            })}
            <div ref={chatBottomRef} />
          </div>

          <form onSubmit={handleSend} className="p-2 sm:p-3.5 bg-surface border-t border-border flex items-center gap-1.5 sm:gap-2.5 shrink-0 w-full min-w-0">
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <img src={isBobyMode ? BOBY_AVATAR : currentUserRole === 'teacher' ? teacher.avatarUrl : student?.avatarUrl} alt="" className={`w-8 h-8 rounded-full object-cover border ${isBobyMode ? 'border-purple-500' : 'border-primary/40'} shrink-0`} />
            </div>

            <input type="text" value={newMessageText} onChange={(e) => { setNewMessageText(e.target.value); if(e.target.value === '') setIsBobyMode(false); }} placeholder={isBobyMode ? "Editando resposta do Boby..." : "Escrever mensagem..."} className={`flex-1 min-w-0 bg-surface border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none min-h-[38px] ${isBobyMode ? 'border-purple-500/50 focus:border-purple-500' : 'border-border focus:border-primary'}`} />

            {currentUserRole === 'teacher' && !isSecondTeacher && selectedStudentId !== 'broadcast' && (
              <button type="button" onClick={handleGenerateAiTeacherDraft} disabled={isGeneratingAiDraft} className="px-2.5 py-2 bg-purple-100 hover:bg-purple-500/30 text-purple-600 border border-purple-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5">
                {isGeneratingAiDraft ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Bot className="w-3.5 h-3.5" /><span className="hidden lg:inline text-[11px]">Boby</span></>}
              </button>
            )}

            <button type="submit" disabled={!newMessageText.trim() || isGeneratingAiDraft} className={`px-4 py-2 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer ${isBobyMode ? 'bg-purple-600 hover:bg-purple-500' : 'bg-primary hover:bg-[#6bfb9a]'}`}>
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