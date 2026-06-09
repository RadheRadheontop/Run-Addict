const CACHE_NAME = 'run-addict-v5';
const BASE = new URL('.', self.location).pathname.replace(/\/+$/, '');

const CACHE_ASSETS = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/admin.html',
  BASE + '/css/styles.css',
  BASE + '/js/app.js',
  BASE + '/js/admin.js',
  BASE + '/manifest.json',
  BASE + '/assets/icon-192.png',
  BASE + '/assets/icon-512.png',
  BASE + '/assets/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
