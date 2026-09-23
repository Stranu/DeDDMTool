// Service worker: offline-first cache dei soli asset statici dell'app.
// I dati utente (condizioni/magie importate, iniziativa) NON stanno qui: vivono in IndexedDB.
const CACHE = 'dm-toolkit-v13';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/app.js',
  './js/db.js',
  './js/backup.js',
  './js/csv.js',
  './js/util.js',
  './js/views/initiative.js',
  './js/views/conditions.js',
  './js/views/spells.js',
  './js/views/monsters.js',
  './js/views/player.js',
  './js/views/settings.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Forza il recupero dalla rete durante un rilascio: il nuovo worker
    // non deve riempire la nuova cache con risposte HTTP obsolete.
    const requests = ASSETS.map((asset) => new Request(asset, { cache: 'reload' }));
    await cache.addAll(requests);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  e.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((res) => {
          // Cache runtime degli asset stessa-origine (per aggiornamenti a caldo).
          if (res.ok && new URL(request.url).origin === self.location.origin) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});
