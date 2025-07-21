/**
 * Usage Analytics Service
 * Real-time usage tracking and analytics with advanced reporting
 * Enterprise-grade analytics platform with multi-dimensional data analysis
 */

import winston from 'winston';
import NodeCache from 'node-cache';
import Redis from 'ioredis';
import { DateTime } from 'luxon';
import crypto from 'crypto';

class UsageAnalyticsService {
  constructor() {
    this.cache = new NodeCache({ stdTTL: 600, checkperiod: 120 });
    this.redis = null;
    this.events = new Map();
    this.metrics = new Map();
    this.dashboards = new Map();
    this.reports = new Map();
    this.alerts = new Map();
    
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { service: 'usage-analytics' },
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/usage-analytics.log' })
      ]
    });

    // Event types and categories
    this.eventTypes = {
      USER_ACTIVITY: {
        name: 'User Activity',
        category: 'engagement',
        events: ['login', 'logout', 'page_view', 'session_start', 'session_end', 'feature_use']
      },
      API_USAGE: {
        name: 'API Usage',
        category: 'technical',
        events: ['api_call', 'api_error', 'rate_limit', 'auth_attempt', 'webhook_delivery']
      },
      FEATURE_USAGE: {
        name: 'Feature Usage',
        category: 'product',
        events: ['feature_enabled', 'feature_disabled', 'feature_configured', 'feature_accessed']
      },
      BILLING_EVENTS: {
        name: 'Billing Events',
        category: 'business',
        events: ['subscription_created', 'payment_processed', 'invoice_generated', 'usage_threshold']
      },
      SECURITY_EVENTS: {
        name: 'Security Events',
        category: 'security',
        events: ['failed_login', 'suspicious_activity', 'permission_denied', 'security_alert']
      },
      PERFORMANCE: {
        name: 'Performance Metrics',
        category: 'technical',
        events: ['response_time', 'error_rate', 'uptime', 'resource_usage']
      },
      BUSINESS_METRICS: {
        name: 'Business Metrics',
        category: 'business',
        events: ['conversion', 'churn', 'expansion', 'activation']
      }
    };

    // Metric definitions
    this.metricDefinitions = {
      ACTIVE_USERS: {
        name: 'Active Users',
        type: 'gauge',
        unit: 'count',
        aggregations: ['current', 'daily', 'weekly', 'monthly'],
        dimensions: ['tenant', 'feature', 'geography']
      },
      API_CALLS: {
        name: 'API Calls',
        type: 'counter',
        unit: 'count',
        aggregations: ['total', 'rate', 'daily', 'monthly'],
        dimensions: ['tenant', 'endpoint', 'status_code']
      },
      RESPONSE_TIME: {
        name: 'Response Time',
        type: 'histogram',
        unit: 'milliseconds',
        aggregations: ['mean', 'median', 'p95', 'p99'],
        dimensions: ['tenant', 'endpoint', 'method']
      },
      ERROR_RATE: {
        name: 'Error Rate',
        type: 'rate',
        unit: 'percentage',
        aggregations: ['current', 'daily', 'weekly'],
        dimensions: ['tenant', 'service', 'error_type']
      },
      STORAGE_USAGE: {
        name: 'Storage Usage',
        type: 'gauge',
        unit: 'bytes',
        aggregations: ['current', 'daily', 'growth'],
        dimensions: ['tenant', 'storage_type', 'region']
      },
      FEATURE_ADOPTION: {
        name: 'Feature Adoption',
        type: 'gauge',
        unit: 'percentage',
        aggregations: ['current', 'trend'],
        dimensions: ['tenant', 'feature', 'user_segment']
      },
      REVENUE_METRICS: {
        name: 'Revenue Metrics',
        type: 'gauge',
        unit: 'currency',
        aggregations: ['mrr', 'arr', 'growth'],
        dimensions: ['tenant', 'plan', 'geography']
      }
    };

    // Dashboard configurations
    this.dashboardTypes = {
      EXECUTIVE: {
        name: 'Executive Dashboard',
        audience: 'executives',
        metrics: ['active_users', 'revenue_metrics', 'feature_adoption', 'churn_rate'],
        refreshInterval: 3600 // 1 hour
      },
      OPERATIONAL: {
        name: 'Operational Dashboard',
        audience: 'operations',
        metrics: ['api_calls', 'response_time', 'error_rate', 'uptime'],
        refreshInterval: 300 // 5 minutes
      },
      TENANT_SPECIFIC: {
        name: 'Tenant Dashboard',
        audience: 'tenant_admins',
        metrics: ['user_activity', 'feature_usage', 'api_usage', 'storage_usage'],
        refreshInterval: 900 // 15 minutes
      },
      PRODUCT: {
        name: 'Product Dashboard',
        audience: 'product_managers',
        metrics: ['feature_adoption', 'user_engagement', 'conversion_funnel'],
        refreshInterval: 1800 // 30 minutes
      },
      SECURITY: {
        name: 'Security Dashboard',
        audience: 'security_team',
        metrics: ['security_events', 'failed_logins', 'suspicious_activity'],
        refreshInterval: 60 // 1 minute
      }
    };

    // Report types
    this.reportTypes = {
      USAGE_SUMMARY: {
        name: 'Usage Summary Report',
        frequency: ['daily', 'weekly', 'monthly'],
        format: ['pdf', 'excel', 'json'],
        recipients: ['tenant_admin', 'billing_team']
      },
      PERFORMANCE_REPORT: {
        name: 'Performance Report',
        frequency: ['weekly', 'monthly'],
        format: ['pdf', 'excel'],
        recipients: ['operations_team', 'executives']
      },
      SECURITY_AUDIT: {
        name: 'Security Audit Report',
        frequency: ['daily', 'weekly'],
        format: ['pdf', 'json'],
        recipients: ['security_team', 'compliance_officer']
      },
      BILLING_REPORT: {
        name: 'Billing Usage Report',
        frequency: ['monthly'],
        format: ['pdf', 'excel', 'csv'],
        recipients: ['billing_team', 'tenant_admin']
      },
      CUSTOM_ANALYTICS: {
        name: 'Custom Analytics Report',
        frequency: ['on_demand'],
        format: ['pdf', 'excel', 'json', 'csv'],
        recipients: ['configurable']
      }
    };

    // Alert configurations
    this.alertTypes = {
      THRESHOLD: {
        name: 'Threshold Alert',
        conditions: ['greater_than', 'less_than', 'equals'],
        actions: ['email', 'webhook', 'sms', 'slack']
      },
      ANOMALY: {
        name: 'Anomaly Detection',
        conditions: ['deviation', 'trend_break', 'pattern_change'],
        actions: ['email', 'webhook', 'dashboard_highlight']
      },
      COMPOSITE: {
        name: 'Composite Alert',
        conditions: ['multiple_conditions', 'time_based', 'correlation'],
        actions: ['escalation', 'automated_response']
      }
    };

    // Time series data structure
    this.timeSeriesConfig = {
      retention: {
        raw: '7d',      // Raw events for 7 days
        hourly: '30d',  // Hourly aggregates for 30 days
        daily: '1y',    // Daily aggregates for 1 year
        monthly: '5y'   // Monthly aggregates for 5 years
      },
      aggregationWindows: ['1m', '5m', '15m', '1h', '6h', '1d', '7d', '30d']
    };
  }

  async initialize() {
    try {
      this.logger.info('Initializing Usage Analytics Service...');

      // Initialize Redis for distributed analytics
      if (process.env.REDIS_URL) {
        this.redis = new Redis(process.env.REDIS_URL);
        this.logger.info('Redis connection established for usage analytics');
      }

      // Setup time series data storage
      await this.setupTimeSeriesStorage();

      // Initialize metric aggregation
      await this.initializeMetricAggregation();

      // Setup real-time event processing
      await this.setupEventProcessing();

      // Initialize dashboard generation
      await this.initializeDashboards();

      // Setup alert system
      await this.setupAlertSystem();

      this.logger.info('Usage Analytics Service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Usage Analytics Service:', error);
      throw error;
    }
  }

  async trackEvent(params, eventData, query, req) {
    try {
      const {
        tenantId,
        userId = null,
        eventType,
        eventName,
        properties = {},
        timestamp = DateTime.now().toISO(),
        sessionId = null,
        deviceInfo = {},
        context = {}
      } = eventData;

      const eventId = crypto.randomUUID();

      this.logger.debug(`Tracking event: ${eventName} for tenant: ${tenantId}`, {
        eventId,
        eventType,
        userId
      });

      // Validate event data
      this.validateEventData(eventData);

      // Enrich event with additional context
      const enrichedEvent = {
        id: eventId,
        tenantId,
        userId,
        eventType,
        eventName,
        properties,
        timestamp,
        sessionId,
        deviceInfo,
        context: {
          ...context,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          source: context.source || 'api'
        },
        
        // Derived fields
        date: DateTime.fromISO(timestamp).toISODate(),
        hour: DateTime.fromISO(timestamp).hour,
        dayOfWeek: DateTime.fromISO(timestamp).weekday,
        month: DateTime.fromISO(timestamp).month,
        
        // Processing metadata
        receivedAt: DateTime.now().toISO(),
        processed: false
      };

      // Store raw event
      await this.storeRawEvent(enrichedEvent);

      // Process event for real-time metrics
      await this.processEventForMetrics(enrichedEvent);

      // Check for alert conditions
      await this.checkAlertConditions(enrichedEvent);

      // Update dashboard data if needed
      await this.updateDashboardData(enrichedEvent);

      this.logger.debug(`Event tracked successfully`, {
        eventId,
        tenantId,
        eventName
      });

      return {
        eventId,
        status: 'tracked',
        timestamp: enrichedEvent.receivedAt,
        tenantId,
        eventType,
        eventName
      };

    } catch (error) {
      this.logger.error('Error tracking event:', error);
      throw error;
    }
  }

  async getTenantDashboard(params, body, query, req) {
    try {
      const { tenantId } = params;
      const {
        dashboardType = 'TENANT_SPECIFIC',
        timeRange = '24h',
        refresh = false
      } = query;

      this.logger.info(`Generating tenant dashboard: ${tenantId}`, {
        dashboardType,
        timeRange
      });

      // Check cache unless refresh requested
      const cacheKey = `dashboard:${tenantId}:${dashboardType}:${timeRange}`;
      if (!refresh) {
        const cachedDashboard = this.cache.get(cacheKey);
        if (cachedDashboard) {
          return cachedDashboard;
        }
      }

      // Get dashboard configuration
      const dashboardConfig = this.dashboardTypes[dashboardType];
      if (!dashboardConfig) {
        throw new Error(`Invalid dashboard type: ${dashboardType}`);
      }

      // Calculate time range
      const timeRangeFilter = this.calculateTimeRange(timeRange);

      // Generate dashboard data
      const dashboard = {
        tenantId,
        type: dashboardType,
        name: dashboardConfig.name,
        timeRange: timeRangeFilter,
        generatedAt: DateTime.now().toISO(),
        
        // Core metrics
        metrics: await this.generateMetricsForDashboard(tenantId, dashboardConfig.metrics, timeRangeFilter),
        
        // Charts and visualizations
        charts: await this.generateChartsData(tenantId, dashboardConfig.metrics, timeRangeFilter),
        
        // Key performance indicators
        kpis: await this.calculateKPIs(tenantId, timeRangeFilter),
        
        // Recent activity
        recentActivity: await this.getRecentActivity(tenantId, 10),
        
        // Alerts and notifications
        alerts: await this.getActiveAlerts(tenantId),
        
        // Summary statistics
        summary: await this.generateDashboardSummary(tenantId, timeRangeFilter)
      };

      // Cache dashboard data
      this.cache.set(cacheKey, dashboard, dashboardConfig.refreshInterval);

      return dashboard;

    } catch (error) {
      this.logger.error('Error generating tenant dashboard:', error);
      throw error;
    }
  }

  async getUsageMetrics(params, body, query, req) {
    try {
      const { tenantId } = params;
      const {
        metrics = [],
        timeRange = '24h',
        granularity = '1h',
        dimensions = [],
        filters = {}
      } = query;

      this.logger.info(`Getting usage metrics for tenant: ${tenantId}`, {
        metrics,
        timeRange,
        granularity
      });

      // Calculate time range
      const timeRangeFilter = this.calculateTimeRange(timeRange);

      // Get requested metrics or default set
      const requestedMetrics = metrics.length > 0 ? metrics : 
        ['active_users', 'api_calls', 'storage_usage', 'feature_usage'];

      // Generate metrics data
      const metricsData = {};
      for (const metric of requestedMetrics) {
        metricsData[metric] = await this.calculateMetric(
          tenantId,
          metric,
          timeRangeFilter,
          granularity,
          dimensions,
          filters
        );
      }

      // Calculate comparative metrics (vs previous period)
      const comparativeMetrics = await this.calculateComparativeMetrics(
        tenantId,
        requestedMetrics,
        timeRangeFilter
      );

      // Generate usage insights
      const insights = await this.generateUsageInsights(tenantId, metricsData, timeRangeFilter);

      return {
        tenantId,
        timeRange: timeRangeFilter,
        granularity,
        generatedAt: DateTime.now().toISO(),
        metrics: metricsData,
        comparative: comparativeMetrics,
        insights,
        totalDataPoints: Object.values(metricsData).reduce((sum, data) => sum + (data.dataPoints?.length || 0), 0)
      };

    } catch (error) {
      this.logger.error('Error getting usage metrics:', error);
      throw error;
    }
  }

  async generateReport(params, body, query, req) {
    try {
      const { tenantId } = params;
      const {
        reportType = 'USAGE_SUMMARY',
        format = 'pdf',
        timeRange = '30d',
        includeCharts = true,
        recipients = [],
        customFilters = {}
      } = query;

      this.logger.info(`Generating report for tenant: ${tenantId}`, {
        reportType,
        format,
        timeRange
      });

      const reportId = crypto.randomUUID();

      // Get report configuration
      const reportConfig = this.reportTypes[reportType];
      if (!reportConfig) {
        throw new Error(`Invalid report type: ${reportType}`);
      }

      // Calculate time range
      const timeRangeFilter = this.calculateTimeRange(timeRange);

      // Generate report data
      const reportData = await this.generateReportData(
        tenantId,
        reportType,
        timeRangeFilter,
        customFilters
      );

      // Generate charts if requested
      let charts = null;
      if (includeCharts) {
        charts = await this.generateReportCharts(tenantId, reportType, reportData);
      }

      // Create report document
      const report = {
        id: reportId,
        tenantId,
        type: reportType,
        format,
        timeRange: timeRangeFilter,
        generatedAt: DateTime.now().toISO(),
        generatedBy: req.user?.id || 'system',
        
        // Report content
        data: reportData,
        charts,
        summary: await this.generateReportSummary(reportData),
        recommendations: await this.generateReportRecommendations(reportData),
        
        // Metadata
        metadata: {
          dataPoints: this.countDataPoints(reportData),
          processingTime: null,
          version: '1.0.0'
        }
      };

      // Store report
      this.reports.set(reportId, report);

      // Generate report file if not JSON
      let reportFile = null;
      if (format !== 'json') {
        reportFile = await this.generateReportFile(report, format);
        report.file = reportFile;
      }

      // Send to recipients if specified
      if (recipients.length > 0) {
        await this.sendReportToRecipients(report, recipients);
      }

      this.logger.info(`Report generated successfully`, {
        reportId,
        tenantId,
        reportType,
        format
      });

      return {
        reportId,
        tenantId,
        type: reportType,
        format,
        status: 'completed',
        generatedAt: report.generatedAt,
        downloadUrl: reportFile?.url || null,
        dataPoints: report.metadata.dataPoints
      };

    } catch (error) {
      this.logger.error('Error generating report:', error);
      throw error;
    }
  }

  async createAlert(params, alertConfig, query, req) {
    try {
      const { tenantId } = params;
      const {
        name,
        description,
        type = 'THRESHOLD',
        metric,
        condition,
        threshold,
        timeWindow = '5m',
        actions = ['email'],
        recipients = [],
        enabled = true
      } = alertConfig;

      const alertId = crypto.randomUUID();

      this.logger.info(`Creating alert for tenant: ${tenantId}`, {
        alertId,
        name,
        type,
        metric
      });

      // Validate alert configuration
      this.validateAlertConfig(alertConfig);

      // Create alert object
      const alert = {
        id: alertId,
        tenantId,
        name,
        description,
        type,
        metric,
        condition: {
          operator: condition.operator || 'greater_than',
          value: threshold,
          timeWindow
        },
        actions,
        recipients,
        enabled,
        
        // State tracking
        state: 'normal',
        lastTriggered: null,
        triggerCount: 0,
        
        // Configuration
        evaluationInterval: '1m',
        cooldownPeriod: '15m',
        escalationRules: alertConfig.escalationRules || [],
        
        // Metadata
        createdAt: DateTime.now().toISO(),
        createdBy: req.user?.id || 'system',
        lastModified: DateTime.now().toISO(),
        version: '1.0.0'
      };

      // Store alert
      this.alerts.set(alertId, alert);

      // Schedule alert evaluation
      await this.scheduleAlertEvaluation(alert);

      this.logger.info(`Alert created successfully`, {
        alertId,
        tenantId,
        name
      });

      return {
        alertId,
        tenantId,
        name,
        type,
        metric,
        enabled,
        createdAt: alert.createdAt
      };

    } catch (error) {
      this.logger.error('Error creating alert:', error);
      throw error;
    }
  }

  async getGlobalDashboard(params, body, query, req) {
    try {
      const {
        dashboardType = 'EXECUTIVE',
        timeRange = '24h',
        includeDetails = false
      } = query;

      this.logger.info(`Generating global dashboard`, {
        dashboardType,
        timeRange
      });

      // Calculate time range
      const timeRangeFilter = this.calculateTimeRange(timeRange);

      // Get global metrics across all tenants
      const globalMetrics = await this.calculateGlobalMetrics(timeRangeFilter);

      // Get tenant breakdown
      const tenantBreakdown = await this.getTenantBreakdown(timeRangeFilter);

      // Get system health metrics
      const systemHealth = await this.getSystemHealthMetrics();

      // Get trending data
      const trends = await this.calculateGlobalTrends(timeRangeFilter);

      const dashboard = {
        type: dashboardType,
        timeRange: timeRangeFilter,
        generatedAt: DateTime.now().toISO(),
        
        // Overview metrics
        overview: {
          totalTenants: await this.getTotalTenantCount(),
          activeTenants: await this.getActiveTenantCount(timeRangeFilter),
          totalUsers: globalMetrics.totalUsers,
          totalApiCalls: globalMetrics.totalApiCalls,
          totalRevenue: globalMetrics.totalRevenue
        },
        
        // Platform metrics
        platform: {
          uptime: systemHealth.uptime,
          responseTime: systemHealth.averageResponseTime,
          errorRate: systemHealth.errorRate,
          throughput: globalMetrics.throughput
        },
        
        // Tenant analytics
        tenants: includeDetails ? tenantBreakdown : {
          byPlan: tenantBreakdown.byPlan,
          byRegion: tenantBreakdown.byRegion,
          topByUsage: tenantBreakdown.topByUsage.slice(0, 10)
        },
        
        // Trending data
        trends,
        
        // Alerts summary
        alerts: await this.getGlobalAlertsSummary()
      };

      return dashboard;

    } catch (error) {
      this.logger.error('Error generating global dashboard:', error);
      throw error;
    }
  }

  // Helper methods
  validateEventData(eventData) {
    const required = ['tenantId', 'eventType', 'eventName'];
    const missing = required.filter(field => !eventData[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required event fields: ${missing.join(', ')}`);
    }

    if (!Object.keys(this.eventTypes).includes(eventData.eventType)) {
      throw new Error(`Invalid event type: ${eventData.eventType}`);
    }
  }

  calculateTimeRange(timeRange) {
    const now = DateTime.now();
    let start, end = now;

    const match = timeRange.match(/^(\d+)([hdwmy])$/);
    if (match) {
      const [, value, unit] = match;
      const amount = parseInt(value);
      
      switch (unit) {
        case 'h':
          start = now.minus({ hours: amount });
          break;
        case 'd':
          start = now.minus({ days: amount });
          break;
        case 'w':
          start = now.minus({ weeks: amount });
          break;
        case 'm':
          start = now.minus({ months: amount });
          break;
        case 'y':
          start = now.minus({ years: amount });
          break;
        default:
          start = now.minus({ hours: 24 });
      }
    } else {
      start = now.minus({ hours: 24 });
    }

    return {
      start: start.toISO(),
      end: end.toISO(),
      duration: timeRange
    };
  }

  async storeRawEvent(event) {
    // Store event in time series database
    const eventKey = `events:${event.tenantId}:${event.date}`;
    
    if (this.redis) {
      await this.redis.lpush(eventKey, JSON.stringify(event));
      await this.redis.expire(eventKey, 7 * 24 * 3600); // 7 days retention
    }
    
    // Store in memory for immediate processing
    const tenantEvents = this.events.get(event.tenantId) || [];
    tenantEvents.push(event);
    this.events.set(event.tenantId, tenantEvents);
  }

  async processEventForMetrics(event) {
    // Update real-time metrics based on event
    const metricKey = `metrics:${event.tenantId}:realtime`;
    
    // Mock metric updates - in production, use proper time series DB
    const currentMetrics = this.metrics.get(metricKey) || {
      activeUsers: new Set(),
      apiCalls: 0,
      events: 0,
      lastActivity: null
    };

    currentMetrics.events++;
    currentMetrics.lastActivity = event.timestamp;

    if (event.userId) {
      currentMetrics.activeUsers.add(event.userId);
    }

    if (event.eventType === 'API_USAGE') {
      currentMetrics.apiCalls++;
    }

    this.metrics.set(metricKey, currentMetrics);
  }

  async checkAlertConditions(event) {
    // Check if event triggers any alerts
    const tenantAlerts = Array.from(this.alerts.values())
      .filter(alert => alert.tenantId === event.tenantId && alert.enabled);

    for (const alert of tenantAlerts) {
      await this.evaluateAlert(alert, event);
    }
  }

  async evaluateAlert(alert, event) {
    // Mock alert evaluation - in production, implement proper alert logic
    if (alert.metric === 'api_calls' && event.eventType === 'API_USAGE') {
      const currentValue = await this.getCurrentMetricValue(alert.tenantId, alert.metric);
      
      if (this.evaluateCondition(currentValue, alert.condition)) {
        await this.triggerAlert(alert, currentValue, event);
      }
    }
  }

  evaluateCondition(value, condition) {
    switch (condition.operator) {
      case 'greater_than':
        return value > condition.value;
      case 'less_than':
        return value < condition.value;
      case 'equals':
        return value === condition.value;
      default:
        return false;
    }
  }

  async triggerAlert(alert, value, event) {
    alert.state = 'triggered';
    alert.lastTriggered = DateTime.now().toISO();
    alert.triggerCount++;

    this.logger.warn(`Alert triggered: ${alert.name}`, {
      alertId: alert.id,
      tenantId: alert.tenantId,
      value,
      threshold: alert.condition.value
    });

    // Execute alert actions
    for (const action of alert.actions) {
      await this.executeAlertAction(alert, action, value, event);
    }
  }

  async executeAlertAction(alert, action, value, event) {
    switch (action) {
      case 'email':
        // Send email notification
        this.logger.info(`Sending email alert for ${alert.name}`);
        break;
      case 'webhook':
        // Send webhook notification
        this.logger.info(`Sending webhook alert for ${alert.name}`);
        break;
      case 'sms':
        // Send SMS notification
        this.logger.info(`Sending SMS alert for ${alert.name}`);
        break;
    }
  }

  async setupTimeSeriesStorage() {
    this.logger.info('Setting up time series storage');
  }

  async initializeMetricAggregation() {
    this.logger.info('Initializing metric aggregation');
  }

  async setupEventProcessing() {
    this.logger.info('Setting up event processing');
  }

  async initializeDashboards() {
    this.logger.info('Initializing dashboards');
  }

  async setupAlertSystem() {
    this.logger.info('Setting up alert system');
  }

  async healthCheck() {
    try {
      const health = {
        status: 'healthy',
        timestamp: DateTime.now().toISO(),
        cache: {
          keys: this.cache.keys().length,
          stats: this.cache.getStats()
        },
        analytics: {
          events: this.events.size,
          metrics: this.metrics.size,
          dashboards: this.dashboards.size,
          reports: this.reports.size,
          alerts: this.alerts.size
        }
      };

      if (this.redis) {
        await this.redis.ping();
        health.redis = { status: 'connected' };
      }

      return health;
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: DateTime.now().toISO()
      };
    }
  }

  async shutdown() {
    try {
      this.logger.info('Shutting down Usage Analytics Service...');
      
      this.cache.flushAll();
      
      if (this.redis) {
        await this.redis.quit();
      }

      this.events.clear();
      this.metrics.clear();
      this.dashboards.clear();
      this.reports.clear();
      this.alerts.clear();

      this.logger.info('Usage Analytics Service shutdown complete');
    } catch (error) {
      this.logger.error('Error during shutdown:', error);
    }
  }
}

export default UsageAnalyticsService;