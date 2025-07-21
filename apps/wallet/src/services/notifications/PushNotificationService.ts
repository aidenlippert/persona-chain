/**
 * Push Notification Service
 * Handles push notifications for PWA with offline support
 */

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  data?: any;
  actions?: NotificationAction[];
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
  timestamp?: number;
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface NotificationCategory {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  sound: boolean;
  vibrate: boolean;
  priority: 'low' | 'normal' | 'high';
}

export interface NotificationSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userDid: string;
  categories: string[];
  createdAt: string;
  lastUsed: string;
}

export class PushNotificationService {
  private static instance: PushNotificationService;
  private swRegistration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscription | null = null;
  private categories: NotificationCategory[] = [];

  constructor() {
    this.initializeCategories();
    console.log('📱 Push Notification Service initialized');
  }

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  /**
   * Initialize notification categories
   */
  private initializeCategories(): void {
    this.categories = [
      {
        id: 'verification-complete',
        name: 'Verification Complete',
        description: 'Notifications when credential verification completes',
        enabled: true,
        sound: true,
        vibrate: true,
        priority: 'high'
      },
      {
        id: 'credential-expiring',
        name: 'Credential Expiring',
        description: 'Alerts when credentials are about to expire',
        enabled: true,
        sound: false,
        vibrate: true,
        priority: 'normal'
      },
      {
        id: 'community-updates',
        name: 'Community Updates',
        description: 'New shared proofs and community activity',
        enabled: false,
        sound: false,
        vibrate: false,
        priority: 'low'
      },
      {
        id: 'security-alerts',
        name: 'Security Alerts',
        description: 'Important security notifications and warnings',
        enabled: true,
        sound: true,
        vibrate: true,
        priority: 'high'
      },
      {
        id: 'sync-complete',
        name: 'Sync Complete',
        description: 'Background data synchronization notifications',
        enabled: false,
        sound: false,
        vibrate: false,
        priority: 'low'
      },
      {
        id: 'proof-endorsement',
        name: 'Proof Endorsements',
        description: 'When your proofs receive community endorsements',
        enabled: true,
        sound: false,
        vibrate: true,
        priority: 'normal'
      }
    ];

    // Load user preferences
    const stored = localStorage.getItem('notification-categories');
    if (stored) {
      try {
        const userCategories = JSON.parse(stored);
        this.categories = this.categories.map(cat => ({
          ...cat,
          ...userCategories.find((uc: any) => uc.id === cat.id)
        }));
      } catch (error) {
        errorService.logError('Failed to load notification preferences:', error);
      }
    }
  }

  /**
   * Initialize push notifications
   */
  async initialize(registration: ServiceWorkerRegistration): Promise<boolean> {
    console.log('🔔 Initializing push notifications...');

    if (!('PushManager' in window)) {
      console.warn('Push notifications not supported');
      return false;
    }

    try {
      this.swRegistration = registration;

      // Check current permission
      if (Notification.permission === 'denied') {
        console.warn('Push notifications are blocked');
        return false;
      }

      // Request permission if needed
      if (Notification.permission === 'default') {
        const permission = await this.requestPermission();
        if (permission !== 'granted') {
          return false;
        }
      }

      // Setup subscription
      await this.setupPushSubscription();

      console.log('✅ Push notifications initialized successfully');
      return true;

    } catch (error) {
      errorService.logError('❌ Failed to initialize push notifications:', error);
      return false;
    }
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    try {
      const permission = await Notification.requestPermission();
      console.log(`📱 Notification permission: ${permission}`);
      return permission;
    } catch (error) {
      errorService.logError('Failed to request notification permission:', error);
      return 'denied';
    }
  }

  /**
   * Setup push subscription
   */
  private async setupPushSubscription(): Promise<void> {
    if (!this.swRegistration) {
      throw new Error('Service worker registration not available');
    }

    try {
      // Check for existing subscription
      const existing = await this.swRegistration.pushManager.getSubscription();
      if (existing) {
        this.subscription = existing;
        console.log('📱 Using existing push subscription');
        return;
      }

      // Create new subscription
      const vapidKey = process.env.REACT_APP_VAPID_PUBLIC_KEY || 'demo-vapid-key';
      
      this.subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidKey)
      });

      // Store subscription on server (mock for now)
      await this.storeSubscription(this.subscription);

      console.log('✅ Push subscription created');

    } catch (error) {
      errorService.logError('❌ Failed to setup push subscription:', error);
      throw error;
    }
  }

  /**
   * Store subscription on server
   */
  private async storeSubscription(subscription: PushSubscription): Promise<void> {
    try {
      const subscriptionData: NotificationSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))),
          auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!)))
        },
        userDid: 'did:persona:user:current', // Would get from identity service
        categories: this.getEnabledCategories().map(c => c.id),
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString()
      };

      // In production, this would send to your push notification server
      console.log('📱 Subscription stored:', subscriptionData);
      
      // Store locally for development
      localStorage.setItem('push-subscription', JSON.stringify(subscriptionData));

    } catch (error) {
      errorService.logError('Failed to store subscription:', error);
    }
  }

  /**
   * Send local notification (for development/testing)
   */
  async sendLocalNotification(payload: NotificationPayload): Promise<boolean> {
    if (Notification.permission !== 'granted') {
      console.warn('Notifications not permitted');
      return false;
    }

    try {
      const notification = new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/icon.svg',
        badge: payload.badge || '/icon.svg',
        image: payload.image,
        tag: payload.tag,
        data: payload.data,
        requireInteraction: payload.requireInteraction || false,
        silent: payload.silent || false,
        vibrate: payload.vibrate || [200, 100, 200],
        timestamp: payload.timestamp || Date.now()
      });

      // Handle notification click
      notification.onclick = (event) => {
        event.preventDefault();
        notification.close();
        
        if (payload.data?.url) {
          window.focus();
          window.location.href = payload.data.url;
        }
      };

      // Auto-close after 5 seconds if not requiring interaction
      if (!payload.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

      return true;

    } catch (error) {
      errorService.logError('Failed to send local notification:', error);
      return false;
    }
  }

  /**
   * Send notification for specific category
   */
  async sendCategoryNotification(
    categoryId: string, 
    payload: Omit<NotificationPayload, 'tag'>
  ): Promise<boolean> {
    const category = this.categories.find(c => c.id === categoryId);
    if (!category || !category.enabled) {
      return false;
    }

    const enhancedPayload: NotificationPayload = {
      ...payload,
      tag: categoryId,
      vibrate: category.vibrate ? payload.vibrate || [200, 100, 200] : [],
      silent: !category.sound
    };

    return this.sendLocalNotification(enhancedPayload);
  }

  /**
   * Predefined notification templates
   */
  async notifyVerificationComplete(credentialType: string): Promise<boolean> {
    return this.sendCategoryNotification('verification-complete', {
      title: 'Verification Complete ✅',
      body: `Your ${credentialType} credential has been successfully verified`,
      icon: '/icon.svg',
      data: { url: '/credentials', type: 'verification' },
      actions: [
        { action: 'view', title: 'View Credential' },
        { action: 'share', title: 'Share' }
      ]
    });
  }

  async notifyCredentialExpiring(credentialType: string, daysLeft: number): Promise<boolean> {
    return this.sendCategoryNotification('credential-expiring', {
      title: 'Credential Expiring ⏰',
      body: `Your ${credentialType} credential expires in ${daysLeft} days`,
      icon: '/icon.svg',
      data: { url: '/credentials', type: 'expiring' },
      actions: [
        { action: 'renew', title: 'Renew Now' },
        { action: 'remind', title: 'Remind Later' }
      ]
    });
  }

  async notifySecurityAlert(message: string, severity: 'low' | 'medium' | 'high' = 'medium'): Promise<boolean> {
    return this.sendCategoryNotification('security-alerts', {
      title: 'Security Alert 🔒',
      body: message,
      icon: '/icon.svg',
      requireInteraction: severity === 'high',
      data: { url: '/settings/security', type: 'security' },
      actions: [
        { action: 'view', title: 'View Details' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    });
  }

  async notifyProofEndorsement(proofTitle: string, endorserName: string): Promise<boolean> {
    return this.sendCategoryNotification('proof-endorsement', {
      title: 'Proof Endorsed ⭐',
      body: `${endorserName} endorsed your "${proofTitle}" proof`,
      icon: '/icon.svg',
      data: { url: '/community', type: 'endorsement' },
      actions: [
        { action: 'view', title: 'View Community' },
        { action: 'thank', title: 'Say Thanks' }
      ]
    });
  }

  async notifySyncComplete(itemssynced: number): Promise<boolean> {
    return this.sendCategoryNotification('sync-complete', {
      title: 'Sync Complete 🔄',
      body: `${itemssynced} items synchronized successfully`,
      icon: '/icon.svg',
      silent: true,
      data: { type: 'sync' }
    });
  }

  async notifyCommunityUpdate(type: string, title: string): Promise<boolean> {
    return this.sendCategoryNotification('community-updates', {
      title: 'Community Update 👥',
      body: `New ${type}: ${title}`,
      icon: '/icon.svg',
      data: { url: '/community', type: 'community' },
      actions: [
        { action: 'explore', title: 'Explore' }
      ]
    });
  }

  /**
   * Get notification categories
   */
  getCategories(): NotificationCategory[] {
    return [...this.categories];
  }

  /**
   * Get enabled categories
   */
  getEnabledCategories(): NotificationCategory[] {
    return this.categories.filter(c => c.enabled);
  }

  /**
   * Update category settings
   */
  updateCategory(categoryId: string, updates: Partial<NotificationCategory>): boolean {
    const index = this.categories.findIndex(c => c.id === categoryId);
    if (index === -1) return false;

    this.categories[index] = { ...this.categories[index], ...updates };
    
    // Save to localStorage
    localStorage.setItem('notification-categories', JSON.stringify(this.categories));
    
    return true;
  }

  /**
   * Enable/disable all notifications
   */
  setAllNotifications(enabled: boolean): void {
    this.categories.forEach(category => {
      category.enabled = enabled;
    });
    
    localStorage.setItem('notification-categories', JSON.stringify(this.categories));
  }

  /**
   * Get subscription status
   */
  getSubscriptionStatus(): {
    supported: boolean;
    permission: NotificationPermission;
    subscribed: boolean;
    endpoint?: string;
  } {
    return {
      supported: 'PushManager' in window,
      permission: 'Notification' in window ? Notification.permission : 'denied',
      subscribed: !!this.subscription,
      endpoint: this.subscription?.endpoint
    };
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<boolean> {
    try {
      if (this.subscription) {
        await this.subscription.unsubscribe();
        this.subscription = null;
        
        // Remove from server (mock)
        localStorage.removeItem('push-subscription');
        
        console.log('📱 Push subscription removed');
      }
      
      return true;
    } catch (error) {
      errorService.logError('Failed to unsubscribe:', error);
      return false;
    }
  }

  /**
   * Test notification functionality
   */
  async testNotification(): Promise<boolean> {
    return this.sendLocalNotification({
      title: 'PersonaPass Test 🧪',
      body: 'Your notifications are working perfectly!',
      icon: '/icon.svg',
      tag: 'test',
      data: { type: 'test' },
      actions: [
        { action: 'great', title: 'Great!' }
      ]
    });
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
}

// Export singleton instance
export const pushNotificationService = PushNotificationService.getInstance();