/**
 * Complete Professional Onboarding Flow
 * Production-ready user onboarding with wallet connection, DID creation, and backup
 */

import React, { useState, useEffect } from 'react';
import { WalletConnection } from './WalletConnection';
import { SecretPhraseBackup } from './SecretPhraseBackup';
import { TermsAndConditions } from './TermsAndConditions';
import { DIDCreation } from './DIDCreation';
import { OnboardingComplete } from './OnboardingComplete';
import { personaChainService } from '../../services/personaChainService';
import { DIDService } from '../../services/didService';
import { logger } from '../../services/monitoringService';

interface OnboardingState {
  step: 'welcome' | 'wallet' | 'terms' | 'did' | 'backup' | 'complete';
  wallet: any;
  didKeyPair: any;
  secretPhrase: string;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  isLoading: boolean;
  error: string | null;
}

export const OnboardingFlow: React.FC = () => {
  const [state, setState] = useState<OnboardingState>({
    step: 'welcome',
    wallet: null,
    didKeyPair: null,
    secretPhrase: '',
    termsAccepted: false,
    privacyAccepted: false,
    isLoading: false,
    error: null,
  });

  const [blockchainHealth, setBlockchainHealth] = useState<boolean>(false);

  useEffect(() => {
    checkBlockchainHealth();
  }, []);

  const checkBlockchainHealth = async () => {
    try {
      const healthy = await personaChainService.checkBlockchainHealth();
      setBlockchainHealth(healthy);
      logger.info('Blockchain health check', { healthy });
    } catch (error) {
      logger.error('Blockchain health check failed', { error });
      setBlockchainHealth(false);
    }
  };

  const handleWalletConnection = async (wallet: any) => {
    setState(prev => ({ ...prev, wallet, step: 'terms' }));
    logger.info('Wallet connected', { address: wallet.address });
  };

  const handleTermsAcceptance = (termsAccepted: boolean, privacyAccepted: boolean) => {
    setState(prev => ({ 
      ...prev, 
      termsAccepted, 
      privacyAccepted, 
      step: 'did' 
    }));
    logger.info('Terms accepted', { termsAccepted, privacyAccepted });
  };

  const handleDIDCreation = async (didKeyPair: any, secretPhrase: string) => {
    setState(prev => ({ 
      ...prev, 
      didKeyPair, 
      secretPhrase, 
      step: 'backup' 
    }));
    logger.info('DID created', { did: didKeyPair.did });
  };

  const handleBackupComplete = () => {
    setState(prev => ({ ...prev, step: 'complete' }));
    logger.info('Backup completed');
  };

  const handleError = (error: string) => {
    setState(prev => ({ ...prev, error, isLoading: false }));
    logger.error('Onboarding error', { error });
  };

  const setLoading = (loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  };

  const renderStep = () => {
    switch (state.step) {
      case 'welcome':
        return (
          <WelcomeStep 
            onContinue={() => setState(prev => ({ ...prev, step: 'wallet' }))}
            blockchainHealth={blockchainHealth}
          />
        );
      case 'wallet':
        return (
          <WalletConnection 
            onWalletConnected={handleWalletConnection}
            onError={handleError}
            setLoading={setLoading}
          />
        );
      case 'terms':
        return (
          <TermsAndConditions 
            onAccept={handleTermsAcceptance}
            onBack={() => setState(prev => ({ ...prev, step: 'wallet' }))}
          />
        );
      case 'did':
        return (
          <DIDCreation 
            wallet={state.wallet}
            onDIDCreated={handleDIDCreation}
            onError={handleError}
            setLoading={setLoading}
          />
        );
      case 'backup':
        return (
          <SecretPhraseBackup 
            secretPhrase={state.secretPhrase}
            didKeyPair={state.didKeyPair}
            onBackupComplete={handleBackupComplete}
            onError={handleError}
          />
        );
      case 'complete':
        return (
          <OnboardingComplete 
            wallet={state.wallet}
            didKeyPair={state.didKeyPair}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              Setup Progress
            </span>
            <span className="text-sm font-medium text-gray-700">
              {getStepNumber(state.step)}/5
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(getStepNumber(state.step) / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* Error Display */}
        {state.error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{state.error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {state.isLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-700">Processing...</p>
            </div>
          </div>
        )}

        {/* Step Content */}
        {renderStep()}
      </div>
    </div>
  );
};

const WelcomeStep: React.FC<{ onContinue: () => void; blockchainHealth: boolean }> = ({ 
  onContinue, 
  blockchainHealth 
}) => (
  <div className="bg-white rounded-lg shadow-lg p-8 text-center">
    <div className="mb-6">
      <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
        <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to PersonaPass</h1>
      <p className="text-gray-600 mb-6">
        Create your decentralized identity and start managing your verifiable credentials securely.
      </p>
    </div>

    <div className="mb-6">
      <div className="flex items-center justify-center space-x-2 mb-4">
        <div className={`h-3 w-3 rounded-full ${blockchainHealth ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span className="text-sm text-gray-700">
          PersonaChain Status: {blockchainHealth ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-gray-900 mb-2">What you'll get:</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>✅ Secure decentralized identity (DID)</li>
          <li>✅ Verifiable credentials storage</li>
          <li>✅ Zero-knowledge proof generation</li>
          <li>✅ Multi-chain wallet integration</li>
          <li>✅ Enterprise-grade security</li>
        </ul>
      </div>
    </div>

    <button
      onClick={onContinue}
      className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
    >
      Get Started
    </button>
  </div>
);

const getStepNumber = (step: string): number => {
  const steps = ['welcome', 'wallet', 'terms', 'did', 'backup', 'complete'];
  return steps.indexOf(step) + 1;
};

export default OnboardingFlow;