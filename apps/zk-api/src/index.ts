import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { provingRoutes } from './routes/provingRoutes';
import { verifierRoutes } from './routes/verifierRoutes';

const app = express();
const PORT = process.env.PORT || 3007;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000', 
    'http://localhost:3001',
    'http://localhost:8080'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting for ZK proof generation (more restrictive due to computational cost)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 proof generations per window
  message: {
    success: false,
    error: 'Too many proof generation requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for verification and info endpoints
  skip: (req) => {
    return req.path.includes('/verify') || 
           req.path.includes('/circuits') || 
           req.path.includes('/statistics');
  }
});
app.use('/prove', limiter);

// Body parsing middleware with larger limits for ZK proofs
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
  res.json({
    success: true,
    service: 'PersonaPass ZK Proving API',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    capabilities: {
      circuitTypes: ['academic', 'financial', 'health', 'social', 'government', 'iot', 'universal'],
      operations: [
        'gpa_verification',
        'income_verification', 
        'vaccination_verification',
        'influence_verification',
        'license_verification',
        'presence_verification',
        'aggregate_proof'
      ],
      maxBatchSize: 10,
      supportedCurves: ['BN254'],
      provingSystem: 'Groth16',
      onChainVerification: process.env.ZK_VERIFIER_ENABLED === 'true'
    }
  });
});

// API Routes
app.use('/', provingRoutes);
app.use('/verifier', verifierRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: {
      health: 'GET /health',
      circuits: 'GET /circuits',
      circuitInfo: 'GET /circuits/:circuitType/:operation',
      statistics: 'GET /statistics',
      proofs: {
        gpa: 'POST /prove/gpa',
        income: 'POST /prove/income',
        vaccination: 'POST /prove/vaccination',
        aggregate: 'POST /prove/aggregate',
        batch: 'POST /prove/batch',
        verify: 'POST /verify'
      },
      verifier: {
        submit: 'POST /verifier/submit',
        registerCircuit: 'POST /verifier/register-circuit',
        contractInfo: 'GET /verifier/contract-info',
        circuits: 'GET /verifier/circuits',
        circuit: 'GET /verifier/circuit/:circuitId',
        proof: 'GET /verifier/proof/:proofId',
        proofs: 'GET /verifier/proofs/:circuitId',
        health: 'GET /verifier/health'
      }
    }
  });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Unhandled error in ZK API:', error);
  
  // Handle specific ZK proving errors
  if (error.message.includes('witness')) {
    return res.status(400).json({
      success: false,
      error: 'Invalid circuit inputs',
      details: 'Failed to generate witness from provided inputs'
    });
  }
  
  if (error.message.includes('proof generation')) {
    return res.status(500).json({
      success: false,
      error: 'Proof generation failed',
      details: 'Circuit execution encountered an error'
    });
  }
  
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 PersonaPass ZK Proving API running on port ${PORT}`);
  console.log(`🔐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⚡ Groth16 proving system initialized`);
  console.log(`🧮 Supporting 7 circuit types across 6 domains`);
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔍 Health check: http://localhost:${PORT}/health`);
    console.log(`📊 Circuits info: http://localhost:${PORT}/circuits`);
    console.log(`🧪 Example GPA proof: POST http://localhost:${PORT}/prove/gpa`);
  }
  
  console.log('');
  console.log('🎯 **ZK PROOF ENDPOINTS READY**');
  console.log('   📚 /prove/gpa - Generate GPA verification proof');
  console.log('   💰 /prove/income - Generate income verification proof');
  console.log('   💉 /prove/vaccination - Generate vaccination verification proof');  
  console.log('   🔄 /prove/aggregate - Generate cross-domain aggregate proof');
  console.log('   ✅ /verify - Verify any zero-knowledge proof');
  console.log('   📊 /circuits - List all available circuits');
  console.log('');
  console.log('🔗 **ON-CHAIN VERIFIER ENDPOINTS**');
  console.log('   📤 /verifier/submit - Submit proof to on-chain verifier');
  console.log('   🔧 /verifier/register-circuit - Register new circuit');
  console.log('   📋 /verifier/contract-info - Get contract information');
  console.log('   🔍 /verifier/circuits - List on-chain circuits');
  console.log('   ❤️  /verifier/health - Check verifier integration status');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down ZK API gracefully...');
  server.close(() => {
    console.log('✅ ZK API process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down ZK API gracefully...');
  server.close(() => {
    console.log('✅ ZK API process terminated');
    process.exit(0);
  });
});

export default app;