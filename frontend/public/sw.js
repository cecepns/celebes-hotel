// Celebes Hotel (Royalti Reward HCH) - Progressive Web App Service Worker
// Version 2: Network-First strategy for HTML to prevent stale chunk 404/MIME errors on deployments
const CACHE_NAME = 'celebes-hotel-v2';

const STATIC_ASSETS = [
  '/manifest.json',
  '/logo-hch.jpeg',
  '/logo-hch.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/favicon.ico'
];

// Install: pre-cache static branding assets and activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: Purge ALL older caches (like celebes-hotel-v1) and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Clearing obsolete cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Listen for SKIP_WAITING message from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch Strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ignore non-GET and API requests (always network)
  if (request.method !== 'GET' || request.url.includes('/api/')) {
    return;
  }

  // 1. Navigation / HTML Document requests: ALWAYS NETWORK-FIRST
  // Crucial: ensures users immediately get the new index.html with fresh JS/CSS chunk hashes on deployment.
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // If offline, fallback to cached index.html
          const cached = await caches.match(request);
          if (cached) return cached;
          const fallback = await caches.match('/index.html');
          if (fallback) return fallback;
          return new Response('Aplikasi sedang offline. Silakan periksa koneksi internet Anda.', {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        })
    );
    return;
  }

  // 2. Hashed build assets (/assets/index-*.js, /assets/index-*.css)
  // Cache-first, then network. NEVER fallback to index.html to prevent MIME type mismatch!
  if (request.url.includes('/assets/')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 3. Other static media & assets (images, icons, manifest)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      return (
        cachedResponse ||
        fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
      );
    })
  );
});
