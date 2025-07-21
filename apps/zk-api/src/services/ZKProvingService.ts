import * as snarkjs from 'snarkjs';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Worker } from 'worker_threads';
import { createHash } from 'crypto';

export interface ProofRequest {
  circuitType: 'academic' | 'financial' | 'health' | 'social' | 'government' | 'iot' | 'universal';
  operation: string; // 'gpa_verification', 'income_verification', etc.
  privateInputs: any;
  publicInputs: any;
  commitment?: string;
  merkleProof?: any;
}

export interface ProofResult {
  proof: any;
  publicSignals: any;
  verification: boolean;
  circuitType: string;
  operation: string;
  proofId: string;
  timestamp: number;
  metadata?: any;
}

export interface CircuitInfo {
  name: string;
  wasmPath: string;
  zkeyPath: string;
  vkeyPath: string;
  r1csPath?: string;
  constraints: number;
  estimatedProvingTime: number; // seconds
}

export class ZKProvingService {
  private circuits: Map<string, CircuitInfo> = new Map();
  private provingQueue: Map<string, Promise<ProofResult>> = new Map();
  private circuitsPath: string;
  
  constructor() {
    this.circuitsPath = path.join(__dirname, '../../../circuits/build');
    this.initializeCircuits();
  }
  
  /**
   * Initialize all available circuits
   */
  private async initializeCircuits(): Promise<void> {
    console.log('🔧 Initializing ZK circuits...');
    
    const circuitConfigs = [
      {
        key: 'academic_gpa',
        name: 'GPA Verification',
        wasmPath: 'academic/gpa_verification.wasm',
        zkeyPath: 'academic/gpa_verification_final.zkey',
        vkeyPath: 'academic/gpa_verification_vkey.json',
        constraints: 15000,
        estimatedProvingTime: 2
      },
      {
        key: 'financial_income',
        name: 'Income Verification',
        wasmPath: 'financial/income_verification.wasm',
        zkeyPath: 'financial/income_verification_final.zkey',
        vkeyPath: 'financial/income_verification_vkey.json',
        constraints: 18000,
        estimatedProvingTime: 2.5
      },
      {
        key: 'health_vaccination',
        name: 'Vaccination Verification',
        wasmPath: 'health/vaccination_verification.wasm',
        zkeyPath: 'health/vaccination_verification_final.zkey',
        vkeyPath: 'health/vaccination_verification_vkey.json',
        constraints: 25000,
        estimatedProvingTime: 3
      },
      {
        key: 'social_influence',
        name: 'Social Influence Verification',
        wasmPath: 'social/influence_verification.wasm',
        zkeyPath: 'social/influence_verification_final.zkey',
        vkeyPath: 'social/influence_verification_vkey.json',
        constraints: 12000,
        estimatedProvingTime: 1.5
      },
      {
        key: 'government_license',
        name: 'License Verification',
        wasmPath: 'government/license_verification.wasm',
        zkeyPath: 'government/license_verification_final.zkey',
        vkeyPath: 'government/license_verification_vkey.json',
        constraints: 20000,
        estimatedProvingTime: 2.8
      },
      {
        key: 'iot_presence',
        name: 'Presence Verification',
        wasmPath: 'iot/presence_verification.wasm',
        zkeyPath: 'iot/presence_verification_final.zkey',
        vkeyPath: 'iot/presence_verification_vkey.json',
        constraints: 10000,
        estimatedProvingTime: 1.2
      },
      {
        key: 'universal_aggregate',
        name: 'Aggregate Proof',
        wasmPath: 'universal/aggregate_proof.wasm',
        zkeyPath: 'universal/aggregate_proof_final.zkey',
        vkeyPath: 'universal/aggregate_proof_vkey.json',
        constraints: 50000,
        estimatedProvingTime: 5
      }
    ];
    
    for (const config of circuitConfigs) {
      try {
        const wasmFullPath = path.join(this.circuitsPath, config.wasmPath);
        const zkeyFullPath = path.join(this.circuitsPath, config.zkeyPath);
        const vkeyFullPath = path.join(this.circuitsPath, config.vkeyPath);
        
        // Check if files exist (in production, they should be pre-compiled)
        const circuitInfo: CircuitInfo = {
          name: config.name,
          wasmPath: wasmFullPath,
          zkeyPath: zkeyFullPath,
          vkeyPath: vkeyFullPath,
          constraints: config.constraints,
          estimatedProvingTime: config.estimatedProvingTime
        };
        
        this.circuits.set(config.key, circuitInfo);
        console.log(`✅ Circuit registered: ${config.name} (${config.constraints} constraints)`);
        
      } catch (error) {
        console.warn(`⚠️ Circuit ${config.name} not available:`, error.message);
      }
    }
    
    console.log(`🚀 ${this.circuits.size} ZK circuits initialized`);
  }
  
  /**
   * Generate a zero-knowledge proof
   */
  async generateProof(request: ProofRequest): Promise<ProofResult> {
    const proofId = this.generateProofId(request);
    const circuitKey = `${request.circuitType}_${request.operation}`;
    
    console.log(`🔍 Generating ZK proof: ${circuitKey} (ID: ${proofId})`);
    
    // Check if proof is already being generated
    if (this.provingQueue.has(proofId)) {
      console.log(`⏳ Proof ${proofId} already in queue, waiting...`);
      return await this.provingQueue.get(proofId)!;
    }
    
    // Start proof generation
    const proofPromise = this.executeProofGeneration(request, proofId, circuitKey);
    this.provingQueue.set(proofId, proofPromise);
    
    try {
      const result = await proofPromise;
      return result;
    } finally {
      // Remove from queue when done
      this.provingQueue.delete(proofId);
    }
  }
  
  /**
   * Execute the actual proof generation
   */
  private async executeProofGeneration(
    request: ProofRequest, 
    proofId: string, 
    circuitKey: string
  ): Promise<ProofResult> {
    const startTime = Date.now();
    
    try {
      const circuit = this.circuits.get(circuitKey);
      if (!circuit) {
        throw new Error(`Circuit not found: ${circuitKey}`);
      }
      
      console.log(`⚡ Starting proof generation with circuit: ${circuit.name}`);
      console.log(`📊 Estimated time: ${circuit.estimatedProvingTime}s`);
      
      // Prepare inputs
      const inputs = this.prepareInputs(request);
      
      // Generate witness
      console.log('🧮 Generating witness...');
      const { witness } = await snarkjs.wtns.calculate(inputs, circuit.wasmPath);
      
      // Generate proof using Groth16
      console.log('🔐 Generating Groth16 proof...');
      const { proof, publicSignals } = await snarkjs.groth16.prove(
        circuit.zkeyPath,
        witness
      );
      
      // Verify proof
      console.log('✅ Verifying proof...');
      const vKey = JSON.parse(await fs.readFile(circuit.vkeyPath, 'utf8'));
      const verification = await snarkjs.groth16.verify(vKey, publicSignals, proof);
      
      const endTime = Date.now();
      const actualTime = (endTime - startTime) / 1000;
      
      console.log(`🎉 Proof generated successfully in ${actualTime.toFixed(2)}s`);
      
      const result: ProofResult = {
        proof,
        publicSignals,
        verification,
        circuitType: request.circuitType,
        operation: request.operation,
        proofId,
        timestamp: Date.now(),
        metadata: {
          constraints: circuit.constraints,
          estimatedTime: circuit.estimatedProvingTime,
          actualTime,
          circuitName: circuit.name
        }
      };
      
      return result;
      
    } catch (error) {
      console.error(`❌ Proof generation failed for ${proofId}:`, error);
      throw new Error(`Proof generation failed: ${error.message}`);
    }
  }
  
  /**
   * Prepare inputs for the circuit
   */
  private prepareInputs(request: ProofRequest): any {
    const inputs = {
      ...request.privateInputs,
      ...request.publicInputs
    };
    
    // Add default values for missing inputs
    switch (request.circuitType) {
      case 'academic':
        if (request.operation === 'gpa_verification') {
          inputs.merkle_proof = inputs.merkle_proof || Array(20).fill(0);
          inputs.merkle_proof_indices = inputs.merkle_proof_indices || Array(20).fill(0);
        }
        break;
        
      case 'financial':
        if (request.operation === 'income_verification') {
          inputs.merkle_proof = inputs.merkle_proof || Array(20).fill(0);
          inputs.merkle_proof_indices = inputs.merkle_proof_indices || Array(20).fill(0);
        }
        break;
        
      case 'health':
        if (request.operation === 'vaccination_verification') {
          inputs.vaccine_codes = inputs.vaccine_codes || Array(10).fill(0);
          inputs.vaccination_dates = inputs.vaccination_dates || Array(10).fill(0);
          inputs.lot_numbers = inputs.lot_numbers || Array(10).fill(0);
          inputs.provider_ids = inputs.provider_ids || Array(10).fill(0);
          inputs.merkle_proof = inputs.merkle_proof || Array(20).fill(0);
          inputs.merkle_proof_indices = inputs.merkle_proof_indices || Array(20).fill(0);
        }
        break;
        
      case 'universal':
        if (request.operation === 'aggregate_proof') {
          inputs.domain_proofs = inputs.domain_proofs || Array(8).fill(0);
          inputs.domain_commitments = inputs.domain_commitments || Array(8).fill(0);
          inputs.merkle_proofs = inputs.merkle_proofs || Array(8).fill(Array(20).fill(0));
          inputs.merkle_proof_indices = inputs.merkle_proof_indices || Array(8).fill(Array(20).fill(0));
        }
        break;
    }
    
    return inputs;
  }
  
  /**
   * Generate a unique proof ID
   */
  private generateProofId(request: ProofRequest): string {
    const data = JSON.stringify({
      circuitType: request.circuitType,
      operation: request.operation,
      publicInputs: request.publicInputs,
      timestamp: Math.floor(Date.now() / 1000) // Round to second for caching
    });
    
    return createHash('sha256').update(data).digest('hex').substring(0, 16);
  }
  
  /**
   * Verify an existing proof
   */
  async verifyProof(
    proof: any, 
    publicSignals: any[], 
    circuitType: string, 
    operation: string
  ): Promise<boolean> {
    try {
      const circuitKey = `${circuitType}_${operation}`;
      const circuit = this.circuits.get(circuitKey);
      
      if (!circuit) {
        throw new Error(`Circuit not found: ${circuitKey}`);
      }
      
      const vKey = JSON.parse(await fs.readFile(circuit.vkeyPath, 'utf8'));
      const verification = await snarkjs.groth16.verify(vKey, publicSignals, proof);
      
      console.log(`🔍 Proof verification result: ${verification ? 'VALID' : 'INVALID'}`);
      return verification;
      
    } catch (error) {
      console.error('❌ Proof verification failed:', error);
      return false;
    }
  }
  
  /**
   * Get circuit information
   */
  getCircuitInfo(circuitType: string, operation: string): CircuitInfo | null {
    const circuitKey = `${circuitType}_${operation}`;
    return this.circuits.get(circuitKey) || null;
  }
  
  /**
   * Get all available circuits
   */
  getAllCircuits(): Map<string, CircuitInfo> {
    return new Map(this.circuits);
  }
  
  /**
   * Get proof generation statistics
   */
  getStatistics(): {
    totalCircuits: number;
    activeProofs: number;
    avgProvingTime: number;
    circuitUsage: { [key: string]: number };
  } {
    // In production, would track actual statistics
    return {
      totalCircuits: this.circuits.size,
      activeProofs: this.provingQueue.size,
      avgProvingTime: 2.5,
      circuitUsage: {}
    };
  }
  
  /**
   * Generate a batch of proofs (for aggregate proofs)
   */
  async generateBatchProof(requests: ProofRequest[]): Promise<ProofResult[]> {
    console.log(`🔄 Generating batch of ${requests.length} proofs...`);
    
    const proofPromises = requests.map(request => this.generateProof(request));
    const results = await Promise.all(proofPromises);
    
    console.log(`✅ Batch proof generation completed: ${results.length} proofs`);
    return results;
  }
  
  /**
   * Generate proof in a worker thread (for CPU-intensive operations)
   */
  async generateProofInWorker(request: ProofRequest): Promise<ProofResult> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(path.join(__dirname, '../workers/proof-worker.js'), {
        workerData: { request, circuitsPath: this.circuitsPath }
      });
      
      worker.on('message', (result) => {
        if (result.error) {
          reject(new Error(result.error));
        } else {
          resolve(result);
        }
      });
      
      worker.on('error', reject);
      
      // Timeout after 30 seconds
      setTimeout(() => {
        worker.terminate();
        reject(new Error('Proof generation timeout'));
      }, 30000);
    });
  }
}