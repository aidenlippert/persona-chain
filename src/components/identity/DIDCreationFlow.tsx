/**
 * DIDCreationFlow - Real Blockchain DID Creation
 * Creates and stores DIDs on PersonaChain blockchain
 */

import { useState } from "react";
import { errorService } from "@/services/errorService";
import {
  personaChainService,
  PersonaWallet,
  DIDDocument,
} from "../../services/personaChainService";

interface DIDCreationFlowProps {
  wallet: PersonaWallet;
  onDIDCreated: (did: string, txHash: string) => void;
  onError: (error: string) => void;
}

type CreationStep =
  | "preparing"
  | "creating"
  | "confirming"
  | "completed"
  | "error";

export function DIDCreationFlow({
  wallet,
  onDIDCreated,
  onError,
}: DIDCreationFlowProps) {
  const [step, setStep] = useState<CreationStep>("preparing");
  const [txHash, setTxHash] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);
  const [didDocument, setDidDocument] = useState<DIDDocument | null>(null);

  const createDIDOnBlockchain = async () => {
    setIsCreating(true);
    setStep("creating");

    try {
      // Create DID on PersonaChain blockchain
      const transactionHash =
        await personaChainService.createDIDOnChain(wallet);
      setTxHash(transactionHash);
      setStep("confirming");

      // Wait for transaction confirmation and query the created DID
      setTimeout(async () => {
        try {
          const createdDID = await personaChainService.queryDID(wallet.did);
          if (createdDID) {
            setDidDocument(createdDID);
            setStep("completed");
            onDIDCreated(wallet.did, transactionHash);
          } else {
            throw new Error(
              "DID not found after creation - blockchain may need more time to sync",
            );
          }
        } catch (error: any) {
          errorService.logError("DID verification failed:", error);
          setStep("error");
          let errorMessage = "Failed to verify DID creation";

          if (error.message.includes("not found")) {
            errorMessage =
              "DID creation transaction succeeded but verification failed. Your DID may still be processing on the blockchain.";
          } else if (error.message.includes("network")) {
            errorMessage =
              "Network error during DID verification. Please check your connection and try again.";
          } else if (error.message.includes("timeout")) {
            errorMessage =
              "DID verification timed out. The blockchain may be experiencing high traffic.";
          }

          onError(errorMessage);
        }
      }, 3000); // Wait 3 seconds for block confirmation
    } catch (error: any) {
      errorService.logError("DID creation failed:", error);
      setStep("error");
      setIsCreating(false);

      let errorMessage = "Failed to create DID on blockchain";

      if (error.message.includes("insufficient funds")) {
        errorMessage =
          "Insufficient funds to pay for transaction fees. Please add tokens to your wallet.";
      } else if (error.message.includes("rejected")) {
        errorMessage =
          "Transaction was rejected. Please check your wallet and try again.";
      } else if (error.message.includes("network")) {
        errorMessage =
          "Network error: Unable to connect to PersonaChain. Please check your connection.";
      } else if (error.message.includes("timeout")) {
        errorMessage =
          "Transaction timed out. The blockchain may be experiencing high traffic.";
      }

      onError(errorMessage);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getStepIcon = (currentStep: CreationStep) => {
    switch (currentStep) {
      case "preparing":
        return (
          <svg
            className="w-6 h-6 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        );
      case "creating":
        return (
          <svg
            className="w-6 h-6 text-orange-500 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        );
      case "confirming":
        return (
          <svg
            className="w-6 h-6 text-blue-500 animate-pulse"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case "completed":
        return (
          <svg
            className="w-6 h-6 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case "error":
        return (
          <svg
            className="w-6 h-6 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
    }
  };

  const getStepDescription = (currentStep: CreationStep) => {
    switch (currentStep) {
      case "preparing":
        return "Create your permanent, verifiable digital identity on PersonaChain";
      case "creating":
        return "Broadcasting transaction to PersonaChain blockchain...";
      case "confirming":
        return "Waiting for blockchain confirmation...";
      case "completed":
        return "Your DID has been successfully created and stored on-chain!";
      case "error":
        return "Something went wrong during DID creation. Please try again.";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            role="img"
            aria-label={`DID creation ${step}`}
          >
            {getStepIcon(step)}
          </div>
          <h1
            className="text-2xl font-bold text-gray-900 mb-2"
            role="heading"
            aria-level={1}
          >
            Create Your Digital Identity
          </h1>
          <p className="text-gray-600" role="status" aria-live="polite">
            {getStepDescription(step)}
          </p>
        </div>

        {/* Wallet Info */}
        <div
          className="bg-white rounded-xl border border-gray-200 p-4 mb-6"
          role="region"
          aria-labelledby="wallet-info-heading"
        >
          <div className="flex items-center justify-between mb-3">
            <h2
              id="wallet-info-heading"
              className="text-sm font-medium text-gray-700"
            >
              Connected Wallet
            </h2>
            <div
              className="w-2 h-2 bg-green-500 rounded-full"
              role="img"
              aria-label="Wallet connected"
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Address</span>
              <button
                onClick={() => copyToClipboard(wallet.address)}
                className="text-gray-900 font-mono text-xs hover:text-orange-500 transition-colors"
                title="Click to copy wallet address"
                aria-label={`Copy wallet address: ${wallet.address}`}
              >
                {wallet.address.slice(0, 12)}...{wallet.address.slice(-8)}
              </button>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">DID Preview</span>
              <button
                onClick={() => copyToClipboard(wallet.did)}
                className="text-gray-900 font-mono text-xs hover:text-orange-500 transition-colors"
                title="Click to copy DID"
                aria-label={`Copy DID preview: ${wallet.did}`}
              >
                {wallet.did.slice(0, 20)}...
              </button>
            </div>
          </div>
        </div>

        {/* Creation Progress */}
        <div
          className="bg-white rounded-xl border border-gray-200 p-6 mb-6"
          role="region"
          aria-labelledby="creation-progress-heading"
        >
          <div className="space-y-4">
            {step === "preparing" && (
              <div className="text-center">
                <h3
                  id="creation-progress-heading"
                  className="text-lg font-semibold text-gray-900 mb-4"
                >
                  Ready to Create DID
                </h3>
                <p className="text-gray-600 mb-6">
                  Your DID will be permanently stored on PersonaChain, enabling
                  secure credential verification worldwide.
                </p>
                <button
                  onClick={createDIDOnBlockchain}
                  disabled={isCreating}
                  className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  aria-describedby="did-creation-description"
                >
                  Create DID on Blockchain
                </button>
                <p id="did-creation-description" className="sr-only">
                  This will create your decentralized identity on the
                  PersonaChain blockchain
                </p>
              </div>
            )}

            {(step === "creating" || step === "confirming") && (
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {step === "creating"
                    ? "Creating DID..."
                    : "Confirming Transaction..."}
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-center mb-2">
                    <div className="w-8 h-8 border-4 border-orange-200 border-top-orange-500 rounded-full animate-spin" />
                  </div>
                  <p className="text-sm text-gray-600">
                    {step === "creating"
                      ? "Broadcasting to PersonaChain blockchain..."
                      : "Waiting for block confirmation..."}
                  </p>
                </div>
                {txHash && (
                  <div className="text-left">
                    <span className="text-sm text-gray-500">
                      Transaction Hash:
                    </span>
                    <button
                      onClick={() => copyToClipboard(txHash)}
                      className="block w-full text-sm font-mono text-gray-900 bg-gray-50 p-2 rounded mt-1 hover:text-orange-500 transition-colors"
                      title="Click to copy"
                    >
                      {txHash}
                    </button>
                  </div>
                )}
              </div>
            )}

            {step === "completed" && didDocument && (
              <div className="text-center">
                <h3 className="text-lg font-semibold text-green-700 mb-4">
                  ✅ DID Created Successfully!
                </h3>
                <div className="bg-green-50 rounded-lg p-4 mb-4">
                  <div className="text-left space-y-2">
                    <div>
                      <span className="text-sm text-green-600 font-medium">
                        DID ID:
                      </span>
                      <button
                        onClick={() => copyToClipboard(didDocument.id)}
                        className="block w-full text-sm font-mono text-green-800 hover:text-green-600 transition-colors"
                        title="Click to copy"
                      >
                        {didDocument.id}
                      </button>
                    </div>
                    <div>
                      <span className="text-sm text-green-600 font-medium">
                        Controller:
                      </span>
                      <button
                        onClick={() => copyToClipboard(didDocument.controller)}
                        className="block w-full text-sm font-mono text-green-800 hover:text-green-600 transition-colors"
                        title="Click to copy"
                      >
                        {didDocument.controller}
                      </button>
                    </div>
                    <div>
                      <span className="text-sm text-green-600 font-medium">
                        Created:
                      </span>
                      <p className="text-sm text-green-800">
                        {new Date(didDocument.created).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => (window.location.href = "/")}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  Continue to Dashboard
                </button>
              </div>
            )}

            {step === "error" && (
              <div className="text-center">
                <h3 className="text-lg font-semibold text-red-700 mb-4">
                  ❌ Creation Failed
                </h3>
                <div className="bg-red-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-red-600">
                    The DID creation transaction failed. This could be due to
                    insufficient gas, network issues, or blockchain connectivity
                    problems.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setStep("preparing");
                    setIsCreating(false);
                    setTxHash("");
                  }}
                  className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-start">
            <div className="w-5 h-5 text-gray-400 mt-0.5 mr-3">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-1">
                Why Decentralized Identity?
              </h4>
              <p className="text-xs text-gray-600">
                DIDs give you permanent control over your digital identity. No
                company can revoke it, and you can verify credentials instantly
                worldwide.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
