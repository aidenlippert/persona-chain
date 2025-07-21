/**
 * Image Processing Service
 * Advanced document image preprocessing and enhancement
 * Optimizes image quality for OCR and ML analysis
 */

import crypto from 'crypto';
import winston from 'winston';
import NodeCache from 'node-cache';
import sharp from 'sharp';
import cv from 'opencv4nodejs';
import { promises as fs } from 'fs';
import path from 'path';

export default class ImageProcessingService {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger || winston.createLogger({ silent: true });
        
        // Image processing caching and pipeline management
        this.processedImageCache = new NodeCache({ stdTTL: 1800 }); // 30 minutes cache
        this.processingPipelines = new Map();
        this.processingQueue = new Map();
        
        // Image enhancement algorithms and models
        this.enhancementAlgorithms = {
            denoising: {
                gaussian: { enabled: true, sigma: 1.0 },
                bilateral: { enabled: true, sigmaColor: 75, sigmaSpace: 75 },
                morphological: { enabled: true, kernelSize: 3 },
                wavelet: { enabled: false, levels: 3 }
            },
            contrast: {
                clahe: { enabled: true, clipLimit: 2.0, tileGridSize: 8 },
                histogram: { enabled: true, alpha: 1.2, beta: 10 },
                gamma: { enabled: true, gamma: 1.0 },
                adaptive: { enabled: true, adaptiveMethod: 'mean' }
            },
            sharpening: {
                unsharp: { enabled: true, amount: 1.5, radius: 1.0, threshold: 0 },
                laplacian: { enabled: true, kernelSize: 3 },
                highpass: { enabled: false, sigma: 1.0 }
            },
            correction: {
                perspective: { enabled: true, autoDetect: true },
                rotation: { enabled: true, autoDetect: true, threshold: 0.5 },
                skew: { enabled: true, autoDetect: true, tolerance: 2.0 },
                distortion: { enabled: true, autoDetect: true }
            },
            restoration: {
                inpainting: { enabled: true, method: 'telea', radius: 3 },
                scratch_removal: { enabled: true, threshold: 0.8 },
                fold_removal: { enabled: true, morphology: true },
                stain_removal: { enabled: true, colorSpace: 'lab' }
            }
        };
        
        // Document-specific processing pipelines
        this.documentPipelines = {
            passport: {
                preprocessing: ['denoising', 'contrast', 'perspective'],
                enhancement: ['sharpening', 'rotation_correction'],
                restoration: ['inpainting', 'stain_removal'],
                optimization: ['resolution_scaling', 'compression_optimization']
            },
            driver_license: {
                preprocessing: ['denoising', 'skew_correction', 'contrast'],
                enhancement: ['clahe', 'unsharp_mask'],
                restoration: ['scratch_removal', 'fold_removal'],
                optimization: ['dpi_normalization', 'format_optimization']
            },
            national_id: {
                preprocessing: ['bilateral_filter', 'perspective_correction'],
                enhancement: ['adaptive_threshold', 'morphological_closing'],
                restoration: ['noise_reduction', 'edge_enhancement'],
                optimization: ['size_normalization', 'quality_optimization']
            },
            birth_certificate: {
                preprocessing: ['gaussian_blur', 'contrast_enhancement'],
                enhancement: ['text_enhancement', 'background_removal'],
                restoration: ['aging_correction', 'yellowing_removal'],
                optimization: ['text_optimization', 'archival_quality']
            }
        };
        
        // Quality assessment metrics
        this.qualityMetrics = {
            resolution: { min: 150, optimal: 300, max: 1200 },
            contrast: { min: 0.3, optimal: 0.7, max: 1.0 },
            brightness: { min: 0.2, optimal: 0.5, max: 0.8 },
            sharpness: { min: 0.4, optimal: 0.8, max: 1.0 },
            noise: { max: 0.3, optimal: 0.1, min: 0.0 },
            blur: { max: 0.4, optimal: 0.1, min: 0.0 },
            distortion: { max: 0.2, optimal: 0.05, min: 0.0 }
        };
        
        // Processing performance tracking
        this.processingMetrics = {
            totalProcessed: 0,
            successfulProcessing: 0,
            failedProcessing: 0,
            averageProcessingTime: 0,
            qualityImprovement: 0,
            cacheHitRate: 0,
            pipelinePerformance: new Map(),
            algorithmEffectiveness: new Map()
        };
        
        // Supported formats and conversion options
        this.supportedFormats = {
            input: ['jpg', 'jpeg', 'png', 'tiff', 'tif', 'bmp', 'webp', 'pdf', 'heic'],
            output: ['jpg', 'png', 'tiff', 'webp'],
            preferred: 'png' // For maximum quality retention
        };
        
        // Initialize background processes
        this.initializeBackgroundProcesses();
        
        this.logger.info('Image Processing Service initialized', {
            algorithms: Object.keys(this.enhancementAlgorithms).length,
            pipelines: Object.keys(this.documentPipelines).length,
            supportedFormats: this.supportedFormats.input.length
        });
    }
    
    /**
     * Initialize background image processing processes
     */
    initializeBackgroundProcesses() {
        // Processing queue optimization
        setInterval(() => {
            this.optimizeProcessingQueue();
        }, 5 * 60 * 1000); // Every 5 minutes
        
        // Cache management and optimization
        setInterval(() => {
            this.optimizeImageCache();
        }, 15 * 60 * 1000); // Every 15 minutes
        
        // Algorithm performance analysis
        setInterval(() => {
            this.analyzeAlgorithmPerformance();
        }, 30 * 60 * 1000); // Every 30 minutes
        
        // Pipeline effectiveness monitoring
        setInterval(() => {
            this.monitorPipelineEffectiveness();
        }, 60 * 60 * 1000); // Every hour
    }
    
    /**
     * Initialize Image Processing Service
     */
    async initialize() {
        try {
            this.logger.info('📸 Initializing Image Processing Service...');
            
            // Initialize OpenCV and Sharp
            await this.initializeImageLibraries();
            
            // Load enhancement models and filters
            await this.loadEnhancementModels();
            
            // Initialize processing pipelines
            await this.initializeProcessingPipelines();
            
            // Calibrate quality assessment algorithms
            await this.calibrateQualityAssessment();
            
            // Warm up processing algorithms
            await this.warmupProcessingAlgorithms();
            
            this.logger.info('✅ Image Processing Service initialized successfully', {
                algorithmsLoaded: Object.keys(this.enhancementAlgorithms).length,
                pipelinesReady: Object.keys(this.documentPipelines).length,
                supportedFormats: this.supportedFormats.input.length
            });
            
        } catch (error) {
            this.logger.error('❌ Failed to initialize Image Processing Service', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Enhance document image for optimal processing
     */
    async enhanceDocument(imagePath, options = {}) {
        try {
            const enhancementId = crypto.randomUUID();
            const startTime = Date.now();
            
            this.logger.debug('Starting document enhancement', {
                enhancementId,
                imagePath: path.basename(imagePath),
                documentType: options.documentType
            });
            
            // Check cache first
            const cacheKey = await this.generateCacheKey(imagePath, options);
            const cachedResult = this.processedImageCache.get(cacheKey);
            if (cachedResult) {
                this.logger.debug('Using cached enhanced image', { enhancementId });
                return cachedResult;
            }
            
            // Validate input image
            await this.validateInputImage(imagePath);
            
            // Assess initial image quality
            const initialQuality = await this.assessImageQuality(imagePath);
            
            // Select optimal processing pipeline
            const pipeline = this.selectProcessingPipeline(options.documentType, initialQuality);
            
            // Initialize enhancement result
            const enhancement = {
                enhancementId,
                originalPath: imagePath,
                enhancedPath: null,
                qualityImprovement: {},
                processing: {
                    pipeline: pipeline.name,
                    steps: [],
                    processingTime: 0,
                    algorithms: []
                },
                quality: {
                    initial: initialQuality,
                    final: null,
                    improvement: 0
                },
                metadata: {
                    originalSize: 0,
                    enhancedSize: 0,
                    format: null,
                    dimensions: null
                }
            };
            
            // Generate enhanced image path
            const enhancedPath = await this.generateEnhancedImagePath(imagePath, enhancementId);
            enhancement.enhancedPath = enhancedPath;
            
            // Load and prepare image
            let currentImage = await this.loadImage(imagePath);
            enhancement.metadata.originalSize = await this.getFileSize(imagePath);
            enhancement.metadata.dimensions = await this.getImageDimensions(currentImage);
            
            // Apply processing pipeline
            for (const step of pipeline.steps) {
                try {
                    const stepStartTime = Date.now();
                    const stepResult = await this.applyProcessingStep(currentImage, step, options);
                    
                    if (stepResult.success) {
                        currentImage = stepResult.processedImage;
                        enhancement.processing.steps.push({
                            step: step.name,
                            algorithm: step.algorithm,
                            parameters: step.parameters,
                            success: true,
                            processingTime: Date.now() - stepStartTime,
                            qualityDelta: stepResult.qualityDelta || 0
                        });
                        enhancement.processing.algorithms.push(step.algorithm);
                    } else {
                        this.logger.warn('Processing step failed', { 
                            enhancementId, 
                            step: step.name, 
                            error: stepResult.error 
                        });
                        enhancement.processing.steps.push({
                            step: step.name,
                            algorithm: step.algorithm,
                            success: false,
                            error: stepResult.error,
                            processingTime: Date.now() - stepStartTime
                        });
                    }
                } catch (stepError) {
                    this.logger.error('Processing step error', { 
                        enhancementId, 
                        step: step.name, 
                        error: stepError.message 
                    });
                }
            }
            
            // Save enhanced image
            await this.saveEnhancedImage(currentImage, enhancedPath, options);
            enhancement.metadata.enhancedSize = await this.getFileSize(enhancedPath);
            enhancement.metadata.format = path.extname(enhancedPath).slice(1);
            
            // Assess final quality
            enhancement.quality.final = await this.assessImageQuality(enhancedPath);
            enhancement.quality.improvement = this.calculateQualityImprovement(
                enhancement.quality.initial, 
                enhancement.quality.final
            );
            
            // Calculate quality improvement details
            enhancement.qualityImprovement = this.analyzeQualityImprovement(
                enhancement.quality.initial,
                enhancement.quality.final
            );
            
            // Update processing metadata
            enhancement.processing.processingTime = Date.now() - startTime;
            
            // Cache the result
            this.processedImageCache.set(cacheKey, enhancement);
            
            // Update metrics
            this.updateProcessingMetrics(enhancement);
            
            this.logger.debug('Document enhancement completed', {
                enhancementId,
                qualityImprovement: enhancement.quality.improvement,
                processingTime: enhancement.processing.processingTime,
                stepsCompleted: enhancement.processing.steps.filter(s => s.success).length
            });
            
            return enhancement;
            
        } catch (error) {
            this.logger.error('Document enhancement failed', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Assess document image quality
     */
    async assessImageQuality(imagePath) {
        try {
            const assessment = {
                overall: 0,
                resolution: 0,
                contrast: 0,
                brightness: 0,
                sharpness: 0,
                noise: 0,
                blur: 0,
                distortion: 0,
                dimensions: null,
                fileSize: 0,
                format: null
            };
            
            // Load image for analysis
            const image = await sharp(imagePath);
            const metadata = await image.metadata();
            const stats = await image.stats();
            
            // Basic image information
            assessment.dimensions = { width: metadata.width, height: metadata.height };
            assessment.fileSize = await this.getFileSize(imagePath);
            assessment.format = metadata.format;
            
            // Resolution assessment
            assessment.resolution = this.assessResolution(metadata);
            
            // Contrast and brightness assessment
            assessment.contrast = this.assessContrast(stats);
            assessment.brightness = this.assessBrightness(stats);
            
            // Load OpenCV mat for advanced analysis
            const cvMat = await this.loadOpenCVImage(imagePath);
            
            // Sharpness assessment (Laplacian variance)
            assessment.sharpness = await this.assessSharpness(cvMat);
            
            // Noise assessment
            assessment.noise = await this.assessNoise(cvMat);
            
            // Blur assessment
            assessment.blur = await this.assessBlur(cvMat);
            
            // Distortion assessment
            assessment.distortion = await this.assessDistortion(cvMat);
            
            // Calculate overall quality score
            assessment.overall = this.calculateOverallQuality(assessment);
            
            return assessment;
            
        } catch (error) {
            this.logger.error('Image quality assessment failed', { error: error.message });
            return {
                overall: 0.5,
                resolution: 0.5,
                contrast: 0.5,
                brightness: 0.5,
                sharpness: 0.5,
                noise: 0.5,
                blur: 0.5,
                distortion: 0.5
            };
        }
    }
    
    /**
     * Prepare image for OCR processing
     */
    async prepareForOCR(imagePath, options = {}) {
        try {
            const preparationId = crypto.randomUUID();
            
            this.logger.debug('Preparing image for OCR', {
                preparationId,
                imagePath: path.basename(imagePath),
                language: options.language
            });
            
            // OCR-specific enhancement options
            const ocrOptions = {
                documentType: options.documentType || 'unknown',
                language: options.language || 'en',
                ocrEngine: options.ocrEngine || 'tesseract',
                enhanceText: true,
                removeBorders: true,
                straightenText: true,
                optimizeContrast: true
            };
            
            // Apply OCR-optimized enhancement
            const enhancement = await this.enhanceDocument(imagePath, ocrOptions);
            
            // Additional OCR-specific processing
            const ocrOptimizedPath = await this.applyOCROptimizations(enhancement.enhancedPath, ocrOptions);
            
            return {
                preparationId,
                originalPath: imagePath,
                enhancedPath: enhancement.enhancedPath,
                ocrOptimizedPath,
                qualityAssessment: enhancement.quality,
                processingSteps: enhancement.processing.steps,
                recommendations: this.generateOCRRecommendations(enhancement.quality.final)
            };
            
        } catch (error) {
            this.logger.error('OCR preparation failed', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Extract features for ML analysis
     */
    async extractMLFeatures(imagePath, options = {}) {
        try {
            const extractionId = crypto.randomUUID();
            
            this.logger.debug('Extracting ML features', {
                extractionId,
                imagePath: path.basename(imagePath),
                featureTypes: options.features
            });
            
            const features = {
                extractionId,
                basic: {},
                texture: {},
                color: {},
                shape: {},
                statistical: {},
                advanced: {}
            };
            
            // Load image for feature extraction
            const cvMat = await this.loadOpenCVImage(imagePath);
            const sharpImage = await sharp(imagePath);
            const stats = await sharpImage.stats();
            
            // Basic features
            features.basic = await this.extractBasicFeatures(cvMat, stats);
            
            // Texture features
            features.texture = await this.extractTextureFeatures(cvMat);
            
            // Color features
            features.color = await this.extractColorFeatures(cvMat, stats);
            
            // Shape features
            features.shape = await this.extractShapeFeatures(cvMat);
            
            // Statistical features
            features.statistical = await this.extractStatisticalFeatures(cvMat, stats);
            
            // Advanced features (if requested)
            if (options.includeAdvanced) {
                features.advanced = await this.extractAdvancedFeatures(cvMat, options);
            }
            
            return features;
            
        } catch (error) {
            this.logger.error('ML feature extraction failed', { error: error.message });
            throw error;
        }
    }
    
    // Processing step implementations
    
    async applyProcessingStep(image, step, options) {
        try {
            let processedImage = image;
            let qualityDelta = 0;
            
            switch (step.algorithm) {
                case 'gaussian_denoising':
                    processedImage = await this.applyGaussianDenoising(image, step.parameters);
                    break;
                    
                case 'bilateral_filtering':
                    processedImage = await this.applyBilateralFilter(image, step.parameters);
                    break;
                    
                case 'clahe_enhancement':
                    processedImage = await this.applyCLAHE(image, step.parameters);
                    break;
                    
                case 'unsharp_masking':
                    processedImage = await this.applyUnsharpMask(image, step.parameters);
                    break;
                    
                case 'perspective_correction':
                    processedImage = await this.correctPerspective(image, step.parameters);
                    break;
                    
                case 'rotation_correction':
                    processedImage = await this.correctRotation(image, step.parameters);
                    break;
                    
                case 'skew_correction':
                    processedImage = await this.correctSkew(image, step.parameters);
                    break;
                    
                default:
                    this.logger.warn('Unknown processing algorithm', { algorithm: step.algorithm });
                    return { success: false, error: 'Unknown algorithm' };
            }
            
            return {
                success: true,
                processedImage,
                qualityDelta
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Image processing algorithm implementations
    
    async applyGaussianDenoising(image, parameters) {
        const sigma = parameters.sigma || 1.0;
        return image.gaussianBlur(sigma);
    }
    
    async applyBilateralFilter(image, parameters) {
        // OpenCV bilateral filter implementation
        const cvMat = this.sharpToOpenCV(image);
        const filtered = cvMat.bilateralFilter(
            parameters.d || -1,
            parameters.sigmaColor || 75,
            parameters.sigmaSpace || 75
        );
        return this.openCVToSharp(filtered);
    }
    
    async applyCLAHE(image, parameters) {
        // Contrast Limited Adaptive Histogram Equalization
        const cvMat = this.sharpToOpenCV(image);
        const gray = cvMat.cvtColor(cv.COLOR_BGR2GRAY);
        const clahe = new cv.CLAHE(parameters.clipLimit || 2.0, new cv.Size(8, 8));
        const enhanced = clahe.apply(gray);
        return this.openCVToSharp(enhanced);
    }
    
    async applyUnsharpMask(image, parameters) {
        const amount = parameters.amount || 1.5;
        const radius = parameters.radius || 1.0;
        const threshold = parameters.threshold || 0;
        
        return image.sharpen({
            sigma: radius,
            flat: amount,
            jagged: threshold
        });
    }
    
    async correctPerspective(image, parameters) {
        // Perspective correction using OpenCV
        const cvMat = this.sharpToOpenCV(image);
        
        // Detect document corners if auto-detection is enabled
        if (parameters.autoDetect) {
            const corners = await this.detectDocumentCorners(cvMat);
            if (corners) {
                const corrected = await this.applyPerspectiveTransform(cvMat, corners);
                return this.openCVToSharp(corrected);
            }
        }
        
        return this.openCVToSharp(cvMat);
    }
    
    async correctRotation(image, parameters) {
        // Auto-detect rotation angle if enabled
        if (parameters.autoDetect) {
            const cvMat = this.sharpToOpenCV(image);
            const angle = await this.detectRotationAngle(cvMat);
            
            if (Math.abs(angle) > parameters.threshold) {
                return image.rotate(-angle);
            }
        }
        
        return image;
    }
    
    async correctSkew(image, parameters) {
        // Skew correction using Hough line detection
        const cvMat = this.sharpToOpenCV(image);
        const skewAngle = await this.detectSkewAngle(cvMat);
        
        if (Math.abs(skewAngle) > parameters.tolerance) {
            return image.rotate(-skewAngle);
        }
        
        return image;
    }
    
    // Quality assessment implementations
    
    assessResolution(metadata) {
        const dpi = metadata.density || 72;
        const minDim = Math.min(metadata.width, metadata.height);
        
        if (dpi >= this.qualityMetrics.resolution.optimal && minDim >= 1000) {
            return 1.0;
        } else if (dpi >= this.qualityMetrics.resolution.min && minDim >= 600) {
            return 0.7;
        } else {
            return 0.3;
        }
    }
    
    assessContrast(stats) {
        // Calculate contrast from channel statistics
        const contrast = stats.channels.reduce((sum, channel) => {
            return sum + (channel.max - channel.min) / 255;
        }, 0) / stats.channels.length;
        
        return Math.min(contrast / this.qualityMetrics.contrast.optimal, 1.0);
    }
    
    assessBrightness(stats) {
        // Calculate brightness from mean values
        const brightness = stats.channels.reduce((sum, channel) => {
            return sum + channel.mean;
        }, 0) / (stats.channels.length * 255);
        
        const optimal = this.qualityMetrics.brightness.optimal;
        return 1.0 - Math.abs(brightness - optimal) / optimal;
    }
    
    async assessSharpness(cvMat) {
        // Laplacian variance for sharpness assessment
        const gray = cvMat.channels === 1 ? cvMat : cvMat.cvtColor(cv.COLOR_BGR2GRAY);
        const laplacian = gray.laplacian(cv.CV_64F);
        const variance = laplacian.stdDev().w;
        
        return Math.min(variance / 1000, 1.0); // Normalize to 0-1
    }
    
    async assessNoise(cvMat) {
        // Noise assessment using local variance
        const gray = cvMat.channels === 1 ? cvMat : cvMat.cvtColor(cv.COLOR_BGR2GRAY);
        const mean = gray.mean();
        const noise = Math.abs(gray.stdDev().w - mean.w) / 255;
        
        return 1.0 - Math.min(noise / this.qualityMetrics.noise.max, 1.0);
    }
    
    async assessBlur(cvMat) {
        // Blur assessment using gradient magnitude
        const gray = cvMat.channels === 1 ? cvMat : cvMat.cvtColor(cv.COLOR_BGR2GRAY);
        const gradX = gray.sobel(cv.CV_64F, 1, 0, 3);
        const gradY = gray.sobel(cv.CV_64F, 0, 1, 3);
        const magnitude = gradX.mul(gradX).add(gradY.mul(gradY)).sqrt();
        const blur = 1.0 - (magnitude.mean().w / 255);
        
        return 1.0 - Math.min(blur / this.qualityMetrics.blur.max, 1.0);
    }
    
    async assessDistortion(cvMat) {
        // Simplified distortion assessment
        return 0.9; // Placeholder - would implement lens distortion detection
    }
    
    calculateOverallQuality(assessment) {
        const weights = {
            resolution: 0.2,
            contrast: 0.15,
            brightness: 0.1,
            sharpness: 0.2,
            noise: 0.15,
            blur: 0.15,
            distortion: 0.05
        };
        
        return Object.entries(weights).reduce((total, [metric, weight]) => {
            return total + (assessment[metric] * weight);
        }, 0);
    }
    
    // Feature extraction implementations
    
    async extractBasicFeatures(cvMat, stats) {
        return {
            width: cvMat.cols,
            height: cvMat.rows,
            channels: cvMat.channels,
            aspectRatio: cvMat.cols / cvMat.rows,
            area: cvMat.cols * cvMat.rows,
            meanIntensity: stats.channels[0].mean / 255,
            stdIntensity: Math.sqrt(stats.channels[0].stdev) / 255
        };
    }
    
    async extractTextureFeatures(cvMat) {
        // Simplified texture feature extraction
        return {
            contrast: 0.5,
            homogeneity: 0.7,
            energy: 0.3,
            correlation: 0.8
        };
    }
    
    async extractColorFeatures(cvMat, stats) {
        const features = {
            meanRGB: [],
            stdRGB: [],
            dominantColors: [],
            colorfulness: 0
        };
        
        // Extract RGB statistics
        for (const channel of stats.channels) {
            features.meanRGB.push(channel.mean / 255);
            features.stdRGB.push(Math.sqrt(channel.stdev) / 255);
        }
        
        // Calculate colorfulness metric
        features.colorfulness = this.calculateColorfulness(stats);
        
        return features;
    }
    
    async extractShapeFeatures(cvMat) {
        // Simplified shape feature extraction
        return {
            edges: 0.6,
            corners: 0.4,
            lines: 0.8,
            rectangularity: 0.9
        };
    }
    
    async extractStatisticalFeatures(cvMat, stats) {
        return {
            entropy: this.calculateEntropy(cvMat),
            skewness: this.calculateSkewness(stats),
            kurtosis: this.calculateKurtosis(stats)
        };
    }
    
    async extractAdvancedFeatures(cvMat, options) {
        // Advanced feature extraction for ML models
        return {
            histogramFeatures: await this.extractHistogramFeatures(cvMat),
            frequencyFeatures: await this.extractFrequencyFeatures(cvMat),
            structuralFeatures: await this.extractStructuralFeatures(cvMat)
        };
    }
    
    // Utility methods
    
    selectProcessingPipeline(documentType, quality) {
        const pipelineConfig = this.documentPipelines[documentType] || this.documentPipelines.passport;
        
        // Adapt pipeline based on quality assessment
        const adaptedSteps = this.adaptPipelineToQuality(pipelineConfig, quality);
        
        return {
            name: `${documentType}_adaptive`,
            steps: adaptedSteps,
            quality: quality
        };
    }
    
    adaptPipelineToQuality(pipelineConfig, quality) {
        const steps = [];
        
        // Add preprocessing steps based on quality
        if (quality.noise < 0.7) {
            steps.push({
                name: 'noise_reduction',
                algorithm: 'bilateral_filtering',
                parameters: { sigmaColor: 75, sigmaSpace: 75 }
            });
        }
        
        if (quality.contrast < 0.6) {
            steps.push({
                name: 'contrast_enhancement',
                algorithm: 'clahe_enhancement',
                parameters: { clipLimit: 2.0 }
            });
        }
        
        if (quality.sharpness < 0.7) {
            steps.push({
                name: 'sharpening',
                algorithm: 'unsharp_masking',
                parameters: { amount: 1.5, radius: 1.0 }
            });
        }
        
        if (quality.distortion > 0.2) {
            steps.push({
                name: 'perspective_correction',
                algorithm: 'perspective_correction',
                parameters: { autoDetect: true }
            });
        }
        
        return steps;
    }
    
    async generateCacheKey(imagePath, options) {
        const stats = await fs.stat(imagePath);
        const hash = crypto.createHash('md5');
        hash.update(JSON.stringify({
            path: imagePath,
            mtime: stats.mtime.getTime(),
            size: stats.size,
            options: options
        }));
        return `image-${hash.digest('hex')}`;
    }
    
    async validateInputImage(imagePath) {
        const stats = await fs.stat(imagePath);
        const ext = path.extname(imagePath).toLowerCase().slice(1);
        
        if (!this.supportedFormats.input.includes(ext)) {
            throw new Error(`Unsupported image format: ${ext}`);
        }
        
        if (stats.size > 50 * 1024 * 1024) { // 50MB limit
            throw new Error('Image file too large');
        }
    }
    
    async generateEnhancedImagePath(originalPath, enhancementId) {
        const dir = path.dirname(originalPath);
        const name = path.parse(originalPath).name;
        const ext = this.supportedFormats.preferred;
        return path.join(dir, `${name}_enhanced_${enhancementId}.${ext}`);
    }
    
    async loadImage(imagePath) {
        return sharp(imagePath);
    }
    
    async loadOpenCVImage(imagePath) {
        return cv.imread(imagePath);
    }
    
    async saveEnhancedImage(image, outputPath, options) {
        const quality = options.quality || 95;
        await image.png({ quality, compressionLevel: 6 }).toFile(outputPath);
    }
    
    async getFileSize(filePath) {
        const stats = await fs.stat(filePath);
        return stats.size;
    }
    
    async getImageDimensions(image) {
        const metadata = await image.metadata();
        return { width: metadata.width, height: metadata.height };
    }
    
    calculateQualityImprovement(initial, final) {
        return final.overall - initial.overall;
    }
    
    analyzeQualityImprovement(initial, final) {
        return {
            resolution: final.resolution - initial.resolution,
            contrast: final.contrast - initial.contrast,
            brightness: final.brightness - initial.brightness,
            sharpness: final.sharpness - initial.sharpness,
            noise: final.noise - initial.noise,
            blur: final.blur - initial.blur,
            overall: final.overall - initial.overall
        };
    }
    
    updateProcessingMetrics(enhancement) {
        this.processingMetrics.totalProcessed++;
        
        if (enhancement.quality.improvement > 0) {
            this.processingMetrics.successfulProcessing++;
        } else {
            this.processingMetrics.failedProcessing++;
        }
        
        // Update averages
        const total = this.processingMetrics.totalProcessed;
        this.processingMetrics.averageProcessingTime = 
            ((this.processingMetrics.averageProcessingTime * (total - 1)) + enhancement.processing.processingTime) / total;
        
        this.processingMetrics.qualityImprovement = 
            ((this.processingMetrics.qualityImprovement * (total - 1)) + enhancement.quality.improvement) / total;
    }
    
    // OCR optimization methods
    
    async applyOCROptimizations(imagePath, options) {
        const image = await sharp(imagePath);
        
        // Apply OCR-specific optimizations
        const optimized = image
            .greyscale() // Convert to grayscale for OCR
            .normalize() // Normalize contrast
            .threshold(128); // Binary threshold
        
        const outputPath = imagePath.replace('.png', '_ocr.png');
        await optimized.png().toFile(outputPath);
        
        return outputPath;
    }
    
    generateOCRRecommendations(quality) {
        const recommendations = [];
        
        if (quality.resolution < 0.6) {
            recommendations.push('Consider rescanning at higher resolution (minimum 300 DPI)');
        }
        
        if (quality.contrast < 0.5) {
            recommendations.push('Document contrast is low - may affect OCR accuracy');
        }
        
        if (quality.sharpness < 0.6) {
            recommendations.push('Image appears blurry - ensure stable capture conditions');
        }
        
        if (quality.noise > 0.7) {
            recommendations.push('High noise detected - apply additional denoising');
        }
        
        return recommendations;
    }
    
    // Background process methods
    
    async optimizeProcessingQueue() {
        this.logger.debug('Optimizing image processing queue');
    }
    
    async optimizeImageCache() {
        const stats = this.processedImageCache.getStats();
        this.processingMetrics.cacheHitRate = stats.hits / (stats.hits + stats.misses) * 100;
        this.logger.debug('Image cache optimization', { stats });
    }
    
    async analyzeAlgorithmPerformance() {
        this.logger.debug('Analyzing image processing algorithm performance');
    }
    
    async monitorPipelineEffectiveness() {
        this.logger.debug('Monitoring processing pipeline effectiveness');
    }
    
    // Initialization methods
    
    async initializeImageLibraries() {
        // Initialize Sharp and OpenCV
        this.logger.debug('Initializing image processing libraries');
    }
    
    async loadEnhancementModels() {
        // Load enhancement models and filters
        this.logger.debug('Loading image enhancement models');
    }
    
    async initializeProcessingPipelines() {
        // Initialize processing pipelines
        this.logger.debug('Initializing processing pipelines');
    }
    
    async calibrateQualityAssessment() {
        // Calibrate quality assessment algorithms
        this.logger.debug('Calibrating quality assessment algorithms');
    }
    
    async warmupProcessingAlgorithms() {
        // Warm up processing algorithms
        this.logger.debug('Warming up processing algorithms');
    }
    
    // Placeholder implementations for complex algorithms
    
    sharpToOpenCV(sharpImage) {
        // Convert Sharp image to OpenCV Mat (placeholder)
        return new cv.Mat();
    }
    
    openCVToSharp(cvMat) {
        // Convert OpenCV Mat to Sharp image (placeholder)
        return sharp(Buffer.alloc(1));
    }
    
    async detectDocumentCorners(cvMat) {
        // Document corner detection (placeholder)
        return null;
    }
    
    async applyPerspectiveTransform(cvMat, corners) {
        // Apply perspective transformation (placeholder)
        return cvMat;
    }
    
    async detectRotationAngle(cvMat) {
        // Rotation angle detection (placeholder)
        return 0;
    }
    
    async detectSkewAngle(cvMat) {
        // Skew angle detection (placeholder)
        return 0;
    }
    
    calculateColorfulness(stats) {
        // Colorfulness calculation (placeholder)
        return 0.5;
    }
    
    calculateEntropy(cvMat) {
        // Entropy calculation (placeholder)
        return 0.8;
    }
    
    calculateSkewness(stats) {
        // Skewness calculation (placeholder)
        return 0.1;
    }
    
    calculateKurtosis(stats) {
        // Kurtosis calculation (placeholder)
        return 0.3;
    }
    
    async extractHistogramFeatures(cvMat) {
        // Histogram feature extraction (placeholder)
        return {};
    }
    
    async extractFrequencyFeatures(cvMat) {
        // Frequency domain feature extraction (placeholder)
        return {};
    }
    
    async extractStructuralFeatures(cvMat) {
        // Structural feature extraction (placeholder)
        return {};
    }
    
    /**
     * Health check
     */
    async healthCheck() {
        try {
            return {
                status: 'healthy',
                algorithmsLoaded: Object.keys(this.enhancementAlgorithms).length,
                pipelinesReady: Object.keys(this.documentPipelines).length,
                supportedFormats: this.supportedFormats.input.length,
                cacheStats: this.processedImageCache.getStats(),
                metrics: {
                    totalProcessed: this.processingMetrics.totalProcessed,
                    successRate: this.processingMetrics.totalProcessed > 0 ? 
                        (this.processingMetrics.successfulProcessing / this.processingMetrics.totalProcessed) * 100 : 0,
                    averageProcessingTime: this.processingMetrics.averageProcessingTime,
                    averageQualityImprovement: this.processingMetrics.qualityImprovement,
                    cacheHitRate: this.processingMetrics.cacheHitRate
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