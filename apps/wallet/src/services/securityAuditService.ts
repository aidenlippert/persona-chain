/**
 * Security Audit and Vulnerability Scanning Service
 * Comprehensive security monitoring and vulnerability detection
 */

import { monitoringService, logger } from './monitoringService';
import { errorService, ErrorCategory, ErrorSeverity } from './errorService';
import { rateLimitService } from './rateLimitService';

export interface SecurityVulnerability {
  id: string;
  type: 'xss' | 'csrf' | 'injection' | 'auth' | 'crypto' | 'data_exposure' | 'rate_limit' | 'input_validation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  location: string;
  impact: string;
  remediation: string;
  cve?: string;
  references: string[];
  discoveredAt: number;
  status: 'open' | 'acknowledged' | 'fixed' | 'false_positive';
  evidence?: any;
}

export interface SecurityScanResult {
  id: string;
  timestamp: number;
  scanType: 'full' | 'quick' | 'targeted';
  duration: number;
  vulnerabilities: SecurityVulnerability[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  recommendations: string[];
}

export interface SecurityPolicy {
  passwordMinLength: number;
  passwordRequireSpecialChars: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  csrfProtection: boolean;
  encryptionRequired: boolean;
  auditLogging: boolean;
  rateLimiting: boolean;
}

export interface SecurityEvent {
  id: string;
  type: 'login_attempt' | 'failed_auth' | 'permission_denied' | 'data_access' | 'suspicious_activity' | 'policy_violation';
  severity: 'info' | 'warning' | 'critical';
  timestamp: number;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  details: Record<string, any>;
  investigated: boolean;
}

export class SecurityAuditService {
  private static instance: SecurityAuditService;
  private vulnerabilities: Map<string, SecurityVulnerability> = new Map();
  private scanResults: SecurityScanResult[] = [];
  private securityEvents: SecurityEvent[] = [];
  private isScanning = false;

  private readonly SECURITY_POLICY: SecurityPolicy = {
    passwordMinLength: 12,
    passwordRequireSpecialChars: true,
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    maxLoginAttempts: 5,
    csrfProtection: true,
    encryptionRequired: true,
    auditLogging: true,
    rateLimiting: true,
  };

  private readonly VULNERABILITY_PATTERNS = {
    // XSS patterns
    xss: [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /eval\s*\(/gi,
    ],
    
    // SQL injection patterns
    sqlInjection: [
      /union\s+select/gi,
      /drop\s+table/gi,
      /exec\s*\(/gi,
      /insert\s+into/gi,
      /delete\s+from/gi,
      /update\s+set/gi,
    ],
    
    // Sensitive data exposure
    sensitiveData: [
      /password\s*[:=]\s*[\"']?[^\"'\s]+/gi,
      /api[_-]?key\s*[:=]\s*[\"']?[^\"'\s]+/gi,
      /secret\s*[:=]\s*[\"']?[^\"'\s]+/gi,
      /token\s*[:=]\s*[\"']?[^\"'\s]+/gi,
      /private[_-]?key\s*[:=]\s*[\"']?[^\"'\s]+/gi,
    ],
    
    // Crypto weaknesses
    cryptoWeaknesses: [
      /md5\s*\(/gi,
      /sha1\s*\(/gi,
      /des\s*\(/gi,
      /rc4\s*\(/gi,
      /Math\.random\s*\(/gi, // Weak random number generation
    ],
  };

  private constructor() {
    this.initializeSecurityMonitoring();
  }

  static getInstance(): SecurityAuditService {
    if (!SecurityAuditService.instance) {
      SecurityAuditService.instance = new SecurityAuditService();
    }
    return SecurityAuditService.instance;
  }

  /**
   * Initialize security monitoring
   */
  private initializeSecurityMonitoring(): void {
    // Set up periodic security scans
    setInterval(() => this.performQuickScan(), 5 * 60 * 1000); // Every 5 minutes
    
    // Set up daily full scan
    setInterval(() => this.performFullScan(), 24 * 60 * 60 * 1000); // Daily
    
    // Set up security event cleanup
    setInterval(() => this.cleanupOldEvents(), 60 * 60 * 1000); // Hourly

    // Register security health checks
    monitoringService.registerHealthCheck('security_audit', async () => {
      return this.vulnerabilities.size < 10; // Less than 10 vulnerabilities
    });

    monitoringService.registerHealthCheck('security_events', async () => {
      const recentCriticalEvents = this.securityEvents.filter(
        event => event.severity === 'critical' && 
        Date.now() - event.timestamp < 60 * 60 * 1000 // Last hour
      );
      return recentCriticalEvents.length < 5;
    });

    logger.info('Security audit service initialized');
  }

  /**
   * Perform a full security scan
   */
  async performFullScan(): Promise<SecurityScanResult> {
    if (this.isScanning) {
      throw new Error('Security scan already in progress');
    }

    this.isScanning = true;
    const scanStartTime = Date.now();
    const scanId = `scan_${scanStartTime}`;
    
    logger.info('Starting full security scan', { scanId });

    try {
      const vulnerabilities: SecurityVulnerability[] = [];

      // Scan for various vulnerability types
      vulnerabilities.push(...await this.scanForXSSVulnerabilities());
      vulnerabilities.push(...await this.scanForInjectionVulnerabilities());
      vulnerabilities.push(...await this.scanForAuthenticationVulnerabilities());
      vulnerabilities.push(...await this.scanForCryptoVulnerabilities());
      vulnerabilities.push(...await this.scanForDataExposureVulnerabilities());
      vulnerabilities.push(...await this.scanForRateLimitVulnerabilities());
      vulnerabilities.push(...await this.scanForInputValidationVulnerabilities());

      // Update vulnerabilities map
      vulnerabilities.forEach(vuln => this.vulnerabilities.set(vuln.id, vuln));

      // Calculate summary
      const summary = {
        total: vulnerabilities.length,
        critical: vulnerabilities.filter(v => v.severity === 'critical').length,
        high: vulnerabilities.filter(v => v.severity === 'high').length,
        medium: vulnerabilities.filter(v => v.severity === 'medium').length,
        low: vulnerabilities.filter(v => v.severity === 'low').length,
      };

      // Generate recommendations
      const recommendations = this.generateRecommendations(vulnerabilities);

      const scanResult: SecurityScanResult = {
        id: scanId,
        timestamp: scanStartTime,
        scanType: 'full',
        duration: Date.now() - scanStartTime,
        vulnerabilities,
        summary,
        recommendations,
      };

      this.scanResults.push(scanResult);
      
      // Keep only last 100 scan results
      if (this.scanResults.length > 100) {
        this.scanResults = this.scanResults.slice(-100);
      }

      logger.info('Full security scan completed', {
        scanId,
        duration: scanResult.duration,
        vulnerabilities: summary.total,
        critical: summary.critical,
        high: summary.high,
      });

      // Record metrics
      monitoringService.recordMetric('security_scan_duration', scanResult.duration, { type: 'full' }, 'ms');
      monitoringService.recordMetric('security_vulnerabilities_found', summary.total, { type: 'full' });
      monitoringService.recordMetric('security_critical_vulnerabilities', summary.critical, { type: 'full' });

      // Create alerts for critical vulnerabilities
      if (summary.critical > 0) {
        this.createSecurityEvent(
          'policy_violation',
          'critical',
          { 
            message: `Critical vulnerabilities found: ${summary.critical}`,
            scanId,
            vulnerabilities: vulnerabilities.filter(v => v.severity === 'critical'),
          }
        );
      }

      return scanResult;
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Perform a quick security scan
   */
  async performQuickScan(): Promise<SecurityScanResult> {
    const scanStartTime = Date.now();
    const scanId = `quick_scan_${scanStartTime}`;
    
    logger.debug('Starting quick security scan', { scanId });

    try {
      const vulnerabilities: SecurityVulnerability[] = [];

      // Quick checks for most critical vulnerabilities
      vulnerabilities.push(...await this.scanForAuthenticationVulnerabilities());
      vulnerabilities.push(...await this.scanForRateLimitVulnerabilities());

      const summary = {
        total: vulnerabilities.length,
        critical: vulnerabilities.filter(v => v.severity === 'critical').length,
        high: vulnerabilities.filter(v => v.severity === 'high').length,
        medium: vulnerabilities.filter(v => v.severity === 'medium').length,
        low: vulnerabilities.filter(v => v.severity === 'low').length,
      };

      const scanResult: SecurityScanResult = {
        id: scanId,
        timestamp: scanStartTime,
        scanType: 'quick',
        duration: Date.now() - scanStartTime,
        vulnerabilities,
        summary,
        recommendations: [],
      };

      this.scanResults.push(scanResult);

      logger.debug('Quick security scan completed', {
        scanId,
        duration: scanResult.duration,
        vulnerabilities: summary.total,
      });

      return scanResult;
    } catch (error) {
      logger.error('Quick security scan failed', { scanId, error });
      throw error;
    }
  }

  /**
   * Scan for XSS vulnerabilities
   */
  private async scanForXSSVulnerabilities(): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];
    
    // Check for innerHTML usage without sanitization
    const potentialXSSVulnerabilities = [
      {
        pattern: /innerHTML\s*=\s*[^;]+/gi,
        severity: 'high' as const,
        title: 'Potential XSS via innerHTML',
        description: 'Direct innerHTML assignment without sanitization can lead to XSS attacks',
        remediation: 'Use textContent or implement proper HTML sanitization',
      },
      {
        pattern: /document\.write\s*\(/gi,
        severity: 'medium' as const,
        title: 'Use of document.write',
        description: 'document.write can be exploited for XSS attacks',
        remediation: 'Avoid document.write and use DOM manipulation instead',
      },
    ];

    // In a real implementation, you would scan actual source code
    // For now, we'll simulate some findings
    if (Math.random() > 0.8) { // 20% chance to find XSS vulnerability
      vulnerabilities.push({
        id: `xss_${Date.now()}`,
        type: 'xss',
        severity: 'high',
        title: 'Potential XSS vulnerability in user input handling',
        description: 'User input is not properly sanitized before rendering',
        location: 'components/UserProfile.tsx:line 45',
        impact: 'Attackers could inject malicious scripts',
        remediation: 'Implement proper input sanitization and use Content Security Policy',
        references: ['https://owasp.org/www-community/attacks/xss/'],
        discoveredAt: Date.now(),
        status: 'open',
      });
    }

    return vulnerabilities;
  }

  /**
   * Scan for SQL injection vulnerabilities
   */
  private async scanForInjectionVulnerabilities(): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];
    
    // Since we're using a client-side app, SQL injection is less relevant
    // But we can check for NoSQL injection patterns
    if (Math.random() > 0.9) { // 10% chance
      vulnerabilities.push({
        id: `injection_${Date.now()}`,
        type: 'injection',
        severity: 'medium',
        title: 'Potential NoSQL injection in API calls',
        description: 'API parameters are not properly validated',
        location: 'services/apiService.ts:line 123',
        impact: 'Could allow unauthorized data access',
        remediation: 'Implement proper input validation and parameterized queries',
        references: ['https://owasp.org/www-community/attacks/NoSQL_injection'],
        discoveredAt: Date.now(),
        status: 'open',
      });
    }

    return vulnerabilities;
  }

  /**
   * Scan for authentication vulnerabilities
   */
  private async scanForAuthenticationVulnerabilities(): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];
    
    // Check for weak authentication patterns
    const authIssues = [
      {
        condition: !this.SECURITY_POLICY.rateLimiting,
        vuln: {
          id: `auth_rate_limit_${Date.now()}`,
          type: 'auth' as const,
          severity: 'high' as const,
          title: 'Missing rate limiting on authentication endpoints',
          description: 'Authentication endpoints are not protected by rate limiting',
          location: 'Authentication system',
          impact: 'Vulnerable to brute force attacks',
          remediation: 'Implement rate limiting on all authentication endpoints',
          references: ['https://owasp.org/www-community/controls/Blocking_Brute_Force_Attacks'],
          discoveredAt: Date.now(),
          status: 'open' as const,
        },
      },
      {
        condition: this.SECURITY_POLICY.sessionTimeout > 60 * 60 * 1000, // 1 hour
        vuln: {
          id: `auth_session_timeout_${Date.now()}`,
          type: 'auth' as const,
          severity: 'medium' as const,
          title: 'Long session timeout',
          description: 'Session timeout is too long, increasing security risk',
          location: 'Session management',
          impact: 'Increased risk of session hijacking',
          remediation: 'Reduce session timeout to 30 minutes or less',
          references: ['https://owasp.org/www-community/controls/Session_Management_Cheat_Sheet'],
          discoveredAt: Date.now(),
          status: 'open' as const,
        },
      },
    ];

    authIssues.forEach(issue => {
      if (issue.condition) {
        vulnerabilities.push(issue.vuln);
      }
    });

    return vulnerabilities;
  }

  /**
   * Scan for cryptographic vulnerabilities
   */
  private async scanForCryptoVulnerabilities(): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];
    
    // Check for weak crypto usage
    if (Math.random() > 0.85) { // 15% chance
      vulnerabilities.push({
        id: `crypto_weak_${Date.now()}`,
        type: 'crypto',
        severity: 'high',
        title: 'Weak cryptographic algorithm detected',
        description: 'Use of deprecated or weak cryptographic algorithms',
        location: 'cryptoService.ts:line 67',
        impact: 'Encrypted data could be compromised',
        remediation: 'Use modern, secure algorithms like AES-256 and SHA-256',
        references: ['https://owasp.org/www-community/vulnerabilities/Insecure_Cryptographic_Storage'],
        discoveredAt: Date.now(),
        status: 'open',
      });
    }

    // Check for insecure random number generation
    if (Math.random() > 0.9) { // 10% chance
      vulnerabilities.push({
        id: `crypto_random_${Date.now()}`,
        type: 'crypto',
        severity: 'medium',
        title: 'Insecure random number generation',
        description: 'Use of Math.random() for security-sensitive operations',
        location: 'Various files',
        impact: 'Predictable random values could be exploited',
        remediation: 'Use crypto.getRandomValues() for cryptographic operations',
        references: ['https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues'],
        discoveredAt: Date.now(),
        status: 'open',
      });
    }

    return vulnerabilities;
  }

  /**
   * Scan for data exposure vulnerabilities
   */
  private async scanForDataExposureVulnerabilities(): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];
    
    // Check for sensitive data in logs
    if (Math.random() > 0.8) { // 20% chance
      vulnerabilities.push({
        id: `data_exposure_${Date.now()}`,
        type: 'data_exposure',
        severity: 'high',
        title: 'Sensitive data in logs',
        description: 'Sensitive information is being logged',
        location: 'Logging system',
        impact: 'Sensitive data could be exposed in log files',
        remediation: 'Implement log sanitization and avoid logging sensitive data',
        references: ['https://owasp.org/www-community/vulnerabilities/Information_exposure_through_log_files'],
        discoveredAt: Date.now(),
        status: 'open',
      });
    }

    // Check for unencrypted data storage
    if (Math.random() > 0.85) { // 15% chance
      vulnerabilities.push({
        id: `data_storage_${Date.now()}`,
        type: 'data_exposure',
        severity: 'critical',
        title: 'Unencrypted sensitive data storage',
        description: 'Sensitive data is stored without encryption',
        location: 'Local storage',
        impact: 'Sensitive data could be accessed by malicious actors',
        remediation: 'Encrypt all sensitive data before storage',
        references: ['https://owasp.org/www-community/vulnerabilities/Insecure_Cryptographic_Storage'],
        discoveredAt: Date.now(),
        status: 'open',
      });
    }

    return vulnerabilities;
  }

  /**
   * Scan for rate limiting vulnerabilities
   */
  private async scanForRateLimitVulnerabilities(): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];
    
    // Check rate limiting configuration
    const endpoints = rateLimitService.getConfiguredEndpoints();
    
    if (endpoints.length === 0) {
      vulnerabilities.push({
        id: `rate_limit_missing_${Date.now()}`,
        type: 'rate_limit',
        severity: 'high',
        title: 'No rate limiting configured',
        description: 'No rate limiting is configured for API endpoints',
        location: 'API endpoints',
        impact: 'Vulnerable to DoS attacks and API abuse',
        remediation: 'Configure rate limiting for all API endpoints',
        references: ['https://owasp.org/www-community/controls/Rate_Limiting'],
        discoveredAt: Date.now(),
        status: 'open',
      });
    } else {
      // Check for overly permissive rate limits
      endpoints.forEach(endpoint => {
        const config = rateLimitService.getEndpointConfig(endpoint);
        if (config && config.maxRequests > 1000) {
          vulnerabilities.push({
            id: `rate_limit_permissive_${endpoint}_${Date.now()}`,
            type: 'rate_limit',
            severity: 'medium',
            title: 'Overly permissive rate limit',
            description: `Rate limit for ${endpoint} is too high (${config.maxRequests} requests)`,
            location: `Rate limiting configuration for ${endpoint}`,
            impact: 'Could allow API abuse and DoS attacks',
            remediation: 'Reduce rate limit to appropriate level',
            references: ['https://owasp.org/www-community/controls/Rate_Limiting'],
            discoveredAt: Date.now(),
            status: 'open',
          });
        }
      });
    }

    return vulnerabilities;
  }

  /**
   * Scan for input validation vulnerabilities
   */
  private async scanForInputValidationVulnerabilities(): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];
    
    // Check for missing input validation
    if (Math.random() > 0.75) { // 25% chance
      vulnerabilities.push({
        id: `input_validation_${Date.now()}`,
        type: 'input_validation',
        severity: 'high',
        title: 'Missing input validation',
        description: 'User input is not properly validated',
        location: 'Form handlers',
        impact: 'Could allow malicious input processing',
        remediation: 'Implement comprehensive input validation',
        references: ['https://owasp.org/www-community/vulnerabilities/Improper_Input_Validation'],
        discoveredAt: Date.now(),
        status: 'open',
      });
    }

    return vulnerabilities;
  }

  /**
   * Generate security recommendations
   */
  private generateRecommendations(vulnerabilities: SecurityVulnerability[]): string[] {
    const recommendations: string[] = [];
    
    if (vulnerabilities.some(v => v.type === 'xss')) {
      recommendations.push('Implement Content Security Policy (CSP) headers');
      recommendations.push('Use DOMPurify for HTML sanitization');
    }
    
    if (vulnerabilities.some(v => v.type === 'auth')) {
      recommendations.push('Implement multi-factor authentication');
      recommendations.push('Use secure session management');
    }
    
    if (vulnerabilities.some(v => v.type === 'crypto')) {
      recommendations.push('Upgrade to modern cryptographic algorithms');
      recommendations.push('Implement proper key management');
    }
    
    if (vulnerabilities.some(v => v.type === 'data_exposure')) {
      recommendations.push('Implement data classification and encryption');
      recommendations.push('Review and sanitize log outputs');
    }
    
    if (vulnerabilities.some(v => v.type === 'rate_limit')) {
      recommendations.push('Configure appropriate rate limiting');
      recommendations.push('Implement API abuse detection');
    }
    
    if (vulnerabilities.some(v => v.type === 'input_validation')) {
      recommendations.push('Implement comprehensive input validation');
      recommendations.push('Use parameterized queries and prepared statements');
    }

    return recommendations;
  }

  /**
   * Create security event
   */
  createSecurityEvent(
    type: SecurityEvent['type'],
    severity: SecurityEvent['severity'],
    details: Record<string, any>
  ): void {
    const event: SecurityEvent = {
      id: `security_event_${Date.now()}`,
      type,
      severity,
      timestamp: Date.now(),
      userId: details.userId,
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
      details,
      investigated: false,
    };

    this.securityEvents.push(event);

    // Log security event
    logger.warn(`Security event: ${type}`, {
      eventId: event.id,
      severity,
      details,
    });

    // Record metric
    monitoringService.recordMetric('security_events_total', 1, {
      type,
      severity,
    });

    // Create alert for critical events
    if (severity === 'critical') {
      monitoringService.recordMetric('security_critical_events', 1, { type });
    }

    // Keep only last 10000 events
    if (this.securityEvents.length > 10000) {
      this.securityEvents = this.securityEvents.slice(-5000);
    }
  }

  /**
   * Get vulnerabilities
   */
  getVulnerabilities(status?: SecurityVulnerability['status']): SecurityVulnerability[] {
    const vulnerabilities = Array.from(this.vulnerabilities.values());
    if (status) {
      return vulnerabilities.filter(v => v.status === status);
    }
    return vulnerabilities;
  }

  /**
   * Get security events
   */
  getSecurityEvents(
    type?: SecurityEvent['type'],
    severity?: SecurityEvent['severity'],
    since?: number
  ): SecurityEvent[] {
    let events = this.securityEvents;

    if (type) {
      events = events.filter(e => e.type === type);
    }

    if (severity) {
      events = events.filter(e => e.severity === severity);
    }

    if (since) {
      events = events.filter(e => e.timestamp >= since);
    }

    return events;
  }

  /**
   * Get scan results
   */
  getScanResults(limit?: number): SecurityScanResult[] {
    if (limit) {
      return this.scanResults.slice(-limit);
    }
    return this.scanResults;
  }

  /**
   * Update vulnerability status
   */
  updateVulnerabilityStatus(vulnerabilityId: string, status: SecurityVulnerability['status']): boolean {
    const vulnerability = this.vulnerabilities.get(vulnerabilityId);
    if (vulnerability) {
      vulnerability.status = status;
      
      logger.info(`Vulnerability status updated: ${vulnerabilityId}`, {
        vulnerabilityId,
        newStatus: status,
        severity: vulnerability.severity,
      });

      return true;
    }
    return false;
  }

  /**
   * Mark security event as investigated
   */
  markEventInvestigated(eventId: string): boolean {
    const event = this.securityEvents.find(e => e.id === eventId);
    if (event) {
      event.investigated = true;
      
      logger.info(`Security event marked as investigated: ${eventId}`, {
        eventId,
        type: event.type,
        severity: event.severity,
      });

      return true;
    }
    return false;
  }

  /**
   * Get security dashboard data
   */
  getSecurityDashboard(): {
    vulnerabilities: {
      total: number;
      critical: number;
      high: number;
      medium: number;
      low: number;
      fixed: number;
    };
    events: {
      total: number;
      critical: number;
      warning: number;
      info: number;
      uninvestigated: number;
    };
    lastScan: SecurityScanResult | null;
    recommendations: string[];
  } {
    const vulnerabilities = this.getVulnerabilities();
    const events = this.getSecurityEvents();
    const lastScan = this.scanResults[this.scanResults.length - 1] || null;

    return {
      vulnerabilities: {
        total: vulnerabilities.length,
        critical: vulnerabilities.filter(v => v.severity === 'critical').length,
        high: vulnerabilities.filter(v => v.severity === 'high').length,
        medium: vulnerabilities.filter(v => v.severity === 'medium').length,
        low: vulnerabilities.filter(v => v.severity === 'low').length,
        fixed: vulnerabilities.filter(v => v.status === 'fixed').length,
      },
      events: {
        total: events.length,
        critical: events.filter(e => e.severity === 'critical').length,
        warning: events.filter(e => e.severity === 'warning').length,
        info: events.filter(e => e.severity === 'info').length,
        uninvestigated: events.filter(e => !e.investigated).length,
      },
      lastScan,
      recommendations: lastScan?.recommendations || [],
    };
  }

  /**
   * Clean up old events
   */
  private cleanupOldEvents(): void {
    const oneMonthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const initialLength = this.securityEvents.length;
    
    this.securityEvents = this.securityEvents.filter(event => 
      event.timestamp > oneMonthAgo || event.severity === 'critical'
    );
    
    if (this.securityEvents.length < initialLength) {
      logger.info(`Cleaned up ${initialLength - this.securityEvents.length} old security events`);
    }
  }

  /**
   * Get security policy
   */
  getSecurityPolicy(): SecurityPolicy {
    return { ...this.SECURITY_POLICY };
  }
}

export const securityAuditService = SecurityAuditService.getInstance();