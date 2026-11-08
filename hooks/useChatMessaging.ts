'use client';

import { useState, useCallback } from 'react';
import { ChatMessage, StudentUser, TeacherUser, Activity } from '@/lib/types';

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
              messages: [...chatMessages, newMsg],
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
                senderName: data.teacherName || `Boby Sociólogo 🤖 (${cleanTeacherName})`,
                senderRole: 'teacher',
                senderAvatar: teacher.avatarUrl,
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
