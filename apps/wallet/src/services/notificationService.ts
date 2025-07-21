/**
 * Notification Service for PersonaPass Identity Wallet
 * Provides toast notifications and alerts
 */

export interface NotificationOptions {
  title?: string;
  duration?: number;
  type?: 'success' | 'error' | 'warning' | 'info';
  position?: 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  persist?: boolean;
}

export interface Notification {
  id: string;
  message: string;
  title?: string;
  type: 'success' | 'error' | 'warning' | 'info';
  timestamp: number;
  duration: number;
  persist: boolean;
}

export class NotificationService {
  private static instance: NotificationService;
  private notifications: Map<string, Notification> = new Map();
  private listeners: ((notifications: Notification[]) => void)[] = [];

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Show a notification
   */
  notify(message: string, options: NotificationOptions = {}): string {
    const id = this.generateId();
    const notification: Notification = {
      id,
      message,
      title: options.title,
      type: options.type || 'info',
      timestamp: Date.now(),
      duration: options.duration || 5000,
      persist: options.persist || false,
    };

    this.notifications.set(id, notification);
    this.notifyListeners();

    // Auto-remove notification after duration (unless persistent)
    if (!notification.persist) {
      setTimeout(() => {
        this.remove(id);
      }, notification.duration);
    }

    return id;
  }

  /**
   * Show success notification
   */
  success(message: string, options: Omit<NotificationOptions, 'type'> = {}): string {
    return this.notify(message, { ...options, type: 'success' });
  }

  /**
   * Show error notification
   */
  error(message: string, options: Omit<NotificationOptions, 'type'> = {}): string {
    return this.notify(message, { ...options, type: 'error', duration: options.duration || 8000 });
  }

  /**
   * Show warning notification
   */
  warning(message: string, options: Omit<NotificationOptions, 'type'> = {}): string {
    return this.notify(message, { ...options, type: 'warning' });
  }

  /**
   * Show info notification
   */
  info(message: string, options: Omit<NotificationOptions, 'type'> = {}): string {
    return this.notify(message, { ...options, type: 'info' });
  }

  /**
   * Remove a notification
   */
  remove(id: string): void {
    if (this.notifications.delete(id)) {
      this.notifyListeners();
    }
  }

  /**
   * Remove all notifications
   */
  clear(): void {
    this.notifications.clear();
    this.notifyListeners();
  }

  /**
   * Get all notifications
   */
  getAll(): Notification[] {
    return Array.from(this.notifications.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Add listener for notification changes
   */
  addListener(listener: (notifications: Notification[]) => void): void {
    this.listeners.push(listener);
    // Immediately call with current notifications
    listener(this.getAll());
  }

  /**
   * Remove listener
   */
  removeListener(listener: (notifications: Notification[]) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    const notifications = this.getAll();
    this.listeners.forEach(listener => {
      try {
        listener(notifications);
      } catch (error) {
        console.error('Error in notification listener:', error);
      }
    });
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return 'notification_' + Math.random().toString(36).substr(2, 9);
  }
}

export const notificationService = NotificationService.getInstance();

// Global notify function for compatibility
declare global {
  function notify(message: string, options?: NotificationOptions): string;
}

// Make notify available globally
if (typeof window !== 'undefined') {
  (window as any).notify = (message: string, options?: NotificationOptions) => {
    return notificationService.notify(message, options);
  };
}

export const notify = (message: string, options?: NotificationOptions) => {
  return notificationService.notify(message, options);
};