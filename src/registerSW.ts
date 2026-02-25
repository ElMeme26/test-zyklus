/** Registra el Service Worker para notificaciones push y caché offline. */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(reg => {
        console.log('[Zyklus SW] Registrado:', reg.scope);
      })
      .catch(err => {
        console.warn('[Zyklus SW] Error al registrar:', err);
      });
  });
}
