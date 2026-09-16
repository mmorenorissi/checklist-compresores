const CACHE = 'mantenimiento-compresores-ant-v4';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(k => k !== CACHE)
            .map(k => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // No interceptar solicitudes externas, por ejemplo Google Apps Script.
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(e.request).then(cached =>
      cached ||
      fetch(e.request)
        .then(resp => {
          if (resp && resp.ok) {
            const copy = resp.clone();
            caches.open(CACHE).then(c => c.put(e.request, copy));
          }
          return resp;
        })
        .catch(() => {
          // Fallback a la app solo para navegación.
          if (e.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          throw new Error('Recurso no disponible offline');
        })
    )
  );
});
