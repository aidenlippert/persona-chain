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
export declare class CosmosVerifierService {
    private config;
    private client?;
    private wallet?;
    constructor(config: CosmosVerifierConfig);
    /**
     * Initialize the Cosmos client and wallet
     */
    initialize(): Promise<void>;
    /**
     * Submit a proof to the on-chain verifier contract
     */
    submitProof(submission: ProofSubmission): Promise<{
        success: boolean;
        proofId?: string;
        txHash?: string;
        verified?: boolean;
        error?: string;
    }>;
    /**
     * Register a new circuit with the verifier contract
     */
    registerCircuit(registration: CircuitRegistration): Promise<{
        success: boolean;
        txHash?: string;
        error?: string;
    }>;
    /**
     * Query contract information
     */
    getContractInfo(): Promise<{
        admin: string;
        totalCircuits: number;
        totalProofs: number;
        version: string;
    } | null>;
    /**
     * Get information about a specific circuit
     */
    getCircuit(circuitId: string): Promise<{
        circuitId: string;
        verificationKey: string;
        circuitType: string;
        creator: string;
        active: boolean;
        createdAt: number;
    } | null>;
    /**
     * List all registered circuits
     */
    listCircuits(limit?: number): Promise<Array<{
        circuitId: string;
        circuitType: string;
        creator: string;
        active: boolean;
        createdAt: number;
    }>>;
    /**
     * Get a specific proof by ID
     */
    getProof(proofId: string): Promise<OnChainProof | null>;
    /**
     * List proofs for a specific circuit
     */
    getProofsByCircuit(circuitId: string, limit?: number): Promise<OnChainProof[]>;
    /**
     * Check if the service is properly configured and connected
     */
    healthCheck(): Promise<{
        connected: boolean;
        contractExists: boolean;
        accountBalance?: string;
        error?: string;
    }>;
    /**
     * Generate a deterministic proof ID for tracking
     */
    generateProofId(circuitId: string, publicInputs: string[], submitter: string): string;
}
export declare function createCosmosVerifierService(config: CosmosVerifierConfig): Promise<CosmosVerifierService>;
//# sourceMappingURL=CosmosVerifierService.d.ts.map