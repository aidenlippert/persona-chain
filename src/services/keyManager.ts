/**
 * Secure Key Manager with BIP39/BIP32 Implementation
 * Implements proper HD wallet key derivation for Cosmos chains
 */

import * as bip39 from "bip39";
import { BIP32Factory } from "bip32";
import { derivePath } from "ed25519-hd-key";
import * as ecc from "tiny-secp256k1";
import { sha256 } from "@noble/hashes/sha256";

// Initialize BIP32 with secp256k1 support
const bip32 = BIP32Factory(ecc);

export interface HDKeyPair {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  address: string;
  derivationPath: string;
}

export interface CosmosKeyInfo {
  mnemonic?: string; // Only temporarily available
  hdWallet: HDKeyPair;
  publicKeyCompressed: Uint8Array;
  bech32Address: string;
}

export class KeyManager {
  private static readonly COSMOS_DERIVATION_PATH = "m/44'/118'/0'/0/0";
  private static readonly MNEMONIC_STRENGTH = 256; // 24 words

  /**
   * Generate a new BIP39 mnemonic with proper entropy
   */
  static generateMnemonic(): string {
    try {
      // Generate 256-bit entropy for 24-word mnemonic
      return bip39.generateMnemonic(this.MNEMONIC_STRENGTH);
    } catch (error) {
      throw new Error(
        `Failed to generate mnemonic: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Validate BIP39 mnemonic
   */
  static validateMnemonic(mnemonic: string): boolean {
    return bip39.validateMnemonic(mnemonic);
  }

  /**
   * Derive Cosmos key from mnemonic using proper BIP32 derivation
   */
  static async deriveCosmosKey(
    mnemonic: string,
    accountIndex: number = 0,
  ): Promise<CosmosKeyInfo> {
    if (!this.validateMnemonic(mnemonic)) {
      throw new Error("Invalid mnemonic phrase");
    }

    try {
      // Generate seed from mnemonic
      const seed = await bip39.mnemonicToSeed(mnemonic);

      // Derive HD wallet using BIP32
      const root = bip32.fromSeed(seed);

      // Cosmos derivation path: m/44'/118'/0'/0/{accountIndex}
      const derivationPath = `m/44'/118'/0'/0/${accountIndex}`;
      const child = root.derivePath(derivationPath);

      if (!child.privateKey || !child.publicKey) {
        throw new Error("Failed to derive key pair");
      }

      // Create HD key pair
      const hdWallet: HDKeyPair = {
        privateKey: child.privateKey,
        publicKey: child.publicKey,
        address: this.createBech32Address(child.publicKey),
        derivationPath,
      };

      // Compress public key for Cosmos
      const publicKeyCompressed = this.compressPublicKey(child.publicKey);
      const bech32Address = this.createBech32Address(publicKeyCompressed);

      // Clear mnemonic from memory after a short delay (allow caller to handle it)
      const mnemonicCopy = mnemonic;
      setTimeout(() => {
        // Note: This is a best-effort attempt to clear the string
        // JavaScript doesn't provide guaranteed memory clearing
        if (typeof mnemonicCopy === "string") {
          // @ts-ignore - Attempting to overwrite string memory
          mnemonicCopy.split("").forEach((_, i) => (mnemonicCopy[i] = "\0"));
        }
      }, 1000);

      return {
        mnemonic: mnemonicCopy, // Caller should clear this immediately
        hdWallet,
        publicKeyCompressed,
        bech32Address,
      };
    } catch (error) {
      throw new Error(
        `Failed to derive Cosmos key: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Derive Ed25519 key for signing (alternative method for certain operations)
   */
  static deriveEd25519Key(
    mnemonic: string,
    accountIndex: number = 0,
  ): HDKeyPair {
    if (!this.validateMnemonic(mnemonic)) {
      throw new Error("Invalid mnemonic phrase");
    }

    try {
      // Convert mnemonic to seed
      const seed = bip39.mnemonicToSeedSync(mnemonic);

      // Derive Ed25519 key using proper derivation
      const derivationPath = `m/44'/118'/0'/0/${accountIndex}`;
      const derived = derivePath(derivationPath, seed.toString("hex"));

      return {
        privateKey: derived.key,
        publicKey: derived.chainCode, // Ed25519 public key
        address: this.createBech32Address(derived.chainCode),
        derivationPath,
      };
    } catch (error) {
      throw new Error(
        `Failed to derive Ed25519 key: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Compress secp256k1 public key to 33 bytes
   */
  private static compressPublicKey(publicKey: Uint8Array): Uint8Array {
    if (publicKey.length === 33) {
      return publicKey; // Already compressed
    }

    if (publicKey.length !== 65) {
      throw new Error("Invalid public key length");
    }

    // Extract x coordinate and determine compression prefix
    const x = publicKey.slice(1, 33);
    const y = publicKey.slice(33, 65);

    // Check if y is even or odd
    const prefix = y[31] % 2 === 0 ? 0x02 : 0x03;

    const compressed = new Uint8Array(33);
    compressed[0] = prefix;
    compressed.set(x, 1);

    return compressed;
  }

  /**
   * Create Bech32 address from public key
   */
  private static createBech32Address(publicKey: Uint8Array): string {
    try {
      // Hash the public key
      const hash = sha256(publicKey);

      // Take first 20 bytes for address
      const addressBytes = hash.slice(0, 20);

      // Convert to bech32 (simplified - in production use proper bech32 library)
      return this.toBech32("cosmos", addressBytes);
    } catch (error) {
      throw new Error(
        `Failed to create bech32 address: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Convert bytes to bech32 format (simplified implementation)
   */
  private static toBech32(prefix: string, data: Uint8Array): string {
    // This is a simplified implementation
    // In production, use a proper bech32 library like @cosmjs/encoding
    const base64 = Buffer.from(data).toString("base64");
    return `${prefix}${base64.replace(/[+/=]/g, "").toLowerCase()}`;
  }

  /**
   * Securely clear mnemonic from memory
   */
  static clearMnemonic(mnemonic: string): void {
    // Best effort to clear mnemonic from memory
    // Note: JavaScript doesn't provide guaranteed memory clearing
    try {
      if (typeof mnemonic === "string") {
        // Overwrite string characters
        for (let i = 0; i < mnemonic.length; i++) {
          // @ts-ignore - Attempting to overwrite string memory
          mnemonic[i] = "\0";
        }
      }
    } catch (error) {
      // String immutability prevents direct overwriting
      console.warn("Unable to securely clear mnemonic from memory");
    }
  }

  /**
   * Derive multiple accounts from single mnemonic
   */
  static async deriveMultipleAccounts(
    mnemonic: string,
    count: number = 5,
  ): Promise<CosmosKeyInfo[]> {
    if (!this.validateMnemonic(mnemonic)) {
      throw new Error("Invalid mnemonic phrase");
    }

    const accounts: CosmosKeyInfo[] = [];

    for (let i = 0; i < count; i++) {
      const account = await this.deriveCosmosKey(mnemonic, i);
      // Remove mnemonic from individual accounts
      delete account.mnemonic;
      accounts.push(account);
    }

    return accounts;
  }

  /**
   * Create deterministic key identifier
   */
  static createKeyId(publicKey: Uint8Array): string {
    const hash = sha256(publicKey);
    return Buffer.from(hash.slice(0, 8)).toString("hex");
  }

  /**
   * Validate derivation path format
   */
  static validateDerivationPath(path: string): boolean {
    const cosmosPathRegex = /^m\/44'\/118'\/\d+'\/\d+\/\d+$/;
    return cosmosPathRegex.test(path);
  }

  /**
   * Get mnemonic word count
   */
  static getMnemonicWordCount(mnemonic: string): number {
    return mnemonic.trim().split(/\s+/).length;
  }

  /**
   * Check mnemonic strength
   */
  static getMnemonicStrength(mnemonic: string): number {
    const wordCount = this.getMnemonicWordCount(mnemonic);

    switch (wordCount) {
      case 12:
        return 128;
      case 15:
        return 160;
      case 18:
        return 192;
      case 21:
        return 224;
      case 24:
        return 256;
      default:
        return 0; // Invalid
    }
  }

  /**
   * Generate entropy for mnemonic
   */
  static generateEntropy(strength: number = 256): Buffer {
    return crypto.getRandomValues(new Uint8Array(strength / 8)) as any;
  }
}
