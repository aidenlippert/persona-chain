import { SigningCosmWasmClient, CosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { GasPrice } from '@cosmjs/stargate';
import { createHash } from 'crypto';

// Error handling utility
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return getErrorMessage(error);
  }
  return String(error);
};

export interface CosmosVerifierConfig {
  contractAddress: string;
  chainId: string;
  rpcEndpoint: string;
  gasPrice: string;
  mnemonic?: string;
  accountAddress?: string;
}

export interface CircuitRegistration {
  circuitId: string;
  verificationKey: string;
  circuitType: string;
}

export interface ProofSubmission {
  circuitId: string;
  publicInputs: string[];
  proof: string;
}

export interface OnChainProof {
  proofId: string;
  circuitId: string;
  submitter: string;
  publicInputs: string[];
  proof: string;
  verified: boolean;
  submittedAt: number;
  verifiedAt?: number;
}

export class CosmosVerifierService {
  private config: CosmosVerifierConfig;
  private client?: SigningCosmWasmClient | CosmWasmClient;
  private wallet?: DirectSecp256k1HdWallet;

  constructor(config: CosmosVerifierConfig) {
    this.config = config;
  }

  /**
   * Initialize the Cosmos client and wallet
   */
  async initialize(): Promise<void> {
    try {
      if (this.config.mnemonic) {
        this.wallet = await DirectSecp256k1HdWallet.fromMnemonic(
          this.config.mnemonic,
          { prefix: 'persona' }
        );
      }

      const gasPrice = GasPrice.fromString(this.config.gasPrice);
      
      if (this.wallet) {
        this.client = await SigningCosmWasmClient.connectWithSigner(
          this.config.rpcEndpoint,
          this.wallet,
          { gasPrice }
        );
      } else {
        // For read-only operations, create client without signer
        this.client = await CosmWasmClient.connect(this.config.rpcEndpoint);
      }

      console.log('🔗 Cosmos verifier service initialized');
      console.log(`   Chain: ${this.config.chainId}`);
      console.log(`   Contract: ${this.config.contractAddress}`);
      console.log(`   RPC: ${this.config.rpcEndpoint}`);
    } catch (error) {
      console.error('❌ Failed to initialize Cosmos verifier service:', error);
      throw error;
    }
  }

  /**
   * Submit a proof to the on-chain verifier contract
   */
  async submitProof(submission: ProofSubmission): Promise<{
    success: boolean;
    proofId?: string;
    txHash?: string;
    verified?: boolean;
    error?: string;
  }> {
    if (!this.client || !this.wallet) {
      return { success: false, error: 'Service not initialized or no wallet available' };
    }

    try {
      const accounts = await this.wallet.getAccounts();
      const senderAddress = accounts[0].address;

      const executeMsg = {
        submit_proof: {
          circuit_id: submission.circuitId,
          public_inputs: submission.publicInputs,
          proof: submission.proof,
        },
      };

      console.log(`📤 Submitting proof to contract for circuit: ${submission.circuitId}`);

      if (!('execute' in this.client)) {
        throw new Error('Client does not support signing operations. Please initialize with a mnemonic.');
      }

      const result = await this.client.execute(
        senderAddress,
        this.config.contractAddress,
        executeMsg,
        'auto',
        'PersonaPass ZK Proof Submission'
      );

      // Extract proof verification result from events
      const wasmEvents = result.logs[0]?.events?.filter((e: any) => e.type === 'wasm') || [];
      let proofId: string | undefined;
      let verified: boolean = false;

      for (const event of wasmEvents) {
        for (const attr of event.attributes) {
          if (attr.key === 'proof_id') {
            proofId = attr.value;
          }
          if (attr.key === 'verified') {
            verified = attr.value === 'true';
          }
        }
      }

      console.log(`✅ Proof submitted successfully`);
      console.log(`   Transaction: ${result.transactionHash}`);
      console.log(`   Proof ID: ${proofId}`);
      console.log(`   Verified: ${verified}`);

      return {
        success: true,
        proofId,
        txHash: result.transactionHash,
        verified,
      };
    } catch (error) {
      console.error('❌ Failed to submit proof to contract:', error);
      return {
        success: false,
        error: getErrorMessage(error) || 'Unknown error occurred',
      };
    }
  }

  /**
   * Register a new circuit with the verifier contract
   */
  async registerCircuit(registration: CircuitRegistration): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
  }> {
    if (!this.client || !this.wallet) {
      return { success: false, error: 'Service not initialized or no wallet available' };
    }

    try {
      const accounts = await this.wallet.getAccounts();
      const senderAddress = accounts[0].address;

      const executeMsg = {
        register_circuit: {
          circuit_id: registration.circuitId,
          verification_key: registration.verificationKey,
          circuit_type: registration.circuitType,
        },
      };

      console.log(`🔧 Registering circuit: ${registration.circuitId}`);

      if (!('execute' in this.client)) {
        throw new Error('Client does not support signing operations. Please initialize with a mnemonic.');
      }

      const result = await this.client.execute(
        senderAddress,
        this.config.contractAddress,
        executeMsg,
        'auto',
        `Register ${registration.circuitId} circuit`
      );

      console.log(`✅ Circuit registered successfully`);
      console.log(`   Transaction: ${result.transactionHash}`);

      return {
        success: true,
        txHash: result.transactionHash,
      };
    } catch (error) {
      console.error('❌ Failed to register circuit:', error);
      return {
        success: false,
        error: getErrorMessage(error) || 'Unknown error occurred',
      };
    }
  }

  /**
   * Query contract information
   */
  async getContractInfo(): Promise<{
    admin: string;
    totalCircuits: number;
    totalProofs: number;
    version: string;
  } | null> {
    if (!this.client) {
      console.error('Service not initialized');
      return null;
    }

    try {
      const queryMsg = { contract_info: {} };
      const result = await this.client.queryContractSmart(
        this.config.contractAddress,
        queryMsg
      );

      return {
        admin: result.admin,
        totalCircuits: parseInt(result.total_circuits),
        totalProofs: parseInt(result.total_proofs),
        version: result.version,
      };
    } catch (error) {
      console.error('❌ Failed to query contract info:', error);
      return null;
    }
  }

  /**
   * Get information about a specific circuit
   */
  async getCircuit(circuitId: string): Promise<{
    circuitId: string;
    verificationKey: string;
    circuitType: string;
    creator: string;
    active: boolean;
    createdAt: number;
  } | null> {
    if (!this.client) {
      console.error('Service not initialized');
      return null;
    }

    try {
      const queryMsg = { circuit: { circuit_id: circuitId } };
      const result = await this.client.queryContractSmart(
        this.config.contractAddress,
        queryMsg
      );

      return {
        circuitId: result.circuit_id,
        verificationKey: result.verification_key,
        circuitType: result.circuit_type,
        creator: result.creator,
        active: result.active,
        createdAt: parseInt(result.created_at),
      };
    } catch (error) {
      console.error(`❌ Failed to query circuit ${circuitId}:`, error);
      return null;
    }
  }

  /**
   * List all registered circuits
   */
  async listCircuits(limit: number = 10): Promise<Array<{
    circuitId: string;
    circuitType: string;
    creator: string;
    active: boolean;
    createdAt: number;
  }>> {
    if (!this.client) {
      console.error('Service not initialized');
      return [];
    }

    try {
      const queryMsg = { circuits: { limit } };
      const result = await this.client.queryContractSmart(
        this.config.contractAddress,
        queryMsg
      );

      return result.circuits.map((circuit: any) => ({
        circuitId: circuit.circuit_id,
        circuitType: circuit.circuit_type,
        creator: circuit.creator,
        active: circuit.active,
        createdAt: parseInt(circuit.created_at),
      }));
    } catch (error) {
      console.error('❌ Failed to list circuits:', error);
      return [];
    }
  }

  /**
   * Get a specific proof by ID
   */
  async getProof(proofId: string): Promise<OnChainProof | null> {
    if (!this.client) {
      console.error('Service not initialized');
      return null;
    }

    try {
      const queryMsg = { proof: { proof_id: proofId } };
      const result = await this.client.queryContractSmart(
        this.config.contractAddress,
        queryMsg
      );

      return {
        proofId: result.proof_id,
        circuitId: result.circuit_id,
        submitter: result.submitter,
        publicInputs: result.public_inputs,
        proof: result.proof,
        verified: result.verified,
        submittedAt: parseInt(result.submitted_at),
        verifiedAt: result.verified_at ? parseInt(result.verified_at) : undefined,
      };
    } catch (error) {
      console.error(`❌ Failed to query proof ${proofId}:`, error);
      return null;
    }
  }

  /**
   * List proofs for a specific circuit
   */
  async getProofsByCircuit(circuitId: string, limit: number = 10): Promise<OnChainProof[]> {
    if (!this.client) {
      console.error('Service not initialized');
      return [];
    }

    try {
      const queryMsg = {
        proofs_by_circuit: {
          circuit_id: circuitId,
          limit,
        },
      };
      const result = await this.client.queryContractSmart(
        this.config.contractAddress,
        queryMsg
      );

      return result.proofs.map((proof: any) => ({
        proofId: proof.proof_id,
        circuitId: proof.circuit_id,
        submitter: proof.submitter,
        publicInputs: proof.public_inputs,
        proof: proof.proof,
        verified: proof.verified,
        submittedAt: parseInt(proof.submitted_at),
        verifiedAt: proof.verified_at ? parseInt(proof.verified_at) : undefined,
      }));
    } catch (error) {
      console.error(`❌ Failed to query proofs for circuit ${circuitId}:`, error);
      return [];
    }
  }

  /**
   * Check if the service is properly configured and connected
   */
  async healthCheck(): Promise<{
    connected: boolean;
    contractExists: boolean;
    accountBalance?: string;
    error?: string;
  }> {
    try {
      if (!this.client) {
        return { connected: false, contractExists: false, error: 'Client not initialized' };
      }

      // Check contract exists
      const contractInfo = await this.getContractInfo();
      const contractExists = contractInfo !== null;

      // Check account balance if wallet available
      let accountBalance: string | undefined;
      if (this.wallet) {
        const accounts = await this.wallet.getAccounts();
        const balance = await this.client.getBalance(accounts[0].address, 'upersona');
        accountBalance = `${balance.amount} ${balance.denom}`;
      }

      return {
        connected: true,
        contractExists,
        accountBalance,
      };
    } catch (error) {
      return {
        connected: false,
        contractExists: false,
        error: getErrorMessage(error) || 'Unknown error',
      };
    }
  }

  /**
   * Generate a deterministic proof ID for tracking
   */
  generateProofId(circuitId: string, publicInputs: string[], submitter: string): string {
    const data = JSON.stringify({
      circuitId,
      publicInputs,
      submitter,
      timestamp: Math.floor(Date.now() / 1000),
    });
    return createHash('sha256').update(data).digest('hex').substring(0, 16);
  }
}

// Factory function to create and initialize the service
export async function createCosmosVerifierService(
  config: CosmosVerifierConfig
): Promise<CosmosVerifierService> {
  const service = new CosmosVerifierService(config);
  await service.initialize();
  return service;
}