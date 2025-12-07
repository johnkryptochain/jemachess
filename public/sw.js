const CACHE_NAME = 'jemachess-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  // Icons
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
  // Classic piece theme
  '/pieces/classic/white-king.svg',
  '/pieces/classic/white-queen.svg',
  '/pieces/classic/white-rook.svg',
  '/pieces/classic/white-bishop.svg',
  '/pieces/classic/white-knight.svg',
  '/pieces/classic/white-pawn.svg',
  '/pieces/classic/black-king.svg',
  '/pieces/classic/black-queen.svg',
  '/pieces/classic/black-rook.svg',
  '/pieces/classic/black-bishop.svg',
  '/pieces/classic/black-knight.svg',
  '/pieces/classic/black-pawn.svg',
  // Greek piece theme
  '/pieces/greek/white-king.svg',
  '/pieces/greek/white-queen.svg',
  '/pieces/greek/white-rook.svg',
  '/pieces/greek/white-bishop.svg',
  '/pieces/greek/white-knight.svg',
  '/pieces/greek/white-pawn.svg',
  '/pieces/greek/black-king.svg',
  '/pieces/greek/black-queen.svg',
  '/pieces/greek/black-rook.svg',
  '/pieces/greek/black-bishop.svg',
  '/pieces/greek/black-knight.svg',
  '/pieces/greek/black-pawn.svg',
  // Egyptian piece theme
  '/pieces/egyptian/white-king.svg',
  '/pieces/egyptian/white-queen.svg',
  '/pieces/egyptian/white-rook.svg',
  '/pieces/egyptian/white-bishop.svg',
  '/pieces/egyptian/white-knight.svg',
  '/pieces/egyptian/white-pawn.svg',
  '/pieces/egyptian/black-king.svg',
  '/pieces/egyptian/black-queen.svg',
  '/pieces/egyptian/black-rook.svg',
  '/pieces/egyptian/black-bishop.svg',
  '/pieces/egyptian/black-knight.svg',
  '/pieces/egyptian/black-pawn.svg',
  // Viking piece theme
  '/pieces/viking/white-king.svg',
  '/pieces/viking/white-queen.svg',
  '/pieces/viking/white-rook.svg',
  '/pieces/viking/white-bishop.svg',
  '/pieces/viking/white-knight.svg',
  '/pieces/viking/white-pawn.svg',
  '/pieces/viking/black-king.svg',
  '/pieces/viking/black-queen.svg',
  '/pieces/viking/black-rook.svg',
  '/pieces/viking/black-bishop.svg',
  '/pieces/viking/black-knight.svg',
  '/pieces/viking/black-pawn.svg'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache assets one by one to handle missing files gracefully
      return Promise.allSettled(
        STATIC_ASSETS.map((asset) =>
          cache.add(asset).catch((err) => {
            console.warn(`Failed to cache: ${asset}`, err);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip WebRTC signaling requests (PeerJS)
  if (event.request.url.includes('peerjs')) return;

  // Skip chrome-extension and other non-http(s) requests
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((response) => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200) {
          return response;
        }

        // Don't cache opaque responses (cross-origin without CORS)
        if (response.type === 'opaque') {
          return response;
        }

        // Clone the response
        const responseToCache = response.clone();

        // Cache the fetched response
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      }).catch(() => {
        // Return offline fallback for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      });
    })
  );
});

// Handle messages from the app
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }

  // Handle cache update request
  if (event.data === 'updateCache') {
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        STATIC_ASSETS.map((asset) =>
          cache.add(asset).catch((err) => {
            console.warn(`Failed to update cache: ${asset}`, err);
          })
        )
      );
    });
  }
});