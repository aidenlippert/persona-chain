/**
 * Crypto Service for PersonaPass SDK
 * Handles cryptographic operations for proof verification
 */

import { ed25519 } from '@noble/curves/ed25519';
import { secp256k1 } from '@noble/curves/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
// import { sha512 } from '@noble/hashes/sha512';
import { randomBytes } from '@noble/hashes/utils';
import * as jose from 'jose';
import type { VerifiableCredential, VerifiablePresentation, Proof } from '../types';

export class CryptoService {
  /**
   * Generate a cryptographic challenge
   */
  async generateChallenge(): Promise<string> {
    const challenge = randomBytes(32);
    return this.bytesToHex(challenge);
  }

  /**
   * Generate a hash
   */
  async generateHash(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(data);
    const hash = sha256(dataBytes);
    return this.bytesToHex(hash);
  }

  /**
   * Verify a presentation proof
   */
  async verifyProof(proof: Proof, presentation: VerifiablePresentation): Promise<boolean> {
    try {
      switch (proof.type) {
        case 'Ed25519Signature2020':
          return await this.verifyEd25519Proof(proof, presentation);
        
        case 'EcdsaSecp256k1Signature2019':
          return await this.verifySecp256k1Proof(proof, presentation);
        
        case 'JsonWebSignature2020':
          return await this.verifyJWSProof(proof, presentation);
        
        default:
          console.warn(`Unsupported proof type: ${proof.type}`);
          return false;
      }
    } catch (error) {
      console.error('Error verifying proof:', error);
      return false;
    }
  }

  /**
   * Verify a credential proof
   */
  async verifyCredentialProof(proof: Proof, credential: VerifiableCredential): Promise<boolean> {
    try {
      switch (proof.type) {
        case 'Ed25519Signature2020':
          return await this.verifyEd25519CredentialProof(proof, credential);
        
        case 'EcdsaSecp256k1Signature2019':
          return await this.verifySecp256k1CredentialProof(proof, credential);
        
        case 'JsonWebSignature2020':
          return await this.verifyJWSCredentialProof(proof, credential);
        
        default:
          console.warn(`Unsupported credential proof type: ${proof.type}`);
          return false;
      }
    } catch (error) {
      console.error('Error verifying credential proof:', error);
      return false;
    }
  }

  /**
   * Verify Ed25519 proof for presentation
   */
  private async verifyEd25519Proof(proof: Proof, presentation: VerifiablePresentation): Promise<boolean> {
    try {
      if (!proof.proofValue) {
        return false;
      }

      // Create canonical representation for verification
      const { proof: _, ...presentationWithoutProof } = presentation as any;
      const canonicalDoc = this.canonicalize({
        ...presentationWithoutProof,
        proof: {
          type: proof.type,
          created: proof.created,
          verificationMethod: proof.verificationMethod,
          proofPurpose: proof.proofPurpose,
          ...(proof.challenge && { challenge: proof.challenge }),
          ...(proof.domain && { domain: proof.domain })
        }
      });

      const documentHash = sha256(new TextEncoder().encode(canonicalDoc));
      const signature = this.base64UrlToBytes(proof.proofValue);
      
      // Get public key from verification method
      const publicKey = await this.resolvePublicKey(proof.verificationMethod);
      if (!publicKey) {
        return false;
      }

      return ed25519.verify(signature, documentHash, publicKey);
    } catch (error) {
      console.error('Error verifying Ed25519 proof:', error);
      return false;
    }
  }

  /**
   * Verify secp256k1 proof for presentation
   */
  private async verifySecp256k1Proof(proof: Proof, presentation: VerifiablePresentation): Promise<boolean> {
    try {
      if (!proof.proofValue) {
        return false;
      }

      // Create canonical representation for verification
      const { proof: _, ...presentationWithoutProof } = presentation as any;
      const canonicalDoc = this.canonicalize({
        ...presentationWithoutProof,
        proof: {
          type: proof.type,
          created: proof.created,
          verificationMethod: proof.verificationMethod,
          proofPurpose: proof.proofPurpose,
          ...(proof.challenge && { challenge: proof.challenge }),
          ...(proof.domain && { domain: proof.domain })
        }
      });

      const documentHash = sha256(new TextEncoder().encode(canonicalDoc));
      const signature = this.base64UrlToBytes(proof.proofValue);
      
      // Get public key from verification method
      const publicKey = await this.resolvePublicKey(proof.verificationMethod);
      if (!publicKey) {
        return false;
      }

      return secp256k1.verify(signature, documentHash, publicKey);
    } catch (error) {
      console.error('Error verifying secp256k1 proof:', error);
      return false;
    }
  }

  /**
   * Verify JWS proof for presentation
   */
  private async verifyJWSProof(proof: Proof, _presentation: VerifiablePresentation): Promise<boolean> {
    try {
      if (!proof.jws) {
        return false;
      }

      // Get public key JWK from verification method
      const publicKeyJwk = await this.resolvePublicKeyJwk(proof.verificationMethod);
      if (!publicKeyJwk) {
        return false;
      }

      const jwk = await jose.importJWK(publicKeyJwk as jose.JWK);
      const { payload } = await jose.jwtVerify(proof.jws, jwk);
      
      // Verify payload contains the presentation
      return payload.vp !== undefined;
    } catch (error) {
      console.error('Error verifying JWS proof:', error);
      return false;
    }
  }

  /**
   * Verify Ed25519 proof for credential
   */
  private async verifyEd25519CredentialProof(proof: Proof, credential: VerifiableCredential): Promise<boolean> {
    try {
      if (!proof.proofValue) {
        return false;
      }

      // Create canonical representation for verification
      const { proof: _, ...credentialWithoutProof } = credential as any;
      const canonicalDoc = this.canonicalize({
        ...credentialWithoutProof,
        proof: {
          type: proof.type,
          created: proof.created,
          verificationMethod: proof.verificationMethod,
          proofPurpose: proof.proofPurpose
        }
      });

      const documentHash = sha256(new TextEncoder().encode(canonicalDoc));
      const signature = this.base64UrlToBytes(proof.proofValue);
      
      // Get public key from verification method
      const publicKey = await this.resolvePublicKey(proof.verificationMethod);
      if (!publicKey) {
        return false;
      }

      return ed25519.verify(signature, documentHash, publicKey);
    } catch (error) {
      console.error('Error verifying Ed25519 credential proof:', error);
      return false;
    }
  }

  /**
   * Verify secp256k1 proof for credential
   */
  private async verifySecp256k1CredentialProof(proof: Proof, credential: VerifiableCredential): Promise<boolean> {
    try {
      if (!proof.proofValue) {
        return false;
      }

      // Create canonical representation for verification
      const { proof: _, ...credentialWithoutProof } = credential as any;
      const canonicalDoc = this.canonicalize({
        ...credentialWithoutProof,
        proof: {
          type: proof.type,
          created: proof.created,
          verificationMethod: proof.verificationMethod,
          proofPurpose: proof.proofPurpose
        }
      });

      const documentHash = sha256(new TextEncoder().encode(canonicalDoc));
      const signature = this.base64UrlToBytes(proof.proofValue);
      
      // Get public key from verification method
      const publicKey = await this.resolvePublicKey(proof.verificationMethod);
      if (!publicKey) {
        return false;
      }

      return secp256k1.verify(signature, documentHash, publicKey);
    } catch (error) {
      console.error('Error verifying secp256k1 credential proof:', error);
      return false;
    }
  }

  /**
   * Verify JWS proof for credential
   */
  private async verifyJWSCredentialProof(proof: Proof, _credential: VerifiableCredential): Promise<boolean> {
    try {
      if (!proof.jws) {
        return false;
      }

      // Get public key JWK from verification method
      const publicKeyJwk = await this.resolvePublicKeyJwk(proof.verificationMethod);
      if (!publicKeyJwk) {
        return false;
      }

      const jwk = await jose.importJWK(publicKeyJwk as jose.JWK);
      const { payload } = await jose.jwtVerify(proof.jws, jwk);
      
      // Verify payload contains the credential
      return payload.vc !== undefined;
    } catch (error) {
      console.error('Error verifying JWS credential proof:', error);
      return false;
    }
  }

  /**
   * Resolve public key from verification method
   */
  private async resolvePublicKey(verificationMethod: string): Promise<Uint8Array | null> {
    try {
      // In a real implementation, this would resolve the DID document
      // and extract the public key. For now, we'll simulate this.
      
      if (verificationMethod.includes('#')) {
        // Extract DID and key ID
        const [did, keyId] = verificationMethod.split('#');
        
        // Simulate DID resolution
        const didDocument = await this.resolveDID(did);
        if (!didDocument) {
          return null;
        }

        // Find the key in the DID document
        const publicKey = didDocument.publicKeys?.find((key: any) => key.id.endsWith(keyId));
        if (!publicKey?.publicKeyJwk) {
          return null;
        }

        // Convert JWK to raw public key
        if (publicKey.publicKeyJwk.kty === 'OKP' && publicKey.publicKeyJwk.x) {
          return this.base64UrlToBytes(publicKey.publicKeyJwk.x);
        } else if (publicKey.publicKeyJwk.kty === 'EC' && publicKey.publicKeyJwk.x && publicKey.publicKeyJwk.y) {
          // Combine x and y coordinates for secp256k1
          const x = this.base64UrlToBytes(publicKey.publicKeyJwk.x);
          const y = this.base64UrlToBytes(publicKey.publicKeyJwk.y);
          const publicKey64 = new Uint8Array(65);
          publicKey64[0] = 0x04; // Uncompressed point indicator
          publicKey64.set(x, 1);
          publicKey64.set(y, 33);
          return publicKey64;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error resolving public key:', error);
      return null;
    }
  }

  /**
   * Resolve public key JWK from verification method
   */
  private async resolvePublicKeyJwk(verificationMethod: string): Promise<JsonWebKey | null> {
    try {
      if (verificationMethod.includes('#')) {
        const [did, keyId] = verificationMethod.split('#');
        
        const didDocument = await this.resolveDID(did);
        if (!didDocument) {
          return null;
        }

        const publicKey = didDocument.publicKeys?.find((key: any) => key.id.endsWith(keyId));
        return publicKey?.publicKeyJwk || null;
      }
      
      return null;
    } catch (error) {
      console.error('Error resolving public key JWK:', error);
      return null;
    }
  }

  /**
   * Simulate DID resolution
   */
  private async resolveDID(did: string): Promise<any> {
    try {
      // In a real implementation, this would resolve the DID from various sources:
      // - DID registries
      // - Blockchain networks
      // - Web-based DID documents
      // - Universal resolver
      
      // For now, return a mock DID document structure
      return {
        id: did,
        publicKeys: [
          {
            id: `${did}#key1`,
            type: 'Ed25519VerificationKey2020',
            controller: did,
            publicKeyJwk: {
              kty: 'OKP',
              crv: 'Ed25519',
              x: 'mockPublicKeyX'
            }
          }
        ]
      };
    } catch (error) {
      console.error('Error resolving DID:', error);
      return null;
    }
  }

  /**
   * Create canonical representation of a document
   */
  private canonicalize(document: any): string {
    // Simple canonicalization - in production use a proper library like jsonld
    return JSON.stringify(document, Object.keys(document).sort());
  }

  /**
   * Convert bytes to hex string
   */
  private bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Convert base64url to bytes
   */
  private base64UrlToBytes(base64url: string): Uint8Array {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
    const binary = atob(padded);
    return new Uint8Array(binary.split('').map(char => char.charCodeAt(0)));
  }

}