/**
 * PersonaPass Compliance Automation Framework Server
 * Enterprise compliance automation with SOC 2, GDPR, HIPAA, ISO 27001, PCI DSS, FedRAMP
 * Real-time monitoring, automated assessments, and comprehensive reporting
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

// Import Compliance Services
import ComplianceFrameworkService from './services/ComplianceFrameworkService.js';
import RegulatoryMonitoringService from './services/RegulatoryMonitoringService.js';
import AutomatedAssessmentService from './services/AutomatedAssessmentService.js';
import ComplianceReportingService from './services/ComplianceReportingService.js';
import PolicyManagementService from './services/PolicyManagementService.js';
import ControlTestingService from './services/ControlTestingService.js';
import RiskManagementService from './services/RiskManagementService.js';
import EvidenceCollectionService from './services/EvidenceCollectionService.js';
import CertificationService from './services/CertificationService.js';
import ComplianceDashboardService from './services/ComplianceDashboardService.js';

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
const PORT = process.env.PORT || 3010;
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
  defaultMeta: { service: 'compliance-automation' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new DailyRotateFile({
      filename: 'logs/compliance-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true
    }),
    new DailyRotateFile({
      filename: 'logs/compliance-error-%DATE%.log',
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

const complianceAssessments = new promClient.Counter({
  name: 'compliance_assessments_total',
  help: 'Total number of compliance assessments',
  labelNames: ['framework', 'type', 'status', 'score_range']
});

const complianceViolations = new promClient.Counter({
  name: 'compliance_violations_total',
  help: 'Total number of compliance violations',
  labelNames: ['framework', 'severity', 'control_family', 'remediation_status']
});

const complianceScore = new promClient.Gauge({
  name: 'compliance_score',
  help: 'Current compliance score by framework',
  labelNames: ['framework', 'control_family']
});

const regulatoryUpdates = new promClient.Counter({
  name: 'regulatory_updates_total',
  help: 'Total number of regulatory updates processed',
  labelNames: ['jurisdiction', 'framework', 'impact_level']
});

// Initialize Compliance Services
let services = {};

async function initializeServices() {
  try {
    logger.info('Initializing Compliance Automation Services...');

    services = {
      complianceFramework: new ComplianceFrameworkService(),
      regulatoryMonitoring: new RegulatoryMonitoringService(),
      automatedAssessment: new AutomatedAssessmentService(),
      complianceReporting: new ComplianceReportingService(),
      policyManagement: new PolicyManagementService(),
      controlTesting: new ControlTestingService(),
      riskManagement: new RiskManagementService(),
      evidenceCollection: new EvidenceCollectionService(),
      certification: new CertificationService(),
      complianceDashboard: new ComplianceDashboardService()
    };

    // Initialize all services
    await Promise.all(Object.values(services).map(service => service.initialize()));

    logger.info('All Compliance Automation Services initialized successfully');
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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Compliance-Framework', 'X-Assessment-ID']
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
  limit: '50mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Enhanced rate limiting with compliance-aware thresholds
const createRateLimit = (windowMs, max, message) => rateLimit({
  windowMs,
  max: (req) => {
    // Higher limits for compliance assessments
    const complianceEndpoints = ['/assessment', '/report', '/framework'];
    if (complianceEndpoints.some(endpoint => req.path.includes(endpoint))) {
      return Math.floor(max * 2);
    }
    return max;
  },
  message: { error: message },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP ${req.ip}`, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      endpoint: req.path
    });
    res.status(429).json({ error: message });
  }
});

app.use('/api/', createRateLimit(15 * 60 * 1000, 2000, 'Too many requests'));
app.use('/api/assessment/', createRateLimit(5 * 60 * 1000, 100, 'Too many assessment requests'));
app.use('/api/report/', createRateLimit(10 * 60 * 1000, 50, 'Too many report requests'));

// Slow down middleware for additional protection
app.use('/api/', slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 1000,
  delayMs: 500,
  maxDelayMs: 20000
}));

// Request logging with compliance context
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

// Compliance context middleware
app.use(async (req, res, next) => {
  try {
    req.complianceContext = {
      framework: req.headers['x-compliance-framework'] || 'general',
      assessmentId: req.headers['x-assessment-id'],
      timestamp: new Date().toISOString(),
      requestId: req.id,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    };

    next();
  } catch (error) {
    logger.error('Compliance context middleware error:', error);
    next();
  }
});

// Swagger API documentation
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PersonaPass Compliance Automation API',
      version: '1.0.0',
      description: 'Enterprise Compliance Automation Framework with SOC 2, GDPR, HIPAA, ISO 27001, PCI DSS, FedRAMP real-time monitoring',
      contact: {
        name: 'PersonaPass Compliance Team',
        email: 'compliance@personapass.io'
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
        complianceAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Compliance-Framework'
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
 *                 frameworks:
 *                   type: array
 */
app.get(`/api/${API_VERSION}/health`, async (req, res) => {
  try {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {},
      frameworks: ['SOC2', 'GDPR', 'HIPAA', 'ISO27001', 'PCI_DSS', 'FedRAMP']
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
 * /api/v1/compliance/assessment:
 *   post:
 *     summary: Run comprehensive compliance assessment
 *     tags: [Assessment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               framework:
 *                 type: string
 *                 enum: [SOC2, GDPR, HIPAA, ISO27001, PCI_DSS, FedRAMP]
 *               scope:
 *                 type: object
 *               options:
 *                 type: object
 *     responses:
 *       200:
 *         description: Assessment completed successfully
 *       202:
 *         description: Assessment started, processing asynchronously
 */
app.post(`/api/${API_VERSION}/compliance/assessment`, async (req, res) => {
  try {
    const { framework, scope, options } = req.body;
    
    complianceAssessments.inc({ 
      framework: framework || 'unknown',
      type: 'full',
      status: 'initiated',
      score_range: 'pending'
    });

    // Run automated compliance assessment
    const assessmentResult = await services.automatedAssessment.runAssessment({
      framework,
      scope,
      options,
      context: req.complianceContext
    });

    // Update metrics with results
    complianceAssessments.inc({ 
      framework: framework || 'unknown',
      type: 'full',
      status: assessmentResult.status,
      score_range: getScoreRange(assessmentResult.overallScore)
    });

    complianceScore.set(
      { framework: framework || 'unknown', control_family: 'overall' },
      assessmentResult.overallScore
    );

    res.json({
      assessmentId: assessmentResult.assessmentId,
      framework,
      status: assessmentResult.status,
      overallScore: assessmentResult.overallScore,
      compliance: assessmentResult.compliance,
      violations: assessmentResult.violations,
      recommendations: assessmentResult.recommendations,
      completedAt: assessmentResult.completedAt,
      nextAssessment: assessmentResult.nextAssessment
    });

  } catch (error) {
    logger.error('Compliance assessment error:', error);
    complianceAssessments.inc({ 
      framework: req.body.framework || 'unknown',
      type: 'full',
      status: 'error',
      score_range: 'error'
    });
    res.status(500).json({ error: 'Assessment service error' });
  }
});

/**
 * @swagger
 * /api/v1/compliance/framework/{framework}/status:
 *   get:
 *     summary: Get current compliance status for a framework
 *     tags: [Framework]
 *     parameters:
 *       - in: path
 *         name: framework
 *         required: true
 *         schema:
 *           type: string
 *           enum: [SOC2, GDPR, HIPAA, ISO27001, PCI_DSS, FedRAMP]
 *     responses:
 *       200:
 *         description: Framework compliance status
 */
app.get(`/api/${API_VERSION}/compliance/framework/:framework/status`, async (req, res) => {
  try {
    const { framework } = req.params;
    
    // Get framework compliance status
    const status = await services.complianceFramework.getFrameworkStatus(framework);

    res.json({
      framework,
      status: status.status,
      overallScore: status.overallScore,
      lastAssessment: status.lastAssessment,
      nextAssessment: status.nextAssessment,
      controlFamilies: status.controlFamilies,
      violations: status.violations,
      trends: status.trends,
      certification: status.certification
    });

  } catch (error) {
    logger.error('Framework status error:', error);
    res.status(500).json({ error: 'Framework service error' });
  }
});

/**
 * @swagger
 * /api/v1/compliance/monitoring/regulatory:
 *   get:
 *     summary: Get regulatory monitoring status and updates
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Regulatory monitoring status
 */
app.get(`/api/${API_VERSION}/compliance/monitoring/regulatory`, async (req, res) => {
  try {
    // Get regulatory monitoring data
    const monitoring = await services.regulatoryMonitoring.getMonitoringStatus();

    res.json({
      status: monitoring.status,
      activeMonitoring: monitoring.activeMonitoring,
      recentUpdates: monitoring.recentUpdates,
      impactAssessments: monitoring.impactAssessments,
      alerts: monitoring.alerts,
      subscriptions: monitoring.subscriptions,
      coverage: monitoring.coverage
    });

  } catch (error) {
    logger.error('Regulatory monitoring error:', error);
    res.status(500).json({ error: 'Regulatory monitoring service error' });
  }
});

/**
 * @swagger
 * /api/v1/compliance/report/{framework}:
 *   get:
 *     summary: Generate comprehensive compliance report
 *     tags: [Reporting]
 *     parameters:
 *       - in: path
 *         name: framework
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, pdf, excel, csv]
 *           default: json
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, quarterly, annual]
 *           default: monthly
 *     responses:
 *       200:
 *         description: Compliance report generated
 */
app.get(`/api/${API_VERSION}/compliance/report/:framework`, async (req, res) => {
  try {
    const { framework } = req.params;
    const { format = 'json', period = 'monthly' } = req.query;

    // Generate compliance report
    const report = await services.complianceReporting.generateReport({
      framework,
      format,
      period,
      context: req.complianceContext
    });

    if (format === 'json') {
      res.json(report);
    } else {
      res.setHeader('Content-Type', getContentType(format));
      res.setHeader('Content-Disposition', `attachment; filename="compliance-report-${framework}-${period}.${format}"`);
      res.send(report.data);
    }

  } catch (error) {
    logger.error('Compliance reporting error:', error);
    res.status(500).json({ error: 'Reporting service error' });
  }
});

/**
 * @swagger
 * /api/v1/compliance/controls/test:
 *   post:
 *     summary: Run automated control testing
 *     tags: [Controls]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               framework:
 *                 type: string
 *               controls:
 *                 type: array
 *               options:
 *                 type: object
 *     responses:
 *       200:
 *         description: Control testing completed
 */
app.post(`/api/${API_VERSION}/compliance/controls/test`, async (req, res) => {
  try {
    const { framework, controls, options } = req.body;

    // Run control testing
    const testResults = await services.controlTesting.runControlTests({
      framework,
      controls,
      options,
      context: req.complianceContext
    });

    // Update violation metrics
    testResults.violations.forEach(violation => {
      complianceViolations.inc({
        framework: framework || 'unknown',
        severity: violation.severity,
        control_family: violation.controlFamily,
        remediation_status: violation.remediationStatus || 'open'
      });
    });

    res.json({
      testId: testResults.testId,
      framework,
      totalControls: testResults.totalControls,
      passedControls: testResults.passedControls,
      failedControls: testResults.failedControls,
      violations: testResults.violations,
      recommendations: testResults.recommendations,
      evidence: testResults.evidence,
      completedAt: testResults.completedAt
    });

  } catch (error) {
    logger.error('Control testing error:', error);
    res.status(500).json({ error: 'Control testing service error' });
  }
});

/**
 * @swagger
 * /api/v1/compliance/dashboard:
 *   get:
 *     summary: Get compliance dashboard data
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           default: 30d
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 */
app.get(`/api/${API_VERSION}/compliance/dashboard`, async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;

    // Get dashboard data
    const dashboardData = await services.complianceDashboard.getDashboardData({
      timeRange,
      context: req.complianceContext
    });

    res.json({
      summary: dashboardData.summary,
      frameworks: dashboardData.frameworks,
      trends: dashboardData.trends,
      alerts: dashboardData.alerts,
      recommendations: dashboardData.recommendations,
      upcomingDeadlines: dashboardData.upcomingDeadlines,
      recentActivity: dashboardData.recentActivity,
      compliance: dashboardData.compliance
    });

  } catch (error) {
    logger.error('Dashboard data error:', error);
    res.status(500).json({ error: 'Dashboard service error' });
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

// WebSocket connections for real-time compliance monitoring
io.on('connection', (socket) => {
  logger.info(`Compliance monitoring client connected: ${socket.id}`);
  
  socket.on('subscribe_compliance_feed', (data) => {
    socket.join('compliance_feed');
    socket.join(`framework_${data.framework}`);
    logger.info(`Client ${socket.id} subscribed to compliance feed for ${data.framework}`);
  });
  
  socket.on('subscribe_regulatory_updates', (data) => {
    socket.join('regulatory_updates');
    logger.info(`Client ${socket.id} subscribed to regulatory updates`);
  });
  
  socket.on('disconnect', () => {
    logger.info(`Compliance monitoring client disconnected: ${socket.id}`);
  });
});

// Broadcast compliance events to connected clients
function broadcastComplianceEvent(event) {
  io.to('compliance_feed').emit('compliance_event', {
    ...event,
    timestamp: new Date().toISOString()
  });
}

function broadcastRegulatoryUpdate(update) {
  io.to('regulatory_updates').emit('regulatory_update', {
    ...update,
    timestamp: new Date().toISOString()
  });
}

// Helper functions
function getScoreRange(score) {
  if (score >= 0.9) return 'excellent';
  if (score >= 0.8) return 'good';
  if (score >= 0.7) return 'satisfactory';
  if (score >= 0.6) return 'needs_improvement';
  return 'critical';
}

function getContentType(format) {
  const types = {
    pdf: 'application/pdf',
    excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    csv: 'text/csv'
  };
  return types[format] || 'application/octet-stream';
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
      logger.info(`🏛️  PersonaPass Compliance Automation Framework server running on port ${PORT}`);
      logger.info(`📚 API documentation: http://localhost:${PORT}/api-docs`);
      logger.info(`📊 Metrics: http://localhost:${PORT}/metrics`);
      logger.info(`🌍 Environment: ${NODE_ENV}`);
      logger.info(`⚖️  Compliance frameworks: SOC 2, GDPR, HIPAA, ISO 27001, PCI DSS, FedRAMP`);
      logger.info(`🔍 Real-time monitoring and automated assessments ready`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;