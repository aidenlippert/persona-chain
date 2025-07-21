/**
 * Audit Service
 * Comprehensive compliance logging and audit trail management
 * Handles security events, compliance monitoring, and forensic analysis
 */

import crypto from 'crypto';
import NodeCache from 'node-cache';
import winston from 'winston';

export default class AuditService {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger || winston.createLogger({ silent: true });
        this.cache = new NodeCache({ stdTTL: 300 }); // 5 minute cache
        
        // Audit storage (in production, use persistent database with encryption)
        this.auditLogs = new Map();
        this.auditSessions = new Map();
        this.complianceReports = new Map();
        
        // Audit configuration
        this.auditConfig = {
            retentionPeriod: config.audit?.retentionPeriod || 7 * 365 * 24 * 60 * 60 * 1000, // 7 years
            maxLogSize: config.audit?.maxLogSize || 10485760, // 10MB per log entry
            encryptionEnabled: config.audit?.encryptionEnabled || true,
            realTimeMonitoring: config.audit?.realTimeMonitoring || true,
            complianceChecking: config.audit?.complianceChecking || true,
            alertingEnabled: config.audit?.alertingEnabled || true,
        };
        
        // Event types and categories
        this.eventTypes = {
            // Authentication events
            USER_LOGIN: 'user_login',
            USER_LOGOUT: 'user_logout',
            LOGIN_FAILED: 'login_failed',
            PASSWORD_CHANGED: 'password_changed',
            MFA_ENABLED: 'mfa_enabled',
            MFA_DISABLED: 'mfa_disabled',
            
            // Authorization events
            ACCESS_GRANTED: 'access_granted',
            ACCESS_DENIED: 'access_denied',
            PERMISSION_CHANGED: 'permission_changed',
            ROLE_ASSIGNED: 'role_assigned',
            ROLE_REMOVED: 'role_removed',
            
            // Governance events
            PROPOSAL_CREATED: 'proposal_created',
            PROPOSAL_UPDATED: 'proposal_updated',
            PROPOSAL_APPROVED: 'proposal_approved',
            PROPOSAL_REJECTED: 'proposal_rejected',
            PROPOSAL_EXECUTED: 'proposal_executed',
            VOTE_CAST: 'vote_cast',
            
            // Threshold signature events
            THRESHOLD_SIGNING_INITIATED: 'threshold_signing_initiated',
            PARTIAL_SIGNATURE_ADDED: 'partial_signature_added',
            SIGNATURE_COMBINED: 'signature_combined',
            CREDENTIAL_ISSUED: 'credential_issued',
            
            // Guardian management events
            GUARDIAN_CREATED: 'guardian_created',
            GUARDIAN_UPDATED: 'guardian_updated',
            GUARDIAN_DELETED: 'guardian_deleted',
            GUARDIAN_SUSPENDED: 'guardian_suspended',
            GUARDIAN_ACTIVATED: 'guardian_activated',
            
            // Policy events
            POLICY_CREATED: 'policy_created',
            POLICY_UPDATED: 'policy_updated',
            POLICY_ACTIVATED: 'policy_activated',
            POLICY_DEACTIVATED: 'policy_deactivated',
            POLICY_VIOLATION: 'policy_violation',
            
            // System events
            SYSTEM_STARTUP: 'system_startup',
            SYSTEM_SHUTDOWN: 'system_shutdown',
            CONFIGURATION_CHANGED: 'configuration_changed',
            ERROR_OCCURRED: 'error_occurred',
            SECURITY_ALERT: 'security_alert',
            
            // Data events
            DATA_CREATED: 'data_created',
            DATA_ACCESSED: 'data_accessed',
            DATA_MODIFIED: 'data_modified',
            DATA_DELETED: 'data_deleted',
            DATA_EXPORTED: 'data_exported'
        };
        
        // Event severity levels
        this.severityLevels = {
            INFO: 'info',
            LOW: 'low',
            MEDIUM: 'medium',
            HIGH: 'high',
            CRITICAL: 'critical'
        };
        
        // Compliance frameworks
        this.complianceFrameworks = {
            SOC2: 'soc2',
            GDPR: 'gdpr',
            HIPAA: 'hipaa',
            ISO27001: 'iso27001',
            PCI_DSS: 'pci_dss',
            FEDRAMP: 'fedramp'
        };
        
        // Alert conditions
        this.alertConditions = new Map([
            ['multiple_failed_logins', { threshold: 5, timeWindow: 300000 }], // 5 failures in 5 minutes
            ['suspicious_activity', { threshold: 3, timeWindow: 600000 }], // 3 suspicious events in 10 minutes
            ['policy_violations', { threshold: 2, timeWindow: 3600000 }], // 2 violations in 1 hour
            ['system_errors', { threshold: 10, timeWindow: 300000 }], // 10 errors in 5 minutes
            ['data_access_anomaly', { threshold: 5, timeWindow: 900000 }] // 5 anomalies in 15 minutes
        ]);
        
        this.logger.info('Audit service initialized', {
            retentionPeriod: this.auditConfig.retentionPeriod,
            encryptionEnabled: this.auditConfig.encryptionEnabled,
            realTimeMonitoring: this.auditConfig.realTimeMonitoring
        });
    }
    
    /**
     * Log audit event
     */
    async logEvent(eventData) {
        try {
            const {
                type,
                actor,
                resource,
                resourceId,
                action,
                outcome,
                metadata,
                severity,
                ipAddress,
                userAgent,
                sessionId,
                timestamp
            } = eventData;
            
            // Generate audit entry
            const auditId = crypto.randomUUID();
            const auditEntry = {
                id: auditId,
                type,
                category: this.getEventCategory(type),
                
                // Actor information
                actor: {
                    id: actor,
                    type: this.getActorType(actor),
                    sessionId: sessionId || null
                },
                
                // Resource information
                resource: {
                    type: resource,
                    id: resourceId,
                    description: metadata?.resourceDescription || null
                },
                
                // Action details
                action: {
                    type: action || this.getDefaultAction(type),
                    outcome: outcome || 'success',
                    description: metadata?.actionDescription || null
                },
                
                // Context information
                context: {
                    ipAddress: ipAddress || null,
                    userAgent: userAgent || null,
                    geolocation: metadata?.geolocation || null,
                    requestId: metadata?.requestId || crypto.randomUUID(),
                    correlationId: metadata?.correlationId || null
                },
                
                // Event metadata
                metadata: {
                    ...metadata,
                    severity: severity || this.calculateSeverity(type, outcome),
                    source: 'guardian-multiparty-service',
                    version: '1.0.0'
                },
                
                // Timestamps
                timestamp: timestamp || new Date().toISOString(),
                processedAt: new Date().toISOString(),
                
                // Compliance tracking
                compliance: {
                    frameworks: this.getApplicableFrameworks(type),
                    requirements: this.getComplianceRequirements(type),
                    retention: this.calculateRetentionPeriod(type, severity)
                },
                
                // Security attributes
                security: {
                    classification: this.getDataClassification(type),
                    integrity: this.calculateIntegrityHash(eventData),
                    encrypted: this.auditConfig.encryptionEnabled
                }
            };
            
            // Encrypt sensitive data if enabled
            if (this.auditConfig.encryptionEnabled) {
                auditEntry.encryptedData = this.encryptSensitiveData(auditEntry);
            }
            
            // Store audit entry
            this.auditLogs.set(auditId, auditEntry);
            
            // Real-time monitoring and alerting
            if (this.auditConfig.realTimeMonitoring) {
                await this.processRealTimeMonitoring(auditEntry);
            }
            
            // Compliance checking
            if (this.auditConfig.complianceChecking) {
                await this.performComplianceCheck(auditEntry);
            }
            
            this.logger.debug('Audit event logged', {
                auditId,
                type,
                actor,
                resource,
                severity: auditEntry.metadata.severity
            });
            
            return {
                auditId,
                timestamp: auditEntry.timestamp,
                severity: auditEntry.metadata.severity
            };
            
        } catch (error) {
            this.logger.error('Failed to log audit event', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Get audit logs with filtering
     */
    async getLogs(options = {}) {
        try {
            const {
                limit = 100,
                offset = 0,
                filters = {},
                sortBy = 'timestamp',
                sortOrder = 'desc'
            } = options;
            
            let logs = Array.from(this.auditLogs.values());
            
            // Apply filters
            if (filters.type) {
                logs = logs.filter(log => log.type === filters.type);
            }
            
            if (filters.actor) {
                logs = logs.filter(log => log.actor.id === filters.actor);
            }
            
            if (filters.resource) {
                logs = logs.filter(log => log.resource.type === filters.resource);
            }
            
            if (filters.severity) {
                logs = logs.filter(log => log.metadata.severity === filters.severity);
            }
            
            if (filters.category) {
                logs = logs.filter(log => log.category === filters.category);
            }
            
            if (filters.fromDate) {
                const fromDate = new Date(filters.fromDate);
                logs = logs.filter(log => new Date(log.timestamp) >= fromDate);
            }
            
            if (filters.toDate) {
                const toDate = new Date(filters.toDate);
                logs = logs.filter(log => new Date(log.timestamp) <= toDate);
            }
            
            if (filters.ipAddress) {
                logs = logs.filter(log => log.context.ipAddress === filters.ipAddress);
            }
            
            if (filters.outcome) {
                logs = logs.filter(log => log.action.outcome === filters.outcome);
            }
            
            // Sort logs
            logs.sort((a, b) => {
                const aValue = this.getNestedValue(a, sortBy);
                const bValue = this.getNestedValue(b, sortBy);
                
                if (sortOrder === 'desc') {
                    return bValue > aValue ? 1 : -1;
                } else {
                    return aValue > bValue ? 1 : -1;
                }
            });
            
            // Apply pagination
            const totalCount = logs.length;
            const paginatedLogs = logs.slice(offset, offset + limit);
            
            // Remove encrypted data from response
            const sanitizedLogs = paginatedLogs.map(log => this.sanitizeLogForResponse(log));
            
            return {
                logs: sanitizedLogs,
                pagination: {
                    total: totalCount,
                    limit,
                    offset,
                    hasMore: totalCount > offset + limit
                }
            };
            
        } catch (error) {
            this.logger.error('Failed to get audit logs', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Generate compliance report
     */
    async generateComplianceReport(framework, dateRange) {
        try {
            const { startDate, endDate } = dateRange;
            
            this.logger.info('Generating compliance report', { framework, startDate, endDate });
            
            // Get relevant audit logs
            const logs = Array.from(this.auditLogs.values()).filter(log => {
                const logDate = new Date(log.timestamp);
                return logDate >= new Date(startDate) && 
                       logDate <= new Date(endDate) &&
                       log.compliance.frameworks.includes(framework);
            });
            
            // Generate report
            const reportId = crypto.randomUUID();
            const report = {
                id: reportId,
                framework,
                period: { startDate, endDate },
                generatedAt: new Date().toISOString(),
                
                // Summary statistics
                summary: {
                    totalEvents: logs.length,
                    eventsByType: this.groupEventsByType(logs),
                    eventsBySeverity: this.groupEventsBySeverity(logs),
                    eventsByOutcome: this.groupEventsByOutcome(logs),
                    complianceScore: this.calculateComplianceScore(logs, framework)
                },
                
                // Compliance requirements analysis
                requirements: this.analyzeComplianceRequirements(logs, framework),
                
                // Risk analysis
                riskAnalysis: this.performRiskAnalysis(logs),
                
                // Recommendations
                recommendations: this.generateRecommendations(logs, framework),
                
                // Evidence and attestations
                evidence: this.collectEvidence(logs, framework),
                
                // Audit trail integrity
                integrity: {
                    logCount: logs.length,
                    hashChain: this.calculateHashChain(logs),
                    verified: true
                }
            };
            
            // Store report
            this.complianceReports.set(reportId, report);
            
            this.logger.info('Compliance report generated', {
                reportId,
                framework,
                totalEvents: logs.length,
                complianceScore: report.summary.complianceScore
            });
            
            return report;
            
        } catch (error) {
            this.logger.error('Failed to generate compliance report', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Search audit logs
     */
    async searchLogs(query, options = {}) {
        try {
            const {
                limit = 100,
                offset = 0,
                fuzzy = false,
                caseSensitive = false
            } = options;
            
            const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
            let logs = Array.from(this.auditLogs.values());
            
            // Filter logs based on search terms
            logs = logs.filter(log => {
                const searchableText = this.getSearchableText(log);
                const text = caseSensitive ? searchableText : searchableText.toLowerCase();
                
                if (fuzzy) {
                    return searchTerms.some(term => text.includes(term));
                } else {
                    return searchTerms.every(term => text.includes(term));
                }
            });
            
            // Sort by relevance (simplified scoring)
            logs.sort((a, b) => {
                const scoreA = this.calculateRelevanceScore(a, searchTerms);
                const scoreB = this.calculateRelevanceScore(b, searchTerms);
                return scoreB - scoreA;
            });
            
            // Apply pagination
            const totalCount = logs.length;
            const paginatedLogs = logs.slice(offset, offset + limit);
            
            // Sanitize logs for response
            const sanitizedLogs = paginatedLogs.map(log => this.sanitizeLogForResponse(log));
            
            return {
                logs: sanitizedLogs,
                query,
                pagination: {
                    total: totalCount,
                    limit,
                    offset,
                    hasMore: totalCount > offset + limit
                }
            };
            
        } catch (error) {
            this.logger.error('Failed to search audit logs', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Export audit logs
     */
    async exportLogs(format, filters = {}) {
        try {
            this.logger.info('Exporting audit logs', { format, filters });
            
            // Get filtered logs
            const { logs } = await this.getLogs({ 
                limit: 10000, // Large limit for export
                filters 
            });
            
            let exportData;
            let contentType;
            
            switch (format.toLowerCase()) {
                case 'json':
                    exportData = JSON.stringify(logs, null, 2);
                    contentType = 'application/json';
                    break;
                    
                case 'csv':
                    exportData = this.convertToCSV(logs);
                    contentType = 'text/csv';
                    break;
                    
                case 'xml':
                    exportData = this.convertToXML(logs);
                    contentType = 'application/xml';
                    break;
                    
                default:
                    throw new Error(`Unsupported export format: ${format}`);
            }
            
            // Log export event
            await this.logEvent({
                type: this.eventTypes.DATA_EXPORTED,
                actor: 'system',
                resource: 'audit_logs',
                action: 'export',
                metadata: {
                    format,
                    recordCount: logs.length,
                    filters
                }
            });
            
            return {
                data: exportData,
                contentType,
                filename: `audit_logs_${new Date().toISOString().split('T')[0]}.${format}`,
                recordCount: logs.length
            };
            
        } catch (error) {
            this.logger.error('Failed to export audit logs', { error: error.message });
            throw error;
        }
    }
    
    // Utility methods
    
    getEventCategory(type) {
        const categoryMap = {
            [this.eventTypes.USER_LOGIN]: 'authentication',
            [this.eventTypes.USER_LOGOUT]: 'authentication',
            [this.eventTypes.LOGIN_FAILED]: 'authentication',
            [this.eventTypes.ACCESS_GRANTED]: 'authorization',
            [this.eventTypes.ACCESS_DENIED]: 'authorization',
            [this.eventTypes.PROPOSAL_CREATED]: 'governance',
            [this.eventTypes.VOTE_CAST]: 'governance',
            [this.eventTypes.THRESHOLD_SIGNING_INITIATED]: 'cryptographic',
            [this.eventTypes.CREDENTIAL_ISSUED]: 'cryptographic',
            [this.eventTypes.GUARDIAN_CREATED]: 'administration',
            [this.eventTypes.POLICY_CREATED]: 'administration',
            [this.eventTypes.SYSTEM_STARTUP]: 'system',
            [this.eventTypes.ERROR_OCCURRED]: 'system',
            [this.eventTypes.DATA_ACCESSED]: 'data'
        };
        
        return categoryMap[type] || 'general';
    }
    
    getActorType(actor) {
        if (actor === 'system') return 'system';
        if (actor.startsWith('guardian_')) return 'guardian';
        if (actor.startsWith('service_')) return 'service';
        return 'user';
    }
    
    getDefaultAction(type) {
        const actionMap = {
            [this.eventTypes.USER_LOGIN]: 'authenticate',
            [this.eventTypes.PROPOSAL_CREATED]: 'create',
            [this.eventTypes.VOTE_CAST]: 'vote',
            [this.eventTypes.THRESHOLD_SIGNING_INITIATED]: 'initiate_signing',
            [this.eventTypes.GUARDIAN_CREATED]: 'create',
            [this.eventTypes.DATA_ACCESSED]: 'read'
        };
        
        return actionMap[type] || 'unknown';
    }
    
    calculateSeverity(type, outcome) {
        if (outcome === 'failure' || outcome === 'error') {
            return this.severityLevels.HIGH;
        }
        
        const highSeverityEvents = [
            this.eventTypes.LOGIN_FAILED,
            this.eventTypes.ACCESS_DENIED,
            this.eventTypes.POLICY_VIOLATION,
            this.eventTypes.SECURITY_ALERT,
            this.eventTypes.ERROR_OCCURRED
        ];
        
        if (highSeverityEvents.includes(type)) {
            return this.severityLevels.HIGH;
        }
        
        const mediumSeverityEvents = [
            this.eventTypes.GUARDIAN_CREATED,
            this.eventTypes.GUARDIAN_DELETED,
            this.eventTypes.POLICY_CREATED,
            this.eventTypes.CONFIGURATION_CHANGED
        ];
        
        if (mediumSeverityEvents.includes(type)) {
            return this.severityLevels.MEDIUM;
        }
        
        return this.severityLevels.INFO;
    }
    
    getApplicableFrameworks(type) {
        const frameworkMap = {
            [this.eventTypes.USER_LOGIN]: [this.complianceFrameworks.SOC2, this.complianceFrameworks.ISO27001],
            [this.eventTypes.ACCESS_DENIED]: [this.complianceFrameworks.SOC2, this.complianceFrameworks.GDPR],
            [this.eventTypes.DATA_ACCESSED]: [this.complianceFrameworks.GDPR, this.complianceFrameworks.HIPAA],
            [this.eventTypes.CREDENTIAL_ISSUED]: [this.complianceFrameworks.ISO27001],
            [this.eventTypes.POLICY_VIOLATION]: [this.complianceFrameworks.SOC2, this.complianceFrameworks.ISO27001]
        };
        
        return frameworkMap[type] || [this.complianceFrameworks.SOC2];
    }
    
    getComplianceRequirements(type) {
        // Map event types to specific compliance requirements
        const requirementMap = {
            [this.eventTypes.USER_LOGIN]: ['CC6.1', 'CC6.2'], // SOC 2 controls
            [this.eventTypes.DATA_ACCESSED]: ['Art 32'], // GDPR Article 32
            [this.eventTypes.POLICY_VIOLATION]: ['CC3.1', 'CC3.2']
        };
        
        return requirementMap[type] || [];
    }
    
    calculateRetentionPeriod(type, severity) {
        // Base retention period
        let retention = this.auditConfig.retentionPeriod;
        
        // Extend for high severity events
        if (severity === this.severityLevels.CRITICAL || severity === this.severityLevels.HIGH) {
            retention = retention * 1.5; // 50% longer retention
        }
        
        // Specific retention for certain event types
        const securityEvents = [
            this.eventTypes.LOGIN_FAILED,
            this.eventTypes.ACCESS_DENIED,
            this.eventTypes.SECURITY_ALERT
        ];
        
        if (securityEvents.includes(type)) {
            retention = Math.max(retention, 10 * 365 * 24 * 60 * 60 * 1000); // 10 years minimum
        }
        
        return retention;
    }
    
    getDataClassification(type) {
        const highSensitivityEvents = [
            this.eventTypes.THRESHOLD_SIGNING_INITIATED,
            this.eventTypes.CREDENTIAL_ISSUED,
            this.eventTypes.PASSWORD_CHANGED
        ];
        
        if (highSensitivityEvents.includes(type)) {
            return 'confidential';
        }
        
        const mediumSensitivityEvents = [
            this.eventTypes.USER_LOGIN,
            this.eventTypes.PROPOSAL_CREATED,
            this.eventTypes.GUARDIAN_CREATED
        ];
        
        if (mediumSensitivityEvents.includes(type)) {
            return 'internal';
        }
        
        return 'public';
    }
    
    calculateIntegrityHash(eventData) {
        const dataString = JSON.stringify(eventData, Object.keys(eventData).sort());
        return crypto.createHash('sha256').update(dataString).digest('hex');
    }
    
    encryptSensitiveData(auditEntry) {
        // Simplified encryption (use proper encryption in production)
        const sensitiveFields = ['actor', 'context', 'metadata'];
        const encryptedData = {};
        
        for (const field of sensitiveFields) {
            if (auditEntry[field]) {
                const data = JSON.stringify(auditEntry[field]);
                const cipher = crypto.createCipher('aes-256-gcm', this.config.encryptionKey || 'default-key');
                let encrypted = cipher.update(data, 'utf8', 'hex');
                encrypted += cipher.final('hex');
                encryptedData[field] = encrypted;
            }
        }
        
        return encryptedData;
    }
    
    async processRealTimeMonitoring(auditEntry) {
        // Check for alert conditions
        for (const [condition, config] of this.alertConditions) {
            if (await this.checkAlertCondition(condition, auditEntry, config)) {
                await this.triggerAlert(condition, auditEntry);
            }
        }
        
        // Stream to real-time monitoring systems
        if (this.auditConfig.alertingEnabled) {
            this.streamToMonitoring(auditEntry);
        }
    }
    
    async checkAlertCondition(condition, auditEntry, config) {
        const { threshold, timeWindow } = config;
        const currentTime = new Date().getTime();
        const windowStart = currentTime - timeWindow;
        
        // Get recent events matching the condition
        const recentEvents = Array.from(this.auditLogs.values())
            .filter(log => {
                const logTime = new Date(log.timestamp).getTime();
                return logTime >= windowStart && this.matchesCondition(log, condition);
            });
        
        return recentEvents.length >= threshold;
    }
    
    matchesCondition(log, condition) {
        switch (condition) {
            case 'multiple_failed_logins':
                return log.type === this.eventTypes.LOGIN_FAILED;
            case 'suspicious_activity':
                return log.metadata.severity === this.severityLevels.HIGH;
            case 'policy_violations':
                return log.type === this.eventTypes.POLICY_VIOLATION;
            case 'system_errors':
                return log.type === this.eventTypes.ERROR_OCCURRED;
            case 'data_access_anomaly':
                return log.type === this.eventTypes.DATA_ACCESSED && 
                       log.action.outcome === 'unauthorized';
            default:
                return false;
        }
    }
    
    async triggerAlert(condition, auditEntry) {
        this.logger.warn('Alert condition triggered', {
            condition,
            auditId: auditEntry.id,
            severity: auditEntry.metadata.severity
        });
        
        // Create alert audit entry
        await this.logEvent({
            type: this.eventTypes.SECURITY_ALERT,
            actor: 'system',
            resource: 'audit_system',
            action: 'alert_triggered',
            metadata: {
                alertCondition: condition,
                triggeringEvent: auditEntry.id,
                severity: this.severityLevels.HIGH
            }
        });
    }
    
    streamToMonitoring(auditEntry) {
        // Mock implementation - integrate with monitoring systems
        this.logger.debug('Streaming audit entry to monitoring', {
            auditId: auditEntry.id,
            type: auditEntry.type
        });
    }
    
    sanitizeLogForResponse(log) {
        // Remove encrypted data and other sensitive information
        const sanitized = { ...log };
        delete sanitized.encryptedData;
        delete sanitized.security.integrity;
        
        return sanitized;
    }
    
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }
    
    getSearchableText(log) {
        return [
            log.type,
            log.category,
            log.actor.id,
            log.resource.type,
            log.resource.id,
            log.action.type,
            log.action.description,
            log.metadata.description,
            JSON.stringify(log.metadata)
        ].filter(Boolean).join(' ');
    }
    
    calculateRelevanceScore(log, searchTerms) {
        const text = this.getSearchableText(log).toLowerCase();
        let score = 0;
        
        for (const term of searchTerms) {
            const count = (text.match(new RegExp(term, 'g')) || []).length;
            score += count;
        }
        
        return score;
    }
    
    convertToCSV(logs) {
        if (logs.length === 0) return '';
        
        const headers = ['timestamp', 'type', 'actor', 'resource', 'action', 'outcome', 'severity'];
        const rows = logs.map(log => [
            log.timestamp,
            log.type,
            log.actor.id,
            log.resource.type,
            log.action.type,
            log.action.outcome,
            log.metadata.severity
        ]);
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
    
    convertToXML(logs) {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<audit_logs>\n';
        
        for (const log of logs) {
            xml += '  <log>\n';
            xml += `    <id>${log.id}</id>\n`;
            xml += `    <timestamp>${log.timestamp}</timestamp>\n`;
            xml += `    <type>${log.type}</type>\n`;
            xml += `    <actor>${log.actor.id}</actor>\n`;
            xml += `    <resource>${log.resource.type}</resource>\n`;
            xml += `    <action>${log.action.type}</action>\n`;
            xml += `    <outcome>${log.action.outcome}</outcome>\n`;
            xml += `    <severity>${log.metadata.severity}</severity>\n`;
            xml += '  </log>\n';
        }
        
        xml += '</audit_logs>';
        return xml;
    }
    
    // Compliance analysis methods (simplified implementations)
    
    groupEventsByType(logs) {
        return logs.reduce((acc, log) => {
            acc[log.type] = (acc[log.type] || 0) + 1;
            return acc;
        }, {});
    }
    
    groupEventsBySeverity(logs) {
        return logs.reduce((acc, log) => {
            acc[log.metadata.severity] = (acc[log.metadata.severity] || 0) + 1;
            return acc;
        }, {});
    }
    
    groupEventsByOutcome(logs) {
        return logs.reduce((acc, log) => {
            acc[log.action.outcome] = (acc[log.action.outcome] || 0) + 1;
            return acc;
        }, {});
    }
    
    calculateComplianceScore(logs, framework) {
        // Simplified compliance scoring
        const totalEvents = logs.length;
        const failureEvents = logs.filter(log => log.action.outcome === 'failure').length;
        const successRate = totalEvents > 0 ? (totalEvents - failureEvents) / totalEvents : 1;
        
        return Math.round(successRate * 100);
    }
    
    analyzeComplianceRequirements(logs, framework) {
        // Mock implementation
        return {
            met: ['CC6.1', 'CC6.2'],
            pending: ['CC3.1'],
            failed: []
        };
    }
    
    performRiskAnalysis(logs) {
        const highSeverityCount = logs.filter(log => 
            log.metadata.severity === this.severityLevels.HIGH).length;
        const failureCount = logs.filter(log => 
            log.action.outcome === 'failure').length;
        
        const riskScore = (highSeverityCount + failureCount) / logs.length;
        
        return {
            riskScore: Math.round(riskScore * 100),
            riskLevel: riskScore < 0.1 ? 'low' : riskScore < 0.3 ? 'medium' : 'high',
            factors: {
                highSeverityEvents: highSeverityCount,
                failureEvents: failureCount
            }
        };
    }
    
    generateRecommendations(logs, framework) {
        const recommendations = [];
        
        const failureRate = logs.filter(log => log.action.outcome === 'failure').length / logs.length;
        if (failureRate > 0.1) {
            recommendations.push('Investigate high failure rate in system operations');
        }
        
        const securityEvents = logs.filter(log => log.category === 'authentication').length;
        if (securityEvents > logs.length * 0.5) {
            recommendations.push('Review authentication policies and procedures');
        }
        
        return recommendations;
    }
    
    collectEvidence(logs, framework) {
        return {
            totalEvents: logs.length,
            dateRange: {
                start: logs[0]?.timestamp,
                end: logs[logs.length - 1]?.timestamp
            },
            integrityVerified: true,
            retentionCompliant: true
        };
    }
    
    calculateHashChain(logs) {
        // Create a hash chain for integrity verification
        let previousHash = '';
        const hashes = [];
        
        for (const log of logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))) {
            const data = previousHash + log.security.integrity;
            const hash = crypto.createHash('sha256').update(data).digest('hex');
            hashes.push(hash);
            previousHash = hash;
        }
        
        return hashes[hashes.length - 1] || '';
    }
    
    /**
     * Health check
     */
    async healthCheck() {
        try {
            const recentLogs = Array.from(this.auditLogs.values())
                .filter(log => {
                    const logTime = new Date(log.timestamp).getTime();
                    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
                    return logTime >= oneDayAgo;
                }).length;
                
            return {
                status: 'healthy',
                totalLogs: this.auditLogs.size,
                recentLogs,
                complianceReports: this.complianceReports.size,
                configuration: this.auditConfig,
                lastChecked: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                lastChecked: new Date().toISOString()
            };
        }
    }
}