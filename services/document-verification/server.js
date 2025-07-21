/**
 * Document Verification Engine Server
 * Enterprise document verification supporting 3,500+ document types from 200+ countries
 * AI/ML validation with fraud detection and regulatory compliance
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import winston from 'winston';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';
import multer from 'multer';
import config from 'config';
import dotenv from 'dotenv';

// Import services
import DocumentClassificationService from './services/DocumentClassificationService.js';
import OCRExtractionService from './services/OCRExtractionService.js';
import FeatureExtractionService from './services/FeatureExtractionService.js';
import FraudDetectionService from './services/FraudDetectionService.js';
import ValidationService from './services/ValidationService.js';
import ComplianceService from './services/ComplianceService.js';
import DocumentDatabaseService from './services/DocumentDatabaseService.js';
import MLModelService from './services/MLModelService.js';
import ImageProcessingService from './services/ImageProcessingService.js';
import QualityAssessmentService from './services/QualityAssessmentService.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Application configuration
const PORT = process.env.PORT || 3007;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Document verification configuration
const config = {
    server: {
        port: PORT,
        environment: NODE_ENV,
        cors: {
            origin: process.env.CORS_ORIGIN || '*',
            credentials: true
        },
        rateLimit: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 1000, // limit each IP to 1000 requests per windowMs
            standardHeaders: true,
            legacyHeaders: false
        }
    },
    verification: {
        supportedTypes: 3500,
        supportedCountries: 200,
        maxFileSize: 50 * 1024 * 1024, // 50MB
        maxFiles: 10,
        processingTimeout: 30000, // 30 seconds
        qualityThreshold: 0.8,
        confidenceThreshold: 0.85,
        fraudThreshold: 0.9
    },
    ml: {
        models: {
            classification: process.env.ML_CLASSIFICATION_MODEL || 'models/document-classifier.onnx',
            ocr: process.env.ML_OCR_MODEL || 'models/ocr-enhanced.onnx',
            fraud: process.env.ML_FRAUD_MODEL || 'models/fraud-detection.onnx',
            quality: process.env.ML_QUALITY_MODEL || 'models/quality-assessment.onnx',
            features: process.env.ML_FEATURES_MODEL || 'models/feature-extraction.onnx'
        },
        inference: {
            batchSize: 32,
            maxConcurrency: 8,
            memoryLimit: '2GB',
            timeoutMs: 5000
        }
    },
    storage: {
        tempDir: process.env.TEMP_DIR || '/tmp/document-verification',
        resultsDir: process.env.RESULTS_DIR || './results',
        modelsDir: process.env.MODELS_DIR || './models',
        templatesDir: process.env.TEMPLATES_DIR || './templates',
        retention: {
            tempFiles: 60 * 60 * 1000, // 1 hour
            results: 30 * 24 * 60 * 60 * 1000, // 30 days
            auditLogs: 7 * 365 * 24 * 60 * 60 * 1000 // 7 years
        }
    },
    external: {
        aws: {
            textract: {
                region: process.env.AWS_REGION || 'us-east-1',
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            },
            rekognition: {
                region: process.env.AWS_REGION || 'us-east-1',
                faceMatchThreshold: 85
            }
        },
        azure: {
            cognitiveServices: {
                endpoint: process.env.AZURE_COGNITIVE_ENDPOINT,
                apiKey: process.env.AZURE_COGNITIVE_KEY,
                region: process.env.AZURE_REGION || 'eastus'
            },
            formRecognizer: {
                endpoint: process.env.AZURE_FORM_RECOGNIZER_ENDPOINT,
                apiKey: process.env.AZURE_FORM_RECOGNIZER_KEY
            }
        },
        google: {
            vision: {
                projectId: process.env.GOOGLE_PROJECT_ID,
                keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
            },
            documentAI: {
                projectId: process.env.GOOGLE_PROJECT_ID,
                location: process.env.GOOGLE_LOCATION || 'us'
            }
        }
    },
    database: {
        mongodb: {
            uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/document-verification',
            options: {
                maxPoolSize: 10,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000
            }
        },
        redis: {
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD,
            db: process.env.REDIS_DB || 0
        }
    },
    monitoring: {
        metrics: {
            enabled: true,
            port: 9090,
            path: '/metrics'
        },
        logging: {
            level: process.env.LOG_LEVEL || 'info',
            format: 'json',
            maxFiles: 5,
            maxSize: '20m'
        },
        tracing: {
            enabled: process.env.TRACING_ENABLED === 'true',
            serviceName: 'document-verification',
            endpoint: process.env.JAEGER_ENDPOINT
        }
    }
};

// Configure Winston logger
const logger = winston.createLogger({
    level: config.monitoring.logging.level,
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'document-verification' },
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        }),
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 20 * 1024 * 1024,
            maxFiles: 5
        }),
        new winston.transports.File({
            filename: 'logs/combined.log',
            maxsize: 20 * 1024 * 1024,
            maxFiles: 5
        })
    ]
});

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet({
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
app.use(cors(config.server.cors));

// Rate limiting
const limiter = rateLimit({
    windowMs: config.server.rateLimit.windowMs,
    max: config.server.rateLimit.max,
    standardHeaders: config.server.rateLimit.standardHeaders,
    legacyHeaders: config.server.rateLimit.legacyHeaders,
    message: {
        error: 'Too many requests from this IP, please try again later',
        retryAfter: config.server.rateLimit.windowMs / 1000
    }
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(morgan('combined', {
    stream: {
        write: (message) => logger.info(message.trim())
    }
}));

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, config.storage.tempDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: config.verification.maxFileSize,
        files: config.verification.maxFiles
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff',
            'application/pdf', 'image/webp', 'image/svg+xml'
        ];
        
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Supported formats: JPEG, PNG, PDF, GIF, BMP, TIFF, WebP, SVG'), false);
        }
    }
});

// Initialize services
let services = {};

// Swagger configuration
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Document Verification Engine API',
            version: '1.0.0',
            description: 'Enterprise document verification supporting 3,500+ document types from 200+ countries',
            contact: {
                name: 'PersonaChain Team',
                url: 'https://personachain.com',
                email: 'support@personachain.com'
            }
        },
        servers: [
            {
                url: `http://localhost:${PORT}`,
                description: 'Development server'
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
        }
    },
    apis: ['./server.js', './routes/*.js']
};

const swaggerDocs = swaggerJSDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: NODE_ENV,
            version: '1.0.0',
            services: {}
        };

        // Check service health
        for (const [name, service] of Object.entries(services)) {
            try {
                if (service.healthCheck) {
                    health.services[name] = await service.healthCheck();
                } else {
                    health.services[name] = { status: 'healthy' };
                }
            } catch (error) {
                health.services[name] = { 
                    status: 'unhealthy', 
                    error: error.message 
                };
                health.status = 'degraded';
            }
        }

        res.json(health);
    } catch (error) {
        logger.error('Health check failed', { error: error.message });
        res.status(503).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * @swagger
 * /api/verify/single:
 *   post:
 *     summary: Verify a single document
 *     tags: [Document Verification]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               document:
 *                 type: string
 *                 format: binary
 *                 description: Document file to verify
 *               documentType:
 *                 type: string
 *                 description: Expected document type (optional)
 *               country:
 *                 type: string
 *                 description: Country code (optional)
 *               options:
 *                 type: object
 *                 description: Verification options
 *     responses:
 *       200:
 *         description: Document verification result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 verificationId:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [verified, rejected, requires_review]
 *                 confidence:
 *                   type: number
 *                 classification:
 *                   type: object
 *                 extractedData:
 *                   type: object
 *                 fraudAnalysis:
 *                   type: object
 *                 qualityAssessment:
 *                   type: object
 */
app.post('/api/verify/single', upload.single('document'), async (req, res) => {
    let verificationId = null;
    
    try {
        const startTime = Date.now();
        verificationId = crypto.randomUUID();
        
        logger.info('Starting document verification', {
            verificationId,
            filename: req.file?.originalname,
            fileSize: req.file?.size,
            mimeType: req.file?.mimetype
        });

        if (!req.file) {
            return res.status(400).json({
                error: 'No document file provided',
                verificationId
            });
        }

        const options = req.body.options ? JSON.parse(req.body.options) : {};
        const documentType = req.body.documentType;
        const country = req.body.country;

        // Process the document through the verification pipeline
        const result = await processDocumentVerification({
            verificationId,
            filePath: req.file.path,
            filename: req.file.originalname,
            mimeType: req.file.mimetype,
            documentType,
            country,
            options,
            services
        });

        const processingTime = Date.now() - startTime;
        result.processingTime = processingTime;
        result.timestamp = new Date().toISOString();

        logger.info('Document verification completed', {
            verificationId,
            status: result.status,
            confidence: result.confidence,
            processingTime
        });

        res.json(result);

    } catch (error) {
        logger.error('Document verification failed', {
            verificationId,
            error: error.message,
            stack: error.stack
        });

        res.status(500).json({
            error: 'Document verification failed',
            message: error.message,
            verificationId
        });
    }
});

/**
 * @swagger
 * /api/verify/batch:
 *   post:
 *     summary: Verify multiple documents in batch
 *     tags: [Document Verification]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               documents:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               options:
 *                 type: object
 *     responses:
 *       200:
 *         description: Batch verification results
 */
app.post('/api/verify/batch', upload.array('documents', config.verification.maxFiles), async (req, res) => {
    const batchId = crypto.randomUUID();
    
    try {
        const startTime = Date.now();
        
        logger.info('Starting batch document verification', {
            batchId,
            documentCount: req.files?.length || 0
        });

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                error: 'No document files provided',
                batchId
            });
        }

        const options = req.body.options ? JSON.parse(req.body.options) : {};
        const results = [];

        // Process documents in parallel with concurrency control
        const concurrency = Math.min(req.files.length, config.ml.inference.maxConcurrency);
        const chunks = [];
        
        for (let i = 0; i < req.files.length; i += concurrency) {
            chunks.push(req.files.slice(i, i + concurrency));
        }

        for (const chunk of chunks) {
            const chunkPromises = chunk.map(async (file, index) => {
                const verificationId = crypto.randomUUID();
                
                try {
                    const result = await processDocumentVerification({
                        verificationId,
                        filePath: file.path,
                        filename: file.originalname,
                        mimeType: file.mimetype,
                        options,
                        services
                    });
                    
                    return {
                        index: results.length + index,
                        filename: file.originalname,
                        result
                    };
                } catch (error) {
                    logger.error('Batch document verification failed for file', {
                        verificationId,
                        filename: file.originalname,
                        error: error.message
                    });
                    
                    return {
                        index: results.length + index,
                        filename: file.originalname,
                        result: {
                            verificationId,
                            status: 'error',
                            error: error.message
                        }
                    };
                }
            });

            const chunkResults = await Promise.all(chunkPromises);
            results.push(...chunkResults);
        }

        const processingTime = Date.now() - startTime;
        const successCount = results.filter(r => r.result.status === 'verified').length;
        const failureCount = results.filter(r => r.result.status === 'error').length;

        logger.info('Batch document verification completed', {
            batchId,
            totalDocuments: results.length,
            successCount,
            failureCount,
            processingTime
        });

        res.json({
            batchId,
            totalDocuments: results.length,
            successCount,
            failureCount,
            processingTime,
            timestamp: new Date().toISOString(),
            results
        });

    } catch (error) {
        logger.error('Batch document verification failed', {
            batchId,
            error: error.message,
            stack: error.stack
        });

        res.status(500).json({
            error: 'Batch document verification failed',
            message: error.message,
            batchId
        });
    }
});

/**
 * @swagger
 * /api/supported-documents:
 *   get:
 *     summary: Get list of supported document types and countries
 *     tags: [Document Information]
 *     responses:
 *       200:
 *         description: Supported documents information
 */
app.get('/api/supported-documents', async (req, res) => {
    try {
        const supportedDocuments = await services.documentDatabase.getSupportedDocuments();
        
        res.json({
            totalTypes: supportedDocuments.totalTypes,
            totalCountries: supportedDocuments.totalCountries,
            categories: supportedDocuments.categories,
            countries: supportedDocuments.countries,
            documentTypes: supportedDocuments.documentTypes,
            lastUpdated: supportedDocuments.lastUpdated
        });
    } catch (error) {
        logger.error('Failed to get supported documents', { error: error.message });
        res.status(500).json({
            error: 'Failed to retrieve supported documents',
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/verification/{verificationId}:
 *   get:
 *     summary: Get verification result by ID
 *     tags: [Document Verification]
 *     parameters:
 *       - in: path
 *         name: verificationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Verification result
 */
app.get('/api/verification/:verificationId', async (req, res) => {
    try {
        const { verificationId } = req.params;
        const result = await services.validation.getVerificationResult(verificationId);
        
        if (!result) {
            return res.status(404).json({
                error: 'Verification result not found',
                verificationId
            });
        }
        
        res.json(result);
    } catch (error) {
        logger.error('Failed to get verification result', {
            verificationId: req.params.verificationId,
            error: error.message
        });
        
        res.status(500).json({
            error: 'Failed to retrieve verification result',
            message: error.message
        });
    }
});

/**
 * Core document verification pipeline
 */
async function processDocumentVerification({
    verificationId,
    filePath,
    filename,
    mimeType,
    documentType = null,
    country = null,
    options = {},
    services
}) {
    const pipeline = {
        verificationId,
        filename,
        status: 'processing',
        confidence: 0,
        classification: null,
        extractedData: null,
        fraudAnalysis: null,
        qualityAssessment: null,
        compliance: null,
        errors: [],
        warnings: []
    };

    try {
        // Step 1: Image preprocessing and quality assessment
        logger.debug('Step 1: Quality assessment', { verificationId });
        const qualityResult = await services.qualityAssessment.assessDocument(filePath);
        pipeline.qualityAssessment = qualityResult;
        
        if (qualityResult.score < config.verification.qualityThreshold) {
            pipeline.warnings.push(`Document quality below threshold: ${qualityResult.score}`);
        }

        // Step 2: Image processing and enhancement
        logger.debug('Step 2: Image processing', { verificationId });
        const processedImagePath = await services.imageProcessing.enhanceDocument(filePath, {
            qualityScore: qualityResult.score,
            enhancementLevel: qualityResult.score < 0.7 ? 'aggressive' : 'standard'
        });

        // Step 3: Document classification
        logger.debug('Step 3: Document classification', { verificationId });
        const classification = await services.documentClassification.classifyDocument(
            processedImagePath,
            { expectedType: documentType, country }
        );
        pipeline.classification = classification;

        if (classification.confidence < config.verification.confidenceThreshold) {
            pipeline.warnings.push(`Classification confidence below threshold: ${classification.confidence}`);
        }

        // Step 4: OCR and text extraction
        logger.debug('Step 4: OCR extraction', { verificationId });
        const ocrResult = await services.ocrExtraction.extractText(processedImagePath, {
            documentType: classification.documentType,
            country: classification.country,
            language: classification.language
        });
        pipeline.extractedData = ocrResult;

        // Step 5: Feature extraction for fraud detection
        logger.debug('Step 5: Feature extraction', { verificationId });
        const features = await services.featureExtraction.extractFeatures(processedImagePath, {
            documentType: classification.documentType,
            extractedText: ocrResult.text
        });

        // Step 6: Fraud detection and security analysis
        logger.debug('Step 6: Fraud detection', { verificationId });
        const fraudAnalysis = await services.fraudDetection.analyzeDocument({
            imagePath: processedImagePath,
            extractedData: ocrResult,
            features: features,
            classification: classification
        });
        pipeline.fraudAnalysis = fraudAnalysis;

        // Step 7: Document validation
        logger.debug('Step 7: Document validation', { verificationId });
        const validationResult = await services.validation.validateDocument({
            classification,
            extractedData: ocrResult,
            fraudAnalysis,
            qualityAssessment: qualityResult
        });

        // Step 8: Compliance checking
        logger.debug('Step 8: Compliance checking', { verificationId });
        const complianceResult = await services.compliance.checkCompliance({
            documentType: classification.documentType,
            country: classification.country,
            extractedData: ocrResult,
            validationResult
        });
        pipeline.compliance = complianceResult;

        // Calculate overall confidence and status
        const overallConfidence = calculateOverallConfidence({
            classification: classification.confidence,
            quality: qualityResult.score,
            fraud: 1 - fraudAnalysis.riskScore,
            validation: validationResult.confidence
        });

        const fraudRisk = fraudAnalysis.riskScore;
        
        // Determine final status
        let status = 'verified';
        if (fraudRisk > config.verification.fraudThreshold) {
            status = 'rejected';
        } else if (overallConfidence < config.verification.confidenceThreshold || 
                   qualityResult.score < config.verification.qualityThreshold) {
            status = 'requires_review';
        }

        pipeline.status = status;
        pipeline.confidence = overallConfidence;
        pipeline.fraudRiskScore = fraudRisk;

        // Store verification result
        await services.validation.storeVerificationResult(verificationId, pipeline);

        // Cleanup temporary files
        await services.imageProcessing.cleanup(processedImagePath);

        return pipeline;

    } catch (error) {
        pipeline.status = 'error';
        pipeline.errors.push(error.message);
        logger.error('Document verification pipeline failed', {
            verificationId,
            error: error.message,
            stack: error.stack
        });
        
        throw error;
    }
}

/**
 * Calculate overall confidence score
 */
function calculateOverallConfidence(scores) {
    const weights = {
        classification: 0.3,
        quality: 0.2,
        fraud: 0.3,
        validation: 0.2
    };

    return (
        scores.classification * weights.classification +
        scores.quality * weights.quality +
        scores.fraud * weights.fraud +
        scores.validation * weights.validation
    );
}

// Error handling middleware
app.use((error, req, res, next) => {
    logger.error('Unhandled error', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method
    });

    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: 'File too large',
                message: `Maximum file size is ${config.verification.maxFileSize / (1024 * 1024)}MB`
            });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                error: 'Too many files',
                message: `Maximum number of files is ${config.verification.maxFiles}`
            });
        }
    }

    res.status(500).json({
        error: 'Internal server error',
        message: NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        message: `The requested endpoint ${req.method} ${req.originalUrl} was not found`
    });
});

// Initialize services and start server
async function startServer() {
    try {
        logger.info('🚀 Initializing Document Verification Engine...');

        // Initialize services in order
        services.mlModel = new MLModelService(config, logger);
        await services.mlModel.initialize();

        services.imageProcessing = new ImageProcessingService(config, logger);
        await services.imageProcessing.initialize();

        services.qualityAssessment = new QualityAssessmentService(config, logger, services.mlModel);
        await services.qualityAssessment.initialize();

        services.documentClassification = new DocumentClassificationService(config, logger, services.mlModel);
        await services.documentClassification.initialize();

        services.ocrExtraction = new OCRExtractionService(config, logger);
        await services.ocrExtraction.initialize();

        services.featureExtraction = new FeatureExtractionService(config, logger, services.mlModel);
        await services.featureExtraction.initialize();

        services.fraudDetection = new FraudDetectionService(config, logger, services.mlModel);
        await services.fraudDetection.initialize();

        services.documentDatabase = new DocumentDatabaseService(config, logger);
        await services.documentDatabase.initialize();

        services.validation = new ValidationService(config, logger, services.documentDatabase);
        await services.validation.initialize();

        services.compliance = new ComplianceService(config, logger);
        await services.compliance.initialize();

        // Start the server
        app.listen(PORT, () => {
            logger.info('✅ Document Verification Engine started successfully', {
                port: PORT,
                environment: NODE_ENV,
                supportedDocuments: config.verification.supportedTypes,
                supportedCountries: config.verification.supportedCountries,
                apiDocs: `http://localhost:${PORT}/api-docs`
            });
        });

        // Graceful shutdown
        process.on('SIGTERM', async () => {
            logger.info('SIGTERM received, shutting down gracefully');
            
            // Close services
            for (const [name, service] of Object.entries(services)) {
                if (service.shutdown) {
                    try {
                        await service.shutdown();
                        logger.info(`${name} service shut down successfully`);
                    } catch (error) {
                        logger.error(`Failed to shut down ${name} service`, { error: error.message });
                    }
                }
            }
            
            process.exit(0);
        });

    } catch (error) {
        logger.error('❌ Failed to start Document Verification Engine', {
            error: error.message,
            stack: error.stack
        });
        process.exit(1);
    }
}

// Start the server
startServer();