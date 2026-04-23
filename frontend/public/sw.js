const CACHE = 'gigclear-v1';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.add('/')));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then(r => { putCache(request, r.clone()); return r; })
        .catch(() => caches.match('/') ?? caches.match('/index.html'))
    );
    return;
  }

  // Hashed static assets are immutable — serve from cache if available
  if (/\.(js|css|png|svg|jpg|jpeg|webp|woff2?|ico)(\?.*)?$/.test(url.pathname)) {
    e.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(r => { putCache(request, r.clone()); return r; });
      })
    );
    return;
  }

  // Everything else: network first, fall back to cache
  e.respondWith(
    fetch(request)
      .then(r => { if (r.ok) putCache(request, r.clone()); return r; })
      .catch(() => caches.match(request))
  );
});

function putCache(req, res) {
  if (!res || res.status !== 200 || res.type === 'opaque') return;
  caches.open(CACHE).then(c => c.put(req, res));
}
