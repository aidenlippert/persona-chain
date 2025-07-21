/**
 * Multi-Tenant Enterprise Platform Server
 * Comprehensive SaaS platform with tenant isolation, custom branding, usage analytics, and billing integration
 * Production-ready enterprise platform with advanced multi-tenancy capabilities
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { DateTime } from 'luxon';
import crypto from 'crypto';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import NodeCache from 'node-cache';
import Redis from 'ioredis';
import chalk from 'chalk';
import figlet from 'figlet';
import { promisify } from 'util';
import cluster from 'cluster';
import os from 'os';

// Import all services
import TenantManagementService from './services/TenantManagementService.js';
import TenantIsolationService from './services/TenantIsolationService.js';
import CustomBrandingService from './services/CustomBrandingService.js';
import UsageAnalyticsService from './services/UsageAnalyticsService.js';
import BillingIntegrationService from './services/BillingIntegrationService.js';
import TenantOnboardingService from './services/TenantOnboardingService.js';
import FeatureToggleService from './services/FeatureToggleService.js';
import TenantConfigurationService from './services/TenantConfigurationService.js';
import MultiTenantAuthService from './services/MultiTenantAuthService.js';
import TenantMonitoringService from './services/TenantMonitoringService.js';

class MultiTenantPlatformServer {
  constructor() {
    this.app = express();
    this.server = null;
    this.io = null;
    this.cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });
    this.redis = null;
    this.logger = null;
    this.services = {};
    this.config = {
      port: process.env.PORT || 3000,
      host: process.env.HOST || '0.0.0.0',
      nodeEnv: process.env.NODE_ENV || 'development',
      redisUrl: process.env.REDIS_URL,
      mongoUrl: process.env.MONGO_URL,
      postgresUrl: process.env.POSTGRES_URL,
      clustered: process.env.CLUSTERED === 'true',
      workers: parseInt(process.env.WORKERS) || os.cpus().length
    };

    this.initializeLogger();
    this.printStartupBanner();
  }

  initializeLogger() {
    const logFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.prettyPrint()
    );

    this.logger = winston.createLogger({
      level: this.config.nodeEnv === 'production' ? 'info' : 'debug',
      format: logFormat,
      defaultMeta: { 
        service: 'multi-tenant-platform',
        version: '1.0.0',
        environment: this.config.nodeEnv,
        process: process.pid
      },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        new DailyRotateFile({
          filename: 'logs/multi-tenant-platform-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxFiles: '30d',
          maxSize: '100m'
        }),
        new DailyRotateFile({
          level: 'error',
          filename: 'logs/multi-tenant-platform-error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxFiles: '30d',
          maxSize: '100m'
        })
      ]
    });
  }

  printStartupBanner() {
    console.log(chalk.cyan(figlet.textSync('Multi-Tenant Platform', { 
      font: 'Standard',
      horizontalLayout: 'default',
      verticalLayout: 'default'
    })));
    
    console.log(chalk.green('🏢 Enterprise Multi-Tenant Platform'));
    console.log(chalk.yellow('⚡ Production-Ready SaaS Infrastructure'));
    console.log(chalk.blue('🔐 Advanced Tenant Isolation & Security'));
    console.log(chalk.magenta('📊 Real-time Analytics & Monitoring'));
    console.log(chalk.cyan('💳 Integrated Billing & Subscription Management'));
    console.log(chalk.white('━'.repeat(80)));
  }

  async initializeRedis() {
    if (this.config.redisUrl) {
      try {
        this.redis = new Redis(this.config.redisUrl, {
          retryDelayOnFailover: 100,
          enableReadyCheck: true,
          maxRetriesPerRequest: 3,
          lazyConnect: true
        });

        this.redis.on('connect', () => {
          this.logger.info('Redis connection established');
        });

        this.redis.on('error', (err) => {
          this.logger.error('Redis connection error:', err);
        });

        await this.redis.ping();
        this.logger.info('Redis ping successful');
      } catch (error) {
        this.logger.error('Failed to initialize Redis:', error);
        this.redis = null;
      }
    }
  }

  async initializeServices() {
    try {
      this.logger.info('Initializing multi-tenant platform services...');

      // Initialize all services
      this.services = {
        tenantManagement: new TenantManagementService(),
        tenantIsolation: new TenantIsolationService(),
        customBranding: new CustomBrandingService(),
        usageAnalytics: new UsageAnalyticsService(),
        billingIntegration: new BillingIntegrationService(),
        tenantOnboarding: new TenantOnboardingService(),
        featureToggle: new FeatureToggleService(),
        tenantConfiguration: new TenantConfigurationService(),
        multiTenantAuth: new MultiTenantAuthService(),
        tenantMonitoring: new TenantMonitoringService()
      };

      // Initialize services in dependency order
      const initOrder = [
        'tenantManagement',
        'tenantIsolation',
        'multiTenantAuth',
        'tenantConfiguration',
        'featureToggle',
        'customBranding',
        'usageAnalytics',
        'billingIntegration',
        'tenantOnboarding',
        'tenantMonitoring'
      ];

      for (const serviceName of initOrder) {
        const service = this.services[serviceName];
        if (service && typeof service.initialize === 'function') {
          await service.initialize();
          this.logger.info(`✓ ${serviceName} service initialized`);
        }
      }

      this.logger.info('All services initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize services:', error);
      throw error;
    }
  }

  configureMiddleware() {
    // Security middleware
    this.app.use(helmet({
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
          frameSrc: ["'none'"]
        }
      },
      crossOriginEmbedderPolicy: false
    }));

    // CORS configuration
    this.app.use(cors({
      origin: this.config.nodeEnv === 'production' 
        ? process.env.ALLOWED_ORIGINS?.split(',') || false
        : true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-API-Key']
    }));

    // Rate limiting
    this.app.use(rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: this.config.nodeEnv === 'production' ? 1000 : 10000,
      message: {
        error: 'Too many requests from this IP',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false
    }));

    // Compression and parsing
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        this.logger.info('Request processed', {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
          tenantId: req.headers['x-tenant-id']
        });
      });

      next();
    });

    // Tenant context middleware
    this.app.use(async (req, res, next) => {
      try {
        const tenantId = req.headers['x-tenant-id'];
        if (tenantId && this.services.tenantManagement) {
          const tenant = await this.services.tenantManagement.getTenant(tenantId);
          if (tenant) {
            req.tenant = tenant;
            req.tenantId = tenantId;
          }
        }
        next();
      } catch (error) {
        this.logger.error('Error in tenant context middleware:', error);
        next();
      }
    });
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        const health = {
          status: 'healthy',
          timestamp: DateTime.now().toISO(),
          version: '1.0.0',
          environment: this.config.nodeEnv,
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          services: {}
        };

        // Check service health
        for (const [name, service] of Object.entries(this.services)) {
          if (service && typeof service.healthCheck === 'function') {
            try {
              const serviceHealth = await service.healthCheck();
              health.services[name] = serviceHealth;
            } catch (error) {
              health.services[name] = {
                status: 'unhealthy',
                error: error.message
              };
              health.status = 'degraded';
            }
          }
        }

        // Check Redis connectivity
        if (this.redis) {
          try {
            await this.redis.ping();
            health.redis = { status: 'connected' };
          } catch (error) {
            health.redis = { status: 'disconnected', error: error.message };
            health.status = 'degraded';
          }
        }

        res.status(health.status === 'healthy' ? 200 : 503).json(health);
      } catch (error) {
        this.logger.error('Health check failed:', error);
        res.status(503).json({
          status: 'unhealthy',
          error: error.message,
          timestamp: DateTime.now().toISO()
        });
      }
    });

    // Metrics endpoint for monitoring
    this.app.get('/metrics', async (req, res) => {
      try {
        const metrics = {
          timestamp: DateTime.now().toISO(),
          system: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage()
          },
          cache: {
            keys: this.cache.keys().length,
            stats: this.cache.getStats()
          },
          services: {}
        };

        // Collect service metrics
        for (const [name, service] of Object.entries(this.services)) {
          if (service && typeof service.getMetrics === 'function') {
            try {
              metrics.services[name] = await service.getMetrics();
            } catch (error) {
              metrics.services[name] = { error: error.message };
            }
          }
        }

        res.json(metrics);
      } catch (error) {
        this.logger.error('Failed to collect metrics:', error);
        res.status(500).json({ error: 'Failed to collect metrics' });
      }
    });

    // API v1 Routes
    const apiV1 = express.Router();
    
    // Tenant Management API
    apiV1.use('/tenants', this.createServiceRouter('tenantManagement', [
      { method: 'POST', path: '/', handler: 'createTenant' },
      { method: 'GET', path: '/', handler: 'listTenants' },
      { method: 'GET', path: '/:tenantId', handler: 'getTenant' },
      { method: 'PUT', path: '/:tenantId', handler: 'updateTenant' },
      { method: 'DELETE', path: '/:tenantId', handler: 'deleteTenant' },
      { method: 'POST', path: '/:tenantId/suspend', handler: 'suspendTenant' },
      { method: 'POST', path: '/:tenantId/activate', handler: 'activateTenant' },
      { method: 'GET', path: '/:tenantId/status', handler: 'getTenantStatus' }
    ]));

    // Tenant Isolation API
    apiV1.use('/isolation', this.createServiceRouter('tenantIsolation', [
      { method: 'POST', path: '/database/:tenantId', handler: 'createTenantDatabase' },
      { method: 'GET', path: '/database/:tenantId', handler: 'getTenantDatabase' },
      { method: 'POST', path: '/namespace/:tenantId', handler: 'createTenantNamespace' },
      { method: 'GET', path: '/access/:tenantId', handler: 'verifyTenantAccess' },
      { method: 'POST', path: '/migrate/:tenantId', handler: 'migrateTenantData' }
    ]));

    // Custom Branding API
    apiV1.use('/branding', this.createServiceRouter('customBranding', [
      { method: 'POST', path: '/:tenantId', handler: 'setBranding' },
      { method: 'GET', path: '/:tenantId', handler: 'getBranding' },
      { method: 'PUT', path: '/:tenantId', handler: 'updateBranding' },
      { method: 'DELETE', path: '/:tenantId', handler: 'removeBranding' },
      { method: 'POST', path: '/:tenantId/logo', handler: 'uploadLogo' },
      { method: 'POST', path: '/:tenantId/theme', handler: 'setTheme' },
      { method: 'GET', path: '/:tenantId/preview', handler: 'previewBranding' }
    ]));

    // Usage Analytics API
    apiV1.use('/analytics', this.createServiceRouter('usageAnalytics', [
      { method: 'POST', path: '/events', handler: 'trackEvent' },
      { method: 'GET', path: '/:tenantId/dashboard', handler: 'getTenantDashboard' },
      { method: 'GET', path: '/:tenantId/usage', handler: 'getUsageMetrics' },
      { method: 'GET', path: '/:tenantId/reports', handler: 'generateReport' },
      { method: 'POST', path: '/:tenantId/alerts', handler: 'createAlert' },
      { method: 'GET', path: '/global/dashboard', handler: 'getGlobalDashboard' }
    ]));

    // Billing Integration API
    apiV1.use('/billing', this.createServiceRouter('billingIntegration', [
      { method: 'POST', path: '/:tenantId/subscription', handler: 'createSubscription' },
      { method: 'GET', path: '/:tenantId/subscription', handler: 'getSubscription' },
      { method: 'PUT', path: '/:tenantId/subscription', handler: 'updateSubscription' },
      { method: 'POST', path: '/:tenantId/invoice', handler: 'generateInvoice' },
      { method: 'GET', path: '/:tenantId/invoices', handler: 'getInvoices' },
      { method: 'POST', path: '/:tenantId/payment', handler: 'processPayment' },
      { method: 'GET', path: '/:tenantId/usage-charges', handler: 'calculateUsageCharges' }
    ]));

    // Tenant Onboarding API
    apiV1.use('/onboarding', this.createServiceRouter('tenantOnboarding', [
      { method: 'POST', path: '/initiate', handler: 'initiateOnboarding' },
      { method: 'GET', path: '/:onboardingId/status', handler: 'getOnboardingStatus' },
      { method: 'POST', path: '/:onboardingId/complete', handler: 'completeOnboarding' },
      { method: 'GET', path: '/templates', handler: 'getOnboardingTemplates' }
    ]));

    // Feature Toggle API
    apiV1.use('/features', this.createServiceRouter('featureToggle', [
      { method: 'GET', path: '/:tenantId', handler: 'getTenantFeatures' },
      { method: 'POST', path: '/:tenantId/toggle', handler: 'toggleFeature' },
      { method: 'PUT', path: '/:tenantId/flags', handler: 'updateFeatureFlags' },
      { method: 'GET', path: '/global/flags', handler: 'getGlobalFeatures' }
    ]));

    // Configuration API
    apiV1.use('/config', this.createServiceRouter('tenantConfiguration', [
      { method: 'GET', path: '/:tenantId', handler: 'getTenantConfig' },
      { method: 'PUT', path: '/:tenantId', handler: 'updateTenantConfig' },
      { method: 'POST', path: '/:tenantId/validate', handler: 'validateConfig' },
      { method: 'GET', path: '/:tenantId/schema', handler: 'getConfigSchema' }
    ]));

    // Authentication API
    apiV1.use('/auth', this.createServiceRouter('multiTenantAuth', [
      { method: 'POST', path: '/login', handler: 'authenticateUser' },
      { method: 'POST', path: '/logout', handler: 'logoutUser' },
      { method: 'POST', path: '/refresh', handler: 'refreshToken' },
      { method: 'GET', path: '/me', handler: 'getCurrentUser' },
      { method: 'POST', path: '/sso/:tenantId', handler: 'initiateSSOLogin' }
    ]));

    // Monitoring API
    apiV1.use('/monitoring', this.createServiceRouter('tenantMonitoring', [
      { method: 'GET', path: '/:tenantId/health', handler: 'getTenantHealth' },
      { method: 'GET', path: '/:tenantId/metrics', handler: 'getTenantMetrics' },
      { method: 'POST', path: '/:tenantId/alerts', handler: 'createMonitoringAlert' },
      { method: 'GET', path: '/global/overview', handler: 'getGlobalOverview' }
    ]));

    this.app.use('/api/v1', apiV1);

    // WebSocket events for real-time updates
    if (this.io) {
      this.setupWebSocketHandlers();
    }

    // Static file serving for tenant assets
    this.app.use('/assets/:tenantId', async (req, res, next) => {
      try {
        const { tenantId } = req.params;
        
        // Verify tenant access
        if (this.services.tenantIsolation) {
          const hasAccess = await this.services.tenantIsolation.verifyTenantAccess(tenantId, req);
          if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied' });
          }
        }

        // Serve tenant-specific assets
        express.static(`assets/${tenantId}`)(req, res, next);
      } catch (error) {
        this.logger.error('Error serving tenant assets:', error);
        res.status(500).json({ error: 'Failed to serve assets' });
      }
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: 'The requested resource was not found',
        path: req.originalUrl,
        timestamp: DateTime.now().toISO()
      });
    });

    // Global error handler
    this.app.use((error, req, res, next) => {
      this.logger.error('Unhandled error:', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        tenantId: req.tenantId
      });

      res.status(error.status || 500).json({
        error: this.config.nodeEnv === 'production' ? 'Internal Server Error' : error.message,
        timestamp: DateTime.now().toISO(),
        ...(this.config.nodeEnv !== 'production' && { stack: error.stack })
      });
    });
  }

  createServiceRouter(serviceName, routes) {
    const router = express.Router();
    const service = this.services[serviceName];

    if (!service) {
      this.logger.error(`Service ${serviceName} not found`);
      return router;
    }

    routes.forEach(({ method, path, handler }) => {
      router[method.toLowerCase()](path, async (req, res) => {
        try {
          if (typeof service[handler] !== 'function') {
            return res.status(501).json({ error: `Handler ${handler} not implemented` });
          }

          const result = await service[handler](req.params, req.body, req.query, req);
          res.json(result);
        } catch (error) {
          this.logger.error(`Error in ${serviceName}.${handler}:`, error);
          res.status(error.status || 500).json({
            error: error.message || 'Internal server error',
            service: serviceName,
            handler
          });
        }
      });
    });

    return router;
  }

  setupWebSocketHandlers() {
    this.io.on('connection', (socket) => {
      this.logger.info('Client connected', { socketId: socket.id });

      // Tenant-specific room joining
      socket.on('join-tenant', async (tenantId) => {
        try {
          // Verify tenant access
          if (this.services.tenantIsolation) {
            const hasAccess = await this.services.tenantIsolation.verifyTenantAccess(tenantId, socket.request);
            if (!hasAccess) {
              socket.emit('error', { message: 'Access denied' });
              return;
            }
          }

          socket.join(`tenant:${tenantId}`);
          socket.tenantId = tenantId;
          
          this.logger.info('Client joined tenant room', { 
            socketId: socket.id, 
            tenantId 
          });

          // Send initial tenant data
          if (this.services.tenantMonitoring) {
            const metrics = await this.services.tenantMonitoring.getTenantMetrics({ tenantId });
            socket.emit('tenant-metrics', metrics);
          }
        } catch (error) {
          this.logger.error('Error joining tenant room:', error);
          socket.emit('error', { message: 'Failed to join tenant room' });
        }
      });

      // Real-time analytics updates
      socket.on('subscribe-analytics', (tenantId) => {
        socket.join(`analytics:${tenantId}`);
      });

      // Billing notifications
      socket.on('subscribe-billing', (tenantId) => {
        socket.join(`billing:${tenantId}`);
      });

      socket.on('disconnect', () => {
        this.logger.info('Client disconnected', { socketId: socket.id });
      });
    });

    // Set up periodic broadcasts
    setInterval(async () => {
      try {
        if (this.services.tenantMonitoring) {
          const overview = await this.services.tenantMonitoring.getGlobalOverview();
          this.io.emit('global-metrics', overview);
        }
      } catch (error) {
        this.logger.error('Error broadcasting global metrics:', error);
      }
    }, 30000); // Every 30 seconds
  }

  async start() {
    try {
      if (this.config.clustered && cluster.isPrimary) {
        this.logger.info(`Starting ${this.config.workers} workers...`);
        
        for (let i = 0; i < this.config.workers; i++) {
          cluster.fork();
        }

        cluster.on('exit', (worker, code, signal) => {
          this.logger.warn(`Worker ${worker.process.pid} died. Restarting...`);
          cluster.fork();
        });

        return;
      }

      await this.initializeRedis();
      await this.initializeServices();
      
      this.configureMiddleware();
      this.setupRoutes();

      // Create HTTP server
      this.server = createServer(this.app);

      // Initialize Socket.IO
      this.io = new SocketIOServer(this.server, {
        cors: {
          origin: this.config.nodeEnv === 'production' 
            ? process.env.ALLOWED_ORIGINS?.split(',') || false
            : true,
          credentials: true
        },
        transports: ['websocket', 'polling']
      });

      this.setupWebSocketHandlers();

      // Start server
      this.server.listen(this.config.port, this.config.host, () => {
        this.logger.info(`🚀 Multi-Tenant Platform server started`, {
          port: this.config.port,
          host: this.config.host,
          environment: this.config.nodeEnv,
          workers: this.config.clustered ? this.config.workers : 1,
          pid: process.pid
        });

        this.logger.info('🌐 Server URLs:', {
          local: `http://localhost:${this.config.port}`,
          health: `http://localhost:${this.config.port}/health`,
          metrics: `http://localhost:${this.config.port}/metrics`,
          api: `http://localhost:${this.config.port}/api/v1`
        });
      });

      // Graceful shutdown handling
      process.on('SIGTERM', () => this.shutdown('SIGTERM'));
      process.on('SIGINT', () => this.shutdown('SIGINT'));
      process.on('uncaughtException', (error) => {
        this.logger.error('Uncaught exception:', error);
        this.shutdown('uncaughtException');
      });
      process.on('unhandledRejection', (reason, promise) => {
        this.logger.error('Unhandled rejection:', { reason, promise });
      });

    } catch (error) {
      this.logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  async shutdown(signal) {
    this.logger.info(`Received ${signal}. Starting graceful shutdown...`);

    try {
      // Stop accepting new connections
      if (this.server) {
        this.server.close(() => {
          this.logger.info('HTTP server closed');
        });
      }

      // Close WebSocket connections
      if (this.io) {
        this.io.close(() => {
          this.logger.info('WebSocket server closed');
        });
      }

      // Shutdown services
      for (const [name, service] of Object.entries(this.services)) {
        if (service && typeof service.shutdown === 'function') {
          try {
            await service.shutdown();
            this.logger.info(`${name} service shutdown complete`);
          } catch (error) {
            this.logger.error(`Error shutting down ${name} service:`, error);
          }
        }
      }

      // Close Redis connection
      if (this.redis) {
        await this.redis.quit();
        this.logger.info('Redis connection closed');
      }

      // Clear cache
      this.cache.flushAll();

      this.logger.info('Graceful shutdown complete');
      process.exit(0);
    } catch (error) {
      this.logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Start the server
const server = new MultiTenantPlatformServer();
server.start().catch((error) => {
  console.error('Failed to start Multi-Tenant Platform server:', error);
  process.exit(1);
});

export default MultiTenantPlatformServer;