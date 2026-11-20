const CACHE_PREFIX = 'xqs-media-';
const CACHE_NAME = `${CACHE_PREFIX}20261120a`;
const MAX_ENTRIES = 140;
const assetRoot = new URL('./public/assets/', self.registration.scope).pathname;
const CDN_ROOT = 'https://cdn.jsdelivr.net/gh/xiongqishun9-netizen/xiongqishun9-netizen.github.io@4476a78e14abfcc4b478b078d2a7ad55e5ee5509/public/assets/';
let preferCdn = false;
let cdnRetryAfter = 0;

self.addEventListener('message', (event) => {
  if (event.data?.type === 'XQS_MEDIA_ROUTE') preferCdn = event.data.route === 'cdn';
});

const fetchMedia = async (request, url) => {
  const relative = url.pathname.slice(assetRoot.length);
  if (preferCdn && Date.now() >= cdnRetryAfter && /^(documents|posters|projects)\//.test(relative)) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    try {
      const edge = await fetch(CDN_ROOT + relative, { mode: 'cors', credentials: 'omit', signal: controller.signal });
      if (!edge.ok || !edge.headers.get('Content-Type')?.startsWith('image/')) throw new Error('Unavailable CDN image');
      // Preserve same-origin image behavior and cache keys while streaming unchanged CDN bytes.
      return new Response(edge.body, { headers: {
        'Content-Type': edge.headers.get('Content-Type') || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      } });
    } catch {
      preferCdn = false;
      cdnRetryAfter = Date.now() + 60000;
    } finally { clearTimeout(timer); }
  }
  return fetch(request);
};

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
      return fetchMedia(request, url);
    }
    const response = await fetchMedia(request, url);
    if (response.ok && response.type !== 'opaque') {
      event.waitUntil((async () => {
        await cache.put(request, response.clone());
        const keys = await cache.keys();
        for (const key of keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES))) await cache.delete(key);
      })().catch(() => {}));
    }
    return response;
  })());
});
