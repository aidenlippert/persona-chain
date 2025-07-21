/**
 * Professional Wallet Connection Component
 * Handles Keplr wallet connection with proper error handling and UX
 */

import React, { useState, useEffect } from 'react';
import { personaChainService } from '../../services/personaChainService';
import { logger } from '../../services/monitoringService';

interface WalletConnectionProps {
  onWalletConnected: (wallet: any) => void;
  onError: (error: string) => void;
  setLoading: (loading: boolean) => void;
}

export const WalletConnection: React.FC<WalletConnectionProps> = ({
  onWalletConnected,
  onError,
  setLoading,
}) => {
  const [keplrAvailable, setKeplrAvailable] = useState(false);
  const [connectionStep, setConnectionStep] = useState<'initial' | 'connecting' | 'installing'>('initial');

  useEffect(() => {
    checkKeplrAvailability();
  }, []);

  const checkKeplrAvailability = async () => {
    try {
      if (typeof window !== 'undefined' && window.keplr) {
        setKeplrAvailable(true);
        logger.info('Keplr wallet detected');
      } else {
        setKeplrAvailable(false);
        logger.warn('Keplr wallet not detected');
      }
    } catch (error) {
      logger.error('Error checking Keplr availability', { error });
      setKeplrAvailable(false);
    }
  };

  const handleKeplrConnection = async () => {
    setConnectionStep('connecting');
    setLoading(true);
    
    try {
      const wallet = await personaChainService.connectKeplr();
      if (wallet) {
        onWalletConnected(wallet);
        logger.info('Keplr wallet connected successfully', { 
          address: wallet.address, 
          did: wallet.did 
        });
      } else {
        throw new Error('Failed to connect to Keplr wallet');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      onError(`Failed to connect wallet: ${errorMessage}`);
      logger.error('Keplr connection failed', { error });
    } finally {
      setLoading(false);
      setConnectionStep('initial');
    }
  };

  const handleCreateNewWallet = async () => {
    setConnectionStep('connecting');
    setLoading(true);
    
    try {
      const wallet = await personaChainService.createWallet();
      if (wallet) {
        onWalletConnected(wallet);
        logger.info('New wallet created successfully', { 
          address: wallet.address, 
          did: wallet.did 
        });
      } else {
        throw new Error('Failed to create new wallet');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      onError(`Failed to create wallet: ${errorMessage}`);
      logger.error('Wallet creation failed', { error });
    } finally {
      setLoading(false);
      setConnectionStep('initial');
    }
  };

  const handleInstallKeplr = () => {
    setConnectionStep('installing');
    window.open('https://chrome.google.com/webstore/detail/keplr/dmkamcknogkgcdfhhbddcghachkejeap', '_blank');
    
    // Check again after a delay
    setTimeout(() => {
      checkKeplrAvailability();
      setConnectionStep('initial');
    }, 3000);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="text-center mb-8">
        <div className="mx-auto h-16 w-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
          <svg className="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Wallet</h2>
        <p className="text-gray-600">
          Connect your Keplr wallet or create a new one to get started with PersonaPass.
        </p>
      </div>

      <div className="space-y-4">
        {keplrAvailable ? (
          <>
            {/* Keplr Connection */}
            <div className="border border-gray-200 rounded-lg p-6 hover:border-purple-300 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Keplr Wallet</h3>
                    <p className="text-sm text-gray-600">Connect your existing Keplr wallet</p>
                  </div>
                </div>
                <button
                  onClick={handleKeplrConnection}
                  disabled={connectionStep === 'connecting'}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {connectionStep === 'connecting' ? 'Connecting...' : 'Connect'}
                </button>
              </div>
            </div>

            {/* Create New Wallet */}
            <div className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Create New Wallet</h3>
                    <p className="text-sm text-gray-600">Generate a new wallet with seed phrase</p>
                  </div>
                </div>
                <button
                  onClick={handleCreateNewWallet}
                  disabled={connectionStep === 'connecting'}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {connectionStep === 'connecting' ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Keplr Not Available */
          <div className="border border-orange-200 rounded-lg p-6 bg-orange-50">
            <div className="flex items-center space-x-4 mb-4">
              <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Keplr Wallet Required</h3>
                <p className="text-sm text-gray-600">
                  You need to install the Keplr wallet extension to continue.
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={handleInstallKeplr}
                disabled={connectionStep === 'installing'}
                className="w-full px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {connectionStep === 'installing' ? 'Opening Chrome Store...' : 'Install Keplr Wallet'}
              </button>
              
              <button
                onClick={checkKeplrAvailability}
                className="w-full px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                I've Installed Keplr
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-2">Security Notice</h4>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• Your wallet keys are never stored on our servers</li>
          <li>• All transactions are signed locally on your device</li>
          <li>• Your private information remains private</li>
          <li>• We support standard Cosmos SDK wallets</li>
        </ul>
      </div>
    </div>
  );
};

export default WalletConnection;