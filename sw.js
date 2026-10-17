/* Aemion's P.R - service worker (offline support). Change V when you release a new version. */
const V = 'aemion-pr-v2.0-cozy-kitty';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // The page itself: network first (so updates arrive), fall back to the saved copy when offline or slow.
  if (req.mode === 'navigate') {
    e.respondWith(
      Promise.race([fetch(req), new Promise((_, rej) => setTimeout(rej, 4000))])
        .then(res => {
          if (res && res.ok) { const copy = res.clone(); caches.open(V).then(c => c.put('index.html', copy)); }
          return res;
        })
        .catch(() => caches.match('index.html').then(hit => hit || caches.match('./')))
    );
    return;
  }

  // Everything else: saved copy first, then network (and save it).
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(V).then(c => c.put(req, copy)); }
      return res;
    }))
  );
});
