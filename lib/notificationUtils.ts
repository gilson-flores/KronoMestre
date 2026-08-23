/**
 * Utilitários para Notificações Nativas do Navegador e Push em Smartphones (Chrome Mobile & Desktop), feedback sonoro e monitoramento de prazos/mensagens.
 */

import { Activity, StudentUser } from '@/lib/types';
import { canStudentAccessActivity, isStudentPNE } from '@/lib/studentUtils';

let swRegistration: ServiceWorkerRegistration | null = null;

/**
 * Registra o Service Worker para habilitar Notificações Push no Smartphone e Desktop.
 */
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    swRegistration = reg;
    return reg;
  } catch (err) {
    console.warn('Não foi possível registrar o Service Worker para Push Notifications:', err);
    return null;
  }
};

export const isNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && ('Notification' in window || 'serviceWorker' in navigator);
};

export const getNotificationPermission = (): NotificationPermission => {
  if (!isNotificationSupported()) return 'denied';
  return typeof Notification !== 'undefined' ? Notification.permission : 'default';
};

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (typeof window === 'undefined') return 'denied';

  // Pré-registrar Service Worker no smartphone para garantir compatibilidade
  if ('serviceWorker' in navigator) {
    try {
      await registerServiceWorker();
    } catch (e) {
      console.warn('Erro ao inicializar SW antes da permissão:', e);
    }
  }

  if (!('Notification' in window)) {
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Pequeno toque sonoro de confirmação
      playNotificationSound();
    }
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

  // Vibração nativa em smartphones (Android)
  if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
    try {
      navigator.vibrate([150, 80, 150]);
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

  if (typeof window === 'undefined' || !('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    const defaultIcon = 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=250';
    const notifOptions: any = {
      body: options?.body || '',
      icon: options?.icon || defaultIcon,
      badge: options?.icon || defaultIcon,
      tag: options?.tag || `notif-${Date.now()}`,
      vibrate: [200, 100, 200],
      data: options?.data || { url: '/' },
    };

    // 1. Tentar exibir via ServiceWorkerRegistration (Padrão obrigatório no Android / Smartphones)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg && reg.showNotification) {
          reg.showNotification(title, notifOptions).catch(() => {
            // Fallback para construtor padrão
            tryShowStandardNotification(title, notifOptions, options?.onClick);
          });
        } else {
          tryShowStandardNotification(title, notifOptions, options?.onClick);
        }
      }).catch(() => {
        tryShowStandardNotification(title, notifOptions, options?.onClick);
      });
    } else {
      tryShowStandardNotification(title, notifOptions, options?.onClick);
    }
  }
};

const tryShowStandardNotification = (
  title: string,
  notifOptions: any,
  onClick?: () => void
) => {
  try {
    const notif = new Notification(title, notifOptions);
    notif.onclick = () => {
      window.focus();
      if (onClick) {
        onClick();
      }
      notif.close();
    };
  } catch (e) {
    // Alguns navegadores móveis desativam o construtor direto new Notification
    console.warn('Notificação de navegador direta não suportada:', e);
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

/**
 * Dispara notificação de correção/nota lançada ou feedback devolvido pelo Professor ADM para o aluno.
 */
export const notifyGradeOrFeedbackForStudent = (
  activityTitle: string,
  grade: number,
  maxGrade: number = 10,
  feedback?: string,
  isReturned?: boolean,
  showGlobalStatus?: (type: 'success' | 'error' | 'info', msg: string) => void
) => {
  const title = isReturned
    ? `↩️ Atividade Devolvida para Revisão: ${activityTitle}`
    : `⭐ Nota Lançada pelo Prof. Gilson: ${activityTitle}`;

  const body = isReturned
    ? `O professor solicitou ajustes na sua resposta. Feedback: "${feedback || 'Verifique as observações no portal.'}"`
    : `Sua nota foi ${grade} de ${maxGrade} pts! ${feedback ? `Feedback: "${feedback}"` : 'Confira a correção no portal.'}`;

  sendBrowserNotification(title, {
    body,
    tag: `grade-${activityTitle}-${Date.now()}`,
  });

  if (showGlobalStatus) {
    showGlobalStatus('info', title);
  }
};


