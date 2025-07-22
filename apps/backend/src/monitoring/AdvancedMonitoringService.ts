/**
 * PersonaChain Advanced Monitoring Service
 * Enterprise-grade monitoring with real-time analytics, distributed tracing,
 * intelligent alerting, and comprehensive observability
 */

import { EventEmitter } from 'events';
import { Logger } from 'winston';
import { createLogger, format, transports } from 'winston';
import * as crypto from 'crypto';
import * as os from 'os';

// Monitoring Data Structures
export interface MonitoringMetric {
  id: string;
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  value: number;
  timestamp: Date;
  labels: Record<string, string>;
  unit?: string;
  description?: string;
}

export interface DistributedTrace {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  serviceName: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: 'pending' | 'success' | 'error';
  tags: Record<string, any>;
  logs: TraceLog[];
  baggage?: Record<string, string>;
}

export interface TraceLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  fields?: Record<string, any>;
}

export interface ServiceHealth {
  serviceName: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  uptime: number;
  version: string;
  dependencies: ServiceDependency[];
  metrics: {
    requestsPerSecond: number;
    averageLatency: number;
    errorRate: number;
    cpuUsage: number;
    memoryUsage: number;
  };
  lastChecked: Date;
  checks: HealthCheck[];
}

export interface ServiceDependency {
  name: string;
  type: 'database' | 'api' | 'cache' | 'queue' | 'storage';
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  lastChecked: Date;
  endpoint?: string;
}

export interface HealthCheck {
  name: string;
  type: 'liveness' | 'readiness' | 'startup';
  status: 'pass' | 'fail' | 'warn';
  duration: number;
  output?: string;
  time: Date;
}

export interface Alert {
  id: string;
  name: string;
  type: 'metric' | 'log' | 'trace' | 'health' | 'security';
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  status: 'active' | 'resolved' | 'suppressed';
  description: string;
  query: string;
  threshold: number;
  currentValue: number;
  serviceName: string;
  createdAt: Date;
  resolvedAt?: Date;
  notifications: AlertNotification[];
  runbook?: string;
  silenced: boolean;
  silencedUntil?: Date;
}

export interface AlertNotification {
  id: string;
  type: 'email' | 'slack' | 'webhook' | 'sms' | 'pagerduty';
  destination: string;
  sentAt: Date;
  status: 'sent' | 'failed' | 'pending';
  retryCount: number;
}

export interface MonitoringDashboard {
  id: string;
  name: string;
  description: string;
  panels: DashboardPanel[];
  timeRange: TimeRange;
  refreshInterval: number;
  tags: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardPanel {
  id: string;
  title: string;
  type: 'graph' | 'table' | 'stat' | 'heatmap' | 'logs' | 'traces';
  query: string;
  visualization: {
    width: number;
    height: number;
    position: { x: number; y: number };
    options: Record<string, any>;
  };
  targets: MetricTarget[];
}

export interface MetricTarget {
  query: string;
  legend: string;
  refId: string;
  datasource: string;
}

export interface TimeRange {
  from: Date;
  to: Date;
}

export interface MonitoringConfig {
  retentionPeriod: number;
  samplingRate: number;
  maxTraceLength: number;
  alertingEnabled: boolean;
  distributedTracingEnabled: boolean;
  metricsAggregationInterval: number;
  healthCheckInterval: number;
}

export interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    loadAverage: number[];
    cores: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    cached: number;
    buffers: number;
    available: number;
    percentage: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    percentage: number;
    readOps: number;
    writeOps: number;
    readBytes: number;
    writeBytes: number;
  };
  network: {
    bytesReceived: number;
    bytesSent: number;
    packetsReceived: number;
    packetsSent: number;
    errors: number;
    dropped: number;
  };
  processes: {
    total: number;
    running: number;
    sleeping: number;
    stopped: number;
    zombie: number;
  };
}

/**
 * Advanced Monitoring Service
 * Comprehensive monitoring with distributed tracing, metrics collection,
 * intelligent alerting, and real-time observability
 */
export class AdvancedMonitoringService extends EventEmitter {
  private logger: Logger;
  private config: MonitoringConfig;
  private metrics: Map<string, MonitoringMetric[]> = new Map();
  private traces: Map<string, DistributedTrace> = new Map();
  private spans: Map<string, DistributedTrace> = new Map();
  private services: Map<string, ServiceHealth> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private dashboards: Map<string, MonitoringDashboard> = new Map();
  private activeTraces: Map<string, DistributedTrace> = new Map();
  private systemMetrics: SystemMetrics[] = [];
  private alertRules: Map<string, AlertRule> = new Map();
  private notificationChannels: Map<string, NotificationChannel> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private metricsAggregationInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(config?: Partial<MonitoringConfig>) {
    super();
    this.config = {
      retentionPeriod: 30 * 24 * 60 * 60 * 1000, // 30 days
      samplingRate: 1.0, // 100% sampling
      maxTraceLength: 1000,
      alertingEnabled: true,
      distributedTracingEnabled: true,
      metricsAggregationInterval: 60000, // 1 minute
      healthCheckInterval: 30000, // 30 seconds
      ...config
    };
    
    this.initializeLogger();
    this.initializeAlertRules();
    this.initializeNotificationChannels();
    this.initializeServices();
    this.initializeDashboards();
    this.startMonitoring();
  }

  private initializeLogger(): void {
    this.logger = createLogger({
      level: 'info',
      format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.json()
      ),
      defaultMeta: { service: 'advanced-monitoring' },
      transports: [
        new transports.File({ filename: 'logs/monitoring-error.log', level: 'error' }),
        new transports.File({ filename: 'logs/monitoring-combined.log' }),
        new transports.Console({
          format: format.combine(
            format.colorize(),
            format.simple()
          )
        })
      ]
    });
  }

  private initializeAlertRules(): void {
    // High CPU usage alert
    this.alertRules.set('high_cpu_usage', {
      id: 'high_cpu_usage',
      name: 'High CPU Usage',
      type: 'metric',
      query: 'cpu_usage_percentage',
      threshold: 80,
      severity: 'warning',
      duration: 300000, // 5 minutes
      enabled: true,
      description: 'CPU usage is above 80% for more than 5 minutes',
      runbook: 'https://runbooks.example.com/high-cpu'
    });

    // High memory usage alert
    this.alertRules.set('high_memory_usage', {
      id: 'high_memory_usage',
      name: 'High Memory Usage',
      type: 'metric',
      query: 'memory_usage_percentage',
      threshold: 85,
      severity: 'warning',
      duration: 300000,
      enabled: true,
      description: 'Memory usage is above 85% for more than 5 minutes',
      runbook: 'https://runbooks.example.com/high-memory'
    });

    // High error rate alert
    this.alertRules.set('high_error_rate', {
      id: 'high_error_rate',
      name: 'High Error Rate',
      type: 'metric',
      query: 'error_rate_percentage',
      threshold: 5,
      severity: 'critical',
      duration: 60000, // 1 minute
      enabled: true,
      description: 'Error rate is above 5% for more than 1 minute',
      runbook: 'https://runbooks.example.com/high-error-rate'
    });

    // Service unavailable alert
    this.alertRules.set('service_unavailable', {
      id: 'service_unavailable',
      name: 'Service Unavailable',
      type: 'health',
      query: 'service_health_status',
      threshold: 0, // 0 = unhealthy
      severity: 'emergency',
      duration: 60000,
      enabled: true,
      description: 'Service is unavailable',
      runbook: 'https://runbooks.example.com/service-unavailable'
    });

    // Slow response time alert
    this.alertRules.set('slow_response_time', {
      id: 'slow_response_time',
      name: 'Slow Response Time',
      type: 'metric',
      query: 'response_time_p95',
      threshold: 2000, // 2 seconds
      severity: 'warning',
      duration: 180000, // 3 minutes
      enabled: true,
      description: 'P95 response time is above 2 seconds for more than 3 minutes',
      runbook: 'https://runbooks.example.com/slow-response'
    });
  }

  private initializeNotificationChannels(): void {
    // Email notifications
    this.notificationChannels.set('admin_email', {
      id: 'admin_email',
      type: 'email',
      name: 'Admin Email',
      config: {
        recipients: ['admin@personachain.com'],
        subject: '[PersonaChain] Alert: {{alert.name}}',
        template: 'alert_email'
      },
      enabled: true
    });

    // Slack notifications
    this.notificationChannels.set('dev_slack', {
      id: 'dev_slack',
      type: 'slack',
      name: 'Development Team Slack',
      config: {
        webhook: 'https://hooks.slack.com/services/...',
        channel: '#alerts',
        username: 'PersonaChain Monitor'
      },
      enabled: true
    });

    // Webhook notifications
    this.notificationChannels.set('ops_webhook', {
      id: 'ops_webhook',
      type: 'webhook',
      name: 'Operations Webhook',
      config: {
        url: 'https://ops.personachain.com/webhooks/alerts',
        method: 'POST',
        headers: {
          'Authorization': 'Bearer {{token}}',
          'Content-Type': 'application/json'
        }
      },
      enabled: true
    });
  }

  private initializeServices(): void {
    // Register core services
    this.registerService('personachain-api', {
      serviceName: 'personachain-api',
      status: 'healthy',
      uptime: 0,
      version: '1.0.0',
      dependencies: [
        {
          name: 'postgresql',
          type: 'database',
          status: 'healthy',
          latency: 0,
          lastChecked: new Date(),
          endpoint: 'postgresql://localhost:5432/personachain'
        },
        {
          name: 'redis',
          type: 'cache',
          status: 'healthy',
          latency: 0,
          lastChecked: new Date(),
          endpoint: 'redis://localhost:6379'
        }
      ],
      metrics: {
        requestsPerSecond: 0,
        averageLatency: 0,
        errorRate: 0,
        cpuUsage: 0,
        memoryUsage: 0
      },
      lastChecked: new Date(),
      checks: []
    });

    this.registerService('personachain-blockchain', {
      serviceName: 'personachain-blockchain',
      status: 'healthy',
      uptime: 0,
      version: '1.0.0',
      dependencies: [
        {
          name: 'cosmos-consensus',
          type: 'api',
          status: 'healthy',
          latency: 0,
          lastChecked: new Date(),
          endpoint: 'tcp://localhost:26657'
        }
      ],
      metrics: {
        requestsPerSecond: 0,
        averageLatency: 0,
        errorRate: 0,
        cpuUsage: 0,
        memoryUsage: 0
      },
      lastChecked: new Date(),
      checks: []
    });

    this.registerService('personachain-wallet', {
      serviceName: 'personachain-wallet',
      status: 'healthy',
      uptime: 0,
      version: '1.0.0',
      dependencies: [
        {
          name: 'personachain-api',
          type: 'api',
          status: 'healthy',
          latency: 0,
          lastChecked: new Date(),
          endpoint: 'https://api.personachain.com'
        }
      ],
      metrics: {
        requestsPerSecond: 0,
        averageLatency: 0,
        errorRate: 0,
        cpuUsage: 0,
        memoryUsage: 0
      },
      lastChecked: new Date(),
      checks: []
    });
  }

  private initializeDashboards(): void {
    // System Overview Dashboard
    this.createDashboard({
      id: 'system_overview',
      name: 'System Overview',
      description: 'High-level view of system health and performance',
      panels: [
        {
          id: 'cpu_usage',
          title: 'CPU Usage',
          type: 'graph',
          query: 'cpu_usage_percentage',
          visualization: {
            width: 12,
            height: 6,
            position: { x: 0, y: 0 },
            options: {
              yAxis: { min: 0, max: 100, unit: '%' },
              legend: { show: true }
            }
          },
          targets: [
            {
              query: 'avg(cpu_usage_percentage)',
              legend: 'Average CPU Usage',
              refId: 'A',
              datasource: 'prometheus'
            }
          ]
        },
        {
          id: 'memory_usage',
          title: 'Memory Usage',
          type: 'graph',
          query: 'memory_usage_percentage',
          visualization: {
            width: 12,
            height: 6,
            position: { x: 12, y: 0 },
            options: {
              yAxis: { min: 0, max: 100, unit: '%' },
              legend: { show: true }
            }
          },
          targets: [
            {
              query: 'avg(memory_usage_percentage)',
              legend: 'Average Memory Usage',
              refId: 'B',
              datasource: 'prometheus'
            }
          ]
        },
        {
          id: 'request_rate',
          title: 'Request Rate',
          type: 'graph',
          query: 'request_rate_per_second',
          visualization: {
            width: 12,
            height: 6,
            position: { x: 0, y: 6 },
            options: {
              yAxis: { min: 0, unit: 'req/s' },
              legend: { show: true }
            }
          },
          targets: [
            {
              query: 'sum(rate(http_requests_total[5m]))',
              legend: 'Total Request Rate',
              refId: 'C',
              datasource: 'prometheus'
            }
          ]
        },
        {
          id: 'error_rate',
          title: 'Error Rate',
          type: 'graph',
          query: 'error_rate_percentage',
          visualization: {
            width: 12,
            height: 6,
            position: { x: 12, y: 6 },
            options: {
              yAxis: { min: 0, max: 100, unit: '%' },
              legend: { show: true },
              thresholds: [
                { value: 1, color: 'yellow' },
                { value: 5, color: 'red' }
              ]
            }
          },
          targets: [
            {
              query: 'rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) * 100',
              legend: 'Error Rate',
              refId: 'D',
              datasource: 'prometheus'
            }
          ]
        }
      ],
      timeRange: {
        from: new Date(Date.now() - 3600000), // Last hour
        to: new Date()
      },
      refreshInterval: 30000, // 30 seconds
      tags: ['system', 'overview'],
      createdBy: 'system',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Identity Services Dashboard
    this.createDashboard({
      id: 'identity_services',
      name: 'Identity Services',
      description: 'Monitoring for identity and verification services',
      panels: [
        {
          id: 'vc_creation_rate',
          title: 'VC Creation Rate',
          type: 'graph',
          query: 'vc_creation_rate',
          visualization: {
            width: 12,
            height: 6,
            position: { x: 0, y: 0 },
            options: {
              yAxis: { min: 0, unit: 'vc/min' },
              legend: { show: true }
            }
          },
          targets: [
            {
              query: 'rate(vc_created_total[5m]) * 60',
              legend: 'VC Creation Rate',
              refId: 'A',
              datasource: 'prometheus'
            }
          ]
        },
        {
          id: 'zk_proof_latency',
          title: 'ZK Proof Generation Latency',
          type: 'graph',
          query: 'zk_proof_duration_seconds',
          visualization: {
            width: 12,
            height: 6,
            position: { x: 12, y: 0 },
            options: {
              yAxis: { min: 0, unit: 's' },
              legend: { show: true }
            }
          },
          targets: [
            {
              query: 'histogram_quantile(0.95, rate(zk_proof_duration_seconds_bucket[5m]))',
              legend: 'P95 ZK Proof Latency',
              refId: 'B',
              datasource: 'prometheus'
            }
          ]
        },
        {
          id: 'did_operations',
          title: 'DID Operations',
          type: 'stat',
          query: 'did_operations_total',
          visualization: {
            width: 6,
            height: 6,
            position: { x: 0, y: 6 },
            options: {
              colorMode: 'value',
              graphMode: 'area',
              justifyMode: 'center'
            }
          },
          targets: [
            {
              query: 'increase(did_operations_total[1h])',
              legend: 'DID Operations (1h)',
              refId: 'C',
              datasource: 'prometheus'
            }
          ]
        },
        {
          id: 'verification_success_rate',
          title: 'Verification Success Rate',
          type: 'stat',
          query: 'verification_success_rate',
          visualization: {
            width: 6,
            height: 6,
            position: { x: 6, y: 6 },
            options: {
              colorMode: 'value',
              unit: '%',
              thresholds: [
                { value: 95, color: 'green' },
                { value: 90, color: 'yellow' },
                { value: 0, color: 'red' }
              ]
            }
          },
          targets: [
            {
              query: 'rate(verification_success_total[5m]) / rate(verification_attempts_total[5m]) * 100',
              legend: 'Success Rate',
              refId: 'D',
              datasource: 'prometheus'
            }
          ]
        }
      ],
      timeRange: {
        from: new Date(Date.now() - 3600000),
        to: new Date()
      },
      refreshInterval: 30000,
      tags: ['identity', 'verification'],
      createdBy: 'system',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  private startMonitoring(): void {
    // Start system metrics collection
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectSystemMetrics();
        await this.performHealthChecks();
        await this.evaluateAlerts();
        await this.cleanupOldData();
      } catch (error) {
        this.logger.error('Monitoring cycle error:', error);
      }
    }, 30000); // Every 30 seconds

    // Start metrics aggregation
    this.metricsAggregationInterval = setInterval(async () => {
      try {
        await this.aggregateMetrics();
      } catch (error) {
        this.logger.error('Metrics aggregation error:', error);
      }
    }, this.config.metricsAggregationInterval);

    // Start health checks
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.runHealthChecks();
      } catch (error) {
        this.logger.error('Health check error:', error);
      }
    }, this.config.healthCheckInterval);
  }

  private async collectSystemMetrics(): Promise<void> {
    try {
      const cpus = os.cpus();
      const loadAvg = os.loadavg();
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;

      const systemMetrics: SystemMetrics = {
        timestamp: new Date(),
        cpu: {
          usage: (loadAvg[0] / cpus.length) * 100,
          loadAverage: loadAvg,
          cores: cpus.length
        },
        memory: {
          total: totalMem,
          used: usedMem,
          free: freeMem,
          cached: 0,
          buffers: 0,
          available: freeMem,
          percentage: (usedMem / totalMem) * 100
        },
        disk: {
          total: 0,
          used: 0,
          free: 0,
          percentage: 0,
          readOps: 0,
          writeOps: 0,
          readBytes: 0,
          writeBytes: 0
        },
        network: {
          bytesReceived: 0,
          bytesSent: 0,
          packetsReceived: 0,
          packetsSent: 0,
          errors: 0,
          dropped: 0
        },
        processes: {
          total: 0,
          running: 0,
          sleeping: 0,
          stopped: 0,
          zombie: 0
        }
      };

      this.systemMetrics.push(systemMetrics);

      // Keep only last 1000 system metrics
      if (this.systemMetrics.length > 1000) {
        this.systemMetrics = this.systemMetrics.slice(-1000);
      }

      // Emit metrics as monitoring metrics
      await this.recordMetric({
        id: `cpu_usage_${Date.now()}`,
        name: 'cpu_usage_percentage',
        type: 'gauge',
        value: systemMetrics.cpu.usage,
        timestamp: systemMetrics.timestamp,
        labels: { instance: 'local' },
        unit: '%',
        description: 'CPU usage percentage'
      });

      await this.recordMetric({
        id: `memory_usage_${Date.now()}`,
        name: 'memory_usage_percentage',
        type: 'gauge',
        value: systemMetrics.memory.percentage,
        timestamp: systemMetrics.timestamp,
        labels: { instance: 'local' },
        unit: '%',
        description: 'Memory usage percentage'
      });

    } catch (error) {
      this.logger.error('Failed to collect system metrics:', error);
    }
  }

  private async performHealthChecks(): Promise<void> {
    for (const [serviceName, service] of this.services.entries()) {
      try {
        await this.checkServiceHealth(service);
      } catch (error) {
        this.logger.error(`Health check failed for ${serviceName}:`, error);
      }
    }
  }

  private async checkServiceHealth(service: ServiceHealth): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Simulate health check
      const isHealthy = Math.random() > 0.05; // 95% chance of being healthy
      const duration = Math.random() * 100 + 10; // 10-110ms
      
      const healthCheck: HealthCheck = {
        name: 'liveness_check',
        type: 'liveness',
        status: isHealthy ? 'pass' : 'fail',
        duration,
        time: new Date(),
        output: isHealthy ? 'Service is responsive' : 'Service timeout'
      };
      
      service.checks.push(healthCheck);
      service.lastChecked = new Date();
      service.status = isHealthy ? 'healthy' : 'unhealthy';
      service.uptime = Date.now() - startTime;
      
      // Keep only last 10 health checks
      if (service.checks.length > 10) {
        service.checks = service.checks.slice(-10);
      }
      
      // Check dependencies
      for (const dependency of service.dependencies) {
        const depHealthy = Math.random() > 0.02; // 98% chance
        dependency.status = depHealthy ? 'healthy' : 'unhealthy';
        dependency.latency = Math.random() * 50 + 5; // 5-55ms
        dependency.lastChecked = new Date();
      }
      
      // Update service metrics
      service.metrics = {
        requestsPerSecond: Math.random() * 1000 + 100,
        averageLatency: Math.random() * 500 + 50,
        errorRate: Math.random() * 2,
        cpuUsage: Math.random() * 80 + 10,
        memoryUsage: Math.random() * 70 + 20
      };
      
      this.emit('healthCheckCompleted', { service: service.serviceName, status: service.status });
      
    } catch (error) {
      this.logger.error(`Health check error for ${service.serviceName}:`, error);
      service.status = 'unknown';
    }
  }

  private async evaluateAlerts(): Promise<void> {
    for (const [ruleId, rule] of this.alertRules.entries()) {
      if (!rule.enabled) continue;
      
      try {
        await this.evaluateAlertRule(rule);
      } catch (error) {
        this.logger.error(`Alert rule evaluation failed for ${ruleId}:`, error);
      }
    }
  }

  private async evaluateAlertRule(rule: AlertRule): Promise<void> {
    // Get current value for the metric
    const currentValue = await this.getMetricValue(rule.query);
    const shouldAlert = this.shouldTriggerAlert(rule, currentValue);
    
    const existingAlert = Array.from(this.alerts.values())
      .find(alert => alert.name === rule.name && alert.status === 'active');
    
    if (shouldAlert && !existingAlert) {
      // Create new alert
      await this.createAlert(rule, currentValue);
    } else if (!shouldAlert && existingAlert) {
      // Resolve existing alert
      await this.resolveAlert(existingAlert.id);
    }
  }

  private async getMetricValue(query: string): Promise<number> {
    // Simulate metric retrieval based on query
    switch (query) {
      case 'cpu_usage_percentage':
        const cpuMetrics = this.getMetricsByName('cpu_usage_percentage');
        return cpuMetrics.length > 0 ? cpuMetrics[cpuMetrics.length - 1].value : 0;
      
      case 'memory_usage_percentage':
        const memMetrics = this.getMetricsByName('memory_usage_percentage');
        return memMetrics.length > 0 ? memMetrics[memMetrics.length - 1].value : 0;
      
      case 'error_rate_percentage':
        return Math.random() * 10; // Simulate error rate
      
      case 'service_health_status':
        const unhealthyServices = Array.from(this.services.values())
          .filter(service => service.status === 'unhealthy');
        return unhealthyServices.length > 0 ? 0 : 1;
      
      case 'response_time_p95':
        return Math.random() * 3000 + 500; // Simulate response time
      
      default:
        return 0;
    }
  }

  private shouldTriggerAlert(rule: AlertRule, currentValue: number): boolean {
    switch (rule.type) {
      case 'metric':
        return currentValue > rule.threshold;
      case 'health':
        return currentValue <= rule.threshold;
      default:
        return false;
    }
  }

  private async createAlert(rule: AlertRule, currentValue: number): Promise<void> {
    const alertId = crypto.randomUUID();
    
    const alert: Alert = {
      id: alertId,
      name: rule.name,
      type: rule.type,
      severity: rule.severity,
      status: 'active',
      description: rule.description,
      query: rule.query,
      threshold: rule.threshold,
      currentValue,
      serviceName: 'system',
      createdAt: new Date(),
      notifications: [],
      runbook: rule.runbook,
      silenced: false
    };
    
    this.alerts.set(alertId, alert);
    this.emit('alertCreated', alert);
    
    // Send notifications
    if (this.config.alertingEnabled) {
      await this.sendAlertNotifications(alert);
    }
    
    this.logger.warn(`Alert created: ${alert.name}`, {
      alertId,
      currentValue,
      threshold: rule.threshold
    });
  }

  private async resolveAlert(alertId: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (!alert) return;
    
    alert.status = 'resolved';
    alert.resolvedAt = new Date();
    
    this.emit('alertResolved', alert);
    this.logger.info(`Alert resolved: ${alert.name}`, { alertId });
  }

  private async sendAlertNotifications(alert: Alert): Promise<void> {
    const channels = Array.from(this.notificationChannels.values())
      .filter(channel => channel.enabled);
    
    for (const channel of channels) {
      try {
        const notification = await this.sendNotification(alert, channel);
        alert.notifications.push(notification);
      } catch (error) {
        this.logger.error(`Failed to send notification via ${channel.name}:`, error);
      }
    }
  }

  private async sendNotification(alert: Alert, channel: NotificationChannel): Promise<AlertNotification> {
    const notificationId = crypto.randomUUID();
    
    const notification: AlertNotification = {
      id: notificationId,
      type: channel.type,
      destination: channel.name,
      sentAt: new Date(),
      status: 'sent',
      retryCount: 0
    };
    
    // Simulate notification sending
    this.logger.info(`Sending ${channel.type} notification for alert: ${alert.name}`);
    
    return notification;
  }

  private async aggregateMetrics(): Promise<void> {
    // Aggregate metrics for better query performance
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    
    for (const [metricName, metrics] of this.metrics.entries()) {
      const recentMetrics = metrics.filter(m => m.timestamp >= oneMinuteAgo);
      
      if (recentMetrics.length > 0) {
        const avgValue = recentMetrics.reduce((sum, m) => sum + m.value, 0) / recentMetrics.length;
        
        // Record aggregated metric
        await this.recordMetric({
          id: `${metricName}_1m_avg_${Date.now()}`,
          name: `${metricName}_1m_avg`,
          type: 'gauge',
          value: avgValue,
          timestamp: now,
          labels: { aggregation: '1m_avg' },
          description: `1-minute average of ${metricName}`
        });
      }
    }
  }

  private async runHealthChecks(): Promise<void> {
    // Additional health checks beyond service health
    await this.checkSystemHealth();
    await this.checkDiskSpace();
    await this.checkNetworkConnectivity();
  }

  private async checkSystemHealth(): Promise<void> {
    const latestMetrics = this.systemMetrics[this.systemMetrics.length - 1];
    if (!latestMetrics) return;
    
    // Check if system is under stress
    const isSystemHealthy = 
      latestMetrics.cpu.usage < 90 &&
      latestMetrics.memory.percentage < 90;
    
    await this.recordMetric({
      id: `system_health_${Date.now()}`,
      name: 'system_health_status',
      type: 'gauge',
      value: isSystemHealthy ? 1 : 0,
      timestamp: new Date(),
      labels: { component: 'system' },
      description: 'Overall system health status'
    });
  }

  private async checkDiskSpace(): Promise<void> {
    // Simulate disk space check
    const diskUsage = Math.random() * 100;
    
    await this.recordMetric({
      id: `disk_usage_${Date.now()}`,
      name: 'disk_usage_percentage',
      type: 'gauge',
      value: diskUsage,
      timestamp: new Date(),
      labels: { mount: '/' },
      unit: '%',
      description: 'Disk usage percentage'
    });
  }

  private async checkNetworkConnectivity(): Promise<void> {
    // Simulate network connectivity check
    const isConnected = Math.random() > 0.01; // 99% uptime
    
    await this.recordMetric({
      id: `network_connectivity_${Date.now()}`,
      name: 'network_connectivity',
      type: 'gauge',
      value: isConnected ? 1 : 0,
      timestamp: new Date(),
      labels: { type: 'external' },
      description: 'Network connectivity status'
    });
  }

  private async cleanupOldData(): Promise<void> {
    const cutoffTime = new Date(Date.now() - this.config.retentionPeriod);
    
    // Clean up old metrics
    for (const [metricName, metrics] of this.metrics.entries()) {
      const filteredMetrics = metrics.filter(m => m.timestamp > cutoffTime);
      this.metrics.set(metricName, filteredMetrics);
    }
    
    // Clean up old traces
    for (const [traceId, trace] of this.traces.entries()) {
      if (trace.startTime < cutoffTime) {
        this.traces.delete(traceId);
      }
    }
    
    // Clean up old alerts (keep resolved alerts for 7 days)
    const alertCutoff = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
    for (const [alertId, alert] of this.alerts.entries()) {
      if (alert.status === 'resolved' && alert.resolvedAt && alert.resolvedAt < alertCutoff) {
        this.alerts.delete(alertId);
      }
    }
  }

  // Public API Methods

  public async recordMetric(metric: MonitoringMetric): Promise<void> {
    if (!this.metrics.has(metric.name)) {
      this.metrics.set(metric.name, []);
    }
    
    const metrics = this.metrics.get(metric.name)!;
    metrics.push(metric);
    
    // Keep only last 10000 metrics per name
    if (metrics.length > 10000) {
      this.metrics.set(metric.name, metrics.slice(-10000));
    }
    
    this.emit('metricRecorded', metric);
  }

  public async startTrace(operationName: string, serviceName: string, parentSpanId?: string): Promise<string> {
    const traceId = crypto.randomUUID();
    const spanId = crypto.randomUUID();
    
    const trace: DistributedTrace = {
      traceId,
      spanId,
      parentSpanId,
      operationName,
      serviceName,
      startTime: new Date(),
      status: 'pending',
      tags: {},
      logs: []
    };
    
    this.traces.set(traceId, trace);
    this.spans.set(spanId, trace);
    this.activeTraces.set(traceId, trace);
    
    this.emit('traceStarted', trace);
    return traceId;
  }

  public async finishTrace(traceId: string, status: 'success' | 'error', tags?: Record<string, any>): Promise<void> {
    const trace = this.traces.get(traceId);
    if (!trace) return;
    
    trace.endTime = new Date();
    trace.duration = trace.endTime.getTime() - trace.startTime.getTime();
    trace.status = status;
    
    if (tags) {
      trace.tags = { ...trace.tags, ...tags };
    }
    
    this.activeTraces.delete(traceId);
    this.emit('traceFinished', trace);
  }

  public async addTraceLog(traceId: string, level: TraceLog['level'], message: string, fields?: Record<string, any>): Promise<void> {
    const trace = this.traces.get(traceId);
    if (!trace) return;
    
    trace.logs.push({
      timestamp: new Date(),
      level,
      message,
      fields
    });
  }

  public async registerService(serviceName: string, health: ServiceHealth): Promise<void> {
    this.services.set(serviceName, health);
    this.emit('serviceRegistered', health);
  }

  public async createDashboard(dashboard: MonitoringDashboard): Promise<void> {
    this.dashboards.set(dashboard.id, dashboard);
    this.emit('dashboardCreated', dashboard);
  }

  public getMetrics(metricName?: string): MonitoringMetric[] {
    if (metricName) {
      return this.metrics.get(metricName) || [];
    }
    
    const allMetrics: MonitoringMetric[] = [];
    for (const metrics of this.metrics.values()) {
      allMetrics.push(...metrics);
    }
    return allMetrics;
  }

  public getMetricsByName(name: string): MonitoringMetric[] {
    return this.metrics.get(name) || [];
  }

  public getTraces(): DistributedTrace[] {
    return Array.from(this.traces.values());
  }

  public getTrace(traceId: string): DistributedTrace | undefined {
    return this.traces.get(traceId);
  }

  public getServiceHealth(): ServiceHealth[] {
    return Array.from(this.services.values());
  }

  public getService(serviceName: string): ServiceHealth | undefined {
    return this.services.get(serviceName);
  }

  public getAlerts(status?: Alert['status']): Alert[] {
    const alerts = Array.from(this.alerts.values());
    return status ? alerts.filter(alert => alert.status === status) : alerts;
  }

  public getDashboards(): MonitoringDashboard[] {
    return Array.from(this.dashboards.values());
  }

  public getDashboard(dashboardId: string): MonitoringDashboard | undefined {
    return this.dashboards.get(dashboardId);
  }

  public async silenceAlert(alertId: string, duration: number): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;
    
    alert.silenced = true;
    alert.silencedUntil = new Date(Date.now() + duration);
    
    this.emit('alertSilenced', alert);
    return true;
  }

  public async acknowledgeAlert(alertId: string): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;
    
    // Mark as acknowledged (could add acknowledgedBy field)
    this.emit('alertAcknowledged', alert);
    return true;
  }

  public getSystemMetrics(): SystemMetrics[] {
    return this.systemMetrics;
  }

  public getLatestSystemMetrics(): SystemMetrics | undefined {
    return this.systemMetrics[this.systemMetrics.length - 1];
  }

  public destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    if (this.metricsAggregationInterval) {
      clearInterval(this.metricsAggregationInterval);
    }
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    this.removeAllListeners();
    this.logger.info('Advanced Monitoring Service destroyed');
  }
}

// Supporting interfaces
interface AlertRule {
  id: string;
  name: string;
  type: 'metric' | 'log' | 'trace' | 'health';
  query: string;
  threshold: number;
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  duration: number;
  enabled: boolean;
  description: string;
  runbook?: string;
}

interface NotificationChannel {
  id: string;
  type: 'email' | 'slack' | 'webhook' | 'sms' | 'pagerduty';
  name: string;
  config: Record<string, any>;
  enabled: boolean;
}

export default AdvancedMonitoringService;