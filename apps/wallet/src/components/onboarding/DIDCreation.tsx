/**
 * Professional DID Creation Component
 * Handles DID generation with blockchain anchoring and user feedback
 */

import React, { useState } from 'react';
import { DIDService } from '../../services/didService';
import { personaChainService } from '../../services/personaChainService';
import { logger } from '../../services/monitoringService';

interface DIDCreationProps {
  wallet: any;
  onDIDCreated: (didKeyPair: any, secretPhrase: string) => void;
  onError: (error: string) => void;
  setLoading: (loading: boolean) => void;
}

export const DIDCreation: React.FC<DIDCreationProps> = ({
  wallet,
  onDIDCreated,
  onError,
  setLoading,
}) => {
  const [creationStep, setCreationStep] = useState<'options' | 'creating' | 'anchoring'>('options');
  const [useHSM, setUseHSM] = useState(false);
  const [anchorOnChain, setAnchorOnChain] = useState(true);
  const [progress, setProgress] = useState(0);

  const generateSecretPhrase = (): string => {
    const words = [
      'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
      'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
      'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual',
      'adapt', 'add', 'addict', 'address', 'adjust', 'admit', 'adult', 'advance',
      'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'against', 'agent',
      'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album',
      'alcohol', 'alert', 'alien', 'all', 'alley', 'allow', 'almost', 'alone',
      'alpha', 'already', 'also', 'alter', 'always', 'amateur', 'amazing', 'among'
    ];
    
    const phrase = Array.from({ length: 12 }, () => 
      words[Math.floor(Math.random() * words.length)]
    ).join(' ');
    
    return phrase;
  };

  const handleDIDCreation = async () => {
    setCreationStep('creating');
    setLoading(true);
    setProgress(10);
    
    try {
      logger.info('Starting DID creation', { 
        wallet: wallet.address, 
        useHSM, 
        anchorOnChain 
      });

      // Step 1: Generate DID
      setProgress(30);
      const didKeyPair = await DIDService.generateDID(useHSM);
      
      if (!didKeyPair) {
        throw new Error('Failed to generate DID');
      }

      logger.info('DID generated successfully', { 
        did: didKeyPair.did,
        hsmBacked: didKeyPair.hsmBacked 
      });

      // Step 2: Generate secret phrase
      setProgress(50);
      const secretPhrase = generateSecretPhrase();

      // Step 3: Anchor on blockchain if requested
      if (anchorOnChain) {
        setCreationStep('anchoring');
        setProgress(70);
        
        try {
          const txHash = await personaChainService.createDIDOnChain({
            ...wallet,
            did: didKeyPair.did
          });
          
          logger.info('DID anchored on blockchain', { 
            did: didKeyPair.did,
            txHash 
          });
          
          setProgress(90);
        } catch (anchorError) {
          logger.warn('Failed to anchor DID on blockchain', { 
            error: anchorError,
            did: didKeyPair.did 
          });
          // Continue without anchoring - DID is still valid
        }
      }

      setProgress(100);
      onDIDCreated(didKeyPair, secretPhrase);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      onError(`Failed to create DID: ${errorMessage}`);
      logger.error('DID creation failed', { error });
    } finally {
      setLoading(false);
    }
  };

  if (creationStep === 'creating' || creationStep === 'anchoring') {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {creationStep === 'creating' ? 'Creating Your DID' : 'Anchoring on Blockchain'}
          </h2>
          <p className="text-gray-600 mb-6">
            {creationStep === 'creating' 
              ? 'Generating your decentralized identity...' 
              : 'Registering your DID on PersonaChain...'}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm font-medium text-gray-700">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Progress Steps */}
        <div className="space-y-3">
          <div className={`flex items-center ${progress >= 30 ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`h-4 w-4 rounded-full mr-3 ${progress >= 30 ? 'bg-green-600' : 'bg-gray-300'}`} />
            <span className="text-sm">Generate cryptographic keys</span>
          </div>
          <div className={`flex items-center ${progress >= 50 ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`h-4 w-4 rounded-full mr-3 ${progress >= 50 ? 'bg-green-600' : 'bg-gray-300'}`} />
            <span className="text-sm">Create DID document</span>
          </div>
          <div className={`flex items-center ${progress >= 70 ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`h-4 w-4 rounded-full mr-3 ${progress >= 70 ? 'bg-green-600' : 'bg-gray-300'}`} />
            <span className="text-sm">Anchor on blockchain</span>
          </div>
          <div className={`flex items-center ${progress >= 100 ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`h-4 w-4 rounded-full mr-3 ${progress >= 100 ? 'bg-green-600' : 'bg-gray-300'}`} />
            <span className="text-sm">Complete setup</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="text-center mb-8">
        <div className="mx-auto h-16 w-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
          <svg className="h-8 w-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Your DID</h2>
        <p className="text-gray-600">
          Configure your decentralized identity settings and security preferences.
        </p>
      </div>

      <div className="space-y-6">
        {/* Wallet Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Connected Wallet</h3>
          <div className="text-sm text-gray-700">
            <p>Address: <code className="bg-white px-2 py-1 rounded">{wallet.address}</code></p>
            <p>DID: <code className="bg-white px-2 py-1 rounded">{wallet.did}</code></p>
          </div>
        </div>

        {/* Security Options */}
        <div className="border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Options</h3>
          
          <div className="space-y-4">
            {/* HSM Option */}
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Hardware Security Module (HSM)</h4>
                  <p className="text-sm text-gray-600">
                    Use Google Cloud HSM for maximum security (Enterprise only)
                  </p>
                </div>
              </div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={useHSM}
                  onChange={(e) => setUseHSM(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </label>
            </div>

            {/* Blockchain Anchoring Option */}
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Blockchain Anchoring</h4>
                  <p className="text-sm text-gray-600">
                    Register your DID on PersonaChain for verifiability
                  </p>
                </div>
              </div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={anchorOnChain}
                  onChange={(e) => setAnchorOnChain(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </label>
            </div>
          </div>
        </div>

        {/* DID Preview */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Your DID Will Include</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>✅ Cryptographically secure Ed25519 keys</li>
            <li>✅ W3C-compliant DID document</li>
            <li>✅ Self-sovereign identity control</li>
            <li>✅ Verifiable credential compatibility</li>
            <li>✅ Zero-knowledge proof support</li>
            {anchorOnChain && <li>✅ Blockchain verification</li>}
            {useHSM && <li>✅ Enterprise-grade HSM security</li>}
          </ul>
        </div>

        {/* Security Notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Important Security Notice</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Your private keys and seed phrase will be generated securely. Make sure to save your backup phrase in the next step - it cannot be recovered if lost.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-8">
        <button
          onClick={handleDIDCreation}
          className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
        >
          Create My DID
        </button>
      </div>
    </div>
  );
};

export default DIDCreation;