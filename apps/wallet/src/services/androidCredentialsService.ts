/**
 * Android Digital Credentials Service
 * Integrates with Android's Digital Credentials API and OpenID4VCI
 */

import { CryptoService } from "./cryptoService";
import { StorageService } from "./storageService";
import { errorService } from "@/services/errorService";
import type {
  VerifiableCredential,
  AndroidCredentialRequestEntry,
  ProofRequest,
} from "../types/wallet";

export interface AndroidDigitalCredential {
  id: string;
  type: string[];
  name: string;
  description: string;
  issuer: {
    name: string;
    domain: string;
    logo?: string;
  };
  credential: VerifiableCredential;
  androidMetadata: {
    packageName: string;
    issuanceProtocol: "openid4vci" | "direct";
    credentialFormat: "jwt_vc" | "ldp_vc" | "mso_mdoc";
    revocationStatus: "valid" | "revoked" | "suspended";
    lastUpdated: string;
  };
  created: string;
}

export interface OpenID4VCIRequest {
  credential_issuer: string;
  credential_configuration_id: string;
  authorization_details: {
    type: "openid_credential";
    credential_configuration_id: string;
    format: "jwt_vc" | "ldp_vc" | "mso_mdoc";
    locations?: string[];
  }[];
  client_metadata?: {
    client_name?: string;
    logo_uri?: string;
    tos_uri?: string;
    privacy_policy_uri?: string;
  };
}

export interface AndroidCredentialResponse {
  success: boolean;
  credential?: AndroidDigitalCredential;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

declare global {
  interface Window {
    // Android WebView JavaScript interface
    AndroidCredentialManager?: {
      isSupported(): boolean;
      requestCredential(request: string): Promise<string>;
      storeCredential(credential: string): Promise<string>;
      deleteCredential(credentialId: string): Promise<string>;
      getStoredCredentials(): Promise<string>;
      checkRevocationStatus(credentialId: string): Promise<string>;
    };
  }
}

export class AndroidCredentialsService {
  private cryptoService: CryptoService;
  private storageService: StorageService;
  private isAndroidSupported = false;

  constructor() {
    this.cryptoService = CryptoService.getInstance();
    this.storageService = StorageService.getInstance();
    this.checkAndroidSupport();
  }

  /**
   * Check if Android Digital Credentials are supported
   */
  private checkAndroidSupport(): void {
    try {
      this.isAndroidSupported =
        typeof window !== "undefined" &&
        window.AndroidCredentialManager?.isSupported() === true;
    } catch (error) {
      console.warn("Android Credential Manager not available:", error);
      this.isAndroidSupported = false;
    }
  }

  /**
   * Check if running on Android with Digital Credentials support
   */
  isSupported(): boolean {
    return this.isAndroidSupported;
  }

  /**
   * Handle OpenID4VCI credential issuance
   */
  async handleOpenID4VCI(
    request: OpenID4VCIRequest,
  ): Promise<AndroidCredentialResponse> {
    try {
      // Step 1: Authorization flow
      const authResponse = await this.initiateOpenID4VCIFlow(request);

      // Step 2: Token exchange
      const tokenResponse = await this.exchangeAuthorizationCode(authResponse);

      // Step 3: Credential request
      const credential = await this.requestCredentialFromIssuer(
        request,
        tokenResponse.access_token,
      );

      // Step 4: Store in Android system if supported
      if (this.isAndroidSupported) {
        await this.storeCredentialInAndroid(credential);
      }

      // Step 5: Store in wallet storage
      await this.storeCredentialInWallet(credential);

      return {
        success: true,
        credential,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "OPENID4VCI_ERROR",
          message:
            error instanceof Error ? error.message : "OpenID4VCI flow failed",
          details: { request },
        },
      };
    }
  }

  /**
   * Convert proof request to Android format
   */
  async convertToAndroidRequest(
    proofRequest: ProofRequest,
  ): Promise<AndroidCredentialRequestEntry> {
    try {
      // Build presentation definition for Android
      const presentationDefinition = {
        id: proofRequest.id,
        name: "Credential Request",
        purpose:
          proofRequest.presentation_definition?.input_descriptors?.[0]
            ?.purpose || "Identity verification",
        input_descriptors:
          proofRequest.presentation_definition?.input_descriptors?.map(
            (desc) => ({
              id: desc.id,
              name: desc.name,
              purpose: desc.purpose,
              format: {
                jwt_vc: {
                  alg: ["EdDSA", "ES256K", "ES256"],
                },
                ldp_vc: {
                  proof_type: [
                    "Ed25519Signature2020",
                    "EcdsaSecp256k1Signature2019",
                  ],
                },
              },
              constraints: desc.constraints,
            }),
          ) || [],
      };

      // Create OpenID4VP request
      const openidRequest = {
        client_id: proofRequest.from,
        response_type: "vp_token",
        response_mode: "direct_post",
        nonce: proofRequest.challenge,
        presentation_definition: presentationDefinition,
        response_uri: `${window.location.origin}/api/presentation/response`,
        client_metadata: {
          client_name: proofRequest.from,
          logo_uri: undefined,
          tos_uri: undefined,
          privacy_policy_uri: undefined,
        },
      };

      return {
        protocol: "openid4vp",
        data: JSON.stringify(openidRequest),
      };
    } catch (error) {
      throw new Error(
        `Failed to convert proof request: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Request credential from Android system
   */
  async requestCredentialFromAndroid(
    requestEntry: AndroidCredentialRequestEntry,
  ): Promise<AndroidCredentialResponse> {
    if (!this.isAndroidSupported) {
      return {
        success: false,
        error: {
          code: "ANDROID_NOT_SUPPORTED",
          message: "Android Digital Credentials not supported on this device",
        },
      };
    }

    try {
      const response = await window.AndroidCredentialManager!.requestCredential(
        JSON.stringify(requestEntry),
      );

      const parsedResponse = JSON.parse(response);

      if (parsedResponse.success) {
        return {
          success: true,
          credential: parsedResponse.credential,
        };
      } else {
        return {
          success: false,
          error: parsedResponse.error,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: "ANDROID_REQUEST_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Android credential request failed",
        },
      };
    }
  }

  /**
   * Store credential in Android system
   */
  async storeCredentialInAndroid(
    credential: AndroidDigitalCredential,
  ): Promise<boolean> {
    if (!this.isAndroidSupported) {
      return false;
    }

    try {
      const response = await window.AndroidCredentialManager!.storeCredential(
        JSON.stringify(credential),
      );

      const result = JSON.parse(response);
      return result.success === true;
    } catch (error) {
      errorService.logError("Failed to store credential in Android:", error);
      return false;
    }
  }

  /**
   * Get stored credentials from Android system
   */
  async getAndroidStoredCredentials(): Promise<AndroidDigitalCredential[]> {
    if (!this.isAndroidSupported) {
      return [];
    }

    try {
      const response =
        await window.AndroidCredentialManager!.getStoredCredentials();
      const result = JSON.parse(response);

      return result.credentials || [];
    } catch (error) {
      errorService.logError("Failed to get Android stored credentials:", error);
      return [];
    }
  }

  /**
   * Delete credential from Android system
   */
  async deleteCredentialFromAndroid(credentialId: string): Promise<boolean> {
    if (!this.isAndroidSupported) {
      return false;
    }

    try {
      const response =
        await window.AndroidCredentialManager!.deleteCredential(credentialId);
      const result = JSON.parse(response);

      return result.success === true;
    } catch (error) {
      errorService.logError("Failed to delete Android credential:", error);
      return false;
    }
  }

  /**
   * Check credential revocation status
   */
  async checkRevocationStatus(
    credentialId: string,
  ): Promise<"valid" | "revoked" | "suspended" | "unknown"> {
    try {
      if (this.isAndroidSupported) {
        const response =
          await window.AndroidCredentialManager!.checkRevocationStatus(
            credentialId,
          );
        const result = JSON.parse(response);
        return result.status || "unknown";
      }

      // Fallback to manual revocation check
      return await this.checkRevocationStatusManually(credentialId);
    } catch (error) {
      errorService.logError("Failed to check revocation status:", error);
      return "unknown";
    }
  }

  /**
   * Sync credentials between Android and wallet storage
   */
  async syncCredentials(): Promise<{
    synced: number;
    errors: Array<{ credentialId: string; error: string }>;
  }> {
    const errors: Array<{ credentialId: string; error: string }> = [];
    let synced = 0;

    try {
      // Get credentials from Android
      const androidCredentials = await this.getAndroidStoredCredentials();

      // Get credentials from wallet storage
      const walletCredentials = await this.storageService.getCredentials();

      // Sync Android -> Wallet
      for (const androidCred of androidCredentials) {
        try {
          const exists = walletCredentials.some(
            (wc) => wc.id === androidCred.id,
          );
          if (!exists) {
            await this.storeCredentialInWallet(androidCred);
            synced++;
          }
        } catch (error) {
          errors.push({
            credentialId: androidCred.id,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      // Sync Wallet -> Android (for compatible credentials)
      for (const walletCred of walletCredentials) {
        try {
          const exists = androidCredentials.some(
            (ac) => ac.id === walletCred.id,
          );
          if (
            !exists &&
            this.isCredentialCompatibleWithAndroid(
              walletCred.credential as VerifiableCredential,
            )
          ) {
            const androidCred = await this.convertToAndroidCredential(
              walletCred.credential as VerifiableCredential,
            );
            await this.storeCredentialInAndroid(androidCred);
            synced++;
          }
        } catch (error) {
          errors.push({
            credentialId: walletCred.id,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      return { synced, errors };
    } catch (error) {
      errorService.logError("Credential sync failed:", error);
      return {
        synced: 0,
        errors: [
          {
            credentialId: "sync",
            error: error instanceof Error ? error.message : "Sync failed",
          },
        ],
      };
    }
  }

  /**
   * Private helper methods
   */
  private async initiateOpenID4VCIFlow(
    _request: OpenID4VCIRequest,
  ): Promise<any> {
    // Simulate OAuth2/OIDC authorization flow
    // In a real implementation, this would redirect to the issuer's auth endpoint

    // In a real implementation, this would redirect to the issuer's auth endpoint
    // For demo purposes, simulate a successful auth response
    return {
      code: "mock_auth_code",
      state: "mock_state",
    };
  }

  private async exchangeAuthorizationCode(_authResponse: any): Promise<any> {
    // Simulate token exchange
    return {
      access_token: "mock_access_token",
      token_type: "Bearer",
      expires_in: 3600,
      c_nonce: await this.cryptoService.generateHash("challenge-" + Date.now()),
      c_nonce_expires_in: 300,
    };
  }

  private async requestCredentialFromIssuer(
    request: OpenID4VCIRequest,
    _accessToken: string,
  ): Promise<AndroidDigitalCredential> {
    // Simulate credential request to issuer
    const credential: VerifiableCredential = {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      id: `credential-${Date.now()}`,
      type: ["VerifiableCredential", "IdentityCredential"],
      issuer: request.credential_issuer,
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: "did:example:holder",
        name: "Mock User",
        email: "user@example.com",
      },
      proof: {
        type: "Ed25519Signature2020",
        created: new Date().toISOString(),
        verificationMethod: `${request.credential_issuer}#key-1`,
        proofPurpose: "assertionMethod",
        proofValue: "mock_proof_value",
      },
    };

    return {
      id: credential.id,
      type: credential.type,
      name: "Identity Credential",
      description: "Digital identity credential",
      issuer: {
        name: "Mock Issuer",
        domain: new URL(request.credential_issuer).hostname,
      },
      credential,
      androidMetadata: {
        packageName: "com.personapass.wallet",
        issuanceProtocol: "openid4vci",
        credentialFormat: "jwt_vc",
        revocationStatus: "valid",
        lastUpdated: new Date().toISOString(),
      },
      created: new Date().toISOString(),
    };
  }

  private async storeCredentialInWallet(
    credential: AndroidDigitalCredential,
  ): Promise<void> {
    const walletCredential = {
      id: credential.id,
      type: credential.type[0] || "VerifiableCredential",
      credential: credential.credential,
      metadata: {
        name: credential.name,
        description: credential.description,
        tags: credential.type,
        source: credential.issuer.domain,
        issuer: credential.issuer.name,
        issuedAt: credential.created,
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
        source: "manual" as const,
      },
    });
  }

  private async convertToAndroidCredential(
    credential: VerifiableCredential,
  ): Promise<AndroidDigitalCredential> {
    return {
      id: credential.id,
      type: credential.type,
      name: credential.type[credential.type.length - 1] || "Credential",
      description: `Digital credential of type ${credential.type.join(", ")}`,
      issuer: {
        name:
          typeof credential.issuer === "string"
            ? credential.issuer
            : credential.issuer.id,
        domain:
          typeof credential.issuer === "string"
            ? new URL(credential.issuer).hostname
            : new URL(credential.issuer.id).hostname,
      },
      credential,
      androidMetadata: {
        packageName: "com.personapass.wallet",
        issuanceProtocol: "direct",
        credentialFormat: "ldp_vc",
        revocationStatus: "valid",
        lastUpdated: new Date().toISOString(),
      },
      created: credential.issuanceDate || new Date().toISOString(),
    };
  }

  private isCredentialCompatibleWithAndroid(
    credential: VerifiableCredential,
  ): boolean {
    // Check if credential format is supported by Android
    const supportedTypes = [
      "VerifiableCredential",
      "IdentityCredential",
      "DriverLicense",
      "StudentCard",
      "EmployeeCredential",
    ];

    return credential.type.some((type) => supportedTypes.includes(type));
  }

  private async checkRevocationStatusManually(
    credentialId: string,
  ): Promise<"valid" | "revoked" | "suspended" | "unknown"> {
    try {
      // Get credential from storage
      const credential = await this.storageService.getCredential(credentialId);
      if (!credential) {
        return "unknown";
      }

      // Check if credential has revocation list
      const credentialStatus = (credential.credential as any).credentialStatus;
      if (!credentialStatus) {
        return "valid"; // No revocation mechanism
      }

      // Simulate revocation check
      // In real implementation, this would check the revocation list
      return "valid";
    } catch (error) {
      errorService.logError("Manual revocation check failed:", error);
      return "unknown";
    }
  }

  /**
   * Generate QR code for Android credential sharing
   */
  async generateAndroidQRCode(credentialId: string): Promise<string> {
    try {
      const credential = await this.storageService.getCredential(credentialId);
      if (!credential) {
        throw new Error("Credential not found");
      }

      // Create Android-compatible sharing format
      const shareData = {
        type: "android_credential_share",
        protocol: "openid4vp",
        credential_id: credentialId,
        presentation_definition: {
          id: `share-${Date.now()}`,
          input_descriptors: [
            {
              id: "credential_request",
              format: {
                jwt_vc: { alg: ["EdDSA", "ES256K"] },
                ldp_vc: { proof_type: ["Ed25519Signature2020"] },
              },
              constraints: {
                fields: [
                  {
                    path: ["$.type"],
                    filter: {
                      type: "array",
                      contains: {
                        const:
                          credential.credential.type[
                            credential.credential.type.length - 1
                          ],
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
        response_uri: `${window.location.origin}/api/android/presentation`,
        client_metadata: {
          client_name: "Persona Wallet",
          logo_uri: `${window.location.origin}/logo.png`,
        },
      };

      // Generate QR code data URL
      const qrData = `openid4vp://?${new URLSearchParams({
        request: btoa(JSON.stringify(shareData)),
      }).toString()}`;

      return qrData;
    } catch (error) {
      throw new Error(
        `Failed to generate Android QR code: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
