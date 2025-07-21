/**
 * PersonaChain Zero-Knowledge Proof Service
 * Production-grade ZK proof generation and verification
 * 
 * Features:
 * - Age verification proofs
 * - Membership proofs  
 * - Range proofs
 * - Selective disclosure proofs
 * - Groth16 and PLONK proving systems
 * - Redis caching and job queuing
 * - Enterprise security and monitoring
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import NodeCache from 'node-cache';
import Redis from 'redis';
import Queue from 'bull';
import jwt from 'jsonwebtoken';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

// ZK proof dependencies
import * as snarkjs from 'snarkjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const config = {
    port: process.env.ZK_PORT || 8083,
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    jwtSecret: process.env.JWT_SECRET || 'zk-proof-secret-key',
    circuitPath: path.join(__dirname, '../../circuits'),
    environment: process.env.NODE_ENV || 'development',
    rateLimitWindow: 15 * 60 * 1000, // 15 minutes
    rateLimitMax: 100, // requests per window
    proofTimeout: 300000, // 5 minutes
    cacheTimeout: 3600, // 1 hour
};

// Logger setup
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'zk-proof-service' },
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
        new winston.transports.Console({
            format: winston.format.simple()
        })
    ],
});

// Express app setup
const app = express();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined', {
    stream: { write: message => logger.info(message.trim()) }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: config.rateLimitWindow,
    max: config.rateLimitMax,
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// Cache setup
const cache = new NodeCache({ stdTTL: config.cacheTimeout });

// Redis setup
let redis;
try {
    redis = Redis.createClient({ url: config.redisUrl });
    await redis.connect();
    logger.info('Connected to Redis');
} catch (error) {
    logger.error('Redis connection failed:', error);
}

// Job queue setup
const proofQueue = new Queue('proof generation', config.redisUrl, {
    defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000,
        },
    },
});

// Circuit configurations
const CIRCUITS = {
    age_verification: {
        name: 'age_verification',
        description: 'Proves age is above threshold without revealing exact age',
        inputs: ['minimum_age', 'maximum_age', 'current_timestamp', 'merkle_root', 'verifier_id', 'date_of_birth', 'salt', 'nonce', 'secret_key'],
        outputs: ['commitment', 'nullifier', 'valid', 'age_range_proof'],
        provingSystems: ['groth16', 'plonk'],
    },
    membership_proof: {
        name: 'membership_proof',
        description: 'Proves membership in a set without revealing identity',
        inputs: ['merkle_root', 'set_id', 'verifier_id', 'timestamp', 'challenge', 'member_value', 'path_elements', 'path_indices', 'salt', 'secret_key'],
        outputs: ['commitment', 'nullifier', 'membership_valid', 'response'],
        provingSystems: ['groth16', 'plonk'],
    },
    range_proof: {
        name: 'range_proof',
        description: 'Proves value is within range without revealing exact value',
        inputs: ['min_bound', 'max_bound', 'range_id', 'verifier_id', 'timestamp', 'challenge', 'secret_value', 'salt', 'nonce', 'secret_key'],
        outputs: ['commitment', 'nullifier', 'range_valid', 'response', 'value_commitment'],
        provingSystems: ['groth16', 'plonk'],
    },
    selective_disclosure: {
        name: 'selective_disclosure',
        description: 'Selectively reveals credential attributes while keeping others private',
        inputs: ['credential_root', 'issuer_id', 'verifier_id', 'disclosure_mask', 'timestamp', 'challenge', 'attributes', 'salts', 'path_elements', 'path_indices', 'secret_key', 'nonce'],
        outputs: ['disclosed_attributes', 'hidden_commitments', 'credential_valid', 'nullifier', 'response', 'global_commitment'],
        provingSystems: ['groth16', 'plonk'],
    },
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, config.jwtSecret, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Validation middleware
const validateProofRequest = (circuitName) => [
    body('circuit').equals(circuitName).withMessage(`Circuit must be ${circuitName}`),
    body('proving_system').isIn(['groth16', 'plonk']).withMessage('Proving system must be groth16 or plonk'),
    body('inputs').isObject().withMessage('Inputs must be an object'),
    body('public_inputs').optional().isObject().withMessage('Public inputs must be an object'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

// Utility functions
const getCircuitPaths = (circuitName, provingSystem) => {
    const circuitDir = path.join(config.circuitPath, 'keys', circuitName);
    return {
        wasmPath: path.join(config.circuitPath, 'build', circuitName, `${circuitName}_js`, `${circuitName}.wasm`),
        zkeyPath: path.join(circuitDir, `${circuitName}_${provingSystem}_final.zkey`),
        vkeyPath: path.join(circuitDir, `${circuitName}_${provingSystem}_verification_key.json`),
    };
};

const generateWitness = async (wasmPath, inputs) => {
    const witnessPath = path.join('/tmp', `witness_${uuidv4()}.wtns`);
    
    try {
        const { wasm } = await snarkjs.groth16.fullProve(inputs, wasmPath, witnessPath);
        return witnessPath;
    } catch (error) {
        logger.error('Witness generation failed:', error);
        throw new Error('Failed to generate witness');
    }
};

const generateProof = async (circuitName, provingSystem, inputs) => {
    const startTime = Date.now();
    const proofId = uuidv4();
    
    try {
        logger.info(`Generating ${provingSystem} proof for ${circuitName}`, { proofId });
        
        const paths = getCircuitPaths(circuitName, provingSystem);
        
        // Validate paths exist
        for (const [key, filePath] of Object.entries(paths)) {
            if (!await fs.pathExists(filePath)) {
                throw new Error(`${key} not found at ${filePath}`);
            }
        }
        
        let proof, publicSignals;
        
        if (provingSystem === 'groth16') {
            const { proof: groth16Proof, publicSignals: groth16PublicSignals } = 
                await snarkjs.groth16.fullProve(inputs, paths.wasmPath, paths.zkeyPath);
            proof = groth16Proof;
            publicSignals = groth16PublicSignals;
        } else if (provingSystem === 'plonk') {
            const { proof: plonkProof, publicSignals: plonkPublicSignals } = 
                await snarkjs.plonk.fullProve(inputs, paths.wasmPath, paths.zkeyPath);
            proof = plonkProof;
            publicSignals = plonkPublicSignals;
        }
        
        const generationTime = Date.now() - startTime;
        
        const result = {
            proofId,
            circuit: circuitName,
            provingSystem,
            proof,
            publicSignals,
            generationTime,
            timestamp: new Date().toISOString(),
        };
        
        // Cache the result
        cache.set(`proof_${proofId}`, result);
        
        logger.info(`Proof generated successfully`, { 
            proofId, 
            circuit: circuitName, 
            provingSystem, 
            generationTime 
        });
        
        return result;
        
    } catch (error) {
        logger.error(`Proof generation failed for ${circuitName}:`, error);
        throw error;
    }
};

const verifyProof = async (circuitName, provingSystem, proof, publicSignals) => {
    try {
        const paths = getCircuitPaths(circuitName, provingSystem);
        
        const vKey = JSON.parse(await fs.readFile(paths.vkeyPath, 'utf8'));
        
        let isValid;
        if (provingSystem === 'groth16') {
            isValid = await snarkjs.groth16.verify(vKey, publicSignals, proof);
        } else if (provingSystem === 'plonk') {
            isValid = await snarkjs.plonk.verify(vKey, publicSignals, proof);
        }
        
        logger.info(`Proof verification completed`, { 
            circuit: circuitName, 
            provingSystem, 
            isValid 
        });
        
        return isValid;
        
    } catch (error) {
        logger.error(`Proof verification failed for ${circuitName}:`, error);
        throw error;
    }
};

// Job processing
proofQueue.process('generate_proof', async (job) => {
    const { circuitName, provingSystem, inputs } = job.data;
    
    try {
        const result = await generateProof(circuitName, provingSystem, inputs);
        return result;
    } catch (error) {
        logger.error('Job failed:', error);
        throw error;
    }
});

// API Routes

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        circuits: Object.keys(CIRCUITS),
        version: '1.0.0',
    });
});

// Get available circuits
app.get('/api/circuits', (req, res) => {
    res.json({
        circuits: CIRCUITS,
        count: Object.keys(CIRCUITS).length,
    });
});

// Get circuit info
app.get('/api/circuits/:name', (req, res) => {
    const { name } = req.params;
    
    if (!CIRCUITS[name]) {
        return res.status(404).json({ error: 'Circuit not found' });
    }
    
    res.json({
        circuit: CIRCUITS[name],
    });
});

// Generate proof (async with job queue)
app.post('/api/proof/generate/:circuit', 
    validateProofRequest(''),
    async (req, res) => {
        const { circuit } = req.params;
        const { proving_system, inputs, priority = 'normal' } = req.body;
        
        if (!CIRCUITS[circuit]) {
            return res.status(404).json({ error: 'Circuit not found' });
        }
        
        if (!CIRCUITS[circuit].provingSystems.includes(proving_system)) {
            return res.status(400).json({ 
                error: `Proving system ${proving_system} not supported for ${circuit}` 
            });
        }
        
        try {
            // Add job to queue
            const job = await proofQueue.add('generate_proof', {
                circuitName: circuit,
                provingSystem: proving_system,
                inputs,
                userId: req.user?.id,
            }, {
                priority: priority === 'high' ? 10 : priority === 'low' ? -10 : 0,
            });
            
            res.json({
                jobId: job.id,
                status: 'queued',
                estimatedTime: '30-60 seconds',
                message: 'Proof generation started',
            });
            
        } catch (error) {
            logger.error('Error queueing proof generation:', error);
            res.status(500).json({ error: 'Failed to queue proof generation' });
        }
    }
);

// Generate proof (synchronous - for testing)
app.post('/api/proof/generate-sync/:circuit',
    validateProofRequest(''),
    async (req, res) => {
        const { circuit } = req.params;
        const { proving_system, inputs } = req.body;
        
        if (!CIRCUITS[circuit]) {
            return res.status(404).json({ error: 'Circuit not found' });
        }
        
        try {
            const result = await generateProof(circuit, proving_system, inputs);
            res.json({
                success: true,
                ...result,
            });
            
        } catch (error) {
            logger.error('Synchronous proof generation failed:', error);
            res.status(500).json({ 
                error: 'Proof generation failed',
                details: config.environment === 'development' ? error.message : undefined
            });
        }
    }
);

// Get job status
app.get('/api/proof/status/:jobId', async (req, res) => {
    const { jobId } = req.params;
    
    try {
        const job = await proofQueue.getJob(jobId);
        
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        
        const state = await job.getState();
        
        let result = {
            jobId: job.id,
            status: state,
            progress: job.progress(),
            createdAt: new Date(job.timestamp).toISOString(),
        };
        
        if (state === 'completed') {
            result.proof = job.returnvalue;
        } else if (state === 'failed') {
            result.error = job.failedReason;
        }
        
        res.json(result);
        
    } catch (error) {
        logger.error('Error checking job status:', error);
        res.status(500).json({ error: 'Failed to check job status' });
    }
});

// Verify proof
app.post('/api/proof/verify/:circuit', [
    body('proving_system').isIn(['groth16', 'plonk']),
    body('proof').isObject(),
    body('public_signals').isArray(),
], async (req, res) => {
    const { circuit } = req.params;
    const { proving_system, proof, public_signals } = req.body;
    
    if (!CIRCUITS[circuit]) {
        return res.status(404).json({ error: 'Circuit not found' });
    }
    
    try {
        const isValid = await verifyProof(circuit, proving_system, proof, public_signals);
        
        res.json({
            valid: isValid,
            circuit,
            proving_system,
            verified_at: new Date().toISOString(),
        });
        
    } catch (error) {
        logger.error('Proof verification failed:', error);
        res.status(500).json({ 
            error: 'Verification failed',
            details: config.environment === 'development' ? error.message : undefined
        });
    }
});

// Get verification key
app.get('/api/circuits/:circuit/vkey/:proving_system', async (req, res) => {
    const { circuit, proving_system } = req.params;
    
    if (!CIRCUITS[circuit] || !CIRCUITS[circuit].provingSystems.includes(proving_system)) {
        return res.status(404).json({ error: 'Circuit or proving system not found' });
    }
    
    try {
        const { vkeyPath } = getCircuitPaths(circuit, proving_system);
        const vKey = JSON.parse(await fs.readFile(vkeyPath, 'utf8'));
        
        res.json({
            circuit,
            proving_system,
            verification_key: vKey,
        });
        
    } catch (error) {
        logger.error('Error reading verification key:', error);
        res.status(500).json({ error: 'Failed to read verification key' });
    }
});

// Queue monitoring
app.get('/api/queue/stats', async (req, res) => {
    try {
        const [waiting, active, completed, failed] = await Promise.all([
            proofQueue.getWaiting(),
            proofQueue.getActive(),
            proofQueue.getCompleted(),
            proofQueue.getFailed(),
        ]);
        
        res.json({
            waiting: waiting.length,
            active: active.length,
            completed: completed.length,
            failed: failed.length,
            total: waiting.length + active.length + completed.length + failed.length,
        });
        
    } catch (error) {
        logger.error('Error getting queue stats:', error);
        res.status(500).json({ error: 'Failed to get queue statistics' });
    }
});

// Error handling
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        details: config.environment === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Graceful shutdown
const gracefulShutdown = async () => {
    logger.info('Shutting down gracefully...');
    
    try {
        await proofQueue.close();
        if (redis) await redis.quit();
        process.exit(0);
    } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
    }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const server = app.listen(config.port, () => {
    logger.info(`PersonaChain ZK Proof Service running on port ${config.port}`);
    logger.info(`Environment: ${config.environment}`);
    logger.info(`Available circuits: ${Object.keys(CIRCUITS).join(', ')}`);
});

export default app;