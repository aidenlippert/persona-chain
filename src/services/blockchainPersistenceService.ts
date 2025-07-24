/**
 * Blockchain Persistence Service for Persona
 * Manages on-chain DID documents and credential registries
 */

import { ethers } from "ethers";
// Use real HSM service for production
import { realHSMService as gcpHSMService } from "./realHSMService";
import type { DIDDocument, DIDKeyPair } from "./didService";
import type { VerifiableCredential } from "../types/wallet";
import { errorService } from "@/services/errorService";

export interface BlockchainConfig {
  rpcUrl: string;
  chainId: number;
  registryAddress: string;
  privateKey?: string;
  useHSM: boolean;
}

export interface OnChainDIDRecord {
  did: string;
  document: DIDDocument;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
  isActive: boolean;
}

export interface OnChainCredentialRecord {
  id: string;
  issuer: string;
  subject: string;
  schemaHash: string;
  commitmentHash: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
  isRevoked: boolean;
  revocationReason?: string;
}

export interface RevocationRecord {
  credentialId: string;
  reason: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
}

export class BlockchainPersistenceService {
  private provider: ethers.Provider | null = null;
  private signer: ethers.Signer | null = null;
  private contract: ethers.Contract | null = null;
  private config: BlockchainConfig | null = null;

  // DID Registry Contract ABI (simplified)
  private readonly DID_REGISTRY_ABI = [
    "function registerDID(string memory did, string memory document) public",
    "function updateDID(string memory did, string memory document) public",
    "function revokeDID(string memory did) public",
    "function getDIDDocument(string memory did) public view returns (string memory, uint256, bool)",
    "function isDIDActive(string memory did) public view returns (bool)",

    "function registerCredential(string memory credentialId, string memory issuer, string memory subject, bytes32 schemaHash, bytes32 commitmentHash) public",
    "function revokeCredential(string memory credentialId, string memory reason) public",
    "function getCredentialStatus(string memory credentialId) public view returns (bool, string memory)",
    "function isCredentialRevoked(string memory credentialId) public view returns (bool)",

    "event DIDRegistered(string indexed did, address indexed owner, uint256 blockNumber)",
    "event DIDUpdated(string indexed did, address indexed owner, uint256 blockNumber)",
    "event DIDRevoked(string indexed did, address indexed owner, uint256 blockNumber)",
    "event CredentialRegistered(string indexed credentialId, string indexed issuer, string indexed subject, uint256 blockNumber)",
    "event CredentialRevoked(string indexed credentialId, string indexed issuer, string reason, uint256 blockNumber)",
  ];

  /**
   * Initialize blockchain persistence service
   */
  async initialize(config: BlockchainConfig): Promise<void> {
    try {
      this.config = config;

      // Initialize provider
      this.provider = new ethers.JsonRpcProvider(config.rpcUrl);

      // Initialize signer
      if (config.useHSM) {
        // Use HSM for signing
        await gcpHSMService.initialize();
        this.signer = await this.createHSMSigner();
      } else if (config.privateKey) {
        // Use private key for signing
        this.signer = new ethers.Wallet(config.privateKey, this.provider);
      } else {
        throw new Error("No signing method configured");
      }

      // Initialize contract
      this.contract = new ethers.Contract(
        config.registryAddress,
        this.DID_REGISTRY_ABI,
        this.signer,
      );

      console.log("✅ Blockchain persistence service initialized");
    } catch (error) {
      throw new Error(
        `Failed to initialize blockchain service: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Create HSM-based signer
   */
  private async createHSMSigner(): Promise<ethers.Signer> {
    // Custom HSM signer implementation
    return {
      provider: this.provider,
      connect: (provider: ethers.Provider) => this.createHSMSigner(),
      getAddress: async () => {
        // Derive address from HSM public key
        const config = gcpHSMService.getConfig();
        if (!config) throw new Error("HSM not configured");

        // This would need to be implemented based on the HSM public key
        return "0x" + "0".repeat(40); // Placeholder
      },
      signTransaction: async (transaction: ethers.TransactionRequest) => {
        // Sign transaction with HSM
        const serialized = ethers.Transaction.from(transaction).serialized;
        const hash = ethers.keccak256(serialized);
        const signature = await gcpHSMService.signWithDIDKey(
          ethers.getBytes(hash),
          { id: "hsm-signer", document: {} } as any,
        );

        // Convert HSM signature to Ethereum format
        return this.convertHSMSignatureToEthereumFormat(
          signature.signature,
          serialized,
        );
      },
      signMessage: async (message: string | Uint8Array) => {
        const messageBytes =
          typeof message === "string" ? ethers.toUtf8Bytes(message) : message;

        const signature = await gcpHSMService.signWithDIDKey(messageBytes, {
          id: "hsm-signer",
          document: {},
        } as any);

        return this.convertHSMSignatureToEthereumFormat(
          signature.signature,
          messageBytes,
        );
      },
    } as ethers.Signer;
  }

  /**
   * Convert HSM signature to Ethereum format
   */
  private convertHSMSignatureToEthereumFormat(
    signature: Uint8Array,
    data: Uint8Array,
  ): string {
    // This would need proper implementation based on HSM signature format
    // For now, return a placeholder
    return (
      "0x" +
      Array.from(signature)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
    );
  }

  /**
   * Register DID document on blockchain
   */
  async registerDID(didKeyPair: DIDKeyPair): Promise<OnChainDIDRecord> {
    if (!this.contract) {
      throw new Error("Blockchain service not initialized");
    }

    try {
      const documentJson = JSON.stringify(didKeyPair.document);

      // Submit transaction
      const tx = await this.contract.registerDID(didKeyPair.did, documentJson);
      const receipt = await tx.wait();

      const record: OnChainDIDRecord = {
        did: didKeyPair.did,
        document: didKeyPair.document,
        blockNumber: receipt.blockNumber,
        transactionHash: receipt.hash,
        timestamp: Date.now(),
        isActive: true,
      };

      console.log("✅ DID registered on blockchain:", {
        did: didKeyPair.did,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      });

      return record;
    } catch (error) {
      throw new Error(
        `Failed to register DID on blockchain: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Update DID document on blockchain
   */
  async updateDID(didKeyPair: DIDKeyPair): Promise<OnChainDIDRecord> {
    if (!this.contract) {
      throw new Error("Blockchain service not initialized");
    }

    try {
      const documentJson = JSON.stringify(didKeyPair.document);

      // Submit transaction
      const tx = await this.contract.updateDID(didKeyPair.did, documentJson);
      const receipt = await tx.wait();

      const record: OnChainDIDRecord = {
        did: didKeyPair.did,
        document: didKeyPair.document,
        blockNumber: receipt.blockNumber,
        transactionHash: receipt.hash,
        timestamp: Date.now(),
        isActive: true,
      };

      console.log("✅ DID updated on blockchain:", {
        did: didKeyPair.did,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      });

      return record;
    } catch (error) {
      throw new Error(
        `Failed to update DID on blockchain: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Resolve DID document from blockchain
   */
  async resolveDID(did: string): Promise<OnChainDIDRecord | null> {
    if (!this.contract) {
      throw new Error("Blockchain service not initialized");
    }

    try {
      const [documentJson, blockNumber, isActive] =
        await this.contract.getDIDDocument(did);

      if (!documentJson || !isActive) {
        return null;
      }

      const document = JSON.parse(documentJson);

      return {
        did,
        document,
        blockNumber: Number(blockNumber),
        transactionHash: "", // Would need to be fetched from events
        timestamp: 0, // Would need to be fetched from block
        isActive,
      };
    } catch (error) {
      errorService.logError("Failed to resolve DID from blockchain:", error);
      return null;
    }
  }

  /**
   * Register credential on blockchain
   */
  async registerCredential(
    credential: VerifiableCredential,
    commitmentHash: string,
  ): Promise<OnChainCredentialRecord> {
    if (!this.contract) {
      throw new Error("Blockchain service not initialized");
    }

    try {
      const issuer =
        typeof credential.issuer === "string"
          ? credential.issuer
          : credential.issuer.id;
      const subject = credential.credentialSubject.id || "";

      // Generate schema hash
      const schemaHash = ethers.keccak256(
        ethers.toUtf8Bytes(JSON.stringify(credential.type)),
      );

      const commitmentHashBytes = ethers.keccak256(
        ethers.toUtf8Bytes(commitmentHash),
      );

      // Submit transaction
      const tx = await this.contract.registerCredential(
        credential.id,
        issuer,
        subject,
        schemaHash,
        commitmentHashBytes,
      );
      const receipt = await tx.wait();

      const record: OnChainCredentialRecord = {
        id: credential.id,
        issuer,
        subject,
        schemaHash,
        commitmentHash,
        blockNumber: receipt.blockNumber,
        transactionHash: receipt.hash,
        timestamp: Date.now(),
        isRevoked: false,
      };

      console.log("✅ Credential registered on blockchain:", {
        id: credential.id,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      });

      return record;
    } catch (error) {
      throw new Error(
        `Failed to register credential on blockchain: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Revoke credential on blockchain
   */
  async revokeCredential(
    credentialId: string,
    reason: string,
  ): Promise<RevocationRecord> {
    if (!this.contract) {
      throw new Error("Blockchain service not initialized");
    }

    try {
      // Submit transaction
      const tx = await this.contract.revokeCredential(credentialId, reason);
      const receipt = await tx.wait();

      const record: RevocationRecord = {
        credentialId,
        reason,
        blockNumber: receipt.blockNumber,
        transactionHash: receipt.hash,
        timestamp: Date.now(),
      };

      console.log("✅ Credential revoked on blockchain:", {
        id: credentialId,
        reason,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      });

      return record;
    } catch (error) {
      throw new Error(
        `Failed to revoke credential on blockchain: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Check credential status on blockchain
   */
  async getCredentialStatus(credentialId: string): Promise<{
    exists: boolean;
    isRevoked: boolean;
    revocationReason?: string;
  }> {
    if (!this.contract) {
      throw new Error("Blockchain service not initialized");
    }

    try {
      const [exists, revocationReason] =
        await this.contract.getCredentialStatus(credentialId);
      const isRevoked = await this.contract.isCredentialRevoked(credentialId);

      return {
        exists,
        isRevoked,
        revocationReason: revocationReason || undefined,
      };
    } catch (error) {
      errorService.logError("Failed to get credential status:", error);
      return {
        exists: false,
        isRevoked: false,
      };
    }
  }

  /**
   * Verify credential on blockchain
   */
  async verifyCredential(
    credentialId: string,
    expectedCommitment: string,
  ): Promise<boolean> {
    try {
      const status = await this.getCredentialStatus(credentialId);

      if (!status.exists || status.isRevoked) {
        return false;
      }

      // Additional verification logic would go here
      // For now, return true if credential exists and is not revoked
      return true;
    } catch (error) {
      errorService.logError("Failed to verify credential:", error);
      return false;
    }
  }

  /**
   * Get blockchain network info
   */
  async getNetworkInfo(): Promise<{
    chainId: number;
    blockNumber: number;
    gasPrice: string;
    isConnected: boolean;
  }> {
    if (!this.provider) {
      throw new Error("Provider not initialized");
    }

    try {
      const network = await this.provider.getNetwork();
      const blockNumber = await this.provider.getBlockNumber();
      const feeData = await this.provider.getFeeData();

      return {
        chainId: Number(network.chainId),
        blockNumber,
        gasPrice: feeData.gasPrice
          ? ethers.formatUnits(feeData.gasPrice, "gwei")
          : "0",
        isConnected: true,
      };
    } catch (error) {
      return {
        chainId: 0,
        blockNumber: 0,
        gasPrice: "0",
        isConnected: false,
      };
    }
  }

  /**
   * Monitor blockchain events
   */
  async startEventMonitoring(): Promise<void> {
    if (!this.contract) {
      throw new Error("Contract not initialized");
    }

    try {
      // Listen for DID events
      this.contract.on("DIDRegistered", (did, owner, blockNumber) => {
        console.log("🔍 DID Registered Event:", { did, owner, blockNumber });
      });

      this.contract.on("DIDRevoked", (did, owner, blockNumber) => {
        console.log("🔍 DID Revoked Event:", { did, owner, blockNumber });
      });

      // Listen for credential events
      this.contract.on(
        "CredentialRegistered",
        (credentialId, issuer, subject, blockNumber) => {
          console.log("🔍 Credential Registered Event:", {
            credentialId,
            issuer,
            subject,
            blockNumber,
          });
        },
      );

      this.contract.on(
        "CredentialRevoked",
        (credentialId, issuer, reason, blockNumber) => {
          console.log("🔍 Credential Revoked Event:", {
            credentialId,
            issuer,
            reason,
            blockNumber,
          });
        },
      );

      console.log("✅ Blockchain event monitoring started");
    } catch (error) {
      throw new Error(
        `Failed to start event monitoring: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Stop event monitoring
   */
  async stopEventMonitoring(): Promise<void> {
    if (this.contract) {
      this.contract.removeAllListeners();
      console.log("✅ Blockchain event monitoring stopped");
    }
  }

  /**
   * Get service configuration
   */
  getConfig(): BlockchainConfig | null {
    return this.config;
  }
}

export const blockchainPersistenceService = new BlockchainPersistenceService();
