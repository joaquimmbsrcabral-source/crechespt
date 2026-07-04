/* Service Worker — Creches.app
 * Estratégia conservadora:
 *  - Navegações: network-first (conteúdo sempre fresco), fallback cache → /offline.html
 *  - Assets estáticos (css/js/img/manifest): stale-while-revalidate
 *  - Nunca intercepta /admin, /api nem pedidos cross-origin (Firebase, tiles, etc.)
 */
const VERSION = 'v1-2026-07-03';
const STATIC_CACHE = `static-${VERSION}`;
const PAGES_CACHE = `pages-${VERSION}`;

const PRECACHE = [
  '/offline.html',
  '/app.css',
  '/favicon.svg',
  '/icon-192.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== STATIC_CACHE && k !== PAGES_CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;            // cross-origin: não tocar
  if (url.pathname.startsWith('/admin')) return;               // admin: sempre rede
  if (url.pathname.startsWith('/api/')) return;                // funções: sempre rede
  if (url.pathname.startsWith('/_vercel')) return;             // analytics

  // Navegações (HTML): network-first
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(PAGES_CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then((hit) => hit || caches.match('/offline.html'))
        )
    );
    return;
  }

  // Assets estáticos: stale-while-revalidate
  if (/\.(css|js|png|jpg|svg|webmanifest|woff2?)$/.test(url.pathname)) {
    e.respondWith(
      caches.open(STATIC_CACHE).then(async (c) => {
        const hit = await c.match(req);
        const fetchPromise = fetch(req)
          .then((res) => {
            if (res.ok) c.put(req, res.clone());
            return res;
          })
          .catch(() => hit);
        return hit || fetchPromise;
      })
    );
  }
});
