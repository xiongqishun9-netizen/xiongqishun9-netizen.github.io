const CACHE_PREFIX = 'xqs-media-';
const CACHE_NAME = `${CACHE_PREFIX}20261120a`;
const MAX_ENTRIES = 140;
const assetRoot = new URL('./public/assets/', self.registration.scope).pathname;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

// Cache only viewed images and fonts. HTML, scripts and video ranges stay on the network.
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || request.headers.has('range') ||
      url.origin !== self.location.origin || !url.pathname.startsWith(assetRoot) ||
      !/\.(png|jpe?g|webp|svg|woff2?|ttf)$/i.test(url.pathname)) return;

  event.respondWith((async () => {
    let cache;
    try {
      cache = await caches.open(CACHE_NAME);
      const hit = await cache.match(request);
      if (hit) return hit;
    } catch {
      return fetch(request);
    }
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') {
      event.waitUntil((async () => {
        await cache.put(request, response.clone());
        const keys = await cache.keys();
        for (const key of keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES))) await cache.delete(key);
      })().catch(() => {}));
    }
    return response;
  })());
});
