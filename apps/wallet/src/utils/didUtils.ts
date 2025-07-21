/**
 * DID Utility Functions
 * Helper functions for working with DIDs
 */

import { DID } from '../types/wallet';

/**
 * Convert a DID string to a DID object
 * This is a temporary helper while we fix type mismatches
 */
export function createDIDFromString(didString: string): DID {
  // Parse DID string to extract method and identifier
  const parts = didString.split(':');
  const method = parts[1] as "persona" | "key" | "web" || "persona";
  const identifier = parts.slice(2).join(':') || didString;

  return {
    id: didString,
    method,
    identifier,
    controller: didString,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    publicKeys: [],
    authentication: [],
    keyAgreement: [],
    capabilityInvocation: [],
    service: [],
    privateKey: new Uint8Array(),
    publicKey: new Uint8Array(),
    document: {},
    keyType: "Ed25519",
    purposes: ["authentication"]
  };
}

/**
 * Validate DID string format
 */
export function isValidDIDString(didString: string): boolean {
  if (!didString || typeof didString !== 'string') {
    return false;
  }
  
  // Basic DID format: did:method:specific-id
  const didRegex = /^did:[a-z0-9]+:[a-zA-Z0-9._:%-]*$/;
  return didRegex.test(didString);
}

/**
 * Extract DID string from DID object
 */
export function getDIDString(did: DID | string): string {
  if (typeof did === 'string') {
    return did;
  }
  return did.id;
}

/**
 * Create a DID object for the current user
 * This is a placeholder - should integrate with actual DID service
 */
export function createUserDID(): DID {
  const timestamp = new Date().toISOString();
  const didString = `did:persona:${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    id: didString,
    method: "persona",
    identifier: didString.split(':')[2],
    controller: didString,
    created: timestamp,
    updated: timestamp,
    publicKeys: [],
    authentication: [],
    keyAgreement: [],
    capabilityInvocation: [],
    service: [],
    privateKey: new Uint8Array(),
    publicKey: new Uint8Array(),
    document: {},
    keyType: "Ed25519",
    purposes: ["authentication"]
  };
}