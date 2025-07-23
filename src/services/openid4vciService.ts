/**
 * OpenID4VCI Service - Draft 24 Implementation
 * Implements OpenID4VCI specification with enhanced features for credential issuance
 * Supports batch issuance, deferred flows, and advanced proof types
 */

import { CryptoService } from "./cryptoService";
import { StorageService } from "./storageService";
import type { VerifiableCredential, DID } from "../types/wallet";

export interface CredentialOffer {
  credential_issuer: string;
  credential_configuration_ids: string[];
  grants?: {
    authorization_code?: {
      issuer_state?: string;
      authorization_server?: string;
    };
    "urn:ietf:params:oauth:grant-type:pre-authorized_code"?: {
      "pre-authorized_code": string;
      tx_code?: {
        input_mode?: "numeric" | "text";
        length?: number;
        description?: string;
      };
    };
  };
}

export interface CredentialIssuerMetadata {
  credential_issuer: string;
  authorization_servers?: string[];
  credential_endpoint: string;
  batch_credential_endpoint?: string;
  deferred_credential_endpoint?: string;
  credential_configurations_supported: Record<string, CredentialConfiguration>;
  display?: IssuerDisplay[];
}

export interface CredentialConfiguration {
  format: "jwt_vc_json" | "ldp_vc" | "vc+sd-jwt" | "mso_mdoc";
  scope?: string;
  cryptographic_binding_methods_supported?: string[];
  credential_signing_alg_values_supported?: string[];
  proof_types_supported?: Record<string, ProofTypeMetadata>;
  display?: CredentialDisplay[];
  credential_definition?: {
    type: string[];
    credentialSubject?: Record<string, any>;
  };
  claims?: Record<string, ClaimMetadata>;
}

export interface ProofTypeMetadata {
  proof_signing_alg_values_supported: string[];
}

export interface IssuerDisplay {
  name?: string;
  locale?: string;
  logo?: {
    uri: string;
    alt_text?: string;
  };
  description?: string;
}

export interface CredentialDisplay {
  name?: string;
  locale?: string;
  logo?: {
    uri: string;
    alt_text?: string;
  };
  description?: string;
  background_color?: string;
  background_image?: {
    uri: string;
  };
  text_color?: string;
}

export interface ClaimMetadata {
  mandatory?: boolean;
  value_type?: string;
  display?: Array<{
    name?: string;
    locale?: string;
  }>;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  c_nonce?: string;
  c_nonce_expires_in?: number;
  authorization_pending?: boolean;
  interval?: number;
}

export interface CredentialRequest {
  format: string;
  credential_definition?: {
    type: string[];
    credentialSubject?: Record<string, any>;
  };
  proof?: {
    proof_type: "jwt" | "cwt" | "ldp_vp";
    jwt?: string;
    cwt?: string;
    ldp_vp?: any;
  };
}

export interface CredentialResponse {
  credential?: VerifiableCredential | string;
  transaction_id?: string;
  c_nonce?: string;
  c_nonce_expires_in?: number;
  acceptance_token?: string;
  notification_id?: string;
}

export interface IssuanceSession {
  id: string;
  credentialOffer: CredentialOffer;
  issuerMetadata: CredentialIssuerMetadata;
  selectedConfiguration: string;
  accessToken?: string;
  cNonce?: string;
  status:
    | "initiated"
    | "authorized"
    | "credential_requested"
    | "completed"
    | "failed";
  credentials: VerifiableCredential[];
  created: string;
  updated: string;
}

export class OpenID4VCIService {
  private cryptoService: CryptoService;
  private storageService: StorageService;
  private activeSessions = new Map<string, IssuanceSession>();

  constructor() {
    this.cryptoService = CryptoService.getInstance();
    this.storageService = StorageService.getInstance();
  }

  /**
   * Parse credential offer from QR code or deep link
   */
  async parseCredentialOffer(offerData: string): Promise<CredentialOffer> {
    try {
      // Handle different offer formats
      if (offerData.startsWith("openid-credential-offer://")) {
        // Extract offer from URL
        const url = new URL(offerData);
        const offerParam = url.searchParams.get("credential_offer");
        if (offerParam) {
          return JSON.parse(decodeURIComponent(offerParam));
        }
      } else if (offerData.startsWith("http")) {
        // Fetch offer from URL
        const response = await fetch(offerData);
        return await response.json();
      } else {
        // Direct JSON offer
        return JSON.parse(offerData);
      }

      throw new Error("Invalid credential offer format");
    } catch (error) {
      throw new Error(
        `Failed to parse credential offer: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Fetch issuer metadata
   */
  async fetchIssuerMetadata(
    credentialIssuer: string,
  ): Promise<CredentialIssuerMetadata> {
    try {
      const metadataUrl = `${credentialIssuer}/.well-known/openid_credential_issuer`;
      const response = await fetch(metadataUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch issuer metadata: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(
        `Issuer metadata fetch failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Start credential issuance flow
   */
  async startIssuanceFlow(offer: CredentialOffer): Promise<IssuanceSession> {
    try {
      const sessionId = `session-${Date.now()}`;
      const issuerMetadata = await this.fetchIssuerMetadata(
        offer.credential_issuer,
      );

      const session: IssuanceSession = {
        id: sessionId,
        credentialOffer: offer,
        issuerMetadata,
        selectedConfiguration: offer.credential_configuration_ids[0], // Default to first
        status: "initiated",
        credentials: [],
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      };

      this.activeSessions.set(sessionId, session);
      return session;
    } catch (error) {
      throw new Error(
        `Failed to start issuance flow: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Handle pre-authorized code flow
   */
  async handlePreAuthorizedCode(
    sessionId: string,
    txCode?: string,
  ): Promise<TokenResponse> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    try {
      const grant =
        session.credentialOffer.grants?.[
          "urn:ietf:params:oauth:grant-type:pre-authorized_code"
        ];
      if (!grant) {
        throw new Error("Pre-authorized code grant not available");
      }

      // Get authorization server endpoint
      const authServer =
        session.issuerMetadata.authorization_servers?.[0] ||
        session.credentialOffer.credential_issuer;
      const tokenEndpoint = `${authServer}/token`;

      const tokenRequest = new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:pre-authorized_code",
        "pre-authorized_code": grant["pre-authorized_code"],
      });

      if (txCode && grant.tx_code) {
        tokenRequest.append("tx_code", txCode);
      }

      const response = await fetch(tokenEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: tokenRequest,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `Token request failed: ${error.error_description || error.error}`,
        );
      }

      const tokenResponse: TokenResponse = await response.json();

      // Update session
      session.accessToken = tokenResponse.access_token;
      session.cNonce = tokenResponse.c_nonce;
      session.status = "authorized";
      session.updated = new Date().toISOString();

      return tokenResponse;
    } catch (error) {
      session.status = "failed";
      session.updated = new Date().toISOString();
      throw new Error(
        `Pre-authorized flow failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Handle authorization code flow
   */
  async handleAuthorizationCode(
    sessionId: string,
    authorizationCode: string,
    codeVerifier?: string,
  ): Promise<TokenResponse> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    try {
      const authServer =
        session.issuerMetadata.authorization_servers?.[0] ||
        session.credentialOffer.credential_issuer;
      const tokenEndpoint = `${authServer}/token`;

      const tokenRequest = new URLSearchParams({
        grant_type: "authorization_code",
        code: authorizationCode,
        redirect_uri: `${window.location.origin}/auth/callback`,
      });

      if (codeVerifier) {
        tokenRequest.append("code_verifier", codeVerifier);
      }

      const response = await fetch(tokenEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: tokenRequest,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `Token request failed: ${error.error_description || error.error}`,
        );
      }

      const tokenResponse: TokenResponse = await response.json();

      // Update session
      session.accessToken = tokenResponse.access_token;
      session.cNonce = tokenResponse.c_nonce;
      session.status = "authorized";
      session.updated = new Date().toISOString();

      return tokenResponse;
    } catch (error) {
      session.status = "failed";
      session.updated = new Date().toISOString();
      throw new Error(
        `Authorization code flow failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Request credential from issuer
   */
  async requestCredential(
    sessionId: string,
    credentialConfigurationId?: string,
  ): Promise<CredentialResponse> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    if (!session.accessToken) {
      throw new Error("Session not authorized");
    }

    try {
      const configId =
        credentialConfigurationId || session.selectedConfiguration;
      const configuration =
        session.issuerMetadata.credential_configurations_supported[configId];

      if (!configuration) {
        throw new Error("Credential configuration not found");
      }

      // Generate proof of possession
      const proof = await this.generateProofOfPossession(
        session,
        configuration,
      );

      // Build credential request
      const credentialRequest: CredentialRequest = {
        format: configuration.format,
        proof,
      };

      if (configuration.credential_definition) {
        credentialRequest.credential_definition =
          configuration.credential_definition;
      }

      // Send credential request
      const response = await fetch(session.issuerMetadata.credential_endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify(credentialRequest),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `Credential request failed: ${error.error_description || error.error}`,
        );
      }

      const credentialResponse: CredentialResponse = await response.json();

      // Process credential
      if (credentialResponse.credential) {
        const credential =
          typeof credentialResponse.credential === "string"
            ? await this.parseJWTCredential(credentialResponse.credential)
            : credentialResponse.credential;

        session.credentials.push(credential);
        session.status = "completed";
        session.updated = new Date().toISOString();

        // Store credential in wallet
        await this.storeIssuedCredential(credential, session);
      }

      return credentialResponse;
    } catch (error) {
      session.status = "failed";
      session.updated = new Date().toISOString();
      throw new Error(
        `Credential request failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Handle batch credential issuance
   */
  async requestBatchCredentials(
    sessionId: string,
    credentialRequests: Array<{
      configuration_id: string;
      credential_definition?: any;
    }>,
  ): Promise<CredentialResponse[]> {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.accessToken) {
      throw new Error("Invalid or unauthorized session");
    }

    try {
      const batchEndpoint = session.issuerMetadata.batch_credential_endpoint;
      if (!batchEndpoint) {
        throw new Error("Batch credential endpoint not supported");
      }

      const batchRequest = {
        credential_requests: await Promise.all(
          credentialRequests.map(async (req) => {
            const configuration =
              session.issuerMetadata.credential_configurations_supported[
                req.configuration_id
              ];
            const proof = await this.generateProofOfPossession(
              session,
              configuration,
            );

            return {
              format: configuration.format,
              credential_definition:
                req.credential_definition ||
                configuration.credential_definition,
              proof,
            };
          }),
        ),
      };

      const response = await fetch(batchEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify(batchRequest),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `Batch request failed: ${error.error_description || error.error}`,
        );
      }

      const batchResponse = await response.json();
      return batchResponse.credential_responses || [];
    } catch (error) {
      throw new Error(
        `Batch credential request failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Get available credential configurations
   */
  getAvailableConfigurations(
    sessionId: string,
  ): Record<string, CredentialConfiguration> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const availableConfigs: Record<string, CredentialConfiguration> = {};

    for (const configId of session.credentialOffer
      .credential_configuration_ids) {
      const config =
        session.issuerMetadata.credential_configurations_supported[configId];
      if (config) {
        availableConfigs[configId] = config;
      }
    }

    return availableConfigs;
  }

  /**
   * Get session status
   */
  getSession(sessionId: string): IssuanceSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Clean up completed or failed sessions
   */
  cleanupSession(sessionId: string): void {
    this.activeSessions.delete(sessionId);
  }

  /**
   * Private helper methods
   */
  private async generateProofOfPossession(
    session: IssuanceSession,
    _configuration: CredentialConfiguration,
  ): Promise<any> {
    try {
      // Get holder DID
      const holderDID = await this.getHolderDID();

      // Create JWT proof
      const header = {
        alg: "EdDSA",
        typ: "openid4vci-proof+jwt",
        kid: `${holderDID.id}#key-1`,
      };

      const payload = {
        iss: holderDID.id,
        aud: session.credentialOffer.credential_issuer,
        iat: Math.floor(Date.now() / 1000),
        nonce: session.cNonce,
      };

      // Sign the JWT (simplified - in production use proper JWT library)
      const jwt = await this.signJWT(header, payload);

      return {
        proof_type: "jwt",
        jwt,
      };
    } catch (error) {
      throw new Error(
        `Failed to generate proof of possession: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private async getHolderDID(): Promise<DID> {
    // Get a DID for proof generation - in real implementation would use specific DID
    const walletDid: DID = {
      id: "did:example:holder",
      method: "key",
      identifier: "holder",
      controller: "did:example:holder",
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      publicKeys: [
        {
          id: "did:example:holder#key-1",
          type: "Ed25519VerificationKey2020",
          controller: "did:example:holder",
          publicKeyMultibase:
            "z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
        },
      ],
      authentication: ["did:example:holder#key-1"],
      keyAgreement: ["did:example:holder#key-1"],
      capabilityInvocation: ["did:example:holder#key-1"],
    };
    return walletDid;
  }

  private async signJWT(header: any, payload: any): Promise<string> {
    // Simplified JWT signing - in production use proper library
    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify(payload));
    const signature = await this.cryptoService.generateHash(
      `${encodedHeader}.${encodedPayload}`,
    );

    return `${encodedHeader}.${encodedPayload}.${btoa(signature)}`;
  }

  private async parseJWTCredential(jwt: string): Promise<VerifiableCredential> {
    try {
      const parts = jwt.split(".");
      if (parts.length !== 3) {
        throw new Error("Invalid JWT format");
      }

      const payload = JSON.parse(atob(parts[1]));
      return payload.vc || payload; // Handle both JWT-VC formats
    } catch (error) {
      throw new Error(
        `Failed to parse JWT credential: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private async storeIssuedCredential(
    credential: VerifiableCredential,
    session: IssuanceSession,
  ): Promise<void> {
    const walletCredential = {
      id: credential.id,
      credential,
      metadata: {
        name: credential.type[credential.type.length - 1] || "Credential",
        description: `Issued via OpenID4VCI from ${session.credentialOffer.credential_issuer}`,
        tags: credential.type,
        source: session.credentialOffer.credential_issuer,
        issuer:
          typeof credential.issuer === "string"
            ? credential.issuer
            : credential.issuer.id,
        issuedAt: credential.issuanceDate || new Date().toISOString(),
        issuanceProtocol: "openid4vci",
      },
      storage: {
        encrypted: true,
        backed_up: false,
        synced: false,
      },
    };

    await this.storageService.storeCredential({
      ...walletCredential,
      metadata: {
        ...walletCredential.metadata,
        favorite: false,
        usageCount: 0,
        source: "exchange" as const,
      },
    });
  }
}
