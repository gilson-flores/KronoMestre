'use client';

import { useState, useCallback } from 'react';
import { ChatMessage, StudentUser, TeacherUser, Activity } from '@/lib/types';

export const BOBY_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNTYgMjU2Ij4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iYm9iQmciIHgxPSIwIiB5MT0iMCIgeDI9IjI1NiIgeTI9IjI1NiI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiMwZjE3MmEiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjMWUzYThhIi8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJib2JCb2R5IiB4MT0iMCIgeTE9IjQwIiB4Mj0iMCIgeTI9IjIyMCI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNmOGZhZmMiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjY2JkNWUxIi8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogIDwvZGVmcz4KICA8cmVjdCB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgcng9IjY0IiBmaWxsPSJ1cmwoI2JvYkJnKSIvPgogIDxsaW5lIHgxPSIxMjgiIHkxPSIyOCIgeDI9IjEyOCIgeTI9IjU4IiBzdHJva2U9IiMzOGJkZjgiIHN0cm9rZS13aWR0aD0iOCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CiAgPGNpcmNsZSBjeD0iMTI4IiBjeT0iMjQiIHI9IjEyIiBmaWxsPSIjMjJkM2VlIi8+CiAgPHJlY3QgeD0iMzYiIHk9IjEwNiIgd2lkdGg9IjE2IiBoZWlnaHQ9IjQ0IiByeD0iOCIgZmlsbD0iIzM4YmRmOCIvPgogIDxyZWN0IHg9IjIwNCIgeT0iMTA2IiB3aWR0aD0iMTYiIGhlaWdodD0iNDQiIHJ4PSI4IiBmaWxsPSIjMzhiZGY4Ii8+CiAgPHJlY3QgeD0iNTIiIHk9IjU4IiB3aWR0aD0iMTUyIiBoZWlnaHQ9IjE0MCIgcng9IjQyIiBmaWxsPSJ1cmwoI2JvYkJvZHkpIiBzdHJva2U9IiMzOGJkZjgiIHN0cm9rZS13aWR0aD0iNiIvPgogIDxyZWN0IHg9IjcwIiB5PSI4MiIgd2lkdGg9IjExNiIgaGVpZ2h0PSI2OCIgcng9IjI0IiBmaWxsPSIjMGYxNzJhIiBzdHJva2U9IiMwMjg0YzciIHN0cm9rZS13aWR0aD0iNCIvPgogIDxjaXJjbGUgY3g9IjEwMiIgY3k9IjExNiIgcj0iMTIiIGZpbGw9IiMyMmQzZWUiLz4KICA8Y2lyY2xlIGN4PSIxMDYiIGN5PSIxMTIiIHI9IjQiIGZpbGw9IiNmZmZmZmYiLz4KICA8Y2lyY2xlIGN4PSIxNTQiIGN5PSIxMTYiIHI9IjEyIiBmaWxsPSIjMjJkM2VlIi8+CiAgPGNpcmNsZSBjeD0iMTU4IiBjeT0iMTEyIiByPSI0IiBmaWxsPSIjZmZmZmZmIi8+CiAgPHBhdGggZD0iTSAxMDIgMTcwIFEgMTI4IDE4OCAxNTQgMTcwIiBmaWxsPSJub25lIiBzdHJva2U9IiMwMjg0YzciIHN0cm9rZS13aWR0aD0iNyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CiAgPGNpcmNsZSBjeD0iODQiIGN5PSIxNjgiIHI9IjYiIGZpbGw9IiMzOGJkZjgiIG9wYWNpdHk9IjAuNiIvPgogIDxjaXJjbGUgY3g9IjE3MiIgY3k9IjE2OCIgcj0iNiIgZmlsbD0iIzM4YmRmOCIgb3BhY2l0eT0iMC42Ii8+Cjwvc3ZnPg==';

export const mergeChatMessage = (
  prev: ChatMessage[],
  incoming: ChatMessage
): { updated: ChatMessage[]; isNew: boolean } => {
  const exactIndex = prev.findIndex((m) => m.id === incoming.id);
  if (exactIndex !== -1) {
    return { updated: prev, isNew: false };
  }

  const optimisticMatchIndex = prev.findIndex((m) => {
    const isSameSender = m.senderId === incoming.senderId;
    const isSameThread =
      m.threadId === incoming.threadId ||
      m.recipientId === incoming.recipientId ||
      m.threadId === incoming.recipientId ||
      m.recipientId === incoming.threadId;
    const isSameContent = m.content.trim() === incoming.content.trim();
    const isOptimisticOrExtension =
      m.id.startsWith('msg-') ||
      incoming.id.startsWith('msg-') ||
      m.id.startsWith('msg-ext-') ||
      incoming.id.startsWith('msg-ext-');

    return isSameSender && isSameThread && isSameContent && isOptimisticOrExtension;
  });

  if (optimisticMatchIndex !== -1) {
    const clone = [...prev];
    if (!incoming.id.startsWith('msg-') && clone[optimisticMatchIndex].id.startsWith('msg-')) {
      clone[optimisticMatchIndex] = {
        ...clone[optimisticMatchIndex],
        ...incoming,
        id: incoming.id,
      };
    }
    return { updated: clone, isNew: false };
  }

  const duplicateContentIndex = prev.findIndex((m) => {
    const isSameSender = m.senderId === incoming.senderId;
    const isSameThread = m.threadId === incoming.threadId;
    const isSameContent = m.content.trim() === incoming.content.trim();
    return isSameSender && isSameThread && isSameContent;
  });

  if (duplicateContentIndex !== -1) {
    const clone = [...prev];
    if (!incoming.id.startsWith('msg-') && clone[duplicateContentIndex].id.startsWith('msg-')) {
      clone[duplicateContentIndex] = {
        ...clone[duplicateContentIndex],
        ...incoming,
        id: incoming.id,
      };
    }
    return { updated: clone, isNew: false };
  }

  return { updated: [...prev, incoming], isNew: true };
};

export function useChatMessaging(
  initialMessages: ChatMessage[],
  teacher: TeacherUser,
  students: StudentUser[],
  activities: Activity[],
  isAiAutoReplyEnabled: boolean
) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialMessages);

  const handleSendMessage = useCallback(
    async (msgData: {
      threadId: string;
      senderId: string;
      senderName: string;
      senderRole: 'teacher' | 'student' | 'second_teacher';
      senderAvatar?: string;
      recipientId: string;
      recipientName: string;
      content: string;
      activityId?: string;
      activityTitle?: string;
    }) => {
      const now = new Date();
      const formattedDate = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
      const newMsgId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newMsg: ChatMessage = {
        id: newMsgId,
        threadId: msgData.threadId,
        senderId: msgData.senderId,
        senderName: msgData.senderName,
        senderRole: msgData.senderRole as 'teacher' | 'student',
        senderAvatar: msgData.senderAvatar,
        recipientId: msgData.recipientId,
        recipientName: msgData.recipientName,
        content: msgData.content,
        createdAt: formattedDate,
        read: false,
        activityId: msgData.activityId,
        activityTitle: msgData.activityTitle,
      };

      setChatMessages((prev) => mergeChatMessage(prev, newMsg).updated);

      try {
        await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...newMsg,
            createdAtIso: now.toISOString(),
          }),
        });
      } catch (err) {
        console.warn('Erro ao persistir mensagem no Firestore:', err);
      }

      if (
        msgData.senderRole === 'student' &&
        isAiAutoReplyEnabled &&
        msgData.recipientId !== 'second-teacher'
      ) {
        const studentObj = students.find((s) => s.id === msgData.senderId);
        const cleanTeacherName =
          teacher.name && !teacher.name.toLowerCase().includes('carregando')
            ? teacher.name
            : 'Prof. Gilson Flores';

        try {
          const res = await fetch('/api/gemini/teacher-bot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              studentName: msgData.senderName,
              studentTurma: studentObj?.turma || 'Geral',
              studentTag: studentObj?.tag || 'REGULAR',
              teacherName: cleanTeacherName,
              teacherSubject: teacher.subject || 'Sociologia',
              schoolName: teacher.school || "EEB Prof. Jandira D'Ávila",
              messages: [...chatMessages.filter((m) => m.threadId === msgData.threadId || m.senderId === msgData.senderId || m.recipientId === msgData.senderId), newMsg],
              activities: activities,
              currentMessage: msgData.content,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.reply) {
              const replyNow = new Date();
              const replyDate = `${replyNow.toLocaleDateString('pt-BR')} ${replyNow.toLocaleTimeString(
                'pt-BR',
                { hour: '2-digit', minute: '2-digit' }
              )}`;
              const botMsg: ChatMessage = {
                id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                threadId: msgData.threadId,
                senderId: teacher.id || 'teacher-1',
                senderName: data.teacherName || 'Bob 🤖 (Agente de Atendimento)',
                senderRole: 'teacher',
                senderAvatar: BOBY_AVATAR,
                recipientId: msgData.senderId,
                recipientName: msgData.senderName,
                content: data.reply,
                createdAt: replyDate,
                read: false,
              };

              setChatMessages((prev) => mergeChatMessage(prev, botMsg).updated);

              await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ...botMsg,
                  createdAtIso: replyNow.toISOString(),
                }),
              });
            }
          }
        } catch (botErr) {
          console.warn('Erro ao disparar resposta automática do Boby Sociólogo:', botErr);
        }
      }
    },
    [chatMessages, teacher, students, activities, isAiAutoReplyEnabled]
  );

  const handleMarkThreadAsRead = useCallback(
    (threadId: string, currentRole: 'teacher' | 'student') => {
      setChatMessages((prev) => {
        const unreadMsgs = prev.filter(
          (m) =>
            (m.threadId === threadId || m.recipientId === threadId || m.senderId === threadId) &&
            m.senderRole !== currentRole &&
            !m.read
        );
        if (unreadMsgs.length === 0) return prev;

        fetch('/api/messages', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ threadId, currentRole }),
        }).catch((err) => console.warn('Erro ao marcar mensagens como lidas no Firestore:', err));

        return prev.map((m) => {
          if (
            (m.threadId === threadId || m.recipientId === threadId || m.senderId === threadId) &&
            m.senderRole !== currentRole &&
            !m.read
          ) {
            return { ...m, read: true };
          }
          return m;
        });
      });
    },
    []
  );

  return {
    chatMessages,
    setChatMessages,
    handleSendMessage,
    handleMarkThreadAsRead,
  };
}
