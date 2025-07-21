/**
 * Advanced Service Worker
 * Enhanced PWA capabilities with intelligent caching, background sync, and push notifications
 */

const CACHE_VERSION = 'v1.4.0';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;

// Cache strategies configuration
const CACHE_STRATEGIES = {
  'api-credentials': {
    pattern: /\/api\/.*\/credentials/,
    strategy: 'networkFirst',
    maxAge: 300, // 5 minutes
    networkTimeout: 5000
  },
  'api-verifications': {
    pattern: /\/api\/.*\/verify/,
    strategy: 'staleWhileRevalidate',
    maxAge: 600, // 10 minutes
    networkTimeout: 3000
  },
  'static-assets': {
    pattern: /\.(js|css|png|jpg|jpeg|svg|woff2)$/,
    strategy: 'cacheFirst',
    maxAge: 86400 // 24 hours
  },
  'app-shell': {
    pattern: /^https:\/\/wallet-.*\.vercel\.app\//,
    strategy: 'staleWhileRevalidate',
    maxAge: 3600, // 1 hour
    networkTimeout: 2000
  }
};

// Background sync configuration
const SYNC_HANDLERS = {
  'credential-verification-sync': handleCredentialSync,
  'proof-generation-sync': handleProofSync,
  'api-data-sync': handleApiSync,
  'offline-data-backup': handleBackupSync
};

// Install event - pre-cache critical resources
self.addEventListener('install', (event) => {
  console.log('🔧 Advanced Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      const criticalResources = [
        '/',
        '/dashboard',
        '/credentials',
        '/proofs',
        '/offline.html',
        '/manifest.webmanifest'
      ];
      
      return cache.addAll(criticalResources);
    }).then(() => {
      console.log('✅ Critical resources pre-cached');
      self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Advanced Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheName.includes(CACHE_VERSION)) {
            console.log('🧹 Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker activated');
      self.clients.claim();
    })
  );
});

// Fetch event - intelligent caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  event.respondWith(handleFetchRequest(request));
});

/**
 * Handle fetch requests with intelligent caching
 */
async function handleFetchRequest(request) {
  const url = new URL(request.url);
  
  // Determine cache strategy based on request
  const strategy = determineCacheStrategy(request);
  
  try {
    switch (strategy.name) {
      case 'networkFirst':
        return await networkFirstStrategy(request, strategy);
      case 'cacheFirst':
        return await cacheFirstStrategy(request, strategy);
      case 'staleWhileRevalidate':
        return await staleWhileRevalidateStrategy(request, strategy);
      case 'networkOnly':
        return await fetch(request);
      case 'cacheOnly':
        return await caches.match(request);
      default:
        return await staleWhileRevalidateStrategy(request, strategy);
    }
  } catch (error) {
    console.error('❌ Fetch failed:', error);
    return await handleFetchError(request, error);
  }
}

/**
 * Determine appropriate cache strategy for request
 */
function determineCacheStrategy(request) {
  const url = request.url;
  
  for (const [name, config] of Object.entries(CACHE_STRATEGIES)) {
    if (config.pattern.test(url)) {
      return { name: config.strategy, ...config };
    }
  }
  
  // Default strategy
  return { name: 'staleWhileRevalidate', maxAge: 3600 };
}

/**
 * Network First Strategy - try network, fallback to cache
 */
async function networkFirstStrategy(request, strategy) {
  const cacheName = getCacheNameForRequest(request);
  
  try {
    // Try network with timeout
    const networkPromise = fetch(request);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Network timeout')), strategy.networkTimeout || 5000);
    });
    
    const response = await Promise.race([networkPromise, timeoutPromise]);
    
    if (response.ok) {
      // Cache successful response
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
      return response;
    }
    
    throw new Error('Network response not ok');
    
  } catch (error) {
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

/**
 * Cache First Strategy - try cache, fallback to network
 */
async function cacheFirstStrategy(request, strategy) {
  const cacheName = getCacheNameForRequest(request);
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Check if cached response is still fresh
    const cacheDate = new Date(cachedResponse.headers.get('date') || 0);
    const maxAge = strategy.maxAge * 1000;
    
    if (Date.now() - cacheDate.getTime() < maxAge) {
      return cachedResponse;
    }
  }
  
  // Cache miss or expired - fetch from network
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Return stale cache if available
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

/**
 * Stale While Revalidate Strategy - return cache, update in background
 */
async function staleWhileRevalidateStrategy(request, strategy) {
  const cacheName = getCacheNameForRequest(request);
  const cachedResponse = await caches.match(request);
  
  // Start fetch in background to update cache
  const fetchPromise = fetch(request).then(async (response) => {
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  }).catch(error => {
    console.error('Background fetch failed:', error);
  });
  
  // Return cached response immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // No cached response - wait for network
  return await fetchPromise;
}

/**
 * Handle fetch errors with appropriate fallbacks
 */
async function handleFetchError(request, error) {
  const url = new URL(request.url);
  
  // For navigation requests, return offline page
  if (request.mode === 'navigate') {
    const offlinePage = await caches.match('/offline.html');
    if (offlinePage) {
      return offlinePage;
    }
  }
  
  // For API requests, return cached version if available
  if (url.pathname.startsWith('/api/')) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
  }
  
  // Return a generic offline response
  return new Response(
    JSON.stringify({
      error: 'Offline',
      message: 'This request is not available offline',
      offline: true
    }),
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Get appropriate cache name for request
 */
function getCacheNameForRequest(request) {
  const url = new URL(request.url);
  
  if (url.pathname.startsWith('/api/')) {
    return API_CACHE;
  }
  
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|woff2)$/)) {
    return STATIC_CACHE;
  }
  
  return DYNAMIC_CACHE;
}

// Background Sync Events
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag);
  
  const handler = SYNC_HANDLERS[event.tag];
  if (handler) {
    event.waitUntil(handler(event.tag));
  }
});

/**
 * Handle credential verification sync
 */
async function handleCredentialSync(tag) {
  console.log('🔐 Processing credential verification sync...');
  
  try {
    const pendingVerifications = await getPendingSyncData('credential-verifications');
    
    for (const verification of pendingVerifications) {
      try {
        await processCredentialVerification(verification);
        await removeSyncData('credential-verifications', verification.id);
      } catch (error) {
        console.error('❌ Credential verification failed:', error);
        await incrementRetryCount('credential-verifications', verification.id);
      }
    }
    
    console.log('✅ Credential sync completed');
    
  } catch (error) {
    console.error('❌ Credential sync failed:', error);
  }
}

/**
 * Handle proof generation sync
 */
async function handleProofSync(tag) {
  console.log('🔒 Processing proof generation sync...');
  
  try {
    const pendingProofs = await getPendingSyncData('proof-generations');
    
    for (const proof of pendingProofs) {
      try {
        await processProofGeneration(proof);
        await removeSyncData('proof-generations', proof.id);
      } catch (error) {
        console.error('❌ Proof generation failed:', error);
        await incrementRetryCount('proof-generations', proof.id);
      }
    }
    
    console.log('✅ Proof sync completed');
    
  } catch (error) {
    console.error('❌ Proof sync failed:', error);
  }
}

/**
 * Handle API data sync
 */
async function handleApiSync(tag) {
  console.log('🌐 Processing API data sync...');
  
  try {
    const pendingRequests = await getPendingSyncData('api-requests');
    
    for (const apiRequest of pendingRequests) {
      try {
        await processApiRequest(apiRequest);
        await removeSyncData('api-requests', apiRequest.id);
      } catch (error) {
        console.error('❌ API request failed:', error);
        await incrementRetryCount('api-requests', apiRequest.id);
      }
    }
    
    console.log('✅ API sync completed');
    
  } catch (error) {
    console.error('❌ API sync failed:', error);
  }
}

/**
 * Handle offline data backup sync
 */
async function handleBackupSync(tag) {
  console.log('💾 Processing data backup sync...');
  
  try {
    const backupData = await collectBackupData();
    await uploadBackupData(backupData);
    
    console.log('✅ Backup sync completed');
    
  } catch (error) {
    console.error('❌ Backup sync failed:', error);
  }
}

// Push notification events
self.addEventListener('push', (event) => {
  console.log('📱 Push notification received');
  
  if (event.data) {
    const payload = event.data.json();
    event.waitUntil(showNotification(payload));
  }
});

/**
 * Show push notification
 */
async function showNotification(payload) {
  const { title, body, icon, badge, data, actions } = payload;
  
  const options = {
    body,
    icon: icon || '/icon.svg',
    badge: badge || '/icon.svg',
    data,
    actions: actions || [],
    requireInteraction: payload.requireInteraction || false,
    vibrate: [200, 100, 200]
  };
  
  return self.registration.showNotification(title, options);
}

// Notification click events
self.addEventListener('notificationclick', (event) => {
  console.log('📱 Notification clicked:', event.notification.data);
  
  event.notification.close();
  
  const { action, url } = event.notification.data || {};
  
  event.waitUntil(
    clients.openWindow(url || '/')
  );
});

// Message events from main thread
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'QUEUE_SYNC':
      queueSyncData(payload.category, payload.data);
      break;
    case 'GET_CACHE_STATUS':
      event.ports[0].postMessage(getCacheStatus());
      break;
    default:
      console.log('📨 Unknown message type:', type);
  }
});

// Utility functions for sync data management
async function getPendingSyncData(category) {
  try {
    const cache = await caches.open('sync-data');
    const response = await cache.match(`/sync/${category}`);
    if (response) {
      return await response.json();
    }
    return [];
  } catch (error) {
    console.error('❌ Failed to get sync data:', error);
    return [];
  }
}

async function queueSyncData(category, data) {
  try {
    const existing = await getPendingSyncData(category);
    existing.push({
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...data,
      createdAt: Date.now(),
      retryCount: 0
    });
    
    const cache = await caches.open('sync-data');
    await cache.put(
      `/sync/${category}`,
      new Response(JSON.stringify(existing), {
        headers: { 'Content-Type': 'application/json' }
      })
    );
    
    console.log(`📋 Queued sync data for ${category}`);
  } catch (error) {
    console.error('❌ Failed to queue sync data:', error);
  }
}

async function removeSyncData(category, id) {
  try {
    const existing = await getPendingSyncData(category);
    const filtered = existing.filter(item => item.id !== id);
    
    const cache = await caches.open('sync-data');
    await cache.put(
      `/sync/${category}`,
      new Response(JSON.stringify(filtered), {
        headers: { 'Content-Type': 'application/json' }
      })
    );
  } catch (error) {
    console.error('❌ Failed to remove sync data:', error);
  }
}

async function incrementRetryCount(category, id) {
  try {
    const existing = await getPendingSyncData(category);
    const item = existing.find(item => item.id === id);
    
    if (item) {
      item.retryCount = (item.retryCount || 0) + 1;
      
      // Remove if max retries exceeded
      if (item.retryCount >= 3) {
        await removeSyncData(category, id);
        return;
      }
      
      const cache = await caches.open('sync-data');
      await cache.put(
        `/sync/${category}`,
        new Response(JSON.stringify(existing), {
          headers: { 'Content-Type': 'application/json' }
        })
      );
    }
  } catch (error) {
    console.error('❌ Failed to increment retry count:', error);
  }
}

// Mock processing functions (would integrate with actual services)
async function processCredentialVerification(verification) {
  console.log('🔐 Processing credential verification:', verification.id);
  // Integrate with actual credential verification service
}

async function processProofGeneration(proof) {
  console.log('🔒 Processing proof generation:', proof.id);
  // Integrate with actual proof generation service
}

async function processApiRequest(request) {
  console.log('🌐 Processing API request:', request.id);
  // Integrate with actual API services
}

async function collectBackupData() {
  console.log('💾 Collecting backup data...');
  // Collect data from IndexedDB and caches
  return { timestamp: Date.now(), size: 0 };
}

async function uploadBackupData(data) {
  console.log('☁️ Uploading backup data...');
  // Upload to cloud storage service
}

async function getCacheStatus() {
  const cacheNames = await caches.keys();
  let totalSize = 0;
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    totalSize += requests.length;
  }
  
  return {
    caches: cacheNames.length,
    totalEntries: totalSize,
    version: CACHE_VERSION,
    online: true // This would check actual connectivity
  };
}

console.log('✅ Advanced Service Worker loaded successfully');