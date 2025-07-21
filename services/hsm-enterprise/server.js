/**
 * HSM Enterprise Integration Server
 * FIPS 140-2 Level 3 Hardware Security Module Integration
 * Enterprise-grade key management with AWS CloudHSM, Azure HSM, and Thales Luna
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import winston from 'winston';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import crypto from 'crypto';

// Import HSM services
import HSMProviderFactory from './services/HSMProviderFactory.js';
import KeyManagementService from './services/KeyManagementService.js';
import CertificateAuthorityService from './services/CertificateAuthorityService.js';
import ComplianceService from './services/ComplianceService.js';
import AuditService from './services/AuditService.js';
import PerformanceMonitoringService from './services/PerformanceMonitoringService.js';
import SecureStorageService from './services/SecureStorageService.js';
import BackupRecoveryService from './services/BackupRecoveryService.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || "*",
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true
    }
});

// Configuration
const config = {
    port: process.env.PORT || 3007,
    environment: process.env.NODE_ENV || 'development',
    jwtSecret: process.env.JWT_SECRET || 'fallback-secret-for-development',
    
    // HSM Configuration
    hsm: {
        provider: process.env.HSM_PROVIDER || 'aws', // aws, azure, gcp, thales, softhsm
        fipsLevel: process.env.FIPS_LEVEL || '140-2-level-3',
        keyRotationInterval: parseInt(process.env.KEY_ROTATION_INTERVAL) || 90 * 24 * 60 * 60 * 1000, // 90 days
        backupInterval: parseInt(process.env.BACKUP_INTERVAL) || 24 * 60 * 60 * 1000, // 24 hours
        auditLevel: process.env.AUDIT_LEVEL || 'detailed',
        performanceMonitoring: process.env.PERFORMANCE_MONITORING === 'true',
    },
    
    // AWS CloudHSM Configuration
    aws: {
        region: process.env.AWS_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        cloudHsmClusterId: process.env.AWS_CLOUDHSM_CLUSTER_ID,
        kmsKeyId: process.env.AWS_KMS_KEY_ID,
        ssmParameterStore: process.env.AWS_SSM_PARAMETER_STORE === 'true',
    },
    
    // Azure Key Vault Configuration
    azure: {
        tenantId: process.env.AZURE_TENANT_ID,
        clientId: process.env.AZURE_CLIENT_ID,
        clientSecret: process.env.AZURE_CLIENT_SECRET,
        keyVaultUrl: process.env.AZURE_KEYVAULT_URL,
        managedHsmUrl: process.env.AZURE_MANAGED_HSM_URL,
        subscriptionId: process.env.AZURE_SUBSCRIPTION_ID,
    },
    
    // Google Cloud HSM Configuration
    gcp: {
        projectId: process.env.GCP_PROJECT_ID,
        keyRingId: process.env.GCP_KEY_RING_ID,
        locationId: process.env.GCP_LOCATION_ID || 'global',
        serviceAccountPath: process.env.GCP_SERVICE_ACCOUNT_PATH,
    },
    
    // Thales Luna HSM Configuration
    thales: {
        networkHsmIp: process.env.THALES_NETWORK_HSM_IP,
        networkHsmPort: process.env.THALES_NETWORK_HSM_PORT || 1792,
        partitionName: process.env.THALES_PARTITION_NAME,
        partitionPassword: process.env.THALES_PARTITION_PASSWORD,
        clientCertPath: process.env.THALES_CLIENT_CERT_PATH,
        serverCertPath: process.env.THALES_SERVER_CERT_PATH,
    },
    
    // SoftHSM Configuration (for testing)
    softhsm: {
        libraryPath: process.env.SOFTHSM_LIBRARY_PATH || '/usr/lib/softhsm/libsofthsm2.so',
        slot: parseInt(process.env.SOFTHSM_SLOT) || 0,
        pin: process.env.SOFTHSM_PIN || '1234',
        tokenLabel: process.env.SOFTHSM_TOKEN_LABEL || 'persona-chain-token',
    },
    
    // Database Configuration
    databases: {
        redis: {
            url: process.env.REDIS_URL || 'redis://localhost:6379',
            keyPrefix: 'hsm:',
            ttl: 3600,
        },
        mongodb: {
            url: process.env.MONGODB_URL || 'mongodb://localhost:27017/hsm-enterprise',
            options: {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            }
        }
    },
    
    // Security Configuration
    security: {
        maxKeyAge: parseInt(process.env.MAX_KEY_AGE) || 365 * 24 * 60 * 60 * 1000, // 1 year
        keyUsageLimit: parseInt(process.env.KEY_USAGE_LIMIT) || 1000000,
        sessionTimeout: parseInt(process.env.SESSION_TIMEOUT) || 30 * 60 * 1000, // 30 minutes
        mfaRequired: process.env.MFA_REQUIRED === 'true',
        tlsMinVersion: process.env.TLS_MIN_VERSION || '1.3',
        cipherSuites: process.env.CIPHER_SUITES?.split(',') || [
            'TLS_AES_256_GCM_SHA384',
            'TLS_CHACHA20_POLY1305_SHA256',
            'TLS_AES_128_GCM_SHA256'
        ],
    },
    
    // Compliance Configuration
    compliance: {
        fips140Level: process.env.FIPS_140_LEVEL || '3',
        commonCriteria: process.env.COMMON_CRITERIA === 'true',
        cc_eal_level: process.env.CC_EAL_LEVEL || '4+',
        auditRetentionPeriod: parseInt(process.env.AUDIT_RETENTION_PERIOD) || 7 * 365 * 24 * 60 * 60 * 1000, // 7 years
        complianceReporting: process.env.COMPLIANCE_REPORTING === 'true',
        frameworks: process.env.COMPLIANCE_FRAMEWORKS?.split(',') || [
            'FIPS-140-2',
            'Common-Criteria',
            'NIST-CSF',
            'ISO-27001',
            'SOC-2',
            'FedRAMP'
        ]
    },
    
    // Performance Configuration
    performance: {
        maxConcurrentOperations: parseInt(process.env.MAX_CONCURRENT_OPERATIONS) || 1000,
        operationTimeout: parseInt(process.env.OPERATION_TIMEOUT) || 30000, // 30 seconds
        metricsCollection: process.env.METRICS_COLLECTION === 'true',
        performanceBaseline: {
            keyGeneration: 1000, // keys per second
            signing: 5000, // signatures per second
            verification: 10000, // verifications per second
            encryption: 50000, // operations per second
        }
    }
};

// Initialize logger
const logger = winston.createLogger({
    level: config.environment === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'hsm-enterprise' },
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        }),
        new winston.transports.File({ 
            filename: 'logs/hsm-error.log', 
            level: 'error' 
        }),
        new winston.transports.File({ 
            filename: 'logs/hsm-combined.log' 
        }),
        new winston.transports.File({ 
            filename: 'logs/hsm-audit.log',
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            )
        })
    ]
});

// Initialize HSM services
const services = {};

async function initializeServices() {
    try {
        logger.info('🔐 Initializing HSM Enterprise Services...');
        
        // Initialize HSM Provider Factory
        services.hsmProviderFactory = new HSMProviderFactory(config, logger);
        await services.hsmProviderFactory.initialize();
        
        // Initialize Key Management Service
        services.keyManagement = new KeyManagementService(config, logger, services.hsmProviderFactory);
        await services.keyManagement.initialize();
        
        // Initialize Certificate Authority Service
        services.certificateAuthority = new CertificateAuthorityService(config, logger, services.keyManagement);
        await services.certificateAuthority.initialize();
        
        // Initialize Compliance Service
        services.compliance = new ComplianceService(config, logger);
        await services.compliance.initialize();
        
        // Initialize Audit Service
        services.audit = new AuditService(config, logger);
        await services.audit.initialize();
        
        // Initialize Performance Monitoring Service
        services.performanceMonitoring = new PerformanceMonitoringService(config, logger);
        await services.performanceMonitoring.initialize();
        
        // Initialize Secure Storage Service
        services.secureStorage = new SecureStorageService(config, logger, services.keyManagement);
        await services.secureStorage.initialize();
        
        // Initialize Backup Recovery Service
        services.backupRecovery = new BackupRecoveryService(config, logger, services.keyManagement);
        await services.backupRecovery.initialize();
        
        logger.info('✅ All HSM services initialized successfully');
        
    } catch (error) {
        logger.error('❌ Failed to initialize HSM services', { error: error.message });
        throw error;
    }
}

// Swagger configuration
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'HSM Enterprise Integration API',
            version: '1.0.0',
            description: 'FIPS 140-2 Level 3 Hardware Security Module Integration for Enterprise Identity Infrastructure',
            contact: {
                name: 'PersonaChain Security Team',
                email: 'security@persona-chain.com',
                url: 'https://persona-chain.com'
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT'
            }
        },
        servers: [
            {
                url: process.env.API_BASE_URL || `http://localhost:${config.port}`,
                description: 'HSM Enterprise Integration Server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                },
                mTLS: {
                    type: 'mutualTLS'
                }
            }
        },
        security: [
            {
                bearerAuth: []
            }
        ]
    },
    apis: ['./server.js', './routes/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Enhanced Security Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            scriptSrc: ["'self'"],
            connectSrc: ["'self'", "wss:", "ws:"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

app.use(cors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Client-Cert'],
    credentials: true
}));

app.use(compression());

// Enhanced Rate limiting for HSM operations
const createRateLimiter = (windowMs, max, message) => rateLimit({
    windowMs,
    max: config.environment === 'production' ? max : max * 10,
    message: {
        error: message,
        retryAfter: Math.ceil(windowMs / 1000) + ' seconds'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Different rate limits for different operation types
app.use('/api/hsm/keys', createRateLimiter(60 * 1000, 100, 'Too many key operations'));
app.use('/api/hsm/sign', createRateLimiter(60 * 1000, 1000, 'Too many signing operations'));
app.use('/api/hsm/verify', createRateLimiter(60 * 1000, 5000, 'Too many verification operations'));
app.use('/api/hsm/encrypt', createRateLimiter(60 * 1000, 2000, 'Too many encryption operations'));
app.use('/api/hsm/certificates', createRateLimiter(60 * 1000, 50, 'Too many certificate operations'));

// General rate limiting
app.use(createRateLimiter(15 * 60 * 1000, 1000, 'Too many requests from this IP'));

// Request logging
app.use(morgan('combined', {
    stream: {
        write: (message) => logger.info(message.trim())
    }
}));

// Body parsing with size limits
app.use(express.json({ 
    limit: '10mb',
    verify: (req, res, buf) => {
        // Verify JSON integrity for sensitive operations
        if (req.path.includes('/api/hsm/')) {
            req.rawBody = buf;
        }
    }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'HSM Enterprise Integration API'
}));

// Health check endpoint with HSM status
app.get('/health', async (req, res) => {
    try {
        const healthStatus = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            environment: config.environment,
            fipsCompliance: config.hsm.fipsLevel,
            hsm: {
                provider: config.hsm.provider,
                available: false,
                lastCheck: new Date().toISOString()
            },
            services: {},
            metrics: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                cpu: process.cpuUsage(),
            }
        };

        // Check HSM availability
        if (services.hsmProviderFactory) {
            try {
                const hsmStatus = await services.hsmProviderFactory.checkHealth();
                healthStatus.hsm.available = hsmStatus.available;
                healthStatus.hsm.details = hsmStatus.details;
            } catch (error) {
                healthStatus.hsm.error = error.message;
            }
        }

        // Check all services
        for (const [serviceName, service] of Object.entries(services)) {
            try {
                if (service && typeof service.healthCheck === 'function') {
                    healthStatus.services[serviceName] = await service.healthCheck();
                }
            } catch (error) {
                healthStatus.services[serviceName] = {
                    status: 'unhealthy',
                    error: error.message
                };
            }
        }

        // Overall health assessment
        const serviceStatuses = Object.values(healthStatus.services).map(s => s.status);
        const allHealthy = serviceStatuses.every(status => status === 'healthy');
        
        if (!allHealthy || !healthStatus.hsm.available) {
            healthStatus.status = 'degraded';
        }

        const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(healthStatus);

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
 * /api/hsm/keys/generate:
 *   post:
 *     summary: Generate cryptographic key in HSM
 *     tags: [Key Management]
 *     security:
 *       - bearerAuth: []
 *       - mTLS: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - keyType
 *               - keySize
 *               - keyUsage
 *             properties:
 *               keyType:
 *                 type: string
 *                 enum: [RSA, ECC, AES, HMAC]
 *                 example: "RSA"
 *               keySize:
 *                 type: integer
 *                 enum: [2048, 3072, 4096, 256, 384, 521]
 *                 example: 4096
 *               keyUsage:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [sign, verify, encrypt, decrypt, wrap, unwrap]
 *                 example: ["sign", "verify"]
 *               keyLabel:
 *                 type: string
 *                 example: "identity-signing-key-2024"
 *               extractable:
 *                 type: boolean
 *                 default: false
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Key generated successfully
 *       400:
 *         description: Invalid request parameters
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: HSM operation failed
 */
app.post('/api/hsm/keys/generate', async (req, res) => {
    try {
        const { keyType, keySize, keyUsage, keyLabel, extractable, metadata } = req.body;
        
        // Audit log the key generation request
        await services.audit.logEvent({
            type: 'key_generation_requested',
            actor: req.user?.id || 'system',
            resource: 'hsm_key',
            action: 'generate',
            metadata: {
                keyType,
                keySize,
                keyUsage,
                keyLabel,
                extractable: extractable || false,
                requestId: crypto.randomUUID()
            },
            clientInfo: {
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            }
        });

        // Performance monitoring start
        const operationId = await services.performanceMonitoring.startOperation('key_generation', {
            keyType,
            keySize
        });

        // Generate key in HSM
        const keyResult = await services.keyManagement.generateKey({
            keyType,
            keySize,
            keyUsage,
            keyLabel: keyLabel || `${keyType}-${Date.now()}`,
            extractable: extractable || false,
            metadata: {
                ...metadata,
                createdBy: req.user?.id || 'system',
                createdAt: new Date().toISOString(),
                fipsCompliant: true
            }
        });

        // Performance monitoring end
        await services.performanceMonitoring.endOperation(operationId, {
            success: true,
            keyId: keyResult.keyId
        });

        // Compliance validation
        const complianceResult = await services.compliance.validateKeyGeneration(keyResult);
        if (!complianceResult.compliant) {
            throw new Error(`Key generation failed compliance validation: ${complianceResult.violations.join(', ')}`);
        }

        // Audit log successful generation
        await services.audit.logEvent({
            type: 'key_generated',
            actor: req.user?.id || 'system',
            resource: 'hsm_key',
            resourceId: keyResult.keyId,
            action: 'generate',
            outcome: 'success',
            metadata: {
                keyType,
                keySize,
                keyUsage,
                keyLabel: keyResult.keyLabel,
                compliance: complianceResult
            }
        });

        logger.info('HSM key generated successfully', {
            keyId: keyResult.keyId,
            keyType,
            keySize,
            actor: req.user?.id
        });

        res.status(201).json({
            success: true,
            keyId: keyResult.keyId,
            keyLabel: keyResult.keyLabel,
            publicKey: keyResult.publicKey,
            keyUsage: keyResult.keyUsage,
            fipsCompliant: true,
            compliance: complianceResult,
            createdAt: keyResult.createdAt,
            message: 'Cryptographic key generated successfully in HSM'
        });

    } catch (error) {
        // Performance monitoring error
        if (req.operationId) {
            await services.performanceMonitoring.endOperation(req.operationId, {
                success: false,
                error: error.message
            });
        }

        // Audit log failure
        await services.audit.logEvent({
            type: 'key_generation_failed',
            actor: req.user?.id || 'system',
            resource: 'hsm_key',
            action: 'generate',
            outcome: 'failure',
            metadata: {
                error: error.message,
                keyType: req.body.keyType,
                keySize: req.body.keySize
            }
        });

        logger.error('HSM key generation failed:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to generate cryptographic key in HSM'
        });
    }
});

/**
 * @swagger
 * /api/hsm/sign:
 *   post:
 *     summary: Sign data using HSM-stored private key
 *     tags: [Cryptographic Operations]
 *     security:
 *       - bearerAuth: []
 *       - mTLS: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - keyId
 *               - data
 *               - algorithm
 *             properties:
 *               keyId:
 *                 type: string
 *                 example: "hsm-key-123456"
 *               data:
 *                 type: string
 *                 description: Base64 encoded data to sign
 *               algorithm:
 *                 type: string
 *                 enum: [RSA-PSS, RSA-PKCS1, ECDSA, Ed25519]
 *                 example: "RSA-PSS"
 *               hashAlgorithm:
 *                 type: string
 *                 enum: [SHA-256, SHA-384, SHA-512]
 *                 default: "SHA-256"
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Data signed successfully
 *       400:
 *         description: Invalid request parameters
 *       404:
 *         description: Key not found
 *       500:
 *         description: Signing operation failed
 */
app.post('/api/hsm/sign', async (req, res) => {
    try {
        const { keyId, data, algorithm, hashAlgorithm, metadata } = req.body;

        // Validate key exists and has signing capability
        const keyInfo = await services.keyManagement.getKeyInfo(keyId);
        if (!keyInfo) {
            return res.status(404).json({
                success: false,
                error: 'Key not found',
                message: 'Specified key does not exist in HSM'
            });
        }

        if (!keyInfo.keyUsage.includes('sign')) {
            return res.status(403).json({
                success: false,
                error: 'Key not authorized for signing',
                message: 'Specified key does not have signing capability'
            });
        }

        // Audit log signing request
        await services.audit.logEvent({
            type: 'signing_requested',
            actor: req.user?.id || 'system',
            resource: 'hsm_key',
            resourceId: keyId,
            action: 'sign',
            metadata: {
                algorithm,
                hashAlgorithm: hashAlgorithm || 'SHA-256',
                dataSize: Buffer.from(data, 'base64').length,
                ...metadata
            }
        });

        // Performance monitoring
        const operationId = await services.performanceMonitoring.startOperation('signing', {
            keyId,
            algorithm,
            dataSize: Buffer.from(data, 'base64').length
        });

        // Perform signing operation
        const signatureResult = await services.keyManagement.sign({
            keyId,
            data: Buffer.from(data, 'base64'),
            algorithm: algorithm || 'RSA-PSS',
            hashAlgorithm: hashAlgorithm || 'SHA-256',
            metadata
        });

        // End performance monitoring
        await services.performanceMonitoring.endOperation(operationId, {
            success: true,
            signatureSize: signatureResult.signature.length
        });

        // Audit log successful signing
        await services.audit.logEvent({
            type: 'data_signed',
            actor: req.user?.id || 'system',
            resource: 'hsm_key',
            resourceId: keyId,
            action: 'sign',
            outcome: 'success',
            metadata: {
                algorithm,
                hashAlgorithm: signatureResult.hashAlgorithm,
                signatureSize: signatureResult.signature.length
            }
        });

        logger.info('Data signed successfully with HSM', {
            keyId,
            algorithm,
            actor: req.user?.id
        });

        res.json({
            success: true,
            signature: signatureResult.signature.toString('base64'),
            algorithm: signatureResult.algorithm,
            hashAlgorithm: signatureResult.hashAlgorithm,
            keyId,
            timestamp: signatureResult.timestamp,
            fipsCompliant: true,
            message: 'Data signed successfully using HSM'
        });

    } catch (error) {
        // Performance monitoring error
        if (req.operationId) {
            await services.performanceMonitoring.endOperation(req.operationId, {
                success: false,
                error: error.message
            });
        }

        // Audit log failure
        await services.audit.logEvent({
            type: 'signing_failed',
            actor: req.user?.id || 'system',
            resource: 'hsm_key',
            resourceId: req.body.keyId,
            action: 'sign',
            outcome: 'failure',
            metadata: {
                error: error.message,
                algorithm: req.body.algorithm
            }
        });

        logger.error('HSM signing operation failed:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to sign data using HSM'
        });
    }
});

// Certificate Authority endpoints
app.post('/api/hsm/certificates/generate', async (req, res) => {
    try {
        const certificateResult = await services.certificateAuthority.generateCertificate(req.body);
        
        res.status(201).json({
            success: true,
            ...certificateResult,
            message: 'Certificate generated successfully'
        });
    } catch (error) {
        logger.error('Certificate generation failed:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to generate certificate'
        });
    }
});

// Compliance endpoints
app.get('/api/hsm/compliance/status', async (req, res) => {
    try {
        const complianceStatus = await services.compliance.getComplianceStatus();
        res.json({
            success: true,
            ...complianceStatus
        });
    } catch (error) {
        logger.error('Failed to get compliance status:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Backup and Recovery endpoints
app.post('/api/hsm/backup', async (req, res) => {
    try {
        const backupResult = await services.backupRecovery.createBackup(req.body);
        res.json({
            success: true,
            ...backupResult,
            message: 'HSM backup created successfully'
        });
    } catch (error) {
        logger.error('HSM backup failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Performance metrics endpoint
app.get('/api/hsm/metrics', async (req, res) => {
    try {
        const metrics = await services.performanceMonitoring.getMetrics();
        res.json({
            success: true,
            metrics,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Failed to get HSM metrics:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// WebSocket connection handling for real-time HSM monitoring
io.on('connection', (socket) => {
    logger.info('HSM monitoring client connected', { socketId: socket.id });

    socket.on('join_hsm_monitoring', async (data) => {
        socket.join('hsm_monitoring');
        
        // Send current HSM status
        try {
            const hsmStatus = await services.hsmProviderFactory.checkHealth();
            socket.emit('hsm_status', hsmStatus);
        } catch (error) {
            socket.emit('hsm_error', { error: error.message });
        }
        
        logger.debug('Client joined HSM monitoring', { socketId: socket.id });
    });

    socket.on('get_performance_metrics', async () => {
        try {
            const metrics = await services.performanceMonitoring.getRealtimeMetrics();
            socket.emit('performance_metrics', metrics);
        } catch (error) {
            socket.emit('error', { message: 'Failed to get performance metrics' });
        }
    });

    socket.on('disconnect', () => {
        logger.info('HSM monitoring client disconnected', { socketId: socket.id });
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: err.details,
            message: 'Request data validation failed'
        });
    }
    
    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized',
            message: 'Authentication required'
        });
    }
    
    if (err.name === 'HSMOperationError') {
        return res.status(500).json({
            success: false,
            error: 'HSM operation failed',
            message: err.message,
            fipsCompliant: false
        });
    }
    
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'The requested resource was not found'
    });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, starting graceful shutdown');
    
    // Close HSM connections
    for (const service of Object.values(services)) {
        if (service && typeof service.shutdown === 'function') {
            try {
                await service.shutdown();
            } catch (error) {
                logger.error('Error during service shutdown:', error);
            }
        }
    }
    
    server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
    });
    
    // Force close after 30 seconds
    setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 30000);
});

// Initialize services and start server
const PORT = config.port;

initializeServices()
    .then(() => {
        server.listen(PORT, () => {
            logger.info('HSM Enterprise Integration Server started', {
                port: PORT,
                environment: config.environment,
                hsmProvider: config.hsm.provider,
                fipsLevel: config.hsm.fipsLevel,
                version: '1.0.0'
            });
            
            if (config.environment === 'development') {
                console.log(`
🔐 HSM Enterprise Integration Server Running
📍 Server: http://localhost:${PORT}
📚 API Docs: http://localhost:${PORT}/api-docs
🏥 Health: http://localhost:${PORT}/health
🔒 HSM Provider: ${config.hsm.provider}
🛡️ FIPS Level: ${config.hsm.fipsLevel}
🌍 Environment: ${config.environment}
                `);
            }
        });
    })
    .catch((error) => {
        logger.error('Failed to start HSM Enterprise Integration Server:', error);
        process.exit(1);
    });

export default app;