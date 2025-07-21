import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ProofRequest, ProofResult, CircuitInfo } from '../types/proving';

const execAsync = promisify(exec);

export class RealZKProvingService {
  private circuitsPath: string;
  private supportedCircuits: Map<string, CircuitInfo>;

  constructor() {
    this.circuitsPath = path.join(process.cwd(), '../../circuits');
    this.supportedCircuits = new Map([
      ['gpa_verification', {
        name: 'gpa_verification',
        domain: 'academic',
        wasmPath: 'build/academic/gpa_verification_js/gpa_verification.wasm',
        zkeyPath: 'build/academic/gpa_verification_0001.zkey',
        verificationKeyPath: 'build/academic/verification_key.json',
        maxConstraints: 174,
        publicInputs: 1
      }],
      ['age_verification', {
        name: 'age_verification',
        domain: 'government',
        wasmPath: 'build/government/age_verification_js/age_verification.wasm',
        zkeyPath: 'build/government/age_verification_0001.zkey',
        verificationKeyPath: 'build/government/verification_key.json',
        maxConstraints: 134,
        publicInputs: 1
      }],
      ['income_verification', {
        name: 'income_verification',
        domain: 'financial',
        wasmPath: 'build/financial/income_verification_js/income_verification.wasm',
        zkeyPath: 'build/financial/income_verification_0001.zkey',
        verificationKeyPath: 'build/financial/verification_key.json',
        maxConstraints: 174,
        publicInputs: 1
      }]
    ]);
  }

  async generateProof(request: ProofRequest): Promise<ProofResult> {
    const startTime = Date.now();
    
    try {
      // Validate circuit exists
      const circuitInfo = this.supportedCircuits.get(request.operation);
      if (!circuitInfo) {
        throw new Error(`Unsupported circuit: ${request.operation}`);
      }

      // Validate inputs
      this.validateInputs(request, circuitInfo);

      // Create temporary files for this proof generation
      const tempDir = await this.createTempDirectory();
      const inputFile = path.join(tempDir, 'input.json');
      const witnessFile = path.join(tempDir, 'witness.wtns');
      const proofFile = path.join(tempDir, 'proof.json');
      const publicFile = path.join(tempDir, 'public.json');

      try {
        // Write input file
        await fs.writeFile(inputFile, JSON.stringify(request.inputs, null, 2));

        // Generate witness
        const wasmPath = path.join(this.circuitsPath, circuitInfo.wasmPath);
        await this.executeSnarkJS(`wtns calculate ${wasmPath} ${inputFile} ${witnessFile}`);

        // Generate proof
        const zkeyPath = path.join(this.circuitsPath, circuitInfo.zkeyPath);
        await this.executeSnarkJS(`groth16 prove ${zkeyPath} ${witnessFile} ${proofFile} ${publicFile}`);

        // Read proof and public inputs
        const proofData = JSON.parse(await fs.readFile(proofFile, 'utf8'));
        const publicInputs = JSON.parse(await fs.readFile(publicFile, 'utf8'));

        // Verify proof
        const verificationKeyPath = path.join(this.circuitsPath, circuitInfo.verificationKeyPath);
        const verification = await this.verifyProof(verificationKeyPath, publicFile, proofFile);

        const endTime = Date.now();

        return {
          success: true,
          proof: proofData,
          publicInputs,
          verified: verification,
          circuit: circuitInfo.name,
          domain: circuitInfo.domain,
          generationTime: endTime - startTime,
          constraints: circuitInfo.maxConstraints,
          proofId: this.generateProofId(),
          timestamp: new Date().toISOString()
        };

      } finally {
        // Cleanup temporary files
        await this.cleanupTempDirectory(tempDir);
      }

    } catch (error) {
      const endTime = Date.now();
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        circuit: request.operation,
        domain: request.domain,
        generationTime: endTime - startTime,
        proofId: this.generateProofId(),
        timestamp: new Date().toISOString()
      };
    }
  }

  async verifyProof(verificationKeyPath: string, publicFile: string, proofFile: string): Promise<boolean> {
    try {
      const result = await this.executeSnarkJS(`groth16 verify ${verificationKeyPath} ${publicFile} ${proofFile}`);
      return result.includes('OK!');
    } catch (error) {
      return false;
    }
  }

  async batchGenerateProofs(requests: ProofRequest[]): Promise<ProofResult[]> {
    // For now, process sequentially to avoid resource conflicts
    // In production, could implement a queue system with worker processes
    const results: ProofResult[] = [];
    
    for (const request of requests) {
      const result = await this.generateProof(request);
      results.push(result);
      
      // Add small delay between proofs to prevent resource exhaustion
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  private async executeSnarkJS(command: string): Promise<string> {
    const fullCommand = `npx snarkjs ${command}`;
    const { stdout, stderr } = await execAsync(fullCommand, {
      cwd: this.circuitsPath,
      timeout: 30000 // 30 second timeout
    });

    if (stderr && !stderr.includes('[INFO]')) {
      throw new Error(`SnarkJS error: ${stderr}`);
    }

    return stdout;
  }

  private async createTempDirectory(): Promise<string> {
    const tempDir = path.join(this.circuitsPath, 'temp', `proof_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    await fs.mkdir(tempDir, { recursive: true });
    return tempDir;
  }

  private async cleanupTempDirectory(tempDir: string): Promise<void> {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to cleanup temp directory ${tempDir}:`, error);
    }
  }

  private validateInputs(request: ProofRequest, circuitInfo: CircuitInfo): void {
    if (!request.inputs || typeof request.inputs !== 'object') {
      throw new Error('Invalid inputs: must be an object');
    }

    // Circuit-specific validation
    switch (circuitInfo.name) {
      case 'gpa_verification':
        this.validateGPAInputs(request.inputs);
        break;
      case 'age_verification':
        this.validateAgeInputs(request.inputs);
        break;
      case 'income_verification':
        this.validateIncomeInputs(request.inputs);
        break;
      default:
        throw new Error(`No validation available for circuit: ${circuitInfo.name}`);
    }
  }

  private validateGPAInputs(inputs: any): void {
    const required = ['gpa', 'gpa_salt', 'threshold', 'merkle_root', 'institution_id', 'graduation_year'];
    const arrays = ['merkle_proof', 'merkle_proof_indices'];
    
    for (const field of required) {
      if (!(field in inputs)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    for (const field of arrays) {
      if (!(field in inputs) || !Array.isArray(inputs[field])) {
        throw new Error(`Missing or invalid array field: ${field}`);
      }
    }

    // Validate GPA range
    const gpa = parseInt(inputs.gpa);
    if (isNaN(gpa) || gpa < 0 || gpa > 400) {
      throw new Error('GPA must be between 0 and 400 (for 4.0 scale * 100)');
    }
  }

  private validateAgeInputs(inputs: any): void {
    const required = ['age', 'age_salt', 'minimum_age', 'merkle_root', 'document_type', 'issuer_id'];
    const arrays = ['merkle_proof', 'merkle_proof_indices'];
    
    for (const field of required) {
      if (!(field in inputs)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    for (const field of arrays) {
      if (!(field in inputs) || !Array.isArray(inputs[field])) {
        throw new Error(`Missing or invalid array field: ${field}`);
      }
    }

    // Validate age range
    const age = parseInt(inputs.age);
    if (isNaN(age) || age < 0 || age > 150) {
      throw new Error('Age must be between 0 and 150');
    }
  }

  private validateIncomeInputs(inputs: any): void {
    const required = ['annual_income', 'income_salt', 'minimum_income', 'merkle_root', 'bank_id', 'verification_year'];
    const arrays = ['merkle_proof', 'merkle_proof_indices'];
    
    for (const field of required) {
      if (!(field in inputs)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    for (const field of arrays) {
      if (!(field in inputs) || !Array.isArray(inputs[field])) {
        throw new Error(`Missing or invalid array field: ${field}`);
      }
    }

    // Validate income range
    const income = parseInt(inputs.annual_income);
    if (isNaN(income) || income < 0 || income > 10000000) {
      throw new Error('Income must be between 0 and $10,000,000');
    }
  }

  private generateProofId(): string {
    return `proof_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getSupportedCircuits(): string[] {
    return Array.from(this.supportedCircuits.keys());
  }

  getCircuitInfo(circuitName: string): CircuitInfo | undefined {
    return this.supportedCircuits.get(circuitName);
  }
}