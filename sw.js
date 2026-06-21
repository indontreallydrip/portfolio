/* Service worker — Manuel Di Pasquale portfolio
   Strategia: network-first per HTML e dati (fresco quando online, cache offline),
   cache-first per asset statici. Solo same-origin: Behance/Font esterni passano diretti. */
const CACHE = 'mdp-v1';
const CORE = ['./', './index.html', './portfolio-data.json', './manifest.json',
  './icon-192.png', './icon-512.png', './preview.jpg', './cv-it.pdf', './cv-en.pdf'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(CORE.map(u => c.add(new Request(u, { cache: 'reload' })))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // non toccare CDN Behance, Google Fonts, ecc.

  const isDoc = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('index.html');
  const isData = url.pathname.endsWith('portfolio-data.json');

  if (isDoc || isData) {
    e.respondWith(
      fetch(req)
        .then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return r; })
        .catch(() => caches.match(req).then(m => m || caches.match('./index.html')))
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(m => m || fetch(req).then(r => {
      const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return r;
    }).catch(() => m))
  );
});
