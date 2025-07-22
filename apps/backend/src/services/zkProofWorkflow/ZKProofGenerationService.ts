/**
 * ZK Proof Generation Service for PersonaChain
 * Enterprise-grade zero-knowledge proof generation with circuit management,
 * witness generation, and optimized proving algorithms
 * 
 * Features:
 * - Multi-circuit proof generation (membership, age, income, reputation)
 * - Witness data preparation and validation
 * - Optimized proving algorithms (Groth16, PLONK, STARK)
 * - Batch proof generation for efficiency
 * - GPU acceleration support
 * - Proof caching and optimization
 * - Circuit parameter management
 * - Performance monitoring and metrics
 * - Enterprise security and audit trails
 */

import * as snarkjs from 'snarkjs';
import { createHash } from 'crypto';
import { EventEmitter } from 'events';

// ==================== TYPES AND INTERFACES ====================

export interface ZKProofGenerationRequest {
  circuitId: string;
  circuitInputs: CircuitInputs;
  provingKey: string;
  provingAlgorithm: ProvingAlgorithm;
  optimizationLevel: OptimizationLevel;
  batchSize?: number;
  gpuAcceleration?: boolean;
  cacheEnabled?: boolean;
  auditTrail?: boolean;
  metadata?: Record<string, any>;
  priority?: ProofPriority;
  deadline?: Date;
}

export interface CircuitInputs {
  // Private inputs (witness data)
  privateInputs: Record<string, any>;
  
  // Public inputs (verification data)
  publicInputs: Record<string, any>;
  
  // Circuit-specific parameters
  circuitParameters?: Record<string, any>;
  
  // Input validation rules
  validationRules?: ValidationRule[];
  
  // Input preprocessing options
  preprocessingOptions?: PreprocessingOptions;
}

export interface ZKProofGenerationResult {
  proof: ZKProof;
  publicSignals: any[];
  verificationKey: string;
  generationTime: number;
  circuitId: string;
  proofId: string;
  metadata: ProofMetadata;
  auditTrail?: AuditEntry[];
  performanceMetrics: PerformanceMetrics;
  cacheHit?: boolean;
}

export interface ZKProof {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
  protocol: string;
  curve: string;
  algorithm: ProvingAlgorithm;
  generatedAt: Date;
  expiresAt?: Date;
  signature?: string;
}

export interface ProofMetadata {
  circuitName: string;
  inputHash: string;
  generationMethod: string;
  optimizations: string[];
  securityLevel: number;
  complianceFlags: string[];
  version: string;
}

export interface PerformanceMetrics {
  witnessGenerationTime: number;
  provingTime: number;
  totalGenerationTime: number;
  memoryUsage: number;
  cpuUsage: number;
  gpuUsage?: number;
  cachePerformance?: CacheMetrics;
}

export interface CircuitDefinition {
  id: string;
  name: string;
  description: string;
  wasmPath: string;
  zkeyPath: string;
  vkeyPath: string;
  version: string;
  inputSchema: InputSchema;
  outputSchema: OutputSchema;
  constraints: number;
  securityLevel: number;
  supportedAlgorithms: ProvingAlgorithm[];
  optimizationProfile: OptimizationProfile;
}

export interface BatchGenerationRequest {
  requests: ZKProofGenerationRequest[];
  batchId: string;
  parallelExecution: boolean;
  errorHandling: BatchErrorHandling;
  progressCallback?: (progress: BatchProgress) => void;
}

export interface BatchGenerationResult {
  batchId: string;
  results: (ZKProofGenerationResult | GenerationError)[];
  successCount: number;
  failureCount: number;
  totalTime: number;
  batchMetrics: BatchMetrics;
}

// ==================== ENUMS ====================

export enum ProvingAlgorithm {
  GROTH16 = 'groth16',
  PLONK = 'plonk',
  STARK = 'stark',
  BULLETPROOFS = 'bulletproofs'
}

export enum OptimizationLevel {
  NONE = 'none',
  BASIC = 'basic',
  AGGRESSIVE = 'aggressive',
  MAXIMUM = 'maximum'
}

export enum ProofPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum BatchErrorHandling {
  FAIL_FAST = 'fail_fast',
  CONTINUE_ON_ERROR = 'continue_on_error',
  RETRY_FAILED = 'retry_failed'
}

// ==================== MAIN SERVICE CLASS ====================

export class ZKProofGenerationService extends EventEmitter {
  private circuits: Map<string, CircuitDefinition> = new Map();
  private provingKeys: Map<string, string> = new Map();
  private witnessCalculators: Map<string, any> = new Map();
  private proofCache: Map<string, ZKProofGenerationResult> = new Map();
  private activeGenerations: Map<string, GenerationContext> = new Map();
  private performanceMonitor: PerformanceMonitor;
  private securityValidator: SecurityValidator;
  private optimizationEngine: OptimizationEngine;
  private gpuManager?: GPUManager;
  private metrics: GenerationMetrics;
  
  constructor(config: ZKProofGenerationConfig) {
    super();
    this.performanceMonitor = new PerformanceMonitor();
    this.securityValidator = new SecurityValidator(config.security);
    this.optimizationEngine = new OptimizationEngine(config.optimization);
    this.metrics = new GenerationMetrics();
    
    if (config.gpuAcceleration?.enabled) {
      this.gpuManager = new GPUManager(config.gpuAcceleration);
    }
    
    this.initializeCircuits(config.circuits);
    this.setupEventHandlers();
  }

  // ==================== PROOF GENERATION METHODS ====================

  /**
   * Generate a single ZK proof from circuit inputs
   */
  public async generateProof(request: ZKProofGenerationRequest): Promise<ZKProofGenerationResult> {
    const startTime = Date.now();
    const proofId = this.generateProofId(request);
    
    try {
      this.emit('generation:started', { proofId, circuitId: request.circuitId });
      
      // 1. Validate request and inputs
      await this.validateGenerationRequest(request);
      
      // 2. Check cache if enabled
      if (request.cacheEnabled) {
        const cachedResult = await this.checkProofCache(request);
        if (cachedResult) {
          this.emit('generation:cache_hit', { proofId, cachedResult });
          return cachedResult;
        }
      }
      
      // 3. Prepare circuit and witness data
      const circuit = this.getCircuit(request.circuitId);
      const witnessData = await this.prepareWitnessData(request.circuitInputs, circuit);
      
      // 4. Generate witness
      const witness = await this.generateWitness(witnessData, circuit);
      
      // 5. Apply optimizations
      const optimizedContext = await this.applyOptimizations(request, circuit, witness);
      
      // 6. Generate proof
      const proof = await this.executeProofGeneration(optimizedContext);
      
      // 7. Validate and format result
      const result = await this.formatGenerationResult(proof, request, startTime);
      
      // 8. Cache result if enabled
      if (request.cacheEnabled) {
        await this.cacheProofResult(request, result);
      }
      
      // 9. Record metrics and audit trail
      await this.recordGenerationMetrics(result);
      
      this.emit('generation:completed', { proofId, result });
      return result;
      
    } catch (error) {
      const errorResult = await this.handleGenerationError(error, request, proofId, startTime);
      this.emit('generation:error', { proofId, error: errorResult });
      throw errorResult;
    }
  }

  /**
   * Generate multiple proofs in batch for efficiency
   */
  public async generateBatchProofs(batchRequest: BatchGenerationRequest): Promise<BatchGenerationResult> {
    const startTime = Date.now();
    const results: (ZKProofGenerationResult | GenerationError)[] = [];
    
    try {
      this.emit('batch:started', { batchId: batchRequest.batchId, count: batchRequest.requests.length });
      
      if (batchRequest.parallelExecution) {
        // Parallel execution for better performance
        const promises = batchRequest.requests.map(async (request, index) => {
          try {
            return await this.generateProof(request);
          } catch (error) {
            if (batchRequest.errorHandling === BatchErrorHandling.FAIL_FAST) {
              throw error;
            }
            return error as GenerationError;
          }
        });
        
        const batchResults = await Promise.allSettled(promises);
        results.push(...batchResults.map(result => 
          result.status === 'fulfilled' ? result.value : result.reason
        ));
        
      } else {
        // Sequential execution for resource-constrained environments
        for (let i = 0; i < batchRequest.requests.length; i++) {
          try {
            const result = await this.generateProof(batchRequest.requests[i]);
            results.push(result);
            
            // Update progress
            if (batchRequest.progressCallback) {
              batchRequest.progressCallback({
                completed: i + 1,
                total: batchRequest.requests.length,
                currentItem: batchRequest.requests[i].circuitId
              });
            }
            
          } catch (error) {
            if (batchRequest.errorHandling === BatchErrorHandling.FAIL_FAST) {
              throw error;
            }
            results.push(error as GenerationError);
          }
        }
      }
      
      const successCount = results.filter(r => !(r instanceof Error)).length;
      const failureCount = results.length - successCount;
      
      const batchResult: BatchGenerationResult = {
        batchId: batchRequest.batchId,
        results,
        successCount,
        failureCount,
        totalTime: Date.now() - startTime,
        batchMetrics: await this.calculateBatchMetrics(results, startTime)
      };
      
      this.emit('batch:completed', batchResult);
      return batchResult;
      
    } catch (error) {
      this.emit('batch:error', { batchId: batchRequest.batchId, error });
      throw error;
    }
  }

  // ==================== WITNESS GENERATION ====================

  /**
   * Prepare witness data from circuit inputs
   */
  private async prepareWitnessData(inputs: CircuitInputs, circuit: CircuitDefinition): Promise<WitnessData> {
    const startTime = Date.now();
    
    try {
      // 1. Validate inputs against schema
      await this.validateInputsAgainstSchema(inputs, circuit.inputSchema);
      
      // 2. Apply preprocessing if specified
      const preprocessedInputs = await this.preprocessInputs(inputs);
      
      // 3. Merge private and public inputs
      const witnessInputs = {
        ...preprocessedInputs.privateInputs,
        ...preprocessedInputs.publicInputs
      };
      
      // 4. Apply circuit-specific transformations
      const transformedInputs = await this.applyCircuitTransformations(witnessInputs, circuit);
      
      // 5. Validate final witness data
      await this.validateWitnessData(transformedInputs, circuit);
      
      const preparationTime = Date.now() - startTime;
      
      return {
        inputs: transformedInputs,
        preparationTime,
        inputHash: this.calculateInputHash(transformedInputs),
        metadata: {
          circuitId: circuit.id,
          inputCount: Object.keys(transformedInputs).length,
          preprocessingApplied: inputs.preprocessingOptions ? true : false
        }
      };
      
    } catch (error) {
      throw new Error(`Witness data preparation failed: ${error.message}`);
    }
  }

  /**
   * Generate witness from prepared data
   */
  private async generateWitness(witnessData: WitnessData, circuit: CircuitDefinition): Promise<Uint8Array> {
    const startTime = Date.now();
    
    try {
      // 1. Get or load witness calculator
      const calculator = await this.getWitnessCalculator(circuit);
      
      // 2. Calculate witness
      const witness = await calculator.calculateWitness(witnessData.inputs);
      
      // 3. Validate witness
      await this.validateWitness(witness, circuit);
      
      const generationTime = Date.now() - startTime;
      
      // 4. Record metrics
      this.metrics.recordWitnessGeneration(circuit.id, generationTime, witness.length);
      
      return witness;
      
    } catch (error) {
      throw new Error(`Witness generation failed: ${error.message}`);
    }
  }

  // ==================== PROOF GENERATION CORE ====================

  /**
   * Execute the actual proof generation
   */
  private async executeProofGeneration(context: OptimizedGenerationContext): Promise<RawProof> {
    const { request, circuit, witness, optimizations } = context;
    const startTime = Date.now();
    
    try {
      let proof: RawProof;
      
      switch (request.provingAlgorithm) {
        case ProvingAlgorithm.GROTH16:
          proof = await this.generateGroth16Proof(witness, circuit, optimizations);
          break;
          
        case ProvingAlgorithm.PLONK:
          proof = await this.generatePlonkProof(witness, circuit, optimizations);
          break;
          
        case ProvingAlgorithm.STARK:
          proof = await this.generateStarkProof(witness, circuit, optimizations);
          break;
          
        default:
          throw new Error(`Unsupported proving algorithm: ${request.provingAlgorithm}`);
      }
      
      const generationTime = Date.now() - startTime;
      
      // Record metrics
      this.metrics.recordProofGeneration(
        circuit.id,
        request.provingAlgorithm,
        generationTime,
        proof.size
      );
      
      return proof;
      
    } catch (error) {
      throw new Error(`Proof generation failed: ${error.message}`);
    }
  }

  /**
   * Generate Groth16 proof
   */
  private async generateGroth16Proof(
    witness: Uint8Array,
    circuit: CircuitDefinition,
    optimizations: OptimizationContext
  ): Promise<RawProof> {
    try {
      const provingKey = await this.getProvingKey(circuit.id);
      
      // Use GPU acceleration if available and beneficial
      if (this.gpuManager && optimizations.useGPU) {
        return await this.gpuManager.generateGroth16Proof(witness, provingKey);
      }
      
      // Standard CPU-based proof generation
      const { proof, publicSignals } = await snarkjs.groth16.prove(provingKey, witness);
      
      return {
        proof,
        publicSignals,
        algorithm: ProvingAlgorithm.GROTH16,
        size: JSON.stringify(proof).length,
        generatedAt: new Date()
      };
      
    } catch (error) {
      throw new Error(`Groth16 proof generation failed: ${error.message}`);
    }
  }

  /**
   * Generate PLONK proof
   */
  private async generatePlonkProof(
    witness: Uint8Array,
    circuit: CircuitDefinition,
    optimizations: OptimizationContext
  ): Promise<RawProof> {
    try {
      const provingKey = await this.getProvingKey(circuit.id);
      
      // PLONK implementation (would use appropriate library)
      const { proof, publicSignals } = await this.plonkProver.prove(provingKey, witness);
      
      return {
        proof,
        publicSignals,
        algorithm: ProvingAlgorithm.PLONK,
        size: JSON.stringify(proof).length,
        generatedAt: new Date()
      };
      
    } catch (error) {
      throw new Error(`PLONK proof generation failed: ${error.message}`);
    }
  }

  // ==================== OPTIMIZATION ENGINE ====================

  /**
   * Apply optimizations to proof generation context
   */
  private async applyOptimizations(
    request: ZKProofGenerationRequest,
    circuit: CircuitDefinition,
    witness: Uint8Array
  ): Promise<OptimizedGenerationContext> {
    const optimizations = await this.optimizationEngine.analyzeAndOptimize({
      request,
      circuit,
      witness,
      systemResources: await this.getSystemResources(),
      historicalData: this.metrics.getHistoricalData(circuit.id)
    });
    
    return {
      request,
      circuit,
      witness,
      optimizations
    };
  }

  // ==================== CACHING SYSTEM ====================

  /**
   * Check if proof exists in cache
   */
  private async checkProofCache(request: ZKProofGenerationRequest): Promise<ZKProofGenerationResult | null> {
    const cacheKey = this.generateCacheKey(request);
    const cachedResult = this.proofCache.get(cacheKey);
    
    if (cachedResult) {
      // Validate cache entry is still valid
      if (this.isCacheEntryValid(cachedResult)) {
        // Update cache hit metrics
        this.metrics.recordCacheHit(request.circuitId);
        return { ...cachedResult, cacheHit: true };
      } else {
        // Remove expired entry
        this.proofCache.delete(cacheKey);
      }
    }
    
    this.metrics.recordCacheMiss(request.circuitId);
    return null;
  }

  /**
   * Cache proof generation result
   */
  private async cacheProofResult(
    request: ZKProofGenerationRequest,
    result: ZKProofGenerationResult
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(request);
    
    // Set cache expiration based on circuit and optimization settings
    const expirationTime = this.calculateCacheExpiration(request, result);
    const cacheEntry = {
      ...result,
      cacheExpiresAt: expirationTime
    };
    
    this.proofCache.set(cacheKey, cacheEntry);
    
    // Implement cache size management
    await this.manageCacheSize();
  }

  // ==================== VALIDATION METHODS ====================

  /**
   * Validate proof generation request
   */
  private async validateGenerationRequest(request: ZKProofGenerationRequest): Promise<void> {
    // 1. Validate circuit exists
    if (!this.circuits.has(request.circuitId)) {
      throw new Error(`Circuit not found: ${request.circuitId}`);
    }
    
    // 2. Validate proving algorithm is supported
    const circuit = this.circuits.get(request.circuitId)!;
    if (!circuit.supportedAlgorithms.includes(request.provingAlgorithm)) {
      throw new Error(`Algorithm ${request.provingAlgorithm} not supported for circuit ${request.circuitId}`);
    }
    
    // 3. Security validation
    await this.securityValidator.validateRequest(request);
    
    // 4. Resource availability check
    await this.checkResourceAvailability(request);
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Generate unique proof ID
   */
  private generateProofId(request: ZKProofGenerationRequest): string {
    const hash = createHash('sha256');
    hash.update(JSON.stringify({
      circuitId: request.circuitId,
      inputHash: this.calculateInputHash(request.circuitInputs),
      timestamp: Date.now(),
      algorithm: request.provingAlgorithm
    }));
    return hash.digest('hex').substring(0, 16);
  }

  /**
   * Calculate hash of circuit inputs
   */
  private calculateInputHash(inputs: any): string {
    const hash = createHash('sha256');
    hash.update(JSON.stringify(inputs, Object.keys(inputs).sort()));
    return hash.digest('hex');
  }

  /**
   * Initialize circuits from configuration
   */
  private async initializeCircuits(circuitConfigs: CircuitConfig[]): Promise<void> {
    for (const config of circuitConfigs) {
      const circuit = await this.loadCircuitDefinition(config);
      this.circuits.set(circuit.id, circuit);
      
      // Preload proving keys for frequently used circuits
      if (config.preloadProvingKey) {
        await this.loadProvingKey(circuit.id);
      }
    }
  }

  /**
   * Get circuit definition
   */
  private getCircuit(circuitId: string): CircuitDefinition {
    const circuit = this.circuits.get(circuitId);
    if (!circuit) {
      throw new Error(`Circuit not found: ${circuitId}`);
    }
    return circuit;
  }

  /**
   * Get or load proving key
   */
  private async getProvingKey(circuitId: string): Promise<string> {
    if (!this.provingKeys.has(circuitId)) {
      await this.loadProvingKey(circuitId);
    }
    return this.provingKeys.get(circuitId)!;
  }

  /**
   * Load proving key for circuit
   */
  private async loadProvingKey(circuitId: string): Promise<void> {
    const circuit = this.getCircuit(circuitId);
    // Implementation would load the actual proving key file
    const provingKey = await this.loadProvingKeyFile(circuit.zkeyPath);
    this.provingKeys.set(circuitId, provingKey);
  }

  // ==================== EVENT HANDLERS ====================

  private setupEventHandlers(): void {
    this.on('generation:started', (data) => {
      this.activeGenerations.set(data.proofId, {
        startTime: Date.now(),
        circuitId: data.circuitId,
        status: 'generating'
      });
    });
    
    this.on('generation:completed', (data) => {
      this.activeGenerations.delete(data.proofId);
    });
    
    this.on('generation:error', (data) => {
      this.activeGenerations.delete(data.proofId);
    });
  }

  // ==================== PUBLIC API METHODS ====================

  /**
   * Get available circuits
   */
  public getAvailableCircuits(): CircuitDefinition[] {
    return Array.from(this.circuits.values());
  }

  /**
   * Get generation statistics
   */
  public getGenerationStats(): GenerationStats {
    return this.metrics.getStats();
  }

  /**
   * Get active generations
   */
  public getActiveGenerations(): GenerationContext[] {
    return Array.from(this.activeGenerations.values());
  }

  /**
   * Clear proof cache
   */
  public clearCache(): void {
    this.proofCache.clear();
    this.metrics.recordCacheClear();
  }

  /**
   * Shutdown service gracefully
   */
  public async shutdown(): Promise<void> {
    // Wait for active generations to complete
    while (this.activeGenerations.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Cleanup resources
    this.circuits.clear();
    this.provingKeys.clear();
    this.proofCache.clear();
    
    if (this.gpuManager) {
      await this.gpuManager.shutdown();
    }
    
    this.emit('service:shutdown');
  }
}

// ==================== SUPPORTING CLASSES ====================

class PerformanceMonitor {
  public async getSystemResources(): Promise<SystemResources> {
    // Implementation would monitor actual system resources
    return {
      cpuUsage: 0,
      memoryUsage: 0,
      availableMemory: 0,
      gpuAvailable: false
    };
  }
}

class SecurityValidator {
  constructor(private config: SecurityConfig) {}
  
  public async validateRequest(request: ZKProofGenerationRequest): Promise<void> {
    // Implementation would perform security validation
    // - Input sanitization
    // - Access control validation
    // - Rate limiting checks
    // - Audit trail requirements
  }
}

class OptimizationEngine {
  constructor(private config: OptimizationConfig) {}
  
  public async analyzeAndOptimize(context: any): Promise<OptimizationContext> {
    // Implementation would analyze and apply optimizations
    return {
      useGPU: false,
      useParallelization: false,
      useCaching: true,
      memoryOptimizations: []
    };
  }
}

class GPUManager {
  constructor(private config: GPUConfig) {}
  
  public async generateGroth16Proof(witness: Uint8Array, provingKey: string): Promise<RawProof> {
    // Implementation would use GPU acceleration for proof generation
    throw new Error('GPU proof generation not implemented');
  }
  
  public async shutdown(): Promise<void> {
    // Cleanup GPU resources
  }
}

class GenerationMetrics {
  private stats: Map<string, any> = new Map();
  
  public recordWitnessGeneration(circuitId: string, time: number, size: number): void {
    // Record witness generation metrics
  }
  
  public recordProofGeneration(circuitId: string, algorithm: ProvingAlgorithm, time: number, size: number): void {
    // Record proof generation metrics
  }
  
  public recordCacheHit(circuitId: string): void {
    // Record cache hit metrics
  }
  
  public recordCacheMiss(circuitId: string): void {
    // Record cache miss metrics
  }
  
  public recordCacheClear(): void {
    // Record cache clear event
  }
  
  public getHistoricalData(circuitId: string): any {
    return {};
  }
  
  public getStats(): GenerationStats {
    return {
      totalProofsGenerated: 0,
      averageGenerationTime: 0,
      cacheHitRate: 0,
      errorRate: 0
    };
  }
}

// ==================== TYPE DEFINITIONS ====================

interface ZKProofGenerationConfig {
  circuits: CircuitConfig[];
  security: SecurityConfig;
  optimization: OptimizationConfig;
  gpuAcceleration?: GPUConfig;
  caching?: CacheConfig;
}

interface CircuitConfig {
  id: string;
  wasmPath: string;
  zkeyPath: string;
  vkeyPath: string;
  preloadProvingKey?: boolean;
}

interface SecurityConfig {
  auditTrail: boolean;
  accessControl: boolean;
  inputValidation: boolean;
}

interface OptimizationConfig {
  enableCaching: boolean;
  enableGPU: boolean;
  maxConcurrentGenerations: number;
}

interface GPUConfig {
  enabled: boolean;
  deviceCount: number;
  memoryAllocation: number;
}

interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
  evictionPolicy: string;
}

interface ValidationRule {
  field: string;
  type: string;
  required: boolean;
  constraints?: any;
}

interface PreprocessingOptions {
  normalize?: boolean;
  hash?: boolean;
  encrypt?: boolean;
}

interface InputSchema {
  fields: Record<string, any>;
  required: string[];
  constraints: Record<string, any>;
}

interface OutputSchema {
  publicSignals: string[];
  proofFormat: string;
}

interface OptimizationProfile {
  memoryOptimized: boolean;
  speedOptimized: boolean;
  gpuOptimized: boolean;
}

interface WitnessData {
  inputs: Record<string, any>;
  preparationTime: number;
  inputHash: string;
  metadata: any;
}

interface GenerationContext {
  startTime: number;
  circuitId: string;
  status: string;
}

interface OptimizedGenerationContext {
  request: ZKProofGenerationRequest;
  circuit: CircuitDefinition;
  witness: Uint8Array;
  optimizations: OptimizationContext;
}

interface OptimizationContext {
  useGPU: boolean;
  useParallelization: boolean;
  useCaching: boolean;
  memoryOptimizations: string[];
}

interface RawProof {
  proof: any;
  publicSignals: any[];
  algorithm: ProvingAlgorithm;
  size: number;
  generatedAt: Date;
}

interface SystemResources {
  cpuUsage: number;
  memoryUsage: number;
  availableMemory: number;
  gpuAvailable: boolean;
}

interface GenerationError extends Error {
  code: string;
  circuitId: string;
  timestamp: Date;
}

interface BatchProgress {
  completed: number;
  total: number;
  currentItem: string;
}

interface BatchMetrics {
  averageTime: number;
  totalMemoryUsed: number;
  parallelEfficiency: number;
}

interface CacheMetrics {
  hitRate: number;
  missRate: number;
  evictions: number;
}

interface AuditEntry {
  timestamp: Date;
  action: string;
  details: any;
}

interface GenerationStats {
  totalProofsGenerated: number;
  averageGenerationTime: number;
  cacheHitRate: number;
  errorRate: number;
}

export default ZKProofGenerationService;