/**
 * Guardian Multi-Party Control Server
 * Enterprise governance with threshold signatures and approval workflows
 * Production-ready microservice for identity credential governance
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

// Import services
import GovernanceService from './services/GovernanceService.js';
import ThresholdSignatureService from './services/ThresholdSignatureService.js';
import ApprovalWorkflowService from './services/ApprovalWorkflowService.js';
import GuardianManagementService from './services/GuardianManagementService.js';
import PolicyEngineService from './services/PolicyEngineService.js';
import AuditService from './services/AuditService.js';
import NotificationService from './services/NotificationService.js';
import EncryptionService from './services/EncryptionService.js';

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
    port: process.env.PORT || 3006,
    environment: process.env.NODE_ENV || 'development',
    jwtSecret: process.env.JWT_SECRET || 'fallback-secret-for-development',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    mongoUrl: process.env.MONGODB_URL || 'mongodb://localhost:27017/guardian-multiparty',
    
    // Threshold signature configuration
    threshold: {
        defaultThreshold: parseInt(process.env.DEFAULT_THRESHOLD) || 3,
        maxGuardians: parseInt(process.env.MAX_GUARDIANS) || 10,
        minGuardians: parseInt(process.env.MIN_GUARDIANS) || 3,
        keyDerivationRounds: parseInt(process.env.KEY_DERIVATION_ROUNDS) || 100000,
    },
    
    // Governance configuration
    governance: {
        votingPeriod: parseInt(process.env.VOTING_PERIOD) || 7 * 24 * 60 * 60 * 1000, // 7 days
        quorumThreshold: parseFloat(process.env.QUORUM_THRESHOLD) || 0.6, // 60%
        approvalThreshold: parseFloat(process.env.APPROVAL_THRESHOLD) || 0.5, // 50%
        emergencyThreshold: parseFloat(process.env.EMERGENCY_THRESHOLD) || 0.8, // 80%
    },
    
    // Security configuration
    security: {
        maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
        lockoutDuration: parseInt(process.env.LOCKOUT_DURATION) || 15 * 60 * 1000, // 15 minutes
        sessionTimeout: parseInt(process.env.SESSION_TIMEOUT) || 24 * 60 * 60 * 1000, // 24 hours
        mfaRequired: process.env.MFA_REQUIRED === 'true',
    },
    
    // Notification configuration
    notifications: {
        slack: {
            webhook: process.env.SLACK_WEBHOOK_URL,
            channel: process.env.SLACK_CHANNEL || '#guardian-alerts',
        },
        discord: {
            webhook: process.env.DISCORD_WEBHOOK_URL,
        },
        email: {
            smtp: {
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT) || 587,
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                }
            }
        },
        sms: {
            twilio: {
                accountSid: process.env.TWILIO_ACCOUNT_SID,
                authToken: process.env.TWILIO_AUTH_TOKEN,
                fromNumber: process.env.TWILIO_FROM_NUMBER,
            }
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
    defaultMeta: { service: 'guardian-multiparty' },
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        }),
        new winston.transports.File({ 
            filename: 'logs/error.log', 
            level: 'error' 
        }),
        new winston.transports.File({ 
            filename: 'logs/combined.log' 
        })
    ]
});

// Initialize services
const services = {
    governance: new GovernanceService(config, logger),
    thresholdSignature: new ThresholdSignatureService(config, logger),
    approvalWorkflow: new ApprovalWorkflowService(config, logger),
    guardianManagement: new GuardianManagementService(config, logger),
    policyEngine: new PolicyEngineService(config, logger),
    audit: new AuditService(config, logger),
    notification: new NotificationService(config, logger),
    encryption: new EncryptionService(config, logger),
};

// Swagger configuration
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Guardian Multi-Party Control API',
            version: '1.0.0',
            description: 'Enterprise governance with threshold signatures and approval workflows',
            contact: {
                name: 'PersonaChain Team',
                email: 'dev@persona-chain.com',
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
                description: 'Guardian Multi-Party Control Server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
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

// Middleware setup
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
}));

app.use(cors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true
}));

app.use(compression());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: config.environment === 'production' ? 100 : 1000, // requests per window
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false
});

app.use(limiter);

// Request logging
app.use(morgan('combined', {
    stream: {
        write: (message) => logger.info(message.trim())
    }
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Guardian Multi-Party Control API'
}));

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        const healthStatus = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            environment: config.environment,
            services: {
                governance: await services.governance.healthCheck(),
                thresholdSignature: await services.thresholdSignature.healthCheck(),
                approvalWorkflow: await services.approvalWorkflow.healthCheck(),
                guardianManagement: await services.guardianManagement.healthCheck(),
                policyEngine: await services.policyEngine.healthCheck(),
                audit: await services.audit.healthCheck(),
                notification: await services.notification.healthCheck(),
                encryption: await services.encryption.healthCheck(),
            },
            metrics: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                cpu: process.cpuUsage(),
            }
        };

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
 * /api/governance/proposals:
 *   post:
 *     summary: Create a new governance proposal
 *     tags: [Governance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - type
 *               - actions
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Add New Guardian"
 *               description:
 *                 type: string
 *                 example: "Proposal to add Alice as a new guardian with credential management permissions"
 *               type:
 *                 type: string
 *                 enum: [guardian_addition, guardian_removal, policy_update, emergency_action]
 *               actions:
 *                 type: array
 *                 items:
 *                   type: object
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Proposal created successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
app.post('/api/governance/proposals', async (req, res) => {
    try {
        const { title, description, type, actions, metadata } = req.body;
        
        const proposal = await services.governance.createProposal({
            title,
            description,
            type,
            actions,
            metadata,
            proposer: req.user?.id || 'system',
            timestamp: new Date().toISOString()
        });

        // Send notifications to guardians
        await services.notification.notifyGuardians('proposal_created', {
            proposalId: proposal.id,
            title,
            type,
            proposer: req.user?.name || 'System'
        });

        // Audit log
        await services.audit.logEvent({
            type: 'proposal_created',
            actor: req.user?.id || 'system',
            resource: 'proposal',
            resourceId: proposal.id,
            metadata: { title, type }
        });

        logger.info('Governance proposal created', { 
            proposalId: proposal.id, 
            type, 
            proposer: req.user?.id 
        });

        res.status(201).json({
            success: true,
            proposal,
            message: 'Proposal created successfully'
        });

    } catch (error) {
        logger.error('Failed to create proposal:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to create proposal'
        });
    }
});

/**
 * @swagger
 * /api/governance/proposals/{proposalId}/vote:
 *   post:
 *     summary: Vote on a governance proposal
 *     tags: [Governance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: proposalId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vote
 *               - signature
 *             properties:
 *               vote:
 *                 type: string
 *                 enum: [approve, reject, abstain]
 *               signature:
 *                 type: string
 *                 description: Cryptographic signature of the vote
 *               comments:
 *                 type: string
 *                 description: Optional comments explaining the vote
 *     responses:
 *       200:
 *         description: Vote recorded successfully
 *       400:
 *         description: Invalid vote data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Proposal not found
 */
app.post('/api/governance/proposals/:proposalId/vote', async (req, res) => {
    try {
        const { proposalId } = req.params;
        const { vote, signature, comments } = req.body;
        const guardianId = req.user?.id || 'test-guardian';

        // Verify guardian has permission to vote
        const guardian = await services.guardianManagement.getGuardian(guardianId);
        if (!guardian || !guardian.active) {
            return res.status(403).json({
                success: false,
                error: 'Guardian not authorized to vote',
                message: 'Only active guardians can vote on proposals'
            });
        }

        // Verify signature
        const voteValid = await services.thresholdSignature.verifyGuardianSignature(
            guardianId,
            { proposalId, vote },
            signature
        );

        if (!voteValid) {
            return res.status(400).json({
                success: false,
                error: 'Invalid signature',
                message: 'Vote signature verification failed'
            });
        }

        // Record vote
        const voteResult = await services.governance.recordVote(proposalId, {
            guardianId,
            vote,
            signature,
            comments,
            timestamp: new Date().toISOString()
        });

        // Check if proposal is ready for execution
        const proposal = await services.governance.getProposal(proposalId);
        if (proposal.status === 'approved') {
            await services.approvalWorkflow.executeProposal(proposalId);
        }

        // Audit log
        await services.audit.logEvent({
            type: 'vote_cast',
            actor: guardianId,
            resource: 'proposal',
            resourceId: proposalId,
            metadata: { vote, comments }
        });

        logger.info('Vote recorded', { 
            proposalId, 
            guardianId, 
            vote,
            status: proposal.status
        });

        res.json({
            success: true,
            vote: voteResult,
            proposal: {
                id: proposal.id,
                status: proposal.status,
                voteCount: proposal.votes?.length || 0,
                requiredVotes: proposal.requiredVotes
            },
            message: 'Vote recorded successfully'
        });

    } catch (error) {
        logger.error('Failed to record vote:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to record vote'
        });
    }
});

/**
 * @swagger
 * /api/threshold/sign:
 *   post:
 *     summary: Create threshold signature for credential issuance
 *     tags: [Threshold Signatures]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - credentialData
 *               - threshold
 *               - guardians
 *             properties:
 *               credentialData:
 *                 type: object
 *                 description: W3C Verifiable Credential to be signed
 *               threshold:
 *                 type: integer
 *                 minimum: 2
 *                 description: Number of signatures required
 *               guardians:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of guardian IDs to participate
 *               metadata:
 *                 type: object
 *                 description: Additional signing metadata
 *     responses:
 *       200:
 *         description: Threshold signature process initiated
 *       400:
 *         description: Invalid signing request
 *       401:
 *         description: Unauthorized
 */
app.post('/api/threshold/sign', async (req, res) => {
    try {
        const { credentialData, threshold, guardians, metadata } = req.body;

        // Validate signing request
        const validation = await services.policyEngine.validateSigningRequest({
            credentialData,
            threshold,
            guardians,
            requester: req.user?.id || 'system'
        });

        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: 'Invalid signing request',
                details: validation.errors,
                message: 'Signing request does not meet policy requirements'
            });
        }

        // Initiate threshold signature process
        const signingSession = await services.thresholdSignature.initiateSigning({
            credentialData,
            threshold,
            guardians,
            metadata,
            requester: req.user?.id || 'system',
            sessionId: crypto.randomUUID()
        });

        // Notify participating guardians
        await services.notification.notifySigningParticipants(guardians, {
            sessionId: signingSession.id,
            credentialType: credentialData.type,
            requester: req.user?.name || 'System'
        });

        // Audit log
        await services.audit.logEvent({
            type: 'threshold_signing_initiated',
            actor: req.user?.id || 'system',
            resource: 'signing_session',
            resourceId: signingSession.id,
            metadata: { threshold, guardians, credentialType: credentialData.type }
        });

        logger.info('Threshold signing initiated', { 
            sessionId: signingSession.id,
            threshold,
            guardians: guardians.length
        });

        res.json({
            success: true,
            signingSession,
            message: 'Threshold signing process initiated'
        });

    } catch (error) {
        logger.error('Failed to initiate threshold signing:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to initiate threshold signing'
        });
    }
});

/**
 * @swagger
 * /api/threshold/sign/{sessionId}/participate:
 *   post:
 *     summary: Participate in threshold signature
 *     tags: [Threshold Signatures]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - partialSignature
 *               - guardianId
 *             properties:
 *               partialSignature:
 *                 type: string
 *                 description: Guardian's partial signature
 *               guardianId:
 *                 type: string
 *                 description: Guardian identifier
 *               nonce:
 *                 type: string
 *                 description: Cryptographic nonce
 *     responses:
 *       200:
 *         description: Partial signature accepted
 *       400:
 *         description: Invalid signature
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Signing session not found
 */
app.post('/api/threshold/sign/:sessionId/participate', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { partialSignature, guardianId, nonce } = req.body;

        // Verify guardian participation
        const session = await services.thresholdSignature.getSigningSession(sessionId);
        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Signing session not found',
                message: 'Invalid session ID'
            });
        }

        if (!session.guardians.includes(guardianId)) {
            return res.status(403).json({
                success: false,
                error: 'Guardian not authorized for this session',
                message: 'Only invited guardians can participate'
            });
        }

        // Verify partial signature
        const signatureValid = await services.thresholdSignature.verifyPartialSignature(
            sessionId,
            guardianId,
            partialSignature,
            nonce
        );

        if (!signatureValid) {
            return res.status(400).json({
                success: false,
                error: 'Invalid partial signature',
                message: 'Partial signature verification failed'
            });
        }

        // Add partial signature to session
        const participation = await services.thresholdSignature.addPartialSignature(
            sessionId,
            {
                guardianId,
                partialSignature,
                nonce,
                timestamp: new Date().toISOString()
            }
        );

        // Check if threshold is met
        const updatedSession = await services.thresholdSignature.getSigningSession(sessionId);
        if (updatedSession.signatures.length >= updatedSession.threshold) {
            // Combine signatures and complete credential
            const finalSignature = await services.thresholdSignature.combineSignatures(sessionId);
            const signedCredential = await services.thresholdSignature.finalizeCredential(
                sessionId,
                finalSignature
            );

            // Notify completion
            await services.notification.notifySigningCompletion(updatedSession.guardians, {
                sessionId,
                credentialId: signedCredential.id
            });
        }

        // Audit log
        await services.audit.logEvent({
            type: 'partial_signature_added',
            actor: guardianId,
            resource: 'signing_session',
            resourceId: sessionId,
            metadata: { signaturesCount: updatedSession.signatures.length }
        });

        logger.info('Partial signature added', { 
            sessionId,
            guardianId,
            totalSignatures: updatedSession.signatures.length,
            threshold: updatedSession.threshold
        });

        res.json({
            success: true,
            participation,
            session: {
                id: updatedSession.id,
                status: updatedSession.status,
                signaturesCount: updatedSession.signatures.length,
                threshold: updatedSession.threshold,
                isComplete: updatedSession.signatures.length >= updatedSession.threshold
            },
            message: 'Partial signature accepted'
        });

    } catch (error) {
        logger.error('Failed to process partial signature:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to process partial signature'
        });
    }
});

/**
 * @swagger
 * /api/guardians:
 *   get:
 *     summary: Get list of guardians
 *     tags: [Guardian Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of guardians retrieved
 *       401:
 *         description: Unauthorized
 */
app.get('/api/guardians', async (req, res) => {
    try {
        const guardians = await services.guardianManagement.getAllGuardians();
        
        res.json({
            success: true,
            guardians: guardians.map(guardian => ({
                id: guardian.id,
                name: guardian.name,
                email: guardian.email,
                role: guardian.role,
                status: guardian.status,
                lastActive: guardian.lastActive,
                permissions: guardian.permissions
            })),
            total: guardians.length,
            message: 'Guardians retrieved successfully'
        });

    } catch (error) {
        logger.error('Failed to get guardians:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to retrieve guardians'
        });
    }
});

/**
 * @swagger
 * /api/audit/logs:
 *   get:
 *     summary: Get audit logs
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: actor
 *         schema:
 *           type: string
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Audit logs retrieved
 *       401:
 *         description: Unauthorized
 */
app.get('/api/audit/logs', async (req, res) => {
    try {
        const {
            limit = 100,
            offset = 0,
            type,
            actor,
            fromDate,
            toDate
        } = req.query;

        const filters = {};
        if (type) filters.type = type;
        if (actor) filters.actor = actor;
        if (fromDate) filters.fromDate = new Date(fromDate);
        if (toDate) filters.toDate = new Date(toDate);

        const { logs, total } = await services.audit.getLogs({
            limit: parseInt(limit),
            offset: parseInt(offset),
            filters
        });

        res.json({
            success: true,
            logs,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: total > parseInt(offset) + parseInt(limit)
            },
            message: 'Audit logs retrieved successfully'
        });

    } catch (error) {
        logger.error('Failed to get audit logs:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to retrieve audit logs'
        });
    }
});

// WebSocket connection handling
io.on('connection', (socket) => {
    logger.info('Guardian connected via WebSocket', { socketId: socket.id });

    socket.on('join_guardian_room', (guardianId) => {
        socket.join(`guardian_${guardianId}`);
        logger.debug('Guardian joined room', { guardianId, socketId: socket.id });
    });

    socket.on('signing_status_update', async (data) => {
        try {
            const { sessionId, status, guardianId } = data;
            
            // Broadcast to other participants
            socket.to(`signing_${sessionId}`).emit('participant_status', {
                guardianId,
                status,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            logger.error('WebSocket signing status update failed:', error);
            socket.emit('error', { message: 'Failed to update signing status' });
        }
    });

    socket.on('disconnect', () => {
        logger.info('Guardian disconnected', { socketId: socket.id });
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

// Start server
const PORT = config.port;
server.listen(PORT, () => {
    logger.info('Guardian Multi-Party Control Server started', {
        port: PORT,
        environment: config.environment,
        version: '1.0.0'
    });
    
    if (config.environment === 'development') {
        console.log(`
🚀 Guardian Multi-Party Control Server Running
📍 Server: http://localhost:${PORT}
📚 API Docs: http://localhost:${PORT}/api-docs
🏥 Health: http://localhost:${PORT}/health
🔐 Environment: ${config.environment}
        `);
    }
});

export default app;