// Elyon AI — Service Worker
// Кэшируем оболочку сайта для быстрого старта и офлайн-fallback

const CACHE = 'elyon-v1';
const SHELL = [
  '/',
  '/index.html',
  '/auth.html',
  '/app.html',
  '/manifest.json',
  '/elyon_logo.png',
];

// Установка: кэшируем оболочку
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

// Активация: удаляем старые кэши
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: Network first, fallback to cache
self.addEventListener('fetch', event => {
  // Только GET запросы к нашему origin
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Кладём свежую копию в кэш
        const clone = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
