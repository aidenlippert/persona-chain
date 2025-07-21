/**
 * Lightweight Monitoring Service Stub
 * Performance-optimized minimal implementation
 */

export interface MetricData {
  name: string;
  value: number;
  timestamp: number;
  labels: Record<string, string>;
  unit?: string;
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  timestamp: number;
  context: Record<string, any>;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  stack?: string;
}

export interface PerformanceMetrics {
  responseTime: number;
  memoryUsage: number;
  apiCalls: number;
  errorRate: number;
  successRate: number;
  throughput: number;
  activeUsers: number;
  credentialCreations: number;
  blockchainTransactions: number;
}

export interface Alert {
  id: string;
  type: 'error_rate' | 'response_time' | 'memory_usage' | 'api_failure' | 'security_breach';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  acknowledged: boolean;
  resolved: boolean;
  metadata: Record<string, any>;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    [key: string]: {
      status: 'up' | 'down' | 'degraded';
      lastCheck: number;
      responseTime: number;
      errorRate: number;
    };
  };
  uptime: number;
  version: string;
}

/**
 * Lightweight monitoring service stub - no-op implementation for performance
 */
export class MonitoringService {
  private static instance: MonitoringService;

  private constructor() {
    // No initialization needed for stub
  }

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  // No-op methods - maintain API compatibility but do nothing
  log(level: LogEntry['level'], message: string, context: Record<string, any> = {}): void {
    // Only log errors to console for debugging
    if (level === 'error' || level === 'fatal') {
      errorService.logError(message, context);
    }
  }

  recordMetric(name: string, value: number, labels: Record<string, string> = {}, unit?: string): void {
    // No-op for performance
  }

  recordAPICall(endpoint: string, method: string, statusCode: number, responseTime: number, userId?: string): void {
    // No-op for performance
  }

  recordBlockchainTransaction(
    operation: string,
    success: boolean,
    gasUsed: number,
    transactionHash?: string,
    blockNumber?: number
  ): void {
    // No-op for performance
  }

  recordCredentialCreation(
    credentialType: string,
    provider: string,
    success: boolean,
    processingTime: number,
    userId?: string
  ): void {
    // No-op for performance
  }

  getMetrics(name: string, since?: number): MetricData[] {
    return [];
  }

  getAggregatedMetrics(name: string, timeWindow: number = 3600000): {
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
    p95: number;
    p99: number;
  } {
    return { count: 0, sum: 0, avg: 0, min: 0, max: 0, p95: 0, p99: 0 };
  }

  getLogs(
    level?: LogEntry['level'],
    since?: number,
    limit: number = 1000
  ): LogEntry[] {
    return [];
  }

  registerHealthCheck(name: string, check: () => Promise<boolean>): void {
    // No-op for performance
  }

  async getSystemHealth(): Promise<SystemHealth> {
    return {
      overall: 'healthy',
      components: {},
      uptime: Date.now(),
      version: '1.0.0',
    };
  }

  getAlerts(resolved?: boolean): Alert[] {
    return [];
  }

  acknowledgeAlert(alertId: string): boolean {
    return true;
  }

  resolveAlert(alertId: string): boolean {
    return true;
  }

  exportMetrics(): {
    metrics: Record<string, MetricData[]>;
    logs: LogEntry[];
    alerts: Alert[];
    health: SystemHealth;
  } {
    return {
      metrics: {},
      logs: [],
      alerts: [],
      health: {
        overall: 'healthy',
        components: {},
        uptime: Date.now(),
        version: '1.0.0',
      },
    };
  }
}

export const monitoringService = MonitoringService.getInstance();

// Lightweight logger - only console.error for actual errors
export const logger = {
  debug: (message: string, context?: Record<string, any>) => {}, // No-op
  info: (message: string, context?: Record<string, any>) => {}, // No-op  
  warn: (message: string, context?: Record<string, any>) => {}, // No-op
  error: (message: string, context?: Record<string, any>) => errorService.logError(message, context),
  fatal: (message: string, context?: Record<string, any>) => errorService.logError('FATAL:', message, context),
};