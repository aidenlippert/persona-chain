/**
 * Real Onboarding Flow with Keplr & Blockchain Integration
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { personaChainService, PersonaWallet } from "../../services/personaChainService";
import { didService, DIDKeyPair } from "../../services/didService";
import { storageService } from "../../services/storageService";
import { cryptoService } from "../../services/cryptoService";
import { errorService } from "@/services/errorService";
// Using console for logging in production

type OnboardingStep = 
  | "welcome"
  | "keplr-connect"
  | "did-creation"
  | "recovery-phrase"
  | "backup-confirmation"
  | "credentials-setup"
  | "complete";

interface OnboardingState {
  step: OnboardingStep;
  wallet: PersonaWallet | null;
  didKeyPair: DIDKeyPair | null;
  recoveryPhrase: string[];
  isLoading: boolean;
  error: string | null;
}

export const RealOnboardingFlow = () => {
  const navigate = useNavigate();
  const [state, setState] = useState<OnboardingState>({
    step: "welcome",
    wallet: null,
    didKeyPair: null,
    recoveryPhrase: [],
    isLoading: false,
    error: null,
  });

  // Check if Keplr is installed
  useEffect(() => {
    if (state.step === "keplr-connect") {
      checkKeplrAvailability();
    }
  }, [state.step]);

  const checkKeplrAvailability = async () => {
    if (!window.keplr) {
      setState(prev => ({
        ...prev,
        error: "Keplr wallet is not installed. Please install Keplr extension to continue."
      }));
    }
  };

  const handleConnectKeplr = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Connect to Keplr wallet
      const wallet = await personaChainService.connectKeplr();
      
      if (!wallet) {
        throw new Error("Failed to connect to Keplr wallet");
      }

      console.log("Keplr wallet connected", wallet.address);
      
      // Check if this wallet already has a DID
      const existingDID = await personaChainService.checkExistingDID(wallet.address);
      
      if (existingDID) {
        console.log("✅ Found existing DID, skipping DID creation");
        // Update wallet with existing DID and skip to dashboard
        const walletWithDID = { ...wallet, did: existingDID };
        
        // Store wallet info and navigate to dashboard
        localStorage.setItem('persona_wallet', JSON.stringify(walletWithDID));
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('user', JSON.stringify({
          did: existingDID,
          address: wallet.address,
          publicKey: wallet.publicKey
        }));
        
        setState(prev => ({
          ...prev,
          wallet: walletWithDID,
          isLoading: false,
          step: "complete"
        }));
        
        // Navigate directly to dashboard
        setTimeout(() => navigate('/dashboard'), 1000);
      } else {
        console.log("No existing DID found, proceeding to DID creation");
        setState(prev => ({
          ...prev,
          wallet,
          isLoading: false,
          step: "did-creation"
        }));
      }
    } catch (error) {
      errorService.logError("Failed to connect Keplr", error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to connect wallet"
      }));
    }
  };

  const handleCreateDID = async () => {
    if (!state.wallet) {
      setState(prev => ({ ...prev, error: "Wallet not connected" }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Generate DID key pair
      const didCreationResult = await didService.generateDID();
      console.log("DID generated", didCreationResult.did);

      // Generate recovery phrase
      const mnemonic = await cryptoService.generateMnemonic();
      const recoveryPhrase = mnemonic.split(' ');

      // Extract the key pair and document from the creation result
      const didKeyPair = {
        did: didCreationResult.did,
        privateKey: didCreationResult.privateKey,
        publicKey: didCreationResult.publicKey,
        document: didCreationResult.document
      };
      const didDoc = didCreationResult.document;

      // Anchor DID on blockchain
      const txHash = await personaChainService.createDID(
        didKeyPair.did,
        didDoc,
        state.wallet.address
      );

      console.log("DID anchored on blockchain", { txHash, did: didKeyPair.did });

      // Store DID securely
      await storageService.storeDID(didKeyPair);
      await storageService.setCurrentDID(didKeyPair.did);

      setState(prev => ({
        ...prev,
        didKeyPair,
        recoveryPhrase,
        isLoading: false,
        step: "recovery-phrase"
      }));
    } catch (error) {
      errorService.logError("Failed to create DID", error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to create DID"
      }));
    }
  };

  const handleBackupConfirmation = () => {
    // Mark recovery phrase as backed up
    if (state.didKeyPair) {
      storageService.setItem('recovery_phrase_backed_up', 'true');
    }
    setState(prev => ({ ...prev, step: "credentials-setup" }));
  };

  const handleComplete = async () => {
    // Store wallet info
    if (state.wallet && state.didKeyPair) {
      await storageService.setItem('wallet_address', state.wallet.address);
      await storageService.setItem('onboarding_completed', 'true');
      
      // Navigate to dashboard
      navigate('/dashboard');
    }
  };

  const renderStep = () => {
    switch (state.step) {
      case "welcome":
        return (
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Welcome to PersonaPass
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Create your decentralized identity in just a few steps
            </p>
            <button
              onClick={() => setState(prev => ({ ...prev, step: "keplr-connect" }))}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
            >
              Get Started
            </button>
          </div>
        );

      case "keplr-connect":
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Connect Your Keplr Wallet
            </h2>
            <p className="text-gray-600 mb-8">
              We'll use Keplr to secure your identity on the blockchain
            </p>
            
            {state.error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600">{state.error}</p>
                {state.error.includes("not installed") && (
                  <a
                    href="https://www.keplr.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 underline mt-2 block"
                  >
                    Install Keplr Wallet
                  </a>
                )}
              </div>
            )}

            <button
              onClick={handleConnectKeplr}
              disabled={state.isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {state.isLoading ? "Connecting..." : "Connect Keplr"}
            </button>
          </div>
        );

      case "did-creation":
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Create Your Digital Identity
            </h2>
            <p className="text-gray-600 mb-8">
              We'll generate a unique DID and anchor it on PersonaChain
            </p>
            
            {state.wallet && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  Connected: {state.wallet.address.slice(0, 10)}...{state.wallet.address.slice(-8)}
                </p>
              </div>
            )}

            {state.error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600">{state.error}</p>
              </div>
            )}

            <button
              onClick={handleCreateDID}
              disabled={state.isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {state.isLoading ? "Creating DID..." : "Create DID"}
            </button>
          </div>
        );

      case "recovery-phrase":
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Backup Your Recovery Phrase
            </h2>
            <p className="text-gray-600 mb-8">
              Write down these 12 words in order. You'll need them to recover your identity.
            </p>
            
            <div className="grid grid-cols-3 gap-3 mb-8 p-6 bg-gray-50 rounded-lg">
              {state.recoveryPhrase.map((word, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <span className="text-gray-500 text-sm">{index + 1}.</span>
                  <span className="font-mono font-medium text-gray-900">{word}</span>
                </div>
              ))}
            </div>

            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ Never share your recovery phrase with anyone!
              </p>
            </div>

            <button
              onClick={handleBackupConfirmation}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
            >
              I've Backed It Up
            </button>
          </div>
        );

      case "credentials-setup":
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Setup Complete!
            </h2>
            <p className="text-gray-600 mb-8">
              Your decentralized identity has been created and anchored on PersonaChain
            </p>
            
            {state.didKeyPair && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800 font-mono">
                  DID: {state.didKeyPair.did.slice(0, 20)}...{state.didKeyPair.did.slice(-10)}
                </p>
              </div>
            )}

            <button
              onClick={handleComplete}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <motion.div
        className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {["welcome", "keplr-connect", "did-creation", "recovery-phrase", "credentials-setup"].map((s, index) => (
              <div
                key={s}
                className={`w-3 h-3 rounded-full ${
                  ["welcome", "keplr-connect", "did-creation", "recovery-phrase", "credentials-setup"].indexOf(state.step) >= index
                    ? 'bg-blue-600' 
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step content */}
        {renderStep()}
      </motion.div>
    </div>
  );
};