const VERSION      = 'v104';
const STATIC_CACHE = `komisses-static-${VERSION}`;
const HTML_CACHE   = `komisses-html-${VERSION}`;

self.addEventListener('install', e => {
  e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== STATIC_CACHE && k !== HTML_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;

  // Let Firebase requests go straight to the network
  if (req.url.includes('firebasedatabase') || req.url.includes('firebaseapp')) return;

  // Network-first for HTML navigation
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(response => {
          const copy = response.clone();
          caches.open(HTML_CACHE).then(c => c.put(req, copy));
          return response;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Cache-first for static assets (CSS, JS, fonts, images, JSON)
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(response => {
        if (response.ok && req.method === 'GET') {
          const copy = response.clone();
          caches.open(STATIC_CACHE).then(c => c.put(req, copy));
        }
        return response;
      });
    })
  );
});
