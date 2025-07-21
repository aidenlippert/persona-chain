import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config/config';
import { financialRoutes } from './routes/financialRoutes';
import { oauthRoutes } from './routes/oauthRoutes';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.plaid.com", "https://api.creditkarma.com", "https://api.experian.com"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimiting.windowMs,
  max: config.rateLimiting.max,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'PersonaPass Financial Connector',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    integrations: {
      plaid: {
        environment: config.plaid.environment,
        available: true
      },
      creditKarma: {
        available: !!config.creditKarma.clientId
      },
      experian: {
        available: !!config.experian.clientId
      }
    }
  });
});

// API Routes
app.use('/api/financial', financialRoutes);
app.use('/oauth', oauthRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: {
      health: 'GET /health',
      financial: {
        credentials: 'GET /api/financial/credentials',
        linkToken: 'POST /api/financial/plaid/link-token',
        exchangeToken: 'POST /api/financial/plaid/exchange-token',
        verify: 'POST /api/financial/verify',
        status: 'GET /api/financial/status/:did',
        revokePlaid: 'DELETE /api/financial/plaid/revoke',
        revokeCredit: 'DELETE /api/financial/credit/revoke'
      },
      oauth: {
        authorizeCredit: 'GET /oauth/authorizeCredit',
        authorizePlaid: 'GET /oauth/authorizePlaid',
        callbackCredit: 'GET /oauth/callbackCredit',
        refresh: 'POST /oauth/refresh',
        revoke: 'DELETE /oauth/revoke'
      }
    }
  });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Unhandled error:', error);
  
  res.status(500).json({
    success: false,
    error: config.nodeEnv === 'development' ? error.message : 'Internal server error',
    ...(config.nodeEnv === 'development' && { stack: error.stack })
  });
});

// Start server
const server = app.listen(config.port, () => {
  console.log(`🚀 PersonaPass Financial Connector running on port ${config.port}`);
  console.log(`📊 Environment: ${config.nodeEnv}`);
  console.log(`🔗 Plaid Environment: ${config.plaid.environment}`);
  console.log(`💳 Credit Karma Integration: ${config.creditKarma.clientId ? 'Enabled' : 'Disabled'}`);
  console.log(`📈 Experian Integration: ${config.experian.clientId ? 'Enabled' : 'Disabled'}`);
  
  if (config.nodeEnv === 'development') {
    console.log(`🔍 Health check: http://localhost:${config.port}/health`);
    console.log(`📋 API docs: http://localhost:${config.port}/api/financial/credentials`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Process terminated');
    process.exit(0);
  });
});

export default app;