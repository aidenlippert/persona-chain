// Load environment variables first
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Redis } from 'ioredis';
import winston from 'winston';
import { githubRouter } from './routes/github';
import { linkedinRouter } from './routes/linkedin';
import { plaidRouter } from './routes/plaid';
import { orcidRouter } from './routes/orcid';
import { twitterRouter } from './routes/twitter';
import { stackexchangeRouter } from './routes/stackexchange';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { authMiddleware } from './middleware/auth';

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Initialize Express app
const app = express();
const port = process.env.CONNECTOR_PORT || 8080;

// Initialize Redis with proper error handling
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  enableAutoPipelining: true,
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      // Only reconnect when the error contains "READONLY"
      return true;
    }
    return false;
  }
});

// Redis error handling
redis.on('error', (error) => {
  logger.error('Redis connection error:', error);
});

redis.on('connect', () => {
  logger.info('Successfully connected to Redis');
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "https:", "data:"],
      connectSrc: ["'self'", "https://api.github.com", "https://api.linkedin.com"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:3000',
  'https://wallet.personapass.xyz'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Log for debugging
    console.log('CORS request from origin:', origin);
    console.log('Allowed origins:', allowedOrigins);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // Allow localhost on any port for development
      if (origin?.startsWith('http://localhost:')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID'],
}));

// Request parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request ID middleware
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] as string || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      requestId: req.id,
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.headers['user-agent']
    });
  });
  next();
});

// Rate limiting
app.use('/api', rateLimiter(redis));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check Redis connection
    await redis.ping();
    
    res.json({ 
      status: 'healthy', 
      service: 'persona-connectors',
      version: process.env.npm_package_version || '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      connectors: {
        available: ['github', 'linkedin', 'plaid'],
        coming_soon: ['orcid', 'twitter', 'stackexchange']
      },
      redis: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'persona-connectors',
      timestamp: new Date().toISOString(),
      error: 'Redis connection failed'
    });
  }
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    service: 'PersonaPass Credential Connectors API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      connectors: {
        github: {
          auth: 'POST /api/connectors/github/auth',
          callback: 'POST /api/connectors/github/callback',
          status: 'GET /api/connectors/github/status'
        },
        linkedin: {
          auth: 'POST /api/connectors/linkedin/auth',
          callback: 'POST /api/connectors/linkedin/callback',
          status: 'GET /api/connectors/linkedin/status'
        },
        plaid: {
          auth: 'POST /api/connectors/plaid/auth',
          callback: 'POST /api/connectors/plaid/callback',
          status: 'GET /api/connectors/plaid/status'
        }
      }
    },
    documentation: 'https://docs.personapass.xyz/api/connectors'
  });
});

// Authentication middleware for all connector routes
app.use('/api/connectors', authMiddleware);

// Connector routes
app.use('/api/connectors/github', githubRouter(redis));
app.use('/api/connectors/linkedin', linkedinRouter(redis));
app.use('/api/connectors/plaid', plaidRouter(redis));

// Coming soon routes (return appropriate message)
const comingSoonHandler = (name: string) => (req: express.Request, res: express.Response) => {
  res.status(501).json({
    error: 'Not Implemented',
    message: `${name} connector is coming soon!`,
    status: 'coming_soon'
  });
};

app.use('/api/connectors/orcid', comingSoonHandler('ORCID'));
app.use('/api/connectors/twitter', comingSoonHandler('Twitter'));
app.use('/api/connectors/stackexchange', comingSoonHandler('Stack Exchange'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
    path: req.path
  });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Received shutdown signal, closing connections...');
  
  try {
    // Close Redis connection
    await redis.quit();
    logger.info('Redis connection closed');
    
    // Close server
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
    
    // Force close after 10 seconds
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const server = app.listen(port, () => {
  logger.info(`PersonaPass Connector Service started`, {
    port,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    pid: process.pid
  });
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown();
});

export { app, redis, logger };