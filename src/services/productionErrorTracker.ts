/**
 * Production Error Tracking Service
 * Real-time error monitoring and analytics for production deployment
 */

import { errorService, ErrorCategory, ErrorSeverity, PersonaPassError } from './errorService';
import { NotificationService } from './notificationService';

export interface ErrorMetrics {
  totalErrors: number;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  lastError?: {
    timestamp: number;
    message: string;
    category: ErrorCategory;
    severity: ErrorSeverity;
  };
  errorRate: number; // errors per minute
  uptimePercentage: number;
}

export interface AlertConfig {
  maxErrorsPerMinute: number;
  criticalErrorThreshold: number;
  minUptimePercentage: number;
  enableNotifications: boolean;
  enableConsoleLogging: boolean;
  enableRemoteLogging: boolean;
}

export class ProductionErrorTracker {
  private static instance: ProductionErrorTracker;
  private errors: PersonaPassError[] = [];
  private metrics: ErrorMetrics;
  private alertConfig: AlertConfig;
  private startTime: number;
  private lastErrorCheck: number;
  private notificationService: NotificationService;

  private constructor() {
    this.startTime = Date.now();
    this.lastErrorCheck = Date.now();
    this.notificationService = NotificationService.getInstance();
    
    this.metrics = {
      totalErrors: 0,
      errorsByCategory: {} as Record<ErrorCategory, number>,
      errorsBySeverity: {} as Record<ErrorSeverity, number>,
      errorRate: 0,
      uptimePercentage: 100,
    };

    this.alertConfig = {
      maxErrorsPerMinute: 10,
      criticalErrorThreshold: 3,
      minUptimePercentage: 99.0,
      enableNotifications: true,
      enableConsoleLogging: true,
      enableRemoteLogging: false, // Disable for now, can be enabled with proper endpoint
    };

    // Initialize category and severity counters
    Object.values(ErrorCategory).forEach(category => {
      this.metrics.errorsByCategory[category] = 0;
    });
    
    Object.values(ErrorSeverity).forEach(severity => {
      this.metrics.errorsBySeverity[severity] = 0;
    });

    this.setupGlobalErrorHandlers();
    this.startMetricsCollection();
  }

  static getInstance(): ProductionErrorTracker {
    if (!ProductionErrorTracker.instance) {
      ProductionErrorTracker.instance = new ProductionErrorTracker();
    }
    return ProductionErrorTracker.instance;
  }

  /**
   * Track a new error
   */
  trackError(error: PersonaPassError | Error, context?: any): void {
    // Filter out WASM and extension errors that we've intentionally blocked
    const errorMessage = error instanceof PersonaPassError ? error.message : error.message;
    const shouldSuppress = 
      errorMessage.includes('WebAssembly') ||
      errorMessage.includes('wasm') ||
      errorMessage.includes('MIME type') ||
      errorMessage.includes('application/wasm') ||
      errorMessage.includes('WASM_SILENTLY_BLOCKED') ||
      errorMessage.includes('WASM file completely blocked') ||
      errorMessage.includes('chrome-extension') ||
      errorMessage.includes('hook.js') ||
      errorMessage.includes('overrideMethod') ||
      errorMessage.includes('Failed to execute \'compile\' on \'WebAssembly\'');
    
    if (shouldSuppress) {
      // Don't track suppressed errors
      return;
    }

    const personaError = error instanceof PersonaPassError 
      ? error 
      : this.convertToPersonaPassError(error, context);

    this.errors.push(personaError);
    this.updateMetrics(personaError);
    this.checkAlerts(personaError);
    this.logError(personaError);
  }

  /**
   * Get current error metrics
   */
  getMetrics(): ErrorMetrics {
    this.calculateUptime();
    return { ...this.metrics };
  }

  /**
   * Get recent errors (last 100)
   */
  getRecentErrors(limit: number = 100): PersonaPassError[] {
    return this.errors.slice(-limit);
  }

  /**
   * Clear error history (useful for testing)
   */
  clearErrors(): void {
    this.errors = [];
    this.resetMetrics();
  }

  /**
   * Update alert configuration
   */
  updateAlertConfig(config: Partial<AlertConfig>): void {
    this.alertConfig = { ...this.alertConfig, ...config };
  }

  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const reasonStr = String(event.reason);
      
      // Filter out WASM and extension errors
      if (reasonStr.includes('WebAssembly') ||
          reasonStr.includes('wasm') ||
          reasonStr.includes('MIME type') ||
          reasonStr.includes('application/wasm') ||
          reasonStr.includes('WASM_SILENTLY_BLOCKED') ||
          reasonStr.includes('WASM file completely blocked') ||
          reasonStr.includes('chrome-extension') ||
          reasonStr.includes('hook.js')) {
        return; // Don't track these errors
      }
      
      const error = new Error(`Unhandled Promise Rejection: ${event.reason}`);
      this.trackError(error, { 
        type: 'unhandled_promise_rejection',
        reason: event.reason 
      });
    });

    // Handle global JavaScript errors
    window.addEventListener('error', (event) => {
      // Filter out WASM and extension errors
      if (event.message?.includes('WebAssembly') ||
          event.message?.includes('wasm') ||
          event.message?.includes('MIME type') ||
          event.message?.includes('application/wasm') ||
          event.message?.includes('WASM_SILENTLY_BLOCKED') ||
          event.message?.includes('WASM file completely blocked') ||
          event.message?.includes('chrome-extension') ||
          event.filename?.includes('chrome-extension') ||
          event.filename?.includes('hook.js')) {
        return; // Don't track these errors
      }
      
      const error = new Error(`Global Error: ${event.message}`);
      this.trackError(error, {
        type: 'global_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });
  }

  private convertToPersonaPassError(error: Error, context?: any): PersonaPassError {
    const errorContext = {
      component: context?.component || 'unknown',
      action: context?.action || 'unknown',
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      metadata: context
    };

    return new PersonaPassError(
      'UNKNOWN_ERROR',
      error.message,
      ErrorCategory.INTERNAL,
      ErrorSeverity.MEDIUM,
      errorContext,
      {
        originalError: error,
        retryable: false,
        userMessage: 'An unexpected error occurred. Please try again.'
      }
    );
  }

  private updateMetrics(error: PersonaPassError): void {
    this.metrics.totalErrors++;
    this.metrics.errorsByCategory[error.category]++;
    this.metrics.errorsBySeverity[error.severity]++;
    
    this.metrics.lastError = {
      timestamp: error.context.timestamp,
      message: error.message,
      category: error.category,
      severity: error.severity
    };

    this.calculateErrorRate();
  }

  private calculateErrorRate(): void {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    const recentErrors = this.errors.filter(error => 
      error.context.timestamp > oneMinuteAgo
    );
    
    this.metrics.errorRate = recentErrors.length;
  }

  private calculateUptime(): void {
    const now = Date.now();
    const totalTime = now - this.startTime;
    const criticalErrors = this.metrics.errorsBySeverity[ErrorSeverity.CRITICAL];
    
    // Simple uptime calculation: reduce uptime by 0.1% for each critical error
    const uptimeReduction = criticalErrors * 0.1;
    this.metrics.uptimePercentage = Math.max(0, 100 - uptimeReduction);
  }

  private checkAlerts(error: PersonaPassError): void {
    // Check error rate
    if (this.metrics.errorRate > this.alertConfig.maxErrorsPerMinute) {
      this.triggerAlert(
        'HIGH_ERROR_RATE',
        `Error rate exceeded: ${this.metrics.errorRate} errors/min`,
        ErrorSeverity.HIGH
      );
    }

    // Check critical errors
    if (error.severity === ErrorSeverity.CRITICAL) {
      this.triggerAlert(
        'CRITICAL_ERROR',
        `Critical error occurred: ${error.message}`,
        ErrorSeverity.CRITICAL
      );
    }

    // Check uptime
    this.calculateUptime();
    if (this.metrics.uptimePercentage < this.alertConfig.minUptimePercentage) {
      this.triggerAlert(
        'LOW_UPTIME',
        `Uptime dropped to ${this.metrics.uptimePercentage.toFixed(2)}%`,
        ErrorSeverity.HIGH
      );
    }
  }

  private triggerAlert(code: string, message: string, severity: ErrorSeverity): void {
    if (this.alertConfig.enableNotifications) {
      const alertType = severity === ErrorSeverity.CRITICAL ? 'error' : 'warning';
      this.notificationService.notify(message, {
        type: alertType,
        title: `Production Alert: ${code}`,
        duration: severity === ErrorSeverity.CRITICAL ? 0 : 10000, // Persist critical alerts
        persist: severity === ErrorSeverity.CRITICAL
      });
    }

    if (this.alertConfig.enableConsoleLogging) {
      console.error(`🚨 PRODUCTION ALERT [${code}]: ${message}`);
    }
  }

  private logError(error: PersonaPassError): void {
    if (this.alertConfig.enableConsoleLogging) {
      console.error('📊 Error Tracked:', {
        code: error.code,
        message: error.message,
        category: error.category,
        severity: error.severity,
        context: error.context,
        stack: error.stack
      });
    }

    // Future: Send to remote logging service
    if (this.alertConfig.enableRemoteLogging) {
      this.sendToRemoteLogger(error);
    }
  }

  private async sendToRemoteLogger(error: PersonaPassError): Promise<void> {
    try {
      // TODO: Implement when we have a logging endpoint
      // await fetch('/api/v1/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     error: error.message,
      //     code: error.code,
      //     category: error.category,
      //     severity: error.severity,
      //     context: error.context,
      //     timestamp: Date.now()
      //   })
      // });
    } catch (logError) {
      console.error('Failed to send error to remote logger:', logError);
    }
  }

  private startMetricsCollection(): void {
    // Update metrics every 30 seconds
    setInterval(() => {
      this.calculateErrorRate();
      this.calculateUptime();
    }, 30000);
  }

  private resetMetrics(): void {
    this.metrics = {
      totalErrors: 0,
      errorsByCategory: {} as Record<ErrorCategory, number>,
      errorsBySeverity: {} as Record<ErrorSeverity, number>,
      errorRate: 0,
      uptimePercentage: 100,
    };

    Object.values(ErrorCategory).forEach(category => {
      this.metrics.errorsByCategory[category] = 0;
    });
    
    Object.values(ErrorSeverity).forEach(severity => {
      this.metrics.errorsBySeverity[severity] = 0;
    });
  }

  /**
   * Health check method for monitoring
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: ErrorMetrics;
    alerts: string[];
  } {
    const metrics = this.getMetrics();
    const alerts: string[] = [];
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (metrics.errorRate > this.alertConfig.maxErrorsPerMinute) {
      alerts.push(`High error rate: ${metrics.errorRate}/min`);
      status = 'degraded';
    }

    if (metrics.errorsBySeverity[ErrorSeverity.CRITICAL] > 0) {
      alerts.push(`${metrics.errorsBySeverity[ErrorSeverity.CRITICAL]} critical errors`);
      status = 'unhealthy';
    }

    if (metrics.uptimePercentage < this.alertConfig.minUptimePercentage) {
      alerts.push(`Low uptime: ${metrics.uptimePercentage.toFixed(2)}%`);
      status = status === 'healthy' ? 'degraded' : status;
    }

    return { status, metrics, alerts };
  }
}

// Initialize the production error tracker
export const productionErrorTracker = ProductionErrorTracker.getInstance();

// Export for global access
declare global {
  interface Window {
    PersonaPassErrorTracker: ProductionErrorTracker;
  }
}

if (typeof window !== 'undefined') {
  window.PersonaPassErrorTracker = productionErrorTracker;
}