import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { Server } from 'socket.io';
import http from 'http';
import dotenv from 'dotenv';

import { SharingSessionManager } from './services/SharingSessionManager.js';
import { QRCodeService } from './services/QRCodeService.js';
import { ConsentManager } from './services/ConsentManager.js';
import { sharingRoutes } from './routes/sharingRoutes.js';
import { qrRoutes } from './routes/qrRoutes.js';
import { consentRoutes } from './routes/consentRoutes.js';
import { websocketHandler } from './websocket/sharingSocket.js';

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const PORT = process.env.PORT || 3008;

// Initialize services
export const sessionManager = new SharingSessionManager({
  defaultSessionTTL: parseInt(process.env.SESSION_TTL || '1800000'), // 30 minutes
  maxActiveSessions: parseInt(process.env.MAX_SESSIONS || '1000'),
  enableAnalytics: process.env.ENABLE_ANALYTICS !== 'false',
});

export const qrCodeService = new QRCodeService({
  baseUrl: process.env.SHARING_PROTOCOL_BASE_URL || 'http://localhost:3008',
  enableSigning: process.env.NODE_ENV === 'production',
  signingKey: process.env.QR_SIGNING_KEY,
});

export const consentManager = new ConsentManager({
  requireExplicitConsent: process.env.REQUIRE_EXPLICIT_CONSENT !== 'false',
  consentExpiryDays: parseInt(process.env.CONSENT_EXPIRY_DAYS || '30'),
  enableAuditLog: process.env.ENABLE_AUDIT_LOG !== 'false',
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:8080',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Session-ID'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for session and health endpoints
  skip: (req) => {
    return req.path.includes('/health') || 
           req.path.includes('/stats') ||
           req.method === 'GET';
  },
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  const sessionStats = sessionManager.getSessionStats();
  const consentAnalytics = consentManager.getConsentAnalytics();
  const qrStats = qrCodeService.getStats();

  res.json({
    success: true,
    service: 'PersonaPass Sharing Protocol',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    capabilities: {
      sharingMethods: ['qr', 'did', 'direct', 'api'],
      supportedProofTypes: ['academic', 'financial', 'health', 'social', 'government', 'iot'],
      selectiveDisclosure: true,
      consentManagement: true,
      realTimeUpdates: true,
      onChainVerification: process.env.ZK_VERIFIER_ENABLED === 'true',
    },
    stats: {
      sessions: sessionStats,
      consents: {
        total: consentAnalytics.totalConsents,
        active: consentAnalytics.activeConsents,
        consentRate: Math.round(consentAnalytics.consentRate * 100),
      },
      qr: qrStats.capabilities,
    },
  });
});

// API Routes
app.use('/api/sharing', sharingRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/consent', consentRoutes);

// Static sharing pages (for QR code links)
app.use('/share', express.static('public/share'));

// WebSocket handling
websocketHandler(io, sessionManager, consentManager);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: {
      health: 'GET /health',
      sharing: {
        createSession: 'POST /api/sharing/sessions',
        getSession: 'GET /api/sharing/sessions/:sessionId',
        respondToSession: 'POST /api/sharing/sessions/:sessionId/respond',
        listSessions: 'GET /api/sharing/sessions',
        revokeSession: 'DELETE /api/sharing/sessions/:sessionId',
        analytics: 'GET /api/sharing/analytics',
      },
      qr: {
        generateRequest: 'POST /api/qr/generate/request',
        generateResponse: 'POST /api/qr/generate/response',
        parse: 'POST /api/qr/parse',
      },
      consent: {
        request: 'POST /api/consent/request',
        record: 'POST /api/consent/record',
        withdraw: 'DELETE /api/consent/:consentId',
        history: 'GET /api/consent/history/:holderDid',
        validate: 'POST /api/consent/validate',
        analytics: 'GET /api/consent/analytics',
      },
      websocket: 'ws://host/socket.io/',
    },
  });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Unhandled error in Sharing Protocol:', error);
  
  // Handle specific sharing protocol errors
  if (error.name === 'SharingProtocolError') {
    return res.status(400).json({
      success: false,
      error: error.message,
      code: error.code,
      details: error.details,
    });
  }
  
  if (error.name === 'ConsentError') {
    return res.status(403).json({
      success: false,
      error: error.message,
      code: 'CONSENT_ERROR',
      details: error.details,
    });
  }
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: error.message,
      code: 'VALIDATION_ERROR',
      details: error.details,
    });
  }
  
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 PersonaPass Sharing Protocol running on port ${PORT}`);
  console.log(`🔐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Base URL: ${qrCodeService.getStats().config.baseUrl}`);
  console.log(`📱 QR Code sharing enabled`);
  console.log(`✅ Consent management active`);
  console.log(`🔄 Real-time WebSocket support enabled`);
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔍 Health check: http://localhost:${PORT}/health`);
    console.log(`📊 API docs: http://localhost:${PORT}/api/sharing`);
    console.log(`🧪 Example sharing: POST http://localhost:${PORT}/api/sharing/sessions`);
  }
  
  console.log('');
  console.log('🎯 **SHARING PROTOCOL ENDPOINTS READY**');
  console.log('   📝 /api/sharing/sessions - Create and manage sharing sessions');
  console.log('   📱 /api/qr/generate - Generate QR codes for sharing');
  console.log('   ✅ /api/consent/request - Request and manage consent');
  console.log('   🔄 /socket.io - Real-time sharing updates');
  console.log('   🌐 /share - Web-based sharing pages');
  console.log('');
  console.log('🔗 **INTEGRATION READY**');
  console.log('   Connect with ZK API for proof generation');
  console.log('   Link with wallet apps for seamless UX');
  console.log('   Enable 3rd party verifier integration');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down Sharing Protocol gracefully...');
  server.close(() => {
    sessionManager.destroy();
    console.log('✅ Sharing Protocol process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down Sharing Protocol gracefully...');
  server.close(() => {
    sessionManager.destroy();
    console.log('✅ Sharing Protocol process terminated');
    process.exit(0);
  });
});

// Periodic cleanup
setInterval(() => {
  consentManager.cleanupExpiredConsents();
}, 60 * 60 * 1000); // Run every hour

export default app;