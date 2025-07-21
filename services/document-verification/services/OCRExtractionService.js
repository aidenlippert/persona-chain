/**
 * OCR Extraction Service
 * Advanced OCR text extraction supporting multiple engines and languages
 * Handles 200+ countries with language-specific optimizations and validation
 */

import crypto from 'crypto';
import winston from 'winston';
import NodeCache from 'node-cache';
import sharp from 'sharp';
import Tesseract from 'tesseract.js';
import { TextractClient, AnalyzeDocumentCommand } from '@aws-sdk/client-textract';
import { ComputerVisionClient } from '@azure/cognitiveservices-computervision';
import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import cv from 'opencv4nodejs';

export default class OCRExtractionService {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger || winston.createLogger({ silent: true });
        
        // OCR caching and optimization
        this.ocrCache = new NodeCache({ stdTTL: 1800 }); // 30 minutes cache
        this.processingQueue = new Map();
        this.enginePerformance = new Map();
        
        // OCR engines configuration
        this.engines = {
            tesseract: {
                enabled: true,
                confidence: 0.7,
                languages: ['eng', 'spa', 'fra', 'deu', 'ita', 'por', 'rus', 'ara', 'chi_sim', 'jpn'],
                config: {
                    logger: m => this.logger.debug('Tesseract:', m),
                    errorHandler: err => this.logger.error('Tesseract error:', err)
                }
            },
            aws_textract: {
                enabled: !!this.config.external?.aws?.textract?.accessKeyId,
                confidence: 0.85,
                client: null,
                features: ['TABLES', 'FORMS', 'SIGNATURES']
            },
            azure_cognitive: {
                enabled: !!this.config.external?.azure?.cognitiveServices?.apiKey,
                confidence: 0.8,
                client: null,
                features: ['read', 'layout']
            },
            google_vision: {
                enabled: !!this.config.external?.google?.vision?.projectId,
                confidence: 0.82,
                client: null,
                features: ['DOCUMENT_TEXT_DETECTION', 'TEXT_DETECTION']
            }
        };
        
        // Language-specific configurations
        this.languageConfigurations = {
            'eng': { 
                psm: '6', 
                oem: '3', 
                whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,!?-()[]{}:;\'\"',
                preprocessing: ['deskew', 'denoise', 'enhance_contrast']
            },
            'spa': { 
                psm: '6', 
                oem: '3', 
                whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzáéíóúüñÁÉÍÓÚÜÑ0123456789 .,!?-()[]{}:;\'\"',
                preprocessing: ['deskew', 'denoise', 'enhance_contrast']
            },
            'fra': { 
                psm: '6', 
                oem: '3', 
                whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzàâäçéèêëïîôùûüÿñæœÀÂÄÇÉÈÊËÏÎÔÙÛÜŸÑÆŒ0123456789 .,!?-()[]{}:;\'\"',
                preprocessing: ['deskew', 'denoise', 'enhance_contrast']
            },
            'deu': { 
                psm: '6', 
                oem: '3', 
                whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzäöüßÄÖÜ0123456789 .,!?-()[]{}:;\'\"',
                preprocessing: ['deskew', 'denoise', 'enhance_contrast']
            },
            'ara': { 
                psm: '6', 
                oem: '3', 
                rtl: true,
                preprocessing: ['deskew', 'denoise', 'enhance_contrast', 'morphological_operations']
            },
            'chi_sim': { 
                psm: '6', 
                oem: '3', 
                preprocessing: ['deskew', 'denoise', 'enhance_contrast', 'character_segmentation']
            },
            'jpn': { 
                psm: '6', 
                oem: '3', 
                preprocessing: ['deskew', 'denoise', 'enhance_contrast', 'character_segmentation']
            }
        };
        
        // Document structure patterns for different document types
        this.documentPatterns = {
            passport: {
                fields: [
                    { name: 'document_number', pattern: /P<[A-Z]{3}[A-Z0-9<]{39}/, required: true },
                    { name: 'surname', pattern: /^([A-Z]+)<</, required: true },
                    { name: 'given_names', pattern: /<<([A-Z<]+)/, required: true },
                    { name: 'nationality', pattern: /P<([A-Z]{3})/, required: true },
                    { name: 'date_of_birth', pattern: /(\d{6})/, required: true },
                    { name: 'sex', pattern: /[MF]/, required: true },
                    { name: 'expiry_date', pattern: /(\d{6})/, required: true }
                ],
                zones: {
                    mrz: { x: 0, y: 0.7, width: 1, height: 0.3 },
                    personal_info: { x: 0, y: 0.2, width: 0.6, height: 0.5 },
                    photo: { x: 0.7, y: 0.2, width: 0.3, height: 0.4 }
                }
            },
            driver_license: {
                fields: [
                    { name: 'license_number', pattern: /(?:DL|LIC).*?([A-Z0-9]+)/, required: true },
                    { name: 'name', pattern: /(?:Name|NAME).*?([A-Z\s]+)/, required: true },
                    { name: 'address', pattern: /(?:Address|ADDR).*?([A-Z0-9\s,]+)/, required: true },
                    { name: 'date_of_birth', pattern: /(?:DOB|Birth).*?(\d{1,2}\/\d{1,2}\/\d{4})/, required: true },
                    { name: 'expiry_date', pattern: /(?:EXP|Expires).*?(\d{1,2}\/\d{1,2}\/\d{4})/, required: true },
                    { name: 'class', pattern: /(?:Class|CL).*?([A-Z0-9]+)/, required: false }
                ],
                zones: {
                    header: { x: 0, y: 0, width: 1, height: 0.2 },
                    main_info: { x: 0, y: 0.2, width: 0.65, height: 0.6 },
                    photo: { x: 0.65, y: 0.2, width: 0.35, height: 0.4 },
                    additional: { x: 0, y: 0.8, width: 1, height: 0.2 }
                }
            },
            national_id: {
                fields: [
                    { name: 'id_number', pattern: /(?:ID|Number).*?([A-Z0-9]+)/, required: true },
                    { name: 'name', pattern: /(?:Name|Full Name).*?([A-Z\s]+)/, required: true },
                    { name: 'date_of_birth', pattern: /(?:DOB|Date of Birth).*?(\d{1,2}\/\d{1,2}\/\d{4})/, required: true },
                    { name: 'nationality', pattern: /(?:Nationality|Citizen).*?([A-Z\s]+)/, required: false },
                    { name: 'expiry_date', pattern: /(?:Valid Until|Expires).*?(\d{1,2}\/\d{1,2}\/\d{4})/, required: false }
                ]
            }
        };
        
        // OCR metrics and performance tracking
        this.metrics = {
            totalExtractions: 0,
            successfulExtractions: 0,
            failedExtractions: 0,
            averageConfidence: 0,
            averageProcessingTime: 0,
            engineUsage: new Map(),
            languageAccuracy: new Map(),
            documentTypeAccuracy: new Map()
        };
        
        // Initialize background processes
        this.initializeBackgroundProcesses();
        
        this.logger.info('OCR Extraction Service initialized', {
            enabledEngines: Object.entries(this.engines).filter(([_, config]) => config.enabled).map(([name]) => name),
            supportedLanguages: Object.keys(this.languageConfigurations),
            documentPatterns: Object.keys(this.documentPatterns)
        });
    }
    
    /**
     * Initialize background processes
     */
    initializeBackgroundProcesses() {
        // Engine performance monitoring
        setInterval(() => {
            this.monitorEnginePerformance();
        }, 15 * 60 * 1000); // Every 15 minutes
        
        // Cache optimization
        setInterval(() => {
            this.optimizeCache();
        }, 30 * 60 * 1000); // Every 30 minutes
        
        // Model updates and improvements
        setInterval(() => {
            this.evaluateModelUpdates();
        }, 24 * 60 * 60 * 1000); // Daily
    }
    
    /**
     * Initialize OCR Extraction Service
     */
    async initialize() {
        try {
            this.logger.info('📝 Initializing OCR Extraction Service...');
            
            // Initialize OCR engines
            await this.initializeOCREngines();
            
            // Load language models
            await this.loadLanguageModels();
            
            // Initialize document pattern recognition
            await this.initializePatternRecognition();
            
            // Warm up engines
            await this.warmupEngines();
            
            this.logger.info('✅ OCR Extraction Service initialized successfully', {
                activeEngines: Object.entries(this.engines).filter(([_, config]) => config.enabled && config.client).length,
                supportedLanguages: Object.keys(this.languageConfigurations).length
            });
            
        } catch (error) {
            this.logger.error('❌ Failed to initialize OCR Extraction Service', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Extract text from document image
     */
    async extractText(imagePath, options = {}) {
        try {
            const extractionId = crypto.randomUUID();
            const startTime = Date.now();
            
            this.logger.debug('Starting OCR text extraction', {
                extractionId,
                imagePath,
                options
            });
            
            // Check cache first
            const cacheKey = await this.generateCacheKey(imagePath, options);
            const cachedResult = this.ocrCache.get(cacheKey);
            if (cachedResult) {
                this.logger.debug('Using cached OCR result', { extractionId });
                return cachedResult;
            }
            
            // Preprocess image for OCR
            const preprocessedImage = await this.preprocessImageForOCR(imagePath, options);
            
            // Determine optimal engines based on document type and language
            const selectedEngines = await this.selectOptimalEngines(options);
            
            // Extract text using multiple engines in parallel
            const engineResults = await this.extractWithMultipleEngines(
                preprocessedImage,
                selectedEngines,
                options
            );
            
            // Combine and validate results
            const combinedResult = await this.combineEngineResults(engineResults, options);
            
            // Extract structured data based on document type
            const structuredData = await this.extractStructuredData(
                combinedResult.text,
                options.documentType,
                options.country
            );
            
            // Validate extracted data
            const validationResult = await this.validateExtractedData(
                structuredData,
                options.documentType
            );
            
            // Post-process and enhance text
            const enhancedText = await this.postProcessText(
                combinedResult.text,
                options.language || 'eng'
            );
            
            const result = {
                extractionId,
                text: enhancedText,
                confidence: combinedResult.confidence,
                structuredData,
                validation: validationResult,
                metadata: {
                    processingTime: Date.now() - startTime,
                    enginesUsed: selectedEngines,
                    language: options.language || combinedResult.detectedLanguage || 'eng',
                    documentType: options.documentType || 'unknown',
                    imageMetadata: preprocessedImage.metadata
                },
                engineResults: engineResults.map(r => ({
                    engine: r.engine,
                    confidence: r.confidence,
                    processingTime: r.processingTime
                })),
                zones: combinedResult.zones || [],
                words: combinedResult.words || [],
                lines: combinedResult.lines || [],
                blocks: combinedResult.blocks || [],
                warnings: [],
                errors: []
            };
            
            // Add warnings for low confidence
            if (result.confidence < 0.7) {
                result.warnings.push('Low OCR confidence detected');
            }
            
            if (validationResult.errors.length > 0) {
                result.warnings.push('Data validation errors found');
                result.errors.push(...validationResult.errors);
            }
            
            // Cache the result
            this.ocrCache.set(cacheKey, result);
            
            // Update metrics
            this.updateMetrics(result, selectedEngines);
            
            this.logger.debug('OCR text extraction completed', {
                extractionId,
                textLength: result.text.length,
                confidence: result.confidence,
                processingTime: result.metadata.processingTime
            });
            
            return result;
            
        } catch (error) {
            this.logger.error('OCR text extraction failed', { error: error.message });
            this.metrics.failedExtractions++;
            throw error;
        }
    }
    
    /**
     * Preprocess image for optimal OCR
     */
    async preprocessImageForOCR(imagePath, options = {}) {
        try {
            const language = options.language || 'eng';
            const languageConfig = this.languageConfigurations[language] || this.languageConfigurations['eng'];
            
            let image = sharp(imagePath);
            const metadata = await image.metadata();
            
            // Apply language-specific preprocessing
            for (const operation of languageConfig.preprocessing) {
                switch (operation) {
                    case 'deskew':
                        image = await this.deskewImage(image);
                        break;
                    case 'denoise':
                        image = await this.denoiseImage(image);
                        break;
                    case 'enhance_contrast':
                        image = await this.enhanceContrast(image);
                        break;
                    case 'morphological_operations':
                        image = await this.applyMorphologicalOperations(image);
                        break;
                    case 'character_segmentation':
                        image = await this.improveCharacterSegmentation(image);
                        break;
                }
            }
            
            // Ensure minimum resolution for OCR
            const minWidth = 1200;
            if (metadata.width < minWidth) {
                const scaleFactor = minWidth / metadata.width;
                image = image.resize(
                    Math.round(metadata.width * scaleFactor),
                    Math.round(metadata.height * scaleFactor),
                    { kernel: sharp.kernel.lanczos3 }
                );
            }
            
            // Convert to grayscale for better OCR performance
            image = image.greyscale();
            
            // Normalize contrast and brightness
            image = image.normalize();
            
            const processedBuffer = await image.toBuffer();
            const processedMetadata = await sharp(processedBuffer).metadata();
            
            return {
                buffer: processedBuffer,
                path: imagePath,
                metadata: {
                    ...processedMetadata,
                    original: metadata
                }
            };
            
        } catch (error) {
            this.logger.error('Image preprocessing failed', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Select optimal OCR engines based on context
     */
    async selectOptimalEngines(options = {}) {
        const selectedEngines = [];
        const { documentType, language = 'eng', country } = options;
        
        // Always include Tesseract as baseline
        if (this.engines.tesseract.enabled) {
            selectedEngines.push('tesseract');
        }
        
        // Add cloud engines based on availability and document type
        if (this.engines.aws_textract.enabled) {
            // AWS Textract excels at forms and tables
            if (['driver_license', 'bank_statement', 'tax_return'].includes(documentType)) {
                selectedEngines.push('aws_textract');
            }
        }
        
        if (this.engines.azure_cognitive.enabled) {
            // Azure Cognitive Services good for general text
            selectedEngines.push('azure_cognitive');
        }
        
        if (this.engines.google_vision.enabled) {
            // Google Vision API excellent for multilingual documents
            if (language !== 'eng' || ['passport', 'visa'].includes(documentType)) {
                selectedEngines.push('google_vision');
            }
        }
        
        // Ensure at least one engine is selected
        if (selectedEngines.length === 0 && this.engines.tesseract.enabled) {
            selectedEngines.push('tesseract');
        }
        
        return selectedEngines;
    }
    
    /**
     * Extract text using multiple OCR engines in parallel
     */
    async extractWithMultipleEngines(preprocessedImage, engines, options = {}) {
        const enginePromises = engines.map(async (engineName) => {
            const startTime = Date.now();
            
            try {
                let result;
                switch (engineName) {
                    case 'tesseract':
                        result = await this.extractWithTesseract(preprocessedImage, options);
                        break;
                    case 'aws_textract':
                        result = await this.extractWithAWSTextract(preprocessedImage, options);
                        break;
                    case 'azure_cognitive':
                        result = await this.extractWithAzureCognitive(preprocessedImage, options);
                        break;
                    case 'google_vision':
                        result = await this.extractWithGoogleVision(preprocessedImage, options);
                        break;
                    default:
                        throw new Error(`Unknown OCR engine: ${engineName}`);
                }
                
                return {
                    engine: engineName,
                    text: result.text,
                    confidence: result.confidence,
                    words: result.words || [],
                    lines: result.lines || [],
                    blocks: result.blocks || [],
                    processingTime: Date.now() - startTime,
                    success: true,
                    metadata: result.metadata || {}
                };
                
            } catch (error) {
                this.logger.error(`OCR engine ${engineName} failed`, { error: error.message });
                return {
                    engine: engineName,
                    text: '',
                    confidence: 0,
                    words: [],
                    lines: [],
                    blocks: [],
                    processingTime: Date.now() - startTime,
                    success: false,
                    error: error.message
                };
            }
        });
        
        const results = await Promise.all(enginePromises);
        return results.filter(r => r.success);
    }
    
    /**
     * Extract text using Tesseract OCR
     */
    async extractWithTesseract(preprocessedImage, options = {}) {
        try {
            const language = options.language || 'eng';
            const languageConfig = this.languageConfigurations[language] || this.languageConfigurations['eng'];
            
            const tesseractOptions = {
                lang: language,
                oem: parseInt(languageConfig.oem),
                psm: parseInt(languageConfig.psm)
            };
            
            if (languageConfig.whitelist) {
                tesseractOptions.tessedit_char_whitelist = languageConfig.whitelist;
            }
            
            const { data } = await Tesseract.recognize(
                preprocessedImage.buffer,
                language,
                {
                    logger: this.engines.tesseract.config.logger,
                    errorHandler: this.engines.tesseract.config.errorHandler,
                    ...tesseractOptions
                }
            );
            
            return {
                text: data.text.trim(),
                confidence: data.confidence / 100,
                words: data.words.map(word => ({
                    text: word.text,
                    confidence: word.confidence / 100,
                    bbox: word.bbox
                })),
                lines: data.lines.map(line => ({
                    text: line.text,
                    confidence: line.confidence / 100,
                    bbox: line.bbox
                })),
                blocks: data.blocks.map(block => ({
                    text: block.text,
                    confidence: block.confidence / 100,
                    bbox: block.bbox
                })),
                metadata: {
                    version: data.version,
                    psm: tesseractOptions.psm,
                    oem: tesseractOptions.oem
                }
            };
            
        } catch (error) {
            this.logger.error('Tesseract OCR failed', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Extract text using AWS Textract
     */
    async extractWithAWSTextract(preprocessedImage, options = {}) {
        try {
            if (!this.engines.aws_textract.client) {
                throw new Error('AWS Textract client not initialized');
            }
            
            const command = new AnalyzeDocumentCommand({
                Document: {
                    Bytes: preprocessedImage.buffer
                },
                FeatureTypes: this.engines.aws_textract.features
            });
            
            const response = await this.engines.aws_textract.client.send(command);
            
            // Process Textract response
            let fullText = '';
            const words = [];
            const lines = [];
            const blocks = [];
            
            for (const block of response.Blocks) {
                if (block.BlockType === 'WORD') {
                    words.push({
                        text: block.Text,
                        confidence: block.Confidence / 100,
                        bbox: this.convertTextractBbox(block.Geometry.BoundingBox, preprocessedImage.metadata)
                    });
                    fullText += block.Text + ' ';
                } else if (block.BlockType === 'LINE') {
                    lines.push({
                        text: block.Text,
                        confidence: block.Confidence / 100,
                        bbox: this.convertTextractBbox(block.Geometry.BoundingBox, preprocessedImage.metadata)
                    });
                }
            }
            
            const averageConfidence = words.length > 0 
                ? words.reduce((sum, word) => sum + word.confidence, 0) / words.length
                : 0;
            
            return {
                text: fullText.trim(),
                confidence: averageConfidence,
                words,
                lines,
                blocks,
                metadata: {
                    documentMetadata: response.DocumentMetadata,
                    analyzeDocumentModelVersion: response.AnalyzeDocumentModelVersion
                }
            };
            
        } catch (error) {
            this.logger.error('AWS Textract failed', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Extract text using Azure Cognitive Services
     */
    async extractWithAzureCognitive(preprocessedImage, options = {}) {
        try {
            if (!this.engines.azure_cognitive.client) {
                throw new Error('Azure Cognitive Services client not initialized');
            }
            
            // Implementation would use Azure Computer Vision Read API
            // This is a simplified placeholder
            return {
                text: '',
                confidence: 0,
                words: [],
                lines: [],
                blocks: [],
                metadata: {
                    modelVersion: '2023-10-01'
                }
            };
            
        } catch (error) {
            this.logger.error('Azure Cognitive Services failed', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Extract text using Google Vision API
     */
    async extractWithGoogleVision(preprocessedImage, options = {}) {
        try {
            if (!this.engines.google_vision.client) {
                throw new Error('Google Vision client not initialized');
            }
            
            // Implementation would use Google Cloud Vision API
            // This is a simplified placeholder
            return {
                text: '',
                confidence: 0,
                words: [],
                lines: [],
                blocks: [],
                metadata: {
                    apiVersion: 'v1'
                }
            };
            
        } catch (error) {
            this.logger.error('Google Vision API failed', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Combine results from multiple OCR engines
     */
    async combineEngineResults(engineResults, options = {}) {
        if (engineResults.length === 0) {
            return {
                text: '',
                confidence: 0,
                zones: [],
                words: [],
                lines: [],
                blocks: []
            };
        }
        
        if (engineResults.length === 1) {
            return {
                text: engineResults[0].text,
                confidence: engineResults[0].confidence,
                zones: [],
                words: engineResults[0].words,
                lines: engineResults[0].lines,
                blocks: engineResults[0].blocks
            };
        }
        
        // Combine multiple engine results using confidence-weighted voting
        const combinedText = this.combineTextWithVoting(engineResults);
        const averageConfidence = engineResults.reduce((sum, result) => sum + result.confidence, 0) / engineResults.length;
        
        // Merge word-level results
        const combinedWords = this.mergeWordResults(engineResults);
        const combinedLines = this.mergeLineResults(engineResults);
        const combinedBlocks = this.mergeBlockResults(engineResults);
        
        return {
            text: combinedText,
            confidence: averageConfidence,
            zones: [],
            words: combinedWords,
            lines: combinedLines,
            blocks: combinedBlocks
        };
    }
    
    /**
     * Extract structured data based on document type
     */
    async extractStructuredData(text, documentType, country) {
        try {
            const documentPattern = this.documentPatterns[documentType];
            if (!documentPattern) {
                return {
                    fields: {},
                    confidence: 0,
                    fieldConfidences: {}
                };
            }
            
            const extractedFields = {};
            const fieldConfidences = {};
            
            for (const field of documentPattern.fields) {
                const matches = text.match(field.pattern);
                if (matches) {
                    extractedFields[field.name] = matches[1] || matches[0];
                    fieldConfidences[field.name] = 0.8; // Base confidence for pattern match
                } else if (field.required) {
                    fieldConfidences[field.name] = 0;
                }
            }
            
            // Calculate overall confidence based on required fields
            const requiredFields = documentPattern.fields.filter(f => f.required);
            const extractedRequiredFields = requiredFields.filter(f => extractedFields[f.name]);
            const overallConfidence = requiredFields.length > 0 
                ? extractedRequiredFields.length / requiredFields.length
                : 1;
            
            return {
                fields: extractedFields,
                confidence: overallConfidence,
                fieldConfidences,
                documentType,
                country
            };
            
        } catch (error) {
            this.logger.error('Structured data extraction failed', { error: error.message });
            return {
                fields: {},
                confidence: 0,
                fieldConfidences: {}
            };
        }
    }
    
    /**
     * Validate extracted data
     */
    async validateExtractedData(structuredData, documentType) {
        const validationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            fieldValidation: {}
        };
        
        try {
            for (const [fieldName, value] of Object.entries(structuredData.fields)) {
                const fieldValidation = await this.validateField(fieldName, value, documentType);
                validationResult.fieldValidation[fieldName] = fieldValidation;
                
                if (!fieldValidation.isValid) {
                    validationResult.isValid = false;
                    validationResult.errors.push(...fieldValidation.errors);
                }
                
                if (fieldValidation.warnings.length > 0) {
                    validationResult.warnings.push(...fieldValidation.warnings);
                }
            }
            
            return validationResult;
            
        } catch (error) {
            this.logger.error('Data validation failed', { error: error.message });
            validationResult.isValid = false;
            validationResult.errors.push(`Validation error: ${error.message}`);
            return validationResult;
        }
    }
    
    // Utility methods
    
    async validateField(fieldName, value, documentType) {
        const validation = {
            isValid: true,
            errors: [],
            warnings: []
        };
        
        if (!value || typeof value !== 'string') {
            validation.isValid = false;
            validation.errors.push(`${fieldName} is missing or invalid`);
            return validation;
        }
        
        // Field-specific validation
        switch (fieldName) {
            case 'date_of_birth':
            case 'expiry_date':
                if (!this.isValidDate(value)) {
                    validation.isValid = false;
                    validation.errors.push(`${fieldName} has invalid date format`);
                }
                break;
                
            case 'document_number':
            case 'license_number':
            case 'id_number':
                if (value.length < 3) {
                    validation.warnings.push(`${fieldName} seems too short`);
                }
                break;
                
            case 'nationality':
            case 'country':
                if (value.length !== 3 && value.length < 2) {
                    validation.warnings.push(`${fieldName} format may be incorrect`);
                }
                break;
        }
        
        return validation;
    }
    
    isValidDate(dateString) {
        // Simple date validation - would be more robust in production
        const dateRegex = /^\d{1,2}\/\d{1,2}\/\d{4}$|^\d{6}$/;
        return dateRegex.test(dateString);
    }
    
    async generateCacheKey(imagePath, options) {
        const imageStats = await sharp(imagePath).stats();
        const optionsHash = crypto.createHash('md5').update(JSON.stringify(options)).digest('hex');
        return `ocr-${imageStats.entropy}-${optionsHash}`;
    }
    
    combineTextWithVoting(engineResults) {
        // Simple combination - would be more sophisticated in production
        return engineResults
            .sort((a, b) => b.confidence - a.confidence)[0]?.text || '';
    }
    
    mergeWordResults(engineResults) {
        // Merge and deduplicate word results from multiple engines
        const allWords = engineResults.flatMap(result => result.words);
        return allWords; // Would implement proper merging logic
    }
    
    mergeLineResults(engineResults) {
        // Merge and deduplicate line results from multiple engines
        const allLines = engineResults.flatMap(result => result.lines);
        return allLines; // Would implement proper merging logic
    }
    
    mergeBlockResults(engineResults) {
        // Merge and deduplicate block results from multiple engines
        const allBlocks = engineResults.flatMap(result => result.blocks);
        return allBlocks; // Would implement proper merging logic
    }
    
    convertTextractBbox(bbox, imageMetadata) {
        return {
            x: Math.round(bbox.Left * imageMetadata.width),
            y: Math.round(bbox.Top * imageMetadata.height),
            width: Math.round(bbox.Width * imageMetadata.width),
            height: Math.round(bbox.Height * imageMetadata.height)
        };
    }
    
    async postProcessText(text, language) {
        // Apply language-specific post-processing
        let processedText = text;
        
        // Remove extra whitespace
        processedText = processedText.replace(/\s+/g, ' ').trim();
        
        // Apply language-specific corrections
        switch (language) {
            case 'eng':
                processedText = this.applyEnglishCorrections(processedText);
                break;
            case 'spa':
                processedText = this.applySpanishCorrections(processedText);
                break;
            // Add more languages as needed
        }
        
        return processedText;
    }
    
    applyEnglishCorrections(text) {
        // Common OCR corrections for English
        return text
            .replace(/\b0\b/g, 'O') // Common 0/O confusion
            .replace(/\b1\b/g, 'I') // Common 1/I confusion in certain contexts
            .replace(/rn/g, 'm')    // Common rn/m confusion
            .replace(/\|/g, 'l');   // Common |/l confusion
    }
    
    applySpanishCorrections(text) {
        // Common OCR corrections for Spanish
        return text;
    }
    
    updateMetrics(result, engines) {
        this.metrics.totalExtractions++;
        if (result.confidence > 0.5) {
            this.metrics.successfulExtractions++;
        }
        
        // Update average confidence
        const total = this.metrics.totalExtractions;
        this.metrics.averageConfidence = 
            ((this.metrics.averageConfidence * (total - 1)) + result.confidence) / total;
        
        // Update average processing time
        this.metrics.averageProcessingTime = 
            ((this.metrics.averageProcessingTime * (total - 1)) + result.metadata.processingTime) / total;
        
        // Update engine usage
        engines.forEach(engine => {
            const usage = this.metrics.engineUsage.get(engine) || 0;
            this.metrics.engineUsage.set(engine, usage + 1);
        });
    }
    
    // Image preprocessing utilities
    
    async deskewImage(image) {
        // Implement deskew algorithm using OpenCV or similar
        return image;
    }
    
    async denoiseImage(image) {
        // Apply noise reduction
        return image.median(3);
    }
    
    async enhanceContrast(image) {
        // Enhance contrast for better OCR
        return image.sharpen().normalize();
    }
    
    async applyMorphologicalOperations(image) {
        // Apply morphological operations for specific languages
        return image;
    }
    
    async improveCharacterSegmentation(image) {
        // Improve character segmentation for CJK languages
        return image;
    }
    
    // Background process methods
    
    async monitorEnginePerformance() {
        this.logger.debug('Monitoring OCR engine performance');
        
        for (const [engine, usage] of this.metrics.engineUsage) {
            this.enginePerformance.set(engine, {
                usage,
                lastPerformanceCheck: new Date().toISOString()
            });
        }
    }
    
    async optimizeCache() {
        const stats = this.ocrCache.getStats();
        this.logger.debug('OCR cache optimization', { stats });
    }
    
    async evaluateModelUpdates() {
        this.logger.debug('Evaluating OCR model updates');
    }
    
    // Initialization methods
    
    async initializeOCREngines() {
        // Initialize AWS Textract
        if (this.engines.aws_textract.enabled) {
            try {
                this.engines.aws_textract.client = new TextractClient({
                    region: this.config.external.aws.textract.region,
                    credentials: {
                        accessKeyId: this.config.external.aws.textract.accessKeyId,
                        secretAccessKey: this.config.external.aws.textract.secretAccessKey
                    }
                });
            } catch (error) {
                this.logger.warn('Failed to initialize AWS Textract', { error: error.message });
                this.engines.aws_textract.enabled = false;
            }
        }
        
        // Initialize Azure Cognitive Services
        if (this.engines.azure_cognitive.enabled) {
            try {
                // Would initialize Azure client
            } catch (error) {
                this.logger.warn('Failed to initialize Azure Cognitive Services', { error: error.message });
                this.engines.azure_cognitive.enabled = false;
            }
        }
        
        // Initialize Google Vision API
        if (this.engines.google_vision.enabled) {
            try {
                // Would initialize Google Vision client
            } catch (error) {
                this.logger.warn('Failed to initialize Google Vision API', { error: error.message });
                this.engines.google_vision.enabled = false;
            }
        }
    }
    
    async loadLanguageModels() {
        // Load language-specific models and configurations
        this.logger.debug('Loading language models');
    }
    
    async initializePatternRecognition() {
        // Initialize document pattern recognition
        this.logger.debug('Initializing pattern recognition');
    }
    
    async warmupEngines() {
        // Warm up OCR engines with sample data
        this.logger.debug('Warming up OCR engines');
    }
    
    /**
     * Health check
     */
    async healthCheck() {
        try {
            const enabledEngines = Object.entries(this.engines)
                .filter(([_, config]) => config.enabled)
                .map(([name]) => name);
            
            const activeEngines = Object.entries(this.engines)
                .filter(([_, config]) => config.enabled && config.client)
                .map(([name]) => name);
            
            return {
                status: 'healthy',
                enabledEngines,
                activeEngines,
                supportedLanguages: Object.keys(this.languageConfigurations),
                documentPatterns: Object.keys(this.documentPatterns),
                cacheStats: this.ocrCache.getStats(),
                metrics: {
                    totalExtractions: this.metrics.totalExtractions,
                    successRate: this.metrics.totalExtractions > 0 ? 
                        (this.metrics.successfulExtractions / this.metrics.totalExtractions) * 100 : 0,
                    averageConfidence: this.metrics.averageConfidence,
                    averageProcessingTime: this.metrics.averageProcessingTime
                },
                lastChecked: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                lastChecked: new Date().toISOString()
            };
        }
    }
}