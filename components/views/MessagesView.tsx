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
  X
} from 'lucide-react';
import { ChatMessage, StudentUser, TeacherUser, Activity } from '@/lib/types';

interface MessagesViewProps {
  currentUserRole: 'teacher' | 'student';
  teacher: TeacherUser;
  student?: StudentUser | null;
  students: StudentUser[];
  activities: Activity[];
  messages: ChatMessage[];
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
  currentUserRole,
  teacher,
  student,
  students,
  activities,
  messages,
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

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTurmaFilter, setSelectedTurmaFilter] = useState('Todas');

  // New message form state
  const [newMessageText, setNewMessageText] = useState('');
  const [attachedActivityId, setAttachedActivityId] = useState<string>('');
  const [isAttachingActivity, setIsAttachingActivity] = useState(false);

  // Ref for chat auto-scroll
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Get active student object for the selected thread
  const activeStudent = students.find((s) => s.id === selectedStudentId) ||
    (currentUserRole === 'student' && student ? student : students[0]);

  // Current Thread ID is student.id
  const activeThreadId = currentUserRole === 'student'
    ? (student?.id || 'default-thread')
    : (selectedStudentId || (students.length > 0 ? students[0].id : 'default-thread'));

  // Filter messages for active thread
  const activeThreadMessages = messages.filter(
    (m) => m.threadId === activeThreadId || (m.senderId === activeThreadId || m.recipientId === activeThreadId)
  );

  // Auto-scroll to bottom of chat when new message arrives or thread changes
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThreadMessages.length, selectedStudentId]);

  // Mark thread as read when selected
  useEffect(() => {
    if (onMarkThreadAsRead && activeThreadId) {
      onMarkThreadAsRead(activeThreadId, currentUserRole);
    }
  }, [activeThreadId, currentUserRole, onMarkThreadAsRead]);

  // Calculate unique turmas for filter dropdown
  const availableTurmas = Array.from(new Set(students.map((s) => s.turma))).filter(Boolean);

  // Filter students for the sidebar conversation list
  const filteredStudents = students.filter((s) => {
    const matchesSearch = s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.turma.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.matricula.includes(searchQuery);
    const matchesTurma = selectedTurmaFilter === 'Todas' || s.turma === selectedTurmaFilter;
    return matchesSearch && matchesTurma;
  });

  const handleSelectStudent = (stId: string) => {
    setSelectedStudentId(stId);
    setIsMobileChatOpen(true);
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessageText.trim()) return;

    let recId = '';
    let recName = '';
    let sndId = '';
    let sndName = '';
    let sndAvatar: string | undefined = undefined;

    if (currentUserRole === 'teacher') {
      sndId = teacher.id || 'teacher-1';
      sndName = teacher.name || 'Professora';
      sndAvatar = teacher.avatarUrl;
      recId = activeStudent?.id || 'std-1';
      recName = activeStudent?.fullName || 'Aluno';
    } else {
      sndId = student?.id || 'std-1';
      sndName = student?.fullName || 'Aluno';
      sndAvatar = student?.avatarUrl;
      recId = teacher.id || 'teacher-1';
      recName = teacher.name || 'Professora';
    }

    const selectedActObj = activities.find((a) => a.id === attachedActivityId);

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
    'Professora, boa tarde! Tenho uma dúvida sobre a última atividade.',
    'Gostaria de saber se a minha redação já foi corrigida.',
    'Poderia me enviar o material complementar de apoio?',
  ];

  const quickPrompts = currentUserRole === 'teacher' ? teacherPrompts : studentPrompts;

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-10">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-[#4ade80]/10 text-[#4ade80] rounded-2xl border border-[#4ade80]/20 shrink-0">
            <MessageSquare className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#4ade80] uppercase tracking-wider bg-[#4ade80]/10 px-3 py-0.5 rounded-full border border-[#4ade80]/20">
                Mensagens
              </span>
              <span className="text-xs font-semibold text-[#bccabb]">Divisão de inteligência de Konoha</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
              {currentUserRole === 'teacher' ? 'Mensagens e Suporte com Alunos' : 'Mensagens com a Professora'}
            </h1>
            <p className="text-xs text-[#bccabb] mt-0.5">
              {currentUserRole === 'teacher'
                ? 'Tire dúvidas, envie feedbacks individuais e acompanhe o engajamento de cada estudante.'
                : 'Tire suas dúvidas diretamente com sua professora e receba orientações pedagógicas exclusivas.'}
            </p>
          </div>
        </div>

        <div className="bg-[#131b2e] px-4 py-2.5 rounded-2xl border border-white/10 flex items-center gap-3 text-xs text-[#dae2fd]">
          <Shield className="w-4 h-4 text-[#4ade80]" />
          <span>Canal protegido & monitorado</span>
        </div>
      </div>

      {/* Main Messaging Interface Container */}
      <div className="glass-panel rounded-3xl border border-white/10 shadow-2xl overflow-hidden min-h-[580px] h-[calc(100vh-250px)] max-h-[750px] flex flex-col md:flex-row relative">
        
        {/* LEFT PANEL: Student Thread List (Teacher View) or Teacher Card (Student View) */}
        <div
          className={`w-full md:w-80 lg:w-96 bg-[#0c1424] border-r border-white/10 flex flex-col transition-all duration-300 ${
            isMobileChatOpen ? 'hidden md:flex' : 'flex'
          }`}
        >
          {currentUserRole === 'teacher' ? (
            <>
              {/* Teacher Sidebar Header */}
              <div className="p-4 border-b border-white/10 space-y-3 bg-[#0e172a]/60">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <User className="w-4 h-4 text-[#4ade80]" />
                    <span>Conversas ({students.length})</span>
                  </h3>
                  <span className="text-[10px] bg-[#4ade80]/20 text-[#4ade80] px-2 py-0.5 rounded-full font-bold">
                    Ativas
                  </span>
                </div>

                {/* Search Input */}
                <div className="relative">
                  <Search className="w-4 h-4 text-[#bccabb] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar aluno ou matrícula..."
                    className="w-full bg-[#131b2e] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-[#869486] focus:outline-none focus:border-[#4ade80]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-2.5 text-[#bccabb] hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Turma Filter Pills */}
                {availableTurmas.length > 0 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    <button
                      onClick={() => setSelectedTurmaFilter('Todas')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                        selectedTurmaFilter === 'Todas'
                          ? 'bg-[#4ade80] text-[#003919]'
                          : 'bg-[#131b2e] text-[#bccabb] hover:text-white border border-white/5'
                      }`}
                    >
                      Todas
                    </button>
                    {availableTurmas.map((t) => (
                      <button
                        key={t}
                        onClick={() => setSelectedTurmaFilter(t)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                          selectedTurmaFilter === t
                            ? 'bg-[#4ade80] text-[#003919]'
                            : 'bg-[#131b2e] text-[#bccabb] hover:text-white border border-white/5'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Student Thread Scroll Area */}
              <div className="flex-1 overflow-y-auto divide-y divide-white/5">
                {filteredStudents.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#bccabb]">
                    Nenhum aluno encontrado.
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
                        className={`w-full p-4 text-left flex items-start gap-3 transition-colors cursor-pointer relative ${
                          isSelected
                            ? 'bg-[#17233b] border-l-4 border-l-[#4ade80]'
                            : 'hover:bg-white/5'
                        }`}
                      >
                        <div className="relative shrink-0">
                          <img
                            src={st.avatarUrl}
                            alt={st.fullName}
                            className="w-10 h-10 rounded-full object-cover border border-white/20"
                          />
                          <span className="w-2.5 h-2.5 rounded-full bg-[#4ade80] absolute bottom-0 right-0 border-2 border-[#0c1424]" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-xs font-bold text-white truncate">
                              {st.fullName}
                            </h4>
                            {lastMsg && (
                              <span className="text-[10px] text-[#869486] shrink-0">
                                {lastMsg.createdAt.split(' ')[1] || lastMsg.createdAt}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] bg-[#131b2e] text-[#bccabb] px-2 py-0.2 rounded border border-white/10 font-semibold">
                              {st.turma}
                            </span>
                            {st.tag && (
                              <span className="text-[9px] bg-[#4ade80]/20 text-[#4ade80] px-1.5 py-0.2 rounded font-bold">
                                {st.tag}
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-[#bccabb] truncate mt-1">
                            {lastMsg ? lastMsg.content : 'Iniciar conversa...'}
                          </p>
                        </div>

                        {unreadCount > 0 && (
                          <span className="bg-[#4ade80] text-[#003919] text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center shrink-0 shadow-sm self-center">
                            {unreadCount}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            /* Student Sidebar Header: Teacher Profile Card */
            <div className="p-5 space-y-4 bg-[#0e172a]/80">
              <div className="text-center p-4 bg-[#131b2e] rounded-2xl border border-white/10 space-y-3">
                <img
                  src={teacher.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'}
                  alt={teacher.name}
                  className="w-16 h-16 rounded-full object-cover mx-auto border-2 border-[#4ade80] shadow-md"
                />
                <div>
                  <h3 className="text-sm font-extrabold text-white">{teacher.name || 'Dra. Helena Vance'}</h3>
                  <p className="text-xs text-[#4ade80] font-semibold">{teacher.subject || 'Professora de Sociologia'}</p>
                  <p className="text-[11px] text-[#bccabb] mt-1">{teacher.school || 'Colégio Estadual de Alta Performance'}</p>
                </div>
                <div className="pt-2 border-t border-white/10 flex items-center justify-center gap-2 text-[11px] text-[#4ade80]">
                  <span className="w-2 h-2 rounded-full bg-[#4ade80] animate-pulse" />
                  <span className="font-bold">Online no Studio</span>
                </div>
              </div>

              <div className="bg-[#131b2e] p-3.5 rounded-2xl border border-white/10 space-y-2 text-xs text-[#bccabb]">
                <div className="flex items-center gap-2 text-white font-bold">
                  <Clock className="w-4 h-4 text-[#4ade80]" />
                  <span>Horários de Atendimento</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Segunda a Sexta, das 08h às 17h. Dúvidas enviadas fora do horário serão respondidas no próximo turno escolar.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Active Conversation Window */}
        <div
          className={`flex-1 bg-[#09101f] flex flex-col transition-all duration-300 ${
            !isMobileChatOpen && currentUserRole === 'teacher' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Chat Window Header */}
          <div className="p-4 bg-[#0e172a] border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              {/* Back button for mobile view */}
              {currentUserRole === 'teacher' && (
                <button
                  onClick={() => setIsMobileChatOpen(false)}
                  className="md:hidden p-2 text-[#bccabb] hover:text-white rounded-full hover:bg-white/5 transition-colors"
                  aria-label="Voltar para lista de alunos"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}

              {currentUserRole === 'teacher' ? (
                activeStudent ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={activeStudent.avatarUrl}
                      alt={activeStudent.fullName}
                      className="w-10 h-10 rounded-full object-cover border border-[#4ade80]"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">{activeStudent.fullName}</h3>
                        <span className="text-[10px] bg-[#171f33] text-[#4ade80] font-bold px-2 py-0.5 rounded border border-white/10">
                          {activeStudent.turma}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#bccabb]">
                        Matrícula: <span className="font-mono text-white">{activeStudent.matricula}</span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-[#bccabb]">Selecione um aluno</span>
                )
              ) : (
                <div className="flex items-center gap-3">
                  <img
                    src={teacher.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'}
                    alt={teacher.name}
                    className="w-10 h-10 rounded-full object-cover border border-[#4ade80]"
                  />
                  <div>
                    <h3 className="text-sm font-bold text-white">{teacher.name || 'Professora'}</h3>
                    <p className="text-[11px] text-[#4ade80] font-semibold">{teacher.subject || 'Sociologia'}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-[#bccabb]">
              <span className="w-2 h-2 rounded-full bg-[#4ade80]" />
              <span className="hidden sm:inline font-semibold">Canal Ativo</span>
            </div>
          </div>

          {/* Messages Stream Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {activeThreadMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                <div className="p-4 rounded-full bg-[#131b2e] text-[#4ade80] border border-white/10">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-bold text-white">Nenhuma mensagem nesta conversa</h4>
                <p className="text-xs text-[#bccabb] max-w-sm">
                  {currentUserRole === 'teacher'
                    ? `Envie uma mensagem para ${activeStudent?.fullName || 'o aluno'} orientando sobre trabalhos, prazos ou feedbacks.`
                    : 'Escreva sua dúvida abaixo para enviar diretamente à sua professora.'}
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
                    className={`flex items-end gap-2.5 max-w-[85%] sm:max-w-[75%] ${
                      isMine ? 'ml-auto flex-row-reverse' : 'mr-auto'
                    }`}
                  >
                    {!isMine && (
                      <img
                        src={
                          msg.senderAvatar ||
                          (msg.senderRole === 'teacher'
                            ? teacher.avatarUrl
                            : activeStudent?.avatarUrl)
                        }
                        alt={msg.senderName}
                        className="w-7 h-7 rounded-full object-cover border border-white/20 shrink-0 mb-1"
                      />
                    )}

                    <div className="space-y-1">
                      {/* Message Bubble */}
                      <div
                        className={`p-4 rounded-2xl text-xs leading-relaxed shadow-lg ${
                          isMine
                            ? 'bg-[#115e33] text-white rounded-br-none border border-[#4ade80]/30'
                            : 'bg-[#131b2e] text-[#dae2fd] rounded-bl-none border border-white/10'
                        }`}
                      >
                        {/* Linked Activity Card inside Message */}
                        {msg.activityTitle && (
                          <div className="mb-2.5 p-2.5 bg-black/20 rounded-xl border border-white/10 flex items-center gap-2 text-[11px] text-[#4ade80] font-semibold">
                            <FileText className="w-4 h-4 shrink-0" />
                            <span className="truncate">Ref: {msg.activityTitle}</span>
                          </div>
                        )}

                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>

                      {/* Timestamp & Read Checkmarks */}
                      <div
                        className={`flex items-center gap-1.5 text-[10px] text-[#869486] ${
                          isMine ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <span>{msg.createdAt}</span>
                        {isMine && (
                          <CheckCheck className="w-3 h-3 text-[#4ade80]" />
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
          <div className="px-4 py-2 bg-[#0c1424] border-t border-white/5 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-bold text-[#869486] shrink-0 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#4ade80]" />
              <span>Sugestões:</span>
            </span>
            {quickPrompts.map((promptText, idx) => (
              <button
                key={idx}
                onClick={() => setNewMessageText(promptText)}
                className="px-3 py-1 rounded-full bg-[#131b2e] hover:bg-[#1f2b47] text-[#dae2fd] text-[11px] border border-white/10 whitespace-nowrap transition-colors cursor-pointer shrink-0"
              >
                {promptText}
              </button>
            ))}
          </div>

          {/* Attached Activity Selector (if user clicked clip) */}
          {isAttachingActivity && (
            <div className="p-3 bg-[#131b2e] border-t border-white/10 flex items-center justify-between gap-2 animate-fadeIn">
              <div className="flex items-center gap-2 text-xs text-white">
                <FileText className="w-4 h-4 text-[#4ade80]" />
                <span className="font-bold">Vincular Atividade:</span>
                <select
                  value={attachedActivityId}
                  onChange={(e) => setAttachedActivityId(e.target.value)}
                  className="bg-[#0e172a] border border-white/15 rounded-xl px-3 py-1 text-xs text-white focus:outline-none"
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
                className="text-[#bccabb] hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Chat Message Input Bar */}
          <form
            onSubmit={handleSend}
            className="p-3 sm:p-4 bg-[#0e172a] border-t border-white/10 flex items-center gap-2 shrink-0"
          >
            <button
              type="button"
              onClick={() => setIsAttachingActivity(!isAttachingActivity)}
              className={`p-2.5 rounded-2xl border transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center ${
                attachedActivityId
                  ? 'bg-[#4ade80]/20 text-[#4ade80] border-[#4ade80]/40'
                  : 'bg-[#131b2e] hover:bg-[#1a253e] text-[#bccabb] border-white/10'
              }`}
              title="Vincular atividade à mensagem"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            <input
              type="text"
              value={newMessageText}
              onChange={(e) => setNewMessageText(e.target.value)}
              placeholder={
                currentUserRole === 'teacher'
                  ? `Escrever mensagem para ${activeStudent?.fullName || 'o aluno'}...`
                  : 'Escrever dúvida para a professora...'
              }
              className="flex-1 bg-[#131b2e] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder-[#869486] focus:outline-none focus:border-[#4ade80] leading-relaxed min-h-[44px]"
            />

            <button
              type="submit"
              disabled={!newMessageText.trim()}
              className="px-5 py-3 bg-[#4ade80] hover:bg-[#6bfb9a] disabled:opacity-40 disabled:hover:bg-[#4ade80] text-[#003919] font-extrabold rounded-2xl text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 min-h-[44px]"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Enviar</span>
            </button>
          </form>

        </div>

      </div>
    </div>
  );
};
