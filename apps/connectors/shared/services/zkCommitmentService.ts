import { createHash } from 'crypto';
import { poseidon2 } from 'poseidon-lite';
import * as snarkjs from 'snarkjs';

export interface ZKCommitment {
  commitment: string;
  nullifier: string;
  proof?: any;
  publicSignals?: string[];
}

export interface SelectiveDisclosureRequest {
  fields: string[];
  predicates?: {
    field: string;
    operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte';
    value: any;
  }[];
}

export interface ZKProofCircuit {
  name: string;
  wasmPath: string;
  zkeyPath: string;
  vKeyPath: string;
}

export class ZKCommitmentService {
  private circuits: Map<string, ZKProofCircuit>;

  constructor() {
    this.circuits = new Map();
    this.initializeCircuits();
  }

  private initializeCircuits() {
    // Define available circuits for different credential types
    this.circuits.set('age_verification', {
      name: 'age_verification',
      wasmPath: '/circuits/age_verification.wasm',
      zkeyPath: '/circuits/age_verification_0001.zkey',
      vKeyPath: '/circuits/age_verification_vkey.json'
    });

    this.circuits.set('reputation_threshold', {
      name: 'reputation_threshold',
      wasmPath: '/circuits/reputation_threshold.wasm',
      zkeyPath: '/circuits/reputation_threshold_0001.zkey',
      vKeyPath: '/circuits/reputation_threshold_vkey.json'
    });

    this.circuits.set('membership_proof', {
      name: 'membership_proof',
      wasmPath: '/circuits/membership_proof.wasm',
      zkeyPath: '/circuits/membership_proof_0001.zkey',
      vKeyPath: '/circuits/membership_proof_vkey.json'
    });
  }

  /**
   * Generate a commitment for credential data
   */
  async generateCommitment(
    credentialData: any,
    salt?: string
  ): Promise<string> {
    // Generate salt if not provided
    const commitmentSalt = salt || this.generateSalt();

    // Serialize credential data
    const serializedData = this.serializeCredentialData(credentialData);

    // Convert to field elements
    const fieldElements = this.dataToFieldElements(serializedData);

    // Add salt to the field elements
    fieldElements.push(BigInt('0x' + Buffer.from(commitmentSalt).toString('hex')));

    // Generate Poseidon hash commitment
    const commitment = poseidon2(fieldElements);

    return commitment.toString();
  }

  /**
   * Generate nullifier for credential
   */
  async generateNullifier(
    credentialId: string,
    secret: string
  ): Promise<string> {
    const input = credentialId + secret;
    const hash = createHash('sha256').update(input).digest();
    const nullifier = poseidon2([BigInt('0x' + hash.toString('hex'))]);
    return nullifier.toString();
  }

  /**
   * Generate ZK proof for selective disclosure
   */
  async generateSelectiveDisclosureProof(
    credentialData: any,
    disclosureRequest: SelectiveDisclosureRequest,
    circuitName: string = 'membership_proof'
  ): Promise<ZKProofCircuit> {
    const circuit = this.circuits.get(circuitName);
    if (!circuit) {
      throw new Error(`Circuit ${circuitName} not found`);
    }

    try {
      // Prepare input for the circuit
      const circuitInputs = this.prepareCircuitInputs(
        credentialData,
        disclosureRequest
      );

      // Generate witness
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        circuitInputs,
        circuit.wasmPath,
        circuit.zkeyPath
      );

      return {
        ...circuit,
        proof,
        publicSignals
      };
    } catch (error) {
      console.error('Failed to generate ZK proof:', error);
      throw new Error('ZK proof generation failed');
    }
  }

  /**
   * Verify ZK proof
   */
  async verifyProof(
    proof: any,
    publicSignals: string[],
    circuitName: string
  ): Promise<boolean> {
    const circuit = this.circuits.get(circuitName);
    if (!circuit) {
      throw new Error(`Circuit ${circuitName} not found`);
    }

    try {
      const vKey = await fetch(circuit.vKeyPath).then(r => r.json());
      const verified = await snarkjs.groth16.verify(vKey, publicSignals, proof);
      return verified;
    } catch (error) {
      console.error('Proof verification failed:', error);
      return false;
    }
  }

  /**
   * Create platform-specific ZK commitments
   */
  async createPlatformCommitment(
    platform: string,
    credentialData: any
  ): Promise<ZKCommitment> {
    const commitmentGenerators: Record<string, (data: any) => Promise<ZKCommitment>> = {
      github: async (data) => {
        const commitment = await this.generateCommitment({
          username: data.username,
          reputation: data.followers + data.publicRepos,
          verified: data.verified,
          accountAge: new Date(data.createdAt).getTime()
        });

        const nullifier = await this.generateNullifier(
          data.id,
          data.username
        );

        return { commitment, nullifier };
      },

      linkedin: async (data) => {
        const commitment = await this.generateCommitment({
          name: `${data.firstName} ${data.lastName}`,
          email: data.email,
          industry: data.industry,
          location: data.location
        });

        const nullifier = await this.generateNullifier(
          data.id,
          data.email
        );

        return { commitment, nullifier };
      },

      orcid: async (data) => {
        const commitment = await this.generateCommitment({
          orcidId: data.orcidId,
          name: data.name,
          affiliations: data.affiliations?.length || 0,
          works: data.works?.length || 0
        });

        const nullifier = await this.generateNullifier(
          data.id,
          data.orcidId
        );

        return { commitment, nullifier };
      },

      plaid: async (data) => {
        const commitment = await this.generateCommitment({
          name: data.name,
          verifiedAt: data.verifiedAt,
          hasEmail: data.emails?.length > 0,
          hasPhone: data.phoneNumbers?.length > 0,
          hasAddress: data.addresses?.length > 0
        });

        const nullifier = await this.generateNullifier(
          data.id,
          data.name
        );

        return { commitment, nullifier };
      },

      twitter: async (data) => {
        const commitment = await this.generateCommitment({
          username: data.username,
          verified: data.verified,
          followersCount: data.followersCount,
          accountAge: new Date(data.createdAt).getTime()
        });

        const nullifier = await this.generateNullifier(
          data.id,
          data.username
        );

        return { commitment, nullifier };
      },

      stackexchange: async (data) => {
        const commitment = await this.generateCommitment({
          displayName: data.displayName,
          reputation: data.reputation,
          badges: data.badges,
          accountAge: new Date(data.accountCreated).getTime()
        });

        const nullifier = await this.generateNullifier(
          data.id,
          data.displayName
        );

        return { commitment, nullifier };
      }
    };

    const generator = commitmentGenerators[platform];
    if (!generator) {
      throw new Error(`No commitment generator for platform: ${platform}`);
    }

    return generator(credentialData);
  }

  /**
   * Generate salt for commitments
   */
  private generateSalt(): string {
    return createHash('sha256')
      .update(Date.now().toString() + Math.random().toString())
      .digest('hex');
  }

  /**
   * Serialize credential data for commitment
   */
  private serializeCredentialData(data: any): string {
    // Sort keys for consistent serialization
    const sortedData = Object.keys(data)
      .sort()
      .reduce((acc, key) => {
        acc[key] = data[key];
        return acc;
      }, {} as any);

    return JSON.stringify(sortedData);
  }

  /**
   * Convert data to field elements for ZK circuits
   */
  private dataToFieldElements(data: string): bigint[] {
    const hash = createHash('sha256').update(data).digest();
    const chunks: bigint[] = [];

    // Split hash into 31-byte chunks for field compatibility
    for (let i = 0; i < hash.length; i += 31) {
      const chunk = hash.slice(i, i + 31);
      chunks.push(BigInt('0x' + chunk.toString('hex')));
    }

    return chunks;
  }

  /**
   * Prepare inputs for ZK circuit
   */
  private prepareCircuitInputs(
    credentialData: any,
    disclosureRequest: SelectiveDisclosureRequest
  ): any {
    const inputs: any = {
      // Private inputs (credential data)
      privateData: {},
      // Public inputs (disclosed fields)
      publicData: {}
    };

    // Add requested fields to public data
    for (const field of disclosureRequest.fields) {
      const value = this.getNestedValue(credentialData, field);
      if (value !== undefined) {
        inputs.publicData[field] = this.valueToFieldElement(value);
      }
    }

    // Add remaining fields to private data
    const allFields = this.getAllFields(credentialData);
    for (const field of allFields) {
      if (!disclosureRequest.fields.includes(field)) {
        const value = this.getNestedValue(credentialData, field);
        inputs.privateData[field] = this.valueToFieldElement(value);
      }
    }

    // Add predicates if any
    if (disclosureRequest.predicates) {
      inputs.predicates = disclosureRequest.predicates.map(p => ({
        field: p.field,
        operator: p.operator,
        value: this.valueToFieldElement(p.value)
      }));
    }

    return inputs;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Get all field paths from object
   */
  private getAllFields(obj: any, prefix = ''): string[] {
    const fields: string[] = [];

    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        fields.push(...this.getAllFields(value, path));
      } else {
        fields.push(path);
      }
    }

    return fields;
  }

  /**
   * Convert value to field element
   */
  private valueToFieldElement(value: any): bigint {
    if (typeof value === 'string') {
      const hash = createHash('sha256').update(value).digest();
      return BigInt('0x' + hash.toString('hex')) % BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
    } else if (typeof value === 'number') {
      return BigInt(value);
    } else if (typeof value === 'boolean') {
      return BigInt(value ? 1 : 0);
    } else {
      // For complex types, serialize and hash
      const serialized = JSON.stringify(value);
      const hash = createHash('sha256').update(serialized).digest();
      return BigInt('0x' + hash.toString('hex')) % BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
    }
  }
}