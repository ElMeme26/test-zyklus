/* public/sw.js — Zyklus Service Worker */
/* Maneja notificaciones push nativas en Android/iOS (PWA) */

const CACHE_NAME = 'zyklus-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// Recibir mensaje del cliente y mostrar notificación nativa del SO
self.addEventListener('message', event => {
  if (event.data?.type === 'PUSH_NOTIFICATION') {
    const { title, body, icon, badge, tag } = event.data;
    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon: icon || '/logo192.png',
        badge: badge || '/badge72.png',
        tag: tag || `zyklus-${Date.now()}`,
        vibrate: [200, 100, 200],
        requireInteraction: false,
        data: { url: self.location.origin },
      })
    );
  }
});

// Al tocar la notificación — abrir la app
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.startsWith(url) && 'focus' in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});

// Cache básico para funcionar offline
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
