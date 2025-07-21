/**
 * Advanced Service Worker Manager
 * Enhanced PWA capabilities with intelligent caching, background sync, and push notifications
 */

export interface CacheStrategy {
  name: string;
  pattern: RegExp | string;
  strategy: 'networkFirst' | 'cacheFirst' | 'staleWhileRevalidate' | 'networkOnly' | 'cacheOnly';
  maxAge?: number; // seconds
  maxEntries?: number;
  networkTimeoutSeconds?: number;
}

export interface BackgroundSyncTask {
  id: string;
  type: 'credential_verification' | 'proof_generation' | 'api_sync' | 'data_backup';
  payload: any;
  priority: 'high' | 'medium' | 'low';
  createdAt: number;
  retryCount: number;
  maxRetries: number;
}

export interface PushNotificationConfig {
  vapidKey: string;
  endpoint: string;
  subscription: PushSubscription | null;
  enabled: boolean;
  categories: {
    verificationComplete: boolean;
    credentialExpiring: boolean;
    communityUpdates: boolean;
    securityAlerts: boolean;
  };
}

export interface OfflineCapabilities {
  cacheSize: number;
  cachedCredentials: number;
  cachedProofs: number;
  lastSync: number;
  syncPending: BackgroundSyncTask[];
  offlineMode: boolean;
}

export class AdvancedServiceWorkerManager {
  private static instance: AdvancedServiceWorkerManager;
  private swRegistration: ServiceWorkerRegistration | null = null;
  private pushConfig: PushNotificationConfig | null = null;
  private cacheStrategies: CacheStrategy[] = [];
  private syncQueue: BackgroundSyncTask[] = [];

  constructor() {
    this.initializeCacheStrategies();
    console.log('🔧 Advanced Service Worker Manager initialized');
  }

  static getInstance(): AdvancedServiceWorkerManager {
    if (!AdvancedServiceWorkerManager.instance) {
      AdvancedServiceWorkerManager.instance = new AdvancedServiceWorkerManager();
    }
    return AdvancedServiceWorkerManager.instance;
  }

  /**
   * Initialize advanced PWA features
   */
  async initializePWA(): Promise<boolean> {
    console.log('🚀 Initializing advanced PWA features...');

    try {
      // Register service worker
      await this.registerServiceWorker();

      // Setup cache strategies
      await this.setupAdvancedCaching();

      // Initialize background sync
      await this.initializeBackgroundSync();

      // Setup push notifications
      await this.initializePushNotifications();

      // Configure offline capabilities
      await this.configureOfflineCapabilities();

      console.log('✅ Advanced PWA features initialized successfully');
      return true;

    } catch (error) {
      errorService.logError('❌ Failed to initialize PWA features:', error);
      return false;
    }
  }

  /**
   * Register enhanced service worker
   */
  private async registerServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported');
    }

    try {
      this.swRegistration = await navigator.serviceWorker.register('/advanced-sw.js', {
        scope: '/',
        updateViaCache: 'none'
      });

      console.log('✅ Advanced Service Worker registered');

      // Handle updates
      this.swRegistration.addEventListener('updatefound', () => {
        console.log('🔄 Service Worker update found');
        this.handleServiceWorkerUpdate();
      });

      // Check for updates periodically
      setInterval(() => {
        this.swRegistration?.update();
      }, 60000); // Check every minute

    } catch (error) {
      errorService.logError('❌ Service Worker registration failed:', error);
      throw error;
    }
  }

  /**
   * Initialize cache strategies
   */
  private initializeCacheStrategies(): void {
    this.cacheStrategies = [
      {
        name: 'api-credentials',
        pattern: /^https:\/\/api\..*\/credentials/,
        strategy: 'networkFirst',
        maxAge: 300, // 5 minutes
        maxEntries: 100,
        networkTimeoutSeconds: 5
      },
      {
        name: 'api-verifications',
        pattern: /^https:\/\/api\..*\/verify/,
        strategy: 'staleWhileRevalidate',
        maxAge: 600, // 10 minutes
        maxEntries: 50,
        networkTimeoutSeconds: 3
      },
      {
        name: 'static-assets',
        pattern: /\.(js|css|png|jpg|jpeg|svg|woff2)$/,
        strategy: 'cacheFirst',
        maxAge: 86400, // 24 hours
        maxEntries: 200
      },
      {
        name: 'app-shell',
        pattern: /^https:\/\/wallet-.*\.vercel\.app\//,
        strategy: 'staleWhileRevalidate',
        maxAge: 3600, // 1 hour
        maxEntries: 50,
        networkTimeoutSeconds: 2
      },
      {
        name: 'zkp-proofs',
        pattern: /\/api\/zkp\//,
        strategy: 'networkFirst',
        maxAge: 1800, // 30 minutes
        maxEntries: 100,
        networkTimeoutSeconds: 10
      }
    ];
  }

  /**
   * Setup advanced caching with intelligent strategies
   */
  private async setupAdvancedCaching(): Promise<void> {
    if (!this.swRegistration) return;

    try {
      // Pre-cache critical resources
      await this.preCacheCriticalResources();

      // Setup dynamic caching rules
      await this.configureDynamicCaching();

      // Initialize cache cleanup
      this.setupCacheCleanup();

      console.log('✅ Advanced caching configured');

    } catch (error) {
      errorService.logError('❌ Cache setup failed:', error);
      throw error;
    }
  }

  /**
   * Pre-cache critical application resources
   */
  private async preCacheCriticalResources(): Promise<void> {
    const criticalResources = [
      '/',
      '/dashboard',
      '/credentials',
      '/proofs',
      '/manifest.webmanifest',
      '/assets/index.css',
      '/assets/index.js'
    ];

    try {
      const cache = await caches.open('critical-resources-v1');
      await cache.addAll(criticalResources);
      console.log('✅ Critical resources pre-cached');

    } catch (error) {
      errorService.logError('❌ Pre-caching failed:', error);
    }
  }

  /**
   * Configure dynamic caching based on strategies
   */
  private async configureDynamicCaching(): Promise<void> {
    // This would be implemented in the actual service worker file
    // Here we just configure the strategies for the SW to use
    
    const cacheConfig = {
      strategies: this.cacheStrategies,
      defaultStrategy: 'staleWhileRevalidate',
      offlinePageUrl: '/offline.html'
    };

    // Store configuration for service worker
    localStorage.setItem('sw-cache-config', JSON.stringify(cacheConfig));
  }

  /**
   * Setup periodic cache cleanup
   */
  private setupCacheCleanup(): void {
    // Clean up old cache entries every hour
    setInterval(async () => {
      await this.cleanupOldCaches();
    }, 3600000); // 1 hour
  }

  /**
   * Clean up expired cache entries
   */
  private async cleanupOldCaches(): Promise<void> {
    try {
      const cacheNames = await caches.keys();
      const now = Date.now();

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();

        for (const request of requests) {
          const response = await cache.match(request);
          if (response) {
            const cachedDate = response.headers.get('date');
            if (cachedDate) {
              const cacheAge = now - new Date(cachedDate).getTime();
              const maxAge = this.getMaxAgeForCache(cacheName);
              
              if (cacheAge > maxAge * 1000) {
                await cache.delete(request);
              }
            }
          }
        }
      }

      console.log('🧹 Cache cleanup completed');

    } catch (error) {
      errorService.logError('❌ Cache cleanup failed:', error);
    }
  }

  /**
   * Get max age for specific cache
   */
  private getMaxAgeForCache(cacheName: string): number {
    const strategy = this.cacheStrategies.find(s => cacheName.includes(s.name));
    return strategy?.maxAge || 3600; // Default 1 hour
  }

  /**
   * Initialize background sync capabilities
   */
  private async initializeBackgroundSync(): Promise<void> {
    if (!('serviceWorker' in navigator) || !('sync' in window.ServiceWorkerRegistration.prototype)) {
      console.warn('⚠️ Background Sync not supported');
      return;
    }

    try {
      // Register sync event listeners
      await this.registerSyncHandlers();

      // Setup periodic sync
      await this.setupPeriodicSync();

      // Load pending tasks
      await this.loadPendingSyncTasks();

      console.log('✅ Background sync initialized');

    } catch (error) {
      errorService.logError('❌ Background sync setup failed:', error);
    }
  }

  /**
   * Register background sync handlers
   */
  private async registerSyncHandlers(): Promise<void> {
    if (!this.swRegistration) return;

    const syncHandlers = [
      'credential-verification-sync',
      'proof-generation-sync',
      'api-data-sync',
      'offline-data-backup'
    ];

    for (const handler of syncHandlers) {
      try {
        await this.swRegistration.sync.register(handler);
      } catch (error) {
        errorService.logError(`❌ Failed to register sync handler: ${handler}`, error);
      }
    }
  }

  /**
   * Setup periodic background sync
   */
  private async setupPeriodicSync(): Promise<void> {
    // Setup periodic sync for data updates
    setInterval(async () => {
      await this.queueBackgroundSync('api_sync', {
        type: 'periodic_update',
        timestamp: Date.now()
      }, 'low');
    }, 300000); // Every 5 minutes
  }

  /**
   * Load pending sync tasks from storage
   */
  private async loadPendingSyncTasks(): Promise<void> {
    try {
      const stored = localStorage.getItem('background-sync-queue');
      if (stored) {
        this.syncQueue = JSON.parse(stored);
        console.log(`📋 Loaded ${this.syncQueue.length} pending sync tasks`);
      }
    } catch (error) {
      errorService.logError('❌ Failed to load sync tasks:', error);
    }
  }

  /**
   * Queue a background sync task
   */
  async queueBackgroundSync(
    type: BackgroundSyncTask['type'],
    payload: any,
    priority: BackgroundSyncTask['priority'] = 'medium'
  ): Promise<string> {
    const task: BackgroundSyncTask = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      payload,
      priority,
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: 3
    };

    this.syncQueue.push(task);
    this.saveSyncQueue();

    // Trigger immediate sync if online
    if (navigator.onLine && this.swRegistration) {
      try {
        await this.swRegistration.sync.register(`${type}-sync`);
      } catch (error) {
        errorService.logError('❌ Failed to trigger sync:', error);
      }
    }

    return task.id;
  }

  /**
   * Save sync queue to storage
   */
  private saveSyncQueue(): void {
    try {
      localStorage.setItem('background-sync-queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      errorService.logError('❌ Failed to save sync queue:', error);
    }
  }

  /**
   * Initialize push notifications
   */
  private async initializePushNotifications(): Promise<void> {
    if (!('PushManager' in window) || !('Notification' in window)) {
      console.warn('⚠️ Push notifications not supported');
      return;
    }

    try {
      // Request notification permission
      const permission = await this.requestNotificationPermission();
      if (permission !== 'granted') {
        console.warn('⚠️ Notification permission denied');
        return;
      }

      // Setup push subscription
      await this.setupPushSubscription();

      // Configure notification categories
      this.configurePushCategories();

      console.log('✅ Push notifications initialized');

    } catch (error) {
      errorService.logError('❌ Push notification setup failed:', error);
    }
  }

  /**
   * Request notification permission
   */
  private async requestNotificationPermission(): Promise<NotificationPermission> {
    if ('Notification' in window) {
      return await Notification.requestPermission();
    }
    return 'denied';
  }

  /**
   * Setup push subscription
   */
  private async setupPushSubscription(): Promise<void> {
    if (!this.swRegistration) return;

    try {
      const vapidKey = process.env.REACT_APP_VAPID_PUBLIC_KEY || 'demo-vapid-key';
      
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidKey)
      });

      this.pushConfig = {
        vapidKey,
        endpoint: subscription.endpoint,
        subscription,
        enabled: true,
        categories: {
          verificationComplete: true,
          credentialExpiring: true,
          communityUpdates: false,
          securityAlerts: true
        }
      };

      // Store subscription on server (mock for now)
      await this.storePushSubscription(subscription);

      console.log('✅ Push subscription created');

    } catch (error) {
      errorService.logError('❌ Push subscription failed:', error);
    }
  }

  /**
   * Configure push notification categories
   */
  private configurePushCategories(): void {
    const categories = [
      {
        id: 'verification-complete',
        title: 'Verification Complete',
        description: 'Get notified when credential verification completes',
        icon: '✅'
      },
      {
        id: 'credential-expiring',
        title: 'Credential Expiring',
        description: 'Alerts when credentials are about to expire',
        icon: '⏰'
      },
      {
        id: 'community-updates',
        title: 'Community Updates',
        description: 'New shared proofs and community features',
        icon: '👥'
      },
      {
        id: 'security-alerts',
        title: 'Security Alerts',
        description: 'Important security notifications',
        icon: '🔒'
      }
    ];

    localStorage.setItem('push-categories', JSON.stringify(categories));
  }

  /**
   * Store push subscription (mock implementation)
   */
  private async storePushSubscription(subscription: PushSubscription): Promise<void> {
    // In production, this would send to your push notification server
    console.log('📱 Push subscription stored:', subscription.endpoint);
  }

  /**
   * Configure offline capabilities
   */
  private async configureOfflineCapabilities(): Promise<void> {
    try {
      // Setup offline page
      await this.setupOfflinePage();

      // Configure offline data sync
      await this.setupOfflineDataSync();

      // Monitor connection status
      this.setupConnectionMonitoring();

      console.log('✅ Offline capabilities configured');

    } catch (error) {
      errorService.logError('❌ Offline setup failed:', error);
    }
  }

  /**
   * Setup offline fallback page
   */
  private async setupOfflinePage(): Promise<void> {
    const offlineHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>PersonaPass - Offline</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui; text-align: center; padding: 2rem; background: #f8fafc; }
            .offline-container { max-width: 400px; margin: 0 auto; }
            .offline-icon { font-size: 4rem; margin-bottom: 1rem; }
            h1 { color: #1f2937; margin-bottom: 1rem; }
            p { color: #6b7280; margin-bottom: 2rem; }
            .retry-btn { background: #3b82f6; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; }
          </style>
        </head>
        <body>
          <div class="offline-container">
            <div class="offline-icon">📱</div>
            <h1>You're Offline</h1>
            <p>PersonaPass works offline! Your cached credentials and proofs are still available.</p>
            <button class="retry-btn" onclick="window.location.reload()">Try Again</button>
          </div>
        </body>
      </html>
    `;

    try {
      const cache = await caches.open('offline-fallbacks-v1');
      await cache.put('/offline.html', new Response(offlineHtml, {
        headers: { 'Content-Type': 'text/html' }
      }));
    } catch (error) {
      errorService.logError('❌ Failed to cache offline page:', error);
    }
  }

  /**
   * Setup offline data synchronization
   */
  private async setupOfflineDataSync(): Promise<void> {
    // Setup IndexedDB for offline storage
    // This would integrate with existing storage service
    console.log('🔄 Offline data sync configured');
  }

  /**
   * Monitor connection status
   */
  private setupConnectionMonitoring(): void {
    window.addEventListener('online', () => {
      console.log('🌐 Connection restored');
      this.handleConnectionRestore();
    });

    window.addEventListener('offline', () => {
      console.log('📱 Offline mode activated');
      this.handleOfflineMode();
    });
  }

  /**
   * Handle connection restoration
   */
  private async handleConnectionRestore(): Promise<void> {
    // Trigger pending sync tasks
    for (const task of this.syncQueue) {
      if (this.swRegistration) {
        try {
          await this.swRegistration.sync.register(`${task.type}-sync`);
        } catch (error) {
          errorService.logError('❌ Failed to sync task:', error);
        }
      }
    }
  }

  /**
   * Handle offline mode activation
   */
  private handleOfflineMode(): void {
    // Show offline indicator
    this.showOfflineNotification();
  }

  /**
   * Show offline notification
   */
  private showOfflineNotification(): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('PersonaPass - Offline Mode', {
        body: 'You are now offline. Cached data is still available.',
        icon: '/icon.svg',
        badge: '/icon.svg'
      });
    }
  }

  /**
   * Handle service worker updates
   */
  private handleServiceWorkerUpdate(): void {
    if (this.swRegistration?.installing) {
      this.swRegistration.installing.addEventListener('statechange', () => {
        if (this.swRegistration?.waiting) {
          // Show update available notification
          this.showUpdateNotification();
        }
      });
    }
  }

  /**
   * Show update available notification
   */
  private showUpdateNotification(): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('PersonaPass Update Available', {
        body: 'A new version of PersonaPass is ready. Tap to update.',
        icon: '/icon.svg',
        badge: '/icon.svg',
        requireInteraction: true
      });

      notification.addEventListener('click', () => {
        this.activateServiceWorkerUpdate();
        notification.close();
      });
    }
  }

  /**
   * Activate service worker update
   */
  private activateServiceWorkerUpdate(): void {
    if (this.swRegistration?.waiting) {
      this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }

  /**
   * Get offline capabilities status
   */
  async getOfflineCapabilities(): Promise<OfflineCapabilities> {
    try {
      const cacheNames = await caches.keys();
      let cacheSize = 0;
      let cachedCredentials = 0;
      let cachedProofs = 0;

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        cacheSize += requests.length;

        // Count credentials and proofs in cache
        for (const request of requests) {
          if (request.url.includes('/credentials')) cachedCredentials++;
          if (request.url.includes('/proofs')) cachedProofs++;
        }
      }

      return {
        cacheSize,
        cachedCredentials,
        cachedProofs,
        lastSync: this.getLastSyncTime(),
        syncPending: this.syncQueue,
        offlineMode: !navigator.onLine
      };

    } catch (error) {
      errorService.logError('❌ Failed to get offline capabilities:', error);
      return {
        cacheSize: 0,
        cachedCredentials: 0,
        cachedProofs: 0,
        lastSync: 0,
        syncPending: [],
        offlineMode: !navigator.onLine
      };
    }
  }

  /**
   * Get last sync time
   */
  private getLastSyncTime(): number {
    const stored = localStorage.getItem('last-sync-time');
    return stored ? parseInt(stored) : 0;
  }

  /**
   * Utility: Convert VAPID key
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Send push notification (server-side would handle this)
   */
  async sendPushNotification(
    title: string,
    body: string,
    category: keyof PushNotificationConfig['categories'],
    data?: any
  ): Promise<boolean> {
    if (!this.pushConfig?.enabled || !this.pushConfig.categories[category]) {
      return false;
    }

    try {
      // In production, this would send to your push server
      console.log('📱 Push notification sent:', { title, body, category, data });
      return true;

    } catch (error) {
      errorService.logError('❌ Failed to send push notification:', error);
      return false;
    }
  }
}

// Export singleton instance
export const advancedServiceWorkerManager = AdvancedServiceWorkerManager.getInstance();