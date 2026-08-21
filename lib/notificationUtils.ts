/**
 * Utilitários para Notificações Nativas do Navegador (Chrome Desktop & Mobile), feedback sonoro e monitoramento de prazos/mensagens.
 */

import { Activity, StudentUser } from '@/lib/types';
import { canStudentAccessActivity, isStudentPNE } from '@/lib/studentUtils';

export const isNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

export const getNotificationPermission = (): NotificationPermission => {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
};

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isNotificationSupported()) return 'denied';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.warn('Erro ao solicitar permissão de notificação no navegador:', error);
    return 'denied';
  }
};

export const playNotificationSound = () => {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Tom agradável de notificação (D5 -> A5 -> D6)
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);
    osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.16);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    // Silently handle if audio context is blocked prior to user gesture
  }

  // Tentar vibração em dispositivos móveis (Android Chrome)
  if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
    try {
      navigator.vibrate([100, 50, 100]);
    } catch (e) {}
  }
};

export const sendBrowserNotification = (
  title: string,
  options?: {
    body?: string;
    icon?: string;
    tag?: string;
    data?: any;
    onClick?: () => void;
  }
) => {
  // Sempre tocar som e vibração para alertar o usuário
  playNotificationSound();

  if (!isNotificationSupported()) return;

  if (Notification.permission === 'granted') {
    try {
      const notif = new Notification(title, {
        body: options?.body || '',
        icon: options?.icon || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=250',
        badge: options?.icon || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=250',
        tag: options?.tag || `notif-${Date.now()}`,
      });

      notif.onclick = () => {
        window.focus();
        if (options?.onClick) {
          options.onClick();
        }
        notif.close();
      };
    } catch (e) {
      console.warn('Erro ao disparar notificação nativa do navegador:', e);
    }
  }
};

/**
 * Analisa uma string de prazo e calcula se está acabando (dentro das próximas 48 horas).
 */
export const parseDeadlineRemaining = (deadlineStr?: string): {
  isDueSoon: boolean;
  isExpired: boolean;
  hoursRemaining: number | null;
  displayLabel: string;
} => {
  if (!deadlineStr || !deadlineStr.trim()) {
    return { isDueSoon: false, isExpired: false, hoursRemaining: null, displayLabel: 'Sem prazo' };
  }

  const clean = deadlineStr.trim().toLowerCase();
  const now = new Date();

  // Tratamento de termos relativos "hoje" e "amanhã"
  if (clean.includes('hoje')) {
    return { isDueSoon: true, isExpired: false, hoursRemaining: 8, displayLabel: 'Vence Hoje!' };
  }
  if (clean.includes('amanhã') || clean.includes('amanha')) {
    return { isDueSoon: true, isExpired: false, hoursRemaining: 24, displayLabel: 'Vence Amanhã!' };
  }

  // Extrair data no formato DD/MM/YYYY ou DD/MM
  let targetDate: Date | null = null;
  const matchFull = deadlineStr.match(/\b(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/(20\d\d)\b/);
  if (matchFull) {
    const [, d, m, y] = matchFull;
    // Checar se há hora (HH:mm)
    const matchTime = deadlineStr.match(/\b([01]\d|2[0-3]):([0-5]\d)\b/);
    const hour = matchTime ? parseInt(matchTime[1], 10) : 23;
    const min = matchTime ? parseInt(matchTime[2], 10) : 59;
    targetDate = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10), hour, min);
  } else {
    const matchShort = deadlineStr.match(/\b(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\b/);
    if (matchShort) {
      const [, d, m] = matchShort;
      const currentYear = now.getFullYear();
      targetDate = new Date(currentYear, parseInt(m, 10) - 1, parseInt(d, 10), 23, 59);
    }
  }

  if (!targetDate || isNaN(targetDate.getTime())) {
    // Tentar ISO
    const parsedIso = Date.parse(deadlineStr);
    if (!isNaN(parsedIso)) {
      targetDate = new Date(parsedIso);
    }
  }

  if (!targetDate) {
    return { isDueSoon: false, isExpired: false, hoursRemaining: null, displayLabel: deadlineStr };
  }

  const diffMs = targetDate.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 0) {
    return { isDueSoon: false, isExpired: true, hoursRemaining: Math.round(diffHours), displayLabel: 'Prazo Encerrado' };
  }

  if (diffHours <= 48) {
    return {
      isDueSoon: true,
      isExpired: false,
      hoursRemaining: Math.max(1, Math.round(diffHours)),
      displayLabel: diffHours <= 24 ? `Vence em ${Math.max(1, Math.round(diffHours))}h!` : 'Vence em 2 dias!',
    };
  }

  return {
    isDueSoon: false,
    isExpired: false,
    hoursRemaining: Math.round(diffHours),
    displayLabel: deadlineStr,
  };
};

/**
 * Verifica as atividades do aluno e dispara notificação se houver atividade pendente com prazo acabando.
 */
export const checkAndNotifyApproachingDeadlines = (
  activities: Activity[],
  student: StudentUser | null,
  showGlobalStatus?: (type: 'success' | 'error' | 'info', msg: string) => void
) => {
  if (!student) return;

  const todayStr = new Date().toISOString().split('T')[0];
  const isPne = isStudentPNE(student);

  activities.forEach((act) => {
    // Verificar se atividade é da turma do aluno
    if (!canStudentAccessActivity(act.turma, student.turma)) return;

    // Se a atividade for adaptada e o aluno não for PNE, não é para ele
    if (act.isAdapted && !isPne) return;

    // Verificar se já foi enviada pelo aluno
    const isSubmitted = act.submissions?.some(
      (s) => s.studentId === student.id || s.matricula === student.matricula || s.studentName === student.fullName
    );
    if (isSubmitted) return;

    // Verificar prazo
    const remaining = parseDeadlineRemaining(act.deadline);
    if (remaining.isDueSoon && !remaining.isExpired) {
      const storageKey = `notif_deadline_${act.id}_${student.id}_${todayStr}`;
      if (typeof window !== 'undefined') {
        const alreadyNotified = localStorage.getItem(storageKey);
        if (alreadyNotified) return;

        localStorage.setItem(storageKey, 'true');
      }

      sendBrowserNotification(`⏳ Prazo de Atividade Acabando!`, {
        body: `A atividade "${act.title}" (${remaining.displayLabel}) precisa ser enviada. Não perca o prazo!`,
        tag: `deadline-${act.id}`,
      });

      if (showGlobalStatus) {
        showGlobalStatus('info', `⏳ Atenção: A atividade "${act.title}" ${remaining.displayLabel}!`);
      }
    }
  });
};

/**
 * Dispara notificação de nova atividade para o aluno.
 */
export const notifyNewActivityForStudent = (
  activity: Activity,
  student: StudentUser,
  showGlobalStatus?: (type: 'success' | 'error' | 'info', msg: string) => void
) => {
  if (!canStudentAccessActivity(activity.turma, student.turma)) return;

  const isPne = isStudentPNE(student);
  if (activity.isAdapted && !isPne) return;

  sendBrowserNotification(`📢 Nova Atividade: ${activity.title}`, {
    body: `Turma ${activity.turma} • Prazo: ${activity.deadline || 'A definir'} • Valor: ${activity.maxGrade || 10} pts`,
    tag: `new-activity-${activity.id}`,
  });

  if (showGlobalStatus) {
    showGlobalStatus('info', `📢 Nova atividade disponível: "${activity.title}"!`);
  }
};

/**
 * Dispara notificação de prorrogação de prazo da atividade para o aluno.
 */
export const notifyDeadlineExtendedForStudent = (
  activity: Activity,
  student: StudentUser,
  showGlobalStatus?: (type: 'success' | 'error' | 'info', msg: string) => void
) => {
  if (!canStudentAccessActivity(activity.turma, student.turma)) return;

  const isPne = isStudentPNE(student);
  if (activity.isAdapted && !isPne) return;

  sendBrowserNotification(`⏳ Prazo Prorrogado: ${activity.title}`, {
    body: `O prazo da atividade foi prorrogado para: ${activity.deadline || 'Nova data estipulada'}. Aproveite para enviar!`,
    tag: `deadline-extended-${activity.id}-${activity.deadline}`,
  });

  if (showGlobalStatus) {
    showGlobalStatus('info', `⏳ Prazo da atividade "${activity.title}" prorrogado para ${activity.deadline}!`);
  }
};

