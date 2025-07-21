/**
 * Security Monitoring Service
 * Real-time security event monitoring, alerting, and incident response
 * Comprehensive security analytics and threat visualization dashboard
 */

import winston from 'winston';
import NodeCache from 'node-cache';
import Redis from 'ioredis';
import { DateTime } from 'luxon';
import { EventEmitter } from 'events';
import promClient from 'prom-client';
import crypto from 'crypto';

class SecurityMonitoringService extends EventEmitter {
  constructor() {
    super();
    this.cache = new NodeCache({ stdTTL: 1800, checkperiod: 300 });
    this.redis = null;
    this.securityEvents = new Map();
    this.alertRules = new Map();
    this.activeIncidents = new Map();
    this.dashboardMetrics = new Map();
    
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { service: 'security-monitoring' },
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/security-monitoring.log' })
      ]
    });

    // Prometheus metrics for security monitoring
    this.securityEventCounter = new promClient.Counter({
      name: 'security_events_total',
      help: 'Total number of security events',
      labelNames: ['event_type', 'severity', 'source', 'status']
    });

    this.alertCounter = new promClient.Counter({
      name: 'security_alerts_total',
      help: 'Total number of security alerts',
      labelNames: ['alert_type', 'severity', 'status']
    });

    this.incidentGauge = new promClient.Gauge({
      name: 'active_security_incidents',
      help: 'Number of active security incidents',
      labelNames: ['severity', 'category']
    });

    this.responseTimeHistogram = new promClient.Histogram({
      name: 'security_response_time_seconds',
      help: 'Security incident response time',
      labelNames: ['incident_type', 'severity'],
      buckets: [1, 5, 10, 30, 60, 300, 900, 1800, 3600]
    });

    // Security event severity levels
    this.severityLevels = {
      critical: {
        level: 5,
        color: '#FF0000',
        autoResponse: true,
        notificationChannels: ['email', 'sms', 'slack', 'webhook'],
        escalationTime: 300 // 5 minutes
      },
      high: {
        level: 4,
        color: '#FF6600',
        autoResponse: true,
        notificationChannels: ['email', 'slack'],
        escalationTime: 900 // 15 minutes
      },
      medium: {
        level: 3,
        color: '#FFAA00',
        autoResponse: false,
        notificationChannels: ['email'],
        escalationTime: 1800 // 30 minutes
      },
      low: {
        level: 2,
        color: '#FFDD00',
        autoResponse: false,
        notificationChannels: ['dashboard'],
        escalationTime: 3600 // 1 hour
      },
      info: {
        level: 1,
        color: '#00AA00',
        autoResponse: false,
        notificationChannels: ['dashboard'],
        escalationTime: null
      }
    };

    // Security event categories
    this.eventCategories = {
      authentication: {
        patterns: ['login_failure', 'mfa_failure', 'account_lockout', 'privilege_escalation'],
        baselineThreshold: 10,
        anomalyMultiplier: 3
      },
      access_control: {
        patterns: ['unauthorized_access', 'permission_denied', 'resource_access'],
        baselineThreshold: 5,
        anomalyMultiplier: 2
      },
      network: {
        patterns: ['suspicious_connection', 'port_scan', 'ddos_attempt', 'malicious_ip'],
        baselineThreshold: 20,
        anomalyMultiplier: 5
      },
      data_access: {
        patterns: ['sensitive_data_access', 'data_export', 'bulk_download'],
        baselineThreshold: 5,
        anomalyMultiplier: 2
      },
      system: {
        patterns: ['system_error', 'service_failure', 'configuration_change'],
        baselineThreshold: 15,
        anomalyMultiplier: 3
      },
      malware: {
        patterns: ['malware_detected', 'virus_scan_hit', 'suspicious_file'],
        baselineThreshold: 1,
        anomalyMultiplier: 1
      }
    };

    // Real-time monitoring parameters
    this.monitoringConfig = {
      eventBufferSize: 10000,
      alertingWindow: 300,      // 5 minutes
      baselineWindow: 86400,    // 24 hours
      correlationWindow: 180,   // 3 minutes
      aggregationInterval: 60   // 1 minute
    };
  }

  async initialize() {
    try {
      this.logger.info('Initializing Security Monitoring Service...');

      // Initialize Redis for distributed monitoring
      if (process.env.REDIS_URL) {
        this.redis = new Redis(process.env.REDIS_URL);
        this.logger.info('Redis connection established for security monitoring');
      }

      // Initialize alert rules
      await this.initializeAlertRules();

      // Start real-time monitoring
      this.startRealTimeMonitoring();

      // Initialize dashboard metrics
      await this.initializeDashboardMetrics();

      this.logger.info('Security Monitoring Service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Security Monitoring Service:', error);
      throw error;
    }
  }

  async initializeAlertRules() {
    // Define security alert rules
    this.alertRules.set('failed_login_burst', {
      category: 'authentication',
      condition: 'count > 5 in 5 minutes',
      severity: 'high',
      description: 'Multiple failed login attempts detected',
      response: 'account_lockout'
    });

    this.alertRules.set('privilege_escalation', {
      category: 'access_control',
      condition: 'admin_access AND new_user',
      severity: 'critical',
      description: 'Privilege escalation attempt detected',
      response: 'immediate_review'
    });

    this.alertRules.set('suspicious_data_access', {
      category: 'data_access',
      condition: 'bulk_download OR sensitive_access_anomaly',
      severity: 'high',
      description: 'Suspicious data access pattern detected',
      response: 'data_access_review'
    });

    this.alertRules.set('malware_detection', {
      category: 'malware',
      condition: 'malware_detected',
      severity: 'critical',
      description: 'Malware detected in system',
      response: 'quarantine_and_scan'
    });

    this.alertRules.set('network_anomaly', {
      category: 'network',
      condition: 'suspicious_connections > 10',
      severity: 'medium',
      description: 'Unusual network activity detected',
      response: 'network_analysis'
    });

    this.alertRules.set('system_compromise', {
      category: 'system',
      condition: 'multiple_categories AND high_severity',
      severity: 'critical',
      description: 'Potential system compromise detected',
      response: 'incident_response'
    });
  }

  async processSecurityEvent(eventData) {
    try {
      const {
        type,
        severity,
        source,
        userId,
        details,
        context,
        timestamp
      } = eventData;

      // Generate event ID
      const eventId = this.generateEventId(eventData);
      
      // Enrich event with additional context
      const enrichedEvent = await this.enrichSecurityEvent({
        eventId,
        type,
        severity,
        source,
        userId,
        details,
        context,
        timestamp: timestamp || DateTime.now().toISO(),
        processed: DateTime.now().toISO()
      });

      // Store event
      await this.storeSecurityEvent(enrichedEvent);

      // Update metrics
      this.securityEventCounter.inc({
        event_type: type,
        severity,
        source,
        status: 'processed'
      });

      // Check for alert conditions
      const alerts = await this.checkAlertConditions(enrichedEvent);
      
      // Process any triggered alerts
      for (const alert of alerts) {
        await this.processAlert(alert, enrichedEvent);
      }

      // Update real-time dashboard
      await this.updateDashboardMetrics(enrichedEvent);

      // Emit event for real-time subscribers
      this.emit('securityEvent', enrichedEvent);

      this.logger.info(`Security event processed`, {
        eventId,
        type,
        severity,
        alertsTriggered: alerts.length
      });

      return {
        eventId,
        processed: true,
        alertsTriggered: alerts.length,
        timestamp: enrichedEvent.processed
      };

    } catch (error) {
      this.logger.error('Error processing security event:', error);
      throw new Error(`Failed to process security event: ${error.message}`);
    }
  }

  async enrichSecurityEvent(event) {
    try {
      const enriched = { ...event };

      // Add geolocation data if IP address is available
      if (event.context?.ip) {
        enriched.geolocation = await this.getGeolocation(event.context.ip);
      }

      // Add user context if userId is available
      if (event.userId) {
        enriched.userContext = await this.getUserContext(event.userId);
      }

      // Add threat intelligence data
      enriched.threatIntelligence = await this.getThreatIntelligence(event);

      // Calculate risk score
      enriched.riskScore = this.calculateEventRiskScore(enriched);

      // Add event correlation data
      enriched.correlatedEvents = await this.findCorrelatedEvents(enriched);

      // Add baseline comparison
      enriched.baselineComparison = await this.compareToBaseline(enriched);

      return enriched;

    } catch (error) {
      this.logger.error('Error enriching security event:', error);
      return event; // Return original event if enrichment fails
    }
  }

  async checkAlertConditions(event) {
    const triggeredAlerts = [];

    try {
      for (const [ruleName, rule] of this.alertRules.entries()) {
        const isTriggered = await this.evaluateAlertRule(rule, event);
        
        if (isTriggered) {
          const alert = {
            id: crypto.randomUUID(),
            ruleName,
            rule,
            triggeringEvent: event,
            severity: rule.severity,
            timestamp: DateTime.now().toISO(),
            status: 'active'
          };

          triggeredAlerts.push(alert);
        }
      }

      return triggeredAlerts;

    } catch (error) {
      this.logger.error('Error checking alert conditions:', error);
      return [];
    }
  }

  async evaluateAlertRule(rule, event) {
    try {
      // Simple rule evaluation - in production, use a proper rule engine
      const { category, condition } = rule;

      // Check if event matches category
      const eventCategory = this.determineEventCategory(event.type);
      if (eventCategory !== category && category !== 'any') {
        return false;
      }

      // Evaluate specific conditions
      if (condition.includes('count >')) {
        return await this.evaluateCountCondition(condition, event);
      } else if (condition.includes('AND')) {
        return await this.evaluateAndCondition(condition, event);
      } else if (condition.includes('OR')) {
        return await this.evaluateOrCondition(condition, event);
      } else {
        return await this.evaluateSimpleCondition(condition, event);
      }

    } catch (error) {
      this.logger.error('Error evaluating alert rule:', error);
      return false;
    }
  }

  async processAlert(alert, triggeringEvent) {
    try {
      const alertId = alert.id;
      
      this.logger.warn(`Security alert triggered`, {
        alertId,
        ruleName: alert.ruleName,
        severity: alert.severity,
        eventId: triggeringEvent.eventId
      });

      // Store alert
      await this.storeAlert(alert);

      // Update metrics
      this.alertCounter.inc({
        alert_type: alert.ruleName,
        severity: alert.severity,
        status: 'triggered'
      });

      // Send notifications
      await this.sendAlertNotifications(alert);

      // Execute automated response if configured
      if (this.severityLevels[alert.severity].autoResponse) {
        await this.executeAutomatedResponse(alert, triggeringEvent);
      }

      // Create incident if severity is high enough
      if (alert.severity === 'critical' || alert.severity === 'high') {
        await this.createSecurityIncident(alert, triggeringEvent);
      }

      // Emit alert for real-time subscribers
      this.emit('securityAlert', alert);

      return {
        alertId,
        processed: true,
        notificationsSent: true,
        incidentCreated: alert.severity === 'critical' || alert.severity === 'high'
      };

    } catch (error) {
      this.logger.error('Error processing alert:', error);
      throw new Error(`Failed to process alert: ${error.message}`);
    }
  }

  async createSecurityIncident(alert, triggeringEvent) {
    try {
      const incidentId = crypto.randomUUID();
      const incident = {
        id: incidentId,
        title: `${alert.rule.description} - ${triggeringEvent.type}`,
        description: this.generateIncidentDescription(alert, triggeringEvent),
        severity: alert.severity,
        category: alert.rule.category,
        status: 'open',
        priority: this.calculateIncidentPriority(alert, triggeringEvent),
        assignedTo: null,
        createdBy: 'system',
        createdAt: DateTime.now().toISO(),
        updatedAt: DateTime.now().toISO(),
        events: [triggeringEvent.eventId],
        alerts: [alert.id],
        timeline: [{
          timestamp: DateTime.now().toISO(),
          action: 'incident_created',
          details: 'Incident automatically created from security alert',
          user: 'system'
        }],
        metrics: {
          detectionTime: DateTime.now().toISO(),
          responseTime: null,
          resolutionTime: null,
          escalationCount: 0
        }
      };

      // Store incident
      this.activeIncidents.set(incidentId, incident);
      await this.storeIncident(incident);

      // Update metrics
      this.incidentGauge.inc({
        severity: incident.severity,
        category: incident.category
      });

      // Start incident response timer
      this.startIncidentTimer(incidentId);

      // Emit incident for real-time subscribers
      this.emit('securityIncident', incident);

      this.logger.warn(`Security incident created`, {
        incidentId,
        severity: incident.severity,
        category: incident.category
      });

      return incident;

    } catch (error) {
      this.logger.error('Error creating security incident:', error);
      throw new Error(`Failed to create security incident: ${error.message}`);
    }
  }

  async getDashboardData(timeRange = '24h') {
    try {
      const endTime = DateTime.now();
      const startTime = endTime.minus(this.parseTimeRange(timeRange));

      // Get security events summary
      const eventsSummary = await this.getEventsSummary(startTime, endTime);
      
      // Get alerts summary
      const alertsSummary = await this.getAlertsSummary(startTime, endTime);
      
      // Get incidents summary
      const incidentsSummary = await this.getIncidentsSummary(startTime, endTime);
      
      // Get threat landscape
      const threatLandscape = await this.getThreatLandscape(startTime, endTime);
      
      // Get top security risks
      const topRisks = await this.getTopSecurityRisks(startTime, endTime);
      
      // Get security metrics trends
      const metricsTrends = await this.getMetricsTrends(startTime, endTime);

      return {
        timeRange: {
          start: startTime.toISO(),
          end: endTime.toISO(),
          duration: timeRange
        },
        summary: {
          events: eventsSummary,
          alerts: alertsSummary,
          incidents: incidentsSummary
        },
        threatLandscape,
        topRisks,
        trends: metricsTrends,
        realTimeStatus: {
          activeIncidents: this.activeIncidents.size,
          eventsPerMinute: await this.getEventsPerMinute(),
          systemHealth: await this.getSystemHealth()
        }
      };

    } catch (error) {
      this.logger.error('Error getting dashboard data:', error);
      throw new Error(`Failed to get dashboard data: ${error.message}`);
    }
  }

  async getRealTimeUpdates() {
    try {
      const updates = {
        timestamp: DateTime.now().toISO(),
        events: await this.getRecentEvents(60), // Last minute
        alerts: await this.getRecentAlerts(60),
        incidents: await this.getRecentIncidents(60),
        metrics: await this.getCurrentMetrics()
      };

      return updates;

    } catch (error) {
      this.logger.error('Error getting real-time updates:', error);
      throw new Error(`Failed to get real-time updates: ${error.message}`);
    }
  }

  startRealTimeMonitoring() {
    // Start periodic monitoring tasks
    setInterval(() => {
      this.performPeriodicChecks();
    }, this.monitoringConfig.aggregationInterval * 1000);

    // Start baseline updates
    setInterval(() => {
      this.updateBaselines();
    }, 3600000); // Every hour

    // Start incident escalation checks
    setInterval(() => {
      this.checkIncidentEscalations();
    }, 300000); // Every 5 minutes

    this.logger.info('Real-time monitoring started');
  }

  async performPeriodicChecks() {
    try {
      // Check for event patterns
      await this.detectEventPatterns();
      
      // Update correlation rules
      await this.updateCorrelationRules();
      
      // Clean up old events
      await this.cleanupOldEvents();
      
      // Update dashboard metrics
      await this.refreshDashboardMetrics();

    } catch (error) {
      this.logger.error('Error in periodic checks:', error);
    }
  }

  generateEventId(eventData) {
    const data = `${eventData.type}-${eventData.source}-${eventData.timestamp}-${JSON.stringify(eventData.details)}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  calculateEventRiskScore(event) {
    let score = 0;

    // Base score from severity
    const severityScores = { critical: 1.0, high: 0.8, medium: 0.6, low: 0.4, info: 0.2 };
    score += severityScores[event.severity] || 0.5;

    // Adjust based on event type
    const typeMultipliers = {
      'malware_detected': 1.5,
      'privilege_escalation': 1.4,
      'data_breach': 1.6,
      'unauthorized_access': 1.3,
      'system_compromise': 1.5
    };
    score *= typeMultipliers[event.type] || 1.0;

    // Adjust based on user context
    if (event.userContext?.isPrivileged) {
      score *= 1.3;
    }

    // Adjust based on threat intelligence
    if (event.threatIntelligence?.isKnownThreat) {
      score *= 1.4;
    }

    return Math.min(1.0, score);
  }

  determineEventCategory(eventType) {
    for (const [category, config] of Object.entries(this.eventCategories)) {
      if (config.patterns.some(pattern => eventType.includes(pattern))) {
        return category;
      }
    }
    return 'other';
  }

  parseTimeRange(timeRange) {
    const unit = timeRange.slice(-1);
    const value = parseInt(timeRange.slice(0, -1));
    
    switch (unit) {
      case 'h': return { hours: value };
      case 'd': return { days: value };
      case 'w': return { weeks: value };
      case 'm': return { months: value };
      default: return { hours: 24 };
    }
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
        redis: null,
        monitoring: {
          activeIncidents: this.activeIncidents.size,
          alertRules: this.alertRules.size,
          eventCategories: Object.keys(this.eventCategories).length
        },
        metrics: {
          eventsProcessed: await this.getEventCount('24h'),
          alertsTriggered: await this.getAlertCount('24h'),
          incidentsCreated: await this.getIncidentCount('24h')
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
      this.logger.info('Shutting down Security Monitoring Service...');
      
      this.cache.flushAll();
      
      if (this.redis) {
        await this.redis.quit();
      }

      this.securityEvents.clear();
      this.alertRules.clear();
      this.activeIncidents.clear();
      this.dashboardMetrics.clear();

      this.logger.info('Security Monitoring Service shutdown complete');
    } catch (error) {
      this.logger.error('Error during shutdown:', error);
    }
  }
}

export default SecurityMonitoringService;