// Service Worker para Push Notifications no Smartphone e Desktop
// EEB Prof. Jandira D'Ávila - Sociologia (Prof. Gilson Flores)

const CACHE_NAME = 'sociologia-notif-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        )
      ),
    ])
  );
});

// Listener para eventos de Push enviados pelo servidor
self.addEventListener('push', (event) => {
  let data = {
    title: '📢 Notificação - Prof. Gilson Flores',
    body: 'Você tem uma nova atualização no Portal de Sociologia.',
    icon: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=250',
    badge: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=250',
    tag: `push-msg-${Date.now()}`,
    data: { url: '/' },
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch (e) {
      data.body = event.data.text() || data.body;
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=250',
    badge: data.badge || data.icon,
    tag: data.tag || `notif-${Date.now()}`,
    vibrate: [200, 100, 200, 100, 200],
    data: data.data || { url: '/' },
    requireInteraction: false,
    actions: data.actions || [
      { action: 'open', title: '👀 Abrir Portal' },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Listener para mensagens enviadas pela thread principal da aplicação
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    const notificationOptions = {
      body: options?.body || '',
      icon: options?.icon || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=250',
      badge: options?.badge || options?.icon || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=250',
      tag: options?.tag || `notif-${Date.now()}`,
      vibrate: [200, 100, 200, 100, 200],
      data: options?.data || { url: '/' },
      requireInteraction: false,
    };

    event.waitUntil(self.registration.showNotification(title, notificationOptions));
  }
});

// Ao clicar na notificação no smartphone/desktop, focar na aba ou abrir o portal
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se já houver uma aba aberta, focar nela
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            data: event.notification.data,
            tag: event.notification.tag,
          });
          return client.focus();
        }
      }
      // Se não houver aba aberta, abrir o portal no navegador
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
