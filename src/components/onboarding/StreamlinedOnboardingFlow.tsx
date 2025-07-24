/**
 * Streamlined Onboarding Flow - 3 Steps Maximum
 * Sprint 1.2: Instant Credential Creation
 * Features: Auto-save, instant feedback, progress tracking
 */

import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { personaChainService, PersonaWallet } from "../../services/personaChainService";
import { didService, DIDKeyPair } from "../../services/didService";
import { DID } from "../../types/wallet";
import { storageService } from "../../services/storageService";
import { cryptoService } from "../../services/cryptoService";
import { retryService } from "../../services/retryService";
import { errorService, ErrorCategory, ErrorSeverity } from "../../services/errorService";
const EliteWeb3Button = lazy(() => import("../ui/EliteWeb3Button").then(m => ({ default: m.EliteWeb3Button })));

// Sprint 1.4: Analytics Integration
import { analyticsService } from "../../services/analyticsService";
import { abTestService } from "../../services/abTestService";
import { errorService } from "@/services/errorService";

type StreamlinedStep = "connect" | "identity" | "complete";

interface OnboardingProgress {
  step: StreamlinedStep;
  completion: number; // 0-100
  subProgress: number; // 0-100 for current step
  isLoading: boolean;
  error: string | null;
  autoSaved: boolean;
}

interface OnboardingData {
  wallet: PersonaWallet | null;
  didKeyPair: DIDKeyPair | null;
  recoveryPhrase: string[];
  txHash: string | null;
}

const STEP_WEIGHTS = {
  connect: 30,    // 30% of total progress
  identity: 60,   // 60% of total progress  
  complete: 10    // 10% of total progress
};

export const StreamlinedOnboardingFlow = () => {
  const navigate = useNavigate();
  
  // Sprint 1.4: Analytics & A/B Testing
  const [userId] = useState(() => localStorage.getItem('persona_user_id') || 'anonymous');
  const [onboardingStartTime] = useState(() => Date.now());
  const [stepStartTime, setStepStartTime] = useState(Date.now());
  const [abTestVariant] = useState(() => abTestService.getUserVariant(userId, 'onboarding_optimization') || 'control');
  
  // Separate state management for better performance
  const [progress, setProgress] = useState<OnboardingProgress>({
    step: "connect",
    completion: 0,
    subProgress: 0,
    isLoading: false,
    error: null,
    autoSaved: false
  });

  const [data, setData] = useState<OnboardingData>({
    wallet: null,
    didKeyPair: null,
    recoveryPhrase: [],
    txHash: null
  });

  // Auto-save mechanism
  const autoSave = useCallback(async (currentData: OnboardingData, currentProgress: OnboardingProgress) => {
    try {
      const saveData = {
        timestamp: Date.now(),
        step: currentProgress.step,
        completion: currentProgress.completion,
        wallet: currentData.wallet,
        didKeyPair: currentData.didKeyPair ? {
          did: currentData.didKeyPair.did,
          publicKey: currentData.didKeyPair.publicKey
          // Don't save private key for security
        } : null,
        recoveryPhrase: currentData.recoveryPhrase,
        txHash: currentData.txHash
      };

      await storageService.setItem('onboarding_progress', JSON.stringify(saveData));
      
      setProgress(prev => ({ ...prev, autoSaved: true }));
      
      // Clear auto-save indicator after 2 seconds
      setTimeout(() => {
        setProgress(prev => ({ ...prev, autoSaved: false }));
      }, 2000);

      console.log('[LOADING] Auto-saved onboarding progress');
    } catch (error) {
      console.warn('[WARNING] Auto-save failed:', error);
    }
  }, []);

  // Load saved progress on mount & initialize analytics
  useEffect(() => {
    const loadSavedProgress = async () => {
      try {
        // Check if wallet is already connected before starting onboarding
        const connectionStatus = await personaChainService.isWalletConnected();
        if (connectionStatus.connected && connectionStatus.wallet) {
          // User already has wallet connected - check for existing DID
          const existingDID = await personaChainService.checkExistingDID(connectionStatus.wallet.address);
          
          if (existingDID) {
            // User is fully set up - redirect to dashboard
            const walletWithDID = { ...connectionStatus.wallet, did: existingDID };
            
            localStorage.setItem('persona_wallet', JSON.stringify(walletWithDID));
            localStorage.setItem('isAuthenticated', 'true');
            localStorage.setItem('user_did', existingDID);
            localStorage.setItem('wallet_address', connectionStatus.wallet.address);
            
            console.log('[SUCCESS] User already authenticated, redirecting to dashboard');
            navigate('/dashboard');
            return;
          } else {
            // Wallet connected but no DID - set up wallet and proceed to identity creation
            setData(prev => ({ ...prev, wallet: connectionStatus.wallet }));
            updateProgress("identity", 0);
            return;
          }
        }

        // Track onboarding start
        await analyticsService.trackEvent(
          'user_action',
          'onboarding',
          'start',
          userId,
          {
            abTestVariant,
            timestamp: onboardingStartTime,
            userAgent: navigator.userAgent,
            referrer: document.referrer,
          }
        );

        // Track A/B test conversion start
        abTestService.trackConversion(
          userId,
          'onboarding_optimization',
          'onboarding_start',
          1
        );

        const saved = await storageService.getItem('onboarding_progress');
        if (saved) {
          const savedData = JSON.parse(saved);
          
          // Only restore if saved within last 24 hours
          if (Date.now() - savedData.timestamp < 24 * 60 * 60 * 1000) {
            setProgress(prev => ({
              ...prev,
              step: savedData.step,
              completion: savedData.completion
            }));

            setData(prev => ({
              ...prev,
              wallet: savedData.wallet,
              didKeyPair: savedData.didKeyPair,
              recoveryPhrase: savedData.recoveryPhrase || [],
              txHash: savedData.txHash
            }));

            // Track resume from saved progress
            await analyticsService.trackEvent(
              'user_action',
              'onboarding',
              'resume',
              userId,
              {
                savedStep: savedData.step,
                timeElapsed: Date.now() - savedData.timestamp,
                abTestVariant,
              }
            );

            console.log('📂 Restored onboarding progress from', savedData.step);
          }
        }
      } catch (error) {
        console.warn('[WARNING] Failed to load saved progress:', error);
        
        // Track error
        analyticsService.trackEvent(
          'error',
          'onboarding',
          'load_failed',
          userId,
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            abTestVariant,
          }
        );
      }
    };

    loadSavedProgress();
  }, [userId, abTestVariant, onboardingStartTime, navigate]);

  // Auto-save whenever data changes
  useEffect(() => {
    if (data.wallet || data.didKeyPair) {
      autoSave(data, progress);
    }
  }, [data, progress, autoSave]);

  // Update progress calculation with analytics
  const updateProgress = async (step: StreamlinedStep, subProgress: number = 0) => {
    const stepOrder: StreamlinedStep[] = ["connect", "identity", "complete"];
    const currentStepIndex = stepOrder.indexOf(step);
    
    let totalProgress = 0;
    for (let i = 0; i < currentStepIndex; i++) {
      totalProgress += STEP_WEIGHTS[stepOrder[i]];
    }
    
    // Add current step progress
    totalProgress += (STEP_WEIGHTS[step] * subProgress) / 100;
    
    // Track step changes
    const currentStep = progress.step;
    if (currentStep !== step) {
      const stepTime = Date.now() - stepStartTime;
      
      // Track step completion
      if (currentStep) {
        await analyticsService.trackEvent(
          'user_action',
          'onboarding_step',
          'complete',
          userId,
          {
            step: currentStep,
            timeSpent: stepTime,
            totalProgress: progress.completion,
            abTestVariant,
          }
        );

        // Track A/B test step completion
        abTestService.trackConversion(
          userId,
          'onboarding_optimization',
          `step_${currentStep}_complete`,
          1
        );
      }

      // Track new step start
      await analyticsService.trackEvent(
        'user_action',
        'onboarding_step',
        'start',
        userId,
        {
          step,
          fromStep: currentStep,
          abTestVariant,
        }
      );

      setStepStartTime(Date.now());
    }
    
    setProgress(prev => ({
      ...prev,
      step,
      completion: Math.min(100, totalProgress),
      subProgress
    }));
  };

  // Step 1: Connect (Instant connection + existing DID check)
  const handleConnect = async () => {
    setProgress(prev => ({ ...prev, isLoading: true, error: null }));
    updateProgress("connect", 10);

    const connectOperation = async () => {
      updateProgress("connect", 30);
      
      // Check Keplr availability
      if (!window.keplr) {
        throw new Error("Keplr wallet not found. Please install Keplr extension.");
      }

      updateProgress("connect", 50);
      
      // Connect to Keplr
      const wallet = await personaChainService.connectKeplr();
      if (!wallet) {
        throw new Error("Failed to connect to Keplr wallet");
      }

      updateProgress("connect", 70);

      // Check for existing DID (instant skip if found)
      const existingDID = await personaChainService.checkExistingDID(wallet.address);
      
      updateProgress("connect", 90);

      setData(prev => ({ ...prev, wallet }));

      if (existingDID) {
        // Show existing user message
        setProgress(prev => ({ 
          ...prev, 
          error: `Welcome back! This wallet is already registered with Persona.` 
        }));
        
        // Instant complete - user already has identity
        const walletWithDID = { ...wallet, did: existingDID };
        
        // Store authentication state
        localStorage.setItem('persona_wallet', JSON.stringify(walletWithDID));
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('user_did', existingDID);
        localStorage.setItem('wallet_address', wallet.address);

        updateProgress("complete", 100);
        
        // Clear onboarding progress since we're done
        await storageService.removeItem('onboarding_progress');
        
        // Navigate immediately
        setTimeout(() => navigate('/dashboard'), 3000);
        
        return { existingUser: true, wallet: walletWithDID };
      }

      updateProgress("connect", 100);
      
      return { existingUser: false, wallet };
    };

    try {
      const result = await retryService.retryOAuthOperation(connectOperation, 'keplr-connect', {
        maxAttempts: 2,
        onRetry: (attempt, error) => {
          setProgress(prev => ({ 
            ...prev, 
            error: `Connection attempt ${attempt}... ${error.message}` 
          }));
        }
      });

      if (result.success && result.result) {
        const { existingUser } = result.result;
        
        if (!existingUser) {
          // New user - proceed to identity creation
          setTimeout(() => {
            updateProgress("identity", 0);
            setProgress(prev => ({ ...prev, isLoading: false }));
          }, 500);
        } else {
          // Existing user - we're done
          setProgress(prev => ({ ...prev, isLoading: false }));
        }
      } else {
        throw result.error || new Error('Connection failed');
      }

    } catch (error) {
      errorService.logError('[ERROR] Connection failed:', error);
      
      const personalError = errorService.createError(
        'ONBOARDING_CONNECTION_FAILED',
        'Failed to connect wallet during onboarding',
        ErrorCategory.AUTHENTICATION,
        ErrorSeverity.HIGH,
        errorService.createContext({
          component: 'streamlined-onboarding',
          action: 'connect'
        }),
        {
          originalError: error instanceof Error ? error : undefined,
          userMessage: error instanceof Error ? error.message : 'Connection failed. Please try again.',
          retryable: true,
          recoveryActions: ['retry_connection', 'install_keplr', 'check_browser']
        }
      );

      errorService.reportError(personalError);
      
      setProgress(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: personalError.userMessage 
      }));
    }
  };

  // Step 2: Identity (Parallel processing for speed)
  const handleCreateIdentity = async () => {
    if (!data.wallet) {
      setProgress(prev => ({ ...prev, error: "Wallet not connected" }));
      return;
    }

    setProgress(prev => ({ ...prev, isLoading: true, error: null }));
    updateProgress("identity", 10);

    const identityOperation = async () => {
      // Start parallel operations for speed
      const operations = {
        didGeneration: didService.generateDID(),
        mnemonicGeneration: cryptoService.generateMnemonic()
      };

      updateProgress("identity", 25);

      // Wait for both to complete
      const [didCreationResult, mnemonic] = await Promise.all([
        operations.didGeneration,
        operations.mnemonicGeneration
      ]);

      const recoveryPhrase = mnemonic.split(' ');

      updateProgress("identity", 50);

      // Extract the key pair from the creation result
      const didKeyPair = {
        did: didCreationResult.did,
        privateKey: didCreationResult.privateKey,
        publicKey: didCreationResult.publicKey,
        document: didCreationResult.document
      };

      updateProgress("identity", 70);

      // Anchor on blockchain  
      const walletWithDID = { ...data.wallet!, did: didKeyPair.did };
      const txHash = await personaChainService.createDIDOnChain(walletWithDID);

      updateProgress("identity", 90);

      // Create proper DID object for storage
      const didForStorage = {
        id: didKeyPair.did!,
        method: "key" as const,
        identifier: didKeyPair.did!.split(':').pop()!,
        controller: data.wallet!.address,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        publicKeys: [{
          id: `${didKeyPair.did}#key-1`,
          type: "Ed25519VerificationKey2020",
          controller: didKeyPair.did!,
          publicKeyBase58: btoa(String.fromCharCode(...Array.from(didKeyPair.publicKey!))),
        }],
        authentication: [`${didKeyPair.did}#key-1`],
        keyAgreement: [`${didKeyPair.did}#key-1`],
        capabilityInvocation: [`${didKeyPair.did}#key-1`],
        privateKey: didKeyPair.privateKey!,
        publicKey: didKeyPair.publicKey!,
        document: didKeyPair.document,
        keyType: "Ed25519",
        purposes: ["authentication", "keyAgreement", "capabilityInvocation"],
      };

      // Store securely in parallel
      await Promise.all([
        storageService.storeDID(didForStorage),
        storageService.setCurrentDID(didKeyPair.did!),
        storageService.setItem('recovery_phrase_backed_up', 'true') // Auto-backup for streamlined flow
      ]);

      updateProgress("identity", 100);

      return { didKeyPair, recoveryPhrase, txHash };
    };

    try {
      const result = await retryService.retryCredentialCreation(identityOperation, 'did-creation', {
        onRetry: (attempt, error) => {
          setProgress(prev => ({ 
            ...prev, 
            error: `Creating identity (attempt ${attempt})... ${error.message}` 
          }));
        }
      });

      if (result.success && result.result) {
        const { didKeyPair, recoveryPhrase, txHash } = result.result;
        
        setData(prev => ({ 
          ...prev, 
          didKeyPair, 
          recoveryPhrase, 
          txHash 
        }));

        // Auto-proceed to completion
        setTimeout(() => {
          updateProgress("complete", 50);
          handleComplete(didKeyPair, txHash);
        }, 1000);

      } else {
        throw result.error || new Error('Identity creation failed');
      }

    } catch (error) {
      errorService.logError('[ERROR] Identity creation failed:', error);
      
      const personalError = errorService.createError(
        'ONBOARDING_IDENTITY_FAILED',
        'Failed to create identity during onboarding',
        ErrorCategory.BLOCKCHAIN,
        ErrorSeverity.HIGH,
        errorService.createContext({
          component: 'streamlined-onboarding',
          action: 'create-identity'
        }),
        {
          originalError: error instanceof Error ? error : undefined,
          userMessage: 'Failed to create your digital identity. Please try again.',
          retryable: true,
          recoveryActions: ['retry_creation', 'check_network', 'contact_support']
        }
      );

      errorService.reportError(personalError);
      
      setProgress(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: personalError.userMessage 
      }));
    }
  };

  // Step 3: Complete (Finalize and navigate)
  const handleComplete = async (didKeyPair?: DIDKeyPair, txHash?: string) => {
    const finalDidKeyPair = didKeyPair || data.didKeyPair;
    const finalTxHash = txHash || data.txHash;

    if (!data.wallet || !finalDidKeyPair) {
      setProgress(prev => ({ ...prev, error: "Missing required data for completion" }));
      return;
    }

    updateProgress("complete", 75);

    try {
      // Store final authentication state
      const walletWithDID = { ...data.wallet, did: finalDidKeyPair.did };
      
      await Promise.all([
        storageService.setItem('wallet_address', data.wallet.address),
        storageService.setItem('onboarding_completed', 'true'),
        new Promise(resolve => {
          localStorage.setItem('persona_wallet', JSON.stringify(walletWithDID));
          localStorage.setItem('isAuthenticated', 'true');
          localStorage.setItem('user_did', finalDidKeyPair.did);
          localStorage.setItem('wallet_address', data.wallet!.address);
          resolve(true);
        })
      ]);

      updateProgress("complete", 100);

      // Clear onboarding progress
      await storageService.removeItem('onboarding_progress');

      console.log('[SUCCESS] Onboarding completed successfully');

      // Navigate to dashboard immediately
      console.log('[NAVIGATION] Redirecting to dashboard...');
      navigate('/dashboard');

    } catch (error) {
      errorService.logError('[ERROR] Completion failed:', error);
      setProgress(prev => ({ 
        ...prev, 
        error: 'Failed to complete setup. Please try again.' 
      }));
    }
  };

  // Render progress bar
  const renderProgressBar = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-300">
          {progress.step === "connect" && "Connecting..."}
          {progress.step === "identity" && "Creating Identity..."}
          {progress.step === "complete" && "Completing Setup..."}
        </span>
        <div className="flex items-center space-x-2">
          {progress.autoSaved && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="text-xs text-emerald-400 font-medium"
            >
              ✓ Saved
            </motion.span>
          )}
          <span className="text-sm font-bold text-white">
            {Math.round(progress.completion)}%
          </span>
        </div>
      </div>
      
      <div className="w-full bg-slate-700/50 rounded-full h-3 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 rounded-full shadow-lg shadow-blue-500/25"
          initial={{ width: 0 }}
          animate={{ width: `${progress.completion}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      
      {/* Sub-progress for current step */}
      {progress.isLoading && (
        <div className="mt-2 w-full bg-slate-600/30 rounded-full h-1">
          <motion.div
            className="h-full bg-cyan-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress.subProgress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}
    </div>
  );

  // Render steps
  const renderStep = () => {
    switch (progress.step) {
      case "connect":
        return (
          <motion.div
            key="connect"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center"
          >
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/25">
              <span className="text-2xl">[LINK]</span>
            </div>
            
            <h1 className="text-3xl font-bold text-white mb-4">
              Start Your Journey
            </h1>
            <p className="text-lg text-slate-300 mb-8">
              Connect your Keplr wallet to access your decentralized identity or create a new one
            </p>

            {progress.error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mb-6 p-4 rounded-lg backdrop-blur-sm ${
                  progress.error.includes("Welcome back") 
                    ? "bg-emerald-500/10 border border-emerald-500/30" 
                    : "bg-red-500/10 border border-red-500/30"
                }`}
              >
                <p className={`text-sm ${
                  progress.error.includes("Welcome back") 
                    ? "text-emerald-300" 
                    : "text-red-300"
                }`}>
                  {progress.error}
                </p>
                {progress.error.includes("not found") && (
                  <a
                    href="https://www.keplr.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 underline mt-2 block text-sm"
                  >
                    Install Keplr Wallet →
                  </a>
                )}
                {progress.error.includes("Welcome back") && (
                  <Suspense fallback={<div className="animate-pulse bg-slate-700 h-10 rounded mt-3"></div>}>
                    <EliteWeb3Button
                      variant="connect"
                      size="md"
                      fullWidth
                      onClick={() => navigate('/login')}
                      className="mt-3"
                    >
                      Go to Sign In Page
                    </EliteWeb3Button>
                  </Suspense>
                )}
              </motion.div>
            )}

            <Suspense fallback={<div className="animate-pulse bg-slate-700 h-14 rounded mb-4"></div>}>
              <EliteWeb3Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleConnect}
                disabled={progress.isLoading}
                isLoading={progress.isLoading}
                icon={<span className="text-xl">[LINK]</span>}
                className="mb-4"
              >
                {progress.isLoading ? "Connecting..." : "Start Your Journey"}
              </EliteWeb3Button>
            </Suspense>

            {/* Login Button for Existing Users */}
            <div className="flex items-center my-6">
              <div className="flex-1 h-px bg-slate-700"></div>
              <span className="mx-4 text-sm text-slate-400">Already have an identity?</span>
              <div className="flex-1 h-px bg-slate-700"></div>
            </div>

            <Suspense fallback={<div className="animate-pulse bg-slate-700 h-14 rounded"></div>}>
              <EliteWeb3Button
                variant="secondary"
                size="lg"
                fullWidth
                onClick={() => navigate('/login')}
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>}
              >
                Sign In
              </EliteWeb3Button>
            </Suspense>
          </motion.div>
        );

      case "identity":
        return (
          <motion.div
            key="identity"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center"
          >
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-violet-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-500/25">
              <span className="text-2xl">🆔</span>
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-4">
              Creating Your Identity
            </h2>
            <p className="text-lg text-slate-300 mb-8">
              Generating your unique DID and anchoring it securely on the blockchain
            </p>

            {data.wallet && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg backdrop-blur-sm"
              >
                <p className="text-sm text-emerald-300">
                  ✓ Connected: {data.wallet.address.slice(0, 10)}...{data.wallet.address.slice(-8)}
                </p>
              </motion.div>
            )}

            {progress.error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg backdrop-blur-sm"
              >
                <p className="text-red-300 text-sm">{progress.error}</p>
              </motion.div>
            )}

            {!progress.isLoading && !progress.error && (
              <Suspense fallback={<div className="animate-pulse bg-purple-500 h-14 rounded"></div>}>
                <EliteWeb3Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={handleCreateIdentity}
                  icon={<span className="text-xl">🆔</span>}
                  className="bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 shadow-purple-500/25 hover:shadow-purple-500/40"
                >
                  Create My Identity
                </EliteWeb3Button>
              </Suspense>
            )}

            {progress.isLoading && (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-700 border-t-purple-400"></div>
                <span className="text-purple-400 font-medium">Creating...</span>
              </div>
            )}
          </motion.div>
        );

      case "complete":
        return (
          <motion.div
            key="complete"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/25"
            >
              <span className="text-3xl">[SUCCESS]</span>
            </motion.div>
            
            <h2 className="text-3xl font-bold text-white mb-4">
              Welcome to Persona!
            </h2>
            <p className="text-lg text-slate-300 mb-8">
              Your decentralized identity is ready. You can now create and manage verifiable credentials.
            </p>

            {data.didKeyPair && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-8 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg backdrop-blur-sm"
              >
                <p className="text-xs text-slate-400 mb-1">Your DID:</p>
                <p className="text-sm text-emerald-300 font-mono break-all">
                  {data.didKeyPair.did}
                </p>
                {data.txHash && (
                  <p className="text-xs text-emerald-400 mt-2">
                    ✓ Anchored on blockchain: {data.txHash.slice(0, 10)}...
                  </p>
                )}
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col items-center space-y-4"
            >
              <Suspense fallback={<div className="animate-pulse bg-emerald-500 h-14 rounded"></div>}>
                <EliteWeb3Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={() => {
                    console.log('[MANUAL] User clicked Go to Dashboard');
                    navigate('/dashboard');
                  }}
                  icon={<span className="text-xl">🚀</span>}
                  className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600"
                >
                  Go to Dashboard
                </EliteWeb3Button>
              </Suspense>
              <div className="text-xs text-slate-500">Auto-redirecting in a few seconds...</div>
            </motion.div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-2 sm:p-4">
      <motion.div
        className="max-w-lg w-full bg-slate-900/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-700/50 p-4 sm:p-6 md:p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {renderProgressBar()}
        
        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>

        {/* Recovery phrase display for new users */}
        {data.recoveryPhrase.length > 0 && progress.step === "complete" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg backdrop-blur-sm"
          >
            <p className="text-sm font-medium text-yellow-300 mb-2">
              [LOCK] Your Recovery Phrase (Auto-saved)
            </p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {data.recoveryPhrase.slice(0, 6).map((word, index) => (
                <span key={index} className="font-mono text-yellow-400">
                  {index + 1}. {word}
                </span>
              ))}
            </div>
            <p className="text-xs text-yellow-400 mt-2">
              Full phrase saved securely. Access in Settings → Security.
            </p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};