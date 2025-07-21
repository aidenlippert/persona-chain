/**
 * Plaid Integration Dashboard Component
 * Complete financial verification interface with automation
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PlaidAutomationService, { PlaidVerificationResult } from '../../services/automation/PlaidAutomationService';
import { MasterfulCard } from '../ui/MasterfulCard';
import { BrutallyBeautifulButton } from '../ui/BrutallyBeautifulButton';
import { errorService } from "@/services/errorService";

interface PlaidDashboardState {
  isConnected: boolean;
  isConnecting: boolean;
  verificationStatus: any;
  credentials: any[];
  error: string | null;
  linkToken: string | null;
}

export const PlaidIntegrationDashboard: React.FC = () => {
  const [state, setState] = useState<PlaidDashboardState>({
    isConnected: false,
    isConnecting: false,
    verificationStatus: null,
    credentials: [],
    error: null,
    linkToken: null
  });

  const plaidService = PlaidAutomationService.getInstance();
  const userDid = 'did:persona:user-123'; // TODO: Get from auth context

  useEffect(() => {
    loadVerificationStatus();
  }, []);

  const loadVerificationStatus = async () => {
    try {
      const status = await plaidService.getFinancialVerificationStatus(userDid);
      setState(prev => ({
        ...prev,
        isConnected: status.hasVerification,
        verificationStatus: status
      }));
    } catch (error) {
      errorService.logError('Failed to load verification status:', error);
    }
  };

  const initiateConnection = async () => {
    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const result = await plaidService.initializeAutomatedPlaidFlow(userDid);
      
      if (result.success && result.accessToken) {
        setState(prev => ({ ...prev, linkToken: result.accessToken }));
        
        // In a real app, you would open Plaid Link here
        console.log('🔗 Plaid Link should open with token:', result.accessToken);
        
        // Simulate successful connection for demo
        setTimeout(() => {
          simulateSuccessfulConnection();
        }, 3000);
        
      } else {
        setState(prev => ({ 
          ...prev, 
          error: result.error || 'Failed to initialize Plaid connection',
          isConnecting: false 
        }));
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: (error as Error).message,
        isConnecting: false 
      }));
    }
  };

  const simulateSuccessfulConnection = async () => {
    try {
      // Simulate public token (in real app, this comes from Plaid Link)
      const mockPublicToken = 'public-sandbox-mock-token';
      
      const result = await plaidService.completeAutomatedPlaidConnection(
        mockPublicToken,
        userDid
      );

      if (result.success) {
        setState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          credentials: result.credentials,
          error: null
        }));
        
        await loadVerificationStatus();
      } else {
        setState(prev => ({ 
          ...prev, 
          error: result.error || 'Failed to complete connection',
          isConnecting: false 
        }));
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: (error as Error).message,
        isConnecting: false 
      }));
    }
  };

  const disconnectPlaid = async () => {
    try {
      const success = await plaidService.disconnectPlaid(userDid);
      
      if (success) {
        setState(prev => ({
          ...prev,
          isConnected: false,
          verificationStatus: null,
          credentials: [],
          error: null
        }));
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: (error as Error).message 
      }));
    }
  };

  const refreshVerification = async () => {
    try {
      setState(prev => ({ ...prev, isConnecting: true }));
      
      const result = await plaidService.performPeriodicVerification(userDid);
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          credentials: result.credentials,
          isConnecting: false
        }));
        
        await loadVerificationStatus();
      } else {
        setState(prev => ({ 
          ...prev, 
          error: result.error || 'Failed to refresh verification',
          isConnecting: false 
        }));
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: (error as Error).message,
        isConnecting: false 
      }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6 rounded-lg">
        <h2 className="text-2xl font-bold mb-2">🏦 Financial Verification</h2>
        <p className="text-green-100">Secure bank account and income verification with Plaid</p>
      </div>

      {/* Error Display */}
      <AnimatePresence>
        {state.error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg"
          >
            <div className="flex items-center space-x-2">
              <span className="text-red-500">❌</span>
              <span>{state.error}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connection Status */}
      <MasterfulCard variant="glass" size="md">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`w-4 h-4 rounded-full ${
              state.isConnected ? 'bg-green-500' : 'bg-gray-300'
            }`}></div>
            <div>
              <h3 className="font-semibold text-lg">
                {state.isConnected ? 'Bank Account Connected' : 'No Bank Account Connected'}
              </h3>
              <p className="text-gray-600 text-sm">
                {state.isConnected 
                  ? 'Your financial information is verified and up to date'
                  : 'Connect your bank account to verify your financial information'
                }
              </p>
            </div>
          </div>
          
          <div className="flex space-x-2">
            {!state.isConnected ? (
              <BrutallyBeautifulButton
                onClick={initiateConnection}
                disabled={state.isConnecting}
                variant="primary"
                size="md"
              >
                {state.isConnecting ? '🔄 Connecting...' : '🏦 Connect Bank'}
              </BrutallyBeautifulButton>
            ) : (
              <>
                <BrutallyBeautifulButton
                  onClick={refreshVerification}
                  disabled={state.isConnecting}
                  variant="secondary"
                  size="sm"
                >
                  {state.isConnecting ? '🔄' : '🔄 Refresh'}
                </BrutallyBeautifulButton>
                <BrutallyBeautifulButton
                  onClick={disconnectPlaid}
                  variant="ghost"
                  size="sm"
                >
                  🔌 Disconnect
                </BrutallyBeautifulButton>
              </>
            )}
          </div>
        </div>
      </MasterfulCard>

      {/* Verification Status */}
      {state.verificationStatus && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MasterfulCard variant="glass" size="sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {state.verificationStatus.accountCount}
              </div>
              <div className="text-sm text-gray-600">Connected Accounts</div>
            </div>
          </MasterfulCard>
          
          <MasterfulCard variant="glass" size="sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Math.round(state.verificationStatus.trustScore * 100)}%
              </div>
              <div className="text-sm text-gray-600">Trust Score</div>
            </div>
          </MasterfulCard>
          
          <MasterfulCard variant="glass" size="sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {state.verificationStatus.verificationTypes.length}
              </div>
              <div className="text-sm text-gray-600">Verification Types</div>
            </div>
          </MasterfulCard>
        </div>
      )}

      {/* Verification Types */}
      {state.verificationStatus?.verificationTypes.length > 0 && (
        <MasterfulCard variant="white" size="md">
          <h3 className="font-semibold text-lg mb-4">Active Verifications</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {state.verificationStatus.verificationTypes.map((type: string, index: number) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                <div className="text-green-600">
                  {type === 'bank_account' ? '🏦' : 
                   type === 'income_verification' ? '💰' : '✅'}
                </div>
                <div>
                  <div className="font-medium">
                    {type === 'bank_account' ? 'Bank Account Verified' :
                     type === 'income_verification' ? 'Income Verified' : 
                     type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </div>
                  <div className="text-sm text-gray-600">
                    {state.verificationStatus.lastUpdate && 
                      `Updated ${new Date(state.verificationStatus.lastUpdate).toLocaleDateString()}`
                    }
                  </div>
                </div>
              </div>
            ))}
          </div>
        </MasterfulCard>
      )}

      {/* Generated Credentials */}
      {state.credentials.length > 0 && (
        <MasterfulCard variant="white" size="md">
          <h3 className="font-semibold text-lg mb-4">Generated Credentials</h3>
          <div className="space-y-3">
            {state.credentials.map((credential, index) => (
              <div key={index} className="border border-gray-200 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      {credential.type?.find((t: string) => t !== 'VerifiableCredential') || 'Financial Credential'}
                    </div>
                    <div className="text-sm text-gray-600">
                      Issued: {new Date(credential.issuanceDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-green-600 text-xl">🎫</div>
                </div>
              </div>
            ))}
          </div>
        </MasterfulCard>
      )}

      {/* Connection Instructions */}
      {!state.isConnected && (
        <MasterfulCard variant="blue" size="md">
          <h3 className="font-semibold text-lg mb-3">🔐 Secure Financial Verification</h3>
          <div className="space-y-2 text-sm text-blue-700">
            <p><strong>✅ Bank-grade security:</strong> Your data is encrypted and never stored</p>
            <p><strong>🏦 Instant verification:</strong> Connect in seconds with 11,000+ banks</p>
            <p><strong>🎫 Automatic credentials:</strong> Get verifiable financial credentials instantly</p>
            <p><strong>🔄 Stay current:</strong> Automatic updates keep your verification fresh</p>
          </div>
        </MasterfulCard>
      )}

      {/* Plaid Link Simulation */}
      {state.isConnecting && state.linkToken && (
        <MasterfulCard variant="glass" size="md">
          <div className="text-center space-y-4">
            <div className="text-6xl">🏦</div>
            <h3 className="text-xl font-semibold">Connecting to Your Bank</h3>
            <p className="text-gray-600">
              In a real implementation, Plaid Link would open here for secure bank connection.
            </p>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
            <p className="text-sm text-blue-600">
              Demo: Automatically completing connection in 3 seconds...
            </p>
          </div>
        </MasterfulCard>
      )}
    </div>
  );
};

export default PlaidIntegrationDashboard;