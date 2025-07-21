import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';

// Import routes
import proofsRoutes from './routes/proofs';
import verifierRoutes from './routes/verifier';
import authRoutes from './routes/auth';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'personapass-backend',
    version: '2.0.0',
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/proofs', proofsRoutes);
app.use('/api/verifier', verifierRoutes);

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'PersonaPass Backend API',
    version: '2.0.0',
    description: 'Backend API for PersonaPass with ZK verifier integration',
    endpoints: {
      health: 'GET /health',
      auth: {
        adminLogin: 'POST /api/auth/admin/login',
        adminValidate: 'POST /api/auth/admin/validate',
        adminLogout: 'POST /api/auth/admin/logout',
        adminProfile: 'GET /api/auth/admin/profile'
      },
      proofs: {
        submit: 'POST /api/proofs/submitProof',
        status: 'GET /api/proofs/proof/:txHash/status',
        list: 'GET /api/proofs/proofs/:controller'
      },
      verifier: {
        submit: 'POST /api/verifier/submit',
        registerCircuit: 'POST /api/verifier/register-circuit',
        circuits: 'GET /api/verifier/circuits',
        circuitDetails: 'GET /api/verifier/circuits/:circuit_id',
        contractInfo: 'GET /api/verifier/contract-info',
        proofDetails: 'GET /api/verifier/proofs/:proof_id',
        circuitProofs: 'GET /api/verifier/circuits/:circuit_id/proofs',
        health: 'GET /api/verifier/health'
      }
    },
    documentation: {
      swagger: '/api/docs',
      postman: '/api/postman.json'
    }
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    available_endpoints: '/api'
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 PersonaPass Backend API Server Started');
  console.log('==========================================');
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Port: ${PORT}`);
  console.log(`   Health Check: http://localhost:${PORT}/health`);
  console.log(`   API Documentation: http://localhost:${PORT}/api`);
  console.log(`   Verifier Endpoints: http://localhost:${PORT}/api/verifier`);
  console.log(`   Proof Endpoints: http://localhost:${PORT}/api/proofs`);
  console.log('');
  console.log('🔗 Sprint 2+ Security Features:');
  console.log('   ✅ ZK Verifier Contract Integration');
  console.log('   ✅ Production-ready API Endpoints');
  console.log('   ✅ JWT-based Admin Authentication');
  console.log('   ✅ Role-based Access Control');
  console.log('   ✅ Governance Support & Security Hardening');
  console.log('   ✅ Comprehensive Error Handling');
  console.log('   ✅ Health Monitoring & Status Checks');
  console.log('');
});

export default app;