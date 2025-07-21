/**
 * Persona Wallet WebAuthn Service
 * Handles FIDO2 passkey authentication for secure wallet access
 */

import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
} from "@simplewebauthn/browser";
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/typescript-types";
import type { PasskeyCredential, BiometricOptions } from "@/types/wallet";
import { StorageService } from "./storageService";
import { CryptoService } from "./cryptoService";
import { errorService } from "@/services/errorService";

export interface WebAuthnRegistrationOptions {
  username: string;
  displayName: string;
  timeout?: number;
  authenticatorSelection?: {
    authenticatorAttachment?: "platform" | "cross-platform";
    userVerification?: "required" | "preferred" | "discouraged";
    residentKey?: "required" | "preferred" | "discouraged";
  };
}

export interface WebAuthnAuthenticationOptions {
  timeout?: number;
  userVerification?: "required" | "preferred" | "discouraged";
  allowCredentials?: string[];
}

export interface WebAuthnCredential {
  id: string;
  rawId: ArrayBuffer;
  response: {
    clientDataJSON: ArrayBuffer;
    attestationObject: ArrayBuffer;
    authenticatorData?: ArrayBuffer;
    signature?: ArrayBuffer;
    userHandle?: ArrayBuffer;
  };
  type: "public-key";
  authenticatorAttachment?: string;
}

export class WebAuthnService {
  private static instance: WebAuthnService;
  private storageService: StorageService;
  private cryptoService: CryptoService;
  private rpId: string;
  private rpName: string;

  private constructor() {
    this.storageService = StorageService.getInstance();
    this.cryptoService = CryptoService.getInstance();
    this.rpId =
      typeof window !== "undefined" ? window.location.hostname : "localhost";
    this.rpName = "Persona Wallet";
  }

  static getInstance(): WebAuthnService {
    if (!WebAuthnService.instance) {
      WebAuthnService.instance = new WebAuthnService();
    }
    return WebAuthnService.instance;
  }

  /**
   * Check if WebAuthn is supported in this browser
   */
  isWebAuthnSupported(): boolean {
    return browserSupportsWebAuthn();
  }

  /**
   * Check if platform authenticator (built-in biometrics) is available
   */
  async isPlatformAuthenticatorAvailable(): Promise<boolean> {
    try {
      return await platformAuthenticatorIsAvailable();
    } catch (error) {
      errorService.logError(
        "Error checking platform authenticator availability:",
        error,
      );
      return false;
    }
  }

  /**
   * Get available biometric authentication types
   */
  async getAvailableBiometrics(): Promise<BiometricOptions[]> {
    const options: BiometricOptions[] = [];

    try {
      if (await this.isPlatformAuthenticatorAvailable()) {
        // Check for specific biometric types based on user agent
        const userAgent = navigator.userAgent.toLowerCase();

        if (userAgent.includes("iphone") || userAgent.includes("ipad")) {
          options.push({
            enabled: true,
            type: "face",
            fallback_to_pin: true,
          });
          options.push({
            enabled: true,
            type: "fingerprint",
            fallback_to_pin: true,
          });
        } else if (userAgent.includes("android")) {
          options.push({
            enabled: true,
            type: "fingerprint",
            fallback_to_pin: true,
          });
        } else {
          // Desktop - assume fingerprint and face are available
          options.push({
            enabled: true,
            type: "fingerprint",
            fallback_to_pin: true,
          });
          options.push({
            enabled: true,
            type: "face",
            fallback_to_pin: true,
          });
        }
      }
    } catch (error) {
      errorService.logError("Error detecting biometric options:", error);
    }

    return options;
  }

  /**
   * Register a new passkey credential
   */
  async registerPasskey(
    options: WebAuthnRegistrationOptions,
  ): Promise<PasskeyCredential> {
    try {
      if (!this.isWebAuthnSupported()) {
        throw new Error("WebAuthn is not supported in this browser");
      }

      // Generate user ID for this registration
      const userId = await this.cryptoService.generateHash(
        options.username + Date.now(),
      );
      const userIdBytes = new TextEncoder().encode(userId.slice(0, 32));

      // Create registration options
      const registrationOptions: PublicKeyCredentialCreationOptionsJSON = {
        rp: {
          name: this.rpName,
          id: this.rpId,
        },
        user: {
          id: this.uint8ArrayToBase64Url(userIdBytes),
          name: options.username,
          displayName: options.displayName,
        },
        challenge: this.uint8ArrayToBase64Url(
          crypto.getRandomValues(new Uint8Array(32)),
        ),
        pubKeyCredParams: [
          { alg: -7, type: "public-key" }, // ES256
          { alg: -8, type: "public-key" }, // EdDSA
          { alg: -257, type: "public-key" }, // RS256
        ],
        timeout: options.timeout || 60000,
        attestation: "direct",
        authenticatorSelection: {
          authenticatorAttachment:
            options.authenticatorSelection?.authenticatorAttachment ||
            "platform",
          userVerification:
            options.authenticatorSelection?.userVerification || "required",
          residentKey:
            options.authenticatorSelection?.residentKey || "required",
        },
        excludeCredentials: await this.getExistingCredentialIds(),
      };

      // Start registration
      const registrationResponse = await startRegistration(registrationOptions);

      // Verify and store the credential
      const passkeyCredential = await this.processRegistrationResponse(
        registrationResponse,
        options.displayName,
      );

      await this.storageService.storePasskey(passkeyCredential);

      return passkeyCredential;
    } catch (error) {
      errorService.logError("Error registering passkey:", error);
      throw new Error(
        `Failed to register passkey: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Authenticate using existing passkey
   */
  async authenticateWithPasskey(
    options?: WebAuthnAuthenticationOptions,
  ): Promise<{
    credential: PasskeyCredential;
    authenticationData: AuthenticationResponseJSON;
  }> {
    try {
      if (!this.isWebAuthnSupported()) {
        throw new Error("WebAuthn is not supported in this browser");
      }

      // Get existing credentials
      const existingCredentials = await this.storageService.getPasskeys(true);

      if (existingCredentials.length === 0) {
        throw new Error("No passkeys found. Please register a passkey first.");
      }

      // Create authentication options
      const authenticationOptions: PublicKeyCredentialRequestOptionsJSON = {
        challenge: this.uint8ArrayToBase64Url(
          crypto.getRandomValues(new Uint8Array(32)),
        ),
        timeout: options?.timeout || 60000,
        rpId: this.rpId,
        userVerification: options?.userVerification || "required",
        allowCredentials: options?.allowCredentials
          ? options.allowCredentials.map((id) => ({
              id,
              type: "public-key" as const,
              transports: [
                "internal",
                "usb",
                "nfc",
                "ble",
              ] as AuthenticatorTransport[],
            }))
          : existingCredentials.map((cred) => ({
              id: cred.credentialId,
              type: "public-key" as const,
              transports: cred.transport,
            })),
      };

      // Start authentication
      const authenticationResponse = await startAuthentication(
        authenticationOptions,
      );

      // Find the credential that was used
      const usedCredential = existingCredentials.find(
        (cred) => cred.credentialId === authenticationResponse.id,
      );

      if (!usedCredential) {
        throw new Error(
          "Authentication response does not match any stored credentials",
        );
      }

      // Update last used timestamp and counter
      const updatedCredential: PasskeyCredential = {
        ...usedCredential,
        lastUsed: new Date().toISOString(),
        counter: usedCredential.counter + 1,
      };

      await this.storageService.storePasskey(updatedCredential);

      return {
        credential: updatedCredential,
        authenticationData: authenticationResponse,
      };
    } catch (error) {
      errorService.logError("Error authenticating with passkey:", error);
      throw new Error(
        `Failed to authenticate with passkey: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * List all registered passkeys
   */
  async getRegisteredPasskeys(): Promise<PasskeyCredential[]> {
    try {
      return await this.storageService.getPasskeys();
    } catch (error) {
      errorService.logError("Error getting registered passkeys:", error);
      throw new Error("Failed to retrieve registered passkeys");
    }
  }

  /**
   * Remove a passkey credential
   */
  async removePasskey(credentialId: string): Promise<void> {
    try {
      const passkeys = await this.storageService.getPasskeys();
      const passkeyToRemove = passkeys.find(
        (p) => p.credentialId === credentialId,
      );

      if (!passkeyToRemove) {
        throw new Error("Passkey not found");
      }

      const updatedPasskey: PasskeyCredential = {
        ...passkeyToRemove,
        active: false,
      };

      await this.storageService.storePasskey(updatedPasskey);
    } catch (error) {
      errorService.logError("Error removing passkey:", error);
      throw new Error("Failed to remove passkey");
    }
  }

  /**
   * Check if user has any registered passkeys
   */
  async hasRegisteredPasskeys(): Promise<boolean> {
    try {
      const passkeys = await this.storageService.getPasskeys(true);
      return passkeys.length > 0;
    } catch (error) {
      errorService.logError("Error checking for passkeys:", error);
      return false;
    }
  }

  /**
   * Generate a conditional UI request for passkey authentication
   */
  async createConditionalRequest(): Promise<PublicKeyCredentialRequestOptionsJSON | null> {
    try {
      if (!this.isWebAuthnSupported() || !("credentials" in navigator)) {
        return null;
      }

      const existingCredentials = await this.storageService.getPasskeys(true);

      if (existingCredentials.length === 0) {
        return null;
      }

      return {
        challenge: this.uint8ArrayToBase64Url(
          crypto.getRandomValues(new Uint8Array(32)),
        ),
        timeout: 300000, // 5 minutes for conditional UI
        rpId: this.rpId,
        userVerification: "preferred",
        allowCredentials: existingCredentials.map((cred) => ({
          id: cred.credentialId,
          type: "public-key" as const,
          transports: cred.transport,
        })),
      };
    } catch (error) {
      errorService.logError("Error creating conditional request:", error);
      return null;
    }
  }

  /**
   * Process registration response and create PasskeyCredential
   */
  private async processRegistrationResponse(
    response: RegistrationResponseJSON,
    displayName: string,
  ): Promise<PasskeyCredential> {
    const credentialId = response.id;

    // Extract public key from attestation object (simplified)
    const attestationObject = this.base64UrlToUint8Array(
      response.response.attestationObject,
    );
    const publicKey = this.uint8ArrayToBase64Url(
      attestationObject.slice(0, 65),
    ); // Simplified extraction

    const passkeyCredential: PasskeyCredential = {
      id: await this.cryptoService.generateHash(credentialId + Date.now()),
      name: displayName,
      created: new Date().toISOString(),
      counter: 0,
      transport: ["internal"], // Default to platform authenticator
      credentialId,
      publicKey,
      active: true,
    };

    return passkeyCredential;
  }

  /**
   * Get existing credential IDs to exclude from new registrations
   */
  private async getExistingCredentialIds(): Promise<
    Array<{
      id: string;
      type: "public-key";
      transports?: AuthenticatorTransport[];
    }>
  > {
    try {
      const existingCredentials = await this.storageService.getPasskeys(true);

      return existingCredentials.map((cred) => ({
        id: cred.credentialId,
        type: "public-key" as const,
        transports: cred.transport,
      }));
    } catch (error) {
      errorService.logError("Error getting existing credential IDs:", error);
      return [];
    }
  }

  /**
   * Utility: Convert Uint8Array to Base64URL
   */
  private uint8ArrayToBase64Url(buffer: Uint8Array): string {
    const base64 = btoa(String.fromCharCode(...buffer));
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }

  /**
   * Utility: Convert Base64URL to Uint8Array
   */
  private base64UrlToUint8Array(base64url: string): Uint8Array {
    const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    return new Uint8Array(binary.split("").map((char) => char.charCodeAt(0)));
  }

  /**
   * Test WebAuthn support and capabilities
   */
  async testWebAuthnSupport(): Promise<{
    webauthnSupported: boolean;
    platformAuthenticatorAvailable: boolean;
    conditionalMediationSupported: boolean;
    availableBiometrics: BiometricOptions[];
  }> {
    const webauthnSupported = this.isWebAuthnSupported();
    const platformAuthenticatorAvailable =
      await this.isPlatformAuthenticatorAvailable();
    const availableBiometrics = await this.getAvailableBiometrics();

    // Check for conditional mediation support
    let conditionalMediationSupported = false;
    try {
      conditionalMediationSupported =
        await PublicKeyCredential.isConditionalMediationAvailable();
    } catch (error) {
      console.warn("Conditional mediation check failed:", error);
    }

    return {
      webauthnSupported,
      platformAuthenticatorAvailable,
      conditionalMediationSupported,
      availableBiometrics,
    };
  }
}
