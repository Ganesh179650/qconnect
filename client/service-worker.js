const CACHE_NAME = 'instant-screenshare-v1.0.0';
const OFFLINE_URL = '/offline.html';

// Files to cache for offline functionality
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/join.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  '/offline.html',
  // External libraries (cached with network-first strategy)
  'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js',
  'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js',
  'https://cdn.socket.io/4.7.4/socket.io.min.js'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install event triggered');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('[Service Worker] Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[Service Worker] Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate event triggered');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] Activation complete');
        return self.clients.claim();
      })
      .catch((error) => {
        console.error('[Service Worker] Activation failed:', error);
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip external API calls and WebSocket connections
  if (url.origin !== self.location.origin && 
      !url.hostname.includes('cdn.jsdelivr.net') && 
      !url.hostname.includes('unpkg.com')) {
    return;
  }
  
  event.respondWith(handleRequest(request));
});

// Request handling with different strategies
async function handleRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Strategy 1: Network-first for dynamic content
    if (isDynamicContent(url)) {
      return await networkFirst(request);
    }
    
    // Strategy 2: Cache-first for static assets
    if (isStaticAsset(url)) {
      return await cacheFirst(request);
    }
    
    // Strategy 3: Network-only for real-time features
    if (isRealTimeFeature(url)) {
      return await networkOnly(request);
    }
    
    // Default: Cache-first with network fallback
    return await cacheFirst(request);
    
  } catch (error) {
    console.error('[Service Worker] Request handling failed:', error);
    return await getOfflineResponse(request);
  }
}

// Cache-first strategy
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    console.log('[Service Worker] Serving from cache:', request.url);
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
      console.log('[Service Worker] Cached new resource:', request.url);
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[Service Worker] Network request failed:', error);
    throw error;
  }
}

// Network-first strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
      console.log('[Service Worker] Updated cache:', request.url);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Network-only strategy
async function networkOnly(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    console.error('[Service Worker] Network-only request failed:', error);
    throw error;
  }
}

// Get offline response
async function getOfflineResponse(request) {
  const url = new URL(request.url);
  
  // Return offline page for navigation requests
  if (request.mode === 'navigate') {
    const offlineResponse = await caches.match(OFFLINE_URL);
    if (offlineResponse) {
      return offlineResponse;
    }
  }
  
  // Return fallback for specific asset types
  if (url.pathname.endsWith('.js')) {
    return new Response('console.log("Offline: Script not available");', {
      headers: { 'Content-Type': 'application/javascript' }
    });
  }
  
  if (url.pathname.endsWith('.css')) {
    return new Response('/* Offline: Styles not available */', {
      headers: { 'Content-Type': 'text/css' }
    });
  }
  
  // Default offline response
  return new Response('Offline - No network connection', {
    status: 503,
    statusText: 'Service Unavailable'
  });
}

// Helper functions to determine request type
function isStaticAsset(url) {
  return url.pathname.includes('.') && 
         (url.pathname.endsWith('.css') || 
          url.pathname.endsWith('.js') || 
          url.pathname.endsWith('.png') || 
          url.pathname.endsWith('.jpg') || 
          url.pathname.endsWith('.svg') || 
          url.pathname.endsWith('.ico') ||
          url.pathname.endsWith('.json'));
}

function isDynamicContent(url) {
  return url.pathname === '/' || 
         url.pathname === '/index.html' || 
         url.pathname === '/join.html' ||
         url.pathname.includes('/api/');
}

function isRealTimeFeature(url) {
  return url.pathname.includes('/socket.io/') ||
         url.searchParams.has('session');
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    // Sync any pending actions when back online
    console.log('[Service Worker] Performing background sync');
    
    // Get all clients and notify them
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC',
        data: { timestamp: Date.now() }
      });
    });
    
  } catch (error) {
    console.error('[Service Worker] Background sync failed:', error);
  }
}

// Push notifications (optional feature)
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push event received');
  
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'New screen share invitation',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: 'screenshare-notification',
      renotify: true,
      requireInteraction: false,
      actions: [
        {
          action: 'join',
          title: 'Join Now'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ],
      data: {
        sessionId: data.sessionId,
        url: data.url
      }
    };
    
    event.waitUntil(
      self.registration.showNotification(
        data.title || 'Screen Share Invitation',
        options
      )
    );
  }
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'join') {
    // Open the app to join the session
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
        .then((windowClient) => {
          if (windowClient) {
            return windowClient.focus();
          }
        })
        .catch(() => {
          // Fallback: open new window
          return clients.openWindow(event.notification.data.url);
        })
    );
  } else if (event.action === 'dismiss') {
    // Just close the notification
    return;
  } else {
    // Default: open the app
    event.waitUntil(
      clients.matchAll()
        .then((clientList) => {
          for (const client of clientList) {
            if (client.url === '/' && 'focus' in client) {
              return client.focus();
            }
          }
          return clients.openWindow('/');
        })
    );
  }
});

// Message handling from main thread
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_UPDATE') {
    // Update specific cache entry
    event.waitUntil(
      caches.open(CACHE_NAME)
        .then((cache) => {
          return cache.add(event.data.url);
        })
    );
  }
});

// Periodic background sync (Chrome 80+)
self.addEventListener('periodicsync', (event) => {
  console.log('[Service Worker] Periodic sync triggered:', event.tag);
  
  if (event.tag === 'periodic-sync') {
    event.waitUntil(doPeriodicSync());
  }
});

async function doPeriodicSync() {
  try {
    // Periodic maintenance tasks
    console.log('[Service Worker] Performing periodic sync');
    
    // Clean up old caches
    const cacheNames = await caches.keys();
    const oldCaches = cacheNames.filter(name => name !== CACHE_NAME);
    
    await Promise.all(
      oldCaches.map(name => caches.delete(name))
    );
    
    console.log('[Service Worker] Periodic sync completed');
    
  } catch (error) {
    console.error('[Service Worker] Periodic sync failed:', error);
  }
}

// Error handling
self.addEventListener('error', (event) => {
  console.error('[Service Worker] Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[Service Worker] Unhandled promise rejection:', event.reason);
});

console.log('[Service Worker] Service worker loaded successfully');