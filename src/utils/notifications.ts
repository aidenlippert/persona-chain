/**
 * Modern notification system to replace notify.info() calls
 * Provides better UX and works reliably across all browsers
 */

export interface NotificationOptions {
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number; // in milliseconds, 0 = permanent
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center';
}

class NotificationService {
  private container: HTMLElement | null = null;
  private notifications: Map<string, HTMLElement> = new Map();

  constructor() {
    this.createContainer();
  }

  private createContainer() {
    if (typeof window === 'undefined') return;

    this.container = document.createElement('div');
    this.container.id = 'persona-notifications';
    this.container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      pointer-events: none;
      max-width: 400px;
    `;
    document.body.appendChild(this.container);
  }

  show(options: NotificationOptions): string {
    if (!this.container) this.createContainer();
    if (!this.container) return '';

    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const notification = this.createNotificationElement(id, options);
    
    this.container.appendChild(notification);
    this.notifications.set(id, notification);

    // Animate in
    requestAnimationFrame(() => {
      notification.style.transform = 'translateX(0)';
      notification.style.opacity = '1';
    });

    // Auto-dismiss
    if (options.duration !== 0) {
      const duration = options.duration || this.getDefaultDuration(options.type);
      setTimeout(() => this.dismiss(id), duration);
    }

    return id;
  }

  private createNotificationElement(id: string, options: NotificationOptions): HTMLElement {
    const notification = document.createElement('div');
    notification.id = id;
    notification.style.cssText = `
      background: ${this.getBackgroundColor(options.type)};
      border: 1px solid ${this.getBorderColor(options.type)};
      color: ${this.getTextColor(options.type)};
      padding: 16px;
      margin-bottom: 12px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transform: translateX(100%);
      opacity: 0;
      transition: all 0.3s ease;
      pointer-events: auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.4;
      max-width: 100%;
      word-wrap: break-word;
    `;

    const icon = this.getIcon(options.type);
    const title = options.title ? `<div style="font-weight: 600; margin-bottom: 4px;">${this.escapeHtml(options.title)}</div>` : '';
    const closeButton = `
      <button onclick="notificationService.dismiss('${id}')" style="
        position: absolute;
        top: 8px;
        right: 8px;
        background: none;
        border: none;
        color: currentColor;
        opacity: 0.7;
        cursor: pointer;
        font-size: 18px;
        line-height: 1;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">×</button>
    `;

    notification.innerHTML = `
      <div style="position: relative; padding-right: 24px;">
        <div style="display: flex; align-items: flex-start;">
          <span style="margin-right: 8px; font-size: 16px;">${icon}</span>
          <div style="flex: 1;">
            ${title}
            <div>${this.escapeHtml(options.message)}</div>
          </div>
        </div>
        ${closeButton}
      </div>
    `;

    return notification;
  }

  dismiss(id: string) {
    const notification = this.notifications.get(id);
    if (!notification) return;

    notification.style.transform = 'translateX(100%)';
    notification.style.opacity = '0';

    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
      this.notifications.delete(id);
    }, 300);
  }

  dismissAll() {
    this.notifications.forEach((_, id) => this.dismiss(id));
  }

  private getIcon(type: string): string {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return 'ℹ️';
    }
  }

  private getBackgroundColor(type: string): string {
    switch (type) {
      case 'success': return '#f0fdf4';
      case 'error': return '#fef2f2';
      case 'warning': return '#fffbeb';
      case 'info': return '#f0f9ff';
      default: return '#f9fafb';
    }
  }

  private getBorderColor(type: string): string {
    switch (type) {
      case 'success': return '#bbf7d0';
      case 'error': return '#fecaca';
      case 'warning': return '#fed7aa';
      case 'info': return '#bae6fd';
      default: return '#e5e7eb';
    }
  }

  private getTextColor(type: string): string {
    switch (type) {
      case 'success': return '#166534';
      case 'error': return '#991b1b';
      case 'warning': return '#92400e';
      case 'info': return '#1e40af';
      default: return '#374151';
    }
  }

  private getDefaultDuration(type: string): number {
    switch (type) {
      case 'success': return 4000;
      case 'error': return 6000;
      case 'warning': return 5000;
      case 'info': return 4000;
      default: return 4000;
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Create global instance
export const notificationService = new NotificationService();

// Make it available globally for onclick handlers
if (typeof window !== 'undefined') {
  (window as any).notificationService = notificationService;
}

// Convenience functions
export const notify = {
  success: (message: string, title?: string, duration?: number) => 
    notificationService.show({ type: 'success', message, title, duration }),
  
  error: (message: string, title?: string, duration?: number) => 
    notificationService.show({ type: 'error', message, title, duration }),
  
  warning: (message: string, title?: string, duration?: number) => 
    notificationService.show({ type: 'warning', message, title, duration }),
  
  info: (message: string, title?: string, duration?: number) => 
    notificationService.show({ type: 'info', message, title, duration }),
};

// Enhanced console logging for development
export const devLog = {
  success: (message: string, data?: any) => {
    console.log(`✅ [SUCCESS] ${message}`, data || '');
    if (process.env.NODE_ENV === 'development') {
      notify.success(message);
    }
  },
  
  error: (message: string, error?: any) => {
    console.error(`❌ [ERROR] ${message}`, error || '');
    if (process.env.NODE_ENV === 'development') {
      notify.error(message);
    }
  },
  
  warning: (message: string, data?: any) => {
    console.warn(`⚠️ [WARNING] ${message}`, data || '');
    if (process.env.NODE_ENV === 'development') {
      notify.warning(message);
    }
  },
  
  info: (message: string, data?: any) => {
    console.log(`ℹ️ [INFO] ${message}`, data || '');
    if (process.env.NODE_ENV === 'development') {
      notify.info(message);
    }
  }
};

export default notificationService;