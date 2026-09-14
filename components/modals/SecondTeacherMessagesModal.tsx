import React, { useState } from 'react';
import { ChatMessage, TeacherUser, StudentUser } from '@/lib/types';
import { MessageSquare, X } from 'lucide-react';
import { formatAvatarUrl } from '@/lib/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  secondTeacher: TeacherUser;
  messages: ChatMessage[];
  students: StudentUser[];
}

export const SecondTeacherMessagesModal: React.FC<Props> = ({
  isOpen,
  onClose,
  secondTeacher,
  messages,
  students,
}) => {
  const [activeThreadId, setActiveThreadId] = useState<string>('titular');

  if (!isOpen) return null;

  // Filter messages involving the second teacher
  const teacherMessages = messages.filter(
    (m) =>
      m.senderId === secondTeacher.id ||
      m.recipientId === secondTeacher.id ||
      m.threadId === secondTeacher.id
  );

  // Group threads
  // 1. Thread with Titular (where sender is titular and recipient is secondTeacher, or vice-versa)
  const titularMessages = teacherMessages.filter(
    (m) =>
      (m.senderId === secondTeacher.id && m.recipientRole === 'teacher') ||
      (m.recipientId === secondTeacher.id && m.senderRole === 'teacher')
  );

  // 2. Threads with students (where one party is the second teacher, the other is student)
  const studentMessages = teacherMessages.filter(
    (m) => m.senderRole === 'student' || m.recipientRole === 'student'
  );

  // Get unique students who have conversations
  const studentThreadIds = Array.from(
    new Set(
      studentMessages.map((m) =>
        m.senderRole === 'student' ? m.senderId : m.recipientId
      )
    )
  );

  const activeMessages =
    activeThreadId === 'titular'
      ? titularMessages
      : studentMessages.filter(
          (m) => m.senderId === activeThreadId || m.recipientId === activeThreadId
        );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="relative bg-background border border-border w-full max-w-5xl h-[85vh] rounded-3xl shadow-2xl flex flex-col sm:flex-row overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Sidebar: Thread List */}
        <div className="w-full sm:w-80 bg-surface border-r border-border flex flex-col min-h-0 shrink-0">
          <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span>Conversas do 2º Professor</span>
            </h2>
            <button
              onClick={onClose}
              className="sm:hidden p-2 text-muted hover:text-foreground rounded-full hover:bg-surface-hover"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-3 border-b border-border shrink-0 bg-[#0c1424]">
            <p className="text-xs text-muted leading-relaxed">
              Modo somente leitura. Acompanhe as orientações dadas pelo 2º Professor.
            </p>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            <button
              onClick={() => setActiveThreadId('titular')}
              className={`w-full p-3 rounded-xl flex items-center gap-3 transition-colors text-left \${
                activeThreadId === 'titular' ? 'bg-[#17233b] border border-primary/30' : 'hover:bg-surface-hover border border-transparent'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/40 shrink-0">
                <span className="text-primary font-bold text-xs">T</span>
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-foreground truncate">Professor Titular</h4>
                <p className="text-[10px] text-muted truncate mt-0.5">
                  {titularMessages.length} mensagens
                </p>
              </div>
            </button>

            <div className="pt-2 pb-1 px-3">
              <h3 className="text-[10px] font-bold text-[#869486] uppercase tracking-wider">
                Alunos Tutelados
              </h3>
            </div>

            {studentThreadIds.map((stId) => {
              const st = students.find((s) => s.id === stId);
              const count = studentMessages.filter(m => m.senderId === stId || m.recipientId === stId).length;
              return (
                <button
                  key={stId}
                  onClick={() => setActiveThreadId(stId)}
                  className={`w-full p-3 rounded-xl flex items-center gap-3 transition-colors text-left \${
                    activeThreadId === stId ? 'bg-[#17233b] border border-primary/30' : 'hover:bg-surface-hover border border-transparent'
                  }`}
                >
                  <img
                    src={formatAvatarUrl(st?.avatarUrl)}
                    alt={st?.fullName || 'Aluno'}
                    className="w-10 h-10 rounded-full object-cover border border-border shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200';
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-foreground truncate">
                      {st?.fullName || 'Aluno Desconhecido'}
                    </h4>
                    <p className="text-[10px] text-muted truncate mt-0.5">
                      {count} mensagens
                    </p>
                  </div>
                </button>
              );
            })}

            {studentThreadIds.length === 0 && (
              <div className="p-4 text-center text-xs text-muted">
                Nenhuma conversa com alunos registrada.
              </div>
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 bg-background flex flex-col min-w-0 h-full relative">
          <div className="p-4 border-b border-border bg-surface flex items-center justify-between shrink-0">
            <h3 className="text-sm font-bold text-foreground">
              {activeThreadId === 'titular'
                ? 'Conversa: 2º Professor ↔ Titular'
                : `Conversa: 2º Professor ↔ ${students.find((s) => s.id === activeThreadId)?.fullName || 'Aluno'}`}
            </h3>
            <button
              onClick={onClose}
              className="hidden sm:flex p-2 text-muted hover:text-foreground rounded-full hover:bg-surface-hover"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {activeMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted">
                <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm font-medium">Nenhuma mensagem neste histórico.</p>
              </div>
            ) : (
              activeMessages.map((msg) => {
                // If it's the 2nd teacher, align right. Else align left.
                const isSecondTeacher = msg.senderId === secondTeacher.id;
                
                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2.5 max-w-[85%] \${
                      isSecondTeacher ? 'ml-auto flex-row-reverse' : 'mr-auto'
                    }`}
                  >
                    <img
                      src={formatAvatarUrl(msg.senderAvatar)}
                      alt={msg.senderName}
                      className="w-8 h-8 rounded-full object-cover border border-primary/40 shrink-0"
                    />
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm \${
                        isSecondTeacher
                          ? 'bg-primary text-white rounded-br-sm'
                          : 'bg-surface border border-border text-foreground rounded-bl-sm'
                      }`}
                    >
                      <div className="font-bold text-[10px] mb-1 opacity-75">
                        {msg.senderName}
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      <span className="text-[9px] opacity-60 mt-2 block text-right">
                        {new Date(msg.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
