import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { userAuthService } from "../services/userAuthService";
import { keplrService } from "../services/keplrService";
import type {
  AuthenticationResult,
  OnboardingData,
} from "../services/userAuthService";

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
  authResult: AuthenticationResult | null;
  onboardingData: OnboardingData | null;
  recoveryPhraseShown: boolean;
  recoveryPhraseConfirmed: boolean;
}

export default function OnboardingFlow() {
  const [state, setState] = useState<OnboardingState>({
    step: "welcome",
    authResult: null,
    onboardingData: null,
    recoveryPhraseShown: false,
    recoveryPhraseConfirmed: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeService();
  }, []);

  const initializeService = async () => {
    try {
      await userAuthService.initialize();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to initialize");
    }
  };

  const handleKeplrConnect = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await userAuthService.authenticateWithKeplr();

      if (result.success) {
        setState((prev) => ({ ...prev, authResult: result }));

        if (result.isNewUser) {
          setState((prev) => ({ ...prev, step: "did-creation" }));
        } else {
          setState((prev) => ({ ...prev, step: "complete" }));
        }
      } else {
        setError(result.error || "Authentication failed");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Connection failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDIDCreation = async () => {
    setIsLoading(true);

    try {
      // DID creation is handled during authentication
      setState((prev) => ({ ...prev, step: "recovery-phrase" }));
    } catch (error) {
      setError(error instanceof Error ? error.message : "DID creation failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoveryPhraseShown = () => {
    setState((prev) => ({ ...prev, recoveryPhraseShown: true }));
  };

  const handleRecoveryPhraseConfirmed = async () => {
    setIsLoading(true);

    try {
      await userAuthService.markRecoveryPhraseBackedUp();
      setState((prev) => ({
        ...prev,
        recoveryPhraseConfirmed: true,
        step: "credentials-setup",
      }));
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Backup confirmation failed",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCredentialsSetup = () => {
    setState((prev) => ({ ...prev, step: "complete" }));
  };

  const renderWelcome = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto text-center"
    >
      <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center mx-auto mb-8">
        <svg
          className="w-10 h-10 text-primary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      </div>

      <h1 className="text-heading-1 text-primary mb-6">
        Create Your Digital Identity
      </h1>

      <p className="text-xl text-secondary mb-8 leading-relaxed">
        Welcome to Persona - your gateway to decentralized identity. Create a
        secure, privacy-preserving digital identity that you fully control.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="card p-6">
          <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h3 className="text-heading-4 text-primary mb-2">Self-Sovereign</h3>
          <p className="text-secondary">
            You own and control your identity data
          </p>
        </div>

        <div className="card p-6">
          <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.11 8.11m1.768 1.768l4.242 4.242M8.11 8.11l5.657-5.657m0 0L16.5 5.19m-2.733-2.733L16.5 5.19m-2.733-2.733L11.034 4.2M19.5 7.5l-7.5 7.5"
              />
            </svg>
          </div>
          <h3 className="text-heading-4 text-primary mb-2">Privacy First</h3>
          <p className="text-secondary">
            Zero-knowledge proofs protect your data
          </p>
        </div>

        <div className="card p-6">
          <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s1.343-9 3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
              />
            </svg>
          </div>
          <h3 className="text-heading-4 text-primary mb-2">Interoperable</h3>
          <p className="text-secondary">
            Works across all platforms and services
          </p>
        </div>
      </div>

      <button
        onClick={() => setState((prev) => ({ ...prev, step: "keplr-connect" }))}
        className="btn-primary btn-lg px-8 py-4 text-lg font-semibold"
      >
        Get Started
        <svg
          className="ml-2 w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
    </motion.div>
  );

  const renderKeplrConnect = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto text-center"
    >
      <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center mx-auto mb-8">
        <svg
          className="w-10 h-10 text-primary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      </div>

      <h1 className="text-heading-1 text-primary mb-6">Connect Your Wallet</h1>

      <p className="text-xl text-secondary mb-8 leading-relaxed">
        Connect your Keplr wallet to create your decentralized identity. This
        will be used to sign transactions and prove ownership of your DID.
      </p>

      {!keplrService.isKeplrInstalled() && (
        <div className="card p-6 mb-8 border-accent">
          <h3 className="text-heading-4 text-primary mb-4">
            Install Keplr Wallet
          </h3>
          <p className="text-secondary mb-4">
            You need to install the Keplr wallet extension to continue.
          </p>
          <a
            href="https://chrome.google.com/webstore/detail/keplr/dmkamcknogkgcdfhhbddcghachkejeap"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            Install Keplr
          </a>
        </div>
      )}

      <button
        onClick={handleKeplrConnect}
        disabled={isLoading || !keplrService.isKeplrInstalled()}
        className="btn-primary btn-lg px-8 py-4 text-lg font-semibold disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent mr-2"></div>
            Connecting...
          </>
        ) : (
          <>
            Connect Keplr Wallet
            <svg
              className="ml-2 w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </>
        )}
      </button>
    </motion.div>
  );

  const renderDIDCreation = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto text-center"
    >
      <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center mx-auto mb-8">
        <svg
          className="w-10 h-10 text-primary"
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
      </div>

      <h1 className="text-heading-1 text-primary mb-6">Creating Your DID</h1>

      <p className="text-xl text-secondary mb-8 leading-relaxed">
        Your Decentralized Identifier (DID) is being created. This unique
        identifier will represent your digital identity across all platforms.
      </p>

      {state.authResult?.didKeyPair && (
        <div className="card p-6 mb-8 text-left">
          <h3 className="text-heading-4 text-primary mb-4">Your DID</h3>
          <div className="bg-surface p-4 rounded-lg font-mono text-sm break-all">
            {state.authResult.didKeyPair.did}
          </div>
        </div>
      )}

      <button
        onClick={handleDIDCreation}
        disabled={isLoading}
        className="btn-primary btn-lg px-8 py-4 text-lg font-semibold disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent mr-2"></div>
            Creating...
          </>
        ) : (
          <>
            Continue
            <svg
              className="ml-2 w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </>
        )}
      </button>
    </motion.div>
  );

  const renderRecoveryPhrase = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto text-center"
    >
      <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center mx-auto mb-8">
        <svg
          className="w-10 h-10 text-primary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
          />
        </svg>
      </div>

      <h1 className="text-heading-1 text-primary mb-6">
        Secure Your Recovery Phrase
      </h1>

      <p className="text-xl text-secondary mb-8 leading-relaxed">
        Your recovery phrase is the master key to your identity. Store it
        securely - it's the only way to recover your account if you lose access.
      </p>

      <div className="card p-6 mb-8 border-accent">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-heading-4 text-primary">Recovery Phrase</h3>
          <button
            onClick={handleRecoveryPhraseShown}
            className="btn-secondary btn-sm"
          >
            {state.recoveryPhraseShown ? "Hide" : "Show"}
          </button>
        </div>

        {state.recoveryPhraseShown && state.authResult?.recoveryPhrase && (
          <div className="bg-surface p-4 rounded-lg font-mono text-sm text-center">
            {state.authResult.recoveryPhrase.phrase}
          </div>
        )}
      </div>

      <div className="text-left mb-8">
        <h3 className="text-heading-4 text-primary mb-4">Security Tips</h3>
        <ul className="space-y-3 text-secondary">
          <li className="flex items-start">
            <svg
              className="w-5 h-5 text-accent mr-3 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            Write it down on paper and store in a secure location
          </li>
          <li className="flex items-start">
            <svg
              className="w-5 h-5 text-accent mr-3 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            Never share it with anyone or store it digitally
          </li>
          <li className="flex items-start">
            <svg
              className="w-5 h-5 text-accent mr-3 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            Consider making multiple copies in different locations
          </li>
        </ul>
      </div>

      <button
        onClick={handleRecoveryPhraseConfirmed}
        disabled={!state.recoveryPhraseShown || isLoading}
        className="btn-primary btn-lg px-8 py-4 text-lg font-semibold disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent mr-2"></div>
            Confirming...
          </>
        ) : (
          <>
            I've Secured My Recovery Phrase
            <svg
              className="ml-2 w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </>
        )}
      </button>
    </motion.div>
  );

  const renderCredentialsSetup = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto text-center"
    >
      <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center mx-auto mb-8">
        <svg
          className="w-10 h-10 text-primary"
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
      </div>

      <h1 className="text-heading-1 text-primary mb-6">
        Connect Your Credentials
      </h1>

      <p className="text-xl text-secondary mb-8 leading-relaxed">
        Connect your external accounts to create verifiable credentials. You can
        skip this step and add them later.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-primary"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
            </svg>
          </div>
          <h3 className="text-heading-4 text-primary mb-2">GitHub</h3>
          <p className="text-secondary mb-4">Developer credentials</p>
          <button className="btn-secondary btn-sm">Connect</button>
        </div>

        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-primary"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </div>
          <h3 className="text-heading-4 text-primary mb-2">LinkedIn</h3>
          <p className="text-secondary mb-4">Professional profile</p>
          <button className="btn-secondary btn-sm">Connect</button>
        </div>

        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-primary"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 0L1.608 6v12L12 24l10.392-6V6L12 0zm-1.073 10.5H7.5v3h3.427v-3zm7.073 0h-3.427v3H18V10.5z" />
            </svg>
          </div>
          <h3 className="text-heading-4 text-primary mb-2">Plaid</h3>
          <p className="text-secondary mb-4">Financial verification</p>
          <button className="btn-secondary btn-sm">Connect</button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={handleCredentialsSetup}
          className="btn-secondary btn-lg px-8 py-4 text-lg font-semibold"
        >
          Skip for Now
        </button>
        <button
          onClick={handleCredentialsSetup}
          className="btn-primary btn-lg px-8 py-4 text-lg font-semibold"
        >
          Continue
          <svg
            className="ml-2 w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    </motion.div>
  );

  const renderComplete = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto text-center"
    >
      <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center mx-auto mb-8">
        <svg
          className="w-10 h-10 text-primary"
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
      </div>

      <h1 className="text-heading-1 text-primary mb-6">
        {state.authResult?.isNewUser ? "Welcome to Persona!" : "Welcome Back!"}
      </h1>

      <p className="text-xl text-secondary mb-8 leading-relaxed">
        {state.authResult?.isNewUser
          ? "Your decentralized identity has been created successfully. You can now use it across all platforms."
          : "Your identity has been loaded successfully. All your credentials and data are ready to use."}
      </p>

      {state.authResult?.profile && (
        <div className="card p-6 mb-8 text-left">
          <h3 className="text-heading-4 text-primary mb-4">Your Profile</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-secondary">DID:</span>
              <span className="text-primary font-mono text-sm">
                {state.authResult.profile.did.slice(0, 20)}...
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Keplr Account:</span>
              <span className="text-primary">
                {state.authResult.profile.keplrName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Credentials:</span>
              <span className="text-primary">
                {state.authResult.profile.verifiedCredentials.length}
              </span>
            </div>
          </div>
        </div>
      )}

      <a
        href="/credentials"
        className="btn-primary btn-lg px-8 py-4 text-lg font-semibold"
      >
        Go to Dashboard
        <svg
          className="ml-2 w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </a>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-primary py-12">
      <div className="container">
        {/* Progress Bar */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              {[
                "welcome",
                "keplr-connect",
                "did-creation",
                "recovery-phrase",
                "credentials-setup",
                "complete",
              ].map((step, index) => (
                <div
                  key={step}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    state.step === step
                      ? "bg-accent text-primary"
                      : index <
                          [
                            "welcome",
                            "keplr-connect",
                            "did-creation",
                            "recovery-phrase",
                            "credentials-setup",
                            "complete",
                          ].indexOf(state.step)
                        ? "bg-accent text-primary"
                        : "bg-surface text-secondary"
                  }`}
                >
                  {index + 1}
                </div>
              ))}
            </div>
          </div>
          <div className="w-full bg-surface rounded-full h-2">
            <div
              className="bg-accent h-2 rounded-full transition-all duration-300"
              style={{
                width: `${((["welcome", "keplr-connect", "did-creation", "recovery-phrase", "credentials-setup", "complete"].indexOf(state.step) + 1) / 6) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="max-w-2xl mx-auto mb-8">
            <div className="card p-6 border-red-500 bg-red-500/10">
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 text-red-500 mr-3 flex-shrink-0"
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
                <span className="text-red-500">{error}</span>
              </div>
            </div>
          </div>
        )}

        {/* Step Content */}
        {state.step === "welcome" && renderWelcome()}
        {state.step === "keplr-connect" && renderKeplrConnect()}
        {state.step === "did-creation" && renderDIDCreation()}
        {state.step === "recovery-phrase" && renderRecoveryPhrase()}
        {state.step === "credentials-setup" && renderCredentialsSetup()}
        {state.step === "complete" && renderComplete()}
      </div>
    </div>
  );
}
