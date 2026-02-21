/* public/sw.js — Zyklus Service Worker */
/* Maneja notificaciones push nativas en Android/iOS (PWA) */

const CACHE_NAME = 'zyklus-v3'; // Es importante cambiar el nombre para invalidar cache en nuevas versiones 

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

// Cache básico para funcionar offline.
// IMPORTANTE: Solo cachea GET y solo si la respuesta es exitosa.
// Nunca intercepta peticiones a la API de Supabase para evitar datos stale.
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // No interceptar: API calls, hot-reload de Vite, WebSockets
  if (
    event.request.method !== 'GET' ||
    url.pathname.startsWith('/@') ||          // Vite HMR
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('googleapis.com') ||
    event.request.headers.get('accept')?.includes('text/event-stream')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Solo cachear respuestas válidas de origen propio
        if (
          response.ok &&
          response.type === 'basic' &&
          url.origin === self.location.origin
        ) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(() => cached || new Response('Offline', { status: 503 }));
    })
  );
});