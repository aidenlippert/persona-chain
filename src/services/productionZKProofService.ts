/**
 * Production Zero-Knowledge Proof Service
 * Real ZK proof generation using circom and snarkjs
 */

import { groth16 } from 'snarkjs';
import { buildPoseidon } from 'circomlibjs';
import { ethers } from 'ethers';
import { logger } from './logger';

interface ZKProof {
  proof: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    protocol: string;
    curve: string;
  };
  publicSignals: string[];
}

interface ProofRequest {
  circuitName: string;
  inputs: Record<string, any>;
  metadata?: any;
}

interface ProofResponse {
  proof: ZKProof;
  verificationKey: any;
  proofId: string;
  timestamp: string;
}

interface CircuitConfig {
  name: string;
  wasmPath: string;
  zkeyPath: string;
  verificationKeyPath: string;
  inputConstraints: Record<string, any>;
}

export class ProductionZKProofService {
  private static instance: ProductionZKProofService;
  private poseidon: any;
  private circuits: Map<string, CircuitConfig> = new Map();
  private isInitialized = false;

  // Production circuit configurations
  private readonly CIRCUIT_CONFIGS: CircuitConfig[] = [
    {
      name: 'age_verification',
      wasmPath: '/circuits/age_verification.wasm',
      zkeyPath: '/circuits/age_verification_0001.zkey',
      verificationKeyPath: '/circuits/age_verification_verification_key.json',
      inputConstraints: {
        age: { type: 'number', min: 0, max: 150 },
        threshold: { type: 'number', min: 0, max: 150 },
        salt: { type: 'string', length: 32 }
      }
    },
    {
      name: 'income_verification',
      wasmPath: '/circuits/income_verification.wasm',
      zkeyPath: '/circuits/income_verification_0001.zkey',
      verificationKeyPath: '/circuits/income_verification_verification_key.json',
      inputConstraints: {
        income: { type: 'number', min: 0, max: 10000000 },
        threshold: { type: 'number', min: 0, max: 10000000 },
        salt: { type: 'string', length: 32 }
      }
    },
    {
      name: 'identity_verification',
      wasmPath: '/circuits/identity_verification.wasm',
      zkeyPath: '/circuits/identity_verification_0001.zkey',
      verificationKeyPath: '/circuits/identity_verification_verification_key.json',
      inputConstraints: {
        identity_hash: { type: 'string', length: 64 },
        secret: { type: 'string', length: 32 },
        timestamp: { type: 'number', min: 0 }
      }
    },
    {
      name: 'membership_verification',
      wasmPath: '/circuits/membership_verification.wasm',
      zkeyPath: '/circuits/membership_verification_0001.zkey',
      verificationKeyPath: '/circuits/membership_verification_verification_key.json',
      inputConstraints: {
        member_id: { type: 'string', length: 32 },
        group_root: { type: 'string', length: 64 },
        merkle_path: { type: 'array', maxLength: 20 }
      }
    },
    {
      name: 'credential_verification',
      wasmPath: '/circuits/credential_verification.wasm',
      zkeyPath: '/circuits/credential_verification_0001.zkey',
      verificationKeyPath: '/circuits/credential_verification_verification_key.json',
      inputConstraints: {
        credential_hash: { type: 'string', length: 64 },
        issuer_signature: { type: 'string', length: 128 },
        holder_secret: { type: 'string', length: 32 }
      }
    }
  ];

  static getInstance(): ProductionZKProofService {
    if (!ProductionZKProofService.instance) {
      ProductionZKProofService.instance = new ProductionZKProofService();
    }
    return ProductionZKProofService.instance;
  }

  private constructor() {}

  async initialize(): Promise<void> {
    try {
      // Initialize Poseidon hash function
      this.poseidon = await buildPoseidon();
      
      // Load circuit configurations
      for (const config of this.CIRCUIT_CONFIGS) {
        this.circuits.set(config.name, config);
      }
      
      this.isInitialized = true;
      console.log('✅ ZK Proof service initialized with', this.circuits.size, 'circuits');
    } catch (error) {
      logger.error('❌ Failed to initialize ZK proof service:', error);
      throw error;
    }
  }

  async generateProof(request: ProofRequest): Promise<ProofResponse> {
    if (!this.isInitialized) {
      throw new Error('ZK Proof service not initialized');
    }

    try {
      const circuit = this.circuits.get(request.circuitName);
      if (!circuit) {
        throw new Error(`Circuit ${request.circuitName} not found`);
      }

      // Validate inputs
      this.validateInputs(request.inputs, circuit.inputConstraints);

      // Process inputs for circuit
      const processedInputs = await this.processInputs(request.inputs, request.circuitName);

      // Generate proof using snarkjs
      const { proof, publicSignals } = await groth16.fullProve(
        processedInputs,
        circuit.wasmPath,
        circuit.zkeyPath
      );

      // Load verification key
      const verificationKey = await this.loadVerificationKey(circuit.verificationKeyPath);

      const proofResponse: ProofResponse = {
        proof: {
          proof: {
            pi_a: proof.pi_a,
            pi_b: proof.pi_b,
            pi_c: proof.pi_c,
            protocol: 'groth16',
            curve: 'bn128'
          },
          publicSignals
        },
        verificationKey,
        proofId: crypto.randomUUID(),
        timestamp: new Date().toISOString()
      };

      console.log('✅ ZK Proof generated:', request.circuitName);
      return proofResponse;
    } catch (error) {
      logger.error('❌ Failed to generate ZK proof:', error);
      throw error;
    }
  }

  async verifyProof(
    proof: ZKProof,
    verificationKey: any,
    circuitName: string
  ): Promise<boolean> {
    try {
      const result = await groth16.verify(
        verificationKey,
        proof.publicSignals,
        proof.proof
      );

      console.log('✅ ZK Proof verification result:', result);
      return result;
    } catch (error) {
      logger.error('❌ Failed to verify ZK proof:', error);
      return false;
    }
  }

  // Age verification proof
  async generateAgeProof(age: number, minAge: number, salt: string): Promise<ProofResponse> {
    return this.generateProof({
      circuitName: 'age_verification',
      inputs: {
        age: age,
        threshold: minAge,
        salt: salt
      }
    });
  }

  // Income verification proof
  async generateIncomeProof(income: number, minIncome: number, salt: string): Promise<ProofResponse> {
    return this.generateProof({
      circuitName: 'income_verification',
      inputs: {
        income: income,
        threshold: minIncome,
        salt: salt
      }
    });
  }

  // Identity verification proof
  async generateIdentityProof(identityData: any, secret: string): Promise<ProofResponse> {
    const identityHash = this.poseidon([JSON.stringify(identityData)]).toString();
    
    return this.generateProof({
      circuitName: 'identity_verification',
      inputs: {
        identity_hash: identityHash,
        secret: secret,
        timestamp: Math.floor(Date.now() / 1000)
      }
    });
  }

  // Membership verification proof
  async generateMembershipProof(
    memberId: string,
    groupRoot: string,
    merklePath: string[]
  ): Promise<ProofResponse> {
    return this.generateProof({
      circuitName: 'membership_verification',
      inputs: {
        member_id: memberId,
        group_root: groupRoot,
        merkle_path: merklePath
      }
    });
  }

  // Credential verification proof
  async generateCredentialProof(
    credentialHash: string,
    issuerSignature: string,
    holderSecret: string
  ): Promise<ProofResponse> {
    return this.generateProof({
      circuitName: 'credential_verification',
      inputs: {
        credential_hash: credentialHash,
        issuer_signature: issuerSignature,
        holder_secret: holderSecret
      }
    });
  }

  private validateInputs(inputs: any, constraints: Record<string, any>): void {
    for (const [key, constraint] of Object.entries(constraints)) {
      const value = inputs[key];
      
      if (value === undefined || value === null) {
        throw new Error(`Missing required input: ${key}`);
      }

      if (constraint.type === 'number') {
        if (typeof value !== 'number') {
          throw new Error(`Input ${key} must be a number`);
        }
        if (constraint.min !== undefined && value < constraint.min) {
          throw new Error(`Input ${key} must be >= ${constraint.min}`);
        }
        if (constraint.max !== undefined && value > constraint.max) {
          throw new Error(`Input ${key} must be <= ${constraint.max}`);
        }
      }

      if (constraint.type === 'string') {
        if (typeof value !== 'string') {
          throw new Error(`Input ${key} must be a string`);
        }
        if (constraint.length !== undefined && value.length !== constraint.length) {
          throw new Error(`Input ${key} must be exactly ${constraint.length} characters`);
        }
      }

      if (constraint.type === 'array') {
        if (!Array.isArray(value)) {
          throw new Error(`Input ${key} must be an array`);
        }
        if (constraint.maxLength !== undefined && value.length > constraint.maxLength) {
          throw new Error(`Input ${key} must have <= ${constraint.maxLength} elements`);
        }
      }
    }
  }

  private async processInputs(inputs: any, circuitName: string): Promise<any> {
    const processed = { ...inputs };

    // Convert string inputs to field elements for circuit compatibility
    for (const [key, value] of Object.entries(processed)) {
      if (typeof value === 'string' && value.length > 0) {
        // Convert string to field element using Poseidon hash
        processed[key] = this.poseidon([value]).toString();
      }
    }

    return processed;
  }

  private async loadVerificationKey(path: string): Promise<any> {
    try {
      // In production, this would load from a secure location
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to load verification key: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      logger.error('❌ Failed to load verification key:', error);
      throw error;
    }
  }

  // Utility functions
  hash(data: any): string {
    return this.poseidon([JSON.stringify(data)]).toString();
  }

  generateSalt(): string {
    return ethers.hexlify(ethers.randomBytes(16));
  }

  generateSecret(): string {
    return ethers.hexlify(ethers.randomBytes(32));
  }

  // Circuit management
  async addCircuit(config: CircuitConfig): Promise<void> {
    this.circuits.set(config.name, config);
    console.log('✅ Circuit added:', config.name);
  }

  getAvailableCircuits(): string[] {
    return Array.from(this.circuits.keys());
  }

  getCircuitInfo(circuitName: string): CircuitConfig | undefined {
    return this.circuits.get(circuitName);
  }
}