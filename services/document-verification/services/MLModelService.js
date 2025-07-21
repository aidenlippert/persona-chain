/**
 * ML Model Service
 * Centralized machine learning model management for document verification
 * Handles model loading, inference, optimization, and lifecycle management
 */

import crypto from 'crypto';
import winston from 'winston';
import NodeCache from 'node-cache';
import tf from '@tensorflow/tfjs-node';
import onnx from 'onnxruntime-node';
import { promises as fs } from 'fs';
import path from 'path';

export default class MLModelService {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger || winston.createLogger({ silent: true });
        
        // Model management and caching
        this.modelCache = new NodeCache({ stdTTL: 7200 }); // 2 hours cache
        this.loadedModels = new Map();
        this.modelMetadata = new Map();
        this.inferenceQueue = new Map();
        
        // Model configurations
        this.modelConfigs = {
            classification: {
                path: this.config.ml?.models?.classification || 'models/document-classifier.onnx',
                format: 'onnx',
                inputShape: [1, 224, 224, 3],
                outputShape: [1, 50], // 50 document types
                batchSize: this.config.ml?.inference?.batchSize || 32,
                memoryLimit: this.config.ml?.inference?.memoryLimit || '2GB',
                timeout: this.config.ml?.inference?.timeoutMs || 5000
            },
            ocr_enhancement: {
                path: this.config.ml?.models?.ocr || 'models/ocr-enhanced.onnx',
                format: 'onnx',
                inputShape: [1, 512, 512, 3],
                outputShape: [1, 1000], // Character probabilities
                batchSize: 16,
                memoryLimit: '1GB',
                timeout: 3000
            },
            fraud_detection: {
                path: this.config.ml?.models?.fraud || 'models/fraud-detection.onnx',
                format: 'onnx',
                inputShape: [1, 256],
                outputShape: [1, 1], // Fraud probability
                batchSize: 64,
                memoryLimit: '1GB',
                timeout: 2000
            },
            quality_assessment: {
                path: this.config.ml?.models?.quality || 'models/quality-assessment.onnx',
                format: 'onnx',
                inputShape: [1, 224, 224, 3],
                outputShape: [1, 5], // Quality metrics
                batchSize: 32,
                memoryLimit: '1GB',
                timeout: 2000
            },
            feature_extraction: {
                path: this.config.ml?.models?.features || 'models/feature-extraction.onnx',
                format: 'onnx',
                inputShape: [1, 224, 224, 3],
                outputShape: [1, 512], // Feature vector
                batchSize: 32,
                memoryLimit: '1GB',
                timeout: 3000
            },
            text_detection: {
                path: 'models/text-detection.onnx',
                format: 'onnx',
                inputShape: [1, 640, 640, 3],
                outputShape: [1, 8400, 6], // Bounding boxes
                batchSize: 8,
                memoryLimit: '2GB',
                timeout: 4000
            },
            template_matching: {
                path: 'models/template-matching.onnx',
                format: 'onnx',
                inputShape: [1, 256, 256, 3],
                outputShape: [1, 200], // Template similarities
                batchSize: 16,
                memoryLimit: '1GB',
                timeout: 2000
            }
        };
        
        // Model performance tracking
        this.modelPerformance = {
            inferences: new Map(),
            latencies: new Map(),
            accuracies: new Map(),
            memoryUsage: new Map(),
            errorRates: new Map()
        };
        
        // Inference optimization
        this.inferenceConfig = {
            parallelInferences: this.config.ml?.inference?.maxConcurrency || 8,
            queueTimeout: 30000, // 30 seconds
            memoryMonitoring: true,
            gpuAcceleration: process.env.CUDA_VISIBLE_DEVICES !== undefined,
            optimizations: {
                tensorOptimization: true,
                modelQuantization: false,
                batchOptimization: true,
                caching: true
            }
        };
        
        // Model lifecycle management
        this.lifecycle = {
            autoUpdate: false,
            versionTracking: true,
            performanceBasedReloading: true,
            memoryBasedUnloading: true,
            healthChecking: true
        };
        
        // Initialize background processes
        this.initializeBackgroundProcesses();
        
        this.logger.info('ML Model Service initialized', {
            models: Object.keys(this.modelConfigs).length,
            parallelInferences: this.inferenceConfig.parallelInferences,
            gpuAcceleration: this.inferenceConfig.gpuAcceleration
        });
    }
    
    /**
     * Initialize background ML processes
     */
    initializeBackgroundProcesses() {
        // Model performance monitoring
        setInterval(() => {
            this.monitorModelPerformance();
        }, 30 * 60 * 1000); // Every 30 minutes
        
        // Memory usage optimization
        setInterval(() => {
            this.optimizeMemoryUsage();
        }, 15 * 60 * 1000); // Every 15 minutes
        
        // Model health checking
        setInterval(() => {
            this.performModelHealthCheck();
        }, 60 * 60 * 1000); // Every hour
        
        // Cache cleanup
        setInterval(() => {
            this.cleanupModelCache();
        }, 45 * 60 * 1000); // Every 45 minutes
    }
    
    /**
     * Initialize ML Model Service
     */
    async initialize() {
        try {
            this.logger.info('🧠 Initializing ML Model Service...');
            
            // Configure TensorFlow.js
            await this.configureTensorFlow();
            
            // Load essential models
            await this.loadEssentialModels();
            
            // Initialize ONNX Runtime
            await this.initializeONNXRuntime();
            
            // Optimize inference configuration
            await this.optimizeInferenceConfiguration();
            
            // Warm up models
            await this.warmupModels();
            
            this.logger.info('✅ ML Model Service initialized successfully', {
                loadedModels: this.loadedModels.size,
                onnxSupport: this.isONNXSupported(),
                tensorflowVersion: tf.version.tfjs
            });
            
        } catch (error) {
            this.logger.error('❌ Failed to initialize ML Model Service', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Load and prepare a specific model
     */
    async loadModel(modelName, options = {}) {
        try {
            if (this.loadedModels.has(modelName)) {
                this.logger.debug('Model already loaded', { modelName });
                return this.loadedModels.get(modelName);
            }
            
            const modelConfig = this.modelConfigs[modelName];
            if (!modelConfig) {
                throw new Error(`Unknown model: ${modelName}`);
            }
            
            this.logger.debug('Loading ML model', { modelName, format: modelConfig.format });
            
            let model;
            let metadata = {
                name: modelName,
                format: modelConfig.format,
                loadedAt: new Date().toISOString(),
                inputShape: modelConfig.inputShape,
                outputShape: modelConfig.outputShape,
                memoryUsage: 0,
                version: '1.0.0'
            };
            
            switch (modelConfig.format) {
                case 'tensorflow':
                    model = await this.loadTensorFlowModel(modelConfig.path, options);
                    break;
                    
                case 'onnx':
                    model = await this.loadONNXModel(modelConfig.path, options);
                    break;
                    
                default:
                    throw new Error(`Unsupported model format: ${modelConfig.format}`);
            }
            
            // Estimate memory usage
            metadata.memoryUsage = await this.estimateModelMemoryUsage(model, modelConfig);
            
            // Store model and metadata
            this.loadedModels.set(modelName, model);
            this.modelMetadata.set(modelName, metadata);
            
            // Initialize performance tracking
            this.initializeModelPerformanceTracking(modelName);
            
            this.logger.debug('ML model loaded successfully', {
                modelName,
                memoryUsage: this.formatBytes(metadata.memoryUsage),
                inputShape: metadata.inputShape
            });
            
            return model;
            
        } catch (error) {
            this.logger.error('Failed to load ML model', { modelName, error: error.message });
            throw error;
        }
    }
    
    /**
     * Run inference on a model
     */
    async runInference(modelName, input, options = {}) {
        try {
            const inferenceId = crypto.randomUUID();
            const startTime = Date.now();
            
            this.logger.debug('Starting ML inference', {
                inferenceId,
                modelName,
                inputShape: Array.isArray(input) ? input.length : 'unknown'
            });
            
            // Load model if not already loaded
            let model = this.loadedModels.get(modelName);
            if (!model) {
                model = await this.loadModel(modelName);
            }
            
            const modelConfig = this.modelConfigs[modelName];
            
            // Validate input shape
            this.validateInputShape(input, modelConfig.inputShape, modelName);
            
            // Prepare input tensor
            const inputTensor = await this.prepareInputTensor(input, modelConfig);
            
            // Run inference based on model format
            let output;
            switch (modelConfig.format) {
                case 'tensorflow':
                    output = await this.runTensorFlowInference(model, inputTensor, options);
                    break;
                    
                case 'onnx':
                    output = await this.runONNXInference(model, inputTensor, modelName, options);
                    break;
                    
                default:
                    throw new Error(`Unsupported model format: ${modelConfig.format}`);
            }
            
            // Post-process output
            const processedOutput = await this.postProcessOutput(output, modelConfig, options);
            
            // Record performance metrics
            const latency = Date.now() - startTime;
            this.recordInferenceMetrics(modelName, latency, true);
            
            // Cleanup tensors
            if (inputTensor && inputTensor.dispose) {
                inputTensor.dispose();
            }
            
            this.logger.debug('ML inference completed', {
                inferenceId,
                modelName,
                latency,
                outputShape: Array.isArray(processedOutput) ? processedOutput.length : 'unknown'
            });
            
            return processedOutput;
            
        } catch (error) {
            this.logger.error('ML inference failed', {
                modelName,
                error: error.message
            });
            
            // Record error metrics
            this.recordInferenceMetrics(modelName, Date.now() - (Date.now()), false);
            throw error;
        }
    }
    
    /**
     * Run batch inference for multiple inputs
     */
    async runBatchInference(modelName, inputs, options = {}) {
        try {
            const batchId = crypto.randomUUID();
            const startTime = Date.now();
            
            this.logger.debug('Starting batch ML inference', {
                batchId,
                modelName,
                batchSize: inputs.length
            });
            
            const modelConfig = this.modelConfigs[modelName];
            const maxBatchSize = modelConfig.batchSize || 32;
            
            // Split into smaller batches if necessary
            const batches = [];
            for (let i = 0; i < inputs.length; i += maxBatchSize) {
                batches.push(inputs.slice(i, i + maxBatchSize));
            }
            
            // Process batches in parallel
            const batchPromises = batches.map(async (batch, index) => {
                try {
                    // Combine batch inputs into single tensor
                    const batchTensor = await this.createBatchTensor(batch, modelConfig);
                    
                    // Run inference on batch
                    const batchOutput = await this.runInference(modelName, batchTensor, {
                        ...options,
                        isBatch: true,
                        batchSize: batch.length
                    });
                    
                    // Split batch output back to individual results
                    return this.splitBatchOutput(batchOutput, batch.length, modelConfig);
                    
                } catch (error) {
                    this.logger.error('Batch inference failed', {
                        batchId,
                        batchIndex: index,
                        error: error.message
                    });
                    
                    // Return error results for this batch
                    return batch.map(() => ({ error: error.message }));
                }
            });
            
            // Wait for all batches to complete
            const batchResults = await Promise.all(batchPromises);
            
            // Flatten results
            const results = batchResults.flat();
            
            const processingTime = Date.now() - startTime;
            
            this.logger.debug('Batch ML inference completed', {
                batchId,
                modelName,
                totalInputs: inputs.length,
                totalBatches: batches.length,
                processingTime
            });
            
            return results;
            
        } catch (error) {
            this.logger.error('Batch ML inference failed', {
                modelName,
                batchSize: inputs.length,
                error: error.message
            });
            throw error;
        }
    }
    
    /**
     * Get model information and status
     */
    async getModelInfo(modelName) {
        try {
            const metadata = this.modelMetadata.get(modelName);
            const isLoaded = this.loadedModels.has(modelName);
            const config = this.modelConfigs[modelName];
            
            if (!config) {
                throw new Error(`Unknown model: ${modelName}`);
            }
            
            const performance = {
                totalInferences: this.modelPerformance.inferences.get(modelName) || 0,
                averageLatency: this.modelPerformance.latencies.get(modelName) || 0,
                errorRate: this.modelPerformance.errorRates.get(modelName) || 0,
                memoryUsage: this.modelPerformance.memoryUsage.get(modelName) || 0
            };
            
            return {
                name: modelName,
                isLoaded,
                config,
                metadata,
                performance,
                status: isLoaded ? 'ready' : 'not_loaded'
            };
            
        } catch (error) {
            this.logger.error('Failed to get model info', { modelName, error: error.message });
            throw error;
        }
    }
    
    /**
     * Unload a model to free memory
     */
    async unloadModel(modelName) {
        try {
            const model = this.loadedModels.get(modelName);
            if (!model) {
                this.logger.debug('Model not loaded', { modelName });
                return;
            }
            
            // Dispose model resources
            if (model.dispose) {
                model.dispose();
            }
            
            // Remove from maps
            this.loadedModels.delete(modelName);
            this.modelMetadata.delete(modelName);
            
            this.logger.debug('Model unloaded', { modelName });
            
        } catch (error) {
            this.logger.error('Failed to unload model', { modelName, error: error.message });
            throw error;
        }
    }
    
    // Private implementation methods
    
    async configureTensorFlow() {
        // Configure TensorFlow.js backend
        if (this.inferenceConfig.gpuAcceleration) {
            try {
                await tf.setBackend('tensorflow');
                this.logger.info('GPU acceleration enabled for TensorFlow.js');
            } catch (error) {
                this.logger.warn('GPU acceleration not available, using CPU backend');
                await tf.setBackend('cpu');
            }
        } else {
            await tf.setBackend('cpu');
        }
        
        // Set memory growth
        tf.env().set('WEBGL_DELETE_TEXTURE_THRESHOLD', 0);
        tf.env().set('WEBGL_FLUSH_THRESHOLD', -1);
    }
    
    async loadEssentialModels() {
        const essentialModels = ['classification', 'fraud_detection'];
        
        for (const modelName of essentialModels) {
            try {
                await this.loadModel(modelName);
            } catch (error) {
                this.logger.warn(`Failed to load essential model: ${modelName}`, { error: error.message });
            }
        }
    }
    
    async initializeONNXRuntime() {
        try {
            // Configure ONNX Runtime
            this.onnxSession = new Map();
            this.logger.debug('ONNX Runtime initialized');
        } catch (error) {
            this.logger.warn('ONNX Runtime initialization failed', { error: error.message });
        }
    }
    
    async optimizeInferenceConfiguration() {
        // Optimize based on available system resources
        const memInfo = process.memoryUsage();
        const availableMemory = memInfo.heapTotal;
        
        // Adjust batch sizes based on available memory
        for (const [modelName, config] of Object.entries(this.modelConfigs)) {
            const estimatedMemoryPerBatch = this.estimateBatchMemoryUsage(config);
            const optimalBatchSize = Math.floor(availableMemory * 0.1 / estimatedMemoryPerBatch);
            
            if (optimalBatchSize < config.batchSize) {
                config.batchSize = Math.max(1, optimalBatchSize);
                this.logger.debug(`Adjusted batch size for ${modelName}`, { 
                    batchSize: config.batchSize 
                });
            }
        }
    }
    
    async loadTensorFlowModel(modelPath, options = {}) {
        try {
            if (await this.fileExists(modelPath)) {
                return await tf.loadLayersModel(`file://${modelPath}`);
            } else {
                this.logger.warn(`TensorFlow model not found: ${modelPath}`);
                return null;
            }
        } catch (error) {
            this.logger.error('Failed to load TensorFlow model', { modelPath, error: error.message });
            throw error;
        }
    }
    
    async loadONNXModel(modelPath, options = {}) {
        try {
            if (await this.fileExists(modelPath)) {
                const session = await onnx.InferenceSession.create(modelPath, {
                    executionProviders: this.inferenceConfig.gpuAcceleration ? 
                        ['cuda', 'cpu'] : ['cpu'],
                    graphOptimizationLevel: 'all',
                    enableCpuMemArena: true,
                    enableMemPattern: true
                });
                
                this.onnxSession.set(modelPath, session);
                return session;
            } else {
                this.logger.warn(`ONNX model not found: ${modelPath}`);
                return null;
            }
        } catch (error) {
            this.logger.error('Failed to load ONNX model', { modelPath, error: error.message });
            throw error;
        }
    }
    
    async runTensorFlowInference(model, inputTensor, options = {}) {
        try {
            const prediction = model.predict(inputTensor);
            
            if (prediction.data) {
                return await prediction.data();
            } else {
                return prediction;
            }
        } catch (error) {
            this.logger.error('TensorFlow inference failed', { error: error.message });
            throw error;
        }
    }
    
    async runONNXInference(model, inputTensor, modelName, options = {}) {
        try {
            const modelConfig = this.modelConfigs[modelName];
            
            // Prepare input feeds
            const feeds = {};
            const inputNames = model.inputNames;
            
            if (inputNames.length === 1) {
                feeds[inputNames[0]] = inputTensor;
            } else {
                // Handle multiple inputs
                for (let i = 0; i < inputNames.length; i++) {
                    feeds[inputNames[i]] = Array.isArray(inputTensor) ? inputTensor[i] : inputTensor;
                }
            }
            
            // Run inference
            const results = await model.run(feeds);
            
            // Extract output
            const outputNames = model.outputNames;
            if (outputNames.length === 1) {
                return results[outputNames[0]].data;
            } else {
                return outputNames.map(name => results[name].data);
            }
            
        } catch (error) {
            this.logger.error('ONNX inference failed', { modelName, error: error.message });
            throw error;
        }
    }
    
    validateInputShape(input, expectedShape, modelName) {
        // Validate input tensor shape matches expected model input
        if (!input) {
            throw new Error(`Input is required for model: ${modelName}`);
        }
        
        // Additional shape validation would go here
    }
    
    async prepareInputTensor(input, modelConfig) {
        // Convert input to appropriate tensor format
        if (tf.isTensor(input)) {
            return input;
        }
        
        if (Array.isArray(input)) {
            return tf.tensor(input, modelConfig.inputShape);
        }
        
        if (input instanceof Float32Array) {
            return tf.tensor(input, modelConfig.inputShape);
        }
        
        throw new Error('Unsupported input type for tensor conversion');
    }
    
    async postProcessOutput(output, modelConfig, options = {}) {
        // Convert output to appropriate format
        if (Array.isArray(output)) {
            return output;
        }
        
        if (output.data) {
            return await output.data();
        }
        
        return output;
    }
    
    async createBatchTensor(batch, modelConfig) {
        // Combine multiple inputs into batch tensor
        const batchShape = [batch.length, ...modelConfig.inputShape.slice(1)];
        const batchData = batch.flat();
        return tf.tensor(batchData, batchShape);
    }
    
    splitBatchOutput(batchOutput, batchSize, modelConfig) {
        // Split batch output back to individual results
        const outputSize = modelConfig.outputShape.slice(1).reduce((a, b) => a * b, 1);
        const results = [];
        
        for (let i = 0; i < batchSize; i++) {
            const start = i * outputSize;
            const end = start + outputSize;
            results.push(batchOutput.slice(start, end));
        }
        
        return results;
    }
    
    recordInferenceMetrics(modelName, latency, success) {
        // Update inference count
        const inferences = this.modelPerformance.inferences.get(modelName) || 0;
        this.modelPerformance.inferences.set(modelName, inferences + 1);
        
        // Update latency
        const latencies = this.modelPerformance.latencies.get(modelName) || 0;
        const count = inferences + 1;
        const newAverage = ((latencies * inferences) + latency) / count;
        this.modelPerformance.latencies.set(modelName, newAverage);
        
        // Update error rate
        if (!success) {
            const errors = this.modelPerformance.errorRates.get(modelName) || 0;
            this.modelPerformance.errorRates.set(modelName, errors + 1);
        }
    }
    
    initializeModelPerformanceTracking(modelName) {
        this.modelPerformance.inferences.set(modelName, 0);
        this.modelPerformance.latencies.set(modelName, 0);
        this.modelPerformance.errorRates.set(modelName, 0);
    }
    
    async estimateModelMemoryUsage(model, modelConfig) {
        // Estimate memory usage based on model parameters
        const inputSize = modelConfig.inputShape.reduce((a, b) => a * b, 1) * 4; // 4 bytes per float
        const outputSize = modelConfig.outputShape.reduce((a, b) => a * b, 1) * 4;
        const baseMemory = inputSize + outputSize;
        
        // Add model parameter memory (rough estimate)
        const modelMemory = baseMemory * 10; // Conservative estimate
        
        return modelMemory;
    }
    
    estimateBatchMemoryUsage(config) {
        return config.inputShape.reduce((a, b) => a * b, 1) * 4; // 4 bytes per float
    }
    
    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }
    
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    isONNXSupported() {
        try {
            return typeof onnx !== 'undefined';
        } catch {
            return false;
        }
    }
    
    async warmupModels() {
        // Warm up loaded models with dummy data
        for (const [modelName, model] of this.loadedModels) {
            try {
                const config = this.modelConfigs[modelName];
                const dummyInput = tf.zeros(config.inputShape);
                await this.runInference(modelName, dummyInput);
                dummyInput.dispose();
                
                this.logger.debug('Model warmed up', { modelName });
            } catch (error) {
                this.logger.warn('Model warmup failed', { modelName, error: error.message });
            }
        }
    }
    
    // Background process methods
    
    async monitorModelPerformance() {
        this.logger.debug('Monitoring ML model performance');
        
        for (const [modelName, inferences] of this.modelPerformance.inferences) {
            const latency = this.modelPerformance.latencies.get(modelName) || 0;
            const errors = this.modelPerformance.errorRates.get(modelName) || 0;
            const errorRate = inferences > 0 ? (errors / inferences) * 100 : 0;
            
            this.logger.debug('Model performance', {
                modelName,
                inferences,
                averageLatency: latency,
                errorRate: errorRate.toFixed(2)
            });
        }
    }
    
    async optimizeMemoryUsage() {
        const memInfo = process.memoryUsage();
        const memoryUsage = memInfo.heapUsed / memInfo.heapTotal;
        
        if (memoryUsage > 0.8) {
            this.logger.warn('High memory usage detected, optimizing');
            
            // Unload least used models
            const modelUsage = Array.from(this.modelPerformance.inferences.entries())
                .sort((a, b) => a[1] - b[1])
                .slice(0, 2); // Unload 2 least used models
            
            for (const [modelName] of modelUsage) {
                if (this.loadedModels.has(modelName)) {
                    await this.unloadModel(modelName);
                    this.logger.debug('Unloaded model due to memory pressure', { modelName });
                }
            }
        }
    }
    
    async performModelHealthCheck() {
        this.logger.debug('Performing model health check');
        
        for (const [modelName, model] of this.loadedModels) {
            try {
                // Simple health check with dummy input
                const config = this.modelConfigs[modelName];
                const dummyInput = tf.zeros([1, ...config.inputShape.slice(1)]);
                await this.runInference(modelName, dummyInput);
                dummyInput.dispose();
                
            } catch (error) {
                this.logger.error('Model health check failed', { 
                    modelName, 
                    error: error.message 
                });
                
                // Try to reload the model
                try {
                    await this.unloadModel(modelName);
                    await this.loadModel(modelName);
                    this.logger.info('Model reloaded after health check failure', { modelName });
                } catch (reloadError) {
                    this.logger.error('Model reload failed', { 
                        modelName, 
                        error: reloadError.message 
                    });
                }
            }
        }
    }
    
    async cleanupModelCache() {
        // Cleanup model cache and temporary files
        this.modelCache.flushAll();
        this.logger.debug('Model cache cleaned up');
    }
    
    /**
     * Health check
     */
    async healthCheck() {
        try {
            const memInfo = process.memoryUsage();
            const totalInferences = Array.from(this.modelPerformance.inferences.values())
                .reduce((sum, count) => sum + count, 0);
            
            return {
                status: 'healthy',
                loadedModels: this.loadedModels.size,
                availableModels: Object.keys(this.modelConfigs).length,
                totalInferences,
                memoryUsage: {
                    heapUsed: this.formatBytes(memInfo.heapUsed),
                    heapTotal: this.formatBytes(memInfo.heapTotal),
                    usagePercentage: ((memInfo.heapUsed / memInfo.heapTotal) * 100).toFixed(2)
                },
                tensorflowBackend: tf.getBackend(),
                onnxSupport: this.isONNXSupported(),
                gpuAcceleration: this.inferenceConfig.gpuAcceleration,
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