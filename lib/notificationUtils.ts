/**
 * Utilitários para Notificações Nativas do Navegador (Chrome Desktop & Mobile) e feedback sonoro.
 */

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
    // Tom agradável de notificação (D5 -> A5)
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {
    // Pode falhar se não houver interação prévia do usuário na janela
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
  if (!isNotificationSupported()) return;

  // Tocar som de notificação
  playNotificationSound();

  if (Notification.permission === 'granted') {
    try {
      const notif = new Notification(title, {
        body: options?.body || '',
        icon: options?.icon || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=250',
        badge: options?.icon || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=250',
        tag: options?.tag || 'chat-notification',
      });

      notif.onclick = () => {
        window.focus();
        if (options?.onClick) {
          options.onClick();
        }
        notif.close();
      };
    } catch (e) {
      console.warn('Erro ao disparar notificação do navegador:', e);
    }
  }
};
