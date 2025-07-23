/**
 * Persona Wallet DIDComm Service
 * Handles DIDComm v2.0 messaging for secure communication
 */

import { CryptoService } from "./cryptoService";
import { errorService } from "@/services/errorService";
import type {
  DIDCommMessage,
  Attachment,
  DID,
  ProofRequest,
} from "@/types/wallet";

export interface DIDCommEnvelope {
  typ:
    | "application/didcomm-plain+json"
    | "application/didcomm-signed+json"
    | "application/didcomm-encrypted+json";
  cty?: string;
  kid?: string;
  alg?: string;
  enc?: string;
}

export interface EncryptedDIDCommMessage {
  ciphertext: string;
  protected: string;
  recipients: Array<{
    header: {
      kid: string;
      alg: string;
    };
    encrypted_key: string;
  }>;
  tag: string;
  iv: string;
}

export interface DIDCommConnection {
  id: string;
  their_did: string;
  their_label?: string;
  my_did: string;
  state:
    | "invitation-sent"
    | "invitation-received"
    | "request-sent"
    | "request-received"
    | "active"
    | "error";
  created: string;
  updated: string;
}

export interface DIDCommEndpoint {
  uri: string;
  accept?: string[];
  routing_keys?: string[];
}

export class DIDCommService {
  private static instance: DIDCommService;
  private cryptoService: CryptoService;
  private connections: Map<string, DIDCommConnection> = new Map();

  private constructor() {
    this.cryptoService = CryptoService.getInstance();
  }

  static getInstance(): DIDCommService {
    if (!DIDCommService.instance) {
      DIDCommService.instance = new DIDCommService();
    }
    return DIDCommService.instance;
  }

  /**
   * Create a DIDComm message
   */
  async createMessage(
    type: string,
    body: Record<string, unknown>,
    to: string[],
    from?: string,
    options?: {
      id?: string;
      thread_id?: string;
      parent_thread_id?: string;
      expires_time?: string;
      attachments?: Attachment[];
    },
  ): Promise<DIDCommMessage> {
    try {
      const message: DIDCommMessage = {
        id: options?.id || this.generateMessageId(),
        type,
        body,
        to,
        created_time: new Date().toISOString(),
        ...(from && { from }),
        ...(options?.thread_id && { thread_id: options.thread_id }),
        ...(options?.parent_thread_id && {
          parent_thread_id: options.parent_thread_id,
        }),
        ...(options?.expires_time && { expires_time: options.expires_time }),
        ...(options?.attachments && { attachments: options.attachments }),
      };

      return message;
    } catch (error) {
      errorService.logError("Error creating DIDComm message:", error);
      throw new Error("Failed to create DIDComm message");
    }
  }

  /**
   * Sign a DIDComm message
   */
  async signMessage(
    message: DIDCommMessage,
    signerDid: DID,
    privateKey: Uint8Array,
  ): Promise<string> {
    try {
      const envelope: DIDCommEnvelope = {
        typ: "application/didcomm-signed+json",
        kid: `${signerDid.id}#${signerDid.publicKeys[0].id}`,
      };

      // Create JWS with the message as payload
      const jws = await this.cryptoService.createJWS(
        {
          ...envelope,
          payload: message,
        },
        privateKey,
        signerDid.publicKeys[0].id,
      );

      return jws;
    } catch (error) {
      errorService.logError("Error signing DIDComm message:", error);
      throw new Error("Failed to sign DIDComm message");
    }
  }

  /**
   * Encrypt a DIDComm message
   */
  async encryptMessage(
    message: DIDCommMessage,
    recipientDids: DID[],
    _senderPrivateKey?: Uint8Array,
  ): Promise<EncryptedDIDCommMessage> {
    try {
      // This is a simplified encryption implementation
      // In production, use proper DIDComm encryption with ECDH-ES

      const messageString = JSON.stringify(message);

      // For now, use symmetric encryption with a derived key
      const password = await this.deriveSharedSecret(recipientDids[0]);
      const encryptionResult = await this.cryptoService.encryptData(
        messageString,
        password,
      );

      const encryptedMessage: EncryptedDIDCommMessage = {
        ciphertext: encryptionResult.ciphertext,
        protected: btoa(
          JSON.stringify({
            typ: "application/didcomm-encrypted+json",
            enc: "A256GCM",
            alg: "ECDH-ES+A256KW",
          }),
        ),
        recipients: recipientDids.map((did) => ({
          header: {
            kid: did.publicKeys[0].id,
            alg: "ECDH-ES+A256KW",
          },
          encrypted_key: encryptionResult.salt, // Simplified
        })),
        tag: encryptionResult.iv,
        iv: encryptionResult.iv,
      };

      return encryptedMessage;
    } catch (error) {
      errorService.logError("Error encrypting DIDComm message:", error);
      throw new Error("Failed to encrypt DIDComm message");
    }
  }

  /**
   * Decrypt a DIDComm message
   */
  async decryptMessage(
    encryptedMessage: EncryptedDIDCommMessage,
    recipientDid: DID,
    _privateKey: Uint8Array,
  ): Promise<DIDCommMessage> {
    try {
      // Simplified decryption - in production use proper DIDComm decryption
      const password = await this.deriveSharedSecret(recipientDid);

      const encryptionResult = {
        ciphertext: encryptedMessage.ciphertext,
        iv: encryptedMessage.iv,
        salt: encryptedMessage.recipients[0].encrypted_key,
        algorithm: "AES-256-GCM",
      };

      const decryptedString = await this.cryptoService.decryptData(
        encryptionResult,
        password,
      );
      return JSON.parse(decryptedString);
    } catch (error) {
      errorService.logError("Error decrypting DIDComm message:", error);
      throw new Error("Failed to decrypt DIDComm message");
    }
  }

  /**
   * Send a DIDComm message
   */
  async sendMessage(
    message: DIDCommMessage,
    endpoint: DIDCommEndpoint,
    options?: {
      sign?: boolean;
      encrypt?: boolean;
      senderDid?: DID;
      senderPrivateKey?: Uint8Array;
      recipientDids?: DID[];
    },
  ): Promise<boolean> {
    try {
      let messageToSend: any = message;

      // Sign message if requested
      if (options?.sign && options?.senderDid && options?.senderPrivateKey) {
        messageToSend = await this.signMessage(
          message,
          options.senderDid,
          options.senderPrivateKey,
        );
      }

      // Encrypt message if requested
      if (options?.encrypt && options?.recipientDids) {
        messageToSend = await this.encryptMessage(
          message,
          options.recipientDids,
          options?.senderPrivateKey,
        );
      }

      // Send message to endpoint
      const response = await fetch(endpoint.uri, {
        method: "POST",
        headers: {
          "Content-Type": "application/didcomm-plain+json",
          Accept: "application/didcomm-plain+json",
        },
        body: JSON.stringify(messageToSend),
      });

      return response.ok;
    } catch (error) {
      errorService.logError("Error sending DIDComm message:", error);
      throw new Error("Failed to send DIDComm message");
    }
  }

  /**
   * Process incoming DIDComm message
   */
  async processMessage(
    messageData: any,
    recipientDid?: DID,
    privateKey?: Uint8Array,
  ): Promise<DIDCommMessage> {
    try {
      let message: DIDCommMessage;

      // Check if message is encrypted
      if (messageData.ciphertext) {
        if (!recipientDid || !privateKey) {
          throw new Error(
            "Recipient DID and private key required for encrypted messages",
          );
        }
        message = await this.decryptMessage(
          messageData,
          recipientDid,
          privateKey,
        );
      } else if (typeof messageData === "string") {
        // Check if message is signed (JWS format)
        try {
          const payload = JSON.parse(atob(messageData.split(".")[1]));
          message = payload.payload;
        } catch {
          // Not a JWS, treat as plain message
          message = JSON.parse(messageData);
        }
      } else {
        // Plain message
        message = messageData;
      }

      // Process the message based on type
      await this.handleMessageByType(message);

      return message;
    } catch (error) {
      errorService.logError("Error processing DIDComm message:", error);
      throw new Error("Failed to process DIDComm message");
    }
  }

  /**
   * Handle message based on its type
   */
  private async handleMessageByType(message: DIDCommMessage): Promise<void> {
    switch (message.type) {
      case "https://didcomm.org/present-proof/3.0/request-presentation":
        await this.handleProofRequest(message);
        break;

      case "https://didcomm.org/present-proof/3.0/presentation":
        await this.handleProofResponse(message);
        break;

      case "https://didcomm.org/connections/1.0/invitation":
        await this.handleConnectionInvitation(message);
        break;

      case "https://didcomm.org/connections/1.0/request":
        await this.handleConnectionRequest(message);
        break;

      case "https://didcomm.org/connections/1.0/response":
        await this.handleConnectionResponse(message);
        break;

      default:
        console.log("Unknown message type:", message.type);
    }
  }

  /**
   * Handle proof request message
   */
  private async handleProofRequest(message: DIDCommMessage): Promise<void> {
    try {
      // Convert DIDComm message to ProofRequest format
      const proofRequest: ProofRequest = {
        id: message.id,
        type: "ProofRequest",
        from: message.from || "",
        to: message.to[0],
        created: message.created_time || new Date().toISOString(),
        expires: message.expires_time,
        presentation_definition: message.body.presentation_definition as any,
        challenge: message.body.challenge as string,
        domain: message.body.domain as string,
        callback_url: message.body.callback_url as string,
        metadata: {
          purpose:
            (message.body.purpose as string) || "Credential verification",
          verifier_name:
            (message.body.verifier_name as string) || "Unknown verifier",
          verifier_logo: message.body.verifier_logo as string,
          requirements: (message.body.requirements as string[]) || [],
        },
      };

      // Add to pending proof requests (this would integrate with the wallet store)
      console.log("Received proof request:", proofRequest);
    } catch (error) {
      errorService.logError("Error handling proof request:", error);
    }
  }

  /**
   * Handle proof response message
   */
  private async handleProofResponse(message: DIDCommMessage): Promise<void> {
    try {
      console.log("Received proof response:", message);
    } catch (error) {
      errorService.logError("Error handling proof response:", error);
    }
  }

  /**
   * Handle connection invitation
   */
  private async handleConnectionInvitation(
    message: DIDCommMessage,
  ): Promise<void> {
    try {
      const connection: DIDCommConnection = {
        id: this.generateConnectionId(),
        their_did: message.from || "",
        their_label: message.body.label as string,
        my_did: message.to[0],
        state: "invitation-received",
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      };

      this.connections.set(connection.id, connection);
      console.log("Received connection invitation:", connection);
    } catch (error) {
      errorService.logError("Error handling connection invitation:", error);
    }
  }

  /**
   * Handle connection request
   */
  private async handleConnectionRequest(
    message: DIDCommMessage,
  ): Promise<void> {
    try {
      console.log("Received connection request:", message);
    } catch (error) {
      errorService.logError("Error handling connection request:", error);
    }
  }

  /**
   * Handle connection response
   */
  private async handleConnectionResponse(
    message: DIDCommMessage,
  ): Promise<void> {
    try {
      console.log("Received connection response:", message);
    } catch (error) {
      errorService.logError("Error handling connection response:", error);
    }
  }

  /**
   * Create connection invitation
   */
  async createConnectionInvitation(
    inviterDid: DID,
    label: string,
    endpoint: DIDCommEndpoint,
  ): Promise<DIDCommMessage> {
    try {
      const invitation = await this.createMessage(
        "https://didcomm.org/connections/1.0/invitation",
        {
          label,
          did: inviterDid.id,
          endpoint: endpoint.uri,
          recipientKeys: inviterDid.publicKeys.map((key) => key.id),
          routingKeys: endpoint.routing_keys || [],
        },
        [], // No specific recipients for invitations
        inviterDid.id,
      );

      return invitation;
    } catch (error) {
      errorService.logError("Error creating connection invitation:", error);
      throw new Error("Failed to create connection invitation");
    }
  }

  /**
   * Create proof request message
   */
  async createProofRequestMessage(
    request: ProofRequest,
    senderDid: string,
    recipientDid: string,
  ): Promise<DIDCommMessage> {
    try {
      const message = await this.createMessage(
        "https://didcomm.org/present-proof/3.0/request-presentation",
        {
          presentation_definition: request.presentation_definition,
          challenge: request.challenge,
          domain: request.domain,
          purpose: request.metadata.purpose,
          verifier_name: request.metadata.verifier_name,
          verifier_logo: request.metadata.verifier_logo,
          requirements: request.metadata.requirements,
          callback_url: request.callback_url,
        },
        [recipientDid],
        senderDid,
        {
          expires_time: request.expires,
        },
      );

      return message;
    } catch (error) {
      errorService.logError("Error creating proof request message:", error);
      throw new Error("Failed to create proof request message");
    }
  }

  /**
   * Generate message ID
   */
  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate connection ID
   */
  private generateConnectionId(): string {
    return `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Derive shared secret for encryption (simplified)
   */
  private async deriveSharedSecret(did: DID): Promise<string> {
    // In production, use proper ECDH key agreement
    return await this.cryptoService.generateHash(did.id + did.publicKeys[0].id);
  }

  /**
   * Get all connections
   */
  getConnections(): DIDCommConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get connection by ID
   */
  getConnection(id: string): DIDCommConnection | undefined {
    return this.connections.get(id);
  }

  /**
   * Update connection state
   */
  updateConnectionState(id: string, state: DIDCommConnection["state"]): void {
    const connection = this.connections.get(id);
    if (connection) {
      connection.state = state;
      connection.updated = new Date().toISOString();
      this.connections.set(id, connection);
    }
  }
}
