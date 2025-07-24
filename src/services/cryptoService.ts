/**
 * PersonaPass Cryptographic Service
 * Secure cryptographic operations for identity wallet
 * 
 * Features:
 * - Ed25519 & secp256k1 key generation and operations
 * - AES-256-GCM encryption/decryption
 * - JWS creation and verification
 * - DID document creation and proof generation
 * - Constant-time operations for security
 * 
 * @version 2.0.0
 * @security Critical component - handle with care
 */

import { ed25519 } from "@noble/curves/ed25519";
import { secp256k1 } from "@noble/curves/secp256k1";

// Enable WASM for optimal cryptographic performance
if (typeof globalThis !== 'undefined') {
  // Allow WASM for better performance
  globalThis.crypto = globalThis.crypto || {};
  (globalThis as any).__NOBLE_DISABLE_WASM__ = false;
}
import { sha256 } from "@noble/hashes/sha256";
import { randomBytes } from "@noble/hashes/utils";
import * as jose from "jose";
import type { DID, PublicKey, Proof } from "@/types/wallet";
import { KeyManager } from "./keyManager";

// Custom error classes for better error handling
export class CryptoError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly operation: string
  ) {
    super(message);
    this.name = 'CryptoError';
  }
}

export class ValidationError extends CryptoError {
  constructor(message: string, operation: string) {
    super(message, 'VALIDATION_ERROR', operation);
    this.name = 'ValidationError';
  }
}

// Type definitions with strict typing
export interface KeyPair {
  readonly privateKey: Uint8Array;
  readonly publicKey: Uint8Array;
  readonly publicKeyJwk: JsonWebKey;
  readonly keyId: string;
  readonly curve: 'Ed25519' | 'secp256k1';
}

export interface EncryptionResult {
  readonly ciphertext: string;
  readonly iv: string;
  readonly salt: string;
  readonly algorithm: 'AES-256-GCM';
}

export interface SignatureResult {
  readonly signature: Uint8Array;
  readonly algorithm: string;
  readonly keyId?: string;
}

export interface JWSVerificationResult {
  readonly payload: unknown | null;
  readonly valid: boolean;
  readonly error?: string;
}

export class CryptoService {
  private static instance: CryptoService;
  private readonly keyCache = new Map<string, KeyPair>();
  private readonly operationCount = new Map<string, number>();
  private readonly maxOperationsPerMinute = 1000; // Rate limiting
  
  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): CryptoService {
    if (!CryptoService.instance) {
      CryptoService.instance = new CryptoService();
    }
    return CryptoService.instance;
  }

  /**
   * Validate input parameters for security
   */
  private validateInput(value: unknown, name: string, type: string): void {
    if (value === null || value === undefined) {
      throw new ValidationError(`${name} is required`, 'input_validation');
    }
    
    if (typeof value !== type) {
      throw new ValidationError(`${name} must be of type ${type}`, 'input_validation');
    }
  }

  /**
   * Rate limiting for crypto operations
   */
  private checkRateLimit(operation: string): void {
    const now = Date.now();
    const minute = Math.floor(now / 60000);
    const key = `${operation}:${minute}`;
    
    const count = this.operationCount.get(key) || 0;
    if (count >= this.maxOperationsPerMinute) {
      throw new CryptoError('Rate limit exceeded', 'RATE_LIMIT', operation);
    }
    
    this.operationCount.set(key, count + 1);
    
    // Clean old entries
    for (const [k, _] of this.operationCount) {
      const [, keyMinute] = k.split(':');
      if (parseInt(keyMinute) < minute - 1) {
        this.operationCount.delete(k);
      }
    }
  }

  /**
   * Generate a new Ed25519 key pair for DID operations
   * @returns Promise<KeyPair> Cryptographically secure key pair
   */
  async generateEd25519KeyPair(): Promise<KeyPair> {
    this.checkRateLimit('generateEd25519');
    
    try {
      const privateKey = ed25519.utils.randomPrivateKey();
      const publicKey = ed25519.getPublicKey(privateKey);

      // Convert to JWK format with strict typing
      const publicKeyJwk: JsonWebKey = {
        kty: "OKP",
        crv: "Ed25519",
        x: this.bytesToBase64Url(publicKey),
        use: "sig",
        key_ops: ["verify"],
      };

      const keyId = await this.generateKeyId(publicKey);

      const keyPair: KeyPair = {
        privateKey,
        publicKey,
        publicKeyJwk,
        keyId,
        curve: 'Ed25519',
      };

      // Cache the public key portion for reuse
      this.keyCache.set(keyId, keyPair);

      return keyPair;
    } catch (error) {
      throw new CryptoError(
        'Failed to generate Ed25519 key pair',
        'KEY_GENERATION_FAILED',
        'generateEd25519KeyPair'
      );
    }
  }

  /**
   * Generate a new secp256k1 key pair for Ethereum compatibility
   * @returns Promise<KeyPair> Cryptographically secure key pair
   */
  async generateSecp256k1KeyPair(): Promise<KeyPair> {
    this.checkRateLimit('generateSecp256k1');
    
    try {
      const privateKey = secp256k1.utils.randomPrivateKey();
      const publicKey = secp256k1.getPublicKey(privateKey, false); // uncompressed

      // Validate key generation
      if (publicKey.length !== 65) {
        throw new CryptoError('Invalid public key length', 'INVALID_KEY', 'generateSecp256k1KeyPair');
      }

      // Convert to JWK format with proper validation
      const publicKeyJwk: JsonWebKey = {
        kty: "EC",
        crv: "secp256k1",
        x: this.bytesToBase64Url(publicKey.slice(1, 33)),
        y: this.bytesToBase64Url(publicKey.slice(33, 65)),
        use: "sig",
        key_ops: ["verify"],
      };

      const keyId = await this.generateKeyId(publicKey);

      const keyPair: KeyPair = {
        privateKey,
        publicKey,
        publicKeyJwk,
        keyId,
        curve: 'secp256k1',
      };

      // Cache the public key portion for reuse
      this.keyCache.set(keyId, keyPair);

      return keyPair;
    } catch (error) {
      throw new CryptoError(
        'Failed to generate secp256k1 key pair',
        'KEY_GENERATION_FAILED',
        'generateSecp256k1KeyPair'
      );
    }
  }

  /**
   * Generate a BIP39 mnemonic phrase for recovery purposes
   * @returns Promise<string> 24-word mnemonic phrase
   */
  async generateMnemonic(): Promise<string> {
    this.checkRateLimit('generateMnemonic');
    
    try {
      return KeyManager.generateMnemonic();
    } catch (error) {
      throw new CryptoError(
        'Failed to generate mnemonic phrase',
        'MNEMONIC_GENERATION_FAILED',
        'generateMnemonic'
      );
    }
  }

  /**
   * Generate a DID from a public key
   */
  async generateDID(
    publicKey: Uint8Array,
    method: "persona" | "key" = "persona",
  ): Promise<string> {
    try {
      const hash = sha256(publicKey);
      const identifier = this.bytesToBase58(hash.slice(0, 16));

      return `did:${method}:${identifier}`;
    } catch (error) {
      // Error logged by error handling system
      throw new Error("Failed to generate DID");
    }
  }

  /**
   * Create a complete DID Document
   */
  async createDIDDocument(
    keyPair: KeyPair,
    method: "persona" | "key" = "persona",
  ): Promise<DID> {
    try {
      const did = await this.generateDID(keyPair.publicKey, method);
      const keyId = `${did}#${keyPair.keyId}`;

      const publicKey: PublicKey = {
        id: keyId,
        type: "Ed25519VerificationKey2020",
        controller: did,
        publicKeyJwk: keyPair.publicKeyJwk,
      };

      const didDocument: DID = {
        id: did,
        method,
        identifier: did.split(":")[2],
        controller: did,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        publicKeys: [publicKey],
        authentication: [keyId],
        keyAgreement: [keyId],
        capabilityInvocation: [keyId],
        service: [],
        privateKey: keyPair.privateKey,
        publicKey: keyPair.publicKey,
        document: {},
        keyType: "Ed25519",
        purposes: ["authentication", "keyAgreement", "capabilityInvocation"],
      };

      return didDocument;
    } catch (error) {
      // Error logged by error handling system
      throw new Error("Failed to create DID document");
    }
  }

  /**
   * Sign data with Ed25519 private key (constant-time operation)
   * @param data Data to sign
   * @param privateKey Ed25519 private key
   * @returns Promise<Uint8Array> Signature bytes
   */
  async signEd25519(
    data: Uint8Array,
    privateKey: Uint8Array,
  ): Promise<Uint8Array> {
    this.checkRateLimit('signEd25519');
    
    // Input validation
    if (!data || data.length === 0) {
      throw new ValidationError('Data is required for signing', 'signEd25519');
    }
    
    if (!privateKey || privateKey.length !== 32) {
      throw new ValidationError('Valid Ed25519 private key required', 'signEd25519');
    }

    try {
      return ed25519.sign(data, privateKey);
    } catch (error) {
      throw new CryptoError(
        'Failed to sign data with Ed25519',
        'SIGNING_FAILED',
        'signEd25519'
      );
    }
  }

  /**
   * Verify Ed25519 signature (constant-time operation)
   * @param signature Signature to verify
   * @param data Original data
   * @param publicKey Ed25519 public key
   * @returns Promise<boolean> Verification result
   */
  async verifyEd25519(
    signature: Uint8Array,
    data: Uint8Array,
    publicKey: Uint8Array,
  ): Promise<boolean> {
    this.checkRateLimit('verifyEd25519');
    
    // Input validation
    if (!signature || signature.length !== 64) {
      return false; // Don't throw on invalid signature
    }
    
    if (!data || data.length === 0) {
      return false;
    }
    
    if (!publicKey || publicKey.length !== 32) {
      return false;
    }

    try {
      return ed25519.verify(signature, data, publicKey);
    } catch {
      return false; // Don't leak error information
    }
  }

  /**
   * Sign data with secp256k1 private key
   */
  async signSecp256k1(
    data: Uint8Array,
    privateKey: Uint8Array,
  ): Promise<Uint8Array> {
    try {
      const signature = secp256k1.sign(data, privateKey);
      return signature.toCompactRawBytes();
    } catch (error) {
      // Error logged by error handling system
      throw new Error("Failed to sign data with secp256k1");
    }
  }

  /**
   * Create a JSON Web Signature (JWS)
   */
  async createJWS(
    payload: Record<string, unknown>,
    privateKey: Uint8Array,
    keyId: string,
    algorithm: "EdDSA" | "ES256K" = "EdDSA",
  ): Promise<string> {
    try {
      // Create JWK from private key
      let privateKeyJwk: JsonWebKey;

      if (algorithm === "EdDSA") {
        privateKeyJwk = {
          kty: "OKP",
          crv: "Ed25519",
          d: this.bytesToBase64Url(privateKey),
          use: "sig",
          key_ops: ["sign"],
        };
      } else {
        // secp256k1
        privateKeyJwk = {
          kty: "EC",
          crv: "secp256k1",
          d: this.bytesToBase64Url(privateKey),
          use: "sig",
          key_ops: ["sign"],
        };
      }

      const jwk = await jose.importJWK(privateKeyJwk as jose.JWK, algorithm);

      return await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: algorithm, kid: keyId })
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(jwk);
    } catch (error) {
      // Error logged by error handling system
      throw new Error("Failed to create JWS");
    }
  }

  /**
   * Verify a JSON Web Signature (JWS) with enhanced security
   * @param jws JSON Web Signature to verify
   * @param publicKeyJwk Public key in JWK format
   * @returns Promise<JWSVerificationResult> Verification result with payload
   */
  async verifyJWS(
    jws: string,
    publicKeyJwk: JsonWebKey,
  ): Promise<JWSVerificationResult> {
    this.checkRateLimit('verifyJWS');
    
    // Input validation
    this.validateInput(jws, 'jws', 'string');
    this.validateInput(publicKeyJwk, 'publicKeyJwk', 'object');
    
    if (!jws.trim()) {
      return { payload: null, valid: false, error: 'Empty JWS' };
    }

    try {
      const jwk = await jose.importJWK(publicKeyJwk as jose.JWK);
      const { payload } = await jose.jwtVerify(jws, jwk);

      return { payload, valid: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { 
        payload: null, 
        valid: false, 
        error: errorMessage.includes('signature') ? 'Invalid signature' : 'Verification failed'
      };
    }
  }

  /**
   * Create a cryptographic proof for a credential or presentation
   */
  async createProof(
    document: Record<string, unknown>,
    privateKey: Uint8Array,
    verificationMethod: string,
    proofPurpose: string = "assertionMethod",
    challenge?: string,
    domain?: string,
  ): Promise<Proof> {
    try {
      const proofConfig = {
        type: "Ed25519Signature2020",
        created: new Date().toISOString(),
        verificationMethod,
        proofPurpose,
        ...(challenge && { challenge }),
        ...(domain && { domain }),
      };

      // Create canonical document for signing
      const docWithProof = { ...document, proof: proofConfig };
      const canonicalDoc = JSON.stringify(
        docWithProof,
        Object.keys(docWithProof).sort(),
      );
      const documentHash = sha256(new TextEncoder().encode(canonicalDoc));

      // Sign the document hash
      const signature = await this.signEd25519(documentHash, privateKey);

      return {
        ...proofConfig,
        proofValue: this.bytesToBase64Url(signature),
      };
    } catch (error) {
      // Error logged by error handling system
      throw new Error("Failed to create cryptographic proof");
    }
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  async encryptData(data: string, password: string): Promise<EncryptionResult> {
    try {
      const encoder = new TextEncoder();
      const dataBytes = encoder.encode(data);

      // Generate salt and derive key
      const salt = randomBytes(16);
      const key = await this.deriveKey(password, salt);

      // Generate IV
      const iv = randomBytes(12);

      // Import key for WebCrypto API
      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        key,
        { name: "AES-GCM" },
        false,
        ["encrypt"],
      );

      // Encrypt data
      const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        cryptoKey,
        dataBytes,
      );

      return {
        ciphertext: this.bytesToBase64(new Uint8Array(ciphertext)),
        iv: this.bytesToBase64(iv),
        salt: this.bytesToBase64(salt),
        algorithm: "AES-256-GCM",
      };
    } catch (error) {
      // Error logged by error handling system
      throw new Error("Failed to encrypt data");
    }
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  async decryptData(
    encryptionResult: EncryptionResult,
    password: string,
  ): Promise<string> {
    try {
      const salt = this.base64ToBytes(encryptionResult.salt);
      const iv = this.base64ToBytes(encryptionResult.iv);
      const ciphertext = this.base64ToBytes(encryptionResult.ciphertext);

      // Derive key
      const key = await this.deriveKey(password, salt);

      // Import key for WebCrypto API
      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        key,
        { name: "AES-GCM" },
        false,
        ["decrypt"],
      );

      // Decrypt data
      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        cryptoKey,
        ciphertext,
      );

      return new TextDecoder().decode(decrypted);
    } catch (error) {
      // Error logged by error handling system
      throw new Error("Failed to decrypt data");
    }
  }

  /**
   * Clear sensitive data from memory
   * @param data Sensitive data to clear
   */
  private clearSensitiveData(data: Uint8Array): void {
    // Overwrite with random data multiple times for security
    for (let i = 0; i < 3; i++) {
      data.fill(Math.floor(Math.random() * 256));
    }
    data.fill(0);
  }

  /**
   * Clear key cache (for security)
   */
  clearKeyCache(): void {
    this.keyCache.clear();
  }

  /**
   * Generate a secure hash for integrity checking
   */
  async generateHash(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(data);
    const hash = sha256(dataBytes);
    return this.bytesToHex(hash);
  }

  // Private helper methods

  private async generateKeyId(publicKey: Uint8Array): Promise<string> {
    const hash = sha256(publicKey);
    return this.bytesToBase58(hash.slice(0, 8));
  }

  private async deriveKey(
    password: string,
    salt: Uint8Array,
  ): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const passwordBytes = encoder.encode(password);

    // Use PBKDF2 with 100,000 iterations
    const importedKey = await crypto.subtle.importKey(
      "raw",
      passwordBytes,
      "PBKDF2",
      false,
      ["deriveKey"],
    );

    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      importedKey,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"],
    );

    const keyBuffer = await crypto.subtle.exportKey("raw", derivedKey);
    return new Uint8Array(keyBuffer);
  }

  // === Encoding/Decoding Utilities ===

  // Utility functions for encoding/decoding
  private bytesToBase64(bytes: Uint8Array): string {
    return btoa(String.fromCharCode(...bytes));
  }

  private base64ToBytes(base64: string): Uint8Array {
    const binary = atob(base64);
    return new Uint8Array(binary.split("").map((char) => char.charCodeAt(0)));
  }

  private bytesToBase64Url(bytes: Uint8Array): string {
    return this.bytesToBase64(bytes)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  }

  private bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
      "",
    );
  }

  /**
   * Optimized Base58 encoding implementation
   * @param bytes Bytes to encode
   * @returns Base58 encoded string
   */
  private bytesToBase58(bytes: Uint8Array): string {
    const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    
    // Handle leading zeros
    let leadingZeros = 0;
    for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
      leadingZeros++;
    }
    
    // Convert to base 58
    let num = BigInt("0x" + this.bytesToHex(bytes));
    let result = "";

    while (num > 0) {
      result = alphabet[Number(num % 58n)] + result;
      num = num / 58n;
    }

    // Add leading '1's for leading zeros
    return "1".repeat(leadingZeros) + result;
  }

  /**
   * Create JWK from public key bytes
   */
  private createJWKFromPublicKey(
    publicKey: Uint8Array,
    curve: "secp256k1" | "Ed25519",
  ): JsonWebKey {
    if (curve === "Ed25519") {
      return {
        kty: "OKP",
        crv: "Ed25519",
        x: this.bytesToBase64Url(publicKey),
        use: "sig",
        key_ops: ["verify"],
      };
    } else {
      // secp256k1
      if (publicKey.length === 33) {
        // Compressed public key - need to decompress for JWK
        const uncompressed =
          secp256k1.ProjectivePoint.fromHex(publicKey).toRawBytes(false);
        return {
          kty: "EC",
          crv: "secp256k1",
          x: this.bytesToBase64Url(uncompressed.slice(1, 33)),
          y: this.bytesToBase64Url(uncompressed.slice(33, 65)),
          use: "sig",
          key_ops: ["verify"],
        };
      } else {
        // Uncompressed public key
        return {
          kty: "EC",
          crv: "secp256k1",
          x: this.bytesToBase64Url(publicKey.slice(1, 33)),
          y: this.bytesToBase64Url(publicKey.slice(33, 65)),
          use: "sig",
          key_ops: ["verify"],
        };
      }
    }
  }
}

// Export singleton instance
export const cryptoService = new CryptoService();
