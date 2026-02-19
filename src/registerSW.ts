// src/registerSW.ts
// Registra el Service Worker para push notifications nativas
// Importar en main.tsx: import './registerSW';

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
