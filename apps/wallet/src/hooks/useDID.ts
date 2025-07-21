/**
 * useDID Hook - React integration for DID management
 *
 * Provides React hooks for DID creation, storage, and cryptographic operations
 */

import { useState, useEffect, useCallback } from "react";
import { errorService } from "@/services/errorService";
import {
  DIDService,
  DIDStorageService,
  DIDKeyPair,
} from "../services/didService";

export interface DIDState {
  currentDID: DIDKeyPair | null;
  storedDIDs: string[];
  isGenerating: boolean;
  error: string | null;
}

export interface DIDOperations {
  generateNewDID: () => Promise<DIDKeyPair | null>;
  generateDIDFromSeed: (seed: string) => Promise<DIDKeyPair | null>;
  loadDID: (alias: string) => Promise<void>;
  saveDID: (alias: string, didKeyPair?: DIDKeyPair) => Promise<void>;
  deleteDID: (alias: string) => Promise<void>;
  signData: (data: string) => Promise<string | null>;
  verifySignature: (
    signature: string,
    data: string,
    publicKey?: string,
  ) => Promise<boolean>;
  clearError: () => void;
}

/**
 * React hook for DID management
 *
 * @returns DID state and operations
 */
export function useDID(): DIDState & DIDOperations {
  const [state, setState] = useState<DIDState>({
    currentDID: null,
    storedDIDs: [],
    isGenerating: false,
    error: null,
  });

  // Load stored DIDs on mount
  useEffect(() => {
    loadStoredDIDs();
  }, []);

  const loadStoredDIDs = useCallback(async () => {
    try {
      const aliases = await DIDStorageService.listDIDs();
      setState((prev) => ({ ...prev, storedDIDs: aliases }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: `Failed to load stored DIDs: ${error instanceof Error ? error.message : "Unknown error"}`,
      }));
    }
  }, []);

  const generateNewDID = useCallback(async (): Promise<DIDKeyPair | null> => {
    setState((prev) => ({ ...prev, isGenerating: true, error: null }));

    try {
      console.log("🔄 Generating new DID with Ed25519 cryptography...");

      const didKeyPair = await DIDService.generateDID();

      setState((prev) => ({
        ...prev,
        currentDID: didKeyPair,
        isGenerating: false,
      }));

      console.log("✅ DID Generation Complete:", {
        did: didKeyPair.did,
        hasPrivateKey: didKeyPair.privateKey.length > 0,
        documentValid: !!didKeyPair.document,
      });

      return didKeyPair;
    } catch (error) {
      const errorMessage = `DID generation failed: ${error instanceof Error ? error.message : "Unknown error"}`;
      errorService.logError("❌", errorMessage);

      setState((prev) => ({
        ...prev,
        isGenerating: false,
        error: errorMessage,
      }));

      return null;
    }
  }, []);

  const generateDIDFromSeed = useCallback(
    async (seed: string): Promise<DIDKeyPair | null> => {
      if (!seed.trim()) {
        setState((prev) => ({ ...prev, error: "Seed cannot be empty" }));
        return null;
      }

      setState((prev) => ({ ...prev, isGenerating: true, error: null }));

      try {
        console.log("🔄 Generating deterministic DID from seed...");

        const didKeyPair = await DIDService.generateDIDFromSeed(seed);

        setState((prev) => ({
          ...prev,
          currentDID: didKeyPair,
          isGenerating: false,
        }));

        console.log("✅ Deterministic DID Generation Complete");

        return didKeyPair;
      } catch (error) {
        const errorMessage = `Deterministic DID generation failed: ${error instanceof Error ? error.message : "Unknown error"}`;
        errorService.logError("❌", errorMessage);

        setState((prev) => ({
          ...prev,
          isGenerating: false,
          error: errorMessage,
        }));

        return null;
      }
    },
    [],
  );

  const loadDID = useCallback(async (alias: string): Promise<void> => {
    try {
      console.log(`🔄 Loading DID: ${alias}`);

      const didKeyPair = await DIDStorageService.retrieveDID(alias);

      if (didKeyPair) {
        setState((prev) => ({
          ...prev,
          currentDID: didKeyPair,
          error: null,
        }));
        console.log("✅ DID loaded successfully");
      } else {
        setState((prev) => ({
          ...prev,
          error: `DID not found: ${alias}`,
        }));
      }
    } catch (error) {
      const errorMessage = `Failed to load DID: ${error instanceof Error ? error.message : "Unknown error"}`;
      setState((prev) => ({ ...prev, error: errorMessage }));
    }
  }, []);

  const saveDID = useCallback(
    async (alias: string, didKeyPair?: DIDKeyPair): Promise<void> => {
      const targetDID = didKeyPair || state.currentDID;

      if (!targetDID) {
        setState((prev) => ({ ...prev, error: "No DID to save" }));
        return;
      }

      try {
        console.log(`🔄 Saving DID with alias: ${alias}`);

        await DIDStorageService.storeDID(alias, targetDID);
        await loadStoredDIDs(); // Refresh the list

        setState((prev) => ({ ...prev, error: null }));
        console.log("✅ DID saved successfully");
      } catch (error) {
        const errorMessage = `Failed to save DID: ${error instanceof Error ? error.message : "Unknown error"}`;
        setState((prev) => ({ ...prev, error: errorMessage }));
      }
    },
    [state.currentDID, loadStoredDIDs],
  );

  const deleteDID = useCallback(
    async (alias: string): Promise<void> => {
      try {
        console.log(`🔄 Deleting DID: ${alias}`);

        await DIDStorageService.deleteDID(alias);
        await loadStoredDIDs(); // Refresh the list

        // If this was the current DID, clear it
        if (state.currentDID && state.currentDID.did.includes(alias)) {
          setState((prev) => ({ ...prev, currentDID: null }));
        }

        setState((prev) => ({ ...prev, error: null }));
        console.log("✅ DID deleted successfully");
      } catch (error) {
        const errorMessage = `Failed to delete DID: ${error instanceof Error ? error.message : "Unknown error"}`;
        setState((prev) => ({ ...prev, error: errorMessage }));
      }
    },
    [state.currentDID, loadStoredDIDs],
  );

  const signData = useCallback(
    async (data: string): Promise<string | null> => {
      if (!state.currentDID) {
        setState((prev) => ({ ...prev, error: "No DID loaded for signing" }));
        return null;
      }

      try {
        console.log("🔄 Signing data with DID...");

        const dataBytes = new TextEncoder().encode(data);
        const signature = await DIDService.signWithDID(
          dataBytes,
          state.currentDID.privateKey,
        );

        // Convert signature to base64 for easy handling
        const signatureBase64 = btoa(String.fromCharCode(...signature));

        console.log("✅ Data signed successfully");
        return signatureBase64;
      } catch (error) {
        const errorMessage = `Failed to sign data: ${error instanceof Error ? error.message : "Unknown error"}`;
        setState((prev) => ({ ...prev, error: errorMessage }));
        return null;
      }
    },
    [state.currentDID],
  );

  const verifySignature = useCallback(
    async (
      signature: string,
      data: string,
      publicKeyBase64?: string,
    ): Promise<boolean> => {
      try {
        console.log("🔄 Verifying signature...");

        // Use current DID's public key if not provided
        let publicKey: Uint8Array;
        if (publicKeyBase64) {
          const publicKeyBytes = atob(publicKeyBase64);
          publicKey = new Uint8Array(publicKeyBytes.length);
          for (let i = 0; i < publicKeyBytes.length; i++) {
            publicKey[i] = publicKeyBytes.charCodeAt(i);
          }
        } else if (state.currentDID) {
          publicKey = state.currentDID.publicKey;
        } else {
          setState((prev) => ({
            ...prev,
            error: "No public key available for verification",
          }));
          return false;
        }

        // Convert signature from base64
        const signatureBytes = atob(signature);
        const signatureArray = new Uint8Array(signatureBytes.length);
        for (let i = 0; i < signatureBytes.length; i++) {
          signatureArray[i] = signatureBytes.charCodeAt(i);
        }

        const dataBytes = new TextEncoder().encode(data);
        const isValid = await DIDService.verifyDIDSignature(
          signatureArray,
          dataBytes,
          publicKey,
        );

        console.log(
          `${isValid ? "✅" : "❌"} Signature verification: ${isValid ? "VALID" : "INVALID"}`,
        );
        return isValid;
      } catch (error) {
        const errorMessage = `Failed to verify signature: ${error instanceof Error ? error.message : "Unknown error"}`;
        setState((prev) => ({ ...prev, error: errorMessage }));
        return false;
      }
    },
    [state.currentDID],
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    generateNewDID,
    generateDIDFromSeed,
    loadDID,
    saveDID,
    deleteDID,
    signData,
    verifySignature,
    clearError,
  };
}
