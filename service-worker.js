const CACHE_PREFIX = 'mantenimiento-compresores-ant-';
const CACHE = CACHE_PREFIX + 'v23';
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
            // Solo borra cachés propios de Compresores (mismo prefijo) — otras PWA
            // ANT (Clima, Puentes Grúa) pueden compartir el mismo origen de GitHub
            // Pages y no deben perder su caché offline por esta actualización.
            .filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE)
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

  // ANT-065 — patrón homologado con Clima (estándar §5.1 y §43):
  // sirve la caché de inmediato y, en paralelo, consulta la red para dejar
  // la caché al día de cara a la próxima apertura. Si todavía no hay nada
  // cacheado para este recurso (primera carga de un archivo nuevo), se
  // espera esta vez la respuesta de red antes de responder.
  e.respondWith(
    caches.match(e.request).then(cached => {
      const networkUpdate = fetch(e.request)
        .then(resp => {
          if (resp && resp.ok) {
            const copy = resp.clone();
            caches.open(CACHE).then(c => c.put(e.request, copy));
          }
          return resp;
        })
        .catch(() => null); // sin conexión: no hay actualización, se sigue con lo cacheado

      if (cached) {
        return cached;
      }

      return networkUpdate.then(resp => {
        if (resp) return resp;
        // Fallback a la app solo para navegación.
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        throw new Error('Recurso no disponible offline');
      });
    })
  );
});
