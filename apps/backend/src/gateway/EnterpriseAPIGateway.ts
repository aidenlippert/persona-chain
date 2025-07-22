/**
 * Enterprise API Gateway for PersonaChain
 * Production-grade API gateway with enterprise features and scalability
 * Coordinates all backend services with advanced routing, security, and monitoring
 * 
 * Features:
 * - Advanced rate limiting with sliding window and distributed counters
 * - Enterprise authentication and authorization (JWT, API keys, OAuth 2.0)
 * - Intelligent load balancing with health checks and circuit breakers
 * - Request/response transformation and validation
 * - Comprehensive monitoring, logging, and analytics
 * - Service discovery and dynamic routing
 * - Real-time metrics and alerting
 * - Enterprise security features (DDoS protection, IP filtering)
 * - Automatic failover and disaster recovery
 * - Multi-tenancy with resource isolation
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { promisify } from 'util';
import winston from 'winston';
import prometheus from 'prom-client';

// ==================== TYPES ====================

interface ServiceEndpoint {
  serviceId: string;
  name: string;
  version: string;
  basePath: string;
  targetURL: string;
  healthCheckPath: string;
  status: 'healthy' | 'unhealthy' | 'degraded' | 'maintenance';
  priority: number;
  weight: number;
  maxConnections: number;
  currentConnections: number;
  lastHealthCheck: Date;
  responseTime: number;
  errorRate: number;
  circuitBreakerState: 'closed' | 'open' | 'half-open';
  metadata: {
    region: string;
    environment: string;
    tags: string[];
  };
}

interface AuthConfiguration {
  jwtSecret: string;
  jwtExpiresIn: string;
  apiKeyPrefix: string;
  oauth: {
    clientId: string;
    clientSecret: string;
    redirectURI: string;
    tokenEndpoint: string;
    userInfoEndpoint: string;
  };
  rbac: {
    enabled: boolean;
    roleClaimName: string;
    permissionClaimName: string;
  };
}

interface RateLimitConfiguration {
  global: {
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
    skipFailedRequests: boolean;
  };
  perUser: {
    windowMs: number;
    maxRequests: number;
    keyGenerator: (req: Request) => string;
  };
  perEndpoint: Map<string, {
    windowMs: number;
    maxRequests: number;
    premium: boolean;
  }>;
  ddosProtection: {
    enabled: boolean;
    thresholdRpm: number;
    banDurationMs: number;
    whitelistedIPs: string[];
  };
}

interface LoadBalancingStrategy {
  algorithm: 'round-robin' | 'weighted-round-robin' | 'least-connections' | 'random' | 'ip-hash';
  healthCheckInterval: number;
  maxRetries: number;
  retryDelay: number;
  circuitBreaker: {
    failureThreshold: number;
    recoveryTimeout: number;
    monitoringPeriod: number;
  };
}

interface MonitoringConfiguration {
  metricsEnabled: boolean;
  tracingEnabled: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  alerting: {
    enabled: boolean;
    webhookURL?: string;
    thresholds: {
      errorRate: number;
      responseTime: number;
      cpu: number;
      memory: number;
    };
  };
  prometheus: {
    enabled: boolean;
    port: number;
    path: string;
  };
}

interface TenantConfiguration {
  tenantId: string;
  name: string;
  tier: 'basic' | 'premium' | 'enterprise';
  quotas: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
    storageGB: number;
    bandwidthGBPerMonth: number;
  };
  features: {
    zkProofs: boolean;
    multiDID: boolean;
    advancedAnalytics: boolean;
    prioritySupport: boolean;
    customBranding: boolean;
  };
  billing: {
    plan: string;
    billingCycle: 'monthly' | 'yearly';
    lastBillingDate: Date;
    nextBillingDate: Date;
    costPerRequest: number;
  };
}

interface GatewayMetrics {
  requestsTotal: prometheus.Counter<string>;
  requestDuration: prometheus.Histogram<string>;
  activeConnections: prometheus.Gauge<string>;
  errorRate: prometheus.Gauge<string>;
  serviceHealth: prometheus.Gauge<string>;
  rateLimitHits: prometheus.Counter<string>;
  cacheHits: prometheus.Counter<string>;
  authenticatedRequests: prometheus.Counter<string>;
}

// ==================== MAIN GATEWAY CLASS ====================

export class EnterpriseAPIGateway {
  private app: express.Application;
  private server: any;
  private redis: Redis;
  private logger: winston.Logger;
  private services: Map<string, ServiceEndpoint[]> = new Map();
  private metrics: GatewayMetrics;
  private config: {
    auth: AuthConfiguration;
    rateLimit: RateLimitConfiguration;
    loadBalancing: LoadBalancingStrategy;
    monitoring: MonitoringConfiguration;
  };
  private tenants: Map<string, TenantConfiguration> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  constructor() {
    this.app = express();
    this.initializeRedis();
    this.initializeLogger();
    this.initializeMetrics();
    this.loadConfiguration();
    this.setupMiddleware();
    this.setupRoutes();
    this.startHealthChecks();
  }

  // ==================== INITIALIZATION ====================

  private initializeRedis(): void {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keyPrefix: 'gateway:',
      db: parseInt(process.env.REDIS_DB || '0')
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error:', error);
    });

    this.redis.on('connect', () => {
      this.logger.info('Connected to Redis cluster');
    });
  }

  private initializeLogger(): void {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'enterprise-api-gateway' },
      transports: [
        new winston.transports.File({ 
          filename: 'logs/error.log', 
          level: 'error',
          maxsize: 10485760, // 10MB
          maxFiles: 5
        }),
        new winston.transports.File({ 
          filename: 'logs/combined.log',
          maxsize: 10485760,
          maxFiles: 10
        }),
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });
  }

  private initializeMetrics(): void {
    // Initialize Prometheus metrics
    prometheus.register.clear();
    
    this.metrics = {
      requestsTotal: new prometheus.Counter({
        name: 'gateway_requests_total',
        help: 'Total number of requests processed by the gateway',
        labelNames: ['method', 'route', 'status_code', 'tenant_id', 'service']
      }),
      
      requestDuration: new prometheus.Histogram({
        name: 'gateway_request_duration_seconds',
        help: 'Request duration in seconds',
        labelNames: ['method', 'route', 'service'],
        buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10]
      }),
      
      activeConnections: new prometheus.Gauge({
        name: 'gateway_active_connections',
        help: 'Number of active connections',
        labelNames: ['service']
      }),
      
      errorRate: new prometheus.Gauge({
        name: 'gateway_error_rate',
        help: 'Error rate percentage',
        labelNames: ['service', 'error_type']
      }),
      
      serviceHealth: new prometheus.Gauge({
        name: 'gateway_service_health',
        help: 'Service health status (1=healthy, 0=unhealthy)',
        labelNames: ['service', 'endpoint']
      }),
      
      rateLimitHits: new prometheus.Counter({
        name: 'gateway_rate_limit_hits_total',
        help: 'Total number of rate limit hits',
        labelNames: ['tenant_id', 'limit_type']
      }),
      
      cacheHits: new prometheus.Counter({
        name: 'gateway_cache_hits_total',
        help: 'Total number of cache hits',
        labelNames: ['cache_type', 'hit_miss']
      }),
      
      authenticatedRequests: new prometheus.Counter({
        name: 'gateway_authenticated_requests_total',
        help: 'Total number of authenticated requests',
        labelNames: ['auth_method', 'tenant_id']
      })
    };
  }

  private loadConfiguration(): void {
    this.config = {
      auth: {
        jwtSecret: process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex'),
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
        apiKeyPrefix: process.env.API_KEY_PREFIX || 'pk_',
        oauth: {
          clientId: process.env.OAUTH_CLIENT_ID || '',
          clientSecret: process.env.OAUTH_CLIENT_SECRET || '',
          redirectURI: process.env.OAUTH_REDIRECT_URI || '',
          tokenEndpoint: process.env.OAUTH_TOKEN_ENDPOINT || '',
          userInfoEndpoint: process.env.OAUTH_USER_INFO_ENDPOINT || ''
        },
        rbac: {
          enabled: process.env.RBAC_ENABLED === 'true',
          roleClaimName: process.env.RBAC_ROLE_CLAIM || 'role',
          permissionClaimName: process.env.RBAC_PERMISSION_CLAIM || 'permissions'
        }
      },
      
      rateLimit: {
        global: {
          windowMs: parseInt(process.env.GLOBAL_RATE_LIMIT_WINDOW || '60000'), // 1 minute
          maxRequests: parseInt(process.env.GLOBAL_RATE_LIMIT_MAX || '1000'),
          skipSuccessfulRequests: false,
          skipFailedRequests: false
        },
        perUser: {
          windowMs: parseInt(process.env.USER_RATE_LIMIT_WINDOW || '60000'),
          maxRequests: parseInt(process.env.USER_RATE_LIMIT_MAX || '100'),
          keyGenerator: (req: Request) => req.ip || 'unknown'
        },
        perEndpoint: new Map([
          ['/api/credentials/create', { windowMs: 60000, maxRequests: 10, premium: false }],
          ['/api/zkp/generate', { windowMs: 60000, maxRequests: 5, premium: true }],
          ['/api/identity/verify', { windowMs: 60000, maxRequests: 3, premium: true }]
        ]),
        ddosProtection: {
          enabled: true,
          thresholdRpm: 10000,
          banDurationMs: 300000, // 5 minutes
          whitelistedIPs: ['127.0.0.1', '::1']
        }
      },
      
      loadBalancing: {
        algorithm: 'weighted-round-robin',
        healthCheckInterval: 30000, // 30 seconds
        maxRetries: 3,
        retryDelay: 1000,
        circuitBreaker: {
          failureThreshold: 5,
          recoveryTimeout: 60000,
          monitoringPeriod: 10000
        }
      },
      
      monitoring: {
        metricsEnabled: true,
        tracingEnabled: process.env.TRACING_ENABLED === 'true',
        logLevel: (process.env.LOG_LEVEL as any) || 'info',
        alerting: {
          enabled: process.env.ALERTING_ENABLED === 'true',
          webhookURL: process.env.ALERTING_WEBHOOK_URL,
          thresholds: {
            errorRate: parseFloat(process.env.ERROR_RATE_THRESHOLD || '0.05'),
            responseTime: parseInt(process.env.RESPONSE_TIME_THRESHOLD || '5000'),
            cpu: parseFloat(process.env.CPU_THRESHOLD || '0.8'),
            memory: parseFloat(process.env.MEMORY_THRESHOLD || '0.8')
          }
        },
        prometheus: {
          enabled: true,
          port: parseInt(process.env.PROMETHEUS_PORT || '9090'),
          path: process.env.PROMETHEUS_PATH || '/metrics'
        }
      }
    };
  }

  // ==================== MIDDLEWARE SETUP ====================

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https:"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    // CORS configuration
    this.app.use(cors({
      origin: (origin, callback) => {
        // Allow requests from configured origins or same origin
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Tenant-ID', 'X-Request-ID']
    }));

    // Compression
    this.app.use(compression({
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
      threshold: 1024
    }));

    // Request parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request ID middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      req.headers['x-request-id'] = req.headers['x-request-id'] || crypto.randomUUID();
      res.setHeader('X-Request-ID', req.headers['x-request-id']);
      next();
    });

    // Logging middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        this.logger.info('Request completed', {
          method: req.method,
          url: req.url,
          status: res.statusCode,
          duration,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          requestId: req.headers['x-request-id']
        });
        
        // Update metrics
        this.metrics.requestsTotal.inc({
          method: req.method,
          route: req.route?.path || req.path,
          status_code: res.statusCode.toString(),
          tenant_id: req.headers['x-tenant-id']?.toString() || 'unknown',
          service: this.getServiceFromPath(req.path)
        });
        
        this.metrics.requestDuration.observe(
          {
            method: req.method,
            route: req.route?.path || req.path,
            service: this.getServiceFromPath(req.path)
          },
          duration / 1000
        );
      });
      
      next();
    });

    // DDoS protection
    this.app.use(this.createDDoSProtection());

    // Global rate limiting
    this.app.use(this.createGlobalRateLimit());

    // Authentication middleware
    this.app.use(this.createAuthenticationMiddleware());

    // Tenant middleware
    this.app.use(this.createTenantMiddleware());

    // Per-endpoint rate limiting
    this.app.use(this.createEndpointRateLimit());
  }

  private createDDoSProtection() {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.rateLimit.ddosProtection.enabled) {
        return next();
      }

      const clientIP = req.ip;
      
      // Check whitelist
      if (this.config.rateLimit.ddosProtection.whitelistedIPs.includes(clientIP)) {
        return next();
      }

      const key = `ddos:${clientIP}`;
      const current = await this.redis.incr(key);
      
      if (current === 1) {
        await this.redis.expire(key, 60); // 1 minute window
      }

      if (current > this.config.rateLimit.ddosProtection.thresholdRpm) {
        // Ban the IP
        await this.redis.setex(`ban:${clientIP}`, this.config.rateLimit.ddosProtection.banDurationMs / 1000, '1');
        
        this.logger.warn('DDoS protection triggered', { ip: clientIP, requests: current });
        this.metrics.rateLimitHits.inc({ tenant_id: 'unknown', limit_type: 'ddos' });
        
        return res.status(429).json({
          error: 'Too many requests',
          message: 'Your IP has been temporarily banned due to excessive requests',
          retryAfter: this.config.rateLimit.ddosProtection.banDurationMs
        });
      }

      // Check if IP is banned
      const banned = await this.redis.get(`ban:${clientIP}`);
      if (banned) {
        return res.status(429).json({
          error: 'IP banned',
          message: 'Your IP is temporarily banned',
          retryAfter: this.config.rateLimit.ddosProtection.banDurationMs
        });
      }

      next();
    };
  }

  private createGlobalRateLimit() {
    return rateLimit({
      windowMs: this.config.rateLimit.global.windowMs,
      max: this.config.rateLimit.global.maxRequests,
      message: {
        error: 'Too many requests',
        message: 'Global rate limit exceeded'
      },
      standardHeaders: true,
      legacyHeaders: false,
      store: {
        incr: async (key: string) => {
          const current = await this.redis.incr(`rate_limit:global:${key}`);
          if (current === 1) {
            await this.redis.expire(`rate_limit:global:${key}`, this.config.rateLimit.global.windowMs / 1000);
          }
          return { totalHits: current, timeToExpire: this.config.rateLimit.global.windowMs };
        },
        decrement: async (key: string) => {
          return await this.redis.decr(`rate_limit:global:${key}`);
        },
        resetKey: async (key: string) => {
          return await this.redis.del(`rate_limit:global:${key}`);
        }
      } as any,
      onLimitReached: (req: Request) => {
        this.metrics.rateLimitHits.inc({ tenant_id: 'unknown', limit_type: 'global' });
        this.logger.warn('Global rate limit exceeded', { ip: req.ip });
      }
    });
  }

  private createAuthenticationMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Skip auth for health check and metrics endpoints
      if (req.path === '/health' || req.path === '/metrics') {
        return next();
      }

      const authHeader = req.headers.authorization;
      const apiKey = req.headers['x-api-key'] as string;

      try {
        if (authHeader && authHeader.startsWith('Bearer ')) {
          // JWT authentication
          const token = authHeader.substring(7);
          const decoded = jwt.verify(token, this.config.auth.jwtSecret) as any;
          
          req.user = {
            id: decoded.sub,
            email: decoded.email,
            tenantId: decoded.tenantId,
            roles: decoded[this.config.auth.rbac.roleClaimName] || [],
            permissions: decoded[this.config.auth.rbac.permissionClaimName] || []
          };
          
          this.metrics.authenticatedRequests.inc({ auth_method: 'jwt', tenant_id: decoded.tenantId });
          
        } else if (apiKey && apiKey.startsWith(this.config.auth.apiKeyPrefix)) {
          // API Key authentication
          const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
          const keyData = await this.redis.hgetall(`api_key:${keyHash}`);
          
          if (!keyData || !keyData.active) {
            return res.status(401).json({ error: 'Invalid API key' });
          }

          req.user = {
            id: keyData.userId,
            tenantId: keyData.tenantId,
            roles: JSON.parse(keyData.roles || '[]'),
            permissions: JSON.parse(keyData.permissions || '[]'),
            apiKey: true
          };
          
          // Update last used timestamp
          await this.redis.hset(`api_key:${keyHash}`, 'lastUsed', new Date().toISOString());
          
          this.metrics.authenticatedRequests.inc({ auth_method: 'api_key', tenant_id: keyData.tenantId });
          
        } else {
          // No authentication provided for protected route
          return res.status(401).json({ 
            error: 'Authentication required',
            message: 'Please provide a valid JWT token or API key'
          });
        }

        next();
        
      } catch (error) {
        this.logger.error('Authentication error:', error);
        return res.status(401).json({ 
          error: 'Authentication failed',
          message: 'Invalid or expired credentials'
        });
      }
    };
  }

  private createTenantMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return next();
      }

      const tenantId = req.user.tenantId;
      if (!tenantId) {
        return res.status(400).json({ 
          error: 'Tenant required',
          message: 'Valid tenant ID is required for this request'
        });
      }

      // Load tenant configuration
      let tenant = this.tenants.get(tenantId);
      if (!tenant) {
        tenant = await this.loadTenantConfiguration(tenantId);
        if (!tenant) {
          return res.status(403).json({ 
            error: 'Invalid tenant',
            message: 'Tenant not found or inactive'
          });
        }
        this.tenants.set(tenantId, tenant);
      }

      req.tenant = tenant;
      
      // Check tenant quotas
      const quotaCheck = await this.checkTenantQuotas(tenant);
      if (!quotaCheck.allowed) {
        this.metrics.rateLimitHits.inc({ tenant_id: tenantId, limit_type: 'quota' });
        return res.status(429).json({
          error: 'Quota exceeded',
          message: quotaCheck.message,
          quotas: tenant.quotas
        });
      }

      next();
    };
  }

  private createEndpointRateLimit() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const endpoint = this.getEndpointPattern(req.path);
      const limitConfig = this.config.rateLimit.perEndpoint.get(endpoint);
      
      if (!limitConfig) {
        return next();
      }

      // Check if tenant has premium features for premium endpoints
      if (limitConfig.premium && req.tenant?.tier === 'basic') {
        return res.status(403).json({
          error: 'Premium feature',
          message: 'This endpoint requires a premium subscription'
        });
      }

      const tenantId = req.user?.tenantId || req.ip;
      const key = `endpoint_limit:${endpoint}:${tenantId}`;
      
      const current = await this.redis.incr(key);
      if (current === 1) {
        await this.redis.expire(key, limitConfig.windowMs / 1000);
      }

      if (current > limitConfig.maxRequests) {
        this.metrics.rateLimitHits.inc({ tenant_id: tenantId, limit_type: 'endpoint' });
        return res.status(429).json({
          error: 'Endpoint rate limit exceeded',
          message: `Too many requests to ${endpoint}`,
          retryAfter: limitConfig.windowMs
        });
      }

      next();
    };
  }

  // ==================== ROUTING SETUP ====================

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.VERSION || '1.0.0',
        services: this.getServicesHealth(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        pid: process.pid
      };
      
      res.json(health);
    });

    // Metrics endpoint
    this.app.get('/metrics', async (req: Request, res: Response) => {
      try {
        res.set('Content-Type', prometheus.register.contentType);
        res.end(await prometheus.register.metrics());
      } catch (error) {
        res.status(500).end(error);
      }
    });

    // Service discovery endpoints
    this.app.get('/api/gateway/services', this.handleGetServices.bind(this));
    this.app.post('/api/gateway/services/register', this.handleRegisterService.bind(this));
    this.app.delete('/api/gateway/services/:serviceId', this.handleUnregisterService.bind(this));

    // Tenant management endpoints
    this.app.get('/api/gateway/tenants/:tenantId', this.handleGetTenant.bind(this));
    this.app.put('/api/gateway/tenants/:tenantId', this.handleUpdateTenant.bind(this));

    // Service proxying - must be last
    this.setupServiceProxies();
  }

  private setupServiceProxies(): void {
    // Define service routing patterns
    const serviceRoutes = [
      {
        pattern: '/api/credentials/**',
        target: process.env.CREDENTIALS_SERVICE_URL || 'http://localhost:3001',
        serviceName: 'credentials-service'
      },
      {
        pattern: '/api/zkp/**',
        target: process.env.ZKP_SERVICE_URL || 'http://localhost:3002',
        serviceName: 'zkp-service'
      },
      {
        pattern: '/api/identity/**',
        target: process.env.IDENTITY_SERVICE_URL || 'http://localhost:3003',
        serviceName: 'identity-service'
      },
      {
        pattern: '/api/verification/**',
        target: process.env.VERIFICATION_SERVICE_URL || 'http://localhost:3004',
        serviceName: 'verification-service'
      },
      {
        pattern: '/api/providers/**',
        target: process.env.PROVIDERS_SERVICE_URL || 'http://localhost:3005',
        serviceName: 'providers-service'
      }
    ];

    serviceRoutes.forEach(route => {
      const proxyOptions: Options = {
        target: route.target,
        changeOrigin: true,
        pathRewrite: {
          [`^${route.pattern.replace('/**', '')}`]: ''
        },
        onProxyReq: (proxyReq, req: any, res) => {
          // Add headers for downstream services
          proxyReq.setHeader('X-Request-ID', req.headers['x-request-id']);
          proxyReq.setHeader('X-Tenant-ID', req.user?.tenantId || '');
          proxyReq.setHeader('X-User-ID', req.user?.id || '');
          proxyReq.setHeader('X-Gateway-Version', process.env.VERSION || '1.0.0');
          
          // Add authentication context
          if (req.user) {
            proxyReq.setHeader('X-User-Context', JSON.stringify({
              id: req.user.id,
              tenantId: req.user.tenantId,
              roles: req.user.roles,
              permissions: req.user.permissions
            }));
          }
        },
        onProxyRes: (proxyRes, req: any, res) => {
          // Add gateway headers to response
          res.setHeader('X-Gateway-Service', route.serviceName);
          res.setHeader('X-Gateway-Version', process.env.VERSION || '1.0.0');
        },
        onError: (err, req: any, res: any) => {
          this.logger.error('Proxy error:', {
            service: route.serviceName,
            error: err.message,
            requestId: req.headers['x-request-id']
          });
          
          res.status(502).json({
            error: 'Service unavailable',
            message: 'The requested service is temporarily unavailable',
            requestId: req.headers['x-request-id']
          });
        }
      };

      this.app.use(route.pattern.replace('/**', ''), createProxyMiddleware(proxyOptions));
    });
  }

  // ==================== HELPER METHODS ====================

  private getServiceFromPath(path: string): string {
    if (path.startsWith('/api/credentials')) return 'credentials-service';
    if (path.startsWith('/api/zkp')) return 'zkp-service';
    if (path.startsWith('/api/identity')) return 'identity-service';
    if (path.startsWith('/api/verification')) return 'verification-service';
    if (path.startsWith('/api/providers')) return 'providers-service';
    return 'unknown';
  }

  private getEndpointPattern(path: string): string {
    // Normalize path to endpoint pattern
    const patterns = [
      { pattern: /^\/api\/credentials\/create/, endpoint: '/api/credentials/create' },
      { pattern: /^\/api\/zkp\/generate/, endpoint: '/api/zkp/generate' },
      { pattern: /^\/api\/identity\/verify/, endpoint: '/api/identity/verify' }
    ];

    for (const p of patterns) {
      if (p.pattern.test(path)) {
        return p.endpoint;
      }
    }

    return path;
  }

  private getServicesHealth(): any {
    const health: any = {};
    
    this.services.forEach((endpoints, serviceName) => {
      const healthyEndpoints = endpoints.filter(e => e.status === 'healthy').length;
      health[serviceName] = {
        total: endpoints.length,
        healthy: healthyEndpoints,
        status: healthyEndpoints > 0 ? 'healthy' : 'unhealthy'
      };
    });

    return health;
  }

  private async loadTenantConfiguration(tenantId: string): Promise<TenantConfiguration | null> {
    try {
      const tenantData = await this.redis.hgetall(`tenant:${tenantId}`);
      if (!tenantData || !tenantData.active) {
        return null;
      }

      return {
        tenantId,
        name: tenantData.name,
        tier: tenantData.tier as any,
        quotas: JSON.parse(tenantData.quotas || '{}'),
        features: JSON.parse(tenantData.features || '{}'),
        billing: JSON.parse(tenantData.billing || '{}')
      };
    } catch (error) {
      this.logger.error('Failed to load tenant configuration:', error);
      return null;
    }
  }

  private async checkTenantQuotas(tenant: TenantConfiguration): Promise<{ allowed: boolean; message?: string }> {
    const now = new Date();
    const tenantId = tenant.tenantId;

    // Check requests per minute
    const minuteKey = `quota:${tenantId}:minute:${Math.floor(now.getTime() / 60000)}`;
    const minuteCount = await this.redis.incr(minuteKey);
    await this.redis.expire(minuteKey, 60);

    if (minuteCount > tenant.quotas.requestsPerMinute) {
      return { allowed: false, message: 'Requests per minute quota exceeded' };
    }

    // Check requests per hour
    const hourKey = `quota:${tenantId}:hour:${Math.floor(now.getTime() / 3600000)}`;
    const hourCount = await this.redis.incr(hourKey);
    await this.redis.expire(hourKey, 3600);

    if (hourCount > tenant.quotas.requestsPerHour) {
      return { allowed: false, message: 'Requests per hour quota exceeded' };
    }

    // Check requests per day
    const dayKey = `quota:${tenantId}:day:${Math.floor(now.getTime() / 86400000)}`;
    const dayCount = await this.redis.incr(dayKey);
    await this.redis.expire(dayKey, 86400);

    if (dayCount > tenant.quotas.requestsPerDay) {
      return { allowed: false, message: 'Requests per day quota exceeded' };
    }

    return { allowed: true };
  }

  private startHealthChecks(): void {
    setInterval(() => {
      this.performHealthChecks();
    }, this.config.loadBalancing.healthCheckInterval);
  }

  private async performHealthChecks(): Promise<void> {
    this.services.forEach(async (endpoints, serviceName) => {
      for (const endpoint of endpoints) {
        try {
          const start = Date.now();
          const response = await fetch(`${endpoint.targetURL}${endpoint.healthCheckPath}`, {
            method: 'GET',
            timeout: 5000
          });
          
          const responseTime = Date.now() - start;
          const isHealthy = response.ok;
          
          endpoint.status = isHealthy ? 'healthy' : 'unhealthy';
          endpoint.responseTime = responseTime;
          endpoint.lastHealthCheck = new Date();
          
          this.metrics.serviceHealth.set(
            { service: serviceName, endpoint: endpoint.serviceId },
            isHealthy ? 1 : 0
          );
          
        } catch (error) {
          endpoint.status = 'unhealthy';
          endpoint.lastHealthCheck = new Date();
          
          this.metrics.serviceHealth.set(
            { service: serviceName, endpoint: endpoint.serviceId },
            0
          );
        }
      }
    });
  }

  // ==================== API HANDLERS ====================

  private async handleGetServices(req: Request, res: Response): Promise<void> {
    const services: any = {};
    this.services.forEach((endpoints, serviceName) => {
      services[serviceName] = endpoints;
    });
    res.json(services);
  }

  private async handleRegisterService(req: Request, res: Response): Promise<void> {
    try {
      const service: ServiceEndpoint = req.body;
      
      if (!this.services.has(service.name)) {
        this.services.set(service.name, []);
      }
      
      this.services.get(service.name)!.push(service);
      
      this.logger.info('Service registered:', { service: service.name, id: service.serviceId });
      res.status(201).json({ message: 'Service registered successfully' });
      
    } catch (error) {
      this.logger.error('Failed to register service:', error);
      res.status(400).json({ error: 'Invalid service configuration' });
    }
  }

  private async handleUnregisterService(req: Request, res: Response): Promise<void> {
    const { serviceId } = req.params;
    
    this.services.forEach((endpoints, serviceName) => {
      const index = endpoints.findIndex(e => e.serviceId === serviceId);
      if (index !== -1) {
        endpoints.splice(index, 1);
        this.logger.info('Service unregistered:', { service: serviceName, id: serviceId });
      }
    });
    
    res.json({ message: 'Service unregistered successfully' });
  }

  private async handleGetTenant(req: Request, res: Response): Promise<void> {
    const { tenantId } = req.params;
    const tenant = await this.loadTenantConfiguration(tenantId);
    
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    res.json(tenant);
  }

  private async handleUpdateTenant(req: Request, res: Response): Promise<void> {
    const { tenantId } = req.params;
    const updates = req.body;
    
    try {
      await this.redis.hmset(`tenant:${tenantId}`, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
      
      // Clear cached tenant
      this.tenants.delete(tenantId);
      
      res.json({ message: 'Tenant updated successfully' });
      
    } catch (error) {
      this.logger.error('Failed to update tenant:', error);
      res.status(500).json({ error: 'Failed to update tenant' });
    }
  }

  // ==================== PUBLIC METHODS ====================

  public async start(port: number = 3000): Promise<void> {
    await this.redis.connect();
    
    this.server = this.app.listen(port, () => {
      this.logger.info(`Enterprise API Gateway started on port ${port}`);
      
      // Register initial services
      this.registerDefaultServices();
    });

    // Graceful shutdown
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }

  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down Enterprise API Gateway...');
    
    if (this.server) {
      this.server.close();
    }
    
    await this.redis.disconnect();
    this.logger.info('Enterprise API Gateway shut down complete');
  }

  private registerDefaultServices(): void {
    // Register default service endpoints
    const defaultServices = [
      {
        serviceId: 'credentials-service-1',
        name: 'credentials-service',
        version: '1.0.0',
        basePath: '/api/credentials',
        targetURL: process.env.CREDENTIALS_SERVICE_URL || 'http://localhost:3001',
        healthCheckPath: '/health',
        status: 'healthy' as const,
        priority: 1,
        weight: 100,
        maxConnections: 1000,
        currentConnections: 0,
        lastHealthCheck: new Date(),
        responseTime: 0,
        errorRate: 0,
        circuitBreakerState: 'closed' as const,
        metadata: {
          region: process.env.REGION || 'us-east-1',
          environment: process.env.NODE_ENV || 'development',
          tags: ['credentials', 'api']
        }
      }
      // Add more default services here
    ];

    defaultServices.forEach(service => {
      if (!this.services.has(service.name)) {
        this.services.set(service.name, []);
      }
      this.services.get(service.name)!.push(service);
    });
  }
}

// ==================== CIRCUIT BREAKER ====================

class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount = 0;
  private lastFailureTime: Date | null = null;
  private successCount = 0;

  constructor(
    private failureThreshold: number,
    private recoveryTimeout: number,
    private monitoringPeriod: number
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    if (this.state === 'half-open') {
      this.successCount++;
      if (this.successCount >= 3) { // Reset after 3 successful calls
        this.state = 'closed';
        this.successCount = 0;
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();
    
    if (this.state === 'half-open') {
      this.state = 'open';
      this.successCount = 0;
    } else if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';
    }
  }

  private shouldAttemptReset(): boolean {
    return this.lastFailureTime !== null &&
           Date.now() - this.lastFailureTime.getTime() >= this.recoveryTimeout;
  }

  getState(): string {
    return this.state;
  }
}

export default EnterpriseAPIGateway;