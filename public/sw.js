// Service worker mínimo, solo para que el sitio sea instalable como PWA (no hace caché
// propio - estas demos cambian seguido desde el panel, así que siempre tienen que mostrar
// lo último, no una versión guardada).

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {});
