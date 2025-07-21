/**
 * PersonaPass Zero Trust Security Architecture Server
 * Continuous verification, AI anomaly detection, adaptive authentication
 * Production-ready enterprise security platform
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import promClient from 'prom-client';
import dotenv from 'dotenv';

// Import Zero Trust Security Services
import ContinuousVerificationService from './services/ContinuousVerificationService.js';
import AnomalyDetectionService from './services/AnomalyDetectionService.js';
import AdaptiveAuthenticationService from './services/AdaptiveAuthenticationService.js';
import SecurityMonitoringService from './services/SecurityMonitoringService.js';
import ThreatIntelligenceService from './services/ThreatIntelligenceService.js';
import PolicyEnforcementService from './services/PolicyEnforcementService.js';
import RiskAssessmentService from './services/RiskAssessmentService.js';
import DeviceComplianceService from './services/DeviceComplianceService.js';
import AccessControlService from './services/AccessControlService.js';
import AuditLoggingService from './services/AuditLoggingService.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Environment configuration
const PORT = process.env.PORT || 3009;
const NODE_ENV = process.env.NODE_ENV || 'development';
const API_VERSION = 'v1';

// Enhanced logging configuration
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] })
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'zero-trust-security' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new DailyRotateFile({
      filename: 'logs/zero-trust-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true
    }),
    new DailyRotateFile({
      filename: 'logs/zero-trust-error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '30d',
      zippedArchive: true
    })
  ]
});

// Prometheus metrics
const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics({ timeout: 5000 });

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const securityEvents = new promClient.Counter({
  name: 'security_events_total',
  help: 'Total number of security events',
  labelNames: ['event_type', 'severity', 'source']
});

const verificationRequests = new promClient.Counter({
  name: 'verification_requests_total',
  help: 'Total number of verification requests',
  labelNames: ['type', 'status', 'risk_level']
});

const anomaliesDetected = new promClient.Counter({
  name: 'anomalies_detected_total',
  help: 'Total number of anomalies detected',
  labelNames: ['type', 'severity', 'action_taken']
});

// Initialize Zero Trust Security Services
let services = {};

async function initializeServices() {
  try {
    logger.info('Initializing Zero Trust Security Services...');

    services = {
      continuousVerification: new ContinuousVerificationService(),
      anomalyDetection: new AnomalyDetectionService(),
      adaptiveAuthentication: new AdaptiveAuthenticationService(),
      securityMonitoring: new SecurityMonitoringService(),
      threatIntelligence: new ThreatIntelligenceService(),
      policyEnforcement: new PolicyEnforcementService(),
      riskAssessment: new RiskAssessmentService(),
      deviceCompliance: new DeviceComplianceService(),
      accessControl: new AccessControlService(),
      auditLogging: new AuditLoggingService()
    };

    // Initialize all services
    await Promise.all(Object.values(services).map(service => service.initialize()));

    logger.info('All Zero Trust Security Services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    throw error;
  }
}

// Enhanced security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: true,
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: "no-referrer" },
  xssFilter: true
}));

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Device-ID', 'X-Risk-Token']
}));

// Compression and parsing middleware
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Enhanced rate limiting with adaptive thresholds
const createRateLimit = (windowMs, max, message) => rateLimit({
  windowMs,
  max: (req) => {
    // Adaptive rate limiting based on user trust score
    const trustScore = req.headers['x-trust-score'] || '0.5';
    const multiplier = Math.max(0.5, Math.min(2.0, parseFloat(trustScore)));
    return Math.floor(max * multiplier);
  },
  message: { error: message },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    securityEvents.inc({ event_type: 'rate_limit', severity: 'warning', source: 'api' });
    logger.warn(`Rate limit exceeded for IP ${req.ip}`, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      endpoint: req.path
    });
    res.status(429).json({ error: message });
  }
});

app.use('/api/', createRateLimit(15 * 60 * 1000, 1000, 'Too many requests'));
app.use('/api/auth/', createRateLimit(15 * 60 * 1000, 100, 'Too many auth requests'));
app.use('/api/verify/', createRateLimit(1 * 60 * 1000, 50, 'Too many verification requests'));

// Slow down middleware for additional protection
app.use('/api/', slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 500,
  delayMs: 500,
  maxDelayMs: 20000
}));

// Request logging with security context
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Request tracking and metrics middleware
app.use((req, res, next) => {
  const start = Date.now();
  req.id = uuidv4();
  req.startTime = start;
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);
  });
  
  next();
});

// Security context middleware
app.use(async (req, res, next) => {
  try {
    // Extract device and context information
    req.securityContext = {
      deviceId: req.headers['x-device-id'] || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      ip: req.ip || req.connection.remoteAddress,
      timestamp: new Date().toISOString(),
      requestId: req.id,
      riskLevel: 'unknown'
    };

    // Perform initial risk assessment
    if (services.riskAssessment) {
      const riskAssessment = await services.riskAssessment.assessRequest(req.securityContext);
      req.securityContext.riskLevel = riskAssessment.level;
      req.securityContext.riskScore = riskAssessment.score;
      req.securityContext.riskFactors = riskAssessment.factors;
    }

    next();
  } catch (error) {
    logger.error('Security context middleware error:', error);
    next();
  }
});

// Swagger API documentation
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PersonaPass Zero Trust Security API',
      version: '1.0.0',
      description: 'Enterprise Zero Trust Security Architecture with continuous verification, AI anomaly detection, and adaptive authentication',
      contact: {
        name: 'PersonaPass Security Team',
        email: 'security@personapass.io'
      }
    },
    servers: [
      {
        url: `http://localhost:${PORT}/api/${API_VERSION}`,
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        deviceAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Device-ID'
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./routes/*.js', './server.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API Routes

/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [System]
 *     responses:
 *       200:
 *         description: System is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                 services:
 *                   type: object
 */
app.get(`/api/${API_VERSION}/health`, async (req, res) => {
  try {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {}
    };

    // Check service health
    for (const [name, service] of Object.entries(services)) {
      try {
        const serviceHealth = await service.healthCheck();
        healthStatus.services[name] = serviceHealth;
      } catch (error) {
        healthStatus.services[name] = { status: 'unhealthy', error: error.message };
        healthStatus.status = 'degraded';
      }
    }

    res.json(healthStatus);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v1/security/verify:
 *   post:
 *     summary: Continuous verification endpoint
 *     tags: [Security]
 *     security:
 *       - bearerAuth: []
 *       - deviceAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               context:
 *                 type: object
 *               biometrics:
 *                 type: object
 *     responses:
 *       200:
 *         description: Verification result
 *       401:
 *         description: Verification failed
 */
app.post(`/api/${API_VERSION}/security/verify`, async (req, res) => {
  try {
    const { userId, context, biometrics, credentials } = req.body;
    
    verificationRequests.inc({ 
      type: 'continuous', 
      status: 'initiated', 
      risk_level: req.securityContext.riskLevel 
    });

    // Perform continuous verification
    const verificationResult = await services.continuousVerification.verify({
      userId,
      context: { ...context, ...req.securityContext },
      biometrics,
      credentials,
      riskAssessment: req.securityContext
    });

    // Log security event
    await services.auditLogging.logSecurityEvent({
      type: 'verification',
      userId,
      result: verificationResult.status,
      riskScore: verificationResult.riskScore,
      context: req.securityContext,
      timestamp: new Date().toISOString()
    });

    verificationRequests.inc({ 
      type: 'continuous', 
      status: verificationResult.status, 
      risk_level: verificationResult.riskLevel 
    });

    if (verificationResult.status === 'verified') {
      res.json({
        status: 'verified',
        trustScore: verificationResult.trustScore,
        accessLevel: verificationResult.accessLevel,
        expiresAt: verificationResult.expiresAt,
        requirements: verificationResult.additionalRequirements
      });
    } else {
      res.status(401).json({
        status: 'denied',
        reason: verificationResult.reason,
        challenges: verificationResult.challenges,
        retryAfter: verificationResult.retryAfter
      });
    }
  } catch (error) {
    logger.error('Verification error:', error);
    verificationRequests.inc({ type: 'continuous', status: 'error', risk_level: 'high' });
    res.status(500).json({ error: 'Verification service error' });
  }
});

/**
 * @swagger
 * /api/v1/security/anomaly/detect:
 *   post:
 *     summary: AI-powered anomaly detection
 *     tags: [Security]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               behavior:
 *                 type: object
 *               context:
 *                 type: object
 *     responses:
 *       200:
 *         description: Anomaly detection result
 */
app.post(`/api/${API_VERSION}/security/anomaly/detect`, async (req, res) => {
  try {
    const { userId, behavior, context } = req.body;
    
    // Perform AI-powered anomaly detection
    const anomalyResult = await services.anomalyDetection.detectAnomalies({
      userId,
      behavior,
      context: { ...context, ...req.securityContext }
    });

    if (anomalyResult.anomaliesDetected.length > 0) {
      anomaliesDetected.inc({ 
        type: 'behavioral', 
        severity: anomalyResult.severity, 
        action_taken: anomalyResult.actionTaken 
      });

      // Log anomaly detection
      await services.auditLogging.logSecurityEvent({
        type: 'anomaly_detected',
        userId,
        anomalies: anomalyResult.anomaliesDetected,
        severity: anomalyResult.severity,
        context: req.securityContext,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      anomaliesDetected: anomalyResult.anomaliesDetected,
      riskScore: anomalyResult.riskScore,
      severity: anomalyResult.severity,
      recommendedActions: anomalyResult.recommendedActions,
      confidence: anomalyResult.confidence
    });
  } catch (error) {
    logger.error('Anomaly detection error:', error);
    res.status(500).json({ error: 'Anomaly detection service error' });
  }
});

/**
 * @swagger
 * /api/v1/security/auth/adaptive:
 *   post:
 *     summary: Adaptive authentication based on risk assessment
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               credentials:
 *                 type: object
 *               context:
 *                 type: object
 *     responses:
 *       200:
 *         description: Authentication result with adaptive requirements
 */
app.post(`/api/${API_VERSION}/security/auth/adaptive`, async (req, res) => {
  try {
    const { credentials, context } = req.body;
    
    // Perform adaptive authentication
    const authResult = await services.adaptiveAuthentication.authenticate({
      credentials,
      context: { ...context, ...req.securityContext },
      riskAssessment: req.securityContext
    });

    // Log authentication attempt
    await services.auditLogging.logSecurityEvent({
      type: 'authentication',
      result: authResult.status,
      method: authResult.method,
      riskScore: authResult.riskScore,
      context: req.securityContext,
      timestamp: new Date().toISOString()
    });

    if (authResult.status === 'authenticated') {
      res.json({
        status: 'authenticated',
        token: authResult.token,
        expiresAt: authResult.expiresAt,
        trustScore: authResult.trustScore,
        accessLevel: authResult.accessLevel
      });
    } else if (authResult.status === 'challenge_required') {
      res.status(202).json({
        status: 'challenge_required',
        challenges: authResult.challenges,
        challengeId: authResult.challengeId,
        expiresAt: authResult.expiresAt
      });
    } else {
      res.status(401).json({
        status: 'denied',
        reason: authResult.reason,
        retryAfter: authResult.retryAfter
      });
    }
  } catch (error) {
    logger.error('Adaptive authentication error:', error);
    res.status(500).json({ error: 'Authentication service error' });
  }
});

/**
 * @swagger
 * /api/v1/security/policy/enforce:
 *   post:
 *     summary: Enforce security policy based on context
 *     tags: [Policy]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *               resource:
 *                 type: string
 *               context:
 *                 type: object
 *     responses:
 *       200:
 *         description: Policy enforcement result
 */
app.post(`/api/${API_VERSION}/security/policy/enforce`, async (req, res) => {
  try {
    const { action, resource, context } = req.body;
    
    // Enforce security policy
    const policyResult = await services.policyEnforcement.enforcePolicy({
      action,
      resource,
      context: { ...context, ...req.securityContext },
      riskAssessment: req.securityContext
    });

    // Log policy enforcement
    await services.auditLogging.logSecurityEvent({
      type: 'policy_enforcement',
      action,
      resource,
      result: policyResult.decision,
      reason: policyResult.reason,
      context: req.securityContext,
      timestamp: new Date().toISOString()
    });

    res.json({
      decision: policyResult.decision,
      reason: policyResult.reason,
      requirements: policyResult.requirements,
      expiresAt: policyResult.expiresAt
    });
  } catch (error) {
    logger.error('Policy enforcement error:', error);
    res.status(500).json({ error: 'Policy enforcement service error' });
  }
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', promClient.register.contentType);
    res.end(await promClient.register.metrics());
  } catch (error) {
    logger.error('Metrics endpoint error:', error);
    res.status(500).end();
  }
});

// WebSocket connections for real-time security monitoring
io.on('connection', (socket) => {
  logger.info(`Security monitoring client connected: ${socket.id}`);
  
  socket.on('subscribe_security_feed', (data) => {
    socket.join('security_feed');
    logger.info(`Client ${socket.id} subscribed to security feed`);
  });
  
  socket.on('disconnect', () => {
    logger.info(`Security monitoring client disconnected: ${socket.id}`);
  });
});

// Broadcast security events to connected clients
function broadcastSecurityEvent(event) {
  io.to('security_feed').emit('security_event', {
    ...event,
    timestamp: new Date().toISOString()
  });
}

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    requestId: req.id,
    url: req.url,
    method: req.method
  });

  if (res.headersSent) {
    return next(error);
  }

  res.status(error.status || 500).json({
    error: NODE_ENV === 'production' ? 'Internal server error' : error.message,
    requestId: req.id
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, starting graceful shutdown...');
  
  server.close(async () => {
    logger.info('HTTP server closed');
    
    // Close all services
    for (const [name, service] of Object.entries(services)) {
      try {
        await service.shutdown();
        logger.info(`${name} service shutdown complete`);
      } catch (error) {
        logger.error(`Error shutting down ${name} service:`, error);
      }
    }
    
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, starting graceful shutdown...');
  process.emit('SIGTERM');
});

// Start server
async function startServer() {
  try {
    await initializeServices();
    
    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`🛡️  PersonaPass Zero Trust Security Architecture server running on port ${PORT}`);
      logger.info(`📚 API documentation: http://localhost:${PORT}/api-docs`);
      logger.info(`📊 Metrics: http://localhost:${PORT}/metrics`);
      logger.info(`🌍 Environment: ${NODE_ENV}`);
      logger.info(`🔒 Zero Trust Security Services initialized and ready`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;