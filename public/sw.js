const CACHE_NAME = 'health-nexus-v1';
const urlsToCache = [
  '/',
  '/src/main.tsx',
  '/src/index.css',
  '/src/App.tsx',
  '/manifest.json'
];

// Install service worker and cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Cached all files');
        self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Cache failed', error);
      })
  );
});

// Activate service worker and clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activated');
      self.clients.claim();
    })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          console.log('Service Worker: Serving from cache', event.request.url);
          return response;
        }

        console.log('Service Worker: Fetching from network', event.request.url);
        return fetch(event.request).then((response) => {
          // Don't cache if not a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch(() => {
        // Offline fallback - serve cached index.html for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
        throw new Error('Offline and no cached response available');
      })
  );
});

// Background sync event
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(syncPendingData());
  }
});

// Sync pending offline data to Supabase
async function syncPendingData() {
  console.log('Service Worker: Starting data sync...');
  
  try {
    // Open IndexedDB to get pending operations
    const db = await openDB();
    const transaction = db.transaction(['pendingOperations'], 'readonly');
    const store = transaction.objectStore('pendingOperations');
    const pendingOps = await getAllFromStore(store);
    
    console.log('Service Worker: Found pending operations:', pendingOps.length);
    
    for (const operation of pendingOps) {
      try {
        await syncOperation(operation);
        // Remove from pending after successful sync
        await removeFromPending(operation.id);
        console.log('Service Worker: Synced operation', operation.id);
      } catch (error) {
        console.error('Service Worker: Failed to sync operation', operation.id, error);
      }
    }
    
    console.log('Service Worker: Data sync completed');
  } catch (error) {
    console.error('Service Worker: Data sync failed', error);
  }
}

// Helper function to open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('HealthNexusOfflineDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pendingOperations')) {
        const store = db.createObjectStore('pendingOperations', { keyPath: 'id' });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

// Helper function to get all items from store
function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// Helper function to sync individual operation
async function syncOperation(operation) {
  const supabaseUrl = 'https://notzlgtnuncyribdjzen.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vdHpsZ3RudW5jeXJpYmRqemVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MDIzMDYsImV4cCI6MjA2NTQ3ODMwNn0.-6vyAy86TR9W8LPkTphGUG22oteHD1SycSogyqqb5b0';
  
  const response = await fetch(`${supabaseUrl}/rest/v1/${operation.table}`, {
    method: operation.method || 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(operation.data)
  });
  
  if (!response.ok) {
    throw new Error(`Failed to sync: ${response.statusText}`);
  }
}

// Helper function to remove synced operation from pending
async function removeFromPending(operationId) {
  const db = await openDB();
  const transaction = db.transaction(['pendingOperations'], 'readwrite');
  const store = transaction.objectStore('pendingOperations');
  await store.delete(operationId);
}