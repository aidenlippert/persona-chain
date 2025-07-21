"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CosmosVerifierService = void 0;
exports.createCosmosVerifierService = createCosmosVerifierService;
const cosmwasm_stargate_1 = require("@cosmjs/cosmwasm-stargate");
const proto_signing_1 = require("@cosmjs/proto-signing");
const stargate_1 = require("@cosmjs/stargate");
const crypto_1 = require("crypto");
class CosmosVerifierService {
    constructor(config) {
        this.config = config;
    }
    /**
     * Initialize the Cosmos client and wallet
     */
    async initialize() {
        try {
            if (this.config.mnemonic) {
                this.wallet = await proto_signing_1.DirectSecp256k1HdWallet.fromMnemonic(this.config.mnemonic, { prefix: 'persona' });
            }
            const gasPrice = stargate_1.GasPrice.fromString(this.config.gasPrice);
            if (this.wallet) {
                this.client = await cosmwasm_stargate_1.SigningCosmWasmClient.connectWithSigner(this.config.rpcEndpoint, this.wallet, { gasPrice });
            }
            else {
                // For read-only operations, create client without signer
                const { SigningCosmWasmClient } = await Promise.resolve().then(() => __importStar(require('@cosmjs/cosmwasm-stargate')));
                this.client = await SigningCosmWasmClient.connect(this.config.rpcEndpoint);
            }
            console.log('🔗 Cosmos verifier service initialized');
            console.log(`   Chain: ${this.config.chainId}`);
            console.log(`   Contract: ${this.config.contractAddress}`);
            console.log(`   RPC: ${this.config.rpcEndpoint}`);
        }
        catch (error) {
            console.error('❌ Failed to initialize Cosmos verifier service:', error);
            throw error;
        }
    }
    /**
     * Submit a proof to the on-chain verifier contract
     */
    async submitProof(submission) {
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
            const result = await this.client.execute(senderAddress, this.config.contractAddress, executeMsg, 'auto', 'PersonaPass ZK Proof Submission');
            // Extract proof verification result from events
            const wasmEvents = result.logs[0]?.events?.filter(e => e.type === 'wasm') || [];
            let proofId;
            let verified = false;
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
        }
        catch (error) {
            console.error('❌ Failed to submit proof to contract:', error);
            return {
                success: false,
                error: error.message || 'Unknown error occurred',
            };
        }
    }
    /**
     * Register a new circuit with the verifier contract
     */
    async registerCircuit(registration) {
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
            const result = await this.client.execute(senderAddress, this.config.contractAddress, executeMsg, 'auto', `Register ${registration.circuitId} circuit`);
            console.log(`✅ Circuit registered successfully`);
            console.log(`   Transaction: ${result.transactionHash}`);
            return {
                success: true,
                txHash: result.transactionHash,
            };
        }
        catch (error) {
            console.error('❌ Failed to register circuit:', error);
            return {
                success: false,
                error: error.message || 'Unknown error occurred',
            };
        }
    }
    /**
     * Query contract information
     */
    async getContractInfo() {
        if (!this.client) {
            console.error('Service not initialized');
            return null;
        }
        try {
            const queryMsg = { contract_info: {} };
            const result = await this.client.queryContractSmart(this.config.contractAddress, queryMsg);
            return {
                admin: result.admin,
                totalCircuits: parseInt(result.total_circuits),
                totalProofs: parseInt(result.total_proofs),
                version: result.version,
            };
        }
        catch (error) {
            console.error('❌ Failed to query contract info:', error);
            return null;
        }
    }
    /**
     * Get information about a specific circuit
     */
    async getCircuit(circuitId) {
        if (!this.client) {
            console.error('Service not initialized');
            return null;
        }
        try {
            const queryMsg = { circuit: { circuit_id: circuitId } };
            const result = await this.client.queryContractSmart(this.config.contractAddress, queryMsg);
            return {
                circuitId: result.circuit_id,
                verificationKey: result.verification_key,
                circuitType: result.circuit_type,
                creator: result.creator,
                active: result.active,
                createdAt: parseInt(result.created_at),
            };
        }
        catch (error) {
            console.error(`❌ Failed to query circuit ${circuitId}:`, error);
            return null;
        }
    }
    /**
     * List all registered circuits
     */
    async listCircuits(limit = 10) {
        if (!this.client) {
            console.error('Service not initialized');
            return [];
        }
        try {
            const queryMsg = { circuits: { limit } };
            const result = await this.client.queryContractSmart(this.config.contractAddress, queryMsg);
            return result.circuits.map((circuit) => ({
                circuitId: circuit.circuit_id,
                circuitType: circuit.circuit_type,
                creator: circuit.creator,
                active: circuit.active,
                createdAt: parseInt(circuit.created_at),
            }));
        }
        catch (error) {
            console.error('❌ Failed to list circuits:', error);
            return [];
        }
    }
    /**
     * Get a specific proof by ID
     */
    async getProof(proofId) {
        if (!this.client) {
            console.error('Service not initialized');
            return null;
        }
        try {
            const queryMsg = { proof: { proof_id: proofId } };
            const result = await this.client.queryContractSmart(this.config.contractAddress, queryMsg);
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
        }
        catch (error) {
            console.error(`❌ Failed to query proof ${proofId}:`, error);
            return null;
        }
    }
    /**
     * List proofs for a specific circuit
     */
    async getProofsByCircuit(circuitId, limit = 10) {
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
            const result = await this.client.queryContractSmart(this.config.contractAddress, queryMsg);
            return result.proofs.map((proof) => ({
                proofId: proof.proof_id,
                circuitId: proof.circuit_id,
                submitter: proof.submitter,
                publicInputs: proof.public_inputs,
                proof: proof.proof,
                verified: proof.verified,
                submittedAt: parseInt(proof.submitted_at),
                verifiedAt: proof.verified_at ? parseInt(proof.verified_at) : undefined,
            }));
        }
        catch (error) {
            console.error(`❌ Failed to query proofs for circuit ${circuitId}:`, error);
            return [];
        }
    }
    /**
     * Check if the service is properly configured and connected
     */
    async healthCheck() {
        try {
            if (!this.client) {
                return { connected: false, contractExists: false, error: 'Client not initialized' };
            }
            // Check contract exists
            const contractInfo = await this.getContractInfo();
            const contractExists = contractInfo !== null;
            // Check account balance if wallet available
            let accountBalance;
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
        }
        catch (error) {
            return {
                connected: false,
                contractExists: false,
                error: error.message || 'Unknown error',
            };
        }
    }
    /**
     * Generate a deterministic proof ID for tracking
     */
    generateProofId(circuitId, publicInputs, submitter) {
        const data = JSON.stringify({
            circuitId,
            publicInputs,
            submitter,
            timestamp: Math.floor(Date.now() / 1000),
        });
        return (0, crypto_1.createHash)('sha256').update(data).digest('hex').substring(0, 16);
    }
}
exports.CosmosVerifierService = CosmosVerifierService;
// Factory function to create and initialize the service
async function createCosmosVerifierService(config) {
    const service = new CosmosVerifierService(config);
    await service.initialize();
    return service;
}
//# sourceMappingURL=CosmosVerifierService.js.map