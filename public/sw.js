// Service Worker disabled temporarily to avoid caching issues
console.log('Service Worker: Disabled - no caching active');

// Immediately activate and claim all clients
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing (no-cache mode)...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating (no-cache mode)...');
  event.waitUntil(
    // Clear all existing caches
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('Service Worker: Deleting cache', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('Service Worker: All caches cleared');
      self.clients.claim();
    })
  );
});

// Pass through all requests without caching
self.addEventListener('fetch', (event) => {
  // Just fetch from network, no caching
  event.respondWith(fetch(event.request));
});