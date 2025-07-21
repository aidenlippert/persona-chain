import winston from 'winston';
import crypto from 'crypto';

export interface LogContext {
  connector: string;
  requestId?: string;
  did?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  ip?: string;
  userAgent?: string;
}

/**
 * Standard logger configuration factory
 */
export const createStandardLogger = (connector: string, logLevel: string = 'info') => {
  const logger = winston.createLogger({
    level: logLevel,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const logEntry = {
          timestamp,
          level,
          connector,
          message,
          ...meta
        };
        return JSON.stringify(logEntry);
      })
    ),
    defaultMeta: { connector },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ]
  });

  // Add file transport in production
  if (process.env.NODE_ENV === 'production') {
    logger.add(new winston.transports.File({
      filename: `logs/${connector}-error.log`,
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5
    }));
    
    logger.add(new winston.transports.File({
      filename: `logs/${connector}-combined.log`,
      maxsize: 10485760, // 10MB
      maxFiles: 5
    }));
  }

  return logger;
};

/**
 * Standard request logging middleware factory
 */
export const createRequestLogger = (connector: string) => {
  const logger = createStandardLogger(connector);
  
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] || crypto.randomUUID();
    
    // Attach request ID if not present
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-ID', requestId);
    
    // Log request
    logger.info('Incoming request', {
      requestId,
      method: req.method,
      url: sanitizeUrl(req.url),
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      did: req.did || 'anonymous'
    });
    
    // Log response
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      logger.info('Request completed', {
        requestId,
        method: req.method,
        url: sanitizeUrl(req.url),
        statusCode: res.statusCode,
        duration,
        ip: req.ip,
        did: req.did || 'anonymous'
      });
    });
    
    next();
  };
};

/**
 * Standard OAuth audit logger
 */
export const createOAuthAuditLogger = (connector: string) => {
  const logger = createStandardLogger(connector);
  
  const logOAuthStart = (did: string, provider: string, requestId?: string) => {
    logger.info('OAuth flow initiated', {
      requestId,
      did,
      provider,
      event: 'oauth_start',
      timestamp: new Date().toISOString()
    });
  };
  
  const logOAuthSuccess = (did: string, provider: string, scopes?: string[], requestId?: string) => {
    logger.info('OAuth flow completed successfully', {
      requestId,
      did,
      provider,
      scopes,
      event: 'oauth_success',
      timestamp: new Date().toISOString()
    });
  };
  
  const logOAuthFailure = (did: string, provider: string, error: string, requestId?: string) => {
    logger.error('OAuth flow failed', {
      requestId,
      did,
      provider,
      error,
      event: 'oauth_failure',
      timestamp: new Date().toISOString()
    });
  };
  
  const logTokenRefresh = (did: string, provider: string, requestId?: string) => {
    logger.info('OAuth token refreshed', {
      requestId,
      did,
      provider,
      event: 'token_refresh',
      timestamp: new Date().toISOString()
    });
  };
  
  const logTokenRevocation = (did: string, provider: string, requestId?: string) => {
    logger.info('OAuth token revoked', {
      requestId,
      did,
      provider,
      event: 'token_revocation',
      timestamp: new Date().toISOString()
    });
  };
  
  return {
    logOAuthStart,
    logOAuthSuccess,
    logOAuthFailure,
    logTokenRefresh,
    logTokenRevocation
  };
};

/**
 * Standard data access audit logger
 */
export const createDataAccessAuditLogger = (connector: string) => {
  const logger = createStandardLogger(connector);
  
  const logDataAccess = (context: {
    did: string;
    dataType: string;
    provider: string;
    recordCount?: number;
    requestId?: string;
  }) => {
    logger.info('Data access performed', {
      ...context,
      event: 'data_access',
      timestamp: new Date().toISOString()
    });
  };
  
  const logDataFetch = (context: {
    did: string;
    endpoint: string;
    provider: string;
    success: boolean;
    recordCount?: number;
    error?: string;
    requestId?: string;
  }) => {
    const level = context.success ? 'info' : 'error';
    logger.log(level, 'Data fetch attempt', {
      ...context,
      event: 'data_fetch',
      timestamp: new Date().toISOString()
    });
  };
  
  const logCredentialGeneration = (context: {
    did: string;
    credentialType: string;
    credentialId: string;
    verified: boolean;
    commitment: string;
    requestId?: string;
  }) => {
    logger.info('Credential generated', {
      ...context,
      event: 'credential_generation',
      timestamp: new Date().toISOString()
    });
  };
  
  const logDataPurge = (context: {
    did: string;
    dataType: string;
    recordCount: number;
    reason: string;
    requestId?: string;
  }) => {
    logger.info('Data purged', {
      ...context,
      event: 'data_purge',
      timestamp: new Date().toISOString()
    });
  };
  
  return {
    logDataAccess,
    logDataFetch,
    logCredentialGeneration,
    logDataPurge
  };
};

/**
 * Standard security event logger
 */
export const createSecurityLogger = (connector: string) => {
  const logger = createStandardLogger(connector);
  
  const logSecurityEvent = (context: {
    eventType: 'authentication_failure' | 'rate_limit_exceeded' | 'suspicious_activity' | 'data_breach_attempt' | 'unauthorized_access';
    did?: string;
    ip: string;
    userAgent?: string;
    details: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    requestId?: string;
  }) => {
    logger.warn('Security event detected', {
      ...context,
      event: 'security_event',
      timestamp: new Date().toISOString()
    });
  };
  
  const logComplianceEvent = (context: {
    eventType: 'gdpr_request' | 'hipaa_access' | 'pci_transaction' | 'data_retention' | 'privacy_violation';
    did: string;
    details: string;
    action: string;
    requestId?: string;
  }) => {
    logger.info('Compliance event', {
      ...context,
      event: 'compliance_event',
      timestamp: new Date().toISOString()
    });
  };
  
  return {
    logSecurityEvent,
    logComplianceEvent
  };
};

/**
 * Standard performance logger
 */
export const createPerformanceLogger = (connector: string) => {
  const logger = createStandardLogger(connector);
  
  const logAPICall = (context: {
    provider: string;
    endpoint: string;
    method: string;
    duration: number;
    statusCode: number;
    success: boolean;
    retryCount?: number;
    requestId?: string;
  }) => {
    const level = context.success ? 'debug' : 'warn';
    logger.log(level, 'API call completed', {
      ...context,
      event: 'api_call',
      timestamp: new Date().toISOString()
    });
  };
  
  const logDatabaseOperation = (context: {
    operation: string;
    table: string;
    duration: number;
    recordCount?: number;
    requestId?: string;
  }) => {
    logger.debug('Database operation', {
      ...context,
      event: 'database_operation',
      timestamp: new Date().toISOString()
    });
  };
  
  const logCacheOperation = (context: {
    operation: 'hit' | 'miss' | 'set' | 'delete';
    key: string;
    duration?: number;
    requestId?: string;
  }) => {
    logger.debug('Cache operation', {
      ...context,
      event: 'cache_operation',
      timestamp: new Date().toISOString()
    });
  };
  
  return {
    logAPICall,
    logDatabaseOperation,
    logCacheOperation
  };
};

/**
 * Sanitize URLs to remove sensitive information
 */
const sanitizeUrl = (url: string): string => {
  return url
    .replace(/token=[^&]+/g, 'token=***')
    .replace(/code=[^&]+/g, 'code=***')
    .replace(/client_secret=[^&]+/g, 'client_secret=***')
    .replace(/password=[^&]+/g, 'password=***')
    .replace(/ssn=[^&]+/g, 'ssn=***')
    .replace(/dob=[^&]+/g, 'dob=***')
    .replace(/\/user\/[^\/]+/g, '/user/***')
    .replace(/\/patient\/[^\/]+/g, '/patient/***');
};

/**
 * Standard log aggregation for metrics
 */
export const createMetricsLogger = (connector: string) => {
  const logger = createStandardLogger(connector);
  
  const logMetric = (metricName: string, value: number, unit: string, tags?: Record<string, string>) => {
    logger.info('Metric recorded', {
      metricName,
      value,
      unit,
      tags,
      event: 'metric',
      timestamp: new Date().toISOString()
    });
  };
  
  const logBusinessMetric = (context: {
    metricType: 'credential_created' | 'oauth_completion' | 'data_fetch' | 'user_onboarding';
    did: string;
    provider?: string;
    value?: number;
    metadata?: Record<string, any>;
    requestId?: string;
  }) => {
    logger.info('Business metric', {
      ...context,
      event: 'business_metric',
      timestamp: new Date().toISOString()
    });
  };
  
  return {
    logMetric,
    logBusinessMetric
  };
};

/**
 * Standard structured logging for different log levels
 */
export const createStructuredLogger = (connector: string) => {
  const logger = createStandardLogger(connector);
  
  return {
    debug: (message: string, context?: LogContext) => logger.debug(message, context),
    info: (message: string, context?: LogContext) => logger.info(message, context),
    warn: (message: string, context?: LogContext) => logger.warn(message, context),
    error: (message: string, error?: Error, context?: LogContext) => {
      logger.error(message, { ...context, error: error?.message, stack: error?.stack });
    },
    fatal: (message: string, error?: Error, context?: LogContext) => {
      logger.error(message, { ...context, error: error?.message, stack: error?.stack, level: 'fatal' });
    }
  };
};